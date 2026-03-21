const db = require('../config/database');
const { QueryTypes } = require('sequelize');

// ----------------------------
// GPS helpers
// ----------------------------
const toRadians = (deg) => (deg * Math.PI) / 180;

const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  // Radius of Earth (meters)
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getShiftForDate = (dateObj) => {
  // ca sáng: 08:00-12:00 ; ca chiều: 13:00-17:00 (giống logic Frontend Dashboard.jsx)
  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  const morningStart = 8 * 60;
  const morningEnd = 12 * 60;
  const afternoonStart = 13 * 60;
  const afternoonEnd = 17 * 60;

  if (minutes >= morningStart && minutes <= morningEnd) {
    return { name: 'morning', startMinutes: morningStart, endMinutes: morningEnd };
  }

  if (minutes >= afternoonStart && minutes <= afternoonEnd) {
    return { name: 'afternoon', startMinutes: afternoonStart, endMinutes: afternoonEnd };
  }

  return null;
};

const getAttendanceStatusForCheckIn = (dateObj) => {
  const shift = getShiftForDate(dateObj);
  if (!shift) return null;

  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
  return minutes <= shift.startMinutes ? 'on_time' : 'late';
};

const getAttendanceStatusForCheckOut = (checkInDateObj, checkOutDateObj) => {
  const shift = getShiftForDate(checkInDateObj);
  if (!shift) return null;

  const checkOutMinutes = checkOutDateObj.getHours() * 60 + checkOutDateObj.getMinutes();
  return checkOutMinutes < shift.endMinutes ? 'early_leave' : 'on_time';
};

// ----------------------------
// HQ tạm thời (chưa có ADMIN set khu vực) — mọi nhân viên dùng chung
// ----------------------------
const TEMP_HEADQUARTERS = {
  location_name: 'Trụ sở chính (tạm thời)',
  latitude: 16.05963797280072,
  longitude: 108.17468278677039,
  radius_meters: 500
};

/** Luôn trả về vùng chấm công = HQ tạm + 500m; giữ work_location_id / branch từ DB nếu có */
const normalizeWorkLocation = (row) => ({
  work_location_id: row?.work_location_id ?? null,
  location_name: TEMP_HEADQUARTERS.location_name,
  latitude: TEMP_HEADQUARTERS.latitude,
  longitude: TEMP_HEADQUARTERS.longitude,
  radius_meters: TEMP_HEADQUARTERS.radius_meters,
  branch_id: row?.branch_id ?? null,
  branch_code: row?.branch_code ?? null,
  branch_name: row?.branch_name ?? null
});

// ----------------------------
// Existing dashboard
// ----------------------------
exports.getDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("ID:", id);

    // 1. Nhân viên
   const employeeResult = await db.query(
  `SELECT full_name FROM employee WHERE id = $1`,
  {
    bind: [id],
    type: QueryTypes.SELECT
  }
    );

const employee = employeeResult[0];

    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }

        const statsResult = await db.query(`
              SELECT 
                COUNT(*) FILTER (WHERE status = 'on_time')::int AS present,
                COUNT(*) FILTER (WHERE status IN ('late','early_leave'))::int AS late,
                COUNT(*) FILTER (WHERE status = 'absent')::int AS absent
              FROM attendance
              WHERE employee_id = $1
              AND EXTRACT(MONTH FROM attendance_date) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM attendance_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, {
              bind: [id],
              type: QueryTypes.SELECT
            });

        const stats = statsResult[0];

    res.json({
      employee,
      stats
    });

  } catch (error) {
    console.error("🔥 LỖI:", error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ----------------------------
// Attendance summary today
// ----------------------------
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Lấy work_location từ chuỗi: employee -> position -> department -> branch -> work_location
    const locationResult = await db.query(
      `
        SELECT
          w.id AS work_location_id,
          w.location_name,
          w.latitude,
          w.longitude,
          w.radius_meters,
          b.id AS branch_id,
          b.branch_code,
          b.branch_name
        FROM employee e
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        LEFT JOIN branch b ON d.branch_id = b.id
        LEFT JOIN work_location w ON b.work_location_id = w.id
        WHERE e.id = $1
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const workLocation = normalizeWorkLocation(locationResult[0]);

    // 2) Lấy trạng thái attendance hôm nay
    const attendanceResult = await db.query(
      `
        SELECT
          attendance_date,
          check_in_time,
          check_out_time,
          check_in_latitude,
          check_in_longitude,
          check_out_latitude,
          check_out_longitude,
          status,
          total_work_hours
        FROM attendance
        WHERE employee_id = $1
          AND attendance_date = CURRENT_DATE
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const attendanceToday = attendanceResult[0] || {
      attendance_date: null,
      check_in_time: null,
      check_out_time: null,
      check_in_latitude: null,
      check_in_longitude: null,
      check_out_latitude: null,
      check_out_longitude: null,
      status: null,
      total_work_hours: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        server_date: new Date().toISOString().slice(0, 10),
        workLocation: {
          work_location_id: workLocation.work_location_id,
          location_name: workLocation.location_name,
          latitude: workLocation.latitude,
          longitude: workLocation.longitude,
          radius_meters: workLocation.radius_meters,
          branch: {
            branch_id: workLocation.branch_id,
            branch_code: workLocation.branch_code,
            branch_name: workLocation.branch_name
          }
        },
        attendanceToday: {
          attendance_date: attendanceToday.attendance_date,
          checkInTime: attendanceToday.check_in_time,
          checkOutTime: attendanceToday.check_out_time,
          checkInLatitude: attendanceToday.check_in_latitude,
          checkInLongitude: attendanceToday.check_in_longitude,
          checkOutLatitude: attendanceToday.check_out_latitude,
          checkOutLongitude: attendanceToday.check_out_longitude,
          status: attendanceToday.status,
          totalWorkHours: attendanceToday.total_work_hours
        }
      }
    });
  } catch (error) {
    console.error('getAttendanceSummary error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ----------------------------
// Check-in
// ----------------------------
exports.checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body || {};

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Thiếu latitude/longitude hợp lệ.' });
    }

    // Lấy work_location
    const locationResult = await db.query(
      `
        SELECT
          w.id AS work_location_id,
          w.latitude,
          w.longitude,
          w.radius_meters
        FROM employee e
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        LEFT JOIN branch b ON d.branch_id = b.id
        LEFT JOIN work_location w ON b.work_location_id = w.id
        WHERE e.id = $1
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const workLocation = normalizeWorkLocation(locationResult[0]);

    const centerLat = Number(workLocation.latitude);
    const centerLng = Number(workLocation.longitude);
    const radiusMeters = workLocation.radius_meters == null ? null : Number(workLocation.radius_meters);

    // Kiểm tra nằm trong bán kính GPS (nếu radius_meters có giá trị)
    if (radiusMeters != null) {
      const distanceMeters = haversineDistanceMeters(lat, lng, centerLat, centerLng);
      if (distanceMeters > radiusMeters) {
        return res.status(403).json({
          success: false,
          message: 'Bạn đang ở ngoài vùng GPS cho phép.',
          distance_meters: Number(distanceMeters.toFixed(2))
        });
      }
    }

    // Kiểm tra attendance hôm nay (unique: employee_id + attendance_date)
    const attendanceResult = await db.query(
      `
        SELECT id, check_in_time, check_out_time
        FROM attendance
        WHERE employee_id = $1 AND attendance_date = CURRENT_DATE
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const attendanceToday = attendanceResult[0];
    if (attendanceToday && attendanceToday.check_in_time) {
      return res.status(409).json({ success: false, message: 'Bạn đã check-in hôm nay. Không thể check-in lần thứ 2.' });
    }

    const now = new Date();
    const status = getAttendanceStatusForCheckIn(now);

    if (attendanceToday && !attendanceToday.check_in_time) {
      // Trường hợp record hôm nay tồn tại nhưng chưa có check_in_time => cập nhật thay vì insert
      const sql = `
        UPDATE attendance
        SET
          work_location_id = $2,
          check_in_time = NOW(),
          check_in_latitude = $3,
          check_in_longitude = $4,
          device_ip = $5,
          status = $6
        WHERE id = $1
        RETURNING id, attendance_date, check_in_time, check_out_time, status
      `;

      const [updateRows] = await db.query(sql, {
        bind: [attendanceToday.id, workLocation.work_location_id, lat, lng, req.ip, status]
      });

      return res.status(200).json({ success: true, message: 'Check-in thành công!', data: updateRows[0] });
    }

    const sql = `
      INSERT INTO attendance (
        employee_id,
        work_location_id,
        attendance_date,
        check_in_time,
        check_in_latitude,
        check_in_longitude,
        device_ip,
        status
      )
      VALUES ($1, $2, CURRENT_DATE, NOW(), $3, $4, $5, $6)
      RETURNING id, attendance_date, check_in_time, check_out_time, status
    `;

    const [insertRows] = await db.query(sql, {
      bind: [id, workLocation.work_location_id, lat, lng, req.ip, status]
    });

    return res.status(201).json({ success: true, message: 'Check-in thành công!', data: insertRows[0] });
  } catch (error) {
    console.error('checkIn error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ----------------------------
// Check-out
// ----------------------------
exports.checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body || {};

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Thiếu latitude/longitude hợp lệ.' });
    }

    const locationResult = await db.query(
      `
        SELECT
          w.id AS work_location_id,
          w.latitude,
          w.longitude,
          w.radius_meters
        FROM employee e
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        LEFT JOIN branch b ON d.branch_id = b.id
        LEFT JOIN work_location w ON b.work_location_id = w.id
        WHERE e.id = $1
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const workLocation = normalizeWorkLocation(locationResult[0]);
    const centerLat = Number(workLocation.latitude);
    const centerLng = Number(workLocation.longitude);
    const radiusMeters = workLocation.radius_meters == null ? null : Number(workLocation.radius_meters);

    if (radiusMeters != null) {
      const distanceMeters = haversineDistanceMeters(lat, lng, centerLat, centerLng);
      if (distanceMeters > radiusMeters) {
        return res.status(403).json({
          success: false,
          message: 'Bạn đang ở ngoài vùng GPS cho phép. Không thể checkout.',
          distance_meters: Number(distanceMeters.toFixed(2))
        });
      }
    }

    // Lấy attendance hôm nay
    const attendanceResult = await db.query(
      `
        SELECT id, check_in_time, check_out_time
        FROM attendance
        WHERE employee_id = $1 AND attendance_date = CURRENT_DATE
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    const attendanceToday = attendanceResult[0];
    if (!attendanceToday || !attendanceToday.check_in_time) {
      return res.status(409).json({ success: false, message: 'Bạn chưa check-in hôm nay. Không thể checkout.' });
    }
    if (attendanceToday.check_out_time) {
      return res.status(409).json({ success: false, message: 'Bạn đã checkout hôm nay rồi.' });
    }

    const now = new Date();
    const checkInDateObj = new Date(attendanceToday.check_in_time);
    const status = getAttendanceStatusForCheckOut(checkInDateObj, now);

    const sql = `
      UPDATE attendance
      SET
        check_out_time = NOW(),
        check_out_latitude = $2,
        check_out_longitude = $3,
        device_ip = $4,
        status = $5,
        total_work_hours = ROUND(EXTRACT(EPOCH FROM (NOW() - check_in_time))/3600::numeric, 2)
      WHERE id = $1
      RETURNING id, attendance_date, check_in_time, check_out_time, status, total_work_hours
    `;

    const [updateRows] = await db.query(sql, {
      bind: [attendanceToday.id, lat, lng, req.ip, status]
    });

    return res.status(200).json({ success: true, message: 'Checkout thành công!', data: updateRows[0] });
  } catch (error) {
    console.error('checkOut error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ----------------------------
// Manager: giám sát nhân viên check-in trong zone
// ----------------------------
exports.getManagerZoneAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Xác định zone làm việc của quản lý (đang chuẩn hóa về HQ tạm)
    const managerLocationResult = await db.query(
      `
        SELECT
          w.id AS work_location_id,
          w.location_name,
          w.latitude,
          w.longitude,
          w.radius_meters,
          b.id AS branch_id,
          b.branch_code,
          b.branch_name
        FROM employee e
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        LEFT JOIN branch b ON d.branch_id = b.id
        LEFT JOIN work_location w ON b.work_location_id = w.id
        WHERE e.id = $1
        LIMIT 1
      `,
      { bind: [id], type: QueryTypes.SELECT }
    );

    if (!managerLocationResult[0]) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin quản lý.' });
    }

    const workLocation = normalizeWorkLocation(managerLocationResult[0]);

    // 2) Lấy toàn bộ nhân viên cùng chi nhánh đã check-in hôm nay
    const teamAttendanceResult = await db.query(
      `
        SELECT
          e.id AS employee_id,
          e.employee_code,
          e.full_name,
          d.department_name,
          p.position_name,
          a.check_in_time,
          a.check_out_time,
          a.status,
          a.check_in_latitude,
          a.check_in_longitude,
          a.check_out_latitude,
          a.check_out_longitude,
          COALESCE(a.check_out_latitude, a.check_in_latitude) AS live_latitude,
          COALESCE(a.check_out_longitude, a.check_in_longitude) AS live_longitude
        FROM employee e
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        LEFT JOIN attendance a
          ON a.employee_id = e.id
         AND a.attendance_date = CURRENT_DATE
        WHERE d.branch_id = $1
          AND a.check_in_time IS NOT NULL
        ORDER BY a.check_in_time DESC
      `,
      { bind: [workLocation.branch_id], type: QueryTypes.SELECT }
    );

    const centerLat = Number(workLocation.latitude);
    const centerLng = Number(workLocation.longitude);
    const radiusMeters = workLocation.radius_meters == null ? null : Number(workLocation.radius_meters);

    const attendees = teamAttendanceResult
      .map((row) => {
        const lat = Number(row.live_latitude);
        const lng = Number(row.live_longitude);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

        const distanceMeters =
          hasCoords && radiusMeters != null
            ? haversineDistanceMeters(lat, lng, centerLat, centerLng)
            : null;
        const isInsideZone = radiusMeters == null ? hasCoords : hasCoords && distanceMeters <= radiusMeters;

        return {
          employeeId: row.employee_id,
          employeeCode: row.employee_code || null,
          fullName: row.full_name || 'Nhân viên',
          departmentName: row.department_name || null,
          positionName: row.position_name || null,
          checkInTime: row.check_in_time,
          checkOutTime: row.check_out_time,
          status: row.status || null,
          latitude: hasCoords ? lat : null,
          longitude: hasCoords ? lng : null,
          distanceMeters: distanceMeters == null ? null : Number(distanceMeters.toFixed(2)),
          isInsideZone
        };
      })
      .filter((item) => item.isInsideZone);

    const checkedOutCount = attendees.filter((item) => item.checkOutTime).length;
    const checkedInOnlyCount = attendees.length - checkedOutCount;

    return res.status(200).json({
      success: true,
      data: {
        workLocation: {
          work_location_id: workLocation.work_location_id,
          location_name: workLocation.location_name,
          latitude: workLocation.latitude,
          longitude: workLocation.longitude,
          radius_meters: workLocation.radius_meters,
          branch: {
            branch_id: workLocation.branch_id,
            branch_code: workLocation.branch_code,
            branch_name: workLocation.branch_name
          }
        },
        zoneStats: {
          totalInZone: attendees.length,
          checkedInOnly: checkedInOnlyCount,
          checkedOut: checkedOutCount
        },
        attendees
      }
    });
  } catch (error) {
    console.error('getManagerZoneAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
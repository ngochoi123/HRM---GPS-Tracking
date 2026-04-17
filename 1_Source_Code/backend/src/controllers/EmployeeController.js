const db = require('../config/database');
const { QueryTypes } = require('sequelize');
const { haversineDistanceMeters } = require('../utils/geoUtils');
const {
  normalizeWorkLocation,
  checkInEmployee,
  checkOutEmployee,
  fetchWorkLocations,
  calcStandardWorkHours,
  getAttendanceStatusForCheckIn,
  getAttendanceStatusForCheckOut,
} = require('../services/attendanceActions');
const { getClientIp, parseAllowedIps, isIpAllowed } = require('../utils/ipAllowlist');


exports.getDashboard = async (req, res) => {
 try {
    const { id } = req.params;
    const employeeResult = await db.query(`SELECT full_name FROM employee WHERE id = $1`, { bind: [id], type: QueryTypes.SELECT });
    const employee = employeeResult[0];
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

    const statsResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'on_time')::int AS present,
        COUNT(*) FILTER (WHERE status IN ('late','early_leave'))::int AS late,
        COUNT(*) FILTER (WHERE status = 'absent')::int AS absent
      FROM attendance
      WHERE employee_id = $1 AND EXTRACT(MONTH FROM attendance_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM attendance_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, { bind: [id], type: QueryTypes.SELECT });

    res.json({ employee, stats: statsResult[0] });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ----------------------------
// Attendance summary today
// ----------------------------
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Lấy work_location từ attendanceActions (hỗ trợ location_assignment)
    const workLocations = await fetchWorkLocations(id);
    const workLocation = workLocations[0] || null;
    const allowedParsed = workLocation?.allowed_ips || [];
    const clientIp = getClientIp(req);
    const wifiIpRequired = allowedParsed.length > 0;
    const clientIpAllowed = wifiIpRequired ? isIpAllowed(clientIp, allowedParsed) : null;

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
        workLocations: workLocations.map(wl => ({
          work_location_id: wl.work_location_id,
          location_name: wl.location_name,
          latitude: wl.latitude,
          longitude: wl.longitude,
          radius_meters: wl.radius_meters,
          wifi_ip_required: wifiIpRequired,
          client_ip_allowed: clientIpAllowed,
          branch: {
            branch_id: wl.branch_id,
            branch_code: wl.branch_code,
            branch_name: wl.branch_name
          }
        })),
        workLocation: workLocation ? {
          work_location_id: workLocation.work_location_id,
          location_name: workLocation.location_name,
          latitude: workLocation.latitude,
          longitude: workLocation.longitude,
          radius_meters: workLocation.radius_meters,
          wifi_ip_required: wifiIpRequired,
          client_ip_allowed: clientIpAllowed,
          branch: {
            branch_id: workLocation.branch_id,
            branch_code: workLocation.branch_code,
            branch_name: workLocation.branch_name
          }
        } : null,
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
// Attendance history (month filter + summary)
// ----------------------------
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const month = req.query?.month ? Number(req.query.month) : null; // 1-12
    const year = req.query?.year ? Number(req.query.year) : null;

    const hasMonthYear = Number.isFinite(month) && Number.isFinite(year) && month >= 1 && month <= 12 && year >= 1970;
    const nowParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const currentYear = Number(nowParts.find((p) => p.type === 'year')?.value);
    const currentMonth = Number(nowParts.find((p) => p.type === 'month')?.value);
    const currentDay = Number(nowParts.find((p) => p.type === 'day')?.value);
    const targetYear = hasMonthYear ? year : currentYear;
    const targetMonth = hasMonthYear ? month : currentMonth;
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const isFutureMonth =
      targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth);
    const lastDisplayDay =
      targetYear === currentYear && targetMonth === currentMonth
        ? currentDay
        : isFutureMonth
          ? 0
          : daysInTargetMonth;

    const rows = await db.query(
      `
        SELECT
          attendance_date,
          check_in_time,
          check_out_time,
          status,
          total_work_hours
        FROM attendance
        WHERE employee_id = $1
          AND EXTRACT(MONTH FROM attendance_date) = $2
          AND EXTRACT(YEAR FROM attendance_date) = $3
        ORDER BY attendance_date DESC
      `,
      { bind: [id, targetMonth, targetYear], type: QueryTypes.SELECT }
    );

    const STANDARD_DAY_HOURS_CAP = 8;
    const SHIFT_END_MINUTES = 17 * 60;
    const pad2 = (value) => String(value).padStart(2, '0');
    const congFromCappedHours = (cappedHours) => {
      const ratio = Math.min(cappedHours / STANDARD_DAY_HOURS_CAP, 1);
      return Math.round(ratio * 100) / 100;
    };
    const roundWorkDaysSum = (sum) => Math.round(sum * 100) / 100;
    const getDateKey = (value) => {
      if (!value) return null;
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    };
    const getMinutesOfDay = (dateObj) => dateObj.getHours() * 60 + dateObj.getMinutes();
    const isSundayDate = (ymd) => {
      const d = new Date(`${ymd}T00:00:00+07:00`);
      return !Number.isNaN(d.getTime()) && d.getDay() === 0;
    };

    const rowMap = new Map(rows.map((row) => [getDateKey(row.attendance_date), row]));
    const normalizedRows = Array.from({ length: lastDisplayDay }, (_, index) => {
      const attendanceDate = `${targetYear}-${pad2(targetMonth)}-${pad2(index + 1)}`;
      const isSunday = isSundayDate(attendanceDate);
      const row = rowMap.get(attendanceDate) || null;
      const checkInDt = row?.check_in_time ? new Date(row.check_in_time) : null;
      const checkOutDt = row?.check_out_time ? new Date(row.check_out_time) : null;
      const hasValidIn = checkInDt instanceof Date && !Number.isNaN(checkInDt.getTime());
      const hasValidOut = checkOutDt instanceof Date && !Number.isNaN(checkOutDt.getTime());

      if (!hasValidIn) {
        return {
          attendance_date: attendanceDate,
          check_in_time: null,
          check_out_time: null,
          status: isSunday ? 'off_day' : 'absent',
          status_text: isSunday ? 'Nghỉ Chủ nhật' : 'Vắng mặt',
          is_late: false,
          is_early_leave: false,
          is_off_day: isSunday,
          total_work_hours: 0,
        };
      }

      const isLate = getAttendanceStatusForCheckIn(checkInDt) === 'late';
      if (!hasValidOut) {
        return {
          attendance_date: attendanceDate,
          check_in_time: row.check_in_time,
          check_out_time: null,
          status: isLate ? 'late' : 'on_time',
          status_text: isLate ? 'Đi trễ' : 'Đang làm',
          is_late: isLate,
          is_early_leave: false,
          is_off_day: false,
          total_work_hours: 0,
        };
      }

      const isEarlyLeave = getMinutesOfDay(checkOutDt) < SHIFT_END_MINUTES;
      const totalWorkHours = calcStandardWorkHours(checkInDt, checkOutDt);

      return {
        attendance_date: attendanceDate,
        check_in_time: row.check_in_time,
        check_out_time: row.check_out_time,
        status: isLate ? 'late' : isEarlyLeave ? 'early_leave' : 'on_time',
        status_text: isLate && isEarlyLeave
          ? 'Đi trễ / Về sớm'
          : isLate
            ? 'Đi trễ'
            : isEarlyLeave
              ? 'Về sớm'
              : 'Đúng giờ',
        is_late: isLate,
        is_early_leave: isEarlyLeave,
        is_off_day: false,
        total_work_hours: totalWorkHours,
      };
    });

    const totalHours = normalizedRows.reduce(
      (sum, r) => sum + (r.total_work_hours != null ? Number(r.total_work_hours) : 0),
      0
    );

    const daysWorked = roundWorkDaysSum(
      normalizedRows.reduce((sum, r) => {
        const h = r.total_work_hours != null ? Number(r.total_work_hours) : 0;
        return sum + congFromCappedHours(h);
      }, 0)
    );

    const workingDaysInMonth = normalizedRows.filter((r) => !r.is_off_day).length;
    const lateOrEarlyCount = normalizedRows.filter((r) => r.is_late || r.is_early_leave).length;
    const compliancePercent =
      workingDaysInMonth > 0 ? Math.round((daysWorked / workingDaysInMonth) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        rows: normalizedRows,
        summary: {
          month: targetMonth,
          year: targetYear,
          totalHours: Number(totalHours.toFixed(2)),
          daysWorked,
          workingDaysInMonth,
          lateOrEarlyCount,
          compliancePercent
        }
      }
    });
  } catch (error) {
    console.error('getAttendanceHistory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải lịch sử chấm công',
      error: error.message
    });
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
    const io = req.app.get('socketio');
    const clientIp = getClientIp(req);
    const result = await checkInEmployee(id, lat, lng, {
      deviceIp: clientIp,
      io,
      skipGeofenceValidation: false,
    });
    if (!result.ok) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        ...(result.extra || {}),
      });
    }
    return res.status(result.statusCode).json({ success: true, message: 'Check-in thành công!', data: result.data });
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
    const io = req.app.get('socketio');
    const clientIp = getClientIp(req);
    const result = await checkOutEmployee(id, lat, lng, {
      deviceIp: clientIp,
      io,
      skipGeofenceValidation: false,
      checkOutNote: null,
    });
    if (!result.ok) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        ...(result.extra || {}),
      });
    }
    return res.status(200).json({ success: true, message: 'Checkout thành công!', data: result.data });
  } catch (error) {
    console.error('checkOut error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
            SELECT 
        e.id,
        e.full_name,
        e.work_email,
        e.employee_code,
        e.personal_email,
        e.phone_number,
        e.identity_card_number,
        e.date_of_birth,
        e.address,
        e.direct_manager_id,
        e.bank_account_number,
        e.bank_name,
        e.join_date,

        p.position_name,
        d.department_name,

        c.contract_number,
        c.contract_type,
        c.start_date,
        c.end_date,
        c.base_salary,
        c.is_active,

        m.full_name AS manager_name 

      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN contract c ON c.employee_id = e.id
      LEFT JOIN employee m ON e.direct_manager_id = m.id

      WHERE e.id = $1
      ORDER BY c.start_date DESC
      LIMIT 1;
    `, {
      bind: [id],
      type: QueryTypes.SELECT
    });

    res.json(result[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    const checkQuery = `
      SELECT id FROM user_account
      WHERE employee_id = $1
      AND password_hash = crypt($2, password_hash)
    `;

    const user = await db.query(checkQuery, {
      bind: [userId, oldPassword],
      type: QueryTypes.SELECT
    });

    if (user.length === 0) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng!" });
    }

    const updateQuery = `
      UPDATE user_account
      SET password_hash = crypt($1, gen_salt('bf'))
      WHERE employee_id = $2
    `;

    await db.query(updateQuery, {
      bind: [newPassword, userId]
    });

    return res.json({ message: "Đổi mật khẩu thành công!" });

  } catch (error) {
    console.error("Lỗi changePassword:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getManagerZoneAttendance = async (req, res) => { 
  try {
    const { id } = req.params;
    const managerLocations = await fetchWorkLocations(id);
    if (!managerLocations || managerLocations.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin quản lý hoặc chưa được phân công khu vực.' });

    const workLocation = managerLocations[0];

    const teamAttendanceResult = await db.query(
      `SELECT e.id AS employee_id, e.employee_code, e.full_name, d.department_name, p.position_name, a.check_in_time, a.check_out_time, a.status, a.check_in_latitude, a.check_in_longitude, a.check_out_latitude, a.check_out_longitude, COALESCE(a.check_out_latitude, a.check_in_latitude) AS live_latitude, COALESCE(a.check_out_longitude, a.check_in_longitude) AS live_longitude FROM employee e LEFT JOIN position p ON e.position_id = p.id LEFT JOIN department d ON p.department_id = d.id LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = CURRENT_DATE WHERE d.branch_id = $1 AND a.check_in_time IS NOT NULL ORDER BY a.check_in_time DESC`,
      { bind: [workLocation.branch_id], type: QueryTypes.SELECT }
    );

    const centerLat = Number(workLocation.latitude);
    const centerLng = Number(workLocation.longitude);
    const radiusMeters = workLocation.radius_meters == null ? null : Number(workLocation.radius_meters);

    const attendees = teamAttendanceResult.map((row) => {
        const lat = Number(row.live_latitude);
        const lng = Number(row.live_longitude);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
        const distanceMeters = hasCoords && radiusMeters != null ? haversineDistanceMeters(lat, lng, centerLat, centerLng) : null;
        const isInsideZone = radiusMeters == null ? hasCoords : hasCoords && distanceMeters <= radiusMeters;
        return { employeeId: row.employee_id, employeeCode: row.employee_code || null, fullName: row.full_name || 'Nhân viên', departmentName: row.department_name || null, positionName: row.position_name || null, checkInTime: row.check_in_time, checkOutTime: row.check_out_time, status: row.status || null, latitude: hasCoords ? lat : null, longitude: hasCoords ? lng : null, distanceMeters: distanceMeters == null ? null : Number(distanceMeters.toFixed(2)), isInsideZone };
      });

    const totalInZone = attendees.filter((item) => item.isInsideZone).length;
    const checkedOutCount = attendees.filter((item) => item.checkOutTime).length;
    const checkedInOnlyCount = attendees.filter((item) => !item.checkOutTime && item.isInsideZone).length;

    return res.status(200).json({ success: true, data: { workLocation, zoneStats: { totalInZone, checkedInOnly: checkedInOnlyCount, checkedOut: checkedOutCount }, attendees } });
  } catch (error) { return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message }); } 
};

exports.getContract = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
         SELECT 
          e.full_name,
          e.employee_code,

          p.position_name,
          d.department_name,

          c.contract_number,
          c.start_date,
          c.end_date,
          c.base_salary,
          c.contract_type,
          c.is_active

      FROM contract c
      JOIN employee e ON e.id = c.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id

      WHERE e.id = $1
      ORDER BY c.start_date DESC
      LIMIT 1;
      `,
      {
        bind: [id],
        type: QueryTypes.SELECT
      }
    );

    if (!result[0]) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hợp đồng"
      });
    }

    res.json(result[0]);

  } catch (error) {
    console.error("getContract error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// ==============================
// 🟢 TẠO ĐƠN NGHỈ
// ==============================
exports.createRequest = async (req, res) => {
  try {
    const {
      userId,
      leave_type,
      start_datetime,
      end_datetime,
      reason,
      approverId
    } = req.body;

    const file = req.file;

    if (!userId || !leave_type || !start_datetime || !end_datetime) {
      return res.status(400).json({ message: 'Thiếu dữ liệu' });
    }

    const validTypes = ['annual', 'sick', 'unpaid', 'maternity', 'bereavement', 'attendance_error', 'late_excuse'];
    if (!validTypes.includes(leave_type)) {
      return res.status(400).json({ message: 'Loại nghỉ không hợp lệ' });
    }

    if (!approverId) {
      return res.status(400).json({ message: 'Chưa chọn người duyệt' });
    }

    const filePath = file ? file.filename : null;

    const result = await db.query(
      `
      INSERT INTO leave_request (
        employee_id,
        leave_type,
        start_datetime,
        end_datetime,
        reason,
        approver_id,
        attachment
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      {
        bind: [
          userId,
          leave_type,
          start_datetime,
          end_datetime,
          reason,
          approverId,
          filePath
        ]
      }
    );

    return res.status(201).json({
      message: 'Tạo đơn thành công',
      data: result[0]
    });

  } catch (error) {
    console.error('createRequest error:', error);
    return res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// ==============================
// 🔵 LẤY DANH SÁCH ĐƠN
// ==============================
exports.getMyRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT 
        lr.id,
        lr.leave_type,
        lr.start_datetime,
        lr.end_datetime,
        lr.reason,
        lr.status,
        lr.created_at,
        e.full_name AS approver_name
      FROM leave_request lr
      LEFT JOIN employee e ON lr.approver_id = e.id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC
      `,
      {
        bind: [id],
        type: QueryTypes.SELECT
      }
    );

    return res.json(result);

  } catch (error) {
    console.error('getMyRequests error:', error);
    return res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};

exports.getApprovers = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT DISTINCT 
        e.id, 
        e.full_name, 
        p.position_name
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      WHERE 
        e.id = (
          SELECT direct_manager_id 
          FROM employee 
          WHERE id = $1
        )
        OR p.level = 'director'
      ORDER BY e.full_name
    `, {
      bind: [id],
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(400).json({
        message: "Không tìm thấy người kiểm duyệt!"
      });
    }

    res.json(result);

  } catch (error) {
    console.error('getApprovers error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

//Hàm tạo đơn tăng ca
exports.createOvertimeRequest = async (req, res) => {
  try {
    const {
      employee_id,
      ot_date,
      start_time,
      end_time,
      reason,
      approver_id
    } = req.body;

    // validate
    if (!employee_id || !ot_date || !start_time || !end_time || !approver_id) {
      return res.status(400).json({ message: "Thiếu dữ liệu!" });
    }

    if (end_time <= start_time) {
      return res.status(400).json({ message: "Giờ không hợp lệ!" });
    }

    const query = `
      INSERT INTO overtime_request 
      (employee_id, ot_date, start_time, end_time, reason, approver_id, status, created_at)
      VALUES (:employee_id, :ot_date, :start_time, :end_time, :reason, :approver_id, 'pending', NOW())
      RETURNING *;
    `;

    const [result] = await db.query(query, {
      replacements: {
        employee_id,
        ot_date,
        start_time,
        end_time,
        reason,
        approver_id
      }
    });

    res.status(201).json({
      message: "Tạo đơn tăng ca thành công",
      data: result[0]
    });

  } catch (error) {
    console.error("❌ Lỗi create OT:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// hàm lấy danh sách đơn tăng ca
exports.getMyOvertimeRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ot.*,
        e.full_name AS approver_name
      FROM overtime_request ot
      LEFT JOIN employee e ON ot.approver_id = e.id
      WHERE ot.employee_id = :id
      ORDER BY ot.created_at DESC
    `;

    const [rows] = await db.query(query, {
      replacements: { id }
    });

    res.json(rows);

  } catch (error) {
    console.error("❌ Lỗi get OT:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//tạo đơn giải trình
exports.createExplanationRequest = async (req, res) => {
  try {
    const {
      userId,
      attendance_date,
      explanation_type,
      proposed_check_in,
      proposed_check_out,
      reason,
      approverId
    } = req.body;

    const file = req.file;

    // ===== VALIDATE =====
    if (!userId || !attendance_date || !explanation_type) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    // enum đúng theo DB
    const validTypes = [
      "forgot_checkin",
      "forgot_checkout",
      "system_error",
      "late_arrival",
      "early_leave"
    ];

    if (!validTypes.includes(explanation_type)) {
      return res.status(400).json({ message: "Loại giải trình không hợp lệ" });
    }

    if (!approverId) {
      return res.status(400).json({ message: "Chưa chọn người duyệt" });
    }

    // validate theo từng loại
    if (explanation_type === "forgot_checkin" && !proposed_check_in) {
      return res.status(400).json({ message: "Thiếu giờ check-in" });
    }

    if (explanation_type === "forgot_checkout" && !proposed_check_out) {
      return res.status(400).json({ message: "Thiếu giờ check-out" });
    }

    const filePath = file ? file.filename : null;

    // ===== INSERT =====
    const result = await db.query(
      `
      INSERT INTO attendance_explanation_request (
        employee_id,
        attendance_date,
        explanation_type,
        proposed_check_in,
        proposed_check_out,
        reason,
        approver_id,
        attachment_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      {
        bind: [
          userId,
          attendance_date,
          explanation_type,
          proposed_check_in || null,
          proposed_check_out || null,
          reason || null,
          approverId,
          filePath
        ],
        type: QueryTypes.INSERT
      }
    );

    return res.status(201).json({
      message: "Tạo đơn giải trình thành công",
      data: result[0]
    });

  } catch (error) {
    console.error("createExplanationRequest error:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message
    });
  }
};

//lấy đơn giải trình
exports.getMyExplanationRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT 
        aer.id,
        aer.attendance_date,
        aer.explanation_type,
        aer.proposed_check_in,
        aer.proposed_check_out,
        aer.reason,
        aer.attachment_url,
        aer.status,
        aer.created_at,
        e.full_name AS approver_name
      FROM attendance_explanation_request aer
      LEFT JOIN employee e ON aer.approver_id = e.id
      WHERE aer.employee_id = $1
      ORDER BY aer.created_at DESC
      `,
      {
        bind: [id],
        type: QueryTypes.SELECT
      }
    );

    return res.json(result);

  } catch (error) {
    console.error("getMyExplanationRequests error:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message
    });
  }
};


const db = require('../config/database');
const { QueryTypes, Op } = require('sequelize');
const { Employee, Department, Position, UserAccount, sequelize, AIAlert } = require('../models');
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
const bcrypt = require('bcryptjs'); // Dùng bcryptjs để tương thích tốt hơn
const { sendAccountEmail } = require('../services/emailService');


exports.getDashboard = async (req, res) => {
 try {
    const { id } = req.params;
    const employeeResult = await db.query(`SELECT full_name, avatar_url FROM employee WHERE id = $1`, { bind: [id], type: QueryTypes.SELECT });
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
    const normalizedRows = await Promise.all(Array.from({ length: lastDisplayDay }, async (_, index) => {
      const attendanceDate = `${targetYear}-${pad2(targetMonth)}-${pad2(index + 1)}`;
      const isSunday = isSundayDate(attendanceDate);
      const row = rowMap.get(attendanceDate) || null;
      const checkInDt = row?.check_in_time ? new Date(row.check_in_time) : null;
      const checkOutDt = row?.check_out_time ? new Date(row.check_out_time) : null;
      const hasValidIn = checkInDt instanceof Date && !Number.isNaN(checkInDt.getTime());
      const hasValidOut = checkOutDt instanceof Date && !Number.isNaN(checkOutDt.getTime());
      
      if (row?.status === 'on_leave') {
        return {
          attendance_date: attendanceDate,
          check_in_time: null,
          check_out_time: null,
          status: 'on_leave',
          status_text: 'Nghỉ phép',
          is_late: false,
          is_early_leave: false,
          is_off_day: false,
          total_work_hours: 0,
        };
      }

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

      const isLate = (await getAttendanceStatusForCheckIn(checkInDt)) === 'late';
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
      const totalWorkHours = await calcStandardWorkHours(checkInDt, checkOutDt);

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
    }));

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
    const { latitude, longitude, is_mocked } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);
    const io = req.app.get('socketio');
    const clientIp = getClientIp(req);
    console.log(`[checkIn DEBUG] clientIp="${clientIp}" | socket="${req.socket?.remoteAddress}" | xff="${req.headers['x-forwarded-for']}" | req.ip="${req.ip}"`);

    // ✅ HARD-BLOCK: Kiểm tra WiFi IP tại tầng controller trước khi gọi service
    try {
      const workLocationsForIp = await fetchWorkLocations(id);
      const primaryWl = workLocationsForIp[0] || null;
      if (primaryWl) {
        const allowed_ips = primaryWl.allowed_ips || [];
        if (allowed_ips.length > 0 && !isIpAllowed(clientIp, allowed_ips)) {
          console.warn(`[checkIn] IP bị chặn: clientIp=${clientIp}, allowed=${JSON.stringify(allowed_ips)}, employee=${id}`);
          return res.status(403).json({
            success: false,
            message: 'Lỗi: Thiết bị chưa kết nối đúng WiFi văn phòng (IP không hợp lệ).'
          });
        }
      }
    } catch (ipCheckErr) {
      console.error('[checkIn] Lỗi kiểm tra WiFi IP:', ipCheckErr.message);
    }

    // 🚀 DYNAMIC LOCATION: Lấy tọa độ chuẩn từ bảng work_location (không còn hardcode)
    if (latitude && longitude) {
      try {
        const workLocations = await fetchWorkLocations(id);
        if (workLocations && workLocations.length > 0) {
          // Tìm địa điểm gần nhất với vị trí check-in của nhân viên
          let nearestWl = workLocations[0];
          let minDistance = getDistanceFromLatLonInM(latitude, longitude, Number(nearestWl.latitude), Number(nearestWl.longitude));

          for (let i = 1; i < workLocations.length; i++) {
            const wl = workLocations[i];
            const dist = getDistanceFromLatLonInM(latitude, longitude, Number(wl.latitude), Number(wl.longitude));
            if (dist < minDistance) {
              minDistance = dist;
              nearestWl = wl;
            }
          }

          const allowedRadius = Number(nearestWl.radius_meters) || 500;

          // Nếu lệch quá bán kính HOẶC sử dụng Mock GPS -> Kích hoạt AI ngầm
          if (minDistance > allowedRadius || is_mocked) {
            analyzeFraudWithAI(
              req.user?.employee_id || req.user?.id || id,
              minDistance,
              latitude,
              longitude,
              req.user?.full_name || 'Không rõ',
              nearestWl.location_name || 'Văn phòng',
              Number(nearestWl.latitude),
              Number(nearestWl.longitude),
              allowedRadius,
              is_mocked
            );
          }
        }
      } catch (locErr) {
        console.error('Lỗi fetch work_location cho AI fraud check:', locErr.message);
      }
    }

    const result = await checkInEmployee(id, lat, lng, {
      deviceIp: clientIp,
      io,
      skipGeofenceValidation: false,
      is_mocked,
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

    // ✅ HARD-BLOCK: Kiểm tra WiFi IP tại tầng controller trước khi gọi service
    try {
      const workLocationsForIp = await fetchWorkLocations(id);
      const primaryWl = workLocationsForIp[0] || null;
      if (primaryWl) {
        const allowed_ips = primaryWl.allowed_ips || [];
        if (allowed_ips.length > 0 && !isIpAllowed(clientIp, allowed_ips)) {
          console.warn(`[checkOut] IP bị chặn: clientIp=${clientIp}, allowed=${JSON.stringify(allowed_ips)}, employee=${id}`);
          return res.status(403).json({
            success: false,
            message: 'Lỗi: Thiết bị chưa kết nối đúng WiFi văn phòng (IP không hợp lệ).'
          });
        }
      }
    } catch (ipCheckErr) {
      console.error('[checkOut] Lỗi kiểm tra WiFi IP:', ipCheckErr.message);
    }

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
        e.avatar_url,
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
      SET password_hash = crypt($1, gen_salt('bf')),
          require_pass_change = false
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

// ==========================================================
// 🔴 TẠO NHÂN VIÊN MỚI (Admin/Manager use only)
// Logic: Sequelize Transaction + Manager Promotion Cascade
// ==========================================================
exports.createEmployee = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { 
      full_name, phone_number, personal_email, address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, join_date,
      username, password, send_email 
    } = req.body;

    if (!full_name || !position_id || !username || !password) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc!' });
    }

    // --- 🛑 KIỂM TRA TRÙNG LẶP USERNAME & EMAIL ---
    const existingUser = await db.query(
      `SELECT id FROM user_account WHERE username = $1`,
      { bind: [username], type: QueryTypes.SELECT }
    );

    if (existingUser && existingUser.length > 0) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Tên đăng nhập (Username) này đã tồn tại trên hệ thống. Vui lòng chọn tên khác!" 
      });
    }

    if (personal_email || work_email) {
      const existingEmail = await db.query(
        `SELECT id FROM employee WHERE personal_email = $1 OR work_email = $2`,
        { bind: [personal_email || null, work_email || null], type: QueryTypes.SELECT }
      );
      if (existingEmail && existingEmail.length > 0) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: "Email (Cá nhân hoặc Công việc) này đã tồn tại trên hệ thống!" 
        });
      }
    }
    // -------------------------------------

    // 1. Lấy thông tin chức vụ
    const position = await Position.findByPk(position_id, { transaction: t });
    if (!position) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Chức vụ không tồn tại!' });
    }

    const isManagerLevel = position.level === 'manager';

    // 2. Tạo mã nhân viên
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `NV-${new Date().getFullYear()}-${randomSuffix}`;

    // 3. Tạo nhân viên
    const newEmployee = await Employee.create({
      employee_code,
      full_name,
      phone_number,
      personal_email,
      work_email,
      address,
      identity_card_number,
      date_of_birth,
      gender: (gender !== undefined && gender !== '') ? gender : null,
      bank_account_number,
      bank_name,
      status: status || 'active',
      position_id,
      join_date: join_date || null,
      avatar_url: req.file ? `avatars/${req.file.filename}` : null
    }, { transaction: t });

    // 4. Tạo tài khoản người dùng
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const roleCode = isManagerLevel ? 'MANAGER' : (position.level === 'director' ? 'DIRECTOR' : 'EMPLOYEE');

    await UserAccount.create({
      employee_id: newEmployee.id,
      username,
      password_hash,
      role_code: roleCode,
      status: 'active'
    }, { transaction: t });

    // 5. 🚀 LOGIC PHÂN CẤP TỰ ĐỘNG
    if (isManagerLevel && position.department_id) {
      // BƯỚC 1: Cập nhật manager_id cho phỏng ban
      await Department.update(
        { manager_id: newEmployee.id },
        { where: { id: position.department_id }, transaction: t }
      );

      // BƯỚC 2: Cập nhật direct_manager_id cho toàn bộ nhân viên trong phòng
      // Lấy danh sách position_id của phòng ban này
      const deptPositions = await Position.findAll({
        where: { department_id: position.department_id },
        attributes: ['id'],
        transaction: t
      });
      const positionIds = deptPositions.map(p => p.id);

      await Employee.update(
        { direct_manager_id: newEmployee.id },
        { 
          where: { 
            position_id: { [Op.in]: positionIds },
            id: { [Op.ne]: newEmployee.id },
            status: 'active'
          },
          transaction: t 
        }
      );
    } else if (!isManagerLevel && position.department_id) {
        // Nếu là nhân viên bình thường, tự động gán direct_manager_id từ trưởng phòng hiện tại của phòng ban đó
        const dept = await Department.findByPk(position.department_id, { transaction: t });
        if (dept) {
            newEmployee.direct_manager_id = dept.manager_id || null;
            await newEmployee.save({ transaction: t });
        }
    }

    await t.commit();

    // 6. Gửi Email (Async)
    if (send_email === true || send_email === 'true') {
      const email = personal_email || work_email;
      if (email) {
        sendAccountEmail(email, full_name, username, password).catch(console.error);
      }
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Thêm nhân viên và thiết lập phân cấp thành công!',
      data: { id: newEmployee.id, code: employee_code }
    });

  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('createEmployee Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mã nhân viên đã tồn tại!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ==========================================================
// 🔵 CẬP NHẬT NHÂN VIÊN (rbac checked in middleware if needed)
// Logic: Xử lý thăng chức/chuyển phòng ban + Phân cấp hierarchy
// ==========================================================
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();

  try {
    const employee = await Employee.findByPk(id, { transaction: t });
    if (!employee) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên!' });
    }

    const { 
      full_name, phone_number, personal_email, work_email,
      address, identity_card_number, date_of_birth, gender,
      bank_account_number, bank_name, status,
      position_id, join_date, direct_manager_id
    } = req.body;

    const oldPositionId = employee.position_id;
    const isPositionChanged = position_id && position_id !== oldPositionId;

    // 1. Cập nhật thông tin cơ bản
    await employee.update({
      full_name: full_name || employee.full_name,
      phone_number: phone_number !== undefined ? phone_number : employee.phone_number,
      personal_email: personal_email || employee.personal_email,
      work_email: work_email || employee.work_email,
      address: address || employee.address,
      identity_card_number: identity_card_number || employee.identity_card_number,
      date_of_birth: date_of_birth || employee.date_of_birth,
      gender: (gender !== undefined && gender !== '') ? gender : (gender === '' ? null : employee.gender),
      bank_account_number: bank_account_number || employee.bank_account_number,
      bank_name: bank_name || employee.bank_name,
      status: status || employee.status,
      position_id: position_id || employee.position_id,
      join_date: join_date || employee.join_date,
      direct_manager_id: (direct_manager_id !== undefined && direct_manager_id !== '') ? direct_manager_id : (direct_manager_id === '' ? null : employee.direct_manager_id),
      avatar_url: req.file ? `avatars/${req.file.filename}` : employee.avatar_url
    }, { transaction: t });

    // 2. Logic thăng chức / đổi trưởng phòng
    if (isPositionChanged) {
      const newPosition = await Position.findByPk(position_id, { transaction: t });
      if (newPosition && newPosition.level === 'manager') {
        const deptId = newPosition.department_id;
        
        // BƯỚC 1: Cập nhật manager_id cho phòng ban mới
        await Department.update(
          { manager_id: employee.id },
          { where: { id: deptId }, transaction: t }
        );

        // BƯỚC 2: Cascade direct_manager_id cho nhân viên trong phòng
        const deptPositions = await Position.findAll({
          where: { department_id: deptId },
          attributes: ['id'],
          transaction: t
        });
        const positionIds = deptPositions.map(p => p.id);

        await Employee.update(
          { direct_manager_id: employee.id },
          { 
            where: { 
              position_id: { [Op.in]: positionIds },
              id: { [Op.ne]: employee.id },
              status: 'active'
            },
            transaction: t 
          }
        );

        // Cập nhật Role code trong UserAccount
        await UserAccount.update(
          { role_code: 'MANAGER' },
          { where: { employee_id: employee.id }, transaction: t }
        );
      } else if (newPosition && newPosition.level !== 'manager') {
          // Nếu bị giáng chức hoặc chuyển ra khỏi vị trí Trưởng phòng
          // Cần kiểm tra xem họ có đang là trưởng phòng cũ của phòng ban nào không
          await Department.update(
            { manager_id: null },
            { where: { manager_id: employee.id }, transaction: t }
          );
          // Gán lại manager mới cho chính họ (từ trưởng phòng của phòng ban họ vừa vào)
          if (newPosition.department_id) {
              const dept = await Department.findByPk(newPosition.department_id, { transaction: t });
              if (dept) {
                  // Cập nhật sếp mới (hoặc null nếu phòng ban chưa có sếp)
                  await employee.update({ direct_manager_id: dept.manager_id || null }, { transaction: t });
              }
          }
      }
    }

    await t.commit();
    res.status(200).json({ success: true, message: 'Cập nhật nhân viên và phân cấp thành công!' });

  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('updateEmployee Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ==============================
// 🟢 TẠO ĐƠN NGHỈ
// ==============================
exports.createRequest = async (req, res) => {
  try {
    const { leave_type, start_datetime, end_datetime, reason, approverId } = req.body;

    console.log("Token Data:", req.user);
    // 1. Lấy ID tài khoản từ Token
    const accountId = req.user.id;

    // 2. Chạy vào Database để "mò" ra employee_id thực sự của tài khoản này
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );

    // 3. Lấy ra mã nhân viên
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    // 4. Nếu vẫn không có, chặn luôn không cho tạo đơn
    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản của bạn chưa được liên kết với nhân viên nào!" });
    }
    const file = req.file;

    if (!employeeId || !leave_type || !start_datetime || !end_datetime) {
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
          employeeId,
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
    // Ưu tiên lấy employee_id từ token để đảm bảo data isolation chính xác
    console.log("Token Data:", req.user);
    const accountId = req.user.id;
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với nhân viên!" });
    }

    if (!employeeId) return res.status(401).json({ message: 'Không xác thực được người dùng' });

    const result = await db.query(
      `
      SELECT 
        lr.id,
        lr.leave_type,
        lr.start_datetime,
        lr.end_datetime,
        lr.reason,
        lr.status,
        lr.reject_reason,
        lr.created_at,
        lr.attachment,
        e.full_name AS approver_name
      FROM leave_request lr
      LEFT JOIN employee e ON lr.approver_id = e.id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC
      `,
      {
        bind: [employeeId],
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
        p.position_name,
        CASE 
          WHEN e.id = dm.direct_manager_id THEN 1
          ELSE 2
        END AS priority
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN (
        SELECT direct_manager_id
        FROM employee
        WHERE id = $1
      ) dm ON true
      WHERE 
        e.id = dm.direct_manager_id
        OR (
          dm.direct_manager_id IS NULL 
          AND p.level = 'director'
        )
        OR (
          dm.direct_manager_id IS NOT NULL 
          AND p.level = 'director'
        )
      ORDER BY priority, e.full_name;
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
      ot_date,
      start_time,
      end_time,
      reason,
      approver_id
    } = req.body;

    console.log("Token Data:", req.user);
    const accountId = req.user.id;
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với nhân viên!" });
    }

    // validate
    if (!employeeId || !ot_date || !start_time || !end_time || !approver_id) {
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
        employee_id: employeeId,
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
    // Ưu tiên lấy employee_id từ token để đảm bảo data isolation chính xác
    console.log("Token Data:", req.user);
    const accountId = req.user.id;
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với nhân viên!" });
    }

    if (!employeeId) return res.status(401).json({ message: 'Không xác thực được người dùng' });

    const query = `
      SELECT 
        ot.id,
        ot.ot_date,
        ot.start_time,
        ot.end_time,
        ot.reason,
        ot.status,
        ot.reject_reason,
        ot.created_at,
        e.full_name AS approver_name
      FROM overtime_request ot
      LEFT JOIN employee e ON ot.approver_id = e.id
      WHERE ot.employee_id = :employeeId
      ORDER BY ot.created_at DESC
    `;

    const [rows] = await db.query(query, {
      replacements: { employeeId }
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
      attendance_date,
      explanation_type,
      proposed_check_in,
      proposed_check_out,
      reason,
      approverId
    } = req.body;

    console.log("Token Data:", req.user);
    const accountId = req.user.id;
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với nhân viên!" });
    }

    const file = req.file;

    // ===== VALIDATE =====
    if (!employeeId || !attendance_date || !explanation_type) {
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
          employeeId,
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
    // Ưu tiên lấy employee_id từ token để đảm bảo data isolation chính xác
    console.log("Token Data:", req.user);
    const accountId = req.user.id;
    const userRecord = await db.query(
      `SELECT employee_id FROM user_account WHERE id = $1`,
      { bind: [accountId], type: QueryTypes.SELECT }
    );
    const employeeId = userRecord.length > 0 ? userRecord[0].employee_id : null;

    if (!employeeId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với nhân viên!" });
    }

    if (!employeeId) return res.status(401).json({ message: 'Không xác thực được người dùng' });

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
        aer.reject_reason,
        aer.created_at,
        e.full_name AS approver_name
      FROM attendance_explanation_request aer
      LEFT JOIN employee e ON aer.approver_id = e.id
      WHERE aer.employee_id = $1
      ORDER BY aer.created_at DESC
      `,
      {
        bind: [employeeId],
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

// --- MODULE AI: PHÁT HIỆN GIAN LẬN GPS ---
const { Ollama } = require('ollama');
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

// 1. Hàm thợ: Tính khoảng cách theo công thức Haversine (trả về mét)
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Bán kính trái đất (mét)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); 
}

// 2. Hàm gọi AI đánh giá gian lận (Chạy ngầm - không block checkIn)
async function analyzeFraudWithAI(employeeId, distance, lat, lng, empName, locationName, baseLat, baseLng, allowedRadius, isMocked = false) {
  try {
    const prompt = `Phân tích gian lận GPS:
- Nhân viên: ${empName}
- Phát hiện sử dụng Mock GPS (Giả lập vị trí): ${isMocked ? 'CÓ' : 'KHÔNG'}
- Địa điểm chấm công chuẩn: "${locationName}" (Tọa độ: ${baseLat}, ${baseLng} | Bán kính: ${allowedRadius}m)
- Tọa độ check-in thực tế: ${lat}, ${lng}
- Khoảng cách lệch: ${distance}m (Giới hạn cho phép: ${allowedRadius}m)

Hãy đánh giá mức độ gian lận. Nếu có is_mocked=CÓ thì rủi ro phải là HIGH.
Trả về JSON: { "risk_level": "HIGH/MEDIUM", "summary": "nhận xét", "recommendations": ["hành động 1", "hành động 2"] }`;

    const response = await ollama.chat({
      model: 'qwen2',
      messages: [{ role: 'user', content: prompt }],
      format: 'json'
    });
    const aiResult = JSON.parse(response.message.content);

    // Lưu cảnh báo vào Database (bao gồm coords để Frontend vẽ bản đồ)
    const fraudSummary = isMocked 
      ? `SỬ DỤNG PHẦN MỀM GIẢ LẬP VỊ TRÍ (Mock GPS). ${aiResult.summary}`
      : `Nghi vấn gian lận vị trí tại "${locationName}": Lệch ${distance}m (giới hạn ${allowedRadius}m). ${aiResult.summary}`;

    await AIAlert.create({
      employee_id: employeeId,
      alert_type: 'FRAUD_DETECTION',
      risk_level: aiResult.risk_level,
      message: JSON.stringify({
        summary: fraudSummary,
        recommendations: aiResult.recommendations,
        coords: {
          actual: { lat, lng },
          base: { lat: baseLat, lng: baseLng },
          distance,
          locationName
        },
        geo: { distance: `Lệch ${distance.toLocaleString('vi-VN')}m` }
      }),
      status: 'PENDING'
    });
    console.log(`🚨 AI Fraud Alert: ${empName} lệch ${distance}m so với "${locationName}" (max ${allowedRadius}m)`);
  } catch (err) {
    console.error("AI Fraud Error:", err);
  }
}

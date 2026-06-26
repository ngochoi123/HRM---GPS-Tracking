/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

const db = require('../config/database');
const { QueryTypes } = require('sequelize');
const { haversineDistanceMeters } = require('../utils/geoUtils');
const { parseAllowedIps, isIpAllowed } = require('../utils/ipAllowlist');

const configService = require('./ConfigService');

const getMinutesOfDay = (dateObj) => dateObj.getHours() * 60 + dateObj.getMinutes();

const getShiftConfig = async () => {
  const startStr = await configService.getConfig('DEFAULT_CHECKIN_TIME', '07:30');
  const endStr = await configService.getConfig('DEFAULT_CHECKOUT_TIME', '17:00');
  const lunchStartStr = await configService.getConfig('LUNCH_BREAK_START', '11:30');
  const lunchEndStr = await configService.getConfig('LUNCH_BREAK_END', '13:00');

  return {
    startMinutes: configService.timeStringToMinutes(startStr, 7 * 60 + 30),
    endMinutes: configService.timeStringToMinutes(endStr, 17 * 60),
    lunchStart: configService.timeStringToMinutes(lunchStartStr, 11 * 60 + 30),
    lunchEnd: configService.timeStringToMinutes(lunchEndStr, 13 * 60)
  };
};

const LATE_TOLERANCE = 0;
const MAX_LATE = 24 * 60;

const getShiftForDate = async (dateObj) => {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  const config = await getShiftConfig();
  return { name: 'day', ...config };
};

const getAttendanceStatusForCheckIn = async (dateObj) => {
  const shift = await getShiftForDate(dateObj);
  if (!shift) return 'absent';

  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  if (minutes > shift.startMinutes + MAX_LATE) {
    return 'absent';
  }

  return minutes <= shift.startMinutes + LATE_TOLERANCE
    ? 'on_time'
    : 'late';
};

const getAttendanceStatusForCheckOut = async (checkInDateObj, checkOutDateObj) => {
  const shift = await getShiftForDate(checkInDateObj);
  if (!shift) return null;

  const checkInMinutes = checkInDateObj.getHours() * 60 + checkInDateObj.getMinutes();
  const checkOutMinutes = checkOutDateObj.getHours() * 60 + checkOutDateObj.getMinutes();

  const isLate = checkInMinutes > shift.startMinutes;
  const isEarly = checkOutMinutes < shift.endMinutes;

  if (isLate && isEarly) return 'late_early_leave';
  if (isLate) return 'late';
  if (isEarly) return 'early_leave';
  return 'on_time';
};

/**
 * Giờ công chuẩn tính toán dựa trên cấu hình hệ thống:
 * - Áp dụng quy tắc chặn mốc thời gian:
 *   + Effective Check-in = Max(Actual_Checkin, Default_Checkin_Time)
 *   + Effective Check-out = Min(Actual_Checkout, Default_Checkout_Time)
 * - Trừ thời gian nghỉ trưa.
 * - Làm tròn 2 chữ số thập phân (ví dụ: 1.00, 0.50).
 */
const calcStandardWorkHours = async (checkInDateObj, checkOutDateObj) => {
  if (!(checkInDateObj instanceof Date) || Number.isNaN(checkInDateObj.getTime())) return 0.00;
  if (!(checkOutDateObj instanceof Date) || Number.isNaN(checkOutDateObj.getTime())) return 0.00;

  const config = await getShiftConfig();

  const inMinRaw = checkInDateObj.getHours() * 60 + checkInDateObj.getMinutes();
  const outMinRaw = checkOutDateObj.getHours() * 60 + checkOutDateObj.getMinutes();

  // Quy tắc Max/Min chặn mốc thời gian
  const effectiveInMin = Math.max(inMinRaw, config.startMinutes);
  const effectiveOutMin = Math.min(outMinRaw, config.endMinutes);

  if (effectiveOutMin <= effectiveInMin) return 0.00;

  const overlap = effectiveOutMin - effectiveInMin;
  
  // Trừ giờ nghỉ trưa (nếu thời gian làm việc có đè lên giờ nghỉ trưa)
  const lunchOverlap = Math.max(0, Math.min(effectiveOutMin, config.lunchEnd) - Math.max(effectiveInMin, config.lunchStart));
  const effectiveMinutes = Math.max(0, overlap - lunchOverlap);

  // Không áp dụng cappedMinutes cứng nữa, để nó linh hoạt theo ca
  const hours = effectiveMinutes / 60.0;
  
  // Làm tròn chính xác đến chữ số thứ 2
  return Number(hours.toFixed(2));
};

const normalizeWorkLocation = (row) => {
  if (!row || !row.work_location_id) return null;
  return {
    work_location_id: row.work_location_id,
    location_name: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius_meters: row.radius_meters,
    branch_id: row.branch_id,
    branch_code: row.branch_code,
    branch_name: row.branch_name,
    allowed_ips: parseAllowedIps(row.allowed_ips),
  };
};

async function fetchWorkLocations(employeeId) {
  const sql = `
WITH emp_info AS (
  SELECT e.id as emp_id, d.id as dept_id, b.id as branch_id, b.branch_code, b.branch_name, b.allowed_ips
  FROM employee e
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id
  LEFT JOIN branch b ON d.branch_id = b.id
  WHERE e.id = $1
),
active_assignments AS (
  SELECT work_location_id,
         CASE 
           WHEN employee_id IS NOT NULL THEN 1
           WHEN department_id IS NOT NULL THEN 2
           WHEN branch_id IS NOT NULL THEN 3
         END as priority
  FROM location_assignment
  WHERE (is_temporary = false OR end_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR end_date IS NULL)
    AND (
      employee_id = (SELECT emp_id FROM emp_info) OR
      department_id = (SELECT dept_id FROM emp_info) OR
      branch_id = (SELECT branch_id FROM emp_info)
    )
),
best_assignment AS (
  SELECT work_location_id 
  FROM active_assignments
  ORDER BY priority ASC
  LIMIT 1
)
SELECT
  w.id AS work_location_id,
  w.location_name,
  w.latitude,
  w.longitude,
  w.radius_meters,
  i.branch_id,
  i.branch_code,
  i.branch_name,
  i.allowed_ips
FROM emp_info i
JOIN work_location w ON (
  (EXISTS (SELECT 1 FROM best_assignment) AND w.id = (SELECT work_location_id FROM best_assignment))
  OR
  (NOT EXISTS (SELECT 1 FROM best_assignment) AND w.branch_id = i.branch_id)
);
  `;
  const locationResult = await db.query(sql, { bind: [employeeId], type: QueryTypes.SELECT });
  return locationResult.map(normalizeWorkLocation).filter(Boolean);
}

async function fetchTodayAttendance(employeeId) {
  const attendanceResult = await db.query(
    `
      SELECT id, check_in_time, check_out_time
      FROM attendance
      WHERE employee_id = $1 AND attendance_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      LIMIT 1
    `,
    { bind: [employeeId], type: QueryTypes.SELECT }
  );
  return attendanceResult[0] || null;
}

function emitAttendanceChanged(io, workLocation, employeeId, type) {
  if (!io || !workLocation?.branch_id) return;
  const room = `branch_${String(workLocation.branch_id)}`;
  const n = io.sockets.adapter.rooms.get(room)?.size ?? 0;
  console.log(`[Socket] emit attendance_changed (${type})`, { room, subscribersInRoom: n, employee_id: employeeId });
  io.to(room).emit('attendance_changed', {
    message: type === 'checkin' ? 'Có nhân viên vừa Check-in' : 'Có nhân viên vừa Check-out',
    employee_id: employeeId,
    type,
  });
}

/**
 * Check-in (HTTP hoặc geofence).
 * @returns {{ ok: true, data, statusCode } | { ok: false, statusCode, message, extra? }}
 */
const WIFI_IP_DENIED_MESSAGE =
  'Bạn không kết nối với WiFi văn phòng. Vui lòng kiểm tra lại kết nối mạng.';

async function checkInEmployee(employeeId, lat, lng, options = {}) {
  const {
    deviceIp = null,
    io = null,
    skipGeofenceValidation = false,
    skipWifiIpValidation = false,
    forceWorkLocationId = null,
    is_mocked = false,
  } = options;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, statusCode: 400, message: 'Thiếu latitude/longitude hợp lệ.' };
  }

  const workLocations = await fetchWorkLocations(employeeId);
  if (!workLocations || workLocations.length === 0) {
    return { ok: false, statusCode: 403, message: 'Bạn chưa được phân công địa điểm chấm công. Vui lòng liên hệ HR.' };
  }

  let workLocation = null;
  let bestDistance = Infinity;
  let errorMsg = WIFI_IP_DENIED_MESSAGE;
  let statusCode = 403;
  let extraRes = null;

  for (const wl of workLocations) {
    if (forceWorkLocationId && wl.work_location_id !== forceWorkLocationId) continue;
    let isValidIp = true;
    if (!skipWifiIpValidation) {
      const clientIpStr = deviceIp == null ? '' : String(deviceIp);
      isValidIp = isIpAllowed(clientIpStr, wl.allowed_ips);
    }

    let isValidGps = true;
    let distanceMeters = 0;
    if (wl.radius_meters != null && !skipGeofenceValidation) {
      distanceMeters = haversineDistanceMeters(lat, lng, Number(wl.latitude), Number(wl.longitude));
      if (distanceMeters > Number(wl.radius_meters)) {
        isValidGps = false;
        if (distanceMeters < bestDistance) {
          bestDistance = distanceMeters;
          errorMsg = 'Bạn đang ở ngoài vùng GPS cho phép.';
          statusCode = 403;
          extraRes = { distance_meters: Number(distanceMeters.toFixed(2)) };
        }
      }
    }

    if (isValidIp && isValidGps) {
      workLocation = wl;
      break;
    }
  }

  if (!workLocation) {
    return { ok: false, statusCode, message: errorMsg, extra: extraRes };
  }

  const attendanceToday = await fetchTodayAttendance(employeeId);
  if (attendanceToday && attendanceToday.check_in_time) {
    return { ok: false, statusCode: 409, message: 'Bạn đã check-in hôm nay. Không thể check-in lần thứ 2.' };
  }

  const now = new Date();
  const status = await getAttendanceStatusForCheckIn(now);

  if (attendanceToday && !attendanceToday.check_in_time) {
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
      bind: [attendanceToday.id, workLocation.work_location_id, lat, lng, deviceIp, status],
    });
    emitAttendanceChanged(io, workLocation, employeeId, 'checkin');
    return { ok: true, statusCode: 200, data: updateRows[0], workLocation };
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
    VALUES ($1, $2, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, NOW(), $3, $4, $5, $6)
    RETURNING id, attendance_date, check_in_time, check_out_time, status
  `;
  const [insertRows] = await db.query(sql, {
    bind: [employeeId, workLocation.work_location_id, lat, lng, deviceIp, status],
  });
  emitAttendanceChanged(io, workLocation, employeeId, 'checkin');
  return { ok: true, statusCode: 201, data: insertRows[0], workLocation };
}

/**
 * Check-out (HTTP hoặc geofence tự động).
 */
async function checkOutEmployee(employeeId, lat, lng, options = {}) {
  const {
    deviceIp = null,
    io = null,
    skipGeofenceValidation = false,
    checkOutNote = null,
    skipWifiIpValidation = false,
    forceWorkLocationId = null,
    is_mocked = false,
  } = options;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, statusCode: 400, message: 'Thiếu latitude/longitude hợp lệ.' };
  }

  const workLocations = await fetchWorkLocations(employeeId);
  if (!workLocations || workLocations.length === 0) {
    return { ok: false, statusCode: 403, message: 'Bạn chưa được phân công địa điểm chấm công. Vui lòng liên hệ HR.' };
  }

  let workLocation = null;
  let bestDistance = Infinity;
  let errorMsg = WIFI_IP_DENIED_MESSAGE;
  let statusCode = 403;
  let extraRes = null;

  for (const wl of workLocations) {
    if (forceWorkLocationId && wl.work_location_id !== forceWorkLocationId) continue;
    let isValidIp = true;
    if (!skipWifiIpValidation) {
      const clientIpStr = deviceIp == null ? '' : String(deviceIp);
      isValidIp = isIpAllowed(clientIpStr, wl.allowed_ips);
    }

    let isValidGps = true;
    let distanceMeters = 0;
    if (wl.radius_meters != null && !skipGeofenceValidation) {
      distanceMeters = haversineDistanceMeters(lat, lng, Number(wl.latitude), Number(wl.longitude));
      if (distanceMeters > Number(wl.radius_meters)) {
        isValidGps = false;
        if (distanceMeters < bestDistance) {
          bestDistance = distanceMeters;
          errorMsg = 'Bạn đang ở ngoài vùng GPS cho phép. Không thể checkout.';
          statusCode = 403;
          extraRes = { distance_meters: Number(distanceMeters.toFixed(2)) };
        }
      }
    }

    if (isValidIp && isValidGps) {
      workLocation = wl;
      break;
    }
  }

  if (!workLocation) {
    return { ok: false, statusCode, message: errorMsg, extra: extraRes };
  }

  const attendanceToday = await fetchTodayAttendance(employeeId);
  if (!attendanceToday || !attendanceToday.check_in_time) {
    return { ok: false, statusCode: 409, message: 'Bạn chưa check-in hôm nay. Không thể checkout.' };
  }
  if (attendanceToday.check_out_time) {
    return { ok: false, statusCode: 409, message: 'Bạn đã checkout hôm nay rồi.' };
  }

  const now = new Date();
  const checkInDateObj = new Date(attendanceToday.check_in_time);
  const status = await getAttendanceStatusForCheckOut(checkInDateObj, now);
  const standardWorkHours = await calcStandardWorkHours(checkInDateObj, now);

  const sql = `
    UPDATE attendance
    SET
      check_out_time = NOW(),
      check_out_latitude = $2,
      check_out_longitude = $3,
      device_ip = $4,
      status = $5,
      total_work_hours = $7,
      check_out_note = COALESCE($6, check_out_note)
    WHERE id = $1
    RETURNING id, attendance_date, check_in_time, check_out_time, status, total_work_hours
  `;

  const [updateRows] = await db.query(sql, {
    bind: [attendanceToday.id, lat, lng, deviceIp, status, checkOutNote, standardWorkHours],
  });
  emitAttendanceChanged(io, workLocation, employeeId, 'checkout');
  return { ok: true, statusCode: 200, data: updateRows[0], workLocation };
}

module.exports = {
  fetchWorkLocations,
  fetchTodayAttendance,
  checkInEmployee,
  checkOutEmployee,
  normalizeWorkLocation,
  haversineDistanceMeters,
  WIFI_IP_DENIED_MESSAGE,
  emitAttendanceChanged,
  calcStandardWorkHours,
  getAttendanceStatusForCheckIn,
  getAttendanceStatusForCheckOut,
};

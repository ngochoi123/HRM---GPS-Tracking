const db = require('../config/database');
const { QueryTypes } = require('sequelize');
const { haversineDistanceMeters } = require('../utils/geoUtils');
const { parseAllowedIps, isIpAllowed } = require('../utils/ipAllowlist');

const getShiftForDate = (dateObj) => {
  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
  const morningStart = 7 * 60 + 30;
  const morningEnd = 11 * 60 + 30;
  const afternoonStart = 13 * 60;
  const afternoonEnd = 17 * 60;

  if (minutes >= morningStart && minutes <= morningEnd) return { name: 'morning', startMinutes: morningStart, endMinutes: morningEnd };
  if (minutes >= afternoonStart && minutes <= afternoonEnd) return { name: 'afternoon', startMinutes: afternoonStart, endMinutes: afternoonEnd };
  return null;
};

const getAttendanceStatusForCheckIn = (dateObj) => {
  const shift = getShiftForDate(dateObj);
  if (!shift) return null;
  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
  return minutes <= shift.startMinutes ? 'on_time' : 'late';
};

const getAttendanceStatusForCheckOut = (checkInDateObj, checkOutDateObj) => {
  const shiftEndMinutes = 17 * 60;
  const checkOutMinutes = checkOutDateObj.getHours() * 60 + checkOutDateObj.getMinutes();
  return checkOutMinutes < shiftEndMinutes ? 'early_leave' : 'on_time';
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Giờ công chuẩn:
 * - Giờ làm: 07:30 -> 17:00
 * - Nghỉ trưa: 11:30 -> 13:00 (không tính công)
 * - Tổng công tối đa: 8.00 giờ/ngày (không tính quá, OT xử lý ở module xin phép)
 */
const calcStandardWorkHours = (checkInDateObj, checkOutDateObj) => {
  if (!(checkInDateObj instanceof Date) || Number.isNaN(checkInDateObj.getTime())) return 0;
  if (!(checkOutDateObj instanceof Date) || Number.isNaN(checkOutDateObj.getTime())) return 0;

  const start = 7 * 60 + 30;
  const end = 17 * 60;
  const lunchStart = 11 * 60 + 30;
  const lunchEnd = 13 * 60;

  const inMinRaw = checkInDateObj.getHours() * 60 + checkInDateObj.getMinutes();
  const outMinRaw = checkOutDateObj.getHours() * 60 + checkOutDateObj.getMinutes();

  const inMin = clamp(inMinRaw, start, end);
  const outMin = clamp(outMinRaw, start, end);

  if (outMin <= inMin) return 0;

  const overlap = outMin - inMin;
  const lunchOverlap = Math.max(0, Math.min(outMin, lunchEnd) - Math.max(inMin, lunchStart));
  const effectiveMinutes = Math.max(0, overlap - lunchOverlap);

  const cappedMinutes = Math.min(effectiveMinutes, 8 * 60);
  const hours = cappedMinutes / 60;
  return Math.round(hours * 100) / 100;
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
        b.branch_name,
        b.allowed_ips
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN branch b ON d.branch_id = b.id
      LEFT JOIN work_location w ON w.branch_id = b.id
      WHERE e.id = $1
    `,
    { bind: [employeeId], type: QueryTypes.SELECT }
  );
  return locationResult.map(normalizeWorkLocation).filter(Boolean);
}

async function fetchTodayAttendance(employeeId) {
  const attendanceResult = await db.query(
    `
      SELECT id, check_in_time, check_out_time
      FROM attendance
      WHERE employee_id = $1 AND attendance_date = CURRENT_DATE
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
  const status = getAttendanceStatusForCheckIn(now);

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
    VALUES ($1, $2, CURRENT_DATE, NOW(), $3, $4, $5, $6)
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
  const status = getAttendanceStatusForCheckOut(checkInDateObj, now);
  const standardWorkHours = calcStandardWorkHours(checkInDateObj, now);

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
};

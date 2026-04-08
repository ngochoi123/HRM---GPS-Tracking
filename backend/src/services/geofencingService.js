/**
 * Geofencing + Socket.io: track_location, grace 5 phút, auto check-in/out.
 * Trạng thái timer: một bản ghi / nhân viên (Map), tránh tạo vô hạn timer.
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { QueryTypes } = require('sequelize');
const {
  haversineDistanceMeters,
  impliedSpeedMetersPerSecond,
  isWeakGpsAccuracy,
} = require('../utils/geoUtils');
const {
  fetchWorkLocations,
  fetchTodayAttendance,
  checkInEmployee,
  checkOutEmployee,
  emitAttendanceChanged,
} = require('./attendanceActions');

const GRACE_MS = 5 * 60 * 1000;
const OUT_ZONE_AUTO_SEC = 300;
const HARD_BUFFER_M = 300;
const MAX_SPEED_MPS = 40;
const ACCURACY_WARN_M = 80;

const AUTO_CHECKOUT_NOTE_HARD = 'Tự động checkout do rời xa vùng làm việc';

/**
 * Theo dõi rời vùng mềm: { startTime: number } theo employee_id (hoặc legacy: chỉ số timestamp).
 * startTime = Date.now() tại lần đầu vượt bán kính (chưa quá HARD_BUFFER).
 */
const outOfZoneTrackers = {};

/** Haversine — cùng ý nghĩa với geoUtils (mét). */
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) =>
  haversineDistanceMeters(lat1, lon1, lat2, lon2);

/** @type {Map<string, { last?: { lat, lng, t, accuracy? }, leaveWarningSent?: boolean }>} */
const employeeTrackState = new Map();

function clearGraceTimer(employeeId) {
  const st = employeeTrackState.get(employeeId);
  if (!st) return;
  employeeTrackState.set(employeeId, {
    ...st,
    leaveWarningSent: false,
  });
}

function setState(employeeId, partial) {
  const prev = employeeTrackState.get(employeeId) || {};
  employeeTrackState.set(employeeId, { ...prev, ...partial });
}

async function resolveEmployeeIdFromToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Thiếu token');
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  const rows = await db.query(
    `SELECT employee_id FROM user_account WHERE id = :uid AND status = 'active' LIMIT 1`,
    { replacements: { uid: decoded.id }, type: QueryTypes.SELECT }
  );
  if (!rows?.length) throw new Error('Không tìm thấy tài khoản');
  return rows[0].employee_id;
}

function branchRoom(branchId) {
  return branchId != null ? `branch_${String(branchId)}` : null;
}

function emitManagerAlert(io, branchId, payload) {
  const room = branchRoom(branchId);
  if (io && room) io.to(room).emit('geofence_manager_alert', payload);
}

function emitEmployee(io, employeeId, event, payload) {
  if (io) io.to(`employee_${employeeId}`).emit(event, payload);
}

function getOutZoneStartMs(uid) {
  const v = outOfZoneTrackers[uid];
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v.startTime != null) return Number(v.startTime);
  return null;
}

function setOutZoneStart(uid, lat, lng, workLocationId, beyondHard = false) {
  outOfZoneTrackers[uid] = { startTime: Date.now(), lat, lng, workLocationId, beyondHard };
}

/** Đồng bộ đồng hồ client + quản lý: secondsRemaining null = trong vùng / không áp dụng. */
function emitOutOfZoneStatus(io, workLocation, employeeId, secondsRemaining) {
  const sr =
    secondsRemaining == null || Number.isNaN(Number(secondsRemaining))
      ? null
      : Math.max(0, Number(secondsRemaining));
  const payload = { secondsRemaining: sr };
  emitEmployee(io, employeeId, 'out_of_zone_status', payload);
  if (io) io.emit(`out_of_zone_status_${employeeId}`, payload);
  const room = branchRoom(workLocation?.branch_id);
  if (io && room) {
    io.to(room).emit('employee_out_of_zone_tick', {
      employee_id: employeeId,
      secondsRemaining: sr,
    });
  }
}

/**
 * Xử lý một điểm vị trí từ mobile.
 */
async function processTrackLocation(io, employeeId, payload) {
  const lat = Number(payload?.latitude);
  const lng = Number(payload?.longitude);
  const accuracy = payload?.accuracy != null ? Number(payload.accuracy) : null;
  const now = Date.now();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    emitEmployee(io, employeeId, 'tracking_error', { message: 'latitude/longitude không hợp lệ' });
    return;
  }

  const prevState = employeeTrackState.get(employeeId) || {};
  const prev = prevState.last;

  if (prev) {
    const dtMs = now - prev.t;
    const speed =
      dtMs > 5 * 60 * 1000
        ? null
        : impliedSpeedMetersPerSecond(
            { lat: prev.lat, lng: prev.lng, t: prev.t },
            { lat, lng, t: now }
          );
    if (speed != null && speed > MAX_SPEED_MPS) {
      const wls = await fetchWorkLocations(employeeId);
      emitManagerAlert(io, wls?.[0]?.branch_id, {
        type: 'speed_anomaly',
        severity: 'warning',
        employee_id: employeeId,
        implied_speed_mps: Number(speed.toFixed(2)),
        max_allowed_mps: MAX_SPEED_MPS,
        message: 'Vị trí di chuyển bất thường (tốc độ ước lượng quá cao giữa hai lần gửi).',
      });
    }
  }

  if (isWeakGpsAccuracy(accuracy, ACCURACY_WARN_M)) {
    const wls = await fetchWorkLocations(employeeId);
    emitManagerAlert(io, wls?.[0]?.branch_id, {
      type: 'poor_accuracy',
      severity: 'info',
      employee_id: employeeId,
      accuracy_meters: accuracy,
      message: 'Độ chính xác GPS thấp — có nguy cơ sai lệch vị trí.',
    });
  }

  setState(employeeId, { last: { lat, lng, t: now, accuracy } });

  const workLocations = await fetchWorkLocations(employeeId);
  if (!workLocations || workLocations.length === 0) {
    emitEmployee(io, employeeId, 'tracking_error', { message: 'Chưa cấu hình địa điểm chấm công' });
    return;
  }

  let inside = false;
  let beyondHard = true;
  let minDistance = Infinity;
  let closestRadius = 100;
  let bestWorkLocation = workLocations[0];

  for (const wl of workLocations) {
    const centerLat = Number(wl.latitude);
    const centerLng = Number(wl.longitude);
    const rad = wl.radius_meters == null ? 100 : Number(wl.radius_meters);
    const d = getDistanceFromLatLonInMeters(lat, lng, centerLat, centerLng);
    
    if (d <= rad) {
      inside = true;
      beyondHard = false;
      bestWorkLocation = wl;
      minDistance = d;
      closestRadius = rad;
      break;
    }
    
    if (d < minDistance) {
      minDistance = d;
      closestRadius = rad;
      bestWorkLocation = wl;
      if (d <= rad + HARD_BUFFER_M) {
        beyondHard = false;
      }
    }
  }

  const workLocation = bestWorkLocation;
  const dist = minDistance;
  const radius = closestRadius;

  const attendance = await fetchTodayAttendance(employeeId);
  const hasCheckIn = Boolean(attendance?.check_in_time);
  const hasCheckOut = Boolean(attendance?.check_out_time);

  // --- Auto check-in: chưa vào ca, đang trong vùng ---
  if (!hasCheckIn && inside) {
    clearGraceTimer(employeeId);
    const result = await checkInEmployee(employeeId, lat, lng, {
      deviceIp: 'socket:geofence',
      io,
      skipGeofenceValidation: true,
      skipWifiIpValidation: true,
      forceWorkLocationId: bestWorkLocation.work_location_id
    });
    if (result.ok) {
      emitEmployee(io, employeeId, 'geofence_auto_checkin', {
        message: 'Đã tự động check-in khi vào vùng chấm công.',
        data: result.data,
      });
    }
    return;
  }

  if (!hasCheckIn && !inside) {
    return;
  }

  if (hasCheckOut) {
    delete outOfZoneTrackers[employeeId];
    clearGraceTimer(employeeId);
    emitOutOfZoneStatus(io, workLocation, employeeId, null);
    return;
  }

  // --- Đã check-in, chưa check-out ---
  if (inside) {
    delete outOfZoneTrackers[employeeId];
    clearGraceTimer(employeeId);
    emitOutOfZoneStatus(io, workLocation, employeeId, null);
    return;
  }

  // Ra khỏi vùng
  if (beyondHard && false) { // Vô hiệu hoá auto checkout tức thì do lỗi nhảy GPS
    // (Đã xóa xử lý checkout tức thì, gộp chung vào hẹn giờ bên dưới)
  }

  // Ngoài vùng (dù xa hay gần) -> Cập nhật/Sinh tracker
  const uid = employeeId;
  const nowMs = Date.now();
  if (getOutZoneStartMs(uid) == null) {
      setOutZoneStart(uid, lat, lng, bestWorkLocation?.work_location_id, beyondHard);
  } else {
      // Cập nhật toạ độ mới nhất vào tracker để nếu có sweep sẽ lấy toạ độ này
      outOfZoneTrackers[uid].lat = lat;
      outOfZoneTrackers[uid].lng = lng;
      outOfZoneTrackers[uid].beyondHard = beyondHard;
  }
  
  const startTime = getOutZoneStartMs(uid);
  const diffSeconds = startTime != null ? (nowMs - startTime) / 1000 : 0;

  // Thời gian đếm tuỳ theo mức độ (vượt giới hạn cứng -> 60s, vượt cảnh báo -> 5 phút)
  const isHard = outOfZoneTrackers[uid]?.beyondHard;
  const AT_SEC = isHard ? 60 : OUT_ZONE_AUTO_SEC;

  // Nếu là GPS bị nhảy, ta không cảnh báo ngay để tránh spam màn hình
  const DEBOUNCE_UI_SEC = 20;

  const st = employeeTrackState.get(employeeId) || {};
  if (!st.leaveWarningSent && diffSeconds >= DEBOUNCE_UI_SEC) {
    setState(employeeId, { leaveWarningSent: true });
    emitEmployee(io, employeeId, 'geofence_leave_warning', {
      message: isHard ? 'Lưu ý: Bạn đã rời khu vực quá xa, sẽ tự Checkout sau 1 phút' : 'Bạn đã ra khỏi vùng chấm công, vui lòng quay lại trong 5 phút',
      grace_ms: Math.max(0, AT_SEC * 1000 - DEBOUNCE_UI_SEC * 1000), // trừ đi thời gian đã debounce
      distance_meters: Number(dist.toFixed(2)),
      radius_meters: radius,
    });
  }

  if (diffSeconds >= AT_SEC) {
    try {
      const tracker = outOfZoneTrackers[uid] || {};
      // Nếu là beyondHard mà quá 5p, lấy note tương ứng
      const finalNote = (beyondHard && diffSeconds > 60) ? AUTO_CHECKOUT_NOTE_HARD : 'Tự động Checkout: Rời vùng chấm công > 5 phút.';
      const out = await checkOutEmployee(uid, tracker.lat || lat, tracker.lng || lng, {
        deviceIp: 'socket:geofence',
        io,
        skipGeofenceValidation: true,
        skipWifiIpValidation: true,
        checkOutNote: finalNote,
        forceWorkLocationId: tracker.workLocationId || bestWorkLocation?.work_location_id
      });
      delete outOfZoneTrackers[uid];
      emitOutOfZoneStatus(io, workLocation, uid, null);
      if (out.ok) {
        const msg = 'Hệ thống đã tự động Check-out do rời vùng quá 5 phút.';
        io.emit(`personal_event_${uid}`, { action: 'AUTO_CHECKOUT', message: msg });
        clearGraceTimer(uid);
        emitEmployee(io, uid, 'geofence_auto_checkout', {
          message: msg,
          data: out.data,
        });
      }
    } catch (e) {
      console.error('[geofence] auto checkout (5 phút rời vùng):', e);
    }
    return;
  }

  if (diffSeconds >= DEBOUNCE_UI_SEC) {
    const secondsRemaining = Math.max(0, AT_SEC - diffSeconds);
    emitOutOfZoneStatus(io, workLocation, employeeId, secondsRemaining);
  }
}

function registerGeofencingSocket(io) {
  io.on('connection', (socket) => {
    socket.on('authenticate_tracking', async (payload, ack) => {
      try {
        const token = payload?.token;
        const employeeId = await resolveEmployeeIdFromToken(token);
        socket.data.employeeId = employeeId;
        socket.join(`employee_${employeeId}`);

        const wls = await fetchWorkLocations(employeeId);
        const room = branchRoom(wls?.[0]?.branch_id);
        if (room) socket.join(room);

        const reply = { ok: true, employee_id: employeeId, branch_id: wls?.[0]?.branch_id ?? null };
        if (typeof ack === 'function') ack(reply);
        socket.emit('tracking_authenticated', reply);
      } catch (e) {
        console.warn('[geofence] authenticate_tracking failed:', e.message);
        const err = { ok: false, message: e.message || 'Xác thực thất bại' };
        if (typeof ack === 'function') ack(err);
        socket.emit('tracking_error', err);
      }
    });

    socket.on('track_location', async (payload) => {
      const employeeId = socket.data.employeeId;
      if (!employeeId) {
        socket.emit('tracking_error', { message: 'Chưa xác thực (authenticate_tracking).' });
        return;
      }
      try {
        await processTrackLocation(io, employeeId, payload || {});
        const lat = Number(payload?.latitude);
        const lng = Number(payload?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          io.emit('employee_location_update', {
            user_id: employeeId,
            employee_id: employeeId,
            latitude: lat,
            longitude: lng,
            timestamp: typeof payload?.timestamp === 'number' ? payload.timestamp : Date.now(),
            accuracy: payload?.accuracy != null ? Number(payload.accuracy) : undefined,
          });
        }
      } catch (e) {
        console.error('[geofence] track_location error:', e);
        socket.emit('tracking_error', { message: e.message || 'Lỗi xử lý vị trí' });
      }
    });

    socket.on('disconnect', () => {
      // outOfZoneTrackers giữ theo employeeId — không xóa khi socket rớt (mobile có thể tạm ngắt).
    });
  });

  setInterval(async () => {
    const now = Date.now();
    for (const [uid, tracker] of Object.entries(outOfZoneTrackers)) {
      if (typeof tracker === 'object' && tracker.startTime) {
        const diffSeconds = (now - tracker.startTime) / 1000;
        const AT_SEC = tracker.beyondHard ? 60 : OUT_ZONE_AUTO_SEC;
        if (diffSeconds >= AT_SEC) {
          console.log(`[Sweep] Tự động checkout nhân viên ${uid} bị disconnect khi đang ra vùng`);
          try {
            const finalNote = tracker.beyondHard ? AUTO_CHECKOUT_NOTE_HARD : 'Tự động Checkout: Rời vùng chấm công > 5 phút.';
            const out = await checkOutEmployee(uid, tracker.lat, tracker.lng, {
              deviceIp: 'socket:sweep',
              io,
              skipGeofenceValidation: true,
              skipWifiIpValidation: true,
              checkOutNote: finalNote,
              forceWorkLocationId: tracker.workLocationId
            });
            delete outOfZoneTrackers[uid];
            clearGraceTimer(uid);
            emitOutOfZoneStatus(io, null, uid, null);
            if (out.ok) {
              const msg = `Hệ thống tự động Check-out. Ngoại tuyến > ${AT_SEC}s.`;
              io.emit(`personal_event_${uid}`, { action: 'AUTO_CHECKOUT', message: msg });
              emitEmployee(io, uid, 'geofence_auto_checkout', {
                message: msg,
                data: out.data,
              });
            }
          } catch (e) {
            console.error('[sweep auto checkout error]', e);
          }
        }
      }
    }
  }, 15000);

  console.log('[Geofence] Socket handlers đã đăng ký (authenticate_tracking, track_location)');
}

module.exports = {
  registerGeofencingSocket,
  processTrackLocation,
  employeeTrackState,
  outOfZoneTrackers,
  getDistanceFromLatLonInMeters,
  GRACE_MS,
  HARD_BUFFER_M,
};

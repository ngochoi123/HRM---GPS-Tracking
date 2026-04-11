/**
 * Công cụ địa lý dùng chung: Haversine, ước lượng tốc độ, heuristic GPS.
 */

const EARTH_RADIUS_M = 6371000;

const toRadians = (deg) => (deg * Math.PI) / 180;

/**
 * Khoảng cách giữa hai điểm (mét) — công thức Haversine.
 */
function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Tốc độ dịch chuyển ước lượng (m/s). Trả null nếu không đủ dữ liệu.
 */
function impliedSpeedMetersPerSecond(prev, next) {
  if (!prev || !next) return null;
  const dtMs = next.t - prev.t;
  if (dtMs < 500) return null;
  const dist = haversineDistanceMeters(prev.lat, prev.lng, next.lat, next.lng);
  return dist / (dtMs / 1000);
}

/**
 * @param {number|null|undefined} accuracyMeters - từ thiết bị (m)
 * @param {number} maxAcceptable - ngưỡng cảnh báo (m)
 */
function isWeakGpsAccuracy(accuracyMeters, maxAcceptable = 80) {
  if (accuracyMeters == null || Number.isNaN(Number(accuracyMeters))) return false;
  return Number(accuracyMeters) > maxAcceptable;
}

module.exports = {
  haversineDistanceMeters,
  impliedSpeedMetersPerSecond,
  isWeakGpsAccuracy,
  EARTH_RADIUS_M,
};

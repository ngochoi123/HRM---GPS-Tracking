/**
 * Chuẩn hóa IP client (Express / proxy thường trả về ::ffff:x.x.x.x).
 */
function normalizeClientIp(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (s.startsWith('::ffff:')) return s.slice(7);
  return s;
}

/**
 * Parse allowed_ips từ DB: JSON array, chuỗi JSON, hoặc danh sách phân tách.
 */
function parseAllowedIps(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p)) {
        return p.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch (_) {
      /* ignore */
    }
    return t.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Nếu danh sách rỗng: không bắt buộc WiFi IP → cho phép.
 * @param {string|null|undefined} clientIp
 * @param {unknown} allowedIps — mảng hoặc raw từ DB
 */
function isIpAllowed(clientIp, allowedIps) {
  const list = parseAllowedIps(allowedIps);
  if (!list.length) return true;
  const normalized = normalizeClientIp(clientIp);
  if (!normalized) return false;
  return list.some((allowedIp) => {
    const normAllowed = normalizeClientIp(allowedIp);
    if (normAllowed.endsWith('*')) {
      const prefix = normAllowed.slice(0, -1);
      return normalized.startsWith(prefix);
    }
    return normAllowed === normalized;
  });
}

/**
 * IP thật của client: X-Forwarded-For (proxy) hoặc socket.
 */
function getClientIp(req) {
  if (!req) return '';
  let ip = '';
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    ip = xff.split(',')[0].trim();
  } else if (Array.isArray(xff) && xff.length > 0) {
    ip = String(xff[0]).trim();
  } else {
    ip = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '';
  }
  return normalizeClientIp(ip);
}

module.exports = {
  normalizeClientIp,
  parseAllowedIps,
  isIpAllowed,
  getClientIp,
};

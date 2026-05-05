// =============================================
// Shared utilities for all Employee Request pages
// =============================================

/** Format date to vi-VN locale (e.g. 05/05/2026) */
export const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

/** Format date to DD/MM/YYYY */
export const formatDateDMY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Return the label for a request status */
export const getStatusLabel = (status) => {
  if (status === 'approved') return 'Đã duyệt';
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'rejected') return 'Từ chối';
  return 'Không xác định';
};

/** Get MM/YYYY string for the most recent request in a list */
export const getLatestMonthYear = (requests = [], dateField = 'created_at') => {
  if (!Array.isArray(requests) || requests.length === 0) return '--/----';
  const sorted = [...requests].sort(
    (a, b) => new Date(b[dateField] || b.created_at) - new Date(a[dateField] || a.created_at)
  );
  const latest = new Date(sorted[0][dateField] || sorted[0].created_at);
  if (isNaN(latest)) return '--/----';
  return `${String(latest.getMonth() + 1).padStart(2, '0')}/${latest.getFullYear()}`;
};

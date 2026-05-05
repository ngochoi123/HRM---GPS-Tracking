import React from 'react';
import { MdCalendarMonth } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';
import { getStatusLabel } from './requestUtils';

// ─────────────────────────────────────────────
// StatusPill – badge trạng thái đơn
// Props: status ('approved' | 'pending' | 'rejected')
// ─────────────────────────────────────────────
export const StatusPill = ({ status }) => (
  <span
    className={`status-pill ${status}`}
    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}
  >
    <span className="dot" style={{ marginRight: 4 }}>●</span>
    {getStatusLabel(status)}
  </span>
);

// ─────────────────────────────────────────────
// RejectReason – lý do từ chối trong modal chi tiết
// Chỉ render khi có reason
// ─────────────────────────────────────────────
export const RejectReason = ({ reason }) => {
  if (!reason) return null;
  return (
    <div className="info-section">
      <h3 className="section-title">Lý do từ chối</h3>
      <p
        className="info-content"
        style={{ color: '#dc2626', fontWeight: 500, paddingLeft: 10 }}
      >
        {reason}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────
// MonthFilter – ô lọc theo tháng
// Props: value, onChange
// ─────────────────────────────────────────────
export const MonthFilter = ({ value, onChange }) => (
  <div className="filter-right">
    <div className="filter-right-search">
      <MdCalendarMonth className="month-icon" />
      <span> Tháng: </span>
    </div>
    <input
      className="input-month-search"
      type="month"
      value={value}
      onChange={onChange}
    />
  </div>
);

// ─────────────────────────────────────────────
// HistoryPageHeader – tiêu đề trang lịch sử đơn
// Props: title, subtitle, onBack
// ─────────────────────────────────────────────
export const HistoryPageHeader = ({
  title = 'Đơn đã gửi',
  subtitle = 'Tất cả các đơn bạn đã gửi',
  onBack,
}) => (
  <div className="history-page-header">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <button className="btn-back" onClick={onBack}>
      <IoArrowBack /> Quay lại
    </button>
  </div>
);

// ─────────────────────────────────────────────
// ConfirmModal – modal xác nhận hành động (gửi / hủy)
// Props: show, title, message, onConfirm, onCancel,
//        confirmLabel, cancelLabel, confirmStyle
// ─────────────────────────────────────────────
export const ConfirmModal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmStyle = {},
}) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '28px 32px',
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          textAlign: 'center',
        }}
      >
        {title && (
          <h3 style={{ marginBottom: 10, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {title}
          </h3>
        )}
        {message && (
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#f9fafb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              color: '#374151',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              ...confirmStyle,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Toast – thông báo nhanh
// Props: message, type ('success' | 'error' | 'info')
// ─────────────────────────────────────────────
export const Toast = ({ message, type }) => {
  if (!message) return null;
  return <div className={`toast ${type}`}>{message}</div>;
};

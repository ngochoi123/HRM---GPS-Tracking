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
// Phản hồi từ người duyệt (Mẫu hộp đỏ theo thiết kế mới)
export const ApproverFeedback = ({ status, reason }) => {
  if (status !== 'rejected') return null;
  
  return (
    <div className="border border-red-100 bg-red-50/80 rounded-[16px] p-5 mb-6 relative overflow-hidden mt-4">
      {/* Dải màu đỏ đánh dấu bên trái */}
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-red-500"></div>
      
      <div className="flex items-start gap-3">
        <div className="mt-0.5 bg-red-100 text-red-600 p-1.5 rounded-full shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-red-800 text-[13px]">Phản hồi từ người duyệt</h3>
            <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-200 shadow-sm">
              <span className="w-[5px] h-[5px] rounded-full bg-red-600"></span>
              TỪ CHỐI
            </span>
          </div>
          <div className="bg-white rounded-xl p-3.5 border border-red-100 shadow-sm w-full">
            <p className="text-red-600 font-medium text-[13px] leading-relaxed italic">
              "{reason || 'không được'}"
            </p>
          </div>
        </div>
      </div>
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

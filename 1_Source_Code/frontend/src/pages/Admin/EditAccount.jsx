import React, { useState } from 'react';
import { ArrowLeft, UserSquare2, KeyRound, ShieldCheck, Lock, Mail, Save } from 'lucide-react';

const EditAccount = ({ user, onBack }) => {
  // Trạng thái lưu dữ liệu form chỉnh sửa (lấy giá trị mặc định từ user được truyền vào)
  const [formData, setFormData] = useState({
    role: user?.role || 'HR Manager',
    status: user?.status ? 'ACTIVE' : 'INACTIVE',
    sendEmail: true
  });

  // Mock dữ liệu phòng ban (nếu user truyền vào chưa có)
  const department = user?.department || 'Phòng Hành chính Nhân sự';

  return (
    <div className="ca-container">
      {/* HEADER */}
      <div className="ca-header">
        <div className="ca-header-left">
          <div className="ca-title-icon-wrapper amber-theme">
            <UserSquare2 size={24} className="ca-title-icon amber-icon" />
          </div>
          <div>
            <h2 className="au-title" style={{ margin: 0 }}>Chỉnh sửa tài khoản hệ thống</h2>
            <p className="au-subtitle">Cập nhật thông tin phân quyền và trạng thái hoạt động của tài khoản.</p>
          </div>
        </div>
        <button className="au-btn au-btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      {/* FORM NỘI DUNG */}
      <div className="ca-form-content">
        
        {/* KHỐI 1: THÔNG TIN NHÂN SỰ */}
        <div className="ca-card">
          <h3 className="ca-card-title amber-text">
            <UserSquare2 size={18} /> Thông tin Nhân sự
          </h3>
          <div className="ca-form-group">
            <label>Nhân viên đang chọn</label>
            <div className="ca-selected-user-box">
              <div className="au-avatar" style={{ backgroundColor: user?.bgColor || '#f3f4f6', color: user?.textColor || '#4b5563', width: '48px', height: '48px', fontSize: '16px' }}>
                {user?.avatarText || 'US'}
              </div>
              <div className="ca-selected-user-info">
                <h4>{user?.name || 'Tên nhân viên'}</h4>
                <p>{department}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: THÔNG TIN ĐĂNG NHẬP */}
        <div className="ca-card">
          <h3 className="ca-card-title amber-text">
            <KeyRound size={18} /> Thông tin Đăng nhập
          </h3>
          <div className="ca-grid-2">
            <div className="ca-form-group">
              <label>Tên đăng nhập (Username)</label>
              <div className="ca-input-with-icon">
                <input 
                  type="text" 
                  value={user?.username || 'username'} 
                  className="ca-input ca-locked-input" 
                  disabled 
                  readOnly
                />
                <Lock size={16} className="ca-input-suffix locked-icon" />
              </div>
            </div>
            <div className="ca-form-group">
              <label>Mật khẩu</label>
              <button type="button" className="ca-btn-reset-pass">
                <Mail size={16} /> Gửi link Reset mật khẩu
              </button>
            </div>
          </div>
        </div>

        {/* KHỐI 3: PHÂN QUYỀN & BẢO MẬT */}
        <div className="ca-card">
          <h3 className="ca-card-title amber-text">
            <ShieldCheck size={18} /> Phân quyền & Bảo mật
          </h3>
          <div className="ca-grid-2">
            <div className="ca-form-group">
              <label>Vai trò (Role) <span className="ca-required">*</span></label>
              <select 
                className="ca-input-select"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="USER">User (Nhân viên bình thường)</option>
                <option value="HR Manager">HR Manager (Quản lý Nhân sự)</option>
                <option value="DIRECTOR">Director (Giám đốc)</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>
            <div className="ca-form-group">
              <label>Trạng thái tài khoản</label>
              <select 
                className="ca-input-select" 
                style={{ color: formData.status === 'ACTIVE' ? '#10b981' : '#ef4444', fontWeight: '500' }}
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="ACTIVE">Đang hoạt động (Active)</option>
                <option value="INACTIVE">Khóa tạm thời</option>
              </select>
            </div>
          </div>

          {/* CHECKBOX OPTIONS */}
          <div className="ca-options-box amber-bg">
            <label className="ca-checkbox-label">
              <input 
                type="checkbox" 
                className="ca-checkbox-amber"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({...formData, sendEmail: e.target.checked})}
              />
              <span>Gửi thông báo về thay đổi tài khoản qua Email của nhân viên</span>
            </label>
          </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="ca-footer">
        <button className="au-btn au-btn-outline" onClick={onBack} style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db' }}>
          Hủy bỏ
        </button>
        <button className="au-btn ca-btn-amber" style={{ padding: '10px 24px' }}>
          <Save size={16} /> Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

export default EditAccount;
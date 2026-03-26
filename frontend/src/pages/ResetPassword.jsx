import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lấy email từ trang OTP truyền sang
  const email = location.state?.email || "";
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // ================================================================
    // 🟢 KIỂM TRA ĐIỀU KIỆN ĐẦU VÀO (VALIDATION THEO TEST CASE)
    // ================================================================
    const isNewPassEmpty = !newPassword;
    const isConfirmEmpty = !confirmPassword;

    // FUNC-TMK01: Để trống các trường dữ liệu
    if (isNewPassEmpty || isConfirmEmpty) {
      setError('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu!');
      return;
    }

    // FUNC-TMK02: Mật khẩu quá ngắn (< 8 ký tự)
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự!');
      return;
    }

    // FUNC-TMK03: Mật khẩu thiếu "Số" hoặc "Chữ" (Dùng Regex để check)
    const hasLetterAndNumber = /(?=.*[a-zA-Z])(?=.*\d)/;
    if (!hasLetterAndNumber.test(newPassword)) {
      setError('Mật khẩu phải bao gồm cả chữ cái và chữ số!');
      return;
    }

    // FUNC-TMK04: Mật khẩu và Xác nhận không khớp
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, newPassword: newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoading(false);
        // FUNC-TMK08: Đổi mật khẩu thành công
        alert('Đổi mật khẩu thành công!');
        navigate('/login');
      } else {
        // FUNC-TMK06: Mật khẩu mới trùng mật khẩu cũ (API Backend trả về)
        setError(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến máy chủ!');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-top-bar"></div>
        <div className="login-header">
          {/* GUI-TMK01: Tiêu đề và Mô tả */}
          <h2>Tạo mật khẩu mới</h2>
          <p>Mật khẩu của bạn phải có <strong>ít nhất 8 ký tự</strong> và bao gồm <strong>cả chữ và số</strong>.</p>
        </div>

        {error && (
          <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Thêm noValidate để Frontend tự kiểm soát lỗi trống */}
        <form onSubmit={handleResetPassword} noValidate>
          <div className="form-group">
            <label className="form-label">Mật khẩu mới</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
              />
              <button 
                type="button" 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
              <button 
                type="button" 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* GUI-TMK04: Button Xác nhận */}
          <button type="submit" disabled={isLoading} className="btn-login" style={{ marginTop: '24px' }}>
            {isLoading ? 'Đang cập nhật...' : 'Xác nhận'}
          </button>
        </form>

        {/* GUI-TMK05 & FUNC-TMK07: Link Quay lại đăng nhập */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', 
              color: '#6b7280', fontSize: '14px', fontWeight: '500', cursor: 'pointer', gap: '6px'
            }}
            onMouseOver={(e) => e.target.style.color = '#1da053'}
            onMouseOut={(e) => e.target.style.color = '#6b7280'}
          >
            <ArrowLeft size={16} /> Quay lại đăng nhập
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;
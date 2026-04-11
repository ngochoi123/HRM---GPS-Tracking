import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authService } from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); 
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // ================================================================
    // 🟢 KIỂM TRA ĐIỀU KIỆN ĐẦU VÀO (VALIDATION THEO TEST CASE)
    // ================================================================
    const trimmedEmail = email.trim();

    // FUNC-DMK01: Kiểm tra lỗi để trống email
    if (!trimmedEmail) {
      setError("Vui lòng nhập email tài khoản đã được đăng ký từ trước !");
      return;
    }

    // FUNC-DMK02: Kiểm tra lỗi định dạng email (thiếu chữ @)
    if (!trimmedEmail.includes('@')) {
      setError("Vui lòng nhập đúng định dạng email bao gồm '@' trong địa chỉ email!");
      return;
    }

    // Nếu qua được các bước trên, bắt đầu loading và xóa lỗi cũ
    setIsLoading(true);
    setError(''); 

    try {
      const data = await authService.forgotPassword(trimmedEmail);

      if (data.success) {
        setIsLoading(false);
        // FUNC-DMK04: Gửi mail thành công, chuyển sang trang nhập mã OTP
        navigate('/verify-otp', { state: { email: trimmedEmail } }); 
      } else {
        // FUNC-DMK03: Email không tồn tại trong hệ thống 
        // Ghi đè thông báo trả về từ Backend để khớp 100% với Test Case
        setError("Thông tin không hợp lệ và không thực hiện thay đổi mật khẩu");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-top-bar"></div>

        <div className="login-header">
          <h2>Quên mật khẩu?</h2>
          <p>
            Đừng lo lắng! Vui lòng nhập địa chỉ email liên kết với tài khoản của bạn. 
            Chúng tôi sẽ gửi một mã xác nhận (OTP) để giúp bạn đặt lại mật khẩu.
          </p>
        </div>

        {/* --- KHU VỰC HIỂN THỊ LỖI --- */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center" style={{ marginBottom: '16px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Thêm noValidate để chặn popup cảnh báo định dạng mặc định của trình duyệt */}
        <form onSubmit={handleSendOTP} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email đã đăng ký</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="text"  // Đổi thành text để React tự bắt lỗi định dạng theo Test Case
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Ví dụ: nguyenvan.a@congty.com"
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-login" style={{ marginTop: '10px' }}>
            {isLoading ? 'Đang gửi mã OTP...' : 'Gửi mã OTP'}
          </button>
        </form>

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

export default ForgotPassword;
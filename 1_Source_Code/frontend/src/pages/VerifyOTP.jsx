import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import { authService } from '../services/authService';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); 
  const [countdown, setCountdown] = useState(60); 
  
  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    if (element.value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // 👉 HÀM XỬ LÝ SỰ KIỆN PASTE
  const handlePaste = (e) => {
    e.preventDefault(); 
    const pastedData = e.clipboardData.getData('text');
    
    // Kiểm tra xem chuỗi dán vào có phải là số không
    if (!/^\d+$/.test(pastedData)) return;

    // Cắt lấy 6 số đầu tiên và rải đều vào mảng
    const pastedCode = pastedData.slice(0, 6).split('');
    const newOtp = [...otp];

    pastedCode.forEach((char, index) => {
      newOtp[index] = char;
    });

    setOtp(newOtp);

    // Tự động nhảy con trỏ chuột đến ô hợp lý
    const nextFocusIndex = pastedCode.length < 6 ? pastedCode.length : 5;
    inputRefs.current[nextFocusIndex].focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length < 6) {
      setError("Vui lòng nhập đủ 6 số OTP!");
      return;
    }

    setIsLoading(true);
    setError(''); 

    try {
      const data = await authService.verifyOtp({ email, otp: otpCode });

      if (data.success) {
        setIsLoading(false);
        navigate('/reset-password', { state: { email: email } }); 
      } else {
        setError(data.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể kết nối đến máy chủ!');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(''); 
    setIsLoading(true); // 👉 Đã sửa lỗi syntax chỗ này

    try {
      const data = await authService.forgotPassword(email);

      if (data.success) {
        // FUNC-OTP08: Báo thành công "Đã gửi lại mã"
        alert('Đã gửi lại mã - Vui lòng kiểm tra lại email của bạn.');
        setCountdown(60); 
      } else {
        setError(data.message || 'Lỗi khi gửi lại mã OTP');
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể kết nối đến máy chủ để gửi lại mã!');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-top-bar"></div>

        <div className="login-header">
          <h2 style={{ fontWeight: 'bold' }}>Xác minh OTP</h2>
          <p>
            Mã xác nhận gồm 6 chữ số đã được gửi đến email <br />
            <strong style={{ color: '#111827' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="otp-container">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                className="otp-input"
                value={data}
                ref={(el) => (inputRefs.current[index] = el)}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste} // 👉 Đã thêm sự kiện ở đây
                onFocus={(e) => e.target.select()}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="resend-text">
            Bạn không nhận được mã? 
            {countdown > 0 ? (
              <span style={{ color: '#9ca3af' }}> Gửi lại mã sau {countdown}s</span>
            ) : (
              <button 
                type="button" 
                className="resend-link" 
                onClick={handleResend}
              >
                 Gửi lại mã
              </button>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn-login btn-verify-otp">
            {isLoading ? 'Đang xác thực...' : 'Xác nhận OTP'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', 
              color: '#6b7280', fontSize: '14px', fontWeight: '500', cursor: 'pointer', gap: '6px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#1da053')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
          >
            <ArrowLeft size={16} /> Quay lại đăng nhập
          </button>
        </div>

      </div>
    </div>
  );
};

export default VerifyOTP;
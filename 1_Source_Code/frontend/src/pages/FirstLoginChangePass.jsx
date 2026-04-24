import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { authService } from '../services/authService';

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

const eyeButtonStyle = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#6b7280'
};

const FirstLoginChangePass = ({ username, onSuccess }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!PASSWORD_RULE.test(formData.newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự, gồm 1 chữ hoa, 1 số và 1 ký tự đặc biệt!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.changePasswordFirst({
        username,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });

      alert(res?.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="login-top-bar"></div>

      <div className="login-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          <div style={{ background: '#f3e8ff', padding: '15px', borderRadius: '50%', color: '#8b5cf6' }}>
            <ShieldCheck size={40} />
          </div>
        </div>
        <h2>Bảo mật tài khoản</h2>
        <p>Vui lòng đổi mật khẩu tạm thời để kích hoạt tài khoản</p>
      </div>

      {error && (
        <div
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Lock size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Mật khẩu tạm thời (Trong Email)</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showOldPassword ? 'text' : 'password'}
              className="form-input"
              required
              placeholder="Nhập mật khẩu cũ..."
              value={formData.oldPassword}
              onChange={handleChange('oldPassword')}
            />
            <button
              type="button"
              style={eyeButtonStyle}
              onClick={() => setShowOldPassword((prev) => !prev)}
              aria-label={showOldPassword ? 'Ẩn mật khẩu cũ' : 'Hiện mật khẩu cũ'}
            >
              {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Mật khẩu mới</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              className="form-input"
              required
              placeholder="Nhập mật khẩu mới..."
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
            />
            <button
              type="button"
              style={eyeButtonStyle}
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ hoa, 1 số và 1 ký tự đặc biệt.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Xác nhận mật khẩu mới</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              required
              placeholder="Nhập lại mật khẩu mới..."
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
            <button
              type="button"
              style={eyeButtonStyle}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-login"
          style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <KeyRound size={20} />
          {isLoading ? 'Đang cập nhật...' : 'Xác nhận thay đổi'}
        </button>
      </form>
    </div>
  );
};

export default FirstLoginChangePass;

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { authService } from '../services/authService';

const FirstLoginChangePass = ({ username, onSuccess }) => {
  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.changePasswordFirst({
        username,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });
      
      alert(res?.message || "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      onSuccess(); // Chuyển thẳng về màn hình Login
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Tái sử dụng class từ Login.css để form tự động đẹp và đồng bộ
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
        <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Lock size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Mật khẩu tạm thời (Trong Email)</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input 
              type={showPass ? "text" : "password"} 
              className="form-input" 
              required
              placeholder="Nhập mật khẩu cũ..."
              value={formData.oldPassword}
              onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Mật khẩu mới</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input 
              type={showPass ? "text" : "password"} 
              className="form-input" 
              required
              placeholder="Nhập mật khẩu mới..."
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
            />
            <button
              type="button"
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Xác nhận mật khẩu mới</label>
          <div className="input-wrapper" style={{ position: 'relative' }}>
            <input 
              type={showPass ? "text" : "password"} 
              className="form-input" 
              required
              placeholder="Nhập lại mật khẩu mới..."
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-login" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={20} />
          {isLoading ? 'Đang cập nhật...' : 'Xác nhận thay đổi'}
        </button>
      </form>
    </div>
  );
};

export default FirstLoginChangePass;
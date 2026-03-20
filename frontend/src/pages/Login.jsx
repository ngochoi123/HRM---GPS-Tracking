import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: email,
          password: password 
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // CHIA NGẢ ĐƯỜNG DỰA VÀO ROLE (QUYỀN)
        const userRole = data.user.role;
        
        if (userRole === 'ADMIN') {
          navigate('/Admin/users');
        } else if (userRole === 'DIRECTOR') {
          navigate('/GiamDoc/Dashboard'); // Sửa lại chữ d thường theo route App.jsx
        } else if (userRole === 'MANAGER') {
          navigate('/QuanLy/Dashboard');
        } else {
          // Lưu ý: Trong App.jsx bạn không có route nào tên /NhanVien/DashboardHome
          // Mà bạn đang dùng route /dashboard cho nhân viên. Hãy kiểm tra lại App.jsx nhé.
          navigate('/NhanVien/Dashboard'); // Sửa lại đường dẫn theo route App.jsx
        }
      } else {
        setError(data.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ!');
    } finally {
      setIsLoading(false);
    } // <--- ĐÃ THÊM DẤU ĐÓNG NÀY ĐỂ KẾT THÚC KHỐI FINALLY
  }; // <--- ĐÃ THÊM DẤU ĐÓNG NÀY ĐỂ KẾT THÚC HÀM handleLogin

  // Bắt đầu phần Render Giao diện
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-top-bar"></div>

        <div className="login-header">
          <h2>Đăng nhập</h2>
          <p>Vui lòng đăng nhập để truy cập hệ thống</p>
        </div>

        {error && (
          <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Tên đăng nhập / Email</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Nhập tên đăng nhập của bạn"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Mật khẩu</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Nhập mật khẩu"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="login-actions">
            <label className="remember-me" htmlFor="remember-me">
              <input id="remember-me" type="checkbox" />
              Ghi nhớ mật khẩu
            </label>
            <button 
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="forgot-password-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Quên mật khẩu?
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="btn-login">
            {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          Tài khoản được cấp bởi quản trị hệ thống
        </div>
      </div>
    </div>
  );
}; // Đã bỏ bớt các dấu ngoặc thừa ở cuối file gốc

export default Login;
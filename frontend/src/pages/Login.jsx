import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import FirstLoginChangePass from './FirstLoginChangePass'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('LOGIN'); 
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // ================================================================
    // 🟢 KIỂM TRA ĐIỀU KIỆN ĐẦU VÀO (VALIDATION THEO TEST CASE)
    // ================================================================
    const isEmailEmpty = !email.trim();
    const isPasswordEmpty = !password.trim();

    // 1. Để trống cả 2 trường
    if (isEmailEmpty && isPasswordEmpty) {
      setError("Vui lòng nhập user name/ password");
      return;
    }
    
    // 2. Để trống trường Tên đăng nhập
    if (isEmailEmpty && !isPasswordEmpty) {
      setError("Vui lòng không để trống trường tên đăng nhập Email");
      return;
    }

    // 3. Để trống trường Mật khẩu
    if (!isEmailEmpty && isPasswordEmpty) {
      setError("Bạn chưa nhập mật khẩu vào!");
      return;
    }

    // Vượt qua kiểm tra rỗng -> Xóa lỗi cũ, bắt đầu loading gọi API
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
        if (data.require_pass_change) {
          setMode('FIRST_CHANGE_PASS');
          return;
        }

        const userRole = data?.user?.role_code || data?.user?.role;
        
        if (userRole) {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);

          // Chuyển hướng theo quyền
          if (userRole === 'ADMIN') navigate('/Admin/users');
          else if (userRole === 'DIRECTOR') navigate('/GiamDoc/Dashboard');
          else if (userRole === 'MANAGER') navigate('/QuanLy/Dashboard');
          else navigate('/NhanVien/Dashboard');
        } else {
          setError("Tài khoản chưa được phân quyền hệ thống!");
        }
      } else {
        // 4. Sai Username hoặc Password (Ghi đè thông báo từ backend để khớp Test Case)
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('Không thể kết nối đến máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {mode === 'LOGIN' ? (
          <>
            <div className="login-top-bar"></div>
            <div className="login-header">
              <h2>Đăng nhập</h2>
              <p>Hệ thống Quản lý Nhân sự GPS</p>
            </div>

            {error && (
              <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Thêm noValidate để chặn popup cảnh báo rỗng mặc định của HTML5 */}
            <form onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập / Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Nhập tên đăng nhập"
                  // Đã xóa thuộc tính 'required' ở đây
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Nhập mật khẩu"
                    // Đã xóa thuộc tính 'required' ở đây
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
              </div>

              <div className="login-actions">
                <label className="remember-me">
                  <input type="checkbox" /> Ghi nhớ mật khẩu
                </label>
                <span onClick={() => navigate('/forgot-password')} style={{ cursor: 'pointer', color: '#4f46e5', fontSize: '14px' }}>
                  Quên mật khẩu?
                </span>
              </div>

              <button type="submit" disabled={isLoading} className="btn-login">
                {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
              </button>
            </form>
          </>
        ) : (
          <FirstLoginChangePass 
            username={email} 
            onSuccess={() => setMode('LOGIN')} 
          />
        )}
        
        <div className="login-footer">Tài khoản quản trị hệ thống GPS</div>
      </div>
    </div>
  );
};

export default Login;
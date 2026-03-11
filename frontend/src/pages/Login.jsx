import { useState } from 'react';
import { Eye, EyeOff, Loader2, MapPin } from 'lucide-react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call - replace with actual API endpoint
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role
        const role = data.user.role;
        if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (role === 'manager') {
          window.location.href = '/manager/dashboard';
        } else {
          window.location.href = '/employee/dashboard';
        }
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      // For demo purposes - remove in production
      console.log('Login demo mode');
      
      // Demo login - simulate successful login
      const demoUser = {
        id: 1,
        email: email,
        name: 'Nguyễn Văn A',
        role: 'employee',
        department: 'Phòng IT'
      };
      
      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('user', JSON.stringify(demoUser));
      
      // Redirect based on demo role
      window.location.href = '/employee/dashboard';
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Tính năng đang được phát triển');
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="bg-shape bg-shape-1"></div>
        <div className="bg-shape bg-shape-2"></div>
        <div className="bg-shape bg-shape-3"></div>
      </div>
      
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <MapPin className="logo-icon" size={40} />
            </div>
            <h1 className="login-title">HR Management</h1>
            <p className="login-subtitle">Hệ thống quản lý nhân sự tích hợp GPS</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="form-input"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button 
                type="button" 
                className="forgot-password"
                onClick={handleForgotPassword}
              >
                Quên mật khẩu?
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              Hệ thống chấm công GPS thời gian thực
            </p>
            <p className="version-text">Version 1.0.0</p>
          </div>
        </div>

        <div className="login-info">
          <h2>Chấm công thông minh</h2>
          <ul className="feature-list">
            <li>
              <span className="feature-icon">✓</span>
              Quản lý nhân viên hiệu quả
            </li>
            <li>
              <span className="feature-icon">✓</span>
              Chấm công GPS chính xác
            </li>
            <li>
              <span className="feature-icon">✓</span>
              Theo dõi thời gian thực
            </li>
            <li>
              <span className="feature-icon">✓</span>
              Báo cáo thông minh
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import FirstLoginChangePass from './FirstLoginChangePass';
import { authService } from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('LOGIN');
  const [firstLoginIdentifier, setFirstLoginIdentifier] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const isEmailEmpty = !email.trim();
    const isPasswordEmpty = !password.trim();

    if (isEmailEmpty && isPasswordEmpty) {
      setError('Vui l\u00F2ng nh\u1EADp user name/ password');
      return;
    }

    if (isEmailEmpty && !isPasswordEmpty) {
      setError(
        'Vui l\u00F2ng kh\u00F4ng \u0111\u1EC3 tr\u1ED1ng tr\u01B0\u1EDDng t\u00EAn \u0111\u0103ng nh\u1EADp Email'
      );
      return;
    }

    if (!isEmailEmpty && isPasswordEmpty) {
      setError('B\u1EA1n ch\u01B0a nh\u1EADp m\u1EADt kh\u1EA9u v\u00E0ol !');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await authService.login({ username: email, password });

      if (data.success) {
        if (data.require_pass_change) {
          setFirstLoginIdentifier(data.user?.username || email);
          setMode('FIRST_CHANGE_PASS');
          return;
        }

        const userRole = data?.user?.role_code || data?.user?.role;

        if (userRole) {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);

          if (userRole === 'ADMIN') navigate('/Admin/Dashboard');
          else if (userRole === 'DIRECTOR') navigate('/GiamDoc/Dashboard');
          else if (userRole === 'MANAGER') navigate('/QuanLy/Dashboard');
          else navigate('/NhanVien/Dashboard');
        } else {
          setError('T\u00E0i kho\u1EA3n ch\u01B0a \u0111\u01B0\u1EE3c ph\u00E2n quy\u1EC1n h\u1EC7 th\u1ED1ng!');
        }
      } else {
        setError(
          'T\u00EAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\u00F4ng \u0111\u00FAng'
        );
      }
    } catch (err) {
      console.error('Login Error:', err);
      const status = err.response?.status;
      if (status === 401) {
        setError(
          'T\u00EAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\u00F4ng \u0111\u00FAng'
        );
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Kh\u00F4ng th\u1EC3 k\u1EBFt n\u1ED1i \u0111\u1EBFn m\u00E1y ch\u1EE7!');
      } else {
        const data = err.response?.data;
        const serverMsg =
          (typeof data === 'string' && data) ||
          data?.message ||
          (typeof data?.error === 'string' ? data.error : data?.error?.message);
        setError(
          serverMsg ||
            '\u0110\u00E3 x\u1EA3y ra l\u1ED7i. Vui l\u00F2ng th\u1EED l\u1EA1i.'
        );
      }
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
              <h2>{'\u0110\u0103ng nh\u1EADp'}</h2>
              <p>
                {
                  'H\u1EC7 th\u1ED1ng Qu\u1EA3n l\u00FD Nh\u00E2n s\u1EF1 GPS'
                }
              </p>
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
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label className="form-label">
                  {'T\u00EAn \u0111\u0103ng nh\u1EADp / Email'}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder={
                    'Nhập tên đăng nhập'
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {'M\u1EADt kh\u1EA9u'}
                </label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder={
                      'Nhập Mật Khẩu'
                    }
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
              </div>

              <div className="login-actions">
                <label className="remember-me">
                  <input type="checkbox" />{' '}
                  {'Ghi nh\u1EDB m\u1EADt kh\u1EA9u'}
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  {'Qu\u00EAn m\u1EADt kh\u1EA9u?'}
                </button>
              </div>

              <button type="submit" disabled={isLoading} className="btn-login">
                {isLoading ? '\u0110ang ki\u1EC3m tra...' : 'SIGN IN'}
              </button>
            </form>
          </>
        ) : (
          <FirstLoginChangePass
            username={firstLoginIdentifier}
            onSuccess={() => {
              setFirstLoginIdentifier('');
              setMode('LOGIN');
            }}
          />
        )}

        <div className="login-footer">
          {
            'T\u00E0i kho\u1EA3n qu\u1EA3n tr\u1ECB h\u1EC7 th\u1ED1ng GPS'
          }
        </div>
      </div>
    </div>
  );
};

export default Login;

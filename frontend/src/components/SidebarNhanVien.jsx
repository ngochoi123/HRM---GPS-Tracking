import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, CreditCard, FileText, User, Settings, HelpCircle, LogOut } from 'lucide-react';

const SidebarNhanVien = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Danh sách menu riêng của Nhân Viên
  const menuItems = [
    { path: '/NhanVien/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/NhanVien/check-in', icon: <MapPin size={20} />, label: 'Chấm công' },
    { path: '/NhanVien/payroll', icon: <CreditCard size={20} />, label: 'Xem bảng lương' },
    { path: '/NhanVien/requests', icon: <FileText size={20} />, label: 'Đơn từ' },
    { path: '/NhanVien/profile', icon: <User size={20} />, label: 'Hồ sơ cá nhân' },
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* 1. LOGO */}
      <div className="logo" style={{ marginBottom: '40px' }}>
        <img src="/logo.png" alt="HR PeopleTech" style={{ height: '40px' }} />
      </div>

      {/* 2. MENU CHÍNH */}
      <nav style={{ flex: 1 }}>
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>TRANG CHỦ</p>
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 3. MENU FOOTER (SUPPORT) */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>SUPPORT</p>
        <Link to="/settings" className="menu-item"><Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span></Link>
        <Link to="/help" className="menu-item"><HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span></Link>
        <button onClick={handleLogout} className="menu-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          <LogOut size={20} /> <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarNhanVien;
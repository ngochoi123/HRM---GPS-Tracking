import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, UserCog, Settings, LogOut } from 'lucide-react';

const SidebarAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();

const menuItems = [
    { path: '/Admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Tổng quan' },
    { path: '/Admin/users', icon: <UserCog size={20} />, label: 'Quản lý tài khoản' },
    { path: '/Admin/settings', icon: <Settings size={20} />, label: 'Cài đặt hệ thống' },
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="logo" style={{ marginBottom: '40px' }}>
        <img src="/logo.png" alt="HR PeopleTech" style={{ height: '40px' }} />
      </div>

      <nav style={{ flex: 1 }}>
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>QUẢN TRỊ VIÊN</p>
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

      <div className="sidebar-footer" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
        <button onClick={handleLogout} className="menu-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
          <LogOut size={20} /> <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarAdmin;
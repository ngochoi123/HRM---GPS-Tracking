import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCog, Settings, LogOut, HelpCircle, Bell } from 'lucide-react';
import LogoutModal from './LogoutModal';

const SidebarAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý hiển thị Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { path: '/Admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Phân công chấm công' },
    { path: '/Admin/users', icon: <UserCog size={20} />, label: 'Quản lý tài khoản' },
    { path: '/Admin/LocationSettings', icon: <Settings size={20} />, label: 'Cài đặt vị trí chấm công' },
  ];

  // Hàm khi bấm nút Đăng Xuất ở Sidebar -> Chỉ hiện Modal
  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  // Hàm thực thi khi bấm "Xác nhận" trong Modal
  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Xóa luôn token cho an toàn
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* 1. LOGO */}
      <div className="logo">
        <img src="/logo.png" alt="HR PeopleTech" />
      </div>

      {/* 2. MENU CHÍNH */}
      <nav style={{ flex: 1 }}>
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>
          QUẢN TRỊ VIÊN
        </p>

        {menuItems.map((item) => {
          const isActive = location.pathname.toLowerCase() === item.path.toLowerCase() || 
                          (item.path !== '/Admin/dashboard' && location.pathname.toLowerCase().startsWith(item.path.toLowerCase()));
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3. MENU FOOTER (SUPPORT) */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>
          SUPPORT
        </p>
        
        <Link to="/Admin/help" className="menu-item">
          <HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>

        {/* Nút Đăng Xuất gọi handleLogoutClick */}
        <button 
          onClick={handleLogoutClick} 
          className="menu-item logout-btn" 
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={20} /> <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
        </button>
      </div>

      {/* --- MODAL XÁC NHẬN ĐĂNG XUẤT --- */}
      <LogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={confirmLogout} 
      />
    </aside>
  );
};

export default SidebarAdmin;
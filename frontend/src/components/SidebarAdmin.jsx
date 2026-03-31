import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, UserCog, Settings, LogOut, HelpCircle, HelpCircle as QuestionIcon } from 'lucide-react';

const SidebarAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý hiển thị Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { path: '/Admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Tổng quan' },
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

        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
          </Link>
        ))}
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
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-icon-container">
               <div className="icon-circle">
                  <QuestionIcon size={40} color="#16a34a" />
               </div>
            </div>
            
            <h3>Xác nhận đăng xuất</h3>
            <p>Bạn có chắc chắn muốn đăng xuất?</p>
            
            <div className="modal-actions">
              <button className="btn-confirm" onClick={confirmLogout}>Xác nhận</button>
              <button className="btn-cancel" onClick={() => setShowLogoutModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default SidebarAdmin;
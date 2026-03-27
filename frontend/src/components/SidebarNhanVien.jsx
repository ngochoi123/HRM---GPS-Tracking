import React, { useState } from 'react'; // Thêm useState
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Home, MapPin, CreditCard, FileText, User, Settings, HelpCircle, LogOut, HelpCircle as QuestionIcon } from 'lucide-react';

const SidebarNhanVien = () => {
  const location = useLocation();
  const navigate = useNavigate();


  
  // Trạng thái đóng/mở modal xác nhận
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { path: '/NhanVien/Dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/NhanVien/checkin', icon: <MapPin size={20} />, label: 'Chấm công' },
    { path: '/NhanVien/payroll', icon: <CreditCard size={20} />, label: 'Xem bảng lương' },
    { path: '/NhanVien/requests', icon: <FileText size={20} />, label: 'Đơn từ' },
    { path: '/NhanVien/profile', icon: <User size={20} />, label: 'Hồ sơ cá nhân' },
  ];

  // Hàm thực hiện đăng xuất thật sự
  const confirmLogout = () => {
    localStorage.removeItem('user');
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
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>TRANG CHỦ</p>
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
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>SUPPORT</p>
        
        <Link to="/settings" className="menu-item">
          <Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>
        
        <Link to="/help" className="menu-item">
          <HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>
        
        {/* Nhấn vào đây sẽ hiện Modal chứ chưa logout ngay */}
        <button onClick={() => setShowLogoutModal(true)} className="menu-item logout-btn" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center' }}>
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

export default SidebarNhanVien;
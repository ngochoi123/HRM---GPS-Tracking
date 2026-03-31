import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Import đầy đủ các icon cho cả 2 nhóm chức năng
import { 
  Home, Clock, FileText, Wallet, // Nhóm cá nhân
  Users, ClipboardCheck, Calculator, Award, Bell, // Nhóm quản lý
  Settings, LogOut, HelpCircle, HelpCircle as QuestionIcon // Thêm QuestionIcon cho khớp với Modal
} from 'lucide-react';

const SidebarQuanLy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý hiển thị Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 1. NHÓM CHỨC NĂNG CÁ NHÂN
  const personalItems = [
    { path: '/QuanLy/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/QuanLy/CheckIn', icon: <Clock size={20} />, label: 'Chấm công' },
    { path: '/QuanLy/my-requests', icon: <FileText size={20} />, label: 'Đơn từ của tôi' },
    { path: '/QuanLy/my-salary', icon: <Wallet size={20} />, label: 'Lương & Giờ làm' },
  ];

  // 2. NHÓM CHỨC NĂNG QUẢN LÝ
  const managementItems = [
    { path: '/QuanLy/Employees', icon: <Users size={20} />, label: 'Quản lý nhân sự' },
    { path: '/QuanLy/approvals', icon: <ClipboardCheck size={20} />, label: 'Phê duyệt đơn từ' },
    { path: '/QuanLy/payroll', icon: <Calculator size={20} />, label: 'Tính lương hệ thống' },
    { path: '/QuanLy/rewards-discipline', icon: <Award size={20} />, label: 'Khen thưởng & Kỷ luật' },
    { path: '/QuanLy/notifications', icon: <Bell size={20} />, label: 'Quản lý thông báo' },
  ];

  // Hàm thực thi khi bấm "Xác nhận" trong Modal
  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Nếu có lưu token thì xóa luôn
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* 1. LOGO */}
      <div className="logo">
        <img src="/logo.png" alt="HR PeopleTech" />
      </div>

      {/* 2. MENU CHÍNH (Có cuộn nếu dài) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* KHU VỰC 1: CÁ NHÂN */}
        <nav style={{ marginBottom: '24px' }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
            CÁ NHÂN
          </p>
          {personalItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* KHU VỰC 2: QUẢN LÝ TRUNG TÂM */}
        <nav>
          <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
            QUẢN LÝ TRUNG TÂM
          </p>
          {managementItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* 3. MENU FOOTER (SUPPORT) */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>SUPPORT</p>
        
        <Link to="/QuanLy/settings" className="menu-item">
          <Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>
        
        <Link to="/QuanLy/help" className="menu-item">
          <HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>
        
        {/* Nút Đăng xuất hiện Modal */}
        <button 
          onClick={() => setShowLogoutModal(true)} 
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

export default SidebarQuanLy;
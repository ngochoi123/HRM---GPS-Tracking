import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Clock, FileText, Wallet, // Nhóm cá nhân
  Users, ClipboardCheck, Calculator, Award, Bell, // Nhóm quản lý
  Settings, LogOut, HelpCircle, HelpCircle as QuestionIcon,
  FileSpreadsheet 
} from 'lucide-react';

const SidebarQuanLy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ THÊM STATE
  const [openStats, setOpenStats] = useState(false);

  const personalItems = [
    { path: '/QuanLy/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/QuanLy/CheckIn', icon: <Clock size={20} />, label: 'Chấm công' },
    { path: '/QuanLy/my-requests', icon: <FileText size={20} />, label: 'Đơn từ của tôi' },
    { path: '/QuanLy/my-salary', icon: <Wallet size={20} />, label: 'Lương & Giờ làm' },
  ];

  const managementItems = [
    { path: '/QuanLy/Employees', icon: <Users size={20} />, label: 'Quản lý nhân sự' },
    { path: '/QuanLy/approvals', icon: <ClipboardCheck size={20} />, label: 'Phê duyệt đơn từ' },
    { path: '/QuanLy/Payroll/payroll', icon: <FileSpreadsheet size={20} />, label: 'Bảng Lương' }, 
    { path: '/QuanLy/rewards-discipline', icon: <Award size={20} />, label: 'Khen thưởng & Kỷ luật' },
    { path: '/QuanLy/notifications', icon: <Bell size={20} />, label: 'Quản lý thông báo' },
  ];  

  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      
      {/* LOGO */}
      <div className="logo">
        <img src="/logo.png" alt="HR PeopleTech" />
      </div>

      {/* MENU */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* CÁ NHÂN */}
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

        {/* QUẢN LÝ */}
        <nav>
          <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
            QUẢN LÝ TRUNG TÂM
          </p>

          {/* ✅ THỐNG KÊ DROPDOWN */}
          <div 
            className="menu-item"
            onClick={() => setOpenStats(!openStats)}
            style={{ cursor: 'pointer' }}
          >
            <Calculator size={20} />
            <span style={{ marginLeft: '12px' }}>Thống kê</span>
          </div>

          {openStats && (
            <>
              <Link to="/QuanLy/statistics/requests" className="menu-item">
                <span style={{ marginLeft: '32px' }}>- Đơn từ & phê duyệt</span>
              </Link>

              <Link to="/QuanLy/statistics/contracts" className="menu-item">
                <span style={{ marginLeft: '32px' }}>- Hợp đồng lao động</span>
              </Link>

              <Link to="/QuanLy/statistics/changes" className="menu-item">
                <span style={{ marginLeft: '32px' }}>- Biến động nhân sự</span>
              </Link>

              <Link to="/QuanLy/statistics/salary" className="menu-item">
                <span style={{ marginLeft: '32px' }}>- Lương & chi phí</span>
              </Link>

              <Link to="/QuanLy/statistics/attendance" className="menu-item">
                <span style={{ marginLeft: '32px' }}>- Chấm công & chuyên cần</span>
              </Link>
            </>
          )}

          {/* MENU CŨ (GIỮ NGUYÊN) */}
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

      {/* FOOTER */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
          SUPPORT
        </p>
        
        <Link to="/QuanLy/settings" className="menu-item">
          <Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>
        
        <Link to="/QuanLy/help" className="menu-item">
          <HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>
        
        <button 
          onClick={() => setShowLogoutModal(true)} 
          className="menu-item logout-btn"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={20} /> <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
        </button>
      </div>

      {/* MODAL */}
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
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Building, Users, FileText, MapPin, 
  Briefcase, CheckSquare, Settings, HelpCircle, 
  LogOut, Calculator, Bell 
} from 'lucide-react';
import LogoutModal from './LogoutModal';

const SidebarGiamDoc = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý hiển thị Modal đăng xuất
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Khởi tạo state: Nếu URL chứa '/QuanLy/statistics' thì mở luôn từ đầu
  // Xóa bỏ useEffect để tránh lỗi cascading renders của ESLint
  const [openStats, setOpenStats] = useState(location.pathname.includes('/QuanLy/statistics'));

  const menuItems = [
    { path: '/GiamDoc/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/GiamDoc/departments', icon: <Building size={20} />, label: 'Phòng ban' },
    { path: '/QuanLy/Employees', icon: <Users size={20} />, label: 'Quản lý nhân sự' },
    { path: '/GiamDoc/contracts', icon: <FileText size={20} />, label: 'Hợp đồng' },
    { path: '/GiamDoc/branches', icon: <MapPin size={20} />, label: 'Chi nhánh' },
    { path: '/GiamDoc/positions', icon: <Briefcase size={20} />, label: 'Chức vụ' },
    { path: '/GiamDoc/approvals', icon: <CheckSquare size={20} />, label: 'Phê duyệt' },
  ];

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <aside className="sidebar flex flex-col h-screen">
      {/* 1. LOGO */}
      <div className="logo">
        <img src="/logo.png" alt="HR PeopleTech" />
      </div>

      {/* 2. MENU CHÍNH */}
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>
          GIÁM ĐỐC
        </p>

        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </Link>
          );
        })}

        {/* ✅ THỐNG KÊ DROPDOWN (Dùng chung link của Quản lý) */}
        <div 
          className={`menu-item ${location.pathname.includes('/QuanLy/statistics') && !openStats ? 'active' : ''}`}
          onClick={() => setOpenStats(!openStats)}
          style={{ cursor: 'pointer' }}
        >
          <Calculator size={20} />
          <span style={{ marginLeft: '12px' }}>Thống kê</span>
        </div>

        {openStats && (
          <div className="mb-2">
            <Link to="/QuanLy/statistics/requests" className={`menu-item ${location.pathname.includes('/QuanLy/statistics/requests') ? 'active' : ''}`}>
              <span style={{ marginLeft: '32px' }}>- Đơn từ & phê duyệt</span>
            </Link>

            <Link to="/QuanLy/statistics/contracts" className={`menu-item ${location.pathname.includes('/QuanLy/statistics/contracts') ? 'active' : ''}`}>
              <span style={{ marginLeft: '32px' }}>- Hợp đồng lao động</span>
            </Link>

            <Link to="/QuanLy/statistics/changes" className={`menu-item ${location.pathname.includes('/QuanLy/statistics/changes') ? 'active' : ''}`}>
              <span style={{ marginLeft: '32px' }}>- Biến động nhân sự</span>
            </Link>

            <Link to="/QuanLy/statistics/salary" className={`menu-item ${location.pathname.includes('/QuanLy/statistics/salary') ? 'active' : ''}`}>
              <span style={{ marginLeft: '32px' }}>- Lương & chi phí</span>
            </Link>

            <Link to="/QuanLy/statistics/attendance" className={`menu-item ${location.pathname.includes('/QuanLy/statistics/attendance') ? 'active' : ''}`}>
              <span style={{ marginLeft: '32px' }}>- Chấm công & chuyên cần</span>
            </Link>
          </div>
        )}
      </nav>

      {/* 3. MENU FOOTER (SUPPORT) */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px' }}>
          SUPPORT
        </p>

        <Link to="/GiamDoc/settings" className="menu-item">
          <Settings size={20} /> 
          <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>

        <Link to="/GiamDoc/help" className="menu-item">
          <HelpCircle size={20} /> 
          <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>

        <button 
          onClick={handleLogoutClick} 
          className="menu-item logout-btn"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={20} /> 
          <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
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

export default SidebarGiamDoc;
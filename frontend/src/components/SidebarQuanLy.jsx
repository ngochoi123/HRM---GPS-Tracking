import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Import đầy đủ các icon cho cả 2 nhóm chức năng
import { 
  Home, Clock, FileText, Wallet, // Nhóm cá nhân
  Users, ClipboardCheck, Calculator, Award, Bell, // Nhóm quản lý
  Settings, LogOut 
} from 'lucide-react';

const SidebarQuanLy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. NHÓM CHỨC NĂNG CÁ NHÂN (Thừa kế từ Nhân viên)
  const personalItems = [
    { path: '/QuanLy/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/QuanLy/CheckIn', icon: <Clock size={20} />, label: 'Chấm công' },
    { path: '/QuanLy/my-requests', icon: <FileText size={20} />, label: 'Đơn từ của tôi' },
    { path: '/QuanLy/my-salary', icon: <Wallet size={20} />, label: 'Lương & Giờ làm' },
  ];

  // 2. NHÓM CHỨC NĂNG QUẢN LÝ
  const managementItems = [
    { path: '/QuanLy/employees', icon: <Users size={20} />, label: 'Quản lý nhân sự' },
    { path: '/QuanLy/approvals', icon: <ClipboardCheck size={20} />, label: 'Phê duyệt đơn từ' },
    { path: '/QuanLy/payroll', icon: <Calculator size={20} />, label: 'Tính lương hệ thống' },
    { path: '/QuanLy/rewards-discipline', icon: <Award size={20} />, label: 'Khen thưởng & Kỷ luật' },
    { path: '/QuanLy/notifications', icon: <Bell size={20} />, label: 'Quản lý thông báo' },
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Render từng item để code gọn hơn
  const renderMenuItem = (item) => (
    <Link 
      key={item.path} 
      to={item.path} 
      className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
      style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === item.path ? '#4f46e5' : '#4b5563', backgroundColor: location.pathname === item.path ? '#e0e7ff' : 'transparent', marginBottom: '4px', transition: 'all 0.2s' }}
    >
      {item.icon} <span style={{ marginLeft: '12px', fontWeight: location.pathname === item.path ? '600' : '500' }}>{item.label}</span>
    </Link>
  );

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px', borderRight: '1px solid #e5e7eb', backgroundColor: '#ffffff', overflowY: 'auto' }}>
      {/* LOGO */}
      <div className="logo" style={{ marginBottom: '30px', paddingLeft: '10px' }}>
        <img src="/logo.png" alt="HR PeopleTech" style={{ height: '40px' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* KHU VỰC 1: CÁ NHÂN */}
        <nav>
          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '15px' }}>
            CÁ NHÂN
          </p>
          {personalItems.map(renderMenuItem)}
        </nav>

        {/* KHU VỰC 2: QUẢN LÝ */}
        <nav>
          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '15px' }}>
            QUẢN LÝ TRUNG TÂM
          </p>
          {managementItems.map(renderMenuItem)}
        </nav>

      </div>

      {/* FOOTER: CÀI ĐẶT & ĐĂNG XUẤT */}
      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
        <Link to="/QuanLy/settings" className="menu-item" style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', color: '#4b5563', marginBottom: '4px' }}>
          <Settings size={20} /> <span style={{ marginLeft: '12px', fontWeight: '500' }}>Cài đặt tài khoản</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="menu-item" 
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 15px', color: '#dc2626', display: 'flex', alignItems: 'center', borderRadius: '8px' }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={20} /> <span style={{ marginLeft: '12px', fontWeight: '500' }}>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarQuanLy;
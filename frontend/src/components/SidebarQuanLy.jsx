import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Thêm Bell vào danh sách import
import { Home, MapPin, UserCheck, ClipboardCheck, Settings, LogOut, Bell } from 'lucide-react';

const SidebarQuanLy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/QuanLy/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/QuanLy/checkin', icon: <MapPin size={20} />, label: 'Chấm công & giám sát' },
    { path: '/QuanLy/team-attendance', icon: <UserCheck size={20} />, label: 'Chấm công bộ phận' },
    { path: '/QuanLy/team-approvals', icon: <ClipboardCheck size={20} />, label: 'Phê duyệt đơn' },
    // Mục mới thêm vào theo Product Backlog PB18
    { path: '/QuanLy/notifications', icon: <Bell size={20} />, label: 'Quản lý thông báo' },
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
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>QUẢN LÝ</p>
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

      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>SUPPORT</p>
        <Link to="/settings" className="menu-item">
          <Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="menu-item" 
          style={{ 
            width: '100%', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            textAlign: 'left', 
            padding: '12px', 
            color: '#6b7280', 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          <LogOut size={20} /> <span style={{ marginLeft: '12px' }}>Đăng Xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarQuanLy;
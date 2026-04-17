import React, { useState } from 'react';
import './menu.css';   
import { FaAngleRight } from "react-icons/fa";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, CreditCard, FileText, Settings, HelpCircle, LogOut, HelpCircle as QuestionIcon } from 'lucide-react';

const menuItems = [
    { path: '/NhanVien/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/NhanVien/checkin', icon: <MapPin size={20} />, label: 'Chấm công' },
    { path: '/NhanVien/payroll', icon: <CreditCard size={20} />, label: 'Xem bảng lương' },
    {
      path: '/NhanVien/requests',
      label: 'Đơn từ',
      icon: <FileText size={20} />,
      children: [
        { path: '/NhanVien/requests/leave', label: 'Đơn nghỉ phép' },
        { path: '/NhanVien/requests/overtime', label: 'Đơn tăng ca' },
        { path: '/NhanVien/requests/ae_request', label: 'Đơn giải trình' }
        
      ]
    },
    // Đã xóa menu "Hồ sơ cá nhân" vì đã tích hợp trên Header dùng chung cho mọi Role
  ];
const SidebarNhanVien = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // 1. Thêm state để lưu lại URL trước đó
  const [prevPath, setPrevPath] = useState(location.pathname);

  // 2. Khởi tạo state openMenu ngay từ lần render đầu tiên
  const [openMenu, setOpenMenu] = useState(() => {
    const index = menuItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    return index !== -1 ? index : null;
  });

  // 3. Cập nhật state trực tiếp khi URL thay đổi (Thay cho useEffect)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname); // Cập nhật lại URL cũ
    const index = menuItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    setOpenMenu(index !== -1 ? index : null);
  }

  // State quản lý hiển thị Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  

  // Hàm khi bấm nút Đăng Xuất ở Sidebar -> Chỉ hiện Modal
  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  // Hàm thực thi khi bấm "Xác nhận" trong Modal
  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
          NHÂN VIÊN
        </p>
{menuItems.map((item, index) => (
  <div key={index}>

    {/* MENU CHA */}
    {item.children ? (
      <div
       className={`menu-item ${
        location.pathname.startsWith(item.path) ||
        item.children?.some(child => location.pathname.startsWith(child.path))
          ? 'active'
          : ''
      }`}
        onClick={() => setOpenMenu(openMenu === index ? null : index)}
      >
        {item.icon}
        <span style={{ marginLeft: "12px" }}>{item.label}</span>
      </div>
    ) : (
      <Link
        to={item.path}
        onClick={() => setOpenMenu(null)}
        className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
      >
        {item.icon}
        <span style={{ marginLeft: "12px" }}>{item.label}</span>
      </Link>
    )}

    {/* MENU CON */}
    {item.children && (
  <div className={`submenu ${openMenu === index ? "open" : ""}`}>
        {item.children.map((child) => (
   <Link
      key={child.path}
      to={child.path}
      className={`submenu-item ${
        location.pathname.startsWith(child.path) ? "active" : ""
      }`}
    >
      <FaAngleRight style={{ marginRight: "8px", fontSize: "12px" }} />
      {child.label}
    </Link>
))}
      </div>
    )}

  </div>
))}
      </nav>

      {/* 3. MENU FOOTER (SUPPORT) */}
      <div className="sidebar-footer">
        <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
          SUPPORT
        </p>
        
        <Link to="/NhanVien/settings" className="menu-item">
          <Settings size={20} /> <span style={{ marginLeft: '12px' }}>Cài Đặt</span>
        </Link>
        
        <Link to="/NhanVien/help" className="menu-item">
          <HelpCircle size={20} /> <span style={{ marginLeft: '12px' }}>Trợ Giúp</span>
        </Link>
        
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

export default SidebarNhanVien;
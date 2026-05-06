import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaAngleRight } from "react-icons/fa";
import { 
  Home, Clock, FileText, Wallet, CreditCard,// Nhóm cá nhân
  Users, ClipboardCheck, Calculator, Award, Bell, Sparkles, // Nhóm quản lý
  Settings, LogOut, HelpCircle,
  FileSpreadsheet ,BrainCircuit
} from 'lucide-react';
import LogoutModal from './LogoutModal';
const personalItems = [
    { path: '/QuanLy/dashboard', icon: <Home size={20} />, label: 'Trang chủ' },
    { path: '/QuanLy/CheckIn', icon: <Clock size={20} />, label: 'Chấm công' },
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
    { path: '/QuanLy/AI/AITurnoverDashboard', icon: <BrainCircuit size={20} />, label: 'AI Dự báo nhân sự' },
  ];
const SidebarQuanLy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ THÊM STATE
  // 1. Thêm state để lưu lại URL trước đó
  const [prevPath, setPrevPath] = useState(location.pathname);

  // 2. Khởi tạo state openMenu
  const [openMenu, setOpenMenu] = useState(() => {
    const index = personalItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    return index !== -1 ? index : null;
  });

  // 3. Cập nhật state trực tiếp khi URL thay đổi (Thay cho useEffect)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    const index = personalItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    setOpenMenu(index !== -1 ? index : null);
  }
  

  const managementItems = [
    {
      path: '/QuanLy/statistics',
      label: 'Thống kê',
      icon: <Calculator size={20} />,
      children: [
        { path: '/QuanLy/statistics/requests', label: 'Đơn từ & phê duyệt' },
        { path: '/QuanLy/statistics/changes', label: 'Biến động nhân sự' },
        { path: '/QuanLy/statistics/attendance', label: 'Chấm công & chuyên cần' }
      ]
    },
    { path: '/QuanLy/Employees', icon: <Users size={20} />, label: 'Quản lý nhân sự' },
    { path: '/QuanLy/Payroll/payroll', icon: <FileSpreadsheet size={20} />, label: 'Quản lý bảng lương' },
    { path: '/QuanLy/approvals', icon: <ClipboardCheck size={20} />, label: 'Phê duyệt đơn từ' },
    { path: '/QuanLy/rewards-discipline', icon: <Award size={20} />, label: 'Khen thưởng & Kỷ luật' },
    { path: '/QuanLy/recommendations', icon: <Sparkles size={20} />, label: 'Đề xuất & Cảnh báo' },
    { path: '/QuanLy/notifications', icon: <Bell size={20} />, label: 'Quản lý thông báo' },
  ];  

  // Thêm logic xử lý cho openMenu của Management
  const [openMgmtMenu, setOpenMgmtMenu] = useState(() => {
    const index = managementItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    return index !== -1 ? index : null;
  });

  if (location.pathname !== prevPath) {
    const mgmtIndex = managementItems.findIndex(item =>
      item.children?.some(child => location.pathname.startsWith(child.path))
    );
    if (mgmtIndex !== -1) setOpenMgmtMenu(mgmtIndex);
  }

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
            {personalItems.map((item, index) => (
  <div key={index}>
    {/* NẾU CÓ MENU CON (Ví dụ: Đơn từ) */}
    {item.children ? (
      <div
       className={`menu-item ${
        openMenu === index ||
        location.pathname.startsWith(item.path) ||
        item.children?.some(child => location.pathname.startsWith(child.path))
          ? 'active'
          : ''
       }`}
        onClick={() => setOpenMenu(openMenu === index ? null : index)}
        style={{ cursor: 'pointer' }}
      >
        {item.icon}
        <span style={{ marginLeft: "12px" }}>{item.label}</span>
      </div>
    ) : (
      /* NẾU LÀ MENU BÌNH THƯỜNG */
      <Link
        to={item.path}
        onClick={() => setOpenMenu(null)}
        className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
      >
        {item.icon}
        <span style={{ marginLeft: "12px" }}>{item.label}</span>
      </Link>
    )}

    {/* RENDER CÁC MENU CON CỦA ĐƠN TỪ NẾU ĐƯỢC MỞ */}
    {item.children && (
      <div className={`submenu ${openMenu === index ? "open" : ""}`}>
        {item.children.map((child) => (
          <Link
            key={child.path}
            to={child.path}
            className={`submenu-item ${
              location.pathname === child.path ? "active" : ""
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

        {/* QUẢN LÝ */}
        <nav>
          <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', paddingLeft: '20px', textTransform: 'uppercase' }}>
            QUẢN LÝ TRUNG TÂM
          </p>

          {managementItems.map((item, index) => (
            <div key={index}>
              {item.children ? (
                <>
                  <div 
                    className={`menu-item ${
                      openMgmtMenu === index ||
                      location.pathname.startsWith(item.path) ||
                      item.children?.some(child => location.pathname.startsWith(child.path))
                        ? 'active' : ''
                    }`}
                    onClick={() => setOpenMgmtMenu(openMgmtMenu === index ? null : index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.icon}
                    <span style={{ marginLeft: '12px' }}>{item.label}</span>
                  </div>
                  <div className={`submenu ${openMgmtMenu === index ? "open" : ""}`}>
                    {item.children.map((child) => (
                      <Link 
                        key={child.path}
                        to={child.path}
                        className={`submenu-item ${location.pathname === child.path ? 'active' : ''}`}
                      >
                        <FaAngleRight style={{ marginRight: "8px", fontSize: "12px" }} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Link 
                  to={item.path} 
                  className={`menu-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                  onClick={() => setOpenMgmtMenu(null)}
                >
                  {item.icon} <span style={{ marginLeft: '12px' }}>{item.label}</span>
                </Link>
              )}
            </div>
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
      <LogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={confirmLogout} 
      />
    </aside>
  );
};

export default SidebarQuanLy;
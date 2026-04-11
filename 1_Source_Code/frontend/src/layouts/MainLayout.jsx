import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import "./MainLayout.css";

// Import 4 file Sidebar từ thư mục components
import SidebarGiamDoc from '../components/SidebarGiamDoc';
import SidebarNhanVien from '../components/SidebarNhanVien';
import SidebarAdmin from '../components/SidebarAdmin';
import SidebarQuanLy from '../components/SidebarQuanLy';

// IMPORT COMPONENT CHUÔNG THÔNG BÁO TẠI ĐÂY
import NotificationBell from '../components/Notifications/NotificationBell';

const MainLayout = () => {
  // 1. Lấy user từ Storage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const navigate = useNavigate();

  // 👉 ĐƯA KHAI BÁO ROLE LÊN ĐÂY ĐỂ TRÁNH LỖI (ReferenceError)
  const role = user ? user.role : null;

  // 2. Khởi tạo state lưu trữ thời gian thực
  const [currentTime, setCurrentTime] = useState(new Date());

  // 3. Sử dụng useEffect để thiết lập bộ đếm thời gian
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 👉 4. Hàm xử lý khi click vào Profile (Bây giờ đã có thể lấy biến role an toàn)
  const handleProfileClick = () => {
    switch (role) {
      case 'ADMIN': 
        navigate('/Admin/Profile'); 
        break;
      case 'DIRECTOR': 
        navigate('/NhanVien/Profile');  
        break;
      case 'MANAGER': 
        navigate('/NhanVien/Profile'); 
        break;
      default: 
        navigate('/NhanVien/Profile'); 
        break;
    }
  };

  // 5. Nếu chưa đăng nhập -> đuổi ra Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 6. Hàm gọi Sidebar tương ứng
  const renderSidebar = () => {
    switch (role) {
      case 'ADMIN': return <SidebarAdmin />;
      case 'DIRECTOR': return <SidebarGiamDoc />;
      case 'MANAGER': return <SidebarQuanLy />;
      default: return <SidebarNhanVien />;
    }
  };

  // 7. Format lại ngày giờ
  const dateString = currentTime.toLocaleDateString('vi-VN');
  const timeString = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="admin-layout">
      
      {/* SIDEBAR */}
      {renderSidebar()}

      {/* NỘI DUNG BÊN PHẢI */}
      <main className="main-content">
        
        {/* HEADER */}
        <header className="top-header">
          <div className="datetime-box" style={{ background: 'white', padding: '8px 20px', borderRadius: '20px', fontWeight: '500' }}>
            {dateString} . {timeString}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            {/* THÔNG BÁO */}
            <div style={{ background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
              <NotificationBell />
            </div>

            {/* THẺ USER PROFILE */}
            <div 
              className="user-profile" 
              onClick={handleProfileClick}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'white', 
                padding: '5px 15px', 
                borderRadius: '30px',
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
            >
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user.name || 'Người dùng'}</div>
                <div style={{ fontSize: '10px', color: '#1da053', fontWeight: 'bold', textTransform: 'uppercase' }}>{role}</div>
              </div>
            </div>

          </div>
        </header>

        {/* NỘI DUNG TRANG */}
        <div className="content-body">
          <Outlet />
        </div>
        
      </main>
    </div>
  );
};

export default MainLayout;
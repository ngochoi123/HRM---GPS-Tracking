import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import "./MainLayout.css";

// Import 4 file Sidebar từ thư mục components
import SidebarGiamDoc from '../components/SidebarGiamDoc';
import SidebarNhanVien from '../components/SidebarNhanVien';
import SidebarAdmin from '../components/SidebarAdmin';
import SidebarQuanLy from '../components/SidebarQuanLy';

// 1. IMPORT COMPONENT CHUÔNG THÔNG BÁO TẠI ĐÂY
import NotificationBell from '../components/Notifications/NotificationBell';
const MainLayout = () => {
  // 1. Lấy user từ Storage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  // Nếu chưa đăng nhập -> đuổi ra Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role; 

  // 2. Hàm gọi Sidebar tương ứng
  const renderSidebar = () => {
    switch (role) {
      case 'ADMIN': return <SidebarAdmin />;
      case 'DIRECTOR': return <SidebarGiamDoc />;
      case 'MANAGER': return <SidebarQuanLy />;
      default: return <SidebarNhanVien />;
    }
  };

  // 3. Lấy ngày giờ thực tế
  const today = new Date();
  const dateString = today.toLocaleDateString('vi-VN');
  const timeString = today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="admin-layout">
      
      {/* GỌI SIDEBAR RA ĐÂY (Nó đã chứa sẵn thẻ <aside className="sidebar"> bên trong rồi) */}
      {renderSidebar()}

      {/* NỘI DUNG BÊN PHẢI (Header + Outlet) */}
      <main className="main-content">
        
        {/* HEADER */}
        <header className="top-header">
          <div className="datetime-box" style={{ background: 'white', padding: '8px 20px', borderRadius: '20px', fontWeight: '500' }}>
            {dateString} . {timeString}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            {/* 2. THAY THẾ CÁI CHUÔNG CŨ BẰNG NOTIFICATION BELL Ở ĐÂY */}
            <div style={{ background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
              <NotificationBell />
            </div>

            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '5px 15px', borderRadius: '30px' }}>
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

        {/* NỘI DUNG TRANG (Dashboard, Chấm công, Hợp đồng...) */}
        <div className="content-body">
          <Outlet />
        </div>
        
      </main>
    </div>
  );
};

export default MainLayout;
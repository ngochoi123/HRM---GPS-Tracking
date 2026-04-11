// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // 1. Chưa đăng nhập -> Đuổi ra trang Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Không có quyền vào trang này -> Đẩy về đúng trang chủ của họ
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Tự động phân luồng đuổi về đúng nơi quy định
    if (user.role === 'ADMIN') return <Navigate to="/admin/users" replace />;
    if (user.role === 'DIRECTOR') return <Navigate to="/giamdoc/dashboard" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/quanly/dashboard" replace />;
    return <Navigate to="/dashboard" replace />; // Nhân viên
  }

  // 3. Có quyền -> Cho qua
  return <Outlet />;
};

export default ProtectedRoute;
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ===== AUTH =====
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';

// ===== ADMIN =====
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminSettings from './pages/Admin/Settings';

// ===== GIÁM ĐỐC =====
import GiamDocDashboard from './pages/GiamDoc/Dashboard'; // Đã sửa tên để khớp route
import Departments from './pages/GiamDoc/Departments';
import Employees from './pages/GiamDoc/Employees';
import Contracts from './pages/GiamDoc/Contracts';
import Branches from './pages/GiamDoc/Branches';
import Positions from './pages/GiamDoc/Positions';
import Approvals from './pages/GiamDoc/Approvals';

// ===== QUẢN LÝ =====
import ManagerDashboard from './pages/QuanLy/Dashboard'; // Đã sửa tên để khớp route
import TeamAttendance from './pages/QuanLy/TeamAttendance';
import TeamApprovals from './pages/QuanLy/TeamApprovals';

// ===== NHÂN VIÊN =====
import EmployeeDashboard from './pages/NhanVien/Dashboard'; // Đã sửa tên để khớp route
import CheckIn from './pages/NhanVien/CheckIn';
import Payroll from './pages/NhanVien/Payroll';
import Requests from './pages/NhanVien/Requests';
import Profile from './pages/NhanVien/Profile';

// ===== LAYOUT CHUNG DUY NHẤT =====
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ===== LUỒNG KHÔNG CÓ SIDEBAR ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ===== LUỒNG CÓ SIDEBAR (Dùng MainLayout) ===== */}
        <Route element={<MainLayout />}>
          
          {/* 1. ADMIN ROUTES */}
          <Route path="/Admin/dashboard" element={<AdminDashboard />} />
          <Route path="/Admin/users" element={<AdminUsers />} />
          <Route path="/Admin/settings" element={<AdminSettings />} />

          {/* 2. GIÁM ĐỐC ROUTES */}
          <Route path="/GiamDoc/dashboard" element={<GiamDocDashboard />} />
          <Route path="/GiamDoc/departments" element={<Departments />} />
          <Route path="/GiamDoc/employees" element={<Employees />} />
          <Route path="/GiamDoc/contracts" element={<Contracts />} />
          <Route path="/GiamDoc/branches" element={<Branches />} />
          <Route path="/GiamDoc/positions" element={<Positions />} />
          <Route path="/GiamDoc/approvals" element={<Approvals />} />

          {/* 3. QUẢN LÝ ROUTES */}
          <Route path="/QuanLy/dashboard" element={<ManagerDashboard />} />
          <Route path="/QuanLy/team-attendance" element={<TeamAttendance />} />
          <Route path="/QuanLy/team-approvals" element={<TeamApprovals />} />

          {/* 4. NHÂN VIÊN ROUTES */}
          <Route path="/NhanVien/dashboard" element={<EmployeeDashboard />} />
          <Route path="/NhanVien/checkin" element={<CheckIn />} />
          <Route path="/NhanVien/payroll" element={<Payroll />} />
          <Route path="/NhanVien/requests" element={<Requests />} />
          <Route path="/NhanVien/profile" element={<Profile />} />
          
        </Route>

        {/* 404 Bẫy lỗi: Nếu vào link linh tinh sẽ văng về login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
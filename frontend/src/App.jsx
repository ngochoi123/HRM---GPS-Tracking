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
import LocationSettings from './pages/Admin/LocationSettings';
import LocationMap from './pages/Admin/LocationMap';

// ===== GIÁM ĐỐC =====
import GiamDocDashboard from './pages/GiamDoc/Dashboard';
import Departments from './pages/GiamDoc/Departments';
import Contracts from './pages/GiamDoc/Contracts';
import Branches from './pages/GiamDoc/Branches';
import Positions from './pages/GiamDoc/Positions';
import Approvals from './pages/GiamDoc/Approvals';
import DepartmentDetail from './pages/GiamDoc/DepartmentDetail';
import DepartmentCreate from "./pages/GiamDoc/DepartmentCreate";
import EditDepartment from "./pages/GiamDoc/EditDepartment";
import DeleteDepartment from "./pages/GiamDoc/DeleteDepartment";

// ===== QUẢN LÝ =====
import ManagerDashboard from './pages/QuanLy/Dashboard';
import ManagerCheckIn from './pages/QuanLy/CheckIn';
import TeamAttendance from './pages/QuanLy/TeamAttendance';
import TeamApprovals from './pages/QuanLy/TeamApprovals';

// ===== NHÂN VIÊN =====
import EmployeeDashboard from './pages/NhanVien/Dashboard';
import CheckIn from './pages/NhanVien/CheckIn';
import Payroll from './pages/NhanVien/Payroll';
import Requests from './pages/NhanVien/Requests';
import Profile from './pages/NhanVien/Profile';

// ===== LAYOUT =====
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* ===== AUTH ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ===== CÓ SIDEBAR ===== */}
        <Route element={<MainLayout />}>

          {/* ===== ADMIN ===== */}
          <Route path="/Admin/dashboard" element={<AdminDashboard />} />
          <Route path="/Admin/users" element={<AdminUsers />} />
          <Route path="/Admin/settings" element={<AdminSettings />} />
          <Route path="/Admin/LocationSettings" element={<LocationSettings />} />

          {/* ===== GIÁM ĐỐC (FIX Ở ĐÂY) ===== */}
          <Route path="/GiamDoc/dashboard" element={<GiamDocDashboard />} />
          <Route path="/GiamDoc/departments" element={<Departments />} />
          <Route path="/GiamDoc/departments/create" element={<DepartmentCreate />} />
          <Route path="/GiamDoc/departments/:id" element={<DepartmentDetail />} />
          <Route path="/GiamDoc/contracts" element={<Contracts />} />
          <Route path="/GiamDoc/branches" element={<Branches />} />
          <Route path="/GiamDoc/positions" element={<Positions />} />
          <Route path="/GiamDoc/approvals" element={<Approvals />} />
          <Route path="/GiamDoc/departments/edit/:id" element={<EditDepartment />}/>
          <Route path="/GiamDoc/departments/delete/:id" element={<DeleteDepartment />} />
          
          

          {/* ===== QUẢN LÝ ===== */}
          <Route path="/QuanLy/dashboard" element={<ManagerDashboard />} />
          <Route path="/QuanLy/checkin" element={<ManagerCheckIn />} />
          <Route path="/QuanLy/team-attendance" element={<TeamAttendance />} />
          <Route path="/QuanLy/team-approvals" element={<TeamApprovals />} />

          {/* ===== NHÂN VIÊN ===== */}
          <Route path="/NhanVien/dashboard" element={<EmployeeDashboard />} />
          <Route path="/NhanVien/checkin" element={<CheckIn />} />
          <Route path="/NhanVien/CheckIn" element={<CheckIn />} />
          <Route path="/NhanVien/payroll" element={<Payroll />} />
          <Route path="/NhanVien/requests" element={<Requests />} />
          <Route path="/NhanVien/profile" element={<Profile />} />
          
        </Route>

        {/* ===== 404 ===== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
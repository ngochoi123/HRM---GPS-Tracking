import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ===== AUTH =====
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';

// ===== MAIN (GIAMDOC) =====
import Dashboard from './Giamdoc/Dashboard';
import Departments from './Giamdoc/Departments';
import Employees from './Giamdoc/Employees';
import Contracts from './Giamdoc/Contracts';
import Branches from "./Giamdoc/Branches";
import Positions from "./Giamdoc/Positions";
import Approvals from "./Giamdoc/Approvals";
import MainLayout from "./layouts/MainLayout";
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default → Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ===== AUTH ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ===== MAIN APP ===== */}
        <Route element={<MainLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/departments" element={<Departments />} />
  <Route path="/employees" element={<Employees />} />
  <Route path="/contracts" element={<Contracts />} />
  <Route path="/branches" element={<Branches />} />
  <Route path="/positions" element={<Positions />} />
  <Route path="/approvals" element={<Approvals />} />
</Route>
        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
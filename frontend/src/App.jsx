import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

// Protected Route component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// Dashboard components (placeholder)
function EmployeeDashboard() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Employee Dashboard</h1>
      <p>Chấm công GPS - Trang nhân viên</p>
    </div>
  );
}

function ManagerDashboard() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Manager Dashboard</h1>
      <p>Quản lý nhân sự</p>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Admin Dashboard</h1>
      <p>Quản trị hệ thống</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/employee/dashboard" 
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manager/dashboard" 
          element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

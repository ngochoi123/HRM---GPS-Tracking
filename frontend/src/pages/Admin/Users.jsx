import React, { useState, useEffect } from 'react';
import { Search, Plus, History, Shield, Lock, Loader2 } from 'lucide-react';
import axios from 'axios';
import './UserManagement.css';
import CreateAccount from './CreateAccount';
import EditAccount from './EditAccount';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // 1. ĐƯA HÀM FETCH RA NGOÀI (Để có thể gọi lại bất cứ lúc nào)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const formattedData = response.data.map((user) => ({
        id: user.id,
        name: user.full_name || 'Chưa cập nhật',
        email: user.email || 'Không có email',
        username: user.username,
        role: user.role_code || 'User',
        lastLoginTime: 'Vừa xong', 
        lastLoginIp: 'IP: 192.168.1.1',
        status: user.status === 'active', 
        securityStatus: user.status === 'active' ? 'Hoạt động' : 'Bị khóa',
        avatarText: user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'US',
        bgColor: '#f3f4f6',
        textColor: '#4f46e5'
      }));

      setUsers(formattedData);
    } catch (error) {
      console.error("Lỗi khi kéo dữ liệu users:", error);
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  };

  // 2. GỌI FETCH KHI VỪA MỞ TRANG LÊN
  useEffect(() => {
    fetchUsers();
  }, []);

  // Hàm xử lý đổi trạng thái nút gạt (Sẽ cần gọi API Update ở đây)
  const toggleStatus = async (id, currentStatus) => {
    try {
      // 1. Gọi API báo Backend đổi status
      // await axios.put(`http://localhost:8080/api/admin/users/${id}/status`, {
      //   status: currentStatus ? 'inactive' : 'active'
      // });

      // 2. Cập nhật lại giao diện ngay lập tức cho mượt
      setUsers(users.map(user => 
        user.id === id && user.role !== 'ADMIN' 
          ? { ...user, status: !user.status, securityStatus: !user.status ? 'Hoạt động' : 'Bị khóa' } 
          : user
      ));
    } catch (error) {
      alert("Lỗi không thể cập nhật trạng thái!");
    }
  };
if (isCreating) {
    return <CreateAccount onBack={() => { setIsCreating(false); fetchUsers(); }} />;
  }
  if (editingUser) {
    return <EditAccount user={editingUser} onBack={() => { setEditingUser(null); fetchUsers(); }} />;
  }

  return (
    <div className="admin-users-container">
      {/* HEADER TILE & BUTTONS */}
      <div className="au-header">
        <div>
          <h2 className="au-title">
            <Shield className="au-title-icon" size={24} /> 
            Quản lý Phân quyền & Tài khoản
          </h2>
          <p className="au-subtitle">Kiểm soát truy cập, phân quyền (Roles) và trạng thái bảo mật của hệ thống.</p>
        </div>
        <div className="au-header-actions">
          <button className="au-btn au-btn-outline" onClick={() => setIsViewingLogs(true)}>
            <History size={16} /> Log truy cập
          </button>
          <button className="au-btn au-btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> Tạo tài khoản
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="au-filter-bar">
        <div className="au-search-box">
          <Search size={18} className="au-search-icon" />
          <input type="text" placeholder="Tìm Username, Email, Tên nhân viên..." />
        </div>
      </div>

      {/* HIỂN THỊ LOADING HOẶC TABLE */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Loader2 className="animate-spin" size={40} color="#8b5cf6" />
        </div>
      ) : (
        <div className="au-table-container">
          <table className="au-table">
            <thead>
              <tr>
                <th>TÀI KHOẢN / NHÂN SỰ</th>
                <th>TÊN ĐĂNG NHẬP (USERNAME)</th>
                <th>PHÂN QUYỀN (ROLE)</th>
                <th>ĐĂNG NHẬP CUỐI</th>
                <th>TRẠNG THÁI</th>
                <th>BẢO MẬT</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={!user.status ? 'au-row-disabled' : ''}>
                  <td>
                    <div className="au-user-info">
                      <div className="au-avatar" style={{ backgroundColor: user.bgColor, color: user.textColor }}>
                        {user.avatarText}
                      </div>
                      <div>
                        <div className="au-user-name">{user.name}</div>
                        <div className="au-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="au-font-medium">{user.username}</td>
                  <td>
                    <span className={`au-role-badge au-role-${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <div className="au-login-time">{user.lastLoginTime}</div>
                    <div className="au-login-ip">{user.lastLoginIp}</div>
                  </td>
                  <td>
                    <label className="au-switch">
                      <input 
                        type="checkbox" 
                        checked={user.status} 
                        onChange={() => toggleStatus(user.id, user.status)}
                        disabled={user.role === 'ADMIN'} 
                      />
                      <span className="au-slider round"></span>
                    </label>
                  </td>
                  <td>
                    <span className={`au-security-status ${!user.status ? 'au-text-red' : 'au-text-gray'}`}>
                      {!user.status && <Lock size={12} className="au-mr-1" />}
                      {user.securityStatus}
                    </span>
                  </td>
                  <td>
                    <button className="au-btn-action" onClick={() => setEditingUser(user)}>...</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
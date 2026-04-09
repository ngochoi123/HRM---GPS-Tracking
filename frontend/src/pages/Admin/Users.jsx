import React, { useState, useEffect } from 'react';
import { Search, Plus, Shield, Lock, Loader2, RotateCcw, Edit, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import './UserManagement.css';
import CreateAccount from './CreateAccount';
import EditAccount from './EditAccount';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // --- THÊM STATE CHO TÌM KIẾM, LỌC & PHÂN TRANG ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [roleFilter, setRoleFilter] = useState('ALL'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 1. HÀM FETCH DỮ LIỆU
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const formattedData = response.data.map((user) => ({
        id: user.id,
        employee_code: user.employee_code || `NV${user.id.toString().padStart(3, '0')}`, 
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
    } catch (err) {
      console.error("Lỗi khi kéo dữ liệu users:", err);
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  };

  // 2. GỌI FETCH KHI VỪA MỞ TRANG LÊN
  useEffect(() => {
    fetchUsers();
  }, []);

  // 3. XỬ LÝ ĐỔI TRẠNG THÁI NÚT GẠT
  const toggleStatus = async (id) => {
    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    if (loggedInUser && loggedInUser.id === id) {
       alert("Bạn không thể tự khóa tài khoản của chính mình!");
       return;
    }

    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    if (!window.confirm("Bạn có chắc muốn thay đổi trạng thái tài khoản này?")) return;

    const newStatus = userToUpdate.status ? 'locked' : 'active';

    try {
      await axios.put(`http://localhost:5000/api/admin/users/${id}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, status: !user.status, securityStatus: !user.status ? 'Hoạt động' : 'Bị khóa' } 
          : user
      ));
    } catch (err) {
      console.error('Lỗi khi thay đổi trạng thái:', err);
      alert("Lỗi không thể cập nhật trạng thái!");
    }
  };

// 4. XỬ LÝ RESET MẬT KHẨU (Gửi mật khẩu tạm & Bật cờ bắt buộc đổi pass)
  const handleResetPassword = async (user) => {
    if (!user.email || user.email === 'Không có email') {
      alert(`Nhân viên ${user.name} chưa cập nhật Email cá nhân. Không thể cấp lại mật khẩu!`);
      return;
    }

    if(!window.confirm(`Xác nhận reset mật khẩu cho tài khoản ${user.username}?\nHệ thống sẽ gửi mật khẩu tạm thời mới đến Email cá nhân: ${user.email}`)) {
        return;
    }

    try {
      // 👉 Chú ý: Đổi URL thành API reset dành cho Admin (admin-force-reset)
      // Nếu bạn chưa kịp viết API mới ở Backend, hãy báo mình để mình gửi code SQL cho nhé
      const response = await axios.post('http://localhost:5000/api/admin/force-reset-password', 
        { email: user.email }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        alert(`🎉 Thành công! Mật khẩu mới đã được gửi đến: ${user.email}. \nUser này sẽ phải đổi mật khẩu ngay khi đăng nhập.`);
      } else {
        alert(response.data.message || 'Lỗi khi thực hiện reset mật khẩu!');
      }
    } catch (error) {
      console.error('Lỗi API reset password:', error);
      const errorMsg = error.response?.data?.message || 'Không thể kết nối đến máy chủ!';
      alert(`❌ Lỗi: ${errorMsg}`);
    }
  };
  // 5. LOGIC TÌM KIẾM VÀ LỌC DỮ LIỆU
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        user.employee_code.toLowerCase().includes(searchLower);

    const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? user.status === true :
        statusFilter === 'INACTIVE' ? user.status === false : true;

    const matchesRole = roleFilter === 'ALL' ? true : user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleResetFilters = () => {
      setSearchTerm('');
      setStatusFilter('ALL');
      setRoleFilter('ALL');
      setCurrentPage(1);
  };

  // 6. LOGIC PHÂN TRANG
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ĐIỀU HƯỚNG MÀN HÌNH
  if (isCreating) {
    return <CreateAccount onBack={() => { setIsCreating(false); fetchUsers(); }} />;
  }
  if (editingUser) {
    return <EditAccount user={editingUser} onBack={() => { setEditingUser(null); fetchUsers(); }} />;
  }

  return (
    <div className="admin-users-container" style={{ padding: '20px', fontFamily: 'system-ui' }}>
      
      {/* HEADER TILE & BUTTONS (Đã làm thẳng hàng) */}
      <div className="au-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="au-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Shield className="au-title-icon" size={24} color="#4f46e5" /> 
            Quản lý Phân quyền & Tài khoản
          </h2>
          <p className="au-subtitle" style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '14px' }}>
            Kiểm soát truy cập, phân quyền (Roles) và trạng thái bảo mật của hệ thống.
          </p>
        </div>
        <div className="au-header-actions" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="au-btn au-btn-primary" 
            onClick={() => setIsCreating(true)}
            style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
              height: '40px', padding: '0 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', 
              borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px'
            }}
          >
            <Plus size={18} /> 
            <span style={{ lineHeight: 1 }}>Tạo tài khoản</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR (Đã làm hoạt động thật) */}
      <div className="au-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="au-search-box" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} className="au-search-icon" style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm mã NV, tên NV, tài khoản..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', height: '40px', padding: '0 10px 0 38px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        
        <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
        >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã khóa</option>
        </select>

        <select 
            value={roleFilter} 
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
        >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="MANAGER">Quản lý (Manager)</option>
            <option value="USER">Nhân viên (User)</option>
        </select>

        <button onClick={handleResetFilters} style={{ height: '40px', padding: '0 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
            <RotateCcw size={16} /> Làm mới
        </button>
      </div>

      {/* TABLE AREA */}
      <div className="au-table-container" style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <Loader2 className="animate-spin" size={40} color="#4f46e5" />
            </div>
          ) : currentUsers.length === 0 ? (
             <div style={{ padding: '50px', textAlign: 'center', color: '#6b7280' }}>
                 <p style={{ fontSize: '16px', fontWeight: '500' }}>Không tìm thấy dữ liệu</p>
             </div>
          ) : (
            <>
                <table className="au-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>MÃ NV</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>NHÂN VIÊN</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>TÊN ĐĂNG NHẬP</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>PHÂN QUYỀN</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                </thead>
                <tbody>
                    {currentUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: !user.status ? 0.6 : 1 }}>
                        <td style={{ padding: '12px 20px', fontWeight: '500', color: '#374151' }}>{user.employee_code}</td>
                        <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.bgColor, color: user.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                            {user.avatarText}
                            </div>
                            <div>
                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{user.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>{user.email}</div>
                            </div>
                        </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: '#374151', fontSize: '14px', fontWeight: '500' }}>{user.username}</td>
                        <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', 
                            backgroundColor: user.role === 'ADMIN' ? '#fee2e2' : user.role === 'MANAGER' ? '#dbeafe' : '#f3f4f6',
                            color: user.role === 'ADMIN' ? '#b91c1c' : user.role === 'MANAGER' ? '#1d4ed8' : '#374151'
                        }}>
                            {user.role}
                        </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                                backgroundColor: user.status ? '#dcfce7' : '#f3f4f6',
                                color: user.status ? '#166534' : '#4b5563'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: user.status ? '#22c55e' : '#9ca3af' }}></span>
                                {user.securityStatus}
                            </span>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                                <label className="au-switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={user.status} 
                                        onChange={() => toggleStatus(user.id)}
                                        disabled={user.role === 'ADMIN'}
                                        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    />
                                    <span style={{ position: 'absolute', cursor: user.role === 'ADMIN' ? 'not-allowed' : 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: user.status ? '#4f46e5' : '#d1d5db', transition: '.3s', borderRadius: '34px' }}>
                                        <span style={{ position: 'absolute', height: '16px', width: '16px', left: user.status ? '18px' : '2px', bottom: '2px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></span>
                                    </span>
                                </label>
                                
                                <button 
                                    onClick={() => setEditingUser(user)} 
                                    title="Chỉnh sửa tài khoản"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    <Edit size={16} />
                                </button>

                                <button 
                                    onClick={() => handleResetPassword(user)} 
                                    title="Cấp lại mật khẩu"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    <Key size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>

                {/* PHÂN TRANG */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        Hiển thị {filteredUsers.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} của {filteredUsers.length}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <select 
                            value={itemsPerPage} 
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        >
                            <option value="10">10 / trang</option>
                            <option value="20">20 / trang</option>
                            <option value="50">50 / trang</option>
                        </select>

                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                onClick={() => paginate(currentPage - 1)} 
                                disabled={currentPage === 1}
                                style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            {[...Array(totalPages)].map((_, index) => (
                                <button 
                                    key={index + 1} 
                                    onClick={() => paginate(index + 1)}
                                    style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: currentPage === index + 1 ? '#4f46e5' : 'white', color: currentPage === index + 1 ? 'white' : 'black', cursor: 'pointer' }}
                                >
                                    {index + 1}
                                </button>
                            ))}

                            <button 
                                onClick={() => paginate(currentPage + 1)} 
                                disabled={currentPage === totalPages || totalPages === 0}
                                style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: currentPage === totalPages || totalPages === 0 ? '#f3f4f6' : 'white', cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </>
          )}
      </div>
    </div>
  );
};

export default Users;
import React, { useState, useEffect } from 'react';
import { Search, Plus, History, Shield, Lock, Loader2, RotateCcw, Edit, Key, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // --- Search, Filter, & Pagination States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [roleFilter, setRoleFilter] = useState('ALL'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    } catch {
      console.error("Lỗi khi kéo dữ liệu users:");
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    if (loggedInUser && loggedInUser.id === id) {
       alert("Bạn không thể tự khóa tài khoản của chính mình!");
       return;
    }

    const confirmMessage = currentStatus ? "Bạn có chắc muốn khóa tài khoản này?" : "Bạn muốn mở khóa tài khoản này?";
    if (!window.confirm(confirmMessage)) return;

    try {
      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, status: !user.status, securityStatus: !user.status ? 'Hoạt động' : 'Bị khóa' } 
          : user
      ));
    } catch (error) {
      alert("Lỗi không thể cập nhật trạng thái!");
    }
  };

  const handleResetPassword = (user) => {
      if(window.confirm(`Bạn có chắc muốn reset mật khẩu cho tài khoản ${user.username}?`)) {
          alert("Mật khẩu đã được reset thành công.");
      }
  };

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (isCreating) {
    return <CreateAccount onBack={() => { setIsCreating(false); fetchUsers(); }} />;
  }
  if (editingUser) {
    return <EditAccount user={editingUser} onBack={() => { setEditingUser(null); fetchUsers(); }} />;
  }

  return (
    <div className="admin-users-container" style={{ padding: '20px', fontFamily: 'system-ui' }}>
      
      {/* HEADER */}
      <div className="au-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="au-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Shield className="au-title-icon" size={24} color="#4f46e5" /> 
            Danh sách người dùng
          </h2>
          <p className="au-subtitle" style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '14px' }}>
            Kiểm soát truy cập, phân quyền và trạng thái bảo mật của hệ thống.
          </p>
        </div>
        
        {/* KHU VỰC CHỨA 2 NÚT BẤM (Đã ÉP CĂN GIỮA TUYỆT ĐỐI) */}
        <div className="au-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Nút Log Truy cập */}
          <button 
            onClick={() => setIsViewingLogs(true)} 
            style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
              height: '40px', // Chiều cao chuẩn 40px
              padding: '0 16px', border: '1px solid #d1d5db', borderRadius: '6px', 
              backgroundColor: 'white', color: '#374151', cursor: 'pointer', 
              fontWeight: '500', fontSize: '14px', boxSizing: 'border-box'
            }}
          >
            <History size={18} /> 
            <span style={{ lineHeight: 1 }}>Log truy cập</span>
          </button>
          
          {/* Nút Thêm mới */}
          <button 
            onClick={() => setIsCreating(true)} 
            style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
              height: '40px', // Chiều cao chuẩn 40px khớp với nút Log
              padding: '0 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', 
              borderRadius: '6px', cursor: 'pointer', 
              fontWeight: '500', fontSize: '14px', boxSizing: 'border-box'
            }}
          >
            <Plus size={18} /> 
            <span style={{ lineHeight: 1 }}>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="au-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* Ô Tìm kiếm */}
        <div className="au-search-box" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} className="au-search-icon" style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm mã NV, tên NV, tài khoản..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ 
              width: '100%', 
              height: '40px', 
              padding: '0 10px 0 38px', 
              borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', outline: 'none'
            }}
          />
        </div>
        
        {/* Các Dropdown lọc */}
        <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: 'white' }}
        >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã khóa</option>
        </select>

        <select 
            value={roleFilter} 
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: 'white' }}
        >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="MANAGER">Quản lý (Manager)</option>
            <option value="USER">Nhân viên (User)</option>
        </select>

        {/* Nút Làm mới */}
        <button onClick={handleResetFilters} style={{ height: '40px', padding: '0 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
            <RotateCcw size={16} /> Làm mới
        </button>
      </div>

      {/* TABLE AREA */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <Loader2 className="animate-spin" size={40} color="#4f46e5" />
            </div>
          ) : currentUsers.length === 0 ? (
             <div style={{ padding: '50px', textAlign: 'center', color: '#6b7280' }}>
                 <p style={{ fontSize: '16px', fontWeight: '500' }}>Không tìm thấy dữ liệu</p>
                 <p style={{ fontSize: '14px' }}>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
             </div>
          ) : (
            <>
                <table className="au-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>MÃ NV</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>NHÂN VIÊN</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>TÀI KHOẢN</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>VAI TRÒ</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#6b7280', fontWeight: '600', textAlign: 'center' }}>HÀNH ĐỘNG</th>
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
                        <td style={{ padding: '12px 20px', color: '#374151', fontSize: '14px' }}>{user.username}</td>
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                                <label className="au-switch" style={{ position: 'relative', display: 'inline-block', width: '34px', height: '20px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={user.status} 
                                        onChange={() => toggleStatus(user.id, user.status)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: user.status ? '#4f46e5' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                                        <span style={{ position: 'absolute', height: '14px', width: '14px', left: user.status ? '16px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                    </span>
                                </label>
                                
                                <button onClick={() => setEditingUser(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Chỉnh sửa">
                                    <Edit size={16} />
                                </button>

                                <button onClick={() => handleResetPassword(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Cấp lại mật khẩu">
                                    <Key size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>

                {/* PAGINATION */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        Hiển thị {filteredUsers.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} của {filteredUsers.length} người dùng
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
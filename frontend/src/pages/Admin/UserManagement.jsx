import React, { useState, useEffect } from 'react';
import { 
  Search, History, Plus, Shield, MoreHorizontal, Lock, 
  ArrowLeft, User, Key, Mail, RefreshCw 
} from 'lucide-react';
import './UserManagement.css'; // <-- Đã tách CSS sang file riêng

const UserManagement = () => {
  // --- STATES ---
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Điều hướng màn hình: 'LIST' | 'CREATE' | 'EDIT'
  const [currentView, setCurrentView] = useState('LIST'); 
  // Lưu trữ user đang được chọn để edit
  const [selectedUser, setSelectedUser] = useState(null);

  // --- FETCH DATA ---
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleOpenCreate = () => setCurrentView('CREATE');
  
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setCurrentView('EDIT');
  };

  const handleBackToList = () => {
    setCurrentView('LIST');
    setSelectedUser(null);
  };

  // =========================================================================
  // MÀN HÌNH 1: DANH SÁCH TÀI KHOẢN (LIST)
  // =========================================================================
  const renderList = () => (
    <div className="admin-page-container fade-in">
      <div className="admin-header">
        <div className="header-title-group">
          <div className="icon-box-purple">
            <Shield size={24} color="#8b5cf6" />
          </div>
          <div>
            <h2>Quản lý Phân quyền & Tài khoản</h2>
            <p>Kiểm soát truy cập, phân quyền (Roles) và trạng thái bảo mật của hệ thống.</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-outline-dark">
            <History size={16} /> Log truy cập
          </button>
          <button className="btn-primary-purple" onClick={handleOpenCreate}>
            <Plus size={16} /> Tạo tài khoản
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} color="#9ca3af" />
          <input type="text" placeholder="Tìm Username, Email, Tên nhân viên..." />
        </div>
        <div className="filter-dropdowns">
          <select className="select-box">
            <option>Tất cả quyền (Role)</option>
            <option>System Admin</option>
            <option>HR Manager</option>
            <option>User</option>
          </select>
          <select className="select-box">
            <option>Đang hoạt động</option>
            <option>Bị khóa</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            ⏳ Đang tải dữ liệu từ Database...
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>TÀI KHOẢN / NHÂN SỰ</th>
                <th>TÊN ĐĂNG NHẬP (USERNAME)</th>
                <th>PHÂN QUYỀN (ROLE)</th>
                <th>ĐĂNG NHẬP CUỐI</th>
                <th>TRẠNG THÁI</th>
                <th>BẢO MẬT</th>
                <th style={{ textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.inactive ? 'row-inactive' : ''}>
                  <td>
                    <div className="user-info-cell">
                      <img src={user.avatar} alt="avatar" className="avatar-img" />
                      <div>
                        <p className="user-name">{user.name}</p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: '600', color: '#111827' }}>{user.username}</td>
                  <td>
                    <span className={`role-badge ${user.role === 'System Admin' ? 'system-admin' : 'other-role'}`}>
                      {user.role} {user.role === 'User' && <span className="red-dot"></span>}
                    </span>
                  </td>
                  <td>
                    <p className="login-time">{user.lastLoginTime}</p>
                    <p className="login-ip">{user.lastLoginIp}</p>
                  </td>
                  <td>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={user.status} readOnly />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td>
                    {user.security === 'Bị khóa' ? (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                        <Lock size={14} /> Bị khóa
                      </span>
                    ) : user.security === 'Hệ thống' ? (
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>Hệ thống</span>
                    ) : (
                      <span style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {user.security}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', color: '#9ca3af' }}>
                    <button 
                      className="btn-icon-action" 
                      onClick={() => handleOpenEdit(user)}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-footer-actions">
        <button className="btn-primary-purple large">Lưu cài đặt Role</button>
      </div>
    </div>
  );

  // =========================================================================
  // MÀN HÌNH 2: TẠO MỚI TÀI KHOẢN (CREATE)
  // =========================================================================
  const renderCreate = () => (
    <div className="admin-page-container fade-in">
      <div className="admin-header-simple">
        <div className="header-title-group">
          <div className="icon-box-purple-light">
            <User size={24} color="#8b5cf6" />
          </div>
          <div>
            <h2>Cấp tài khoản hệ thống</h2>
            <p>Thiết lập thông tin đăng nhập và phân quyền cho nhân sự mới.</p>
          </div>
        </div>
        <button className="btn-outline-dark" onClick={handleBackToList}>
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="form-card">
        <h3 className="form-section-title">
          <User size={18} color="#8b5cf6" /> Thông tin Nhân sự
        </h3>
        <div className="form-group mb-0">
          <label className="form-label">Chọn nhân viên (Chưa có tài khoản) <span className="text-red-500">*</span></label>
          <select className="form-input select-styled">
            <option>-- Tìm kiếm và chọn nhân viên --</option>
            <option>Phạm Văn C</option>
            <option>Nguyễn Thị D</option>
          </select>
          <p className="form-hint">Danh sách chỉ hiển thị những nhân sự đang làm việc và chưa được cấp tài khoản.</p>
        </div>
      </div>

      <div className="form-card">
        <h3 className="form-section-title">
          <Key size={18} color="#8b5cf6" /> Thông tin Đăng nhập
        </h3>
        <div className="form-grid-2">
          <div className="form-group mb-0">
            <label className="form-label">Tên đăng nhập (Username) <span className="text-red-500">*</span></label>
            <div className="input-with-icon-right">
              <input type="text" className="form-input" placeholder="Ví dụ: phamvanc" />
              <span className="icon-right text-gray-400">@</span>
            </div>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Mật khẩu khởi tạo <span className="text-red-500">*</span></label>
            <div className="input-with-icon-right">
              <input type="text" className="form-input" defaultValue="Welcome@123" />
              <button className="icon-right text-purple-500 hover-purple bg-transparent border-none cursor-pointer">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3 className="form-section-title">
          <Shield size={18} color="#8b5cf6" /> Phân quyền & Bảo mật
        </h3>
        <div className="form-grid-2 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Vai trò (Role) <span className="text-red-500">*</span></label>
            <select className="form-input select-styled">
              <option>User (Nhân viên bình thường)</option>
              <option>HR Manager (Quản lý Nhân sự)</option>
              <option>System Admin</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Trạng thái tài khoản</label>
            <select className="form-input select-styled font-medium text-green-600">
              <option>Đang hoạt động (Active)</option>
              <option>Khóa (Inactive)</option>
            </select>
          </div>
        </div>

        <div className="alert-box-purple">
          <label className="custom-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="checkmark"></span>
            Yêu cầu nhân viên đổi mật khẩu trong lần đăng nhập đầu tiên
          </label>
          <label className="custom-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="checkmark"></span>
            Tự động gửi thông tin tài khoản qua Email của nhân viên
          </label>
        </div>
      </div>

      <div className="admin-footer-actions gap-4">
        <button className="btn-outline-dark large" onClick={handleBackToList}>Hủy bỏ</button>
        <button className="btn-primary-purple large">Khởi tạo tài khoản</button>
      </div>
    </div>
  );

  // =========================================================================
  // MÀN HÌNH 3: CHỈNH SỬA TÀI KHOẢN (EDIT)
  // =========================================================================
  const renderEdit = () => (
    <div className="admin-page-container fade-in">
      <div className="admin-header-simple">
        <div className="header-title-group">
          <div className="icon-box-orange-light">
            <User size={24} color="#f59e0b" />
          </div>
          <div>
            <h2>Chỉnh sửa tài khoản hệ thống</h2>
            <p>Cập nhật thông tin phân quyền và trạng thái hoạt động của tài khoản.</p>
          </div>
        </div>
        <button className="btn-outline-dark" onClick={handleBackToList}>
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="form-card">
        <h3 className="form-section-title-orange">
          <User size={18} color="#f59e0b" /> Thông tin Nhân sự
        </h3>
        <div className="form-group mb-0">
          <label className="form-label">Nhân viên đang chọn</label>
          <div className="selected-user-box">
            <img src={selectedUser?.avatar} alt="avatar" className="avatar-img large" />
            <div>
              <p className="user-name text-base">{selectedUser?.name}</p>
              <p className="user-email text-sm">Phòng Hành chính Nhân sự</p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3 className="form-section-title-orange">
          <Key size={18} color="#f59e0b" /> Thông tin Đăng nhập
        </h3>
        <div className="form-grid-2">
          <div className="form-group mb-0">
            <label className="form-label">Tên đăng nhập (Username)</label>
            <div className="input-with-icon-right disabled-input">
              <input type="text" className="form-input bg-transparent border-none" value={selectedUser?.username || ''} readOnly />
              <span className="icon-right text-gray-400"><Lock size={16} /></span>
            </div>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Mật khẩu</label>
            <button className="btn-outline-purple w-full h-11 flex justify-center items-center gap-2">
              <Mail size={16} /> Gửi link Reset mật khẩu
            </button>
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3 className="form-section-title-orange">
          <Shield size={18} color="#f59e0b" /> Phân quyền & Bảo mật
        </h3>
        <div className="form-grid-2 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Vai trò (Role) <span className="text-red-500">*</span></label>
            <select className="form-input select-styled" defaultValue={selectedUser?.role}>
              <option value="User">User (Nhân viên bình thường)</option>
              <option value="HR Manager">HR Manager (Quản lý Nhân sự)</option>
              <option value="System Admin">System Admin</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Trạng thái tài khoản</label>
            <select className="form-input select-styled font-medium text-green-600" defaultValue={selectedUser?.status ? 'active' : 'inactive'}>
              <option value="active">Đang hoạt động (Active)</option>
              <option value="inactive" className="text-red-500">Bị khóa (Inactive)</option>
            </select>
          </div>
        </div>

        <div className="alert-box-yellow">
          <label className="custom-checkbox yellow">
            <input type="checkbox" defaultChecked />
            <span className="checkmark"></span>
            Gửi thông báo về thay đổi tài khoản qua Email của nhân viên
          </label>
        </div>
      </div>

      <div className="admin-footer-actions gap-4">
        <button className="btn-outline-dark large" onClick={handleBackToList}>Hủy bỏ</button>
        <button className="btn-primary-orange large">Lưu thay đổi</button>
      </div>
    </div>
  );

  return (
    <>
      {currentView === 'LIST' && renderList()}
      {currentView === 'CREATE' && renderCreate()}
      {currentView === 'EDIT' && renderEdit()}
    </>
  );
};

export default UserManagement;
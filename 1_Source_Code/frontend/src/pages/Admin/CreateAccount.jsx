import React, { useState, useEffect } from 'react'; // Đã thêm useEffect ở đây
import { ArrowLeft, UserSquare2, KeyRound, ShieldCheck, RefreshCw, UserPlus, Users } from 'lucide-react';
// Sử dụng service tập trung cho các API Admin liên quan tới tài khoản
import { adminUserService } from '../../services/adminUserService';

const CreateAccount = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('existing');

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    positionId: '',
    username: '',
    password: '',
    role: 'EMPLOYEE',
status: 'active',
    sendEmail: true
  });

  // STATE ĐỂ CHỨA DANH SÁCH NHÂN VIÊN TỪ BACKEND
  const [employeesList, setEmployeesList] = useState([]);

  // GỌI API LẤY DANH SÁCH NHÂN VIÊN CHƯA CÓ TÀI KHOẢN
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Gọi qua adminUserService để tránh lặp lại baseURL và header Authorization
        const res = await adminUserService.getEmployeesWithoutAccount();
        if (res.success) {
          setEmployeesList(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách nhân viên:", error);
      }
    };
    
    // Chỉ gọi API nếu đang mở tab "Chọn nhân sự có sẵn"
    if (activeTab === 'existing') {
      fetchEmployees();
    }
  }, [activeTab]); 

  // TẠO MẬT KHẨU NGẪU NHIÊN
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: pass });
  };

  // XỬ LÝ KHI BẤM NÚT TẠO
  const handleCreateSubmit = async () => {
    if (!formData.username || !formData.password) {
      alert("Vui lòng nhập Username và Password!");
      return;
    }
    if (activeTab === 'existing' && !formData.employeeId) {
      alert("Vui lòng chọn một nhân viên!");
      return;
    }
    if (activeTab === 'new' && (!formData.fullName || !formData.positionId)) {
      alert("Vui lòng nhập đầy đủ Họ tên và Vị trí chức vụ cho nhân sự mới!");
      return;
    }

    const payload = {
      ...formData,
      isNewEmployee: activeTab === 'new'
    };

    try {
      // Tạo tài khoản thông qua service, axiosClient sẽ tự gắn token
      const response = await adminUserService.createUser(payload);
      
      if (response?.status === 201 || response?.success) {
        alert("Khởi tạo tài khoản thành công!");
        onBack();
      }
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="ca-container">
      <div className="ca-header">
        <div className="ca-header-left">
          <div className="ca-title-icon-wrapper">
            <UserSquare2 size={24} className="ca-title-icon" />
          </div>
          <div>
            <h2 className="au-title" style={{ margin: 0 }}>Cấp tài khoản hệ thống</h2>
            <p className="au-subtitle">Thiết lập thông tin đăng nhập và phân quyền cho nhân sự.</p>
          </div>
        </div>
        <button className="au-btn au-btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="ca-form-content">
        <div className="ca-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="ca-card-title" style={{ margin: 0 }}>
              <UserSquare2 size={18} /> Thông tin Hồ sơ nhân sự
            </h3>
            <div className="ca-tabs">
              <button 
                className={`ca-tab-btn ${activeTab === 'existing' ? 'active' : ''}`}
                onClick={() => setActiveTab('existing')}
              >
                <Users size={14} /> Chọn nhân sự có sẵn
              </button>
              <button 
                className={`ca-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
                onClick={() => setActiveTab('new')}
              >
                <UserPlus size={14} /> Tạo nhân sự mới
              </button>
            </div>
          </div>

          {activeTab === 'existing' && (
            <div className="ca-form-group ca-fade-in">
              <label>Chọn nhân viên (Chưa có tài khoản) <span className="ca-required">*</span></label>
              
              {/* ĐÃ SỬA: Đổ danh sách động từ DB vào đây */}
              <select 
                className="ca-input-select"
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              >
                <option value="">-- Tìm kiếm và chọn nhân viên --</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.full_name} {emp.position_name ? `- ${emp.position_name}` : ''} (Chưa cấp TK)
                  </option>
                ))}
              </select>

              <p className="ca-helper-text">ⓘ Chỉ hiển thị những nhân sự đang làm việc và chưa được cấp tài khoản.</p>
            </div>
          )}

          {activeTab === 'new' && (
            <div className="ca-grid-2 ca-fade-in">
              <div className="ca-form-group">
                <label>Họ và tên nhân viên <span className="ca-required">*</span></label>
                <input 
                  type="text" 
                  placeholder="Nhập họ và tên đầy đủ" 
                  className="ca-input"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              
              <div className="ca-form-group">
                <label>Vị trí / Chức vụ <span className="ca-required">*</span></label>
                <select 
                  className="ca-input-select"
                  value={formData.positionId}
                  onChange={(e) => setFormData({...formData, positionId: e.target.value})}
                >
                  <option value="">-- Chọn vị trí / chức vụ --</option>
                  <option value="1">Nhân viên IT</option>
                  <option value="2">Chuyên viên Nhân sự</option>
                  <option value="3">Nhân viên Kinh doanh</option>
                </select>
              </div>

              <div className="ca-form-group">
                <label>Email liên hệ (Tùy chọn)</label>
                <input 
                  type="email" 
                  placeholder="example@company.com" 
                  className="ca-input"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          )}
        </div>

        <div className="ca-card">
          <h3 className="ca-card-title">
            <KeyRound size={18} /> Thông tin Đăng nhập
          </h3>
          <div className="ca-grid-2">
            <div className="ca-form-group">
              <label>Tên đăng nhập (Username) <span className="ca-required">*</span></label>
              <div className="ca-input-with-icon">
                <input 
                  type="text" 
                  placeholder="Ví dụ: phamvanc" 
                  className="ca-input" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
                <span className="ca-input-suffix">@</span>
              </div>
            </div>
            <div className="ca-form-group">
              <label>Mật khẩu khởi tạo <span className="ca-required">*</span></label>
              <div className="ca-input-with-icon">
                <input 
                  type="text" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Nhập hoặc tạo ngẫu nhiên" 
                  className="ca-input" 
                />
                <button type="button" onClick={generatePassword} className="ca-input-action" title="Tạo mật khẩu ngẫu nhiên">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ca-card">
          <h3 className="ca-card-title">
            <ShieldCheck size={18} /> Phân quyền & Bảo mật
          </h3>
          <div className="ca-grid-2">
            <div className="ca-form-group">
              <label>Vai trò (Role) <span className="ca-required">*</span></label>
              <select 
                className="ca-input-select"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="EMPLOYEE">User (Nhân viên bình thường)</option>
                <option value="MANAGER">Manager (Quản lý)</option>
                <option value="DIRECTOR">Director (Giám đốc)</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>
            <div className="ca-form-group">
              <label>Trạng thái tài khoản</label>
              {/* SỬA THÀNH NHƯ SAU ĐỂ KHỚP VỚI DATABASE ENUM */}
                <select 
                  className="ca-input-select" 
                  style={{ color: formData.status === 'active' ? '#10b981' : '#ef4444', fontWeight: '500' }}
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="locked">Khóa (Locked)</option>
                </select>
            </div>
          </div>

          <div className="ca-options-box">
            <label className="ca-checkbox-label">
              <input 
                type="checkbox" 
                checked={formData.sendEmail}
                onChange={(e) => setFormData({...formData, sendEmail: e.target.checked})}
              />
              <span>Tự động gửi thông tin tài khoản qua Email của nhân viên</span>
            </label>
          </div>
        </div>
      </div>

      <div className="ca-footer">
        <button className="au-btn au-btn-outline" onClick={onBack} style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db' }}>
          Hủy bỏ
        </button>
        <button className="au-btn au-btn-primary" onClick={handleCreateSubmit} style={{ padding: '10px 24px' }}>
          <ShieldCheck size={16} /> Khởi tạo tài khoản
        </button>
      </div>
    </div>
  );
};

export default CreateAccount;
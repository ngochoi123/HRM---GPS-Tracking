import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, User, CreditCard, Briefcase, ShieldCheck, MapPin, Building2, UserPlus, Hash, Phone, Mail, Camera, UploadCloud, Lock, ChevronDown } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';
import axiosClient from '../../api/axiosClient';

export default function AddEmployee({ onBack, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    gender: 'true',
    status: 'active',
    contract_type: 'probation',
    join_date: new Date().toISOString().split('T')[0],
    send_email: true,
    branch_id: '',
    department_id: '',
    position_id: '',
    direct_manager_id: ''
  });
  
  const [options, setOptions] = useState({ 
    branches: [], 
    departments: [], 
    positions: [], 
    managers: [] 
  });
  const [loading, setLoading] = useState(true);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deptManagerInfo, setDeptManagerInfo] = useState({ hasManager: false, managerName: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  const tempEmpCode = `NV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    const initData = async () => {
      try {
        const branchesRes = await axiosClient.get("/director/branches");
        setOptions(prev => ({ 
          ...prev, 
          branches: Array.isArray(branchesRes) ? branchesRes : [] 
        }));

        // Nếu là MANAGER, locked vào phòng ban của họ
        if (userData.role === 'MANAGER' && userData.department_id) {
           // Cần fetch department info để biết branch_id
           const deptRes = await axiosClient.get(`/director/departments/${userData.department_id}`);
           setFormData(prev => ({ 
             ...prev, 
             branch_id: String(deptRes.branch_id),
             department_id: String(userData.department_id) 
           }));
           // Fetch options cho department đó
           await fetchDeptCascadeData(userData.department_id);
        }
      } catch (error) {
        console.error("Lỗi khởi tạo AddEmployee:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const fetchDeptCascadeData = async (deptId) => {
    if (!deptId) return;
    setLoadingCascade(true);
    try {
      // 1. Kiểm tra Trưởng phòng hiện tại (Manager Lock)
      const lockRes = await axiosClient.get(`/director/departments/${deptId}/has-manager`);
      setDeptManagerInfo(lockRes);

      // 2. Lấy Chức vụ & Quản lý của phòng ban
      // Sử dụng API form-options hoặc linh hoạt hơn
      const optRes = await managerEmployeeService.getFormOptions();
      setOptions(prev => ({ 
        ...prev, 
        positions: optRes.positions || [],
        managers: optRes.managers || []
      }));

    } catch (error) {
      console.error("Lỗi fetch cascade data:", error);
    } finally {
      setLoadingCascade(false);
    }
  };

  const handleBranchChange = async (e) => {
    const branchId = e.target.value;
    setFormData(prev => ({ ...prev, branch_id: branchId, department_id: '', position_id: '', direct_manager_id: '' }));
    setOptions(prev => ({ ...prev, departments: [] }));
    
    if (branchId) {
      try {
        const branchRes = await axiosClient.get(`/director/branches/${branchId}`);
        setOptions(prev => ({ ...prev, departments: branchRes.departments || [] }));
      } catch (err) {
        console.error("Lỗi tải phòng ban từ chi nhánh:", err);
      }
    }
  };

  const handleDeptChange = async (e) => {
    const deptId = e.target.value;
    setFormData(prev => ({ ...prev, department_id: deptId, position_id: '', direct_manager_id: '' }));
    if (deptId) {
      await fetchDeptCascadeData(deptId);
    } else {
      setDeptManagerInfo({ hasManager: false, managerName: '' });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formDataToSend = new FormData();
      
      // Append all from formData
      Object.keys(formData).forEach(key => {
        // Handle null values
        const value = formData[key] === null ? '' : formData[key];
        formDataToSend.append(key, value);
      });

      // Append additional fields
      formDataToSend.append('employee_code', tempEmpCode);
      
      // Append avatar file if exists
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      await managerEmployeeService.createEmployee(formDataToSend);
      alert('Thêm nhân viên thành công!');
      onSaveSuccess();
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu!');
    } finally {
      setSaving(false);
    }
  };

  const filteredPositions = options.positions.filter(
    pos => String(pos.department_id) === String(formData.department_id)
  );

  const filteredManagers = options.managers.filter(
    mgr => String(mgr.department_id) === String(formData.department_id)
  );

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-[500px] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-slate-400 font-medium text-sm">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <UserPlus size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Thêm Nhân Viên Mới</h1>
              <p className="text-sm text-slate-500">Điền đầy đủ thông tin bên dưới để khởi tạo hồ sơ nhân sự mới trong hệ thống.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onBack} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm"
          >
            <ArrowLeft size={16} /> Danh sách nhân sự
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-blue-600 font-semibold text-sm">
              <ShieldCheck size={18} />
              <span>Thông tin tài khoản</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div 
                className="relative group cursor-pointer"
                onClick={handleAvatarClick}
              >
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-slate-300" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center transition-all">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chọn file ảnh</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={handleAvatarClick}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <UploadCloud size={18} className="text-blue-500" />
                  Nhập Ảnh Avatar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-blue-600 font-semibold text-sm">
              <ShieldCheck size={18} />
              <span>Thông tin tài khoản</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField 
                label="Mã nhân viên" 
                name="employee_code" 
                value={tempEmpCode} 
                readOnly 
                icon={Hash}
              />
              <InputField 
                label="Tên đăng nhập (Username)" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                placeholder="Nhập user_name..." 
                required 
                icon={User}
              />
              <InputField 
                label="Mật khẩu (Password)" 
                name="password" 
                type="text" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Nhập mật khẩu..." 
                required 
                icon={Lock}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-blue-600 font-semibold text-sm">
              <User size={18} />
              <span>Thông tin cá nhân</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Họ và tên nhân viên" name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Ví dụ: Nguyễn Văn A" />
              <InputField label="Số điện thoại" name="phone_number" value={formData.phone_number} onChange={handleChange} required placeholder="Ví dụ: 0912 345 678" icon={Phone} />
              <InputField label="Email liên hệ" name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} required placeholder="Ví dụ: nguyenvana@company.com" icon={Mail} />
              <InputField label="CCCD" name="identity_card_number" value={formData.identity_card_number} onChange={handleChange} required placeholder="Ví dụ: 012345678901" />
              <InputField label="Ngày sinh" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Giới tính <span className="text-rose-500">*</span></label>
                <div className="flex items-center gap-6 h-[42px] px-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="true" checked={formData.gender === 'true' || formData.gender === true} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm text-slate-600 font-medium">Nam</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="false" checked={formData.gender === 'false' || formData.gender === false} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm text-slate-600 font-medium">Nữ</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <InputField label="Địa chỉ cư trú hiện tại" name="address" value={formData.address} onChange={handleChange} placeholder="Nhập địa chỉ chi tiết..." />
              </div>

              <InputField label="Ngân hàng" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="Ví dụ: Vietcombank" icon={Building2} />
              <InputField label="Số tài khoản" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} placeholder="Nhập số tài khoản..." icon={CreditCard} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-blue-600 font-semibold text-sm">
              <Briefcase size={18} />
              <span>Thông tin công việc</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField 
                label="Chi nhánh" name="branch_id" value={formData.branch_id} onChange={handleBranchChange} 
                options={options.branches.map(b => ({ value: b.id, label: b.branch_name }))}
                disabled={user?.role === 'MANAGER'}
                icon={MapPin}
              />
              <SelectField 
                label="Phòng ban" name="department_id" value={formData.department_id} onChange={handleDeptChange}
                options={options.departments.map(d => ({ value: d.id, label: d.department_name }))}
                disabled={user?.role === 'MANAGER' || !formData.branch_id}
                icon={Building2}
              />
              <SelectField 
                label="Chức vụ chuyên môn" name="position_id" value={formData.position_id} onChange={handleChange}
                options={filteredPositions.map(pos => {
                  const isManagerRole = pos.level === 'manager';
                  const isDisabled = isManagerRole && deptManagerInfo.hasManager;
                  return { 
                    value: pos.id, 
                    label: pos.position_name + (isDisabled ? ` (Đã có TP: ${deptManagerInfo.managerName})` : ''),
                    disabled: isDisabled 
                  };
                })}
                disabled={!formData.department_id || loadingCascade}
              />
              <SelectField 
                label="Người quản lý trực tiếp" name="direct_manager_id" value={formData.direct_manager_id} onChange={handleChange}
                options={filteredManagers.map(mgr => ({ value: mgr.id, label: mgr.full_name }))}
                disabled={!formData.department_id || loadingCascade}
                icon={User}
              />
              <SelectField 
                label="Loại hợp đồng" name="contract_type" value={formData.contract_type} onChange={handleChange}
                options={[
                  { value: 'probation', label: 'Thử việc' },
                  { value: 'official', label: 'Chính thức' },
                  { value: 'part_time', label: 'Bán thời gian' }
                ]}
              />
              <InputField label="Ngày gia nhập" name="join_date" type="date" value={formData.join_date} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Email Công tác" name="work_email" type="email" value={formData.work_email} onChange={handleChange} placeholder="Ví dụ: an.nv@company.com" icon={Mail} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-4 px-6 bg-blue-50 border border-blue-100 rounded-2xl">
            <input 
              type="checkbox" id="send_email" name="send_email"
              checked={formData.send_email} onChange={handleChange}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="send_email" className="text-sm font-semibold text-blue-800 cursor-pointer select-none">
              Tự động gửi thông tin tài khoản & mật khẩu qua Email nhân sự sau khi lưu
            </label>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
            <button 
              type="button" 
              onClick={onBack} 
              className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              Thêm nhân viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const InputField = ({ label, name, type = "text", value, onChange, placeholder, required, readOnly, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-medium text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon size={16} />
        </div>
      )}
      <input 
        type={type} 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        placeholder={placeholder} 
        required={required}
        readOnly={readOnly}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${readOnly ? 'bg-blue-50 border-blue-100 text-blue-600 font-bold cursor-not-allowed' : 'text-slate-600 font-medium'}`}
      />
    </div>
  </div>
);

const SelectField = ({ label, name, value, onChange, options, disabled, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Icon size={16} />
        </div>
      )}
      <select 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        disabled={disabled}
        className={`w-full appearance-none ${Icon ? 'pl-10' : 'px-4'} pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium transition-all outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed`}
      >
        <option value="">-- Chọn {label.toLowerCase()} --</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <ChevronDown size={16} />
      </div>
    </div>
  </div>
);
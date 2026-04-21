import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, User, CreditCard, Briefcase, ShieldCheck, MapPin, Building2, AlertCircle } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.department_id) payload.department_id = null;
      if (!payload.position_id) payload.position_id = null;
      if (!payload.direct_manager_id) payload.direct_manager_id = null;

      await managerEmployeeService.createEmployee(payload);
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
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Đang khởi tạo form...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-20">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10 max-w-6xl mx-auto mt-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all border border-slate-100 hover:scale-105 active:scale-95">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Thêm <span className="text-indigo-600">Nhân sự mới</span></h1>
              <p className="text-sm text-slate-400 font-medium">Hệ thống quản lý định danh và phân quyền nội bộ</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* BLOCK 1: TÀI KHOẢN & ĐỊNH DANH */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
               <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                 <ShieldCheck className="text-indigo-500" size={22} />
                 Xác thực hệ thống
               </h3>
               <p className="text-sm text-slate-400 leading-relaxed font-medium">Cấp phát tài khoản đăng nhập và mã số định danh duy nhất cho nhân viên trên toàn hệ thống.</p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mã định danh (Temp)</label>
                 <div className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-indigo-600 font-black flex items-center gap-2 shadow-sm">
                   {tempEmpCode}
                 </div>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Username <span className="text-rose-500">*</span></label>
                 <input 
                    type="text" name="username" value={formData.username || ''} onChange={handleChange} placeholder="VD: nguyenvan_a" required
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                  />
               </div>
               <div className="flex flex-col gap-2 md:col-span-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mật khẩu khởi tạo <span className="text-rose-500">*</span></label>
                 <input 
                    type="text" name="password" value={formData.password || ''} onChange={handleChange} placeholder="Nhập mật khẩu an toàn..." required
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                  />
               </div>
            </div>
          </section>

          {/* BLOCK 2: CƠ CẤU TỔ CHỨC (CASCADING DROPDOWNS) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
               <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                 <Briefcase className="text-indigo-500" size={22} />
                 Vị trí công tác
               </h3>
               <p className="text-sm text-slate-400 leading-relaxed font-medium">Bố trí nhân viên vào sơ đồ tổ chức. Một số chức vụ quản lý sẽ bị giới hạn nếu bộ phận đã có người đảm nhiệm.</p>
            </div>
            <div className="lg:col-span-2 space-y-6 bg-indigo-50/30 p-8 rounded-[32px] border border-indigo-100">
               {/* Chi nhánh -> Phòng ban */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={14} className="text-indigo-400" /> Chi nhánh
                    </label>
                    <select 
                      name="branch_id" value={formData.branch_id} onChange={handleBranchChange} 
                      disabled={user?.role === 'MANAGER'}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none disabled:bg-slate-100 cursor-pointer"
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {options.branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-400" /> Phòng ban
                    </label>
                    <select 
                      name="department_id" value={formData.department_id} onChange={handleDeptChange}
                      disabled={user?.role === 'MANAGER' || !formData.branch_id}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none disabled:bg-slate-50 cursor-pointer"
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {options.departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                    </select>
                  </div>
               </div>

               {/* Chức vụ (Với logic Manager Lock) */}
               <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Chức vụ chuyên môn</label>
                  <select 
                    name="position_id" value={formData.position_id} onChange={handleChange}
                    disabled={!formData.department_id || loadingCascade}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none disabled:bg-slate-50 cursor-pointer"
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    {filteredPositions.map(pos => {
                      // Logic Manager Lock: Nếu bộ phận đã có manager, disable các chức vụ có level 'manager'
                      const isManagerRole = pos.level === 'manager';
                      const isDisabled = isManagerRole && deptManagerInfo.hasManager;
                      
                      return (
                        <option key={pos.id} value={pos.id} disabled={isDisabled}>
                          {pos.position_name} {isDisabled ? `(Đã có TP: ${deptManagerInfo.managerName})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {deptManagerInfo.hasManager && (
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] bg-amber-50 p-3 rounded-xl border border-amber-100">
                       <AlertCircle size={14} />
                       Lưu ý: Bộ phận này đã có Trưởng phòng nên vị trí này sẽ bị khóa.
                    </div>
                  )}
               </div>

               {/* Quản lý trực tiếp */}
               <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest font-black">Người quản lý trực tiếp</label>
                  <select 
                    name="direct_manager_id" value={formData.direct_manager_id} onChange={handleChange}
                    disabled={!formData.department_id || loadingCascade}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none cursor-pointer"
                  >
                    <option value="">-- Chọn quản lý --</option>
                    {filteredManagers.map(mgr => (
                      <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
                    ))}
                  </select>
               </div>
            </div>
          </section>

          {/* BLOCK 3: HỒ SƠ CÁ NHÂN */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1">
                <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                  <User className="text-indigo-500" size={22} />
                  Hồ sơ nhân thân
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">Thông tin cơ bản phục vụ việc quản lý hồ sơ và các chế độ bảo hiểm, phúc lợi xã hội.</p>
             </div>
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                <InputField label="Họ và tên" name="full_name" value={formData.full_name} onChange={handleChange} required />
                <InputField label="Số CCCD/Passport" name="identity_card_number" value={formData.identity_card_number} onChange={handleChange} />
                <InputField label="Ngày sinh" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Giới tính</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer">
                    <option value="true">Nam</option>
                    <option value="false">Nữ</option>
                  </select>
                </div>

                <InputField label="Số điện thoại" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                <InputField label="Email cá nhân" name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} />
                <div className="md:col-span-2 space-y-4">
                   <InputField label="Địa chỉ cư trú hiện tại" name="address" value={formData.address} onChange={handleChange} />
                   <InputField label="Email Công tác" name="work_email" type="email" value={formData.work_email} onChange={handleChange} placeholder="VD: an.nv@company.com" />
                </div>
             </div>
          </section>

          {/* CHECKBOX GỬI EMAIL & SUBMIT */}
          <div className="pt-10 border-t border-slate-100 flex flex-col gap-8">
             <div className="bg-indigo-600 p-6 rounded-[32px] flex items-center gap-4 shadow-xl shadow-indigo-100 border border-indigo-700">
                <div className="relative">
                  <input 
                    type="checkbox" id="send_email" name="send_email"
                    checked={formData.send_email} onChange={handleChange}
                    className="peer w-6 h-6 rounded-xl border-none text-white focus:ring-0 cursor-pointer accent-emerald-500"
                  />
                </div>
                <label htmlFor="send_email" className="text-sm font-bold text-white cursor-pointer select-none">
                  Tự động gửi thông tin tài khoản & mật khẩu qua Email nhân sự sau khi lưu
                </label>
             </div>

             <div className="flex justify-end items-center gap-4">
                <button 
                  type="button" onClick={onBack} 
                  className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" disabled={saving} 
                  className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Hoàn tất & Lưu hồ sơ
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const InputField = ({ label, name, type = "text", value, onChange, placeholder, required }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input 
      type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} required={required}
      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
    />
  </div>
);
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, User, CreditCard, Briefcase, ShieldCheck } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';

export default function AddEmployee({ onBack, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    // Đặt sẵn vài giá trị mặc định
    gender: 'true',
    status: 'active',
    contract_type: 'probation',
    join_date: new Date().toISOString().split('T')[0],
    send_email: true // 👉 Mặc định tick sẵn ô gửi email
  });
  
  const [options, setOptions] = useState({ departments: [], positions: [], managers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sinh mã nhân viên ảo (để hiển thị cho đẹp, thực tế Backend sẽ sinh mã thật)
  const tempEmpCode = `NV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const optRes = await managerEmployeeService.getFormOptions();
        setOptions(optRes || { departments: [], positions: [], managers: [] });
      } catch (error) {
        console.error("Lỗi kéo dữ liệu Combobox:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Xử lý riêng cho ô Checkbox gửi email
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
      return;
    }

    if (name === 'department_id') {
      setFormData({ ...formData, department_id: value, position_id: '' });
    } else {
      setFormData({ ...formData, [name]: value });
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
        <Loader2 className="animate-spin text-cyan-500 mb-4" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Thêm nhân viên mới</h1>
              <p className="text-sm text-slate-500">Điền thông tin và cấp tài khoản hệ thống cho nhân sự.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ========================================== */}
          {/* BLOCK 0: THÔNG TIN TÀI KHOẢN (Thiết kế giống ảnh 1) */}
          {/* ========================================== */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <ShieldCheck className="text-cyan-500" size={20} /> Thông tin tài khoản
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30 p-6 rounded-xl border border-slate-100">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Mã nhân viên</label>
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-cyan-600 font-bold flex items-center gap-2">
                  <span className="text-slate-400">⚙️</span> {tempEmpCode}
                </div>
                <p className="text-xs text-slate-400 italic mt-1">Mã này được hệ thống sinh tự động.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Tên đăng nhập (Username) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                  <input 
                    type="email" name="username" value={formData.username || ''} onChange={handleChange} placeholder="Nhập user_name..." required
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Mật khẩu (Password) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                  <input 
                    type="text" name="password" value={formData.password || ''} onChange={handleChange} placeholder="Nhập mật khẩu..." required
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 1: THÔNG TIN CÁ NHÂN */}
          {/* ========================================== */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <User className="text-cyan-500" size={20} /> Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 p-6 rounded-xl border border-slate-100">
              <InputField label="Họ và tên" name="full_name" value={formData.full_name} onChange={handleChange} required />
              <InputField label="Căn cước công dân" name="identity_card_number" value={formData.identity_card_number} onChange={handleChange} />
              <InputField label="Ngày sinh" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                  <option value="true">Nam</option>
                  <option value="false">Nữ</option>
                </select>
              </div>

              <InputField label="Số điện thoại" name="phone_number" value={formData.phone_number} onChange={handleChange} />
              <InputField label="Email cá nhân" name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Địa chỉ cư trú" name="address" value={formData.address} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 2: THÔNG TIN CÔNG VIỆC */}
          {/* ========================================== */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <Briefcase className="text-cyan-500" size={20} /> Thông tin công việc
            </h3>
            <div className="bg-slate-50/30 p-6 rounded-xl border border-slate-100 space-y-6">
              <InputField label="Email Công ty (Bề mặt hiển thị)" name="work_email" type="email" value={formData.work_email} onChange={handleChange} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phòng ban</label>
                  <select name="department_id" value={formData.department_id || ''} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                    <option value="">-- Chọn phòng ban --</option>
                    {options.departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Chức vụ</label>
                  <select name="position_id" value={formData.position_id || ''} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                    <option value="">-- Chọn chức vụ --</option>
                    {filteredPositions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.position_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Loại hợp đồng</label>
                <select name="contract_type" value={formData.contract_type} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-cyan-600 focus:border-cyan-400 focus:outline-none">
                  <option value="probation">Thử việc</option>
                  <option value="fixed_1y">Xác định thời hạn (1 năm)</option>
                  <option value="fixed_3y">Xác định thời hạn (3 năm)</option>
                  <option value="indefinite">Không xác định thời hạn</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Ngày gia nhập" name="join_date" type="date" value={formData.join_date} onChange={handleChange} required />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Quản lý trực tiếp</label>
                  <select name="direct_manager_id" value={formData.direct_manager_id || ''} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                    <option value="">-- Chọn quản lý --</option>
                    {filteredManagers.map(mgr => (
                      <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 3: NGÂN HÀNG & TRẠNG THÁI */}
          {/* ========================================== */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <CreditCard className="text-cyan-500" size={20} /> Ngân hàng & Trạng thái làm việc
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 p-6 rounded-xl border border-slate-100">
              <InputField label="Số tài khoản ngân hàng" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} />
              <InputField label="Tên ngân hàng" name="bank_name" placeholder="VD: Vietcombank, Techcombank..." value={formData.bank_name} onChange={handleChange} />
              
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Trạng thái ban đầu</label>
                <select name="status" value={formData.status} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                  <option value="active">Đang làm việc</option>
                  <option value="on_leave">Nghỉ phép / Thai sản</option>
                  <option value="inactive">Đã nghỉ việc</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 👉 BLOCK 4: CHECKBOX GỬI EMAIL (Thiết kế giống ảnh 2) */}
          {/* ========================================== */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="send_email" 
              name="send_email"
              checked={formData.send_email} 
              onChange={handleChange}
              className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
            />
            <label htmlFor="send_email" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              Tự động gửi thông tin tài khoản qua Email của nhân viên
            </label>
          </div>

          {/* NÚT LƯU */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onBack} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shadow-emerald-200 disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Tạo mới & Cấp tài khoản
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

const InputField = ({ label, name, type = "text", value, onChange, placeholder, required }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
    <input 
      type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} required={required}
      className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
    />
  </div>
);
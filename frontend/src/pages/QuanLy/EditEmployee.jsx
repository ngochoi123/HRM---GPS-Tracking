import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, User, CreditCard, Briefcase } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';

export default function EditEmployee({ employee, onBack, onSaveSuccess }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State lưu dữ liệu thật cho Combobox
  const [options, setOptions] = useState({ departments: [], positions: [], managers: [] });
  // Ép kiểu String() để so sánh UUID chuẩn 100% không bị hụt data
  const filteredPositions = options.positions.filter(
    pos => String(pos.department_id) === String(formData.department_id)
  );

  // Lọc quản lý: Phải cùng phòng ban VÀ không được tự chọn chính mình
  const filteredManagers = options.managers.filter(
    mgr => String(mgr.department_id) === String(formData.department_id) && mgr.id !== employee.id
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Kéo dữ liệu các Combobox từ DB
        const optRes = await managerEmployeeService.getFormOptions();
        setOptions(optRes || { departments: [], positions: [], managers: [] });

        // 2. Kéo dữ liệu chi tiết của nhân viên
        const detailRes = await managerEmployeeService.getEmployeeById(employee.id);
        let data = detailRes;
        
        // Fix lỗi Warning: Ép các giá trị null thành chuỗi rỗng ''
        if (data.date_of_birth) data.date_of_birth = new Date(data.date_of_birth).toISOString().split('T')[0];
        if (data.join_date) data.join_date = new Date(data.join_date).toISOString().split('T')[0];
        data.department_id = data.department_id || '';
        data.position_id = data.position_id || '';
        data.direct_manager_id = data.direct_manager_id || '';
        data.gender = data.gender !== null ? data.gender : '';
        data.status = data.status || 'active';
        data.contract_type = data.contract_type || '';

        setFormData(data);
      } catch (error) {
        console.error("Lỗi kéo dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Nếu đổi phòng ban, tự động reset chức vụ về rỗng để chọn lại
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
      // Ép các giá trị rỗng về null trước khi gửi xuống DB để tránh lỗi UUID rỗng
      const payload = { ...formData };
      if (!payload.department_id) payload.department_id = null;
      if (!payload.position_id) payload.position_id = null;
      if (!payload.direct_manager_id) payload.direct_manager_id = null;

      await managerEmployeeService.updateEmployee(employee.id, payload);
      alert('Cập nhật hồ sơ thành công!');
      onSaveSuccess();
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      alert('Có lỗi xảy ra khi lưu!');
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-2xl font-bold text-slate-800">Chỉnh sửa hồ sơ</h1>
              <p className="text-sm text-slate-500">Cập nhật thông tin cho <span className="font-bold text-cyan-600">{formData.full_name}</span></p>
            </div>
          </div>
        </div>

        {/* FORM NHẬP LIỆU */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* BLOCK 1: THÔNG TIN CÁ NHÂN */}
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
                  <option value="">-- Chọn giới tính --</option>
                  <option value="true">Nam</option>
                  <option value="false">Nữ</option>
                </select>
              </div>

              <InputField label="Số điện thoại" name="phone_number" value={formData.phone_number} onChange={handleChange} />
              <InputField label="Email cá nhân" name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Địa chỉ cư trú" name="current_address" value={formData.current_address} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* BLOCK 2: THÔNG TIN CÔNG VIỆC */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <Briefcase className="text-cyan-500" size={20} /> Thông tin công việc
            </h3>
            <div className="bg-slate-50/30 p-6 rounded-xl border border-slate-100 space-y-6">
              <InputField label="Email Công ty" name="work_email" type="email" value={formData.work_email} onChange={handleChange} required />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COMBOBOX: PHÒNG BAN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phòng ban</label>
                  <select name="department_id" value={formData.department_id} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                    <option value="">-- Chọn phòng ban --</option>
                    {options.departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>

                {/* COMBOBOX: CHỨC VỤ (Lọc theo phòng ban) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Chức vụ</label>
                  <select name="position_id" value={formData.position_id} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
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
                  <option value="">-- Chọn hợp đồng --</option>
                  <option value="probation">Thử việc</option>
                  <option value="fixed_1y">Xác định thời hạn (1 năm)</option>
                  <option value="fixed_3y">Xác định thời hạn (3 năm)</option>
                  <option value="indefinite">Không xác định thời hạn</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Ngày gia nhập" name="join_date" type="date" value={formData.join_date} onChange={handleChange} />
                
                {/* COMBOBOX: QUẢN LÝ TRỰC TIẾP */}
                <div className="flex flex-col gap-1.5">
  <label className="text-sm font-semibold text-slate-700">Quản lý trực tiếp</label>
  <select name="direct_manager_id" value={formData.direct_manager_id || ''} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
    
    <option value="">-- Chọn quản lý --</option>
    
    {/* CHỈ DÙNG DANH SÁCH ĐÃ LỌC (filteredManagers) */}
    {filteredManagers.map(mgr => (
      <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
    ))}
    
  </select>
</div>
              </div>

            </div>
          </div>

          {/* BLOCK 3: TÀI KHOẢN NGÂN HÀNG & TRẠNG THÁI */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <CreditCard className="text-cyan-500" size={20} /> Ngân hàng & Trạng thái làm việc
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 p-6 rounded-xl border border-slate-100">
              <InputField label="Số tài khoản ngân hàng" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} />
              <InputField label="Tên ngân hàng" name="bank_name" placeholder="VD: Vietcombank, Techcombank..." value={formData.bank_name} onChange={handleChange} />
              
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Trạng thái làm việc</label>
                <select name="status" value={formData.status} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                  <option value="active">Đang làm việc</option>
                  <option value="on_leave">Nghỉ phép / Thai sản</option>
                  <option value="inactive">Đã nghỉ việc</option>
                </select>
              </div>
            </div>
          </div>

          {/* NÚT LƯU */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={onBack} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shadow-cyan-200 disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Lưu thay đổi
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
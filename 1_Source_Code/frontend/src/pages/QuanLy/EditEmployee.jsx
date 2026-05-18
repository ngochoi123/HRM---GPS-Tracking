import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, User, CreditCard, Briefcase, Camera, UploadCloud } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';

export default function EditEmployee({ employee, onBack, onSaveSuccess }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ departments: [], positions: [], managers: [] });
  const [user, setUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:5000/uploads/${url}`;
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  // Ép kiểu String() để so sánh UUID chuẩn 100% không bị hụt data
  const filteredPositions = options.positions.filter(
    pos => String(pos.department_id) === String(formData.department_id)
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
        data.gender = data.gender !== null ? data.gender : '';
        data.status = data.status || 'active';


        setFormData(data);
        if (data.avatar_url) {
          setAvatarPreview(getAvatarUrl(data.avatar_url));
        }
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

  const handleAvatarClick = () => {
    fileInputRef.current.click();
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
        const value = formData[key] === null ? '' : formData[key];
        formDataToSend.append(key, value);
      });

      // Append avatar file if exists
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      await managerEmployeeService.updateEmployee(employee.id, formDataToSend);
      alert('Cập nhật hồ sơ thành công!');
      onSaveSuccess();
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu!');
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
          
          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center gap-4 mb-8 pb-8 border-b border-slate-100">
            <div 
              className="relative group cursor-pointer"
              onClick={handleAvatarClick}
            >
              <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={24} className="text-white" />
              </div>
            </div>
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
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <UploadCloud size={16} className="text-cyan-500" />
              Thay đổi ảnh đại diện
            </button>
          </div>
          
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
                <InputField label="Địa chỉ cư trú" name="address" value={formData.address} onChange={handleChange} />
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
                  <select 
                    name="department_id" 
                    value={formData.department_id} 
                    onChange={handleChange} 
                    disabled={user?.role === 'MANAGER'}
                    className={`px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none ${user?.role === 'MANAGER' ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`}
                  >
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


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Ngày gia nhập" name="join_date" type="date" value={formData.join_date} onChange={handleChange} />
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
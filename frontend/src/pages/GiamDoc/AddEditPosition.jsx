import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, Loader2, Award } from 'lucide-react';

export default function AddEditPosition({ position, onBack, onSaveSuccess }) {
  const isEdit = !!position;
  const [formData, setFormData] = useState({
    position_code: '',
    position_name: '',
    department_id: '',
    level: 'fresher',
    base_salary_min: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Kéo danh sách phòng ban từ API có sẵn
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/giamdoc/form-options`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDepartments(res.data.departments);
      } catch (error) {
        console.error("Lỗi kéo phòng ban:", error);
      }
    };
    fetchDepartments();

    // Nếu là Edit thì nạp data cũ
    if (isEdit) {
      setFormData({
        position_code: position.code || '',
        position_name: position.name || '',
        // Tìm ID phòng ban dựa vào tên (Vì API getPositions trả về tên, lý tưởng nhất là API getPositions trả về cả department_id)
        department_id: position.department_id || '', 
        level: position.level || 'fresher',
        base_salary_min: position.baseSalaryMin || ''
      });
    }
  }, [position, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.department_id) payload.department_id = null;

      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      
      if (isEdit) {
        await axios.put(`http://localhost:5000/api/giamdoc/positions/${position.id}`, payload, { headers });
        alert('Cập nhật chức vụ thành công!');
      } else {
        await axios.post(`http://localhost:5000/api/giamdoc/positions`, payload, { headers });
        alert('Thêm chức vụ mới thành công!');
      }
      onSaveSuccess();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Chỉnh sửa chức vụ' : 'Thêm chức vụ mới'}</h1>
              <p className="text-sm text-slate-500">{isEdit ? `Đang cập nhật mã ${position.code}` : 'Điền thông tin để tạo chức danh mới'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Mã chức vụ <span className="text-red-500">*</span></label>
              <input type="text" name="position_code" value={formData.position_code} onChange={handleChange} required placeholder="VD: POS-01"
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Tên chức vụ <span className="text-red-500">*</span></label>
              <input type="text" name="position_name" value={formData.position_name} onChange={handleChange} required placeholder="VD: Lập trình viên Backend..."
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Thuộc phòng ban</label>
              <select name="department_id" value={formData.department_id} onChange={handleChange}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Cấp bậc (Level) <span className="text-red-500">*</span></label>
              <select name="level" value={formData.level} onChange={handleChange} required
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                {/* Lấy đúng ENUM trong database */}
                <option value="intern">Intern / Thực tập sinh</option>
                <option value="fresher">Fresher / Nhân viên mới</option>
                <option value="junior">Junior / Chuyên viên</option>
                <option value="middle">Middle / Chuyên viên chính</option>
                <option value="senior">Senior / Chuyên viên cao cấp</option>
                <option value="manager">Manager / Quản lý</option>
                <option value="director">Director / Giám đốc</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Lương cơ bản tối thiểu (VNĐ)</label>
              <input type="number" name="base_salary_min" value={formData.base_salary_min} onChange={handleChange} placeholder="VD: 15000000"
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none" />
            </div>

          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
            <button type="button" onClick={onBack} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Hủy bỏ</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo chức vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
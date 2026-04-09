import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, User, Briefcase, Link as LinkIcon, Lock, Plus, Trash2, FileText } from 'lucide-react';
import { directorContractService } from '../../services/directorContractService';

export default function AddEditContract({ contract, onBack, onSaveSuccess }) {
  const isEdit = !!contract;
  
  const [formData, setFormData] = useState({
    employee_id: '',
    position_id: '',
    contract_type: 'probation',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    base_salary_min: 0
  });

  const [allowances, setAllowances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [saving, setSaving] = useState(false);

  // States cho UI Checkbox (Giao diện)
  const [genPdf, setGenPdf] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await directorContractService.getContractFormOptions();
        setEmployees(res?.employees || []);
        setPositions(res?.positions || []);
      } catch (error) {
        console.error("Lỗi kéo dữ liệu:", error);
      }
    };
    fetchOptions();

    if (isEdit) {
      setFormData({
        employee_id: contract.employee_id || '',
        position_id: '', 
        contract_type: contract.typeCode || 'probation',
        start_date: contract.startDate ? contract.startDate.split('T')[0] : '',
        end_date: contract.endDate ? contract.endDate.split('T')[0] : '',
        // 👉 FIX: Đảm bảo đọc đúng cột lương từ backend trả về
        base_salary_min: contract.baseSalary || contract.basicSalary || 0
      });
      
      if (contract.allowances && Array.isArray(contract.allowances)) {
        setAllowances(contract.allowances);
      }
    } else {
      // Tự động tính ngày kết thúc cho chế độ "Thêm mới" ngay khi vừa load form
      calculateAndSetEndDate('probation', new Date().toISOString().split('T')[0]);
    }
  }, [contract, isEdit]);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const selectedEmp = employees.find(emp => emp.id === empId);
    const empPosId = selectedEmp ? selectedEmp.position_id : '';
    const selectedPos = positions.find(p => p.id === empPosId);
    
    setFormData({ 
      ...formData, 
      employee_id: empId,
      position_id: empPosId,
      base_salary_min: selectedPos ? selectedPos.base_salary_min : 0
    });
  };

  const handlePositionChange = (e) => {
    const posId = e.target.value;
    const selectedPos = positions.find(p => p.id === parseInt(posId));
    setFormData({
      ...formData,
      position_id: posId,
      base_salary_min: selectedPos ? selectedPos.base_salary_min : formData.base_salary_min
    });
  };

  // 👉 HÀM TÍNH TOÁN NGÀY KẾT THÚC CHUẨN HR
  const calculateAndSetEndDate = (type, sDate) => {
    let newEndDate = '';
    
    if (sDate && type !== 'indefinite') {
      const d = new Date(sDate);
      if (type === 'probation') d.setMonth(d.getMonth() + 2); // Thử việc 2 tháng
      else if (type === 'fixed_1y') d.setFullYear(d.getFullYear() + 1); // 1 năm
      else if (type === 'fixed_3y') d.setFullYear(d.getFullYear() + 3); // 3 năm
      
      // Trừ đi 1 ngày (Ví dụ: 01/01/2026 -> 31/12/2026)
      d.setDate(d.getDate() - 1);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      newEndDate = `${year}-${month}-${day}`;
    }

    setFormData(prev => ({ ...prev, contract_type: type, start_date: sDate, end_date: newEndDate }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Nếu đổi Loại hợp đồng hoặc Ngày bắt đầu -> Gọi hàm tính ngày tự động
    if (name === 'contract_type') {
      calculateAndSetEndDate(value, formData.start_date);
    } else if (name === 'start_date') {
      calculateAndSetEndDate(formData.contract_type, value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddAllowance = () => { setAllowances([...allowances, { name: '', amount: 0 }]); };
  const handleRemoveAllowance = (index) => { setAllowances(allowances.filter((_, i) => i !== index)); };
  const handleAllowanceChange = (index, field, value) => {
    const newAllowances = [...allowances];
    newAllowances[index][field] = field === 'amount' ? Number(value) : value;
    setAllowances(newAllowances);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 👉 FIX: Đổi tên base_salary_min thành basic_salary để khớp với Backend
      const payload = { 
        ...formData, 
        basic_salary: formData.base_salary_min, 
        allowances 
      };

      if (isEdit) {
        await directorContractService.updateContract(contract.id, payload);
        alert('Cập nhật hợp đồng thành công!');
      } else {
        await directorContractService.createContract(payload);
        alert('Tạo hợp đồng mới thành công!');
      }
      onSaveSuccess();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu hợp đồng!');
    } finally {
      setSaving(false);
    }
  };

  // Tìm tên nhân viên để hiển thị khi ở chế độ Edit (Bị khóa)
  const currentEmpName = isEdit ? (contract.employeeName + (contract.positionName ? ` - ${contract.positionName}` : '')) : '';

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">
      <div className="max-w-5xl mx-auto pt-6 px-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Chỉnh sửa hợp đồng lao động' : 'Tạo hợp đồng lao động'}</h1>
              <p className="text-xs text-slate-500">{isEdit ? 'Cập nhật thông tin chi tiết và các điều khoản của hợp đồng hiện tại.' : 'Điền các thông tin chi tiết để thiết lập hợp đồng mới cho nhân viên.'}</p>
            </div>
          </div>
          <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Hủy & Quay lại
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ========================================== */}
          {/* BLOCK 1: THÔNG TIN ĐỐI TƯỢNG */}
          {/* ========================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-cyan-600 mb-5">
              <User size={18} /> Thông tin đối tượng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Người lao động (Nhân viên) <span className="text-red-500">*</span></label>
                {isEdit ? (
                  <div className="relative">
                    <input type="text" value={currentEmpName} disabled className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                ) : (
                  <select name="employee_id" value={formData.employee_id} onChange={handleEmployeeChange} required className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                    <option value="">-- Chọn nhân viên từ danh sách chưa có hợp đồng --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.employee_code} - {emp.full_name}</option>
                    ))}
                  </select>
                )}
                {isEdit && <span className="text-xs text-slate-400">Không thể thay đổi nhân sự cho hợp đồng đã tồn tại.</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Số/Mã hợp đồng</label>
                <div className="relative">
                  <input type="text" value={isEdit ? contract.contractNumber : 'HD-Tự động sinh...'} disabled className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium cursor-not-allowed" />
                </div>
                {!isEdit && <span className="text-xs text-slate-400">Sinh mã tự động sau khi lưu.</span>}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 2: ĐỊNH BIÊN NHÂN SỰ & THỜI HẠN */}
          {/* ========================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-cyan-600 mb-5">
              <Briefcase size={18} /> Định biên nhân sự & Thời hạn
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Chức vụ đảm nhận <span className="text-red-500">*</span></label>
                <select name="position_id" value={formData.position_id} onChange={handlePositionChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                  <option value="">{isEdit ? '-- Giữ nguyên chức vụ hiện tại --' : '-- Chọn chức vụ --'}</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.position_name}</option>
                  ))}
                </select>
                <span className="text-xs text-cyan-600 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 bg-cyan-600 rounded-full"></span> Quyết định hệ số lương
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Loại hợp đồng <span className="text-red-500">*</span></label>
                <select name="contract_type" value={formData.contract_type} onChange={handleChange} required className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none">
                  <option value="probation">Thử việc</option>
                  <option value="fixed_1y">Xác định TH (1 năm)</option>
                  <option value="fixed_3y">Xác định TH (3 năm)</option>
                  <option value="indefinite">Không xác định thời hạn</option>
                </select>
              </div>
              <div className="hidden md:block"></div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Ngày bắt đầu <span className="text-red-500">*</span></label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none text-slate-700" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Ngày kết thúc</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none text-slate-700" />
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 3: CHẾ ĐỘ LƯƠNG & PHỤ CẤP */}
          {/* ========================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
            
            <h3 className="flex items-center gap-2 text-base font-bold text-emerald-600 mb-5 relative z-10">
              <LinkIcon size={18} /> Chế độ lương & Phụ cấp
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Mức lương cơ bản (Theo ngạch bậc) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₫</span>
                  <input type="number" name="base_salary_min" value={formData.base_salary_min} onChange={handleChange} required 
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition-all" />
                </div>
                <span className="text-xs text-slate-400">* Hệ thống tự động áp dụng khung lương chuẩn của công ty dựa trên Cấp bậc đã chọn phía trên (Bạn có thể điều chỉnh).</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Hình thức trả lương</label>
                <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-emerald-400 focus:outline-none">
                  <option>Chuyển khoản qua ngân hàng</option>
                  <option>Tiền mặt</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-4">
                <label className="text-sm font-bold text-slate-700 block mb-3">Các khoản phụ cấp cố định (Hàng tháng)</label>
                <div className="space-y-3 mb-4">
                  {allowances.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <input 
                        type="text" placeholder="Phụ cấp ăn trưa, điện thoại..." value={item.name} 
                        onChange={(e) => handleAllowanceChange(index, 'name', e.target.value)} required
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:outline-none"
                      />
                      <div className="relative w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₫</span>
                        <input 
                          type="number" placeholder="Số tiền" value={item.amount} 
                          onChange={(e) => handleAllowanceChange(index, 'amount', e.target.value)} required
                          className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveAllowance(index)} className="w-10 h-10 flex justify-center items-center rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddAllowance} className="text-sm font-bold text-cyan-500 hover:text-cyan-600 flex items-center gap-1 transition-colors">
                  <Plus size={16} /> Thêm phụ cấp
                </button>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BLOCK 4: CHECKBOXES (GIAO DIỆN) */}
          {/* ========================================== */}
          <div className="bg-cyan-50/50 rounded-xl border border-cyan-100 p-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={genPdf} onChange={(e) => setGenPdf(e.target.checked)} className="w-5 h-5 rounded border-cyan-300 text-cyan-500 focus:ring-cyan-500" />
              <span className="text-sm font-medium text-slate-700 select-none">
                {isEdit ? 'Cập nhật và sinh lại file Hợp đồng điện tử (PDF) theo dữ liệu mới' : 'Tự động sinh file Hợp đồng điện tử (PDF) theo mẫu quy định'}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-5 h-5 rounded border-cyan-300 text-cyan-500 focus:ring-cyan-500" />
              <span className="text-sm font-medium text-slate-700 select-none">Gửi thông báo cập nhật qua Email để nhân viên xem và ký xác nhận</span>
            </label>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onBack} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-bold hover:bg-cyan-600 disabled:opacity-70 shadow-sm shadow-cyan-200 transition-all">
              {saving && <Loader2 className="animate-spin" size={16} />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo hợp đồng ngay'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
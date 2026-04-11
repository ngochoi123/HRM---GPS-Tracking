import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, FileText, CheckCircle2, Loader2, Medal, AlertCircle, UploadCloud, Bell, Save, SquarePen, Check } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';
import { managerDecisionService } from '../../services/managerDecisionService';

export default function DecisionForm({ onCancel, onSuccess, editDecisionId }) {
  const isEdit = Boolean(editDecisionId);
  const [employees, setEmployees] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    decision_type: 'reward', 
    form: 'money', 
    amount: '',
    issue_date: '',
    reason: ''
  });

  const [notifications, setNotifications] = useState({
    push: true,
    email: true
  });
  const [decisionNumber, setDecisionNumber] = useState('');

  const isReward = formData.decision_type === 'reward';

  // Lấy danh sách nhân viên an toàn hơn (Cover nhiều cấu trúc API)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const empData = await managerEmployeeService.getEmployees();
        if (Array.isArray(empData)) {
          setEmployees(empData);
        } else {
          console.error("Dữ liệu trả về không phải là mảng:", empData);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách nhân viên:", error);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!editDecisionId) return;
    const load = async () => {
      try {
        const res = await managerDecisionService.getDecisionById(editDecisionId);
        if (res?.success && res?.data) {
          const d = res.data;
          setFormData({
            employee_id: d.employee_id,
            decision_type: d.decision_type,
            form: d.form,
            amount: d.amount != null && Number(d.amount) > 0 ? String(d.amount) : '',
            issue_date: d.issue_date ? String(d.issue_date).slice(0, 10) : '',
            reason: d.reason || '',
          });
          setDecisionNumber(d.decision_number || '');
          setNotifications({
            push: !!d.notify_push_sent,
            email: !!d.notify_email_sent,
          });
        }
      } catch (err) {
        console.error(err);
        alert('Không tải được quyết định để chỉnh sửa.');
        onCancel();
      }
    };
    load();
  }, [editDecisionId]);

  const handleSubmitDecision = async (status = 'published') => {
    if (!formData.employee_id || !formData.issue_date || !formData.reason) {
      alert('Vui lòng điền các trường bắt buộc (*)');
      return;
    }

    setSubmitLoading(true);
    try {
      if (isEdit) {
        const submitData = new FormData();
        submitData.append('decision_type', formData.decision_type);
        submitData.append('form', formData.form);
        submitData.append('amount', formData.amount ? Number(formData.amount) : 0);
        submitData.append('issue_date', formData.issue_date);
        submitData.append('reason', formData.reason);
        if (attachment) submitData.append('attachment', attachment);

        const res = await managerDecisionService.updateDecision(editDecisionId, submitData);
        if (res?.success) {
          alert('Đã cập nhật quyết định thành công!');
          onSuccess();
        }
        return;
      }

      const submitData = new FormData();
      submitData.append('employee_id', formData.employee_id);
      submitData.append('decision_type', formData.decision_type);
      submitData.append('form', formData.form);
      submitData.append('amount', formData.amount ? Number(formData.amount) : 0);
      submitData.append('issue_date', formData.issue_date);
      submitData.append('reason', formData.reason);
      submitData.append('status', status);
      submitData.append('notify_push', notifications.push);
      submitData.append('notify_email', notifications.email);

      if (attachment) {
        submitData.append('attachment', attachment);
      }

      const res = await managerDecisionService.createDecision(submitData);
      if (res?.success || res) {
        alert(status === 'draft' ? 'Đã lưu bản nháp!' : 'Ban hành quyết định thành công!');
        onSuccess();
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitLoading(false);
    }
  };
  return (
    <div className="p-8">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isEdit ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-500'}`}
            >
              {isEdit ? <SquarePen size={24} /> : <FileText size={24} />}
            </div>
            {isEdit ? 'Chỉnh sửa Quyết định Khen thưởng / Kỷ luật' : 'Tạo Quyết định Khen thưởng / Kỷ luật'}
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12">
            {isEdit
              ? 'Cập nhật nội dung quyết định đã ban hành.'
              : 'Biểu mẫu thiết lập các quyết định hành chính áp dụng cho nhân sự.'}
          </p>
        </div>
        <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium transition-colors">
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      {/* --- KHỐI 1: ĐỐI TƯỢNG & PHÂN LOẠI --- */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2"><Users size={18} className="text-[#00b4d8]" /> Đối tượng và Phân loại</h2>
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Người lao động (Nhân viên) <span className="text-rose-500">*</span></label>
            <select
              disabled={isEdit}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none transition-all disabled:cursor-not-allowed disabled:opacity-70"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            >
              <option value="">-- Chọn nhân viên từ danh sách --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.code && emp.code !== 'Chưa cập nhật' ? `(${emp.code})` : ''}
                </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Số Quyết định</label>
            <input
              type="text"
              disabled
              value={isEdit ? decisionNumber : ''}
              placeholder="Hệ thống tự động cấp (VD: QĐ-26-045)"
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <label className="block text-sm font-semibold text-slate-700 mb-2">Phân loại quyết định <span className="text-rose-500">*</span></label>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setFormData({...formData, decision_type: 'reward'})}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${isReward ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 text-slate-500'}`}>
            <Medal size={24} className={isReward ? 'text-emerald-500' : 'text-slate-400'} />
            <span className="font-bold">Khen thưởng</span>
          </button>
          <button type="button" onClick={() => setFormData({...formData, decision_type: 'discipline'})}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${!isReward ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 hover:border-rose-200 text-slate-500'}`}>
            <AlertCircle size={24} className={!isReward ? 'text-rose-500' : 'text-slate-400'} />
            <span className="font-bold">Kỷ luật</span>
          </button>
        </div>
      </div>

      {/* --- KHỐI 2: CHI TIẾT THỰC THI --- */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2"><FileText size={18} className="text-[#00b4d8]" /> Chi tiết thực thi</h2>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Hình thức <span className="text-rose-500">*</span></label>
            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none"
              value={formData.form} onChange={(e) => setFormData({...formData, form: e.target.value})}>
              {isReward ? (
                <><option value="money">Thưởng tiền mặt</option><option value="gift">Tặng hiện vật/Quà</option><option value="certificate">Tặng Bằng khen</option></>
              ) : (
                <><option value="money">Phạt tiền mặt</option><option value="warning">Cảnh cáo</option><option value="fire">Sa thải</option></>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Số tiền {isReward ? 'thưởng' : 'phạt'} (VNĐ)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
              <input type="number" placeholder="Ví dụ: 2000000" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none"
                value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} disabled={formData.form === 'warning' || formData.form === 'certificate'} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ngày hiệu lực <span className="text-rose-500">*</span></label>
            <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none"
              value={formData.issue_date} onChange={(e) => setFormData({...formData, issue_date: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do chi tiết <span className="text-rose-500">*</span></label>
          <textarea rows="3" placeholder="Ghi rõ hành vi, thành tích hoặc lý do ban hành quyết định này..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00b4d8] outline-none"
            value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>
        </div>
      </div>

      {/* --- KHỐI 3: FILE ĐÍNH KÈM & THÔNG BÁO --- */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        
        {/* Box Upload File */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><UploadCloud size={18} className="text-[#00b4d8]" /> Tài liệu đính kèm</h2>
          
          {/* Label bọc Input File ẩn */}
          <label className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 hover:bg-slate-50 cursor-pointer transition-colors group">
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf, image/png, image/jpeg" 
              onChange={(e) => setAttachment(e.target.files[0])} 
            />
            
            {attachment ? (
              <div className="text-[#00b4d8] font-semibold">
                <p>Đã chọn file: {attachment.name}</p>
                <p className="text-xs text-slate-500 mt-1 font-normal">(Nhấn vào để đổi file khác)</p>
              </div>
            ) : (
              <>
                <UploadCloud size={32} className="text-[#00b4d8] mb-3 group-hover:-translate-y-1 transition-transform" />
                <p className="text-sm font-semibold text-[#00b4d8]">Tải file lên <span className="text-slate-500 font-normal">hoặc chạm vào đây</span></p>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ định dạng (PDF), Hình ảnh (JPG/PNG). Tối đa 10MB.</p>
              </>
            )}
          </label>
        </div>

        {/* Box Cấu hình thông báo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2"><Bell size={18} className="text-[#00b4d8]" /> Cấu hình thông báo</h2>
          <div className="flex flex-col gap-5">
            <label className={`flex items-start gap-3 group ${isEdit ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={isEdit}
                className="mt-1 w-4 h-4 text-[#00b4d8] rounded border-slate-300 focus:ring-[#00b4d8] disabled:cursor-not-allowed"
                checked={notifications.push}
                onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
              />
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-[#00b4d8] transition-colors">Gửi thông báo Push đến nhân viên</p>
                <p className="text-xs text-slate-500 mt-0.5">Nhân viên sẽ nhận được thông báo ngay lập tức trên hệ thống.</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 group ${isEdit ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={isEdit}
                className="mt-1 w-4 h-4 text-[#00b4d8] rounded border-slate-300 focus:ring-[#00b4d8] disabled:cursor-not-allowed"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
              />
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-[#00b4d8] transition-colors">Gửi Email kèm file Quyết định (PDF)</p>
                <p className="text-xs text-slate-500 mt-0.5">Hệ thống sẽ tự động xuất PDF và gửi vào email cá nhân.</p>
              </div>
            </label>
          </div>
        </div>

      </div>

      {/* --- BUTTONS --- */}
      <div className="flex justify-end gap-3 mt-4 border-t border-slate-200 pt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Hủy bỏ
        </button>
        {isEdit ? (
          <button
            disabled={submitLoading}
            onClick={() => handleSubmitDecision()}
            className="px-6 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 flex items-center gap-2 transition-colors shadow-sm"
          >
            {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            Cập nhật
          </button>
        ) : (
          <>
            <button
              disabled={submitLoading}
              onClick={() => handleSubmitDecision('draft')}
              className="px-6 py-2.5 bg-[#1e293b] text-white font-semibold rounded-xl hover:bg-slate-800 flex items-center gap-2 transition-colors"
            >
              <Save size={18} /> Lưu nháp
            </button>
            <button
              disabled={submitLoading}
              onClick={() => handleSubmitDecision('published')}
              className="px-6 py-2.5 bg-[#00b4d8] text-white font-semibold rounded-xl hover:bg-[#0096b4] flex items-center gap-2 transition-colors shadow-sm shadow-[#00b4d8]/30"
            >
              {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Ban hành quyết định
            </button>
          </>
        )}
      </div>

    </div>
  );
}
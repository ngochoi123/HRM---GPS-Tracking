import React, { useState, useEffect } from 'react';
import { 
  MapPin, Building2, Users, User, Calendar, 
  AlertCircle, Loader2, CheckCircle2, ArrowRight, Clock
} from 'lucide-react';
import { adminLocationService } from '../../services/adminLocationService';

export default function AdminDashboard() {
  // --- STATE DỮ LIỆU TỪ API ---
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);

  // --- STATE FORM QUẢN LÝ ---
  const [assignType, setAssignType] = useState('branch'); 
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [workLocationId, setWorkLocationId] = useState('');
  
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isTemporary, setIsTemporary] = useState(false);
  const [endDate, setEndDate] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- 1. LẤY DANH SÁCH BRANCHES KHI MOUNT ---
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await adminLocationService.getBranches();
        const payload = res.success !== undefined ? res : res.data; // Xử lý nếu Axios đã unwrap
        if (payload?.success) setBranches(payload.data);
      } catch (error) {
        console.error("Lỗi lấy danh sách chi nhánh:", error);
      }
    };
    fetchBranches();
  }, []);

  // --- 2. LẤY PHÒNG BAN & ĐỊA ĐIỂM KHI CHỌN CHI NHÁNH ---
  useEffect(() => {
    if (!selectedBranch) return;
    const fetchBranchDependentData = async () => {
      setIsFetching(true);
      try {
        const [deptRes, locRes] = await Promise.all([
          adminLocationService.getDepartmentsByBranch(selectedBranch),
          adminLocationService.getWorkLocationsByBranch(selectedBranch)
        ]);
        
        const deptPayload = deptRes.success !== undefined ? deptRes : deptRes.data;
        const locPayload = locRes.success !== undefined ? locRes : locRes.data;

        if (deptPayload?.success) setDepartments(deptPayload.data);
        if (locPayload?.success) setWorkLocations(locPayload.data);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu chi nhánh:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchBranchDependentData();
  }, [selectedBranch]);

  // --- 3. LẤY NHÂN VIÊN KHI CHỌN PHÒNG BAN ---
  useEffect(() => {
    if (!selectedDepartment || assignType !== 'employee') return;
    const fetchEmployees = async () => {
      setIsFetching(true);
      try {
        const res = await adminLocationService.getEmployeesByDepartment(selectedDepartment);
        const payload = res.success !== undefined ? res : res.data;
        if (payload?.success) setEmployees(payload.data);
      } catch (error) {
        console.error("Lỗi lấy danh sách nhân viên:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchEmployees();
  }, [selectedDepartment, assignType]);

  // --- XỬ LÝ SỰ KIỆN ---
  const handleAssignTypeChange = (type) => {
    setAssignType(type);
    setSelectedDepartment('');
    setSelectedEmployee('');
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    setSelectedDepartment('');
    setSelectedEmployee('');
    setWorkLocationId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let targetId = '';
    if (assignType === 'branch') targetId = selectedBranch;
    if (assignType === 'department') targetId = selectedDepartment;
    if (assignType === 'employee') targetId = selectedEmployee;

    if (isTemporary && endDate && endDate < assignedDate) {
      alert("Ngày kết thúc không thể trước ngày bắt đầu!");
      return;
    }

    if (!targetId || !workLocationId) {
      alert("Vui lòng chọn đầy đủ đối tượng và địa điểm áp dụng!");
      return;
    }

    const payloadParams = {
      assign_type: assignType,
      target_id: targetId,
      work_location_id: Number(workLocationId),
      assigned_date: assignedDate,
      is_temporary: isTemporary,
      end_date: isTemporary ? endDate : null 
    };

    setIsLoading(true);
    try {
      const res = await adminLocationService.createLocationAssignment(payloadParams);
      const payload = res.success !== undefined ? res : res.data;
      
      if (payload?.success) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        setSelectedDepartment('');
        setSelectedEmployee('');
        setWorkLocationId('');
      } else {
        alert("Lỗi: " + (payload?.message || 'Không thể phân công'));
      }
    } catch (error) {
      console.error("Lỗi API submit:", error);
      alert("Lỗi máy chủ khi thực hiện lưu dữ liệu!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-5 font-sans">
      <div className="bg-white w-full rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden animate-[fadeIn_0.4s_ease-out]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              Phân công địa điểm chấm công
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium ml-13">Thiết lập vùng chấm công bằng GPS cho Chi nhánh, Phòng ban hoặc Cá nhân.</p>
          </div>
        </div>

        {/* Thông báo thành công */}
        {isSuccess && (
          <div className="mx-8 mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-lg flex items-center gap-3 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-sm">Phân công thành công! Dữ liệu đã được cập nhật.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* PHẦN 1: PHẠM VI ÁP DỤNG */}
          <div className="space-y-4">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></div>
              1. Phạm vi áp dụng
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'branch', label: 'Toàn Chi nhánh', icon: Building2 },
                { id: 'department', label: 'Theo Phòng ban', icon: Users },
                { id: 'employee', label: 'Theo Cá nhân', icon: User },
              ].map((item) => (
                <label key={item.id} className={`
                  relative flex flex-col items-center justify-center p-6 border rounded-xl cursor-pointer transition-all duration-200
                  ${assignType === item.id ? 'border-[#4f46e5] bg-[#4f46e5]/5 shadow-sm ring-1 ring-[#4f46e5]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                `}>
                  <input 
                    type="radio" name="assignType" value={item.id} 
                    checked={assignType === item.id} 
                    onChange={() => handleAssignTypeChange(item.id)}
                    className="sr-only"
                  />
                  <item.icon className={`w-6 h-6 mb-3 ${assignType === item.id ? 'text-[#4f46e5]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${assignType === item.id ? 'text-[#4f46e5]' : 'text-gray-600'}`}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* PHẦN 2: CHỌN ĐỐI TƯỢNG */}
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-center mb-2">
               <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></div>
                 2. Đối tượng áp dụng
               </label>
               {isFetching && <Loader2 className="w-4 h-4 animate-spin text-[#4f46e5]" />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chi nhánh / Trụ sở gốc <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <select 
                    value={selectedBranch} 
                    onChange={handleBranchChange}
                    required
                    className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all cursor-pointer shadow-sm font-medium pr-10"
                  >
                    <option value="" disabled>-- Chọn chi nhánh --</option>
                    {branches.map(br => (
                      <option key={br.id} value={br.id}>{br.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(assignType === 'department' || assignType === 'employee') && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phòng ban trực thuộc <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select 
                      value={selectedDepartment} onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setSelectedEmployee('');
                      }}
                      required disabled={!selectedBranch || isFetching}
                      className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:bg-gray-100 transition-all font-medium appearance-none shadow-sm"
                    >
                      <option value="" disabled>-- Chọn phòng ban --</option>
                      {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                    <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {assignType === 'employee' && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn Nhân viên <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select 
                      value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                      required disabled={!selectedDepartment || isFetching}
                      className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:bg-gray-100 transition-all font-medium appearance-none shadow-sm"
                    >
                      <option value="" disabled>{selectedDepartment ? '-- Danh sách nhân sự --' : '-- Chọn phòng ban trước --'}</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {selectedDepartment && employees.length === 0 && !isFetching && (
                    <p className="text-[12px] text-rose-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Không có nhân sự nào trong phòng ban này.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PHẦN 3: ĐỊA ĐIỂM & THỜI GIAN */}
          <div className="space-y-4">
            <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></div>
                3. Thiết lập địa điểm & thời gian
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#4f46e5]" />
                  Địa điểm chấm công áp dụng <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={workLocationId} onChange={(e) => setWorkLocationId(e.target.value)}
                  required disabled={!selectedBranch || isFetching}
                  className="w-full bg-white border border-gray-300 text-[#4f46e5] font-bold text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:bg-gray-50 transition-all shadow-sm"
                >
                  <option value="" disabled>-- Chọn khu vực GPS hợp lệ --</option>
                  {workLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Ngày bắt đầu áp dụng
                </label>
                <input 
                  type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all shadow-sm font-medium"
                />
              </div>

              <div className="lg:col-span-3 flex items-center pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" className="peer sr-only" 
                      checked={isTemporary} onChange={(e) => setIsTemporary(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#4f46e5] peer-checked:border-[#4f46e5] transition-all flex items-center justify-center bg-white shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-[#4f46e5] transition-colors">Phân công tạm thời (Có ngày kết thúc)</span>
                  </div>
                </label>
              </div>

              {isTemporary && (
                <div className="lg:col-span-3 p-5 bg-blue-50/50 rounded-xl border border-blue-100 animate-[fadeIn_0.3s_ease-out] flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-semibold text-[#4f46e5] mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Ngày kết thúc (End Date) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full bg-white border border-blue-200 text-[#4f46e5] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all shadow-sm font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[#4f46e5] bg-white p-3 rounded-lg border border-blue-100 shrink-0 shadow-sm">
                    <div className="text-center px-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Bắt đầu</p>
                      <p className="text-sm font-bold">{assignedDate || '---'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <div className="text-center px-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Kết thúc</p>
                      <p className="text-sm font-bold text-rose-500">{endDate || 'Chưa chọn'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button" 
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm"
              onClick={() => {
                 setAssignType('branch');
                 setSelectedBranch('');
                 setWorkLocationId('');
              }}
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={isLoading || isFetching}
              className="px-8 py-2.5 rounded-lg bg-[#4f46e5] text-white font-semibold hover:bg-[#4338ca] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Lưu phân công
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
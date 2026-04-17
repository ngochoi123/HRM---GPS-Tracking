import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Calendar, AlertCircle, UserPlus, TrendingUp, 
  Layers, AlertOctagon, Loader2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import contractService from '../../../services/contractService';
import { toast } from 'react-hot-toast';

export default function ContractStatistics() {
  const [targetDate, setTargetDate] = useState(new Date());
  const [overview, setOverview] = useState({
    totalActive: 0,
    expiringSoon: 0,
    probationCount: 0,
    renewalRate: 0
  });
  const [breakdown, setBreakdown] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [renewFormData, setRenewFormData] = useState({
    contract_number: '',
    contract_type: '',
    start_date: '',
    end_date: '',
    base_salary: 0,
    lunch_allowance: 0,
    travel_allowance: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();
    try {
      const [ov, br, ex] = await Promise.all([
        contractService.getOverview(month, year),
        contractService.getBreakdown(month, year),
        contractService.getExpiring(month, year)
      ]);
      setOverview(ov);
      setBreakdown(br);
      setExpiringContracts(ex);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu hợp đồng:', error);
      toast.error('Không thể tải dữ liệu thống kê hợp đồng');
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeMonth = (offset) => {
    setTargetDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + offset);
      return newDate;
    });
  };

  const openRenewModal = (contract) => {
    setSelectedContract(contract);
    
    // Parse current date to estimate new start date (day after end_date)
    const [d, m, y] = contract.end_date.split('/');
    const oldEndDate = new Date(y, m - 1, d);
    const newStartDate = new Date(oldEndDate);
    newStartDate.setDate(oldEndDate.getDate() + 1);
    
    const yearStr = new Date().getFullYear();
    const autoNumber = `HD-${contract.employee_code}-${yearStr}`;

    setRenewFormData({
      contract_number: autoNumber,
      contract_type: contract.contract_type || 'fixed_1y',
      start_date: newStartDate.toISOString().split('T')[0],
      end_date: '',
      base_salary: contract.base_salary || 0,
      lunch_allowance: contract.allowances?.lunch || 0,
      travel_allowance: contract.allowances?.travel || 0
    });
    setIsRenewModalOpen(true);
  };

  const calculateEndDate = useCallback((type, start) => {
    if (!start || type === 'indefinite') return '';
    
    const startDate = new Date(start);
    const endDate = new Date(startDate);

    if (type === 'fixed_1y') {
      endDate.setFullYear(startDate.getFullYear() + 1);
      endDate.setDate(startDate.getDate() - 1);
    } else if (type === 'fixed_3y') {
      endDate.setFullYear(startDate.getFullYear() + 3);
      endDate.setDate(startDate.getDate() - 1);
    } else if (type === 'probation') {
      endDate.setMonth(startDate.getMonth() + 2); // Giả định thử việc 2 tháng
      endDate.setDate(startDate.getDate() - 1);
    }

    return endDate.toISOString().split('T')[0];
  }, []);

  // Sync end_date when type or start_date changes
  useEffect(() => {
    if (isRenewModalOpen) {
      const newEnd = calculateEndDate(renewFormData.contract_type, renewFormData.start_date);
      setRenewFormData(prev => ({ ...prev, end_date: newEnd }));
    }
  }, [renewFormData.contract_type, renewFormData.start_date, isRenewModalOpen, calculateEndDate]);

  const handleBulkRenew = async () => {
    if (expiringContracts.length === 0) {
      toast.error('Không có hợp đồng nào để gia hạn trong tháng này.');
      return;
    }

    const message = `Hành động này sẽ thực hiện gia hạn TOÀN BỘ (${expiringContracts.length}) hợp đồng hết hạn trong tháng này thêm 1 năm.\n\nBạn có chắc chắn muốn tiếp tục?`;
    
    if (window.confirm(message)) {
      setIsLoading(true); // Dùng isLoading chung cho tiện
      try {
        const month = targetDate.getMonth() + 1;
        const year = targetDate.getFullYear();
        const result = await contractService.bulkRenew(month, year);
        toast.success(result.message || 'Gia hạn hàng loạt thành công!');
        fetchData();
      } catch (error) {
        console.error('Lỗi gia hạn hàng loạt:', error);
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gia hạn hàng loạt');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: selectedContract.employee_id,
        contract_number: renewFormData.contract_number,
        contract_type: renewFormData.contract_type,
        start_date: renewFormData.start_date,
        end_date: renewFormData.end_date,
        base_salary: Number(renewFormData.base_salary),
        allowances: {
          lunch: Number(renewFormData.lunch_allowance),
          travel: Number(renewFormData.travel_allowance)
        }
      };

      await contractService.renew(selectedContract.id, payload);
      toast.success('Gia hạn hợp đồng thành công!');
      setIsRenewModalOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Lỗi gia hạn:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gia hạn hợp đồng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContractLabel = (type) => {
    const map = {
      'indefinite': 'Vô thời hạn',
      'fixed_1y': 'Xác định TH (1 năm)',
      'fixed_3y': 'Xác định TH (3 năm)',
      'probation': 'Thử việc'
    };
    return map[type] || type;
  };

  const getDaysLeftStyle = (days) => {
    if (days <= 7) return 'bg-red-50 text-red-600';
    if (days <= 30) return 'bg-amber-50 text-amber-600';
    return 'bg-gray-100 text-gray-600';
  };

  const formatMonth = (date) => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `Tháng ${m}/${y}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-gray-800">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <FileText className="w-6 h-6 text-cyan-500" />
            Thống kê Hợp đồng Lao động
          </h1>
          <p className="text-sm text-gray-500 mt-1">Báo cáo tình trạng pháp lý, thời hạn và phân loại hợp đồng toàn công ty.</p>
        </div>

        {/* MONTH PAGER (Tinh chỉnh theo yêu cầu) */}
        <div className="flex items-center bg-white border border-gray-100 rounded-2xl p-1 shadow-sm overflow-hidden min-w-[220px]">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-50 text-gray-400 hover:text-cyan-500 transition-colors rounded-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-cyan-500" />
            <span className="text-base font-bold text-cyan-800 tabular-nums">
              {formatMonth(targetDate)}
            </span>
          </div>

          <button 
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-50 text-gray-400 hover:text-cyan-500 transition-colors rounded-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. TOP CARDS (4 Cột) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Card 1: Đang hiệu lực */}
        <div className="bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] rounded-[20px] p-6 text-white relative overflow-hidden shadow-lg shadow-cyan-500/20">
          <div className="relative z-10">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-cyan-100 mb-1">HĐ Đang hiệu lực</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{overview.totalActive}</span>
              <span className="text-cyan-100 font-medium">hợp đồng</span>
            </div>
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-medium border border-white/10">
              Tính đến cuối {formatMonth(targetDate)}
            </div>
          </div>
          <FileText className="absolute -right-4 -bottom-6 w-32 h-32 text-white opacity-10" />
        </div>

        {/* Card 2: Sắp hết hạn */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[13px] font-semibold text-gray-500">Hết hạn trong tháng</h3>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{overview.expiringSoon}</span>
              <span className="text-sm font-medium text-gray-500">HĐ</span>
            </div>
            {overview.expiringSoon > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-red-50 text-red-500 px-2.5 py-1 rounded-md text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                Cần lưu ý xử lý ngay
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Đang thử việc */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[13px] font-semibold text-gray-500">Đang thử việc</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{String(overview.probationCount).padStart(2, '0')}</span>
              <span className="text-sm font-medium text-gray-500">người</span>
            </div>
            <div className="mt-2 inline-block bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-semibold">
              Nhân sự giai đoạn thử thách
            </div>
          </div>
        </div>

        {/* Card 4: Tỷ lệ ký tiếp */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[13px] font-semibold text-gray-500">Tỷ lệ ký tiếp</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">{overview.renewalRate}</span>
              <span className="text-xl font-bold text-gray-900">%</span>
            </div>
            <div className="mt-2 text-xs font-medium text-gray-400">Trên tổng nhân sự active</div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overview.renewalRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE: PHÂN LOẠI HỢP ĐỒNG */}
      <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <Layers className="w-5 h-5 text-purple-500" />
            Phân loại Hợp đồng ({formatMonth(targetDate)})
          </h2>
          <p className="text-sm text-gray-500 mt-1">Cơ cấu loại HĐ đang lưu hành đến cuối tháng</p>
        </div>

        <div className="space-y-5">
          {breakdown.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-48 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              </div>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
              </div>
              <div className="w-12 text-right text-sm font-bold text-gray-900">{item.percentage}%</div>
            </div>
          ))}
          {breakdown.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm italic">Không có dữ liệu hợp đồng cho giai đoạn này</div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM: BẢNG HỢP ĐỒNG HẾT HẠN TRONG THÁNG */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            Hợp đồng hết hạn trong {formatMonth(targetDate)}
          </h2>
          <button 
            onClick={handleBulkRenew}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Thông báo gia hạn hàng loạt
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Nhân viên</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Loại HĐ hiện tại</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày hết hạn</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Tình trạng</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expiringContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {contract.avatarimg ? (
                        <img src={contract.avatarimg} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-600">
                          {contract.name?.charAt(0) || 'NV'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{contract.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{contract.department_name} | {contract.position_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                      {getContractLabel(contract.contract_type)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-gray-600">
                    {contract.end_date}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold ${getDaysLeftStyle(contract.days_left)}`}>
                      {contract.days_left >= 0 ? `Còn ${contract.days_left} ngày` : 'Đã hết hạn'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => openRenewModal(contract)}
                      className="border border-cyan-400 text-cyan-600 hover:bg-cyan-50 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      Gia hạn / Kết thúc
                    </button>
                  </td>
                </tr>
              ))}
              {expiringContracts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">Không có hợp đồng nào hết hạn trong tháng này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL GIA HẠN HỢP ĐỒNG */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Gia hạn Hợp đồng Lao động
                </h2>
                <p className="text-cyan-50 text-xs mt-1 opacity-90">Tạo hợp đồng mới và lưu vết lịch sử pháp lý cho nhân sự.</p>
              </div>
              <button 
                onClick={() => setIsRenewModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRenewSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Employee Info Strip */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-cyan-100 text-cyan-700">
                    {selectedContract.name?.charAt(0)}
                 </div>
                 <div>
                    <div className="font-bold text-gray-900">{selectedContract.name}</div>
                    <div className="text-xs text-gray-500">{selectedContract.employee_code} | {selectedContract.department_name}</div>
                 </div>
                 <div className="ml-auto text-right">
                    <div className="text-[10px] uppercase font-bold text-gray-400">HĐ Hiện tại</div>
                    <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5">
                      {getContractLabel(selectedContract.contract_type)} - {selectedContract.end_date}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Số hợp đồng mới */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Số hợp đồng mới</label>
                  <input 
                    type="text"
                    required
                    value={renewFormData.contract_number}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, contract_number: e.target.value})}
                  />
                </div>

                {/* Loại hợp đồng */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loại hợp đồng tương lai</label>
                  <select 
                    required
                    value={renewFormData.contract_type}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, contract_type: e.target.value})}
                  >
                    <option value="fixed_1y">Xác định thời hạn (1 năm)</option>
                    <option value="fixed_3y">Xác định thời hạn (3 năm)</option>
                    <option value="indefinite">Vô thời hạn</option>
                    <option value="probation">Thử việc tiếp tục</option>
                  </select>
                </div>

                {/* Lương cơ bản */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lương cơ bản (VND)</label>
                  <input 
                    type="number"
                    required
                    value={renewFormData.base_salary}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, base_salary: e.target.value})}
                  />
                </div>

                {/* Ngày bắt đầu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày bắt đầu hiệu lực</label>
                  <input 
                    type="date"
                    required
                    value={renewFormData.start_date}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, start_date: e.target.value})}
                  />
                </div>

                {/* Ngày kết thúc */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày hết hạn dự kiến</label>
                  <input 
                    type="date"
                    required={renewFormData.contract_type !== 'indefinite'}
                    disabled={renewFormData.contract_type === 'indefinite'}
                    value={renewFormData.end_date}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold disabled:bg-gray-50 disabled:text-gray-400"
                    onChange={(e) => setRenewFormData({...renewFormData, end_date: e.target.value})}
                  />
                </div>

                {/* Phụ cấp ăn trưa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phụ cấp ăn trưa</label>
                  <input 
                    type="number"
                    value={renewFormData.lunch_allowance}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, lunch_allowance: e.target.value})}
                  />
                </div>

                {/* Phụ cấp đi lại */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phụ cấp đi lại</label>
                  <input 
                    type="number"
                    value={renewFormData.travel_allowance}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm font-semibold"
                    onChange={(e) => setRenewFormData({...renewFormData, travel_allowance: e.target.value})}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Xác nhận Gia hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronDown, Plus, Eye, Edit2, Gift, Medal, TrendingDown, AlertCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/manager'; 

export default function RewardsDiscipline() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mặc định lấy tháng hiện tại (VD: '2026-03')
  const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthStr());
  const [filterType, setFilterType] = useState('all'); // 'all', 'reward', 'discipline'

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_reward: 0, reward_count: 0,
    total_discipline: 0, discipline_count: 0
  });
  const [decisions, setDecisions] = useState([]);

  // Hàm gọi API lấy dữ liệu
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = filterMonth.split('-');
      
      const response = await axios.get(`${API_BASE}/decisions/dashboard`, {
        params: { 
          year: parseInt(year), 
          month: parseInt(month),
          search: searchTerm // Gửi từ khóa tìm kiếm lên server
        }
      });

      if (response.data.success) {
        setStats(response.data.data.stats);
        setDecisions(response.data.data.decisions);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu khen thưởng/kỷ luật:", error);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, searchTerm]);

  // Gọi API mỗi khi filterMonth thay đổi. 
  // Đối với searchTerm, dùng debounce (hoặc bấm Enter) là tốt nhất, ở đây mình gọi luôn khi gõ (nếu data ít).
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDashboardData();
    }, 500); // Chờ 0.5s sau khi ngừng gõ mới gọi API để tránh spam
    return () => clearTimeout(delayDebounceFn);
  }, [fetchDashboardData]);

  // Format hiển thị
  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(num)).replace('₫', 'VNĐ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return 'NV';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  };

  // Lọc dữ liệu theo Phân loại (Thưởng/Phạt) ở Frontend
  const displayDecisions = decisions.filter(d => filterType === 'all' || d.decision_type === filterType);

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen font-sans">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
            <Medal size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quản lý Khen thưởng & Kỷ luật</h1>
            <p className="text-slate-500 text-sm mt-1">Theo dõi, lập danh sách và ban hành các quyết định khen thưởng, kỷ luật nhân sự.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[#00b4d8] hover:bg-[#0096b4] text-white px-5 py-2.5 rounded-lg font-semibold transition-colors">
          <Plus size={18} /> Tạo quyết định mới
        </button>
      </div>

      {/* --- THỐNG KÊ (CARDS) --- */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Card Khen thưởng */}
        <div className="bg-[#10b981] rounded-2xl p-6 text-white relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-semibold mb-2 uppercase">Tổng chi khen thưởng</p>
            <div className="flex items-baseline gap-1">
              <h2 className="text-3xl font-bold">{formatCurrency(stats.total_reward).replace(' VNĐ', '')}</h2>
              <span className="text-emerald-100 text-sm">VNĐ</span>
            </div>
            <p className="text-emerald-200 text-sm mt-2">Tháng {filterMonth.split('-')[1]}/{filterMonth.split('-')[0]}</p>
          </div>
          <Gift className="absolute -bottom-4 -right-4 text-emerald-600 opacity-30" size={120} strokeWidth={1} />
        </div>

        {/* Lượt Khen thưởng */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-semibold uppercase">Số lượt khen thưởng</p>
            <div className="p-2 bg-emerald-50 rounded-full text-emerald-500"><Medal size={18} /></div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <h2 className="text-4xl font-bold text-slate-800">{stats.reward_count}</h2>
            <span className="text-slate-500 text-sm">lượt</span>
          </div>
        </div>

        {/* Tổng tiền phạt */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-semibold uppercase">Tổng tiền phạt</p>
            <div className="p-2 bg-rose-50 rounded-full text-rose-500"><TrendingDown size={18} /></div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <h2 className="text-3xl font-bold text-slate-800">{formatCurrency(stats.total_discipline).replace(' VNĐ', '')}</h2>
            <span className="text-slate-500 text-sm">VNĐ</span>
          </div>
          <p className="text-slate-400 text-xs">Khấu trừ trực tiếp vào lương</p>
        </div>

        {/* Lượt Kỷ luật */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-sm font-semibold uppercase">Số lượt kỷ luật</p>
            <div className="p-2 bg-amber-50 rounded-full text-amber-500"><AlertCircle size={18} /></div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <h2 className="text-4xl font-bold text-slate-800">{stats.discipline_count}</h2>
            <span className="text-slate-500 text-sm">lượt</span>
          </div>
        </div>
      </div>

      {/* --- BỘ LỌC --- */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên nhân viên, mã quyết định..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00b4d8] bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-64">
          <select 
            className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8] text-slate-600"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Tất cả phân loại</option>
            <option value="reward">Khen thưởng</option>
            <option value="discipline">Kỷ luật</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
        <div className="relative w-56">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="month" 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8] text-slate-600 font-medium" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
      </div>

      {/* --- BẢNG DỮ LIỆU --- */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-[#00b4d8]" size={32} />
          </div>
        )}

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <th className="px-6 py-4 font-semibold">Mã QĐ</th>
              <th className="px-6 py-4 font-semibold">Nhân viên</th>
              <th className="px-6 py-4 font-semibold">Phân loại</th>
              <th className="px-6 py-4 font-semibold">Lý do</th>
              <th className="px-6 py-4 font-semibold">Hình thức / Số tiền</th>
              <th className="px-6 py-4 font-semibold">Ngày ban hành</th>
              <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {displayDecisions.length > 0 ? displayDecisions.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-600">{item.decision_number}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                      {getInitials(item.employee_name)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{item.employee_name}</div>
                      <div className="text-xs text-slate-400">{item.department_name || 'Chưa xếp phòng'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.decision_type === 'reward' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold text-xs border border-emerald-100">
                      <ArrowUpCircle size={14} /> Khen thưởng
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-semibold text-xs border border-rose-100">
                      <TrendingDown size={14} /> Kỷ luật
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                <td className="px-6 py-4 font-bold">
                  {Number(item.amount) > 0 ? (
                    <span className={item.decision_type === 'reward' ? 'text-emerald-600' : 'text-rose-600'}>
                      {item.decision_type === 'reward' ? '+ ' : '- '}{formatCurrency(item.amount)}
                    </span>
                  ) : (
                    <span className="text-amber-500">
                      {item.form === 'warning' ? 'Cảnh cáo' : 'Không có số tiền'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500">{formatDate(item.issue_date)}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button className="p-2 bg-[#00b4d8]/10 text-[#00b4d8] rounded-full hover:bg-[#00b4d8] hover:text-white transition-colors"><Eye size={16} /></button>
                    <button className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-colors"><Edit2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                  Không tìm thấy quyết định nào trong tháng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronDown, Plus, Eye, Edit2, Gift, Medal, TrendingDown, AlertCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { managerDecisionService } from '../../services/managerDecisionService';

export default function DecisionList({ onCreateNew, onViewDetail, onEdit }) {
  const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonthStr());
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_reward: 0, reward_count: 0, total_discipline: 0, discipline_count: 0 });
  const [decisions, setDecisions] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = filterMonth.split('-');
      const response = await managerDecisionService.getDashboard({
        year: parseInt(year),
        month: parseInt(month),
        search: searchTerm,
      });
      if (response?.success) {
        setStats(response.data?.stats || { total_reward: 0, reward_count: 0, total_discipline: 0, discipline_count: 0 });
        setDecisions(response.data?.decisions || []);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, searchTerm]);

  useEffect(() => {
    const delay = setTimeout(() => fetchDashboardData(), 500);
    return () => clearTimeout(delay);
  }, [fetchDashboardData]);

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.abs(amount)).replace('₫', 'VNĐ');
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const getInitials = (name) => {
    if (!name) return 'NV';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  };

  const displayDecisions = decisions.filter(d => filterType === 'all' || d.decision_type === filterType);

  return (
    <div className="p-8">
      {/* Header List */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Medal size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quản lý Khen thưởng & Kỷ luật</h1>
            <p className="text-slate-500 text-sm mt-1">Theo dõi, lập danh sách và ban hành các quyết định khen thưởng, kỷ luật nhân sự.</p>
          </div>
        </div>
        <button onClick={onCreateNew} className="flex items-center gap-2 bg-[#00b4d8] hover:bg-[#0096b4] text-white px-5 py-2.5 rounded-lg font-semibold">
          <Plus size={18} /> Tạo quyết định mới
        </button>
      </div>

      {/* Thống kê (Cards) */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-[#10b981] rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-semibold mb-2 uppercase">Tổng chi khen thưởng</p>
            <h2 className="text-3xl font-bold">{formatCurrency(stats.total_reward).replace(' VNĐ', '')} <span className="text-sm font-normal">VNĐ</span></h2>
          </div>
          <Gift className="absolute -bottom-4 -right-4 text-emerald-600 opacity-30" size={120} />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Số lượt khen thưởng</p>
          <h2 className="text-3xl font-bold text-slate-800">{stats.reward_count} <span className="text-sm font-normal text-slate-500">lượt</span></h2>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Tổng tiền phạt</p>
          <h2 className="text-3xl font-bold text-slate-800">{formatCurrency(stats.total_discipline).replace(' VNĐ', '')} <span className="text-sm font-normal text-slate-500">VNĐ</span></h2>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Số lượt kỷ luật</p>
          <h2 className="text-3xl font-bold text-slate-800">{stats.discipline_count} <span className="text-sm font-normal text-slate-500">lượt</span></h2>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Tìm kiếm theo tên nhân viên, mã quyết định..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-64 px-4 py-3 rounded-xl border border-slate-200 bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Tất cả phân loại</option><option value="reward">Khen thưởng</option><option value="discipline">Kỷ luật</option>
        </select>
        <input type="month" className="w-56 px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden relative min-h-[300px]">
        {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10"><Loader2 className="animate-spin text-[#00b4d8]" size={32} /></div>}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <th className="px-6 py-4 font-semibold">Mã QĐ</th>
              <th className="px-6 py-4 font-semibold">Nhân viên</th>
              <th className="px-6 py-4 font-semibold">Phân loại</th>
              <th className="px-6 py-4 font-semibold">Lý do</th>
              <th className="px-6 py-4 font-semibold">Hình thức</th>
              <th className="px-6 py-4 font-semibold">Ngày ban hành</th>
              <th className="px-6 py-4 font-semibold text-center tracking-wide">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayDecisions.length > 0 ? displayDecisions.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{item.decision_number}</td>
                <td className="px-6 py-4 flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{getInitials(item.employee_name)}</div>
                  <div><div className="font-bold">{item.employee_name}</div><div className="text-xs text-slate-400">{item.department_name || 'Chưa xếp phòng'}</div></div>
                </td>
                <td className="px-6 py-4">
                  {item.decision_type === 'reward' ? <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">Khen thưởng</span> : <span className="text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-xs font-bold">Kỷ luật</span>}
                </td>
                <td className="px-6 py-4 max-w-xs truncate">{item.reason}</td>
                <td className="px-6 py-4 font-bold">{Number(item.amount) > 0 ? formatCurrency(item.amount) : 'Cảnh cáo / Bằng khen'}</td>
                <td className="px-6 py-4 text-slate-500">{formatDate(item.issue_date)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewDetail?.(item.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-900 shadow-sm transition-colors hover:bg-cyan-500"
                      title="Xem chi tiết"
                      aria-label="Xem chi tiết"
                    >
                      <Eye size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(item.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-900 shadow-sm transition-colors hover:bg-emerald-500"
                      title="Chỉnh sửa"
                      aria-label="Chỉnh sửa"
                    >
                      <Edit2 size={18} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan="7" className="text-center py-10 text-slate-400">Không tìm thấy dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
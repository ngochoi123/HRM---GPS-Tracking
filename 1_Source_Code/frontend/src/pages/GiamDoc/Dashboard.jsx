import React, { useState, useEffect } from "react";
import { 
  Users, 
  Wallet, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  MapPin, 
  Building2,
  Calendar,
  ChevronRight,
  TrendingDown,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { directorDashboardService } from "../../services/directorDashboardService";
import axiosClient from "../../api/axiosClient";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    summary: { total: 0, present: 0, salary: 0, requests: 0, contracts: 0, hires: 0, resignations: 0 },
    departments: [],
    managers: [],
    requests: [],
    changesChart: []
  });
  
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branchId: "", departmentId: "" });
  const [options, setOptions] = useState({ branches: [], departments: [] });

  // 1. Tải danh sách chi nhánh ban đầu
  const fetchFilterOptions = async () => {
    try {
      const branches = await axiosClient.get("/director/branches");
      setOptions(prev => ({ ...prev, branches: Array.isArray(branches) ? branches : [] }));
    } catch (error) {
      console.error("Lỗi tải lựa chọn bộ lọc:", error);
    }
  };

  // 2. Tải danh sách phòng ban khi chi nhánh thay đổi
  const fetchDepartments = async (branchId) => {
    if (!branchId) {
      setOptions(prev => ({ ...prev, departments: [] }));
      return;
    }
    try {
      const branchRes = await axiosClient.get(`/director/branches/${branchId}`);
      setOptions(prev => ({ ...prev, departments: branchRes.departments || [] }));
    } catch (error) {
      console.error("Lỗi tải phòng ban:", error);
    }
  };

  // 3. Tải dữ liệu Dashboard chính
  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.departmentId) params.departmentId = filters.departmentId;

      const response = await directorDashboardService.getOverview(params);
      if (response?.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [filters, fetchDashboardData]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setFilters({ branchId: val, departmentId: "" });
    fetchDepartments(val);
  };

  const { 
    summary = { total: 0, present: 0, salary: 0, requests: 0, contracts: 0, hires: 0, resignations: 0 }, 
    departments = [], 
    requests = [], 
    changesChart = [] 
  } = data || {};
  const performance = summary?.total > 0 ? Math.round((summary?.present / summary?.total) * 100) : 0;

  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const goToApproval = (request) => {
    const type = String(request?.type || '').toLowerCase();
    const isPayroll = type === 'payroll';
    const tab = isPayroll ? 'payroll' : 'leave';
    
    navigate('/GiamDoc/approvals', {
      state: { fromDashboard: true, tab, requestType: 'all', focusId: request?.id || null }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-[#F1F5F9] min-h-screen space-y-8 pb-20"
    >
      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Executive <span className="text-indigo-600">Dashboard</span></h1>
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
            <Calendar size={16} className="text-indigo-500" />
            <span>{todayStr}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/60 p-2 rounded-2xl backdrop-blur-sm border border-white shadow-sm w-full xl:w-auto">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 px-3">
             <MapPin size={16} className="text-slate-400" />
             <select 
               value={filters.branchId}
               onChange={handleBranchChange}
               className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer min-w-[140px]"
             >
               <option value="">Toàn công ty</option>
               {options.branches.map(b => (
                 <option key={b.id} value={b.id}>{b.branch_name}</option>
               ))}
             </select>
          </div>
          
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Department Filter */}
          <div className="flex items-center gap-2 px-3">
             <Building2 size={16} className="text-slate-400" />
             <select 
               value={filters.departmentId}
               onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
               disabled={!filters.branchId}
               className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer min-w-[140px] disabled:opacity-50"
             >
               <option value="">Tất cả phòng ban</option>
               {options.departments.map(d => (
                 <option key={d.id} value={d.id}>{d.department_name}</option>
               ))}
             </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all font-bold text-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Sync..." : "Cập nhật"}
          </motion.button>
        </div>
      </div>

      {/* 5 MODULES SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <StatsCard 
          title="Tổng nhân sự" 
          value={summary.total} 
          icon={<Users size={20} />} 
          color="indigo" 
        />
        <StatsCard 
          title="Hiện diện" 
          value={`${performance}%`} 
          sub={`${summary.present} có mặt`}
          icon={<CheckCircle iconSize={20} />} 
          color="emerald" 
          percentage={performance}
        />
        <StatsCard 
          title="Quỹ lương T1" 
          value={`${(summary.salary / 1_000_000).toLocaleString('vi-VN')}M`} 
          sub="Hợp đồng active"
          icon={<Wallet size={20} />} 
          color="amber" 
        />
        <StatsCard 
          title="Hợp đồng mới" 
          value={summary.contracts} 
          sub="Đang hiệu lực"
          icon={<FileText size={20} />} 
          color="blue" 
        />
        <StatsCard 
          title="Cần phê duyệt" 
          value={summary.requests} 
          sub="Đơn từ đang tồn"
          icon={<AlertCircle size={20} />} 
          color="rose" 
          isAlert={summary.requests > 0}
        />
      </div>

      {/* CHARTS & RECENT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Personnel Changes Chart */}
        <div className="xl:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col min-h-[460px]">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                  <TrendingUp size={22} className="text-indigo-600" />
                  Biến động nhân sự
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-1">Xu hướng chuyển động nhân sự 6 tháng gần nhất</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl">
                 <div className="flex items-center gap-2 mr-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-500">Mới (+{summary.hires})</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-500">Nghỉ (-{summary.resignations})</span>
                 </div>
              </div>
           </div>
           
           <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={changesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="hires" name="Mới" stackId="a" radius={[6, 6, 0, 0]} barSize={24}>
                    {changesChart.map((e, i) => <Cell key={`c-h-${i}`} fill="#10B981" />)}
                  </Bar>
                  <Bar dataKey="resignations" name="Nghỉ" stackId="b" radius={[6, 6, 0, 0]} barSize={24}>
                    {changesChart.map((e, i) => <Cell key={`c-r-${i}`} fill="#EF4444" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Recent Pending Requests */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col h-[460px]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <Clock size={22} className="text-rose-500" />
              Chờ phê duyệt
            </h2>
            <span className="text-xs font-black bg-rose-100 text-rose-700 px-3 py-1 rounded-full">{summary.requests} Đơn</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {(!requests || requests.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 italic">
                <CheckCircle size={40} className="mb-2 text-emerald-100" />
                <p className="text-sm">Không có yêu cầu chờ xử lý</p>
              </div>
            ) : (
              requests.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => goToApproval(r)}
                  className="group flex items-center gap-4 p-4 border border-slate-50 bg-slate-50/50 rounded-2xl hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    r.type === 'leave' ? 'bg-emerald-100 text-emerald-600' : 
                    r.type === 'overtime' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      {r.type === 'leave' ? 'Nghỉ phép' : r.type === 'overtime' ? 'Tăng ca' : 'Giải trình'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </motion.div>
              ))
            )}
          </div>
          
          <button 
             onClick={() => navigate('/GiamDoc/approvals')}
             className="w-full mt-6 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-100"
          >
            Tất cả đơn từ
          </button>
        </div>
      </div>

      {/* DEPARTMENT ATTENDANCE LIST */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chuyên cần <span className="text-indigo-600">Phòng ban</span></h2>
              <p className="text-slate-400 text-sm font-medium mt-1">Dữ liệu chấm công trực tiếp theo từng đơn vị</p>
           </div>
           {!filters.branchId && (
             <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100">Toàn quốc / {departments.length} phòng ban</span>
           )}
        </div>

        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <AnimatePresence mode="popLayout">
               {departments.map((d, i) => {
                 const onTimeRate = d.total > 0 ? Math.round((d.on_time / d.total) * 100) : 0;
                 return (
                   <motion.div 
                     key={d.id || i}
                     layout
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-slate-50/40 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group"
                   >
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-indigo-500 border border-slate-50">
                           {i + 1}
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ đúng giờ</p>
                           <p className="text-xl font-black text-emerald-500">{onTimeRate}%</p>
                        </div>
                     </div>

                     <div className="mb-6">
                       <h3 className="font-black text-slate-800 truncate mb-1">{d.name}</h3>
                       <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                         <Users size={12} /> {d.total} nhân viên
                       </p>
                     </div>

                     <div className="space-y-4">
                        <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden flex shadow-inner">
                           <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(d.on_time/d.total)*100 || 0}%` }} />
                           <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${(d.late/d.total)*100 || 0}%` }} />
                           <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${(d.early_leave/d.total)*100 || 0}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                           <div className="flex gap-4">
                              <Indicator value={d.on_time} label="Đúng giờ" color="bg-emerald-500" />
                              <Indicator value={d.late} label="Trễ" color="bg-amber-400" />
                              <Indicator value={d.early_leave} label="Về sớm" color="bg-rose-500" />
                           </div>
                           <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                        </div>
                     </div>
                   </motion.div>
                 );
               })}
             </AnimatePresence>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

// Sub-components
function StatsCard({ title, value, sub, icon, color, isAlert }) {
  const colors = {
    indigo: "from-indigo-600 to-blue-700 shadow-indigo-100",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-100",
    amber: "from-amber-400 to-orange-500 shadow-amber-100",
    rose: "from-rose-500 to-pink-600 shadow-rose-100 text-white",
    blue: "from-blue-500 to-indigo-600 shadow-blue-100",
  };

  const isGradient = color === 'rose';

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className={`relative p-6 rounded-[28px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 group ${isGradient ? `bg-gradient-to-br ${colors[color]} text-white` : 'bg-white'}`}
    >
      {!isGradient && (
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 transition-transform duration-700 group-hover:scale-125 bg-current text-${color}-600`} />
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
           <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${isGradient ? 'bg-white/20' : `bg-${color}-50 text-${color}-600`}`}>
              {icon}
           </div>
           {isAlert && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
        </div>

        <div className="mt-8">
           <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isGradient ? 'text-white/60' : 'text-slate-400'}`}>{title}</p>
           <h3 className={`text-2xl font-black ${isGradient ? 'text-white' : 'text-slate-800'}`}>{value}</h3>
           {sub && <p className={`text-[11px] font-bold mt-1 ${isGradient ? 'text-white/80' : 'text-slate-400'}`}>{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function Indicator({ value, color }) {
  return (
    <div className="flex items-center gap-1.5">
       <span className={`w-2 h-2 rounded-full ${color}`} />
       <span className="text-[10px] font-black text-slate-500 uppercase">{value}</span>
    </div>
  );
}

function CheckCircle({ iconSize = 16 }) {
  return <div className="flex items-center justify-center text-emerald-500"><Clock size={iconSize} /></div>;
}

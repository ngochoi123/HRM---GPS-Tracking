import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
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
import axiosClient from "../../api/axiosClient";
import moment from "moment";

export default function DashboardQuanLy() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sử dụng API thống kê chung đã được refactor với bộ lọc department_id tự động cho Manager
      const response = await axiosClient.get("/director/dashboard/overview");
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || "Không thể tải dữ liệu bộ phận");
      }
    } catch (err) {
      console.error("Lỗi Dashboard Manager:", err);
      setError("Có lỗi xảy ra khi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Đang đồng bộ dữ liệu bộ phận...</p>
      </div>
    );
  }

  const { summary = {}, changesChart = [], requests = [], departments = [] } = data || {};
  
  // Tính toán tỷ lệ đi làm của bộ phận
  const attendanceRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Thống kê <span className="text-indigo-600">Bộ phận</span>
          </h1>
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
            <Calendar size={16} className="text-indigo-500" />
            <span>Hôm nay: {todayStr}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
              <TrendingUp size={12} /> Live
            </span>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-300 font-bold text-sm"
        >
          <RefreshCw size={18} className={`${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          {loading ? "Đang cập nhật..." : "Làm mới dữ liệu"}
        </button>
      </div>

      {/* Summary Stats Grid - Tuân thủ 3 phân hệ (Attendance, Personnel Changes, Requests) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees (Chuyên cần) */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-1">Nhân sự bộ phận</p>
              <h3 className="text-3xl font-black text-slate-800">{summary.total || 0}</h3>
            </div>
          </div>
        </div>

        {/* Hires this month (Biến động) */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-1">Mới trong tháng</p>
              <h3 className="text-3xl font-black text-slate-800">+{summary.hires || 0}</h3>
            </div>
          </div>
        </div>

        {/* Resignations this month (Biến động) */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-100">
              <UserMinus className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-1">Nghỉ trong tháng</p>
              <h3 className="text-3xl font-black text-slate-800">-{summary.resignations || 0}</h3>
            </div>
          </div>
        </div>

        {/* Attendance Rate (Chuyên cần) */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100">
              <CheckCircle2 className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-none mb-1">Tỷ lệ đi làm</p>
              <div className="flex items-center gap-2">
                <h3 className="text-3xl font-black text-slate-800">{attendanceRate}%</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{summary.present || 0}/{summary.total || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Personnel Changes Trend Chart - PHÂN HỆ BIẾN ĐỘNG NHÂN SỰ */}
        <div className="xl:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col min-h-[460px]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                Biến động nhân sự
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-1">Xu hướng tuyển dụng và nghỉ việc trong phòng</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-100"></span>
                 <span className="text-xs font-bold text-slate-500">Mới</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-100"></span>
                 <span className="text-xs font-bold text-slate-500">Nghỉ</span>
               </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={changesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                 <XAxis 
                   dataKey="label" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                   dy={10}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                 />
                 <Tooltip 
                   cursor={{ fill: '#F1F5F9' }}
                   contentStyle={{ 
                     borderRadius: '16px', 
                     border: 'none', 
                     boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                     padding: '12px 16px'
                   }}
                 />
                 <Bar dataKey="hires" name="Tuyển mới" radius={[4, 4, 0, 0]} barSize={20}>
                    {changesChart.map((entry, index) => (
                      <Cell key={`cell-hire-${index}`} fill="#10B981" />
                    ))}
                 </Bar>
                 <Bar dataKey="resignations" name="Nghỉ việc" radius={[4, 4, 0, 0]} barSize={20}>
                    {changesChart.map((entry, index) => (
                      <Cell key={`cell-res-${index}`} fill="#EF4444" />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Pending Requests - PHÂN HỆ ĐƠN TỪ */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              Đơn chờ phê duyệt
            </h2>
            <span className="text-xs font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              {summary.requests || 0} đơn
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {!requests || requests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                 <CheckCircle2 size={40} className="mb-4 text-emerald-400" />
                 <p className="text-sm font-bold">Mọi thứ đã được xử lý!</p>
              </div>
            ) : (
              requests.map((req, idx) => (
                <div 
                  key={req.id || idx} 
                  className="group p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-300 cursor-pointer"
                  onClick={() => window.location.href = "/QuanLy/approvals"}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-800 text-sm truncate pr-4">{req.name}</p>
                    <span 
                      className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border shadow-sm shrink-0 ${
                        req.type === 'leave' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        req.type === 'overtime' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {req.type === 'leave' ? 'Phép' : req.type === 'overtime' ? 'Tăng ca' : 'Giải trình'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] text-slate-400 font-bold">{moment(req.created_at).fromNow()}</p>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
             onClick={() => window.location.href = "/QuanLy/approvals"}
             className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-slate-100 transition-all flex items-center justify-center gap-2"
          >
            Đến trang phê duyệt
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Attendance Summary - PHÂN HỆ CHẤM CÔNG */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-500" />
                Tình hình Chuyên cần
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-1">Dữ liệu ghi nhận thực tế tại bộ phận trong ngày</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Đúng giờ</p>
                  <p className="text-xl font-black text-emerald-600">{departments[0]?.on_time || 0}</p>
               </div>
               <div className="w-px h-10 bg-slate-100" />
               <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Đi muộn</p>
                  <p className="text-xl font-black text-amber-500">{departments[0]?.late || 0}</p>
               </div>
               <div className="w-px h-10 bg-slate-100" />
               <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Về sớm</p>
                  <p className="text-xl font-black text-rose-500">{departments[0]?.early_leave || 0}</p>
               </div>
            </div>
         </div>
         
         <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 space-y-4">
               <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <AlertCircle size={16} className="text-indigo-400" />
                 Lưu ý nhanh
               </h3>
               <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                  <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                    Hôm nay bộ phận có <strong>{summary.total || 0}</strong> nhân sự. 
                    Tỷ lệ đi làm đạt <strong>{attendanceRate}%</strong>.
                  </p>
                  <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold bg-white/60 p-2 rounded-lg">
                    <Clock size={14} /> Cập nhật: {moment().format('HH:mm')}
                  </div>
               </div>
            </div>
            
            <div className="md:col-span-2 flex flex-col justify-center">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-[#F1F5F9] rounded-3xl border border-white hover:border-indigo-100 transition-all cursor-pointer group" onClick={() => window.location.href = "/QuanLy/CheckIn"}>
                     <div className="flex justify-between items-center mb-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Xem chi tiết chấm công</p>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                     </div>
                     <p className="text-sm text-slate-600 font-bold leading-relaxed pr-6">Theo dõi lịch sử vào/ra và vị trí check-in của bộ phận.</p>
                  </div>
                  <div className="p-6 bg-[#F1F5F9] rounded-3xl border border-white hover:border-amber-100 transition-all cursor-pointer group" onClick={() => window.location.href = "/QuanLy/Employees"}>
                     <div className="flex justify-between items-center mb-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Danh sách nhân sự</p>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-amber-600 transition-all" />
                     </div>
                     <p className="text-sm text-slate-600 font-bold leading-relaxed pr-6">Quản lý hồ sơ, chức vụ và thông tin liên lạc trong phòng.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce z-[100]">
           <AlertCircle size={20} />
           <p className="font-bold">{error}</p>
        </div>
      )}
    </div>
  );
}

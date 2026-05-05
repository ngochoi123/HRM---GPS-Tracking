import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle2, ArrowRight, Loader2, Sparkles, 
  ShieldAlert, History, User, MapPin, RefreshCw, Search,
  Medal, TrendingUp, TrendingDown, AlertTriangle, Filter, Clock,
  Info, X ,BrainCircuit
} from 'lucide-react';
import { recommendationService } from '../../services/recommendationService';

export default function RecommendationList() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // <-- STATE ĐIỀU KHIỂN MODAL THÔNG TIN -->
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await recommendationService.getRecommendations();
      if (res?.success) {
        setRecommendations(res.data || []);
      }
    } catch (error) {
      console.error("Lỗi tải đề xuất:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = (item) => {
    navigate('/QuanLy/rewards-discipline', { state: { prefillData: item.prefill } });
  };

  const statsSummary = useMemo(() => {
    return {
      total: recommendations.length,
      highRisk: recommendations.filter(r => r.risk_level === 'HIGH').length,
      discipline: recommendations.filter(r => r.recommendation_type === 'discipline').length,
      reward: recommendations.filter(r => r.recommendation_type === 'reward').length,
    };
  }, [recommendations]);

  const filteredList = useMemo(() => {
    return recommendations.filter(item => {
      const matchName = item.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRisk = riskFilter === 'all' || item.risk_level === riskFilter;
      const matchType = typeFilter === 'all' || item.recommendation_type === typeFilter;
      return matchName && matchRisk && matchType;
    });
  }, [recommendations, searchTerm, riskFilter, typeFilter]);

  const getMainStat = (item) => {
    const s = item.stats || {};
    if (item.recommendation_type === 'reward') {
      if (s.otHours >= 10) return { text: `OT: ${s.otHours}h`, isDanger: false };
      return { text: `Công: ${s.presentCount}d`, isDanger: false };
    } else {
      if (s.gpsFraudCount > 0) return { text: `GPS Fraud: ${s.gpsFraudCount}`, isDanger: true };
      if (s.absentCount > 0) return { text: `Vắng: ${s.absentCount}d`, isDanger: true };
      if (s.lateCount > 0) return { text: `Trễ: ${s.lateCount} lần`, isDanger: true };
      return { text: `Rủi ro: ${item.risk_level}`, isDanger: true };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-[#f8fafc] w-full">
        <Loader2 className="animate-spin text-[#f43f5e]" size={40} />
        <p className="text-slate-500 font-medium">Đang quét dữ liệu chuyên cần và phân tích đề xuất...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans w-full relative">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shrink-0">
              <Sparkles size={28} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Đề xuất & Cảnh báo AI</h1>
                {/* <-- NÚT INFO ĐƯỢC THÊM VÀO ĐÂY --> */}
                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"
                  title="Tiêu chí đánh giá"
                >
                  <Info size={20} strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-slate-500 text-[13px] mt-1 font-medium">
                Dựa trên phân tích chuyên cần, rủi ro nghỉ việc và thành tích của nhân viên.
              </p>
            </div>
          </div>
          
          <button 
            onClick={fetchRecommendations}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-all text-sm shadow-sm active:scale-95 shrink-0"
          >
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>

        {/* THỐNG KÊ TỔNG QUAN (KPI CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng đề xuất</p>
                    <h3 className="text-2xl font-black text-slate-800">{statsSummary.total}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                    <History size={20} />
                </div>
            </div>
            
            <div className="bg-white p-5 rounded-[1.5rem] border border-rose-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Nguy cơ cao</p>
                    <h3 className="text-2xl font-black text-rose-600">{statsSummary.highRisk}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center animate-pulse">
                    <AlertTriangle size={20} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-1">Đề xuất Kỷ luật</p>
                    <h3 className="text-2xl font-black text-amber-600">{statsSummary.discipline}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                    <TrendingDown size={20} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Đề xuất Khen thưởng</p>
                    <h3 className="text-2xl font-black text-emerald-600">{statsSummary.reward}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <Medal size={20} />
                </div>
            </div>
        </div>

        {/* THANH TÌM KIẾM & LỌC */}
        <div className="flex flex-col md:flex-row gap-3 relative z-10">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm theo tên nhân viên..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-[13px] font-medium rounded-xl focus:ring-1 focus:ring-purple-500 focus:border-purple-500 block pl-10 p-3 outline-none transition-all shadow-sm"
                />
            </div>
            
            <div className="relative w-full md:w-48">
                <select 
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-xl focus:ring-1 focus:ring-purple-500 focus:border-purple-500 block p-3 outline-none appearance-none cursor-pointer shadow-sm"
                >
                    <option value="all">Mọi mức độ rủi ro</option>
                    <option value="HIGH">Rủi ro Cao (HIGH)</option>
                    <option value="MEDIUM">Rủi ro TB (MEDIUM)</option>
                    <option value="LOW">Rủi ro Thấp (LOW)</option>
                </select>
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative w-full md:w-48">
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-xl focus:ring-1 focus:ring-purple-500 focus:border-purple-500 block p-3 outline-none appearance-none cursor-pointer shadow-sm"
                >
                    <option value="all">Tất cả đề xuất</option>
                    <option value="discipline">Kỷ luật</option>
                    <option value="reward">Khen thưởng</option>
                </select>
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        </div>

        {/* LIST SECTION */}
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy dữ liệu</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
              Không có đề xuất nào phù hợp với bộ lọc hiện tại của bạn.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredList.map((item) => {
              const mainStat = getMainStat(item);
              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center py-4 pr-5 pl-2 relative overflow-hidden group"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-[6px] ${
                    item.risk_level === 'HIGH' ? 'bg-rose-500' : 
                    item.risk_level === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></div>

                  <div className="flex items-center gap-4 w-full md:w-[300px] shrink-0 pl-4 py-2 md:py-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.recommendation_type === 'reward' 
                          ? 'bg-emerald-50 text-emerald-500 border-emerald-100/50' 
                          : 'bg-rose-50 text-rose-500 border-rose-100/50'
                    }`}>
                      {item.recommendation_type === 'reward' ? <Medal size={24} strokeWidth={2} /> : <ShieldAlert size={24} strokeWidth={2} />}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-slate-800 text-[15px] truncate leading-tight">{item.employee_name}</h3>
                      <p className="text-slate-500 text-[12px] font-medium truncate mt-0.5">{item.position_name}</p>
                    </div>
                  </div>

                  <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-slate-100 px-6 py-4 md:py-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-black uppercase tracking-wider border ${
                        item.risk_level === 'HIGH' 
                          ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                        item.risk_level === 'MEDIUM' 
                          ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {item.risk_level} RISK
                      </span>
                      
                      <span className={`text-[12px] font-bold ${mainStat.isDanger ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {mainStat.text}
                      </span>

                      {item.stats.otHours > 0 && item.recommendation_type === 'reward' && (
                         <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={12} /> {item.stats.totalWorkHours}h
                         </span>
                      )}
                    </div>
                    
                    <p className="text-slate-600 text-[13px] line-clamp-2 leading-relaxed font-medium">
                      <span className="font-bold text-slate-700">Lý do: </span>
                      {item.reason}
                    </p>
                  </div>

                  <div className="w-full md:w-auto text-right shrink-0 min-w-[200px] pl-6 md:pl-0 flex flex-col items-end justify-center">
                    <p className="text-[10px] text-slate-400 font-medium mb-2 flex items-center gap-1 opacity-70">
                      Đề xuất bởi: Hệ thống AI
                    </p>
                    <button 
                      onClick={() => handleProcess(item)}
                      className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold text-[13px] transition-all text-white shadow-lg active:scale-95 ${
                          item.recommendation_type === 'reward' 
                              ? 'bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/25'
                              : 'bg-[#f43f5e] hover:bg-[#e11d48] shadow-rose-500/25'
                      }`}
                    >
                      Duyệt & Quyết Định <ArrowRight size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* <-- MODAL THÔNG TIN TIÊU CHÍ (NEW) --> */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BrainCircuit className="text-purple-600" size={24} />
                Tiêu chí Đánh giá của AI (Qwen2.5)
              </h2>
              <button 
                onClick={() => setShowInfoModal(false)} 
                className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors"
              >
                <X size={20}/>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <p className="text-[14px] text-slate-600 font-medium leading-relaxed">
                Hệ thống AI sẽ tự động phân tích dữ liệu chuyên cần, lịch sử vi phạm và giờ làm việc của nhân sự trong <strong className="text-purple-600">30 ngày gần nhất</strong> để đưa ra các đề xuất khách quan nhất.
              </p>

              <div className="space-y-4">
                {/* Reward Section */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                  <h3 className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
                    <Medal size={20} /> Tiêu chí Khen Thưởng (Reward)
                  </h3>
                  <ul className="space-y-2 text-[13px] text-slate-600 font-medium">
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      Tỷ lệ đi làm (chuyên cần) đạt mức xuất sắc (thường {'>'}= 95% ngày công chuẩn).
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      Tuyệt đối <span className="font-bold text-emerald-600">KHÔNG</span> đi trễ, về sớm hay nghỉ không phép.
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      (Tùy chọn) Có số giờ tăng ca (OT) nổi bật, đóng góp tích cực cho tiến độ công ty.
                    </li>
                  </ul>
                </div>

                {/* Discipline Section */}
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
                  <h3 className="flex items-center gap-2 text-rose-700 font-bold mb-2">
                    <ShieldAlert size={20} /> Tiêu chí Kỷ Luật (Discipline)
                  </h3>
                  <ul className="space-y-2 text-[13px] text-slate-600 font-medium">
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                      Bị phát hiện <span className="font-bold text-rose-600">Gian lận GPS</span> (Sử dụng Fake GPS hoặc phần mềm thứ 3 để qua mặt hệ thống).
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                      Nghỉ <strong className="text-rose-600">không phép</strong> từ 3 ngày trở lên trong tháng.
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></div>
                      Đi trễ / Về sớm vượt quá mức cho phép (thường {'>'}= 5 lần/tháng).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                Đã hiểu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
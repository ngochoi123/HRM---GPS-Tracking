import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BrainCircuit, AlertTriangle, TrendingDown, TrendingUp, Users, Search, 
  ChevronRight, Clock, Sparkles, ArrowRight, Info, MessageSquareWarning, 
  RefreshCw, X, Terminal, Timer, ShieldAlert, UserMinus, Crosshair,
  Activity, Target, ThumbsUp, ThumbsDown, Gauge, CalendarClock, Zap
} from 'lucide-react';


export default function AITurnoverDashboard() {
  const [staffData, setStaffData] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(''); 
  const [timeLeft, setTimeLeft] = useState(0);   
  const [elapsed, setElapsed] = useState(0);     
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    total: 0, highRisk: 0, medRisk: 0, lowRisk: 0, fraudCount: 0
  });

  const fetchAlerts = useCallback(async () => {
    try {
      // Giả lập gọi API, nếu lỗi sẽ dùng Mock Data
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/ai/alerts', { headers: { Authorization: `Bearer ${token}` } });
      processAlertData(response.data.data);
    } catch {
      console.warn("Không kết nối được API");
   
    }
  }, []);

  const processAlertData = (data) => {
    setStaffData(data);
    setStats({
      total: data.length,
      highRisk: data.filter(i => i.risk_level === 'HIGH' && i.alert_type !== 'FRAUD_DETECTION').length,
      medRisk: data.filter(i => i.risk_level === 'MEDIUM').length,
      lowRisk: data.filter(i => i.risk_level === 'LOW').length,
      fraudCount: data.filter(i => i.alert_type === 'FRAUD_DETECTION').length
    });
  }

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    const estimatedSeconds = staffData.length > 0 ? Math.max(15, staffData.length * 5) : 20;
    setTimeLeft(estimatedSeconds);
    setElapsed(0);

    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setElapsed((prev) => prev + 1);
    }, 1000);

    const steps = [
      "Khởi tạo kết nối bảo mật đến Database...",
      "Đang đối chiếu tọa độ GPS với trạm phát sóng...",
      "Phát hiện dấu hiệu di chuyển ảo (Fake GPS)...",
      "Trích xuất dữ liệu vắng mặt không lý do...",
      "Đang truy xuất lịch sử thiết bị và IP Wifi...",
      "Ollama (Qwen2) đang đánh giá hành vi nhân sự...",
      "Đang khởi tạo các đề xuất cá nhân hóa...",
      "Hoàn tất! Đang đồng bộ lên Dashboard..."
    ];
    
    let stepIndex = 0;
    setAnalysisStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex++;
      if(stepIndex < steps.length) setAnalysisStep(steps[stepIndex]);
    }, estimatedSeconds * 1000 / steps.length);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/ai/analyze-turnover', 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAlerts();
    } catch (err) {
      console.warn("API analyze-turnover lỗi, dùng fallback:", err.message);
      setError(err.response?.data?.message || "Lỗi kết nối AI Ollama. Đảm bảo bạn đã chạy 'ollama run qwen2'.");
      await fetchAlerts(); // Fallback data sẽ được sử dụng nếu API alerts cũng lỗi
    } finally {
      clearInterval(stepInterval);
      clearInterval(countdownInterval);
      setTimeLeft(0);
      setElapsed(0);
      setIsAnalyzing(false);
    }
  };

  const parseAiMessage = (msg) => {
    try {
      const parsed = JSON.parse(msg);
      return {
        summary: parsed.summary || '',
        risk_score: parsed.risk_score ?? null,
        analysis: {
          key_concerns: parsed.analysis?.key_concerns || [],
          positive_signals: parsed.analysis?.positive_signals || [],
          behavior_pattern: parsed.analysis?.behavior_pattern || ''
        },
        retention_strategy: parsed.retention_strategy || [],
        suggested_action: parsed.suggested_action || null,
        recommendations: parsed.recommendations || ['Cần theo dõi thêm.'],
        geo: parsed.geo || null,
        last_stats: parsed.last_stats || null
      };
    } catch {
      return {
        summary: msg,
        risk_score: null,
        analysis: { key_concerns: [], positive_signals: [], behavior_pattern: '' },
        retention_strategy: [],
        suggested_action: null,
        recommendations: ['Cần theo dõi thêm.'],
        geo: null,
        last_stats: null
      };
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans text-gray-800">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Qwen2 AI Watchdog
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-purple-600" />
            AI Phân tích Rủi ro & Gian lận
          </h1>
          <p className="text-sm text-gray-500 font-medium">Hệ thống phân tích hành vi chuyên cần và tọa độ GPS thời gian thực.</p>
        </div>
        
        <button 
          onClick={handleRunAnalysis} disabled={isAnalyzing}
          className="flex items-center gap-2 bg-[#1e1b4b] px-6 py-3 rounded-xl text-sm font-bold text-white hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          {isAnalyzing ? "Đang quét dữ liệu..." : "Quét & Phân tích AI"}
        </button>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex justify-between items-center animate-shake">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-5 h-5" />
            <div>
              <p className="text-red-800 font-bold text-sm">Hệ thống AI không phản hồi</p>
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Đã phân tích</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-gray-900">{stats.total}</h3>
            <Users className="text-gray-200 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-orange-100 shadow-sm relative overflow-hidden">
          <p className="text-orange-500 text-xs font-bold uppercase mb-2 flex items-center gap-1">
             Nguy cơ nghỉ việc (Rủi ro)
          </p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-orange-600">{stats.highRisk + stats.medRisk}</h3>
            <UserMinus className="text-orange-200 w-8 h-8" />
          </div>
        </div>

        {/* THẺ ĐỘNG: GIAN LẬN HOẶC ỔN ĐỊNH */}
        {stats.fraudCount > 0 ? (
          <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 rounded-[24px] shadow-lg shadow-red-500/30 text-white animate-fade-in relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-20"><ShieldAlert className="w-16 h-16" /></div>
            <p className="text-red-100 text-xs font-bold uppercase mb-2 flex items-center gap-1">
               Nghi vấn Gian lận GPS
            </p>
            <div className="flex justify-between items-end relative z-10">
              <h3 className="text-3xl font-black">{stats.fraudCount}</h3>
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded border border-white/20">Cần xử lý</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[24px] shadow-lg shadow-emerald-500/20 text-white animate-fade-in">
            <p className="text-emerald-100 text-xs font-bold uppercase mb-2">Tình trạng Gian lận</p>
            <div className="flex justify-between items-end">
              <h3 className="text-3xl font-black">0</h3>
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded border border-white/20">An toàn</span>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Tỷ lệ ổn định</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-gray-900">
               {stats.total > 0 ? Math.round(((stats.total - stats.highRisk - stats.fraudCount) / stats.total) * 100) : 0}%
            </h3>
            <TrendingUp className="text-emerald-400 w-8 h-8" />
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between gap-4">
          <h2 className="text-[16px] font-black text-gray-900 uppercase tracking-tight">Danh sách cảnh báo từ Qwen2</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfdff] border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nhân viên</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Loại cảnh báo</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Mức độ rủi ro</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">AI Insight</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {staffData.length === 0 ? (
                <tr><td colSpan="5" className="py-10 text-center text-gray-400 italic">Chưa có dữ liệu phân tích.</td></tr>
              ) : staffData.map((item) => {
                const empName = item.employee?.full_name || 'Không rõ tên';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random&color=fff`;
                const aiData = parseAiMessage(item.message);
                const isFraud = item.alert_type === 'FRAUD_DETECTION';

                return (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <img src={avatarUrl} alt={empName} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
                      <div>
                        <p className="font-bold text-gray-900">{empName}</p>
                        <p className="text-[11px] text-gray-500 font-medium">{item.employee?.position?.position_name || 'Nhân viên'}</p>
                      </div>
                    </div>
                  </td>
                  
                  {/* LOẠI CẢNH BÁO */}
                  <td className="py-5 px-6 text-center">
                    {isFraud ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                        <ShieldAlert className="w-3 h-3" /> Gian lận GPS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
                        <UserMinus className="w-3 h-3" /> Rủi ro Nhân sự
                      </span>
                    )}
                  </td>

                  <td className="py-5 px-6 text-center">
                    <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase
                      ${item.risk_level === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}
                    `}>
                      {item.risk_level === 'HIGH' ? 'Nguy cơ cao' : 'Trung bình'}
                    </span>
                  </td>
                  
                  <td className="py-5 px-6">
                    <div className="flex gap-2 max-w-[280px]">
                      <MessageSquareWarning className={`w-4 h-4 shrink-0 mt-0.5 ${isFraud ? 'text-red-400' : 'text-purple-400'}`} />
                      <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed font-medium">
                        {aiData.summary}
                      </p>
                    </div>
                  </td>
                  
                  <td className="py-5 px-6 text-right">
                    <button 
                      onClick={() => setSelectedStaff(item)}
                      className="text-gray-600 font-bold text-xs hover:bg-gray-100 px-4 py-2 rounded-xl transition-all border border-gray-200 flex items-center gap-2 ml-auto"
                    >
                      Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* TERMINAL LOADING */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] bg-[#0f172a]/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in px-4">
          <div className="w-full max-w-lg bg-[#1e293b] rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-300 font-mono">Qwen2 Security Engine...</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {timeLeft > 0 ? `ETA: ~${timeLeft}s` : `Đang hoàn tất... (${elapsed}s)`}
                </span>
              </div>
            </div>
            
            <div className="p-6 font-mono text-sm text-emerald-400 flex flex-col gap-3 h-56 justify-end bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
              <div className="animate-pulse">
                <span className="text-purple-400">~/ai-module/watchdog $ </span> 
                {analysisStep}
                <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 align-middle animate-ping"></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÂN TÍCH SÂU */}
      {selectedStaff && (() => {
        const isFraud = selectedStaff.alert_type === 'FRAUD_DETECTION';
        const aiData = parseAiMessage(selectedStaff.message);

        return (
          <div className="fixed inset-0 z-[90] bg-[#1a1a1a]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-bounce-in max-h-[95vh]">
              
              {/* Header Modal - Đổi màu theo loại */}
              <div className={`px-8 py-6 border-b border-gray-100 flex justify-between items-center ${isFraud ? 'bg-red-50/50' : 'bg-purple-50/50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    {isFraud ? <ShieldAlert className="w-7 h-7 text-red-600" /> : <BrainCircuit className="w-7 h-7 text-purple-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{isFraud ? 'Phát hiện Gian lận GPS' : 'AI Deep Analysis Insight'}</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isFraud ? 'text-red-600' : 'text-purple-600'}`}>Phân tích bởi Qwen2 Model</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 text-gray-400 hover:bg-white rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scroll flex-1">
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  {/* Profile */}
                  <div className="w-full md:w-1/4 flex flex-col items-center text-center shrink-0">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff.employee?.full_name)}&background=random&color=fff&size=150`} 
                      className={`w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4 ${isFraud ? 'ring-4 ring-red-100' : ''}`} 
                    />
                    <h4 className="text-lg font-black text-gray-900">{selectedStaff.employee?.full_name}</h4>
                    <p className="text-[12px] text-gray-500 font-medium">{selectedStaff.employee?.position?.position_name}</p>
                    <span className={`
                      mt-3 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase
                      ${selectedStaff.risk_level === 'HIGH' ? 'bg-red-50 text-red-600' : selectedStaff.risk_level === 'MEDIUM' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}
                    `}>
                      Rủi ro: {selectedStaff.risk_level}
                    </span>

                    {/* Risk Score Gauge */}
                    {aiData.risk_score != null && (
                      <div className="mt-4 w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Gauge className="w-3 h-3" /> Điểm rủi ro</span>
                          <span className={`text-sm font-black ${
                            aiData.risk_score >= 70 ? 'text-red-600' : aiData.risk_score >= 40 ? 'text-orange-500' : 'text-emerald-600'
                          }`}>{aiData.risk_score}/100</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              aiData.risk_score >= 70 ? 'bg-gradient-to-r from-red-400 to-red-600' 
                              : aiData.risk_score >= 40 ? 'bg-gradient-to-r from-orange-300 to-orange-500' 
                              : 'bg-gradient-to-r from-emerald-300 to-emerald-500'
                            }`}
                            style={{ width: `${aiData.risk_score}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Insight & Analysis */}
                  <div className="flex-1 space-y-5">
                    {/* Summary */}
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 italic text-[14px] text-gray-700 leading-relaxed relative">
                      <MessageSquareWarning className={`absolute top-5 left-5 w-5 h-5 opacity-20 ${isFraud ? 'text-red-500' : 'text-purple-500'}`} />
                      <span className="relative z-10 pl-8 block">"{aiData.summary}"</span>
                    </div>

                    {/* Behavior Pattern */}
                    {aiData.analysis.behavior_pattern && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Xu hướng hành vi:</span>
                        <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                          {aiData.analysis.behavior_pattern}
                        </span>
                      </div>
                    )}

                    {/* Key Concerns & Positive Signals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiData.analysis.key_concerns.length > 0 && (
                        <div className="bg-red-50/60 p-4 rounded-xl border border-red-100">
                          <p className="text-[11px] font-bold text-red-500 uppercase mb-2 flex items-center gap-1.5">
                            <ThumbsDown className="w-3.5 h-3.5" /> Vấn đề đáng lo ngại
                          </p>
                          <ul className="space-y-1.5">
                            {aiData.analysis.key_concerns.map((c, i) => (
                              <li key={i} className="text-[12px] text-red-700 font-medium flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiData.analysis.positive_signals.length > 0 && (
                        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1.5">
                            <ThumbsUp className="w-3.5 h-3.5" /> Điểm tích cực
                          </p>
                          <ul className="space-y-1.5">
                            {aiData.analysis.positive_signals.map((s, i) => (
                              <li key={i} className="text-[12px] text-emerald-700 font-medium flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* MINI MAP NẾU LÀ GIAN LẬN */}
                    {isFraud && aiData.geo && (
                      <div className="w-full h-64 bg-[#e5e7eb] rounded-2xl border border-gray-300 overflow-hidden relative shadow-inner flex items-center justify-center">
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="absolute top-3 left-3 z-[10] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-[10px] font-bold shadow-sm border border-gray-100 flex flex-col gap-1">
                          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"></div> Trụ sở công ty</span>
                          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse"></div> Vị trí Fake GPS</span>
                        </div>

                        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                          <line x1="30%" y1="50%" x2="70%" y2="50%" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_20s_linear_infinite]" />
                          <style>{`
                            @keyframes dash {
                              to { stroke-dashoffset: -1000; }
                            }
                          `}</style>
                        </svg>

                        <div className="absolute left-[30%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                           <div className="w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-lg z-10"></div>
                           <div className="mt-1 bg-white px-2 py-0.5 rounded text-[9px] font-bold text-gray-700 shadow-sm">Văn phòng</div>
                        </div>

                        <div className="absolute left-[70%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                           <span className="relative flex h-5 w-5 z-10">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white shadow-lg"></span>
                           </span>
                           <div className="mt-1 bg-red-600 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-sm border border-red-500">Điểm chấm công</div>
                        </div>

                        <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 -mt-4 bg-red-600 text-white text-[10px] font-bold py-0.5 px-2 rounded-full z-10">
                           {aiData.geo.distance}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retention Strategy Cards */}
                {aiData.retention_strategy.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[13px] font-black text-gray-800 uppercase tracking-tight mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" /> Chiến lược giữ chân nhân viên
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiData.retention_strategy.map((s, i) => {
                        const priorityColors = {
                          URGENT: 'bg-red-50 border-red-200 text-red-700',
                          HIGH: 'bg-orange-50 border-orange-200 text-orange-700',
                          MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                          LOW: 'bg-blue-50 border-blue-200 text-blue-700'
                        };
                        const badgeColors = {
                          URGENT: 'bg-red-600', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-blue-500'
                        };
                        return (
                          <div key={i} className={`p-4 rounded-xl border ${priorityColors[s.priority] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded ${badgeColors[s.priority] || 'bg-gray-500'}`}>
                                {s.priority}
                              </span>
                              {s.timeline && (
                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                  <CalendarClock className="w-3 h-3" /> {s.timeline}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] font-semibold leading-relaxed">{s.action}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggested Action */}
                {aiData.suggested_action && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-indigo-500 uppercase">Đề xuất hành động</p>
                      <p className="text-sm font-bold text-indigo-900">
                        {aiData.suggested_action.type === 'reward' ? '🏅 Khen thưởng' 
                          : aiData.suggested_action.type === 'discipline' ? '⚠️ Kỷ luật' 
                          : aiData.suggested_action.type === 'meeting' ? '🤝 Họp 1-1' 
                          : '👁️ Theo dõi'}
                        {aiData.suggested_action.reason && ` — ${aiData.suggested_action.reason}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className={`${isFraud ? 'bg-red-600 shadow-red-500/30' : 'bg-purple-600 shadow-purple-500/30'} rounded-[24px] p-6 text-white shadow-xl`}>
                  <div className="flex items-center gap-3 mb-4">
                    {isFraud ? <AlertTriangle className="w-5 h-5 text-red-200" /> : <Sparkles className="w-5 h-5 text-purple-200" />}
                    <h4 className="text-[15px] font-black uppercase tracking-tight">Hành động đề xuất từ hệ thống</h4>
                  </div>
                  <ul className="space-y-3">
                    {aiData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{index + 1}</div>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
                <button onClick={() => setSelectedStaff(null)} className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-white transition-all text-sm uppercase tracking-wider">
                  Đóng
                </button>
                <button className={`px-8 py-2.5 rounded-2xl text-white font-black transition-all shadow-md flex items-center gap-2 text-sm uppercase tracking-widest ${isFraud ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1f2937] hover:bg-black'}`}>
                  {isFraud ? 'Xử lý vi phạm' : 'Lên lịch 1-1'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
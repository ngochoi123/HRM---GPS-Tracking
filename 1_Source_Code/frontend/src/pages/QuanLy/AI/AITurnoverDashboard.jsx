import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BrainCircuit, AlertTriangle, TrendingDown, TrendingUp, Users, Search, 
  ChevronRight, Clock, Gavel, Medal, Sparkles, ArrowRight,
  Info, MessageSquareWarning, RefreshCw, X, Terminal
} from 'lucide-react';

export default function AITurnoverDashboard() {
  const [staffData, setStaffData] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(''); // Lưu trạng thái thinking của AI
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    total: 0, highRisk: 0, medRisk: 0, lowRisk: 0
  });

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/ai/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data;
      setStaffData(data);
      setStats({
        total: data.length,
        highRisk: data.filter(i => i.risk_level === 'HIGH').length,
        medRisk: data.filter(i => i.risk_level === 'MEDIUM').length,
        lowRisk: data.filter(i => i.risk_level === 'LOW').length
      });
    } catch (err) {
      console.error("Lỗi tải dữ liệu cảnh báo:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    // Giả lập các bước suy nghĩ của AI
    const steps = [
      "Khởi tạo kết nối bảo mật đến Database...",
      "Trích xuất dữ liệu chấm công 30 ngày qua...",
      "Tổng hợp biên bản khen thưởng & kỷ luật...",
      "Ollama (Qwen2) đang đánh giá hành vi nhân sự...",
      "Đang khởi tạo các đề xuất cá nhân hóa...",
      "Hoàn tất! Đang đồng bộ lên Dashboard..."
    ];
    let stepIndex = 0;
    setAnalysisStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex++;
      if(stepIndex < steps.length) setAnalysisStep(steps[stepIndex]);
    }, 2000);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/ai/analyze-turnover', 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        await fetchAlerts();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi kết nối AI Ollama. Đảm bảo bạn đã chạy 'ollama run qwen2'.");
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  const handleDeepAnalysis = (staff) => {
    setSelectedStaff(staff);
  };

  // Helper function để đọc JSON từ cột message của database
  const parseAiMessage = (msg) => {
    try {
      return JSON.parse(msg);
    } catch {
      // Tương thích ngược với các record cũ chỉ có text
      return { summary: msg, recommendations: ["Cần tổ chức họp 1-1 để theo dõi thêm."] };
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-gray-800">
      
      {/* HEADER SECTION */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-purple-600" />
            Dự đoán rủi ro nghỉ việc
          </h1>
          <p className="text-sm text-gray-500 font-medium">Hệ thống phân tích dữ liệu chuyên cần & kỷ luật thời gian thực.</p>
        </div>
        
        <button 
          onClick={handleRunAnalysis} disabled={isAnalyzing}
          className="flex items-center gap-2 bg-purple-600 px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-purple-700 disabled:bg-purple-300 transition-all shadow-lg"
        >
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isAnalyzing ? "Đang phân tích..." : "Làm mới dữ liệu AI"}
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
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Tổng nhân sự</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-gray-900">{stats.total}</h3>
            <Users className="text-gray-200 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <p className="text-red-500 text-xs font-bold uppercase mb-2">Rủi ro Cao</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-red-600">{stats.highRisk}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
          <p className="text-orange-500 text-xs font-bold uppercase mb-2">Rủi ro TB</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-orange-600">{stats.medRisk}</h3>
          </div>
        </div>

        <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg shadow-emerald-500/20 text-white">
          <p className="text-emerald-100 text-xs font-bold uppercase mb-2">Chỉ số ổn định</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black">
              {stats.total > 0 ? Math.round((stats.lowRisk / stats.total) * 100) : 0}%
            </h3>
            <TrendingUp className="w-8 h-8 text-white/50" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: RISK LIST */}
      <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between gap-4">
          <h2 className="text-[16px] font-black text-gray-900 uppercase tracking-tight">Danh sách cảnh báo từ Qwen2 Model</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfdff] border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nhân viên</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Mức độ rủi ro</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">AI Insight</th>
                <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {staffData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-400 italic">Chưa có dữ liệu phân tích. Hãy nhấn "Làm mới dữ liệu AI".</td>
                </tr>
              ) : staffData.map((item) => {
                const empName = item.employee?.full_name || 'Không rõ tên';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=random&color=fff`;
                const aiData = parseAiMessage(item.message);

                return (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <img src={avatarUrl} alt={empName} className="w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
                      <div>
                        <p className="font-bold text-gray-900">{empName}</p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {item.employee?.position?.position_name || 'Nhân viên'}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-5 px-6 text-center">
                    <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase
                      ${item.risk_level === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : 
                        item.risk_level === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                        'bg-emerald-50 text-emerald-600 border border-emerald-100'}
                    `}>
                      {item.risk_level === 'HIGH' ? 'Nguy cơ cao' : item.risk_level === 'MEDIUM' ? 'Trung bình' : 'Ổn định'}
                    </span>
                  </td>
                  
                  <td className="py-5 px-6">
                    <div className="flex gap-2 max-w-[350px]">
                      <MessageSquareWarning className={`w-4 h-4 shrink-0 mt-0.5 ${item.risk_level === 'HIGH' ? 'text-red-400' : 'text-gray-300'}`} />
                      <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed font-medium">
                        {aiData.summary}
                      </p>
                    </div>
                  </td>
                  
                  <td className="py-5 px-6 text-right">
                    <button 
                      onClick={() => handleDeepAnalysis(item)}
                      className="text-purple-600 font-bold text-xs hover:bg-purple-50 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-purple-100 flex items-center gap-2 ml-auto"
                    >
                      Phân tích sâu <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOADING OVERLAY VỚI TERMINAL UI (Tiến trình AI) */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] bg-[#0f172a]/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-lg bg-[#1e293b] rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <div className="bg-[#0f172a] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 font-mono">Qwen2 Engine is thinking...</span>
            </div>
            <div className="p-6 font-mono text-sm text-emerald-400 flex flex-col gap-3 h-48 justify-end">
              <div className="animate-pulse">
                <span className="text-purple-400">~/ai-module/turnover-prediction $ </span> 
                {analysisStep}
                <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 align-middle animate-ping"></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: AI ANALYSIS INSIGHT */}
      {selectedStaff && (
        <div className="fixed inset-0 z-[90] bg-[#1a1a1a]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-bounce-in max-h-[90vh]">
            
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <BrainCircuit className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">AI Deep Analysis Insight</h3>
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">Phân tích bởi Qwen2 Model</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="p-2 text-gray-400 hover:text-red-500 bg-white border border-gray-100 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scroll">
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="w-full md:w-1/3 flex flex-col items-center text-center">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff.employee?.full_name)}&background=random&color=fff&size=150`} 
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4" 
                  />
                  <h4 className="text-lg font-black text-gray-900">{selectedStaff.employee?.full_name}</h4>
                  <span className={`
                    mt-3 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase
                    ${selectedStaff.risk_level === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
                  `}>
                    Rủi ro: {selectedStaff.risk_level}
                  </span>
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lý do chấm điểm rủi ro:</h5>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 italic text-[14px] text-gray-700 leading-relaxed">
                      "{parseAiMessage(selectedStaff.message).summary}"
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation Box - CÁ NHÂN HÓA */}
              <div className="bg-purple-600 rounded-[24px] p-6 text-white shadow-xl shadow-purple-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  <h4 className="text-[15px] font-black uppercase tracking-tight">Hành động gợi ý từ AI</h4>
                </div>
                <ul className="space-y-3">
                  {parseAiMessage(selectedStaff.message).recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm font-medium">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{index + 1}</div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
              <button onClick={() => setSelectedStaff(null)} className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-white transition-all text-sm uppercase tracking-wider">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMAND BACKUP */}
      <div className="max-w-6xl mx-auto mt-10 p-6 bg-gray-100/50 rounded-2xl border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
            <Info className="w-4 h-4" /> Hệ thống dự phòng & Bảo mật
          </p>
          <p className="text-[13px] text-gray-600 font-medium mt-1 italic">
            Dữ liệu AI được xử lý Local qua Ollama. Khuyến nghị backup database định kỳ.
          </p>
        </div>
        <div className="bg-black/90 p-4 rounded-xl shadow-inner w-full md:w-auto">
          <code className="text-[11px] text-gray-300 font-mono break-all">
            & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -p 5432 -d attendance_db -f backup.sql
          </code>
        </div>
      </div>
    </div>
  );
}
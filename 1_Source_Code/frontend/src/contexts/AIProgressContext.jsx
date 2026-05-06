import React, { createContext, useState, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';

const AIProgressContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAIProgress = () => useContext(AIProgressContext);

export function AIProgressProvider({ children }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState([]);
  const [error, setError] = useState(null);

  const runAIAnalysis = useCallback(async (onCompleteCallback) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setBatchLogs([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
    
    const token = localStorage.getItem('token');
    
    // Tạo Toast hiển thị Global (không bị gián đoạn khi chuyển trang)
    const toastId = toast.loading('AI bắt đầu quét dữ liệu...', { duration: Infinity });

    try {
      const response = await fetch('http://localhost:5000/api/ai/analyze-stream', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let currentCount = 0;
      let totalCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Giữ lại phần dư chưa parse được
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'start') {
              totalCount = event.total;
              setProgress({ current: 0, total: totalCount });
              toast.loading(`AI đang phân tích: 0/${totalCount} nhân viên`, { id: toastId });
              setBatchLogs(prev => [...prev, { type: 'start', text: `📅 Phân tích tháng ${event.month} — ${event.pastWorkingDays} ngày làm việc đã qua. Tổng ${event.total} nhân viên.` }]);
            } else if (event.type === 'batch_start') {
              setBatchLogs(prev => [...prev, { type: 'pending', text: `⏳ [${event.batchNum}/${event.totalBatches}] Đang phân tích: ${event.name} (Vắng: ${event.absentCount} ngày)...` }]);
            } else if (event.type === 'batch_done') {
              currentCount = event.batchNum;
              setProgress({ current: currentCount, total: totalCount });
              toast.loading(`AI đang phân tích: ${currentCount}/${totalCount} nhân viên`, { id: toastId });
              
              const riskColor = event.risk === 'HIGH' ? 'high' : event.risk === 'MEDIUM' ? 'medium' : 'low';
              setBatchLogs(prev => [...prev, { type: 'done', risk: riskColor, text: `✅ [${event.batchNum}/${event.totalBatches}] ${event.name}: ${event.risk}${event.risk_score != null ? ` (Score: ${event.risk_score})` : ''}` }]);
            } else if (event.type === 'batch_error') {
              currentCount = event.batchNum;
              setProgress({ current: currentCount, total: totalCount });
              toast.loading(`AI đang phân tích: ${currentCount}/${totalCount} nhân viên`, { id: toastId });
              setBatchLogs(prev => [...prev, { type: 'error', text: `❌ [${event.batchNum}/${event.totalBatches}] Lỗi ${event.name}: ${event.message}` }]);
            } else if (event.type === 'complete') {
              toast.success(`🎉 Phân tích hoàn tất ${event.total} nhân viên!`, { id: toastId, duration: 5000 });
              setBatchLogs(prev => [...prev, { type: 'complete', text: `🎉 Hoàn tất! Đã phân tích ${event.total} nhân viên. Đang tải dữ liệu...` }]);
              if (onCompleteCallback) onCompleteCallback();
            } else if (event.type === 'error') {
              toast.error(`Lỗi hệ thống: ${event.message}`, { id: toastId, duration: 5000 });
              setError(event.message);
              setBatchLogs(prev => [...prev, { type: 'error', text: `❌ Lỗi hệ thống: ${event.message}` }]);
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        }
      }
    } catch (err) {
      toast.error('Lỗi kết nối tới AI Server.', { id: toastId, duration: 5000 });
      setError(err.message || 'Lỗi kết nối SSE.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  return (
    <AIProgressContext.Provider value={{ isAnalyzing, progress, batchLogs, error, runAIAnalysis }}>
      {children}
    </AIProgressContext.Provider>
  );
}

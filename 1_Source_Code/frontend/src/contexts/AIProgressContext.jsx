/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import React, { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const AIProgressContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAIProgress = () => useContext(AIProgressContext);

export function AIProgressProvider({ children }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState([]);
  const [error, setError] = useState(null);

  // === STATE TOÀN CỤC — tồn tại xuyên suốt khi chuyển trang ===
  // analyzedList: danh sách NV đã được AI phân tích (hiển thị real-time)
  const [analyzedList, setAnalyzedList] = useState([]);

  // Refs để tránh stale closure trong async loop
  const abortControllerRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  // ── Dừng phân tích ──
  const stopAIAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
  }, []);

  // ── Abort khi unmount hoàn toàn (tắt trình duyệt) ──
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ── Tự dừng khi mất token (đăng xuất) ──
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (!token && isAnalyzingRef.current) {
        stopAIAnalysis();
        setBatchLogs(prev => [...prev, { type: 'error', text: '⛔ Đã đăng xuất. Dừng phân tích.' }]);
      }
    };
    const interval = setInterval(checkToken, 2000);
    window.addEventListener('storage', checkToken);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkToken);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hàm thay thế toàn bộ danh sách sau khi hoàn tất (dùng khi fetchAlerts xong) ──
  const setFinalAnalyzedList = useCallback((fullAlerts) => {
    setAnalyzedList(fullAlerts);
  }, []);

  const runAIAnalysis = useCallback(async (onCompleteCallback) => {
    if (isAnalyzingRef.current) return;

    // === RESET STATE CŨ khi bắt đầu phân tích mới ===
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalyzedList([]);     // Xóa danh sách cũ
    setBatchLogs([]);
    setError(null);
    setProgress({ current: 0, total: 0 });

    const token = localStorage.getItem('token');
    if (!token) {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const toastId = toast.loading('AI bắt đầu quét dữ liệu...', { duration: Infinity });

    try {
      const response = await fetch('http://localhost:5000/api/ai/analyze-stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
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
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'start') {
              totalCount = event.total;
              setProgress({ current: 0, total: totalCount });
              toast.loading(`AI đang phân tích: 0/${totalCount} nhân viên`, { id: toastId });
              setBatchLogs(prev => [
                ...prev,
                { type: 'start', text: `📅 Phân tích tháng ${event.month} — ${event.pastWorkingDays} ngày làm việc đã qua. Tổng ${event.total} nhân viên.` },
              ]);

            } else if (event.type === 'batch_start') {
              setBatchLogs(prev => [
                ...prev,
                { id: `batch-${event.batchNum}`, type: 'pending', text: `⏳ [${event.batchNum}/${event.totalBatches}] Đang phân tích: ${event.name}...` },
              ]);

            } else if (event.type === 'batch_done') {
              currentCount = event.batchNum;
              setProgress({ current: currentCount, total: totalCount });
              toast.loading(`AI đang phân tích: ${currentCount}/${totalCount} nhân viên`, { id: toastId });

              const riskColor = event.risk === 'HIGH' ? 'high' : event.risk === 'MEDIUM' ? 'medium' : 'low';

              // Cập nhật log
              setBatchLogs(prev =>
                prev.map(log =>
                  log.id === `batch-${event.batchNum}`
                    ? {
                        ...log,
                        type: 'done',
                        risk: riskColor,
                        text: `✅ [${event.batchNum}/${event.totalBatches}] ${event.name}: ${event.risk}${event.risk_score != null ? ` (Score: ${event.risk_score})` : ''}`,
                      }
                    : log
                )
              );

              // === CẬP NHẬT DANH SÁCH THỜI GIAN THỰC ===
              // Thêm NV vừa xong vào analyzedList để hiển thị ngay trên bảng
              setAnalyzedList(prev => [
                ...prev,
                {
                  id: `streaming-${event.batchNum}`,
                  _isStreaming: true, // flag để phân biệt dữ liệu tạm với dữ liệu DB
                  alert_type: 'TURNOVER_RISK',
                  risk_level: event.risk,
                  message: JSON.stringify({
                    summary: event.risk_score != null
                      ? `Điểm rủi ro: ${event.risk_score}/100`
                      : 'Đang tải chi tiết...',
                    recommendations: [],
                    risk_score: event.risk_score,
                  }),
                  employee: {
                    full_name: event.name,
                    position: { position_name: '' },
                  },
                },
              ]);

            } else if (event.type === 'batch_error') {
              currentCount = event.batchNum;
              setProgress({ current: currentCount, total: totalCount });
              toast.loading(`AI đang phân tích: ${currentCount}/${totalCount} nhân viên`, { id: toastId });
              setBatchLogs(prev =>
                prev.map(log =>
                  log.id === `batch-${event.batchNum}`
                    ? { ...log, type: 'error', text: `❌ [${event.batchNum}/${event.totalBatches}] Lỗi ${event.name}: ${event.message}` }
                    : log
                )
              );

            } else if (event.type === 'complete') {
              toast.success(`🎉 Phân tích hoàn tất ${event.total} nhân viên!`, { id: toastId, duration: 5000 });
              setBatchLogs(prev => [
                ...prev,
                { type: 'complete', text: `🎉 Hoàn tất! Đã phân tích ${event.total} nhân viên. Đang tải dữ liệu đầy đủ...` },
              ]);
              // Gọi callback để fetch dữ liệu đầy đủ từ DB thay thế dữ liệu streaming
              if (onCompleteCallback) onCompleteCallback();

            } else if (event.type === 'error') {
              toast.error(`Lỗi hệ thống: ${event.message}`, { id: toastId, duration: 5000 });
              setError(event.message);
              setBatchLogs(prev => [...prev, { type: 'error', text: `❌ Lỗi hệ thống: ${event.message}` }]);
            }
          } catch (parseErr) {
            console.error('Error parsing SSE event:', parseErr);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.dismiss(toastId);
        setBatchLogs(prev => [...prev, { type: 'error', text: '⛔ Đã dừng phân tích.' }]);
        // Khi dừng giữa chừng: vẫn giữ lại những NV đã quét xong
      } else {
        toast.error('Lỗi kết nối tới AI Server.', { id: toastId, duration: 5000 });
        setError(err.message || 'Lỗi kết nối SSE.');
        setBatchLogs(prev => [...prev, { type: 'error', text: `❌ Lỗi kết nối: ${err.message}` }]);
      }
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, []);

  return (
    <AIProgressContext.Provider
      value={{
        isAnalyzing,
        progress,
        batchLogs,
        error,
        analyzedList,
        setFinalAnalyzedList,
        runAIAnalysis,
        stopAIAnalysis,
      }}
    >
      {children}
    </AIProgressContext.Provider>
  );
}

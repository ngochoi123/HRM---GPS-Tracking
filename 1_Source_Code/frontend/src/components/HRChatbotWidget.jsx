import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, X, Send, Loader2, Sparkles, User,
  Minimize2, MessageSquareDashed, RefreshCw
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

// ─── Hằng số ───
const INITIAL_BOT_MSG = {
  role: 'ai',
  content: 'Chào bạn! Tôi là **Trợ lý Nhân sự ảo**. Bạn có thể hỏi tôi về:\n• 📅 Ngày phép còn lại\n• ⏱️ Lịch sử chấm công\n• 💰 Thông tin lương\n• 📋 Quy chế, thủ tục nhân sự',
};

// ─── Helper: chuyển đổi role hiển thị ↔ role API ───
// Nội bộ component dùng 'ai' để render, API dùng 'assistant'
// Tin nhắn lỗi (isError: true) KHÔNG được gửi lên API — chỉ hiển thị cho user
const toApiMessages = (msgs) =>
  msgs
    .filter((m) => (m.role === 'user' || m.role === 'ai') && !m.isError)
    .map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));

// ─── Helper: render text có **bold** markdown đơn giản ───
function renderContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Xuống dòng theo \n
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

// ─── Gợi ý câu hỏi nhanh ───
const QUICK_QUESTIONS = [
  'Tôi còn bao nhiêu ngày phép?',
  'Tháng này tôi đi trễ mấy lần?',
  'Lương cơ bản của tôi là bao nhiêu?',
  'Quy trình xin nghỉ phép như thế nào?',
];

// ════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ════════════════════════════════════════════════════
export default function HRChatbotWidget() {
  // Chỉ hiển thị cho EMPLOYEE
  // ─── Tất cả hooks phải được khai báo trước bất kỳ early return nào ───
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([INITIAL_BOT_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true); // Chấm đỏ ban đầu
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      // Focus input khi mở
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isMinimized, scrollToBottom]);

  // ─── Gửi tin nhắn (useCallback phải nằm trước guard) ───
  const handleSend = useCallback(async (e, quickText) => {
    e?.preventDefault();
    const text = (quickText || input).trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const apiPayload = { messages: toApiMessages(updatedHistory) };
      const data = await axiosClient.post('/chat', apiPayload);
      const replyContent = data?.reply || 'Xin lỗi, tôi không nhận được phản hồi. Vui lòng thử lại!';
      setMessages((prev) => [...prev, { role: 'ai', content: replyContent }]);
    } catch (err) {
      console.error('[HRChatbot] Lỗi:', err);
      const errMsg =
        err?.response?.status === 503
          ? '⚠️ AI đang khởi động, vui lòng thử lại sau 30 giây.'
          : err?.response?.status === 403
          ? '⚠️ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
          : '⚠️ Hệ thống AI đang bảo trì, bạn đợi một lát nhé!';
      // isError: true → bị lọc ra khi gửi lịch sử lên API lần tiếp theo
      setMessages((prev) => [...prev, { role: 'ai', content: errMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  // ─── RBAC Guard: sau TẤT CẢ hooks (bao gồm cả useCallback) ───
  const userString = localStorage.getItem('user');
  const currentUser = userString ? JSON.parse(userString) : null;
  const userRole = (currentUser?.role || '').toUpperCase();
  if (userRole !== 'EMPLOYEE') return null;

  // ─── Handlers không dùng hook — khai báo sau guard là hợp lệ ───
  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleReset = () => {
    setMessages([INITIAL_BOT_MSG]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════
  return (
    <>
      {/* ─── Keyframe animations (inject 1 lần) ─── */}
      <style>{`
        @keyframes hr-pop-in {
          0% { opacity: 0; transform: scale(0.92) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes hr-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes hr-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .hr-chat-window { animation: hr-pop-in 0.25s ease-out forwards; }
        .hr-fab-pulse { animation: hr-pulse-ring 2.4s ease-in-out infinite; }
        .hr-dot { animation: hr-dot-bounce 1.2s ease-in-out infinite; }
        .hr-dot:nth-child(2) { animation-delay: 0.18s; }
        .hr-dot:nth-child(3) { animation-delay: 0.36s; }
        .hr-scrollbar::-webkit-scrollbar { width: 4px; }
        .hr-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hr-scrollbar::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }
      `}</style>

      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ════ CHAT WINDOW ════ */}
        {isOpen && (
          <div
            className="hr-chat-window"
            style={{
              position: 'absolute',
              bottom: '72px',
              right: 0,
              width: '380px',
              height: isMinimized ? '64px' : '520px',
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(109,40,217,0.18), 0 4px 16px rgba(0,0,0,0.10)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(139,92,246,0.15)',
              transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* ─── Header ─── */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              borderRadius: isMinimized ? '20px' : '20px 20px 0 0',
            }}>
              {/* Left: Avatar + Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid rgba(255,255,255,0.4)',
                  flexShrink: 0,
                }}>
                  <Bot size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', lineHeight: 1.2 }}>
                    HR Assistant
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Sparkles size={9} />
                    <span>Qwen2.5 · Chỉ dành cho bạn</span>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', marginLeft: '4px', display: 'inline-block' }} />
                  </div>
                </div>
              </div>

              {/* Right: Action buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={handleReset}
                  title="Bắt đầu lại cuộc hội thoại"
                  style={headerBtnStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <RefreshCw size={15} color="rgba(255,255,255,0.85)" />
                </button>
                <button
                  onClick={() => setIsMinimized((p) => !p)}
                  title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                  style={headerBtnStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Minimize2 size={15} color="rgba(255,255,255,0.85)" />
                </button>
                <button
                  onClick={handleClose}
                  title="Đóng"
                  style={headerBtnStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={15} color="rgba(255,255,255,0.85)" />
                </button>
              </div>
            </div>

            {/* ─── Body (hidden when minimized) ─── */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div
                  className="hr-scrollbar"
                  style={{
                    flex: 1, overflowY: 'auto',
                    padding: '16px 14px 8px',
                    background: '#f8f7ff',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                  }}
                >
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '8px', maxWidth: '88%', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>

                          {/* Avatar */}
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: isUser ? '#e0e7ff' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isUser
                              ? <User size={15} color="#4f46e5" />
                              : <Bot size={15} color="#fff" />
                            }
                          </div>

                          {/* Bubble */}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                            fontSize: '13px',
                            lineHeight: 1.65,
                            background: isUser
                              ? 'linear-gradient(135deg,#6d28d9,#4338ca)'
                              : '#fff',
                            color: isUser ? '#fff' : '#374151',
                            boxShadow: isUser
                              ? '0 2px 8px rgba(109,40,217,0.25)'
                              : '0 1px 4px rgba(0,0,0,0.07)',
                            border: isUser ? 'none' : '1px solid #ede9fe',
                            whiteSpace: 'pre-wrap',
                          }}>
                            {renderContent(msg.content)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick questions (chỉ hiện khi chỉ có tin nhắn chào) */}
                  {messages.length === 1 && !isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af', paddingLeft: '38px' }}>Gợi ý câu hỏi:</span>
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={(e) => handleSend(e, q)}
                          style={{
                            marginLeft: '38px',
                            background: '#ede9fe',
                            border: '1px solid #c4b5fd',
                            borderRadius: '20px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            color: '#5b21b6',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#ddd6fe'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ede9fe'}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Bot size={15} color="#fff" />
                      </div>
                      <div style={{
                        padding: '12px 16px',
                        background: '#fff',
                        borderRadius: '4px 18px 18px 18px',
                        border: '1px solid #ede9fe',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        display: 'flex', gap: '5px', alignItems: 'center',
                      }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="hr-dot" style={{
                            width: '7px', height: '7px',
                            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                            borderRadius: '50%',
                            animationDelay: `${i * 0.18}s`,
                          }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* ─── Input ─── */}
                <form
                  onSubmit={handleSend}
                  style={{
                    padding: '10px 12px 12px',
                    background: '#fff',
                    borderTop: '1px solid #f3f0ff',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập câu hỏi... (Enter để gửi)"
                    disabled={isLoading}
                    rows={1}
                    style={{
                      flex: 1,
                      background: '#f5f3ff',
                      border: '1.5px solid #ddd6fe',
                      borderRadius: '14px',
                      padding: '9px 14px',
                      fontSize: '13px',
                      color: '#374151',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5,
                      maxHeight: '96px',
                      overflowY: 'auto',
                      transition: 'border-color 0.15s',
                      opacity: isLoading ? 0.55 : 1,
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd6fe'}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    title="Gửi (Enter)"
                    style={{
                      width: '40px', height: '40px',
                      borderRadius: '12px',
                      border: 'none',
                      background: input.trim() && !isLoading
                        ? 'linear-gradient(135deg,#7c3aed,#4338ca)'
                        : '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                      flexShrink: 0,
                      transition: 'background 0.2s, transform 0.1s',
                      transform: 'scale(1)',
                    }}
                    onMouseDown={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'scale(0.92)'; }}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isLoading
                      ? <Loader2 size={17} color={input.trim() && !isLoading ? '#fff' : '#9ca3af'} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={16} color={input.trim() ? '#fff' : '#9ca3af'} />
                    }
                  </button>
                </form>

                {/* Footer note */}
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#c4b5fd', padding: '4px 0 8px', background: '#fff', letterSpacing: '0.3px' }}>
                  Thông tin chỉ dành riêng cho bạn · Được bảo mật
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ FAB BUTTON ════ */}
        <button
          onClick={isOpen ? handleClose : handleOpen}
          title="HR Assistant"
          className={!isOpen ? 'hr-fab-pulse' : ''}
          style={{
            width: '58px', height: '58px',
            borderRadius: '50%',
            border: 'none',
            background: isOpen
              ? 'linear-gradient(135deg,#6b21a8,#312e81)'
              : 'linear-gradient(135deg,#7c3aed,#4338ca)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(109,40,217,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* Icon toggle với rotate animation */}
          <div style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(15deg)' : 'rotate(0deg)' }}>
            {isOpen
              ? <X size={24} color="#fff" />
              : <Bot size={26} color="#fff" />
            }
          </div>

          {/* Badge thông báo */}
          {!isOpen && hasUnread && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px',
              width: '14px', height: '14px',
              background: '#f43f5e',
              border: '2.5px solid #fff',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', color: '#fff', fontWeight: 700,
            }}>1</span>
          )}

          {/* Ping ring khi đóng */}
          {!isOpen && (
            <span style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.3)',
              animation: 'hr-pulse-ring 2.4s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
        </button>
      </div>
    </>
  );
}

// ─── Shared button style (header) ───
const headerBtnStyle = {
  width: '28px', height: '28px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s',
  padding: 0,
};
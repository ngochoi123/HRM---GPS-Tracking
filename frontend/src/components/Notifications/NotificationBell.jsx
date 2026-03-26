import React, { useState, useRef, useEffect } from "react";
import { Bell, MapPin, Info, Briefcase, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
// Import Modal (Nhớ đảm bảo file này tồn tại cùng thư mục)
import NotificationDetailModal from "./NotificationDetailModal";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  // STATE MỚI: Quản lý việc xổ dài dropdown
  const [isExpanded, setIsExpanded] = useState(false); 
  const dropdownRef = useRef(null);
  
  const [selectedNoti, setSelectedNoti] = useState(null);

  // Mock data (thêm nhiều data để test tính năng xổ dài)
  const [notifications, setNotifications] = useState([
    { id: 1, type: "alert", title: "Cảnh báo vi phạm GPS 1", desc: "Nhân viên Nguyễn Văn A rời vùng an toàn lúc 14:15 PM.", time: "10 phút trước", isRead: false },
    { id: 2, type: "task", title: "Chỉ đạo công việc mới 2", desc: "Cập nhật báo cáo thị trường tuần 3 gấp.", time: "2 giờ trước", isRead: false },
    { id: 3, type: "general", title: "Lịch nghỉ lễ Quốc khánh 3", desc: "Công ty thông báo lịch nghỉ lễ 02/09 kéo dài 4 ngày.", time: "1 ngày trước", isRead: true },
    { id: 4, type: "alert", title: "Cảnh báo pin yếu thiết bị 4", desc: "Thiết bị số 109 báo pin dưới 15%.", time: "2 ngày trước", isRead: true },
    { id: 5, type: "general", title: "Họp đột xuất 5", desc: "Họp đội thị trường lúc 10h sáng mai.", time: "3 ngày trước", isRead: true },
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'alert': return <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0"><MapPin size={16} /></div>;
      case 'task': return <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0"><Briefcase size={16} /></div>;
      case 'general': return <div className="p-2 bg-gray-100 text-gray-600 rounded-full shrink-0"><Info size={16} /></div>;
      default: return <div className="p-2 bg-gray-100 text-gray-600 rounded-full shrink-0"><Info size={16} /></div>;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsExpanded(false); // Thu gọn lại khi đóng
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  // LOGIC HIỂN THỊ: Nếu thu gọn thì hiện 3, nếu mở rộng thì hiện hết
  const displayedNotifications = isExpanded ? notifications : notifications.slice(0, 3);

  return (
    <div className="relative inline-block font-sans" ref={dropdownRef}>
      
      {/* NÚT CHUÔNG */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setIsExpanded(false); // Thu gọn khi đóng chuông
        }}
        className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all focus:outline-none"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN DANH SÁCH THÔNG BÁO */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col">
          
          {/* HEADER DROPDOWN */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Thông báo ({notifications.length})</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 size={14} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* BODY DROPDOWN (Thay đổi max-height động) */}
          <div className={`overflow-y-auto transition-all duration-300 ${isExpanded ? "max-h-[550px]" : "max-h-[350px]"}`}>
            {displayedNotifications.length > 0 ? (
              <div className="flex flex-col">
                {displayedNotifications.map((noti) => (
                  <div 
                    key={noti.id}
                    onClick={() => {
                      setSelectedNoti({ ...noti, content: noti.desc, fullTime: noti.time, target: "Cá nhân" });
                      setIsOpen(false);
                      setIsExpanded(false);
                      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, isRead: true } : n));
                    }}
                    className={`flex items-start gap-3 p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                      noti.isRead ? "bg-white hover:bg-gray-50" : "bg-blue-50/40 hover:bg-blue-50"
                    }`}
                  >
                    <div className="shrink-0 mt-1">{getIcon(noti.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${noti.isRead ? "text-gray-700 font-medium" : "text-gray-900 font-bold"}`}>
                        {noti.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{noti.desc}</p>
                      <p className="text-[11px] font-medium text-gray-400 mt-1.5">{noti.time}</p>
                    </div>
                    {!noti.isRead && <div className="shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">Bạn không có thông báo nào.</div>
            )}
          </div>

          {/* FOOTER DROPDOWN (Nút Xem tất cả / Thu gọn) */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3.5 border-t border-gray-100 text-center bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer w-full"
          >
            <div className="text-sm font-semibold text-blue-600 flex items-center justify-center gap-2">
              {isExpanded ? (
                <>Thu gọn <ChevronUp size={16} /></>
              ) : (
                <>Xem tất cả thông báo ({notifications.length}) <ChevronDown size={16} /></>
              )}
            </div>
          </button>
          
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      <NotificationDetailModal isOpen={!!selectedNoti} onClose={() => setSelectedNoti(null)} notification={selectedNoti} />
    </div>
  );
}
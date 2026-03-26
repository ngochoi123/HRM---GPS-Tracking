import React from 'react';
import { X, User } from 'lucide-react';

export default function NotificationDetailModal({ isOpen, onClose, notification }) {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] font-sans">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Chi tiết thông báo</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thông tin Meta (Trạng thái & Thời gian) */}
        <div className="px-5 py-4 flex flex-col gap-2.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium w-20">Trạng thái:</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold uppercase tracking-wider rounded-md">
              Đã nhận
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium w-20">Thời gian:</span>
            <span className="text-sm font-medium text-gray-800">
              {notification.fullTime || notification.time || "Đang cập nhật..."}
            </span>
          </div>
        </div>

        {/* Box Người gửi */}
        <div className="px-5 py-3 bg-[#f8f9fa] flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <User size={20} />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-gray-600">
              Người gửi: <span className="font-bold text-gray-800">ADMIN</span>
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Gửi đến: <span className="font-bold text-gray-800">{notification.target || "Cá nhân"}</span>
            </p>
          </div>
        </div>

        {/* Nội dung thông báo */}
        <div className="p-6">
          <h3 className="text-center font-bold text-base text-gray-800 mb-4 uppercase">
            {notification.title}
          </h3>
          
          {/* Render HTML Content an toàn */}
          <div 
            className="text-sm text-gray-700 leading-relaxed space-y-2"
            dangerouslySetInnerHTML={{ __html: notification.content || notification.desc }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
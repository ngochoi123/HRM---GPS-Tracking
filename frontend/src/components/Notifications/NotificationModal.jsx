import React from 'react';
import { X, Send } from 'lucide-react';

const NotificationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Tạo thông báo mới</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form className="p-6 space-y-4">
          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề</label>
            <input type="text" placeholder="VD: Cảnh báo lệch tọa độ GPS..." 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>

          {/* Phân loại & Đối tượng */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phân loại</label>
              <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Cảnh báo GPS</option>
                <option>Chỉ đạo công việc</option>
                <option>Thông báo chung</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Gửi đến</label>
              <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Tất cả nhân viên phòng</option>
                <option>Đội kỹ thuật</option>
                <option>Nhân viên thị trường</option>
              </select>
            </div>
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung chỉ đạo</label>
            <textarea rows="4" placeholder="Nhập nội dung chi tiết tại đây..." 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              Hủy
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 transition-all">
              <Send size={16} /> Gửi thông báo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationModal;
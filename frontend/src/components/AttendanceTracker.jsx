import React, { useState } from 'react';
import { useAttendanceTracking } from '../hooks/useAttendanceTracking';
import { MapPin, MapPinOff, Clock, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceTracker = () => {
  const { isTracking, currentLocation, error, startTracking, stopTracking } = useAttendanceTracking();
  const [isLoading, setIsLoading] = useState(false);

  // Giả lập Logic: Gọi API Check-in để bắt đầu ca
  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      // await axios.post('/api/attendance/checkin');
      await new Promise((res) => setTimeout(res, 1000)); // Simulate API delay
      
      // Khởi động lấy vị trí khi Check-in thành công
      startTracking();
      toast.success('Check-in thành công. Bắt đầu theo dõi vị trí!');
    } catch (err) {
      console.error('Lỗi check-in:', err);
      toast.error('Check-in thất bại!');
    } finally {
      setIsLoading(false);
    }
  };

  // Giả lập Logic: Gọi API Check-out và dọn dẹp quyền
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      // await axios.post('/api/attendance/checkout');
      await new Promise((res) => setTimeout(res, 1000));
      
      // Ngắt lập tức vị trí theo tiêu chuẩn Privacy by Design
      stopTracking();
      toast.success('Check-out thành công. Đã ngắt định vị an toàn!');
    } catch (err) {
      console.error('Lỗi check-out:', err);
      toast.error('Check-out thất bại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
      <h2 className="text-xl font-bold mb-5 text-gray-800 text-center">Bảng Chấm Công GPS</h2>

      {/* Box hiển thị trạng thái bảo mật */}
      <div 
        className={`p-4 mb-6 rounded-xl flex items-center gap-4 transition-all duration-300 shadow-sm ${
          isTracking 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-gray-50 border border-gray-200'
        }`}
      >
        {isTracking ? (
          <>
            <div className="relative">
              <MapPin className="text-green-600 relative z-10" size={28} />
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <div>
              <p className="text-sm font-bold text-green-700">Đang trong ca làm</p>
              <p className="text-xs text-green-600 mt-0.5">Đang theo dõi vị trí liên tục</p>
            </div>
          </>
        ) : (
          <>
            <MapPinOff className="text-gray-400" size={28} />
            <div>
              <p className="text-sm font-bold text-gray-600">Đã kết thúc ca làm</p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Đã ngắt hoàn toàn định vị.<br /> An toàn riêng tư.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hiển thị lỗi (Nếu có) */}
      {error && (
         <div className="mb-5 text-xs font-semibold text-red-700 bg-red-50 py-2 px-3 border border-red-100 rounded-lg">
           ⚠️ Tạm ngừng: {error}
         </div>
      )}

      {/* Tọa độ hiển thị Real-time (Demo/Debug purposes) */}
      {currentLocation && isTracking && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-800 text-xs rounded-xl shadow-inner border border-blue-100/50 space-y-1.5">
          <div className="flex justify-between font-mono">
             <span className="font-semibold mix-blend-multiply">Vĩ độ:</span> 
             <span>{currentLocation.latitude.toFixed(6)}</span>
          </div>
          <div className="flex justify-between font-mono">
             <span className="font-semibold mix-blend-multiply">Kinh độ:</span> 
             <span>{currentLocation.longitude.toFixed(6)}</span>
          </div>
          <div className="flex justify-between font-mono">
             <span className="font-semibold mix-blend-multiply">Độ chính xác:</span> 
             <span>±{Math.round(currentLocation.accuracy)}m</span>
          </div>
        </div>
      )}

      {/* Khu vực Check-in / Check-out */}
      <div className="mt-2">
        {!isTracking ? (
          <button
            onClick={handleCheckIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
          >
            <Clock size={20} />
            {isLoading ? 'Đang vào ca...' : 'VÀO CA (CHECK-IN)'}
          </button>
        ) : (
          <button
            onClick={handleCheckOut}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-xl font-bold shadow hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
          >
            <LogOut size={20} />
            {isLoading ? 'Đang ra ca...' : 'RA CA (CHECK-OUT)'}
          </button>
        )}
      </div>
      
      <p className="text-[11px] text-gray-400 mt-6 text-center leading-relaxed">
        * Ứng dụng áp dụng tiêu chuẩn <strong>Privacy By Design</strong>.<br/>
        GPS chỉ bật trong ca làm và <strong>bị ngắt 100%</strong> ngay khi Ra ca.
      </p>
    </div>
  );
};

export default AttendanceTracker;

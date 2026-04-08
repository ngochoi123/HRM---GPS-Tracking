import { useState, useEffect, useRef, useCallback } from 'react';

export const useAttendanceTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Lưu trữ watchId để giải phóng khi cần
  const watchIdRef = useRef(null);

  // Hàm ngắt tracking (hủy định vị)
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Hàm bắt đầu tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ GPS');
      return;
    }

    // Luôn dọn dẹp tiến trình theo dõi cũ (nếu có) trước khi tạo mới
    stopTracking(); 

    setError(null);
    setIsTracking(true);

    // Kích hoạt theo dõi vị trí liên tục
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (err) => {
        setError(err.message);
        // Tự động ngắt khi có lỗi cấm quyền (Privacy enforcement)
        if (err.code === err.PERMISSION_DENIED) {
           stopTracking();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, 
        timeout: 15000,
      }
    );
  }, [stopTracking]);

  // Clean-up Effect: Dọn dẹp không để chạy ngầm lúc unmount
  useEffect(() => {
    return () => {
      // Khi component/tab bị đóng, hook tự động gọi cleanup ngắt định vị
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isTracking,
    currentLocation,
    error,
    startTracking,
    stopTracking,
  };
};

export default useAttendanceTracking;

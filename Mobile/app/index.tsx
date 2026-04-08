import React from 'react';
import { View, Button } from 'react-native';
import { useAttendance } from '@/hooks/useAttendance';
import { AttendanceUI } from '@/components/AttendanceUI';
import { demoNotificationIn5Seconds } from '@/services/NotificationService';

export default function App() {
  const attendanceLogic = useAttendance();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* --- Nút Test Demo --- */}
      <View style={{ marginTop: 50, paddingHorizontal: 20 }}>
        <Button 
          title="Bấm để Test Đẩy Thông báo (Rồi thoát app chờ 15s)" 
          color="#FF0000"
          onPress={demoNotificationIn5Seconds} 
        />
      </View>
      {/* --------------------- */}

      <AttendanceUI props={attendanceLogic} />
    </View>
  );
}

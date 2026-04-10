import React from 'react';
import { View } from 'react-native';
import { useAttendance } from '@/hooks/useAttendance';
import { AttendanceUI } from '@/components/AttendanceUI';

export default function App() {
  const attendanceLogic = useAttendance();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <AttendanceUI props={attendanceLogic} />
    </View>
  );
}

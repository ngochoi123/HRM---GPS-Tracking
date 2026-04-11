import React from 'react';

const AttendanceStats = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>⏱ Thống kê chấm công</h2>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={card}>✅ Đi làm: 1200</div>
        <div style={card}>❌ Nghỉ: 120</div>
        <div style={card}>⏰ Đi trễ: 45</div>
      </div>
    </div>
  );
};

const card = {
  flex: 1,
  background: '#fff',
  padding: '16px',
  borderRadius: '10px'
};

export default AttendanceStats;
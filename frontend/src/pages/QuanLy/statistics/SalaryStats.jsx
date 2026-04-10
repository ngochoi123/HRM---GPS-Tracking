import React from 'react';

const SalaryStats = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>📊 Thống kê lương & chi phí</h2>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={card}>💰 Tổng lương: 500 triệu</div>
        <div style={card}>🏢 Chi phí công ty: 620 triệu</div>
        <div style={card}>👨‍💼 Nhân viên: 50</div>
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

export default SalaryStats;
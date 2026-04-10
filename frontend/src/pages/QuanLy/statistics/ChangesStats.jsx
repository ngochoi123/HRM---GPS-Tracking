import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ChangesStats = () => {

  const [stats, setStats] = useState({
    total: 0,
    join: 0,
    leave: 0,
    turnoverRate: 0,
    list: []
  });

  useEffect(() => {
    const fetchData = async () => {
        try {
          const summaryRes = await fetch('http://localhost:5000/api/manager/stats/changes-summary');
          const summaryData = await summaryRes.json();
      
          const listRes = await fetch('http://localhost:5000/api/manager/stats/changes-list');
          const listData = await listRes.json();
      
          const total = Number(summaryData.total);
          const join = Number(summaryData.new_employees);
          const leave = Number(summaryData.leave_employees);
      
          const turnoverRate = total > 0 
            ? ((leave / total) * 100).toFixed(1) 
            : 0;
      
          setStats({
            total,
            join,
            leave,
            turnoverRate,
            list: listData
          });
      
        } catch (err) {
          console.error('🔥 Lỗi load thống kê:', err);
        }
      };
  
    fetchData();
  }, []);

  return (
    <div style={container}>
      
      {/* HEADER */}
      <div style={header}>
        <div>
          <h2 style={title}>Thống kê Biến động Nhân sự</h2>
          <p style={subtitle}>
            Theo dõi tuyển dụng, nghỉ việc và cơ cấu nhân sự
          </p>
        </div>

        <div style={dateBox}>Tháng hiện tại</div>
      </div>

      {/* ===== CARDS ===== */}
      <div style={cardRow}>

        <div style={cardMain}>
          <p style={cardLabel}>TỔNG NHÂN SỰ</p>
          <h2 style={cardValue}>{stats.total}</h2>
          <span style={cardSub}>Realtime</span>
        </div>

        <StatCard title="Nhân sự mới" value={stats.join} color="#16a34a" />
        <StatCard title="Nghỉ việc" value={stats.leave} color="#dc2626" />
        <StatCard 
          title="Tỷ lệ nghỉ việc" 
          value={stats.turnoverRate + '%'} 
          color="#f59e0b" 
          isProgress 
        />
      </div>

      {/* ===== CƠ CẤU (TẠM STATIC) ===== */}
      <div style={box}>
        <h4 style={boxTitle}>Cơ cấu theo thâm niên</h4>

        <Bar label="Dưới 1 năm" percent={30} color="#3b82f6" />
        <Bar label="1 - 3 năm" percent={45} color="#8b5cf6" />
        <Bar label="3 - 5 năm" percent={15} color="#10b981" />
        <Bar label="Trên 5 năm" percent={10} color="#f59e0b" />
      </div>

      {/* ===== TABLE ===== */}
      <div style={box}>
        <h4 style={boxTitle}>Danh sách biến động</h4>

        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
              <th>Loại</th>
              <th>Ngày</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
        {stats.list.map((item, index) => (
        <Row
        key={index}
        name={item.full_name} // ✅ đúng
        dept={item.department_name || 'Chưa phân bổ'} // ✅ fallback
        type={item.type}
        date={new Date(item.date).toLocaleDateString('vi-VN')}
        />
        ))}
            </tbody>
        </table>
      </div>

    </div>
  );
};

export default ChangesStats;

//
// COMPONENTS
//

const StatCard = ({ title, value, color, isProgress }) => (
  <div style={card}>
    <p style={cardLabel}>{title}</p>
    <h3 style={{ ...cardValueSmall, color }}>{value}</h3>

    {isProgress && (
      <div style={progressBar}>
        <div style={{ ...progressFill, width: '40%', background: color }} />
      </div>
    )}
  </div>
);

const Bar = ({ label, percent, color }) => (
  <div style={{ marginTop: '14px' }}>
    <div style={barHeader}>
      <span>{label}</span>
      <span>{percent}%</span>
    </div>

    <div style={progressBar}>
      <div style={{ ...progressFill, width: percent + '%', background: color }} />
    </div>
  </div>
);

const Row = ({ name, dept, type, date }) => {
  const isJoin = type === 'Gia nhập';

  return (
    <tr style={row}>
      <td>{name}</td>
      <td>{dept}</td>
      <td>
        <span style={{
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 500,
          background: isJoin ? '#dcfce7' : '#fee2e2',
          color: isJoin ? '#16a34a' : '#dc2626'
        }}>
          {type}
        </span>
      </td>
      <td>{date}</td>
      <td style={action}>Xem</td>
    </tr>
  );
};

//
// STYLE
//

const container = {
  padding: '28px',
  background: '#eef2f7',
  minHeight: '100vh'
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
};

const title = {
  fontSize: '24px',
  fontWeight: 700
};

const subtitle = {
  color: '#6b7280',
  fontSize: '14px'
};

const dateBox = {
  background: '#fff',
  padding: '8px 16px',
  borderRadius: '12px',
  fontSize: '14px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
};

const cardRow = {
  display: 'flex',
  gap: '18px',
  marginBottom: '24px'
};

const cardMain = {
  flex: 1.3,
  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  color: '#fff',
  padding: '20px',
  borderRadius: '16px',
  boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
};

const card = {
  flex: 1,
  background: '#fff',
  padding: '18px',
  borderRadius: '16px',
  boxShadow: '0 6px 12px rgba(0,0,0,0.05)'
};

const cardLabel = {
  fontSize: '12px',
  color: '#6b7280'
};

const cardValue = {
  fontSize: '28px',
  fontWeight: 700,
  margin: '6px 0'
};

const cardValueSmall = {
  fontSize: '22px',
  fontWeight: 600
};

const cardSub = {
  fontSize: '12px'
};

const box = {
  background: '#fff',
  padding: '22px',
  borderRadius: '16px',
  marginBottom: '24px',
  boxShadow: '0 6px 14px rgba(0,0,0,0.05)'
};

const boxTitle = {
  marginBottom: '12px',
  fontWeight: 600
};

const barHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px'
};

const progressBar = {
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '999px',
  marginTop: '6px'
};

const progressFill = {
  height: '100%',
  borderRadius: '999px'
};

const table = {
  width: '100%',
  marginTop: '10px',
  borderCollapse: 'separate',
  borderSpacing: '0 8px'
};

const theadRow = {
  textAlign: 'left',
  fontSize: '13px',
  color: '#6b7280'
};

const row = {
  background: '#f9fafb'
};

const action = {
  color: '#3b82f6',
  cursor: 'pointer',
  fontWeight: 500
};
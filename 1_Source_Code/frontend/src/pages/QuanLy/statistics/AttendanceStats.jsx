import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AttendanceStats = () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const displayMonth = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const [data, setData] = useState(null);
  const deptColors = {
    'Ban Giám Đốc': '#ef4444',
    'Phòng Công nghệ Thông tin': '#3b82f6',
    'Phòng Nhân sự': '#10b981',
    'Khác': '#6b7280'
  };
  useEffect(() => {
    axios.get(`http://localhost:5000/api/manager/attendance-stats?month=${month}`)
      .then(res => {
        console.log("API DATA:", res.data);
        setData(res.data);
      })
      .catch(err => console.error("API ERROR:", err));
  }, [month]);

  // format phút → "xh ym"
  const formatMinutes = (minutes) => {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div style={container}>
      <div style={wrapper}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <h2 style={title}>📊 Thống kê Chấm công & Chuyên cần</h2>
            <p style={subtitle}>
              Theo dõi tình hình tuân thủ giờ giấc của nhân viên
            </p>
          </div>

          <div style={dateBox}>Tháng 04/2026</div>
        </div>

        {/* CARDS */}
        <div style={cardRow}>
          <div style={cardMain}>
            <p style={{ opacity: 0.9 }}>Tổng giờ công thực tế</p>
            <h2 style={{ fontSize: 28, margin: '8px 0' }}>
              {data?.totalHours || 0} giờ
            </h2>
            <span style={badgeGreen}>Dữ liệu realtime</span>
          </div>

          <StatCard
            title="Đi trễ / Về sớm"
            value={`${data?.lateCount || 0} lượt`}
            note="Cần theo dõi"
            color="#dc2626"
            bg="#fee2e2"
          />

          <StatCard
            title="Làm thêm giờ (OT)"
            value={`${data?.otHours || 0} giờ`}
            note="Tăng năng suất"
            color="#9333ea"
            bg="#f3e8ff"
          />
        </div>

        {/* PROGRESS */}
        <div style={box}>
          <h4 style={boxTitle}>Tỷ lệ đi trễ theo phòng ban</h4>

          {data?.lateByDept?.map((d, i) => (
  <Progress
    key={i}
    label={d.label}   // ✅ FIX
    percent={d.percent}
    color={deptColors[d.label] || '#6b7280'}
  />
))}
        </div>

        {/* DANH SÁCH CẢNH BÁO */}
        <div style={box}>
          <h4 style={boxTitle}>⚠ Nhân viên cần chú ý</h4>

          <table style={table}>
            <thead>
              <tr style={thead}>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Số lần trễ</th>
                <th>Tổng thời gian trễ</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
  {data?.violators?.length === 0 ? (
    <tr>
      <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>
        Không có dữ liệu vi phạm 🎉
      </td>
    </tr>
  ) : (
    data?.violators?.map((item, index) => (
      <tr key={index} style={row}>
        <td style={nameCell}>
          <div style={avatar}>
            {item.name?.charAt(0)}
          </div>
          <span>{item.name}</span>
        </td>

        <td>{item.dept}</td>

        <td>
          <span style={badgeRed}>
            {item.lateCount} lần
          </span>
        </td>

        <td>{item.lateTime}</td>

        <td>
        <button
  style={btnSmall}
  onMouseEnter={(e) => e.currentTarget.style.background = '#f59e0b'}
  onMouseLeave={(e) => e.currentTarget.style.background = '#fef3c7'}
>
  Nhắc nhở
</button>
        </td>
      </tr>
    ))
  )}
</tbody>
          </table>

        </div>

      </div>
    </div>
  );
};

export default AttendanceStats;

//
// COMPONENTS
//

const StatCard = ({ title, value, note, color, bg }) => (
  <div style={card}>
    <p style={cardTitle}>{title}</p>
    <h3 style={cardValue}>{value}</h3>

    <span style={{
      backgroundColor: bg,
      color: color,
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '12px'
    }}>
      {note}
    </span>
  </div>
);

const Progress = ({ label, percent, color }) => (
  <div style={{ marginTop: 14 }}>
    <div style={progressHeader}>
      <span>{label}</span>
      <span>{percent}%</span>
    </div>

    <div style={progressBar}>
      <div
        style={{
          width: `${percent}%`,
          backgroundColor: color,
          height: '100%',
          borderRadius: '999px'
        }}
      />
    </div>
  </div>
);

//
// STYLE
//

const container = {
  padding: '24px',
  background: '#eef2f7',
  minHeight: '100vh'
};

const wrapper = {
  background: '#fff',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 6px 20px rgba(0,0,0,0.05)'
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px'
};

const title = {
  fontSize: '22px',
  fontWeight: 700
};

const subtitle = {
  fontSize: '14px',
  color: '#64748b'
};

const dateBox = {
  background: '#f1f5f9',
  padding: '6px 14px',
  borderRadius: '10px',
  fontSize: '13px'
};

const cardRow = {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr 1fr',
  gap: '16px'
};

const cardMain = {
  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  color: '#fff',
  padding: '20px',
  borderRadius: '16px'
};

const card = {
  background: '#f8fafc',
  padding: '16px',
  borderRadius: '16px'
};

const cardTitle = {
  fontSize: '13px',
  color: '#64748b'
};

const cardValue = {
  fontSize: '22px',
  fontWeight: 600,
  margin: '6px 0'
};

const badgeGreen = {
  background: '#dcfce7',
  color: '#16a34a',
  padding: '4px 10px',
  borderRadius: '8px',
  fontSize: '12px'
};

const badgeRed = {
  background: '#fee2e2',
  color: '#dc2626',
  padding: '4px 10px',
  borderRadius: '8px',
  fontSize: '12px'
};

const box = {
  marginTop: '24px',
  padding: '20px',
  background: '#f8fafc',
  borderRadius: '16px'
};

const boxTitle = {
  marginBottom: '12px',
  fontWeight: 600
};

const progressHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px'
};

const progressBar = {
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '999px',
  overflow: 'hidden'
};

const table = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: '0 10px'
};

const thead = {
  textAlign: 'left',
  fontSize: '13px',
  color: '#64748b'
};

const row = {
  background: '#fff'
};

const nameCell = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const avatar = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: '#3b82f6',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const btnSmall = {
  background: '#fef3c7',
  border: 'none',
  color: '#92400e',
  padding: '4px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap' // 👈 QUAN TRỌNG (không xuống dòng)
};
import React, { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const ChangesStats = () => {
  const navigate = useNavigate(); // ✅ FIX 1: đưa lên đây
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // yyyy-MM
  );
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `Tháng ${month}/${year}`;
  };
  const [prevStats, setPrevStats] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    join: 0,
    leave: 0,
    turnoverRate: 0,
    list: []
  });
  const [tenure, setTenure] = useState({
    fresher: 0,
    junior: 0,
    mid: 0,
    senior: 0
  });
  const getPrevMonth = (monthStr) => {
    const date = new Date(monthStr + '-01');
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const prevMonth = getPrevMonth(selectedMonth);
  
        const [summaryData, listData, tenureData, prevSummary] = await Promise.all([
          axiosClient.get(`/manager/stats/changes-summary?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/changes-list?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/tenure?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/changes-summary?month=${prevMonth}`) // 👈 thêm
        ]);
  
        const total = Number(summaryData.total);
        const join = Number(summaryData.new_employees);
        const leave = Number(summaryData.leave_employees);
  
        const turnoverRate = total > 0
          ? ((leave / total) * 100).toFixed(1)
          : 0;
  
        setStats({ total, join, leave, turnoverRate, list: listData });
        setTenure(tenureData);
        setPrevStats(prevSummary); // 👈 lưu tháng trước
  
      } catch (err) {
        console.error('Lỗi load thống kê:', err);
      }
    };
  
    fetchData();
  }, [selectedMonth]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedMonth]);
   // 👈 thêm dependency
   const filteredList = stats.list.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });
  
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const getDiff = (current, prev) => {
    if (prev === undefined || prev === null) return null;
    return current - Number(prev);
  };
  return (
    <div style={container}>

      {/* HEADER */}
      <div style={header}>
        <div>
          <h2 style={title}>Thống kê Biến động Nhân sự</h2>
          <p style={subtitle}>Theo dõi tình hình tuyển dụng, nghỉ việc và cơ cấu nhân sự</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>

  {/* CHỌN THÁNG */}
  <div style={dateBox}>
    <input
      type="month"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      style={{
        border: 'none',
        outline: 'none',
        fontSize: 13,
        background: 'transparent'
      }}
    />
  </div>

  {/* FILTER */}
  <div style={dateBox}>
    <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
      style={{
        border: 'none',
        outline: 'none',
        fontSize: 13,
        background: 'transparent',
        cursor: 'pointer'
      }}
    >
      <option value="all">Tất cả</option>
      <option value="Gia nhập">Gia nhập</option>
      <option value="Nghỉ việc">Nghỉ việc</option>
      <option value="Nghỉ phép">Nghỉ phép</option>
    </select>
  </div>

</div>
      </div>

      {/* CARDS */}
      <div style={cardRow}>

        <div style={cardMain}>
          <p style={cardLabelWhite}>TỔNG NHÂN SỰ HIỆN TẠI</p>
          <h2 style={cardValueWhite}>{stats.total}</h2>
          <span style={cardSub}>
  {formatMonth(selectedMonth)}
  {prevStats && (
    <>
      {' • '}
      {getDiff(stats.total, prevStats?.total) >= 0 ? '+' : ''}
      {getDiff(stats.total, prevStats?.total)} so với tháng trước
    </>
  )}
</span>
        </div>

        <StatCard title="Nhân sự mới" value={stats.join} note="Hoàn thành mục tiêu" color="#22c55e" />
        <StatCard title="Nghỉ việc" value={stats.leave} note="Tăng nhẹ" color="#ef4444" />
        <StatCard title="Tỷ lệ nghỉ việc" value={stats.turnoverRate + '%'} note="Dưới mức an toàn" color="#f59e0b" percent={stats.turnoverRate} />

      </div>

      {/* BAR */}
      <div style={box}>
        <h4 style={boxTitle}>Cơ cấu theo thâm niên</h4>

        <Bar label="Dưới 1 năm (Fresher)" percent={tenure.fresher} />
<Bar label="Từ 1 - 3 năm" percent={tenure.junior} />
<Bar label="Từ 3 - 5 năm" percent={tenure.mid} />
<Bar label="Trên 5 năm" percent={tenure.senior} />
      </div>

      {/* TABLE */}
      <div style={box}>
        <div style={tableHeader}>
          <h4 style={boxTitle}>Danh sách biến động nhân sự</h4>

          <div style={badgeWrap}>
            <span style={badgeGreen}>Tuyển mới ({stats.join})</span>
            <span style={badgeRed}>Nghỉ việc ({stats.leave})</span>
          </div>
        </div>

        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
              <th>Loại biến động</th>
              <th>Ngày</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
          {paginatedList.map((item, index) => (
              <Row
                key={index}
                id={item.employee_id} // ⚠️ đảm bảo API có field này
                name={item.full_name}
                dept={item.department_name || 'Chưa phân bổ'}
                type={item.type}
                date={new Date(item.date).toLocaleDateString('vi-VN')}
                onView={() => navigate(`/profile/${item.employee_id}`)} // ✅ thêm
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
  
  <button
    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
    disabled={currentPage === 1}
    style={pageBtn}
  >
    ←
  </button>

  <span style={{ fontSize: 13 }}>
    Trang {currentPage} / {totalPages || 1}
  </span>

  <button
    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
    disabled={currentPage === totalPages}
    style={pageBtn}
  >
    →
  </button>

</div>
    </div>
  );

};

export default ChangesStats;

// COMPONENTS

const StatCard = ({ title, value, note, color, percent }) => (
  <div style={card}>
    <p style={cardLabel}>{title}</p>
    <h3 style={{ ...cardValueSmall, color }}>{value}</h3>
    <p style={{ fontSize: 12, color: '#94a3b8' }}>{note}</p>

    {percent && (
      <div style={progressBar}>
        <div style={{ ...progressFill, width: percent + '%', background: color }} />
      </div>
    )}
  </div>
);

const Bar = ({ label, percent }) => (
  <div style={{ marginTop: 16 }}>
    <div style={barHeader}>
      <span>{label}</span>
      <span>{percent}%</span>
    </div>

    <div style={progressBar}>
      <div style={{ ...progressFill, width: percent + '%', background: '#3b82f6' }} />
    </div>
  </div>
);

const Row = ({ id, name, dept, type, date, onView }) => {
  const isJoin = type === 'Gia nhập';
  const getColor = () => {
    if (type === 'Gia nhập') return { bg: '#dcfce7', color: '#16a34a' };
    if (type === 'Nghỉ việc') return { bg: '#fee2e2', color: '#dc2626' };
    if (type === 'Nghỉ phép') return { bg: '#fef9c3', color: '#ca8a04' };
    return { bg: '#e2e8f0', color: '#334155' };
  };
  
  const style = getColor();
  return (
    <tr style={row}>
      <td>
        <div style={{ fontWeight: 600 }}>{name}</div>
        
      </td>

      <td>
        <span style={deptTag}>{dept}</span>
      </td>

      <td>
        <span style={{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: 12,
          fontWeight: 600,
          background: isJoin ? '#dcfce7' : '#fee2e2',
          color: isJoin ? '#16a34a' : '#dc2626'
        }}>
          {isJoin ? '+ Gia nhập' : '− Nghỉ việc'}
        </span>
      </td>

      <td style={{ fontSize: 13, color: '#475569' }}>
        {date}
      </td>

      <td>
        <button style={viewBtn} onClick={onView}>
          Xem
        </button>
      </td>
    </tr>
  );
};

// STYLE

const container = {
  padding: 24,
  background: '#f8fafc',
  minHeight: '100vh'
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24
};

const title = {
  fontSize: 22,
  fontWeight: 700
};

const subtitle = {
  color: '#64748b',
  fontSize: 13
};

const dateBox = {
  background: '#fff',
  padding: '6px 14px',
  borderRadius: 10,
  fontSize: 13
};

const cardRow = {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
  gap: 16,
  marginBottom: 24
};

const cardMain = {
  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  color: '#fff',
  padding: 20,
  borderRadius: 16
};

const card = {
  background: '#fff',
  padding: 16,
  borderRadius: 16,
  border: '1px solid #f1f5f9'
};

const cardLabel = {
  fontSize: 12,
  color: '#64748b'
};

const cardLabelWhite = {
  fontSize: 12,
  opacity: 0.8
};

const cardValueWhite = {
  fontSize: 28,
  fontWeight: 700,
  margin: '6px 0'
};

const cardValueSmall = {
  fontSize: 22,
  fontWeight: 600
};

const cardSub = {
  fontSize: 12,
  opacity: 0.9
};

const box = {
  background: '#fff',
  padding: 20,
  borderRadius: 16,
  marginBottom: 24
};

const boxTitle = {
  marginBottom: 12,
  fontWeight: 600
};

const barHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13
};

const progressBar = {
  height: 6,
  background: '#e2e8f0',
  borderRadius: 999,
  marginTop: 6
};

const progressFill = {
  height: '100%',
  borderRadius: 999
};

const tableHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const badgeWrap = {
  display: 'flex',
  gap: 10
};

const badgeGreen = {
  background: '#dcfce7',
  color: '#16a34a',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12
};

const badgeRed = {
  background: '#fee2e2',
  color: '#dc2626',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12
};

const table = {
  width: '100%',
  marginTop: 10,
  borderCollapse: 'collapse'
};

const theadRow = {
  textAlign: 'left',
  fontSize: 13,
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0'
};

const row = {
  borderBottom: '1px solid #f1f5f9',
  transition: '0.2s'
};

const action = {
  color: '#3b82f6',
  cursor: 'pointer',
  fontWeight: 500
};
const deptTag = {
  background: '#f1f5f9',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  color: '#334155'
};

const viewBtn = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  fontSize: 12,
  cursor: 'pointer'
};
const pageBtn = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer'
};
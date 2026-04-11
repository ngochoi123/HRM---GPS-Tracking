import React, { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
<<<<<<< HEAD

const ChangesStats = () => {

=======
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
>>>>>>> develop
  const [stats, setStats] = useState({
    total: 0,
    join: 0,
    leave: 0,
    turnoverRate: 0,
    list: []
  });
<<<<<<< HEAD

  useEffect(() => {
    const fetchData = async () => {
        try {
          const summaryData = await axiosClient.get('/manager/stats/changes-summary');
      
          const listData = await axiosClient.get('/manager/stats/changes-list');
      
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
      
=======
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

>>>>>>> develop
      {/* HEADER */}
      <div style={header}>
        <div>
          <h2 style={title}>Thống kê Biến động Nhân sự</h2>
<<<<<<< HEAD
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
=======
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
>>>>>>> develop

        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
<<<<<<< HEAD
              <th>Loại</th>
=======
              <th>Loại biến động</th>
>>>>>>> develop
              <th>Ngày</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
<<<<<<< HEAD
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
=======
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

>>>>>>> develop
};

export default ChangesStats;

<<<<<<< HEAD
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
=======
// COMPONENTS

const StatCard = ({ title, value, note, color, percent }) => (
  <div style={card}>
    <p style={cardLabel}>{title}</p>
    <h3 style={{ ...cardValueSmall, color }}>{value}</h3>
    <p style={{ fontSize: 12, color: '#94a3b8' }}>{note}</p>

    {percent && (
      <div style={progressBar}>
        <div style={{ ...progressFill, width: percent + '%', background: color }} />
>>>>>>> develop
      </div>
    )}
  </div>
);

<<<<<<< HEAD
const Bar = ({ label, percent, color }) => (
  <div style={{ marginTop: '14px' }}>
=======
const Bar = ({ label, percent }) => (
  <div style={{ marginTop: 16 }}>
>>>>>>> develop
    <div style={barHeader}>
      <span>{label}</span>
      <span>{percent}%</span>
    </div>

    <div style={progressBar}>
<<<<<<< HEAD
      <div style={{ ...progressFill, width: percent + '%', background: color }} />
=======
      <div style={{ ...progressFill, width: percent + '%', background: '#3b82f6' }} />
>>>>>>> develop
    </div>
  </div>
);

<<<<<<< HEAD
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
=======
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
>>>>>>> develop
    </tr>
  );
};

<<<<<<< HEAD
//
// STYLE
//

const container = {
  padding: '28px',
  background: '#eef2f7',
=======
// STYLE

const container = {
  padding: 24,
  background: '#f8fafc',
>>>>>>> develop
  minHeight: '100vh'
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
<<<<<<< HEAD
  marginBottom: '24px'
};

const title = {
  fontSize: '24px',
=======
  marginBottom: 24
};

const title = {
  fontSize: 22,
>>>>>>> develop
  fontWeight: 700
};

const subtitle = {
<<<<<<< HEAD
  color: '#6b7280',
  fontSize: '14px'
=======
  color: '#64748b',
  fontSize: 13
>>>>>>> develop
};

const dateBox = {
  background: '#fff',
<<<<<<< HEAD
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
=======
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
>>>>>>> develop
  fontWeight: 700,
  margin: '6px 0'
};

const cardValueSmall = {
<<<<<<< HEAD
  fontSize: '22px',
=======
  fontSize: 22,
>>>>>>> develop
  fontWeight: 600
};

const cardSub = {
<<<<<<< HEAD
  fontSize: '12px'
=======
  fontSize: 12,
  opacity: 0.9
>>>>>>> develop
};

const box = {
  background: '#fff',
<<<<<<< HEAD
  padding: '22px',
  borderRadius: '16px',
  marginBottom: '24px',
  boxShadow: '0 6px 14px rgba(0,0,0,0.05)'
};

const boxTitle = {
  marginBottom: '12px',
=======
  padding: 20,
  borderRadius: 16,
  marginBottom: 24
};

const boxTitle = {
  marginBottom: 12,
>>>>>>> develop
  fontWeight: 600
};

const barHeader = {
  display: 'flex',
  justifyContent: 'space-between',
<<<<<<< HEAD
  fontSize: '14px'
};

const progressBar = {
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '999px',
  marginTop: '6px'
=======
  fontSize: 13
};

const progressBar = {
  height: 6,
  background: '#e2e8f0',
  borderRadius: 999,
  marginTop: 6
>>>>>>> develop
};

const progressFill = {
  height: '100%',
<<<<<<< HEAD
  borderRadius: '999px'
=======
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
>>>>>>> develop
};

const table = {
  width: '100%',
<<<<<<< HEAD
  marginTop: '10px',
  borderCollapse: 'separate',
  borderSpacing: '0 8px'
=======
  marginTop: 10,
  borderCollapse: 'collapse'
>>>>>>> develop
};

const theadRow = {
  textAlign: 'left',
<<<<<<< HEAD
  fontSize: '13px',
  color: '#6b7280'
};

const row = {
  background: '#f9fafb'
=======
  fontSize: 13,
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0'
};

const row = {
  borderBottom: '1px solid #f1f5f9',
  transition: '0.2s'
>>>>>>> develop
};

const action = {
  color: '#3b82f6',
  cursor: 'pointer',
  fontWeight: 500
<<<<<<< HEAD
=======
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
>>>>>>> develop
};
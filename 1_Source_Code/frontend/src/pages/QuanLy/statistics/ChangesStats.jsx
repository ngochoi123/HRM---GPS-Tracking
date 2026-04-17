import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Filter, TrendingUp, UserPlus2, UserRoundX, Users } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 6;

const formatMonth = (monthStr) => {
  const [year, month] = String(monthStr).split('-');
  return `Tháng ${month}/${year}`;
};

const shiftMonth = (monthStr, delta) => {
  const [year, month] = String(monthStr).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPrevMonth = (monthStr) => shiftMonth(monthStr, -1);

const getTrendText = (current, previous, suffix = 'so với tháng trước') => {
  if (previous === undefined || previous === null) return 'Chưa có dữ liệu so sánh';
  const diff = Number(current || 0) - Number(previous || 0);
  if (diff === 0) return `Không đổi ${suffix}`;
  return `${diff > 0 ? '+' : ''}${diff} ${suffix}`;
};

const getTurnoverText = (rate) => {
  const value = Number(rate || 0);
  if (value >= 15) return 'Mức cao cần lưu ý';
  if (value >= 7) return 'Mức trung bình';
  return 'Đang trong ngưỡng an toàn';
};

const getChangeTypeStyle = (type) => {
  if (type === 'Gia nhập') return { background: '#dcfce7', color: '#15803d' };
  if (type === 'Nghỉ việc') return { background: '#fee2e2', color: '#dc2626' };
  return { background: '#fef3c7', color: '#b45309' };
};

const tenureLabels = {
  fresher: 'Dưới 1 năm',
  junior: 'Từ 1 - 3 năm',
  mid: 'Từ 3 - 5 năm',
  senior: 'Trên 5 năm'
};

const ChangesStats = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const prevMonth = getPrevMonth(selectedMonth);

        const [summaryData, listData, tenureData, prevSummary] = await Promise.all([
          axiosClient.get(`/manager/stats/changes-summary?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/changes-list?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/tenure?month=${selectedMonth}`),
          axiosClient.get(`/manager/stats/changes-summary?month=${prevMonth}`)
        ]);

        if (!active) return;

        const total = Number(summaryData.total || 0);
        const join = Number(summaryData.new_employees || 0);
        const leave = Number(summaryData.leave_employees || 0);
        const turnoverRate = total > 0 ? Number(((leave / total) * 100).toFixed(1)) : 0;

        setStats({ total, join, leave, turnoverRate, list: Array.isArray(listData) ? listData : [] });
        setTenure({
          fresher: Number(tenureData.fresher || 0),
          junior: Number(tenureData.junior || 0),
          mid: Number(tenureData.mid || 0),
          senior: Number(tenureData.senior || 0)
        });
        setPrevStats(prevSummary || null);
      } catch (err) {
        console.error('load changes stats error:', err);
        if (!active) return;
        setError('Không tải được thống kê biến động nhân sự.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedMonth]);

  const filteredList = useMemo(() => {
    if (filterType === 'all') return stats.list;
    return stats.list.filter((item) => item.type === filterType);
  }, [stats.list, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredList, safePage]);

  const tenureRows = [
    { key: 'fresher', value: tenure.fresher, color: '#0ea5e9' },
    { key: 'junior', value: tenure.junior, color: '#22c55e' },
    { key: 'mid', value: tenure.mid, color: '#f59e0b' },
    { key: 'senior', value: tenure.senior, color: '#8b5cf6' }
  ];

  if (loading) {
    return <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>;
  }

  return (
    <div style={page}>
      <div style={shell}>
        <div style={heroPanel}>
          <div>
            <div style={titleRow}>
              <span style={titleIconWrap}>
                <TrendingUp size={18} color="#0ea5e9" />
              </span>
              <div>
                <h1 style={title}>Thống kê Biến động Nhân sự</h1>
                <p style={subtitle}>Theo dõi tuyển mới, nghỉ việc và cơ cấu thâm niên theo dữ liệu database.</p>
              </div>
            </div>
          </div>

          <div style={monthBox}>
            <button
              type="button"
              style={monthButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={monthLabel}>
              <CalendarDays size={16} color="#0ea5e9" />
              <span>{formatMonth(selectedMonth)}</span>
            </div>
            <button
              type="button"
              style={monthButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

        <div style={statsGrid}>
          <StatCard
            title="Tổng nhân sự hiện tại"
            value={stats.total}
            suffix="người"
            note={getTrendText(stats.total, prevStats?.total)}
            icon={<Users size={18} color="#0284c7" />}
            tone="blue"
          />
          <StatCard
            title="Nhân sự mới"
            value={stats.join}
            suffix="người"
            note={getTrendText(stats.join, prevStats?.new_employees)}
            icon={<UserPlus2 size={18} color="#16a34a" />}
            tone="green"
          />
          <StatCard
            title="Nghỉ việc"
            value={stats.leave}
            suffix="người"
            note={getTrendText(stats.leave, prevStats?.leave_employees)}
            icon={<UserRoundX size={18} color="#dc2626" />}
            tone="red"
          />
          <StatCard
            title="Tỷ lệ nghỉ việc"
            value={stats.turnoverRate}
            suffix="%"
            note={getTurnoverText(stats.turnoverRate)}
            icon={<BriefcaseBusiness size={18} color="#d97706" />}
            tone="amber"
            progress={Math.min(stats.turnoverRate, 100)}
          />
        </div>

        <div style={contentGrid}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <h3 style={panelTitle}>Cơ cấu theo thâm niên</h3>
                <p style={panelSubtitle}>Phần trăm nhân sự active theo nhóm thâm niên hiện tại.</p>
              </div>
            </div>

            {tenureRows.map((row) => (
              <div key={row.key} style={progressItem}>
                <div style={progressHeader}>
                  <span style={progressLabel}>{tenureLabels[row.key]}</span>
                  <strong style={progressValue}>{row.value}%</strong>
                </div>
                <div style={progressTrack}>
                  <div
                    style={{
                      ...progressFill,
                      width: `${row.value}%`,
                      background: row.color
                    }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <h3 style={panelTitle}>Bộ lọc danh sách</h3>
                <p style={panelSubtitle}>Lọc biến động theo loại để xem chi tiết nhanh hơn.</p>
              </div>
              <div style={filterBox}>
                <Filter size={16} color="#64748b" />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={filterSelect}>
                  <option value="all">Tất cả</option>
                  <option value="Gia nhập">Gia nhập</option>
                  <option value="Nghỉ việc">Nghỉ việc</option>
                  <option value="Nghỉ phép">Nghỉ phép</option>
                </select>
              </div>
            </div>

            <div style={quickFacts}>
              <div style={quickFactCard}>
                <span style={quickFactLabel}>Tháng đang xem</span>
                <strong style={quickFactValue}>{formatMonth(selectedMonth)}</strong>
              </div>
              <div style={quickFactCard}>
                <span style={quickFactLabel}>Biến động hiển thị</span>
                <strong style={quickFactValue}>{filteredList.length} mục</strong>
              </div>
            </div>
          </section>
        </div>

        <section style={tablePanel}>
          <div style={tableHeader}>
            <div>
              <h3 style={panelTitle}>Danh sách biến động nhân sự</h3>
              <p style={panelSubtitle}>Dữ liệu đang hiển thị đúng theo tháng {formatMonth(selectedMonth).toLowerCase()}.</p>
            </div>
            <div style={badgeRow}>
              <span style={{ ...summaryBadge, background: '#dcfce7', color: '#15803d' }}>Gia nhập: {stats.join}</span>
              <span style={{ ...summaryBadge, background: '#fee2e2', color: '#dc2626' }}>Nghỉ việc: {stats.leave}</span>
            </div>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr style={theadRow}>
                  <th style={th}>Nhân viên</th>
                  <th style={th}>Phòng ban</th>
                  <th style={th}>Loại biến động</th>
                  <th style={th}>Ngày</th>
                  <th style={{ ...th, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={emptyCell}>Không có dữ liệu phù hợp trong tháng này.</td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={`${item.employee_id}-${item.type}-${item.date}`} style={bodyRow}>
                      <td style={td}>
                        <div style={nameCell}>
                          <div style={avatar}>{item.full_name?.trim()?.charAt(0)?.toUpperCase() || 'N'}</div>
                          <div>
                            <div style={employeeName}>{item.full_name}</div>
                            <div style={employeeMeta}>Mã nhân sự: {item.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={deptTag}>{item.department_name || 'Chưa phân bổ'}</span>
                      </td>
                      <td style={td}>
                        <span style={{ ...typeTag, ...getChangeTypeStyle(item.type) }}>{item.type}</span>
                      </td>
                      <td style={td}>{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button type="button" style={viewButton} onClick={() => navigate(`/profile/${item.employee_id}`)}>
                          Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredList.length > ITEMS_PER_PAGE ? (
            <div style={paginationBar}>
              <button
                type="button"
                style={{ ...pageButton, ...(safePage === 1 ? disabledPageButton : {}) }}
                disabled={safePage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Trước
              </button>
              <span style={pageInfo}>Trang {safePage}/{totalPages}</span>
              <button
                type="button"
                style={{ ...pageButton, ...(safePage === totalPages ? disabledPageButton : {}) }}
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Sau
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, suffix, note, icon, tone, progress }) => {
  const toneMap = {
    blue: { soft: '#eff6ff', strong: '#0284c7' },
    green: { soft: '#ecfdf5', strong: '#16a34a' },
    red: { soft: '#fef2f2', strong: '#dc2626' },
    amber: { soft: '#fff7ed', strong: '#d97706' }
  };

  const currentTone = toneMap[tone] || toneMap.blue;

  return (
    <div style={statCard}>
      <div style={statHead}>
        <div>
          <div style={statTitle}>{title}</div>
          <div style={statValueRow}>
            <span style={statValue}>{value}</span>
            <span style={statSuffix}>{suffix}</span>
          </div>
        </div>
        <div style={{ ...statIcon, background: currentTone.soft, color: currentTone.strong }}>{icon}</div>
      </div>
      {typeof progress === 'number' ? (
        <div style={miniTrack}>
          <div style={{ ...miniFill, width: `${Math.min(progress, 100)}%`, background: currentTone.strong }} />
        </div>
      ) : null}
      <div style={statNote}>{note}</div>
    </div>
  );
};

export default ChangesStats;

const page = {
  minHeight: '100vh',
  padding: '24px',
  background: 'linear-gradient(180deg, #eef4ef 0%, #f7fafc 100%)'
};

const shell = {
  background: '#ffffff',
  borderRadius: '28px',
  padding: '28px',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(226, 232, 240, 0.9)'
};

const heroPanel = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  padding: '18px 20px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #f8fdff 0%, #f7f7ff 100%)',
  border: '1px solid #e6eef8',
  marginBottom: '18px'
};

const titleRow = { display: 'flex', alignItems: 'flex-start', gap: '12px' };
const titleIconWrap = {
  width: '36px',
  height: '36px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #dff6ff 0%, #ecfeff 100%)',
  flexShrink: 0
};
const title = { margin: 0, fontSize: '24px', lineHeight: 1.2, fontWeight: 800, color: '#0f172a' };
const subtitle = { margin: '6px 0 0', fontSize: '13px', color: '#64748b', maxWidth: '620px' };
const monthBox = { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' };
const monthButton = { width: '34px', height: '34px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const monthLabel = { minWidth: '156px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155' };
const errorBox = { marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', fontSize: '13px' };
const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' };
const statCard = { padding: '18px', borderRadius: '22px', border: '1px solid #edf2f7', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' };
const statHead = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' };
const statTitle = { fontSize: '14px', fontWeight: 600, color: '#64748b' };
const statValueRow = { display: 'flex', gap: '8px', alignItems: 'baseline', marginTop: '10px' };
const statValue = { fontSize: '38px', lineHeight: 1, fontWeight: 800, color: '#0f172a' };
const statSuffix = { fontSize: '14px', color: '#64748b', fontWeight: 600 };
const statIcon = { width: '42px', height: '42px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statNote = { marginTop: '12px', fontSize: '12px', color: '#64748b' };
const miniTrack = { marginTop: '12px', width: '100%', height: '6px', borderRadius: '999px', background: '#edf2f7', overflow: 'hidden' };
const miniFill = { height: '100%', borderRadius: '999px' };
const contentGrid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '16px', marginBottom: '20px' };
const panel = { padding: '20px', borderRadius: '22px', border: '1px solid #eef2f7', background: '#ffffff', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)' };
const panelHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' };
const panelTitle = { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' };
const panelSubtitle = { margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' };
const progressItem = { marginTop: '18px' };
const progressHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' };
const progressLabel = { fontSize: '14px', fontWeight: 600, color: '#334155' };
const progressValue = { fontSize: '14px', color: '#334155' };
const progressTrack = { width: '100%', height: '9px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' };
const progressFill = { height: '100%', borderRadius: '999px' };
const filterBox = { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #d9e3ef', borderRadius: '12px', padding: '8px 10px', background: '#ffffff' };
const filterSelect = { border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' };
const quickFacts = { display: 'grid', gap: '12px', marginTop: '6px' };
const quickFactCard = { padding: '14px 16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #eef2f7' };
const quickFactLabel = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' };
const quickFactValue = { fontSize: '15px', color: '#0f172a' };
const tablePanel = { borderRadius: '22px', border: '1px solid #eef2f7', background: '#ffffff', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)', overflow: 'hidden' };
const tableHeader = { padding: '20px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' };
const badgeRow = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const summaryBadge = { display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 };
const tableWrap = { overflowX: 'auto' };
const table = { width: '100%', borderCollapse: 'collapse', minWidth: '760px' };
const theadRow = { background: '#f8fafc' };
const th = { padding: '15px 20px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', textAlign: 'left' };
const bodyRow = { borderTop: '1px solid #f1f5f9' };
const td = { padding: '18px 20px', verticalAlign: 'middle', color: '#334155', fontSize: '14px' };
const emptyCell = { padding: '28px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' };
const nameCell = { display: 'flex', alignItems: 'center', gap: '12px' };
const avatar = { width: '36px', height: '36px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)', color: '#2563eb', flexShrink: 0 };
const employeeName = { fontSize: '14px', fontWeight: 700, color: '#0f172a' };
const employeeMeta = { fontSize: '12px', color: '#94a3b8', marginTop: '4px' };
const deptTag = { display: 'inline-flex', alignItems: 'center', padding: '7px 12px', borderRadius: '999px', background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600, border: '1px solid #e2e8f0' };
const typeTag = { display: 'inline-flex', alignItems: 'center', padding: '7px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 };
const viewButton = { border: '1px solid #d9e3ef', background: '#ffffff', color: '#475569', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };
const paginationBar = { padding: '16px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderTop: '1px solid #eef2f7' };
const pageButton = { border: '1px solid #d9e3ef', background: '#ffffff', color: '#475569', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minWidth: '74px' };
const disabledPageButton = { opacity: 0.5, cursor: 'not-allowed' };
const pageInfo = { fontSize: '13px', fontWeight: 700, color: '#64748b', minWidth: '88px', textAlign: 'center' };

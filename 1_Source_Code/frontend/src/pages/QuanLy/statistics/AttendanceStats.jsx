import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock3, Send, TimerReset, TrendingUp } from 'lucide-react';
import { attendanceService } from '../../../services/attendanceService';

const progressColors = {
  red: '#ef4444',
  orange: '#f97316',
  blue: '#3b82f6',
  emerald: '#10b981',
  violet: '#8b5cf6'
};

const formatMinutes = (minutes) => {
  if (!minutes) return '0 phút';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m} phút`;
  if (m <= 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
};

const formatMonth = (monthStr) => {
  const [year, month] = String(monthStr).split('-');
  return `Tháng ${month}/${year}`;
};

const shiftMonth = (monthStr, delta) => {
  const [year, month] = String(monthStr).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatTrend = (changePct, fallback) => {
  const value = Number(changePct || 0);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}% ${fallback}`;
};

const getTrendStyle = (tone) => {
  if (tone === 'alarming') {
    return {
      color: '#dc2626',
      background: '#fef2f2',
      border: '1px solid #fecaca'
    };
  }

  if (tone === 'stable') {
    return {
      color: '#059669',
      background: '#ecfdf5',
      border: '1px solid #a7f3d0'
    };
  }

  return {
    color: '#0284c7',
    background: '#eff6ff',
    border: '1px solid #bfdbfe'
  };
};

const buildReminderDraft = (emp) => {
  const reminderType = emp.actionType === 'warning' ? 'Cảnh báo' : 'Bình thường';
  const reminderTitle =
    emp.actionType === 'warning'
      ? `Cảnh báo chuyên cần: ${emp.name}`
      : `Nhắc nhở chấm công: ${emp.name}`;

  return {
    source: 'attendance-stats',
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: emp.name,
    departmentId: emp.departmentId ? String(emp.departmentId) : '',
    departmentName: emp.dept,
    target: 'Cá nhân',
    type: reminderType,
    title: reminderTitle,
    content: `
      <p>Chào ${emp.name},</p>
      <p>Hệ thống ghi nhận trong tháng này bạn có vi phạm về giờ giấc chấm công.</p>
      <ul>
        <li>Mã nhân viên: ${emp.employeeCode || 'Chưa cập nhật'}</li>
        <li>Phòng ban: ${emp.dept || 'Chưa xác định'}</li>
        <li>Số lần đi trễ: ${emp.lateCount}</li>
        <li>Tổng thời gian đi trễ: ${formatMinutes(emp.totalLateMinutes)}</li>
      </ul>
      <p>Vui lòng kiểm tra lại lịch làm việc và chủ động cải thiện trong các ngày tới.</p>
    `
  };
};

const AttendanceStats = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleRemind = (emp) => {
    navigate('/QuanLy/notifications', {
      state: {
        prefillNotification: buildReminderDraft(emp)
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadAttendanceStats = async () => {
      try {
        setError('');
        setData(null);
        const response = await attendanceService.getManagerAttendanceStats(selectedMonth);
        if (!isMounted) return;
        if (response?.month && response.month !== selectedMonth) {
          setSelectedMonth(response.month);
        }
        setData(response);
      } catch (err) {
        console.error('API ERROR:', err);
        if (!isMounted) return;
        setError('Không tải được thống kê chấm công.');
      }
    };

    loadAttendanceStats();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const topIssue = useMemo(() => {
    if (!Array.isArray(data?.attentionEmployees) || data.attentionEmployees.length === 0) return null;
    return data.attentionEmployees[0];
  }, [data]);

  if (!data) {
    return <div style={{ padding: 20 }}>{error || 'Đang tải dữ liệu...'}</div>;
  }

  return (
    <div style={container}>
      <div style={wrapper}>
        <div style={header}>
          <div style={headerCopy}>
            <div style={titleRow}>
              <span style={titleIconWrap}>
                <AlarmClock size={18} color="#0ea5e9" />
              </span>
              <div>
                <h2 style={title}>Thống kê Chấm công & Chuyên cần</h2>
                <p style={subtitle}>Giữ nguyên cấu trúc cũ, hiển thị lại gọn hơn và lấy dữ liệu trực tiếp từ database.</p>
              </div>
            </div>
          </div>

          <div style={dateBox}>
            <button
              type="button"
              style={monthNavButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={monthValue}>
              <CalendarDays size={16} color="#0ea5e9" />
              <span>{formatMonth(selectedMonth)}</span>
            </div>
            <button
              type="button"
              style={monthNavButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

        <div style={cardRow}>
          <div style={cardMain}>
            <div style={cardMainHeader}>
              <div>
                <p style={cardMainTitle}>Tổng giờ công thực tế</p>
                <h2 style={cardMainValue}>{data?.summary?.totalWorkHours?.value || 0} giờ</h2>
              </div>
              <span style={cardMainIconWrap}>
                <Clock3 size={18} color="#ffffff" />
              </span>
            </div>
            <span style={cardMainBadge}>
              <TrendingUp size={13} />
              {formatTrend(data?.summary?.totalWorkHours?.changePct, 'so với tháng trước')}
            </span>
          </div>

          <StatCard
            title="Đi trễ / Về sớm"
            value={`${data?.summary?.lateEarly?.value || 0} lượt`}
            note={formatTrend(data?.summary?.lateEarly?.changePct, 'so với tháng trước')}
            icon={<CircleAlert size={17} color="#f59e0b" />}
            tone={data?.summary?.lateEarly?.tone}
          />

          <StatCard
            title="Nghỉ phép / Thai sản"
            value={`${data?.summary?.leaveAbsence?.value || 0} ngày`}
            note={formatTrend(data?.summary?.leaveAbsence?.changePct, 'so với tháng trước')}
            icon={<TimerReset size={17} color="#10b981" />}
            tone={data?.summary?.leaveAbsence?.tone}
          />

          <StatCard
            title="Làm thêm giờ (OT)"
            value={`${data?.summary?.overtime?.value || 0} giờ`}
            note={formatTrend(data?.summary?.overtime?.changePct, 'so với tháng trước')}
            icon={<Clock3 size={17} color="#8b5cf6" />}
            tone="stable"
          />
        </div>

        <div style={contentGrid}>
          <div style={box}>
            <div style={sectionHeader}>
              <div>
                <h4 style={boxTitle}>Tỷ lệ đi trễ theo phòng ban</h4>
                <p style={boxSubtitle}>Phòng ban nào có nhiều lượt vi phạm hơn sẽ nổi lên ở đầu danh sách.</p>
              </div>
            </div>

            {!Array.isArray(data?.departmentLateness) || data.departmentLateness.length === 0 ? (
              <div style={emptyState}>Tháng này chưa ghi nhận vi phạm chấm công theo phòng ban.</div>
            ) : (
              data.departmentLateness.map((d, i) => (
                <Progress
                  key={`${d.department}-${i}`}
                  label={d.department}
                  percent={d.percentage}
                  count={d.count}
                  color={progressColors[d.color] || d.color || '#6b7280'}
                />
              ))
            )}
          </div>

          <div style={spotlightBox}>
            <div style={sectionHeader}>
              <div>
                <h4 style={boxTitle}>Điểm cần chú ý</h4>
                <p style={boxSubtitle}>Nhân viên có số lần đi trễ cao nhất trong tháng đang xem.</p>
              </div>
            </div>

            {topIssue ? (
              <div style={spotlightCard}>
                <div style={spotlightTop}>
                  <div style={spotlightAvatar}>{topIssue.name?.charAt(0)?.toUpperCase() || 'N'}</div>
                  <div>
                    <div style={spotlightName}>{topIssue.name}</div>
                    <div style={spotlightDept}>{topIssue.dept}</div>
                  </div>
                </div>

                <div style={spotlightStats}>
                  <div style={spotlightMetric}>
                    <span style={spotlightMetricLabel}>Số lần trễ</span>
                    <strong style={spotlightMetricValue}>{topIssue.lateCount} lần</strong>
                  </div>
                  <div style={spotlightMetric}>
                    <span style={spotlightMetricLabel}>Tổng thời gian trễ</span>
                    <strong style={spotlightMetricValue}>{formatMinutes(topIssue.totalLateMinutes)}</strong>
                  </div>
                </div>

                <button type="button" style={spotlightButton} onClick={() => handleRemind(topIssue)}>
                  <Send size={15} />
                  Gửi nhắc nhở nhanh
                </button>
              </div>
            ) : (
              <div style={emptyState}>Không có nhân viên nào cần chú ý trong tháng này.</div>
            )}
          </div>
        </div>

        <div style={tablePanel}>
          <div style={sectionHeader}>
            <div>
              <h4 style={boxTitle}>Nhân viên cần chú ý</h4>
              <p style={boxSubtitle}>Danh sách được lấy từ dữ liệu chấm công thật, sắp xếp theo số lần và tổng thời gian đi trễ.</p>
            </div>
            <div style={tableMetaBadge}>{Array.isArray(data?.attentionEmployees) ? data.attentionEmployees.length : 0} nhân viên</div>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr style={thead}>
                  <th style={th}>Nhân viên</th>
                  <th style={th}>Phòng ban</th>
                  <th style={th}>Số lần trễ</th>
                  <th style={th}>Tổng thời gian trễ</th>
                  <th style={{ ...th, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {!Array.isArray(data?.attentionEmployees) || data.attentionEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={emptyTableCell}>Không có dữ liệu vi phạm</td>
                  </tr>
                ) : (
                  data.attentionEmployees.map((item) => (
                    <tr key={item.id} style={row}>
                      <td style={td}>
                        <div style={nameCell}>
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.name} style={avatarImage} />
                          ) : (
                            <div style={avatar}>{item.name?.charAt(0)?.toUpperCase() || 'N'}</div>
                          )}
                          <div>
                            <div style={employeeName}>{item.name}</div>
                            <div style={employeeCode}>Mã NV: {item.employeeCode || 'Chưa cập nhật'}</div>
                          </div>
                        </div>
                      </td>

                      <td style={td}>
                        <span style={deptBadge}>{item.dept}</span>
                      </td>

                      <td style={td}>
                        <span style={badgeRed}>{item.lateCount} lần</span>
                      </td>

                      <td style={td}>{formatMinutes(item.totalLateMinutes)}</td>

                      <td style={{ ...td, textAlign: 'right' }}>
                        <button style={btnSmall} onClick={() => handleRemind(item)}>
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
    </div>
  );
};

export default AttendanceStats;

const StatCard = ({ title, value, note, icon, tone }) => {
  const trendStyle = getTrendStyle(tone);

  return (
    <div style={card}>
      <div style={cardTop}>
        <p style={cardTitle}>{title}</p>
        <span style={cardIcon}>{icon}</span>
      </div>
      <h3 style={cardValue}>{value}</h3>

      <span
        style={{
          ...cardNote,
          color: trendStyle.color,
          background: trendStyle.background,
          border: trendStyle.border
        }}
      >
        {note}
      </span>
    </div>
  );
};

const Progress = ({ label, percent, count, color }) => (
  <div style={{ marginTop: 16 }}>
    <div style={progressHeader}>
      <span style={progressLabel}>{label}</span>
      <span style={progressMeta}>{count} lượt • {percent}%</span>
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

const container = {
  padding: '24px',
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #edf4f1 0%, #f8fafc 100%)'
};

const wrapper = {
  background: '#fff',
  borderRadius: '28px',
  padding: '28px',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(226, 232, 240, 0.9)'
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
  gap: '16px',
  flexWrap: 'wrap'
};

const headerCopy = { flex: '1 1 420px' };
const titleRow = { display: 'flex', alignItems: 'flex-start', gap: '12px' };
const titleIconWrap = {
  width: '38px',
  height: '38px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #dff6ff 0%, #ecfeff 100%)',
  flexShrink: 0
};
const title = { margin: 0, fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#0f172a' };
const subtitle = { margin: '6px 0 0', fontSize: '13px', color: '#64748b', maxWidth: '620px' };

const dateBox = {
  background: '#ffffff',
  padding: '8px',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)'
};

const monthNavButton = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const monthValue = {
  minWidth: '156px',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const errorBox = {
  marginBottom: '16px',
  padding: '12px 14px',
  borderRadius: '14px',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: '13px'
};

const cardRow = {
  display: 'grid',
  gridTemplateColumns: '1.25fr 1fr 1fr 1fr',
  gap: '16px',
  marginBottom: '20px'
};

const cardMain = {
  background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
  color: '#fff',
  padding: '22px',
  borderRadius: '22px',
  boxShadow: '0 18px 30px rgba(14, 165, 233, 0.24)'
};

const cardMainHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start'
};

const cardMainTitle = {
  fontSize: '13px',
  opacity: 0.9,
  margin: 0
};

const cardMainValue = {
  fontSize: '38px',
  fontWeight: 800,
  margin: '10px 0 0'
};

const cardMainIconWrap = {
  width: '42px',
  height: '42px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.18)'
};

const cardMainBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '16px',
  padding: '7px 12px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.18)',
  color: '#ecfeff',
  fontSize: '12px',
  fontWeight: 700
};

const card = {
  background: '#ffffff',
  padding: '18px',
  borderRadius: '22px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
};

const cardTop = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px'
};

const cardTitle = {
  fontSize: '13px',
  color: '#64748b',
  margin: 0
};

const cardIcon = {
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  fontSize: '15px'
};

const cardValue = {
  fontSize: '34px',
  fontWeight: 800,
  margin: '14px 0 16px',
  color: '#1f2937'
};

const cardNote = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700
};

const contentGrid = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
  gap: '16px',
  marginBottom: '20px'
};

const box = {
  padding: '20px',
  background: '#ffffff',
  borderRadius: '22px',
  border: '1px solid #eaf0f6',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)'
};

const spotlightBox = {
  padding: '20px',
  background: 'linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%)',
  borderRadius: '22px',
  border: '1px solid #eaf0f6',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)'
};

const sectionHeader = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  marginBottom: '12px'
};

const boxTitle = {
  margin: 0,
  fontWeight: 700,
  fontSize: '20px',
  color: '#0f172a'
};

const boxSubtitle = {
  margin: '6px 0 0',
  fontSize: '13px',
  color: '#94a3b8'
};

const emptyState = {
  padding: '28px 16px',
  borderRadius: '16px',
  textAlign: 'center',
  color: '#64748b',
  background: '#f8fafc',
  border: '1px dashed #dbe4ee'
};

const progressHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '8px'
};

const progressLabel = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#334155'
};

const progressMeta = {
  fontSize: '13px',
  color: '#64748b'
};

const progressBar = {
  height: '9px',
  background: '#e5e7eb',
  borderRadius: '999px',
  overflow: 'hidden'
};

const spotlightCard = {
  padding: '18px',
  borderRadius: '18px',
  background: '#ffffff',
  border: '1px solid #e7eef6',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.04)'
};

const spotlightTop = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const spotlightAvatar = {
  width: '48px',
  height: '48px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)',
  color: '#2563eb',
  flexShrink: 0
};

const spotlightName = {
  fontSize: '16px',
  fontWeight: 800,
  color: '#0f172a'
};

const spotlightDept = {
  marginTop: '4px',
  fontSize: '13px',
  color: '#64748b'
};

const spotlightStats = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginTop: '16px',
  marginBottom: '16px'
};

const spotlightMetric = {
  padding: '12px 14px',
  borderRadius: '14px',
  background: '#f8fafc',
  border: '1px solid #eaf0f6'
};

const spotlightMetricLabel = {
  display: 'block',
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '6px'
};

const spotlightMetricValue = {
  fontSize: '14px',
  color: '#0f172a'
};

const spotlightButton = {
  width: '100%',
  border: 'none',
  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  color: '#ffffff',
  padding: '11px 14px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const tablePanel = {
  padding: '20px',
  background: '#ffffff',
  borderRadius: '22px',
  border: '1px solid #eaf0f6',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)'
};

const tableMetaBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: '999px',
  background: '#eff6ff',
  color: '#2563eb',
  fontSize: '12px',
  fontWeight: 700,
  border: '1px solid #bfdbfe'
};

const tableWrap = {
  overflowX: 'auto'
};

const table = {
  width: '100%',
  minWidth: '760px',
  borderCollapse: 'separate',
  borderSpacing: '0 10px'
};

const thead = {
  textAlign: 'left',
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

const th = {
  padding: '0 14px 8px'
};

const row = {
  background: '#ffffff',
  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)'
};

const td = {
  padding: '16px 14px',
  verticalAlign: 'middle',
  borderTop: '1px solid #eef2f7',
  borderBottom: '1px solid #eef2f7',
  color: '#334155'
};

const emptyTableCell = {
  textAlign: 'center',
  padding: '28px 20px',
  color: '#64748b'
};

const nameCell = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const avatar = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  flexShrink: 0
};

const avatarImage = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0
};

const employeeName = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a'
};

const employeeCode = {
  marginTop: '4px',
  fontSize: '12px',
  color: '#94a3b8'
};

const deptBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 12px',
  borderRadius: '999px',
  background: '#f8fafc',
  color: '#475569',
  fontSize: '12px',
  fontWeight: 600,
  border: '1px solid #e2e8f0'
};

const badgeRed = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  background: '#fee2e2',
  color: '#dc2626',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
  border: '1px solid #fecaca'
};

const btnSmall = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#c2410c',
  padding: '8px 14px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../../services/attendanceService';

const progressColors = {
  red: '#ef4444',
  orange: '#f97316',
  blue: '#3b82f6',
  emerald: '#10b981',
  violet: '#8b5cf6'
};

const formatMinutes = (minutes) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
};

const formatMonth = (monthStr) => {
  const [year, month] = monthStr.split('-');
  return `Tháng ${month}/${year}`;
};

const shiftMonth = (monthStr, delta) => {
  const [year, month] = monthStr.split('-').map(Number);
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
      color: '#ef4444',
      background: '#fef2f2'
    };
  }

  if (tone === 'stable') {
    return {
      color: '#059669',
      background: '#ecfdf5'
    };
  }

  return {
    color: '#0ea5e9',
    background: '#eff6ff'
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

  if (!data) {
    return <div style={{ padding: 20 }}>{error || 'Đang tải dữ liệu...'}</div>;
  }

  return (
    <div style={container}>
      <div style={wrapper}>
        <div style={header}>
          <div>
            <h2 style={title}>Thống kê Chấm công & Chuyên cần</h2>
            <p style={subtitle}>
              Theo dõi tình hình tuân thủ giờ giấc của nhân viên
            </p>
          </div>

          <div style={dateBox}>
            <button
              type="button"
              style={monthNavButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
              aria-label="Tháng trước"
            >
              ‹
            </button>
            <div style={monthValue}>{formatMonth(selectedMonth)}</div>
            <button
              type="button"
              style={monthNavButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
              aria-label="Tháng sau"
            >
              ›
            </button>
          </div>
        </div>

        <div style={cardRow}>
          <div style={cardMain}>
            <p style={cardMainTitle}>Tổng giờ công thực tế</p>
            <h2 style={cardMainValue}>
              {data?.summary?.totalWorkHours?.value || 0} giờ
            </h2>
            <span style={cardMainBadge}>
              {formatTrend(data?.summary?.totalWorkHours?.changePct, 'so với tháng trước')}
            </span>
          </div>

          <StatCard
            title="Đi trễ / Về sớm"
            value={`${data?.summary?.lateEarly?.value || 0} lượt`}
            note={formatTrend(data?.summary?.lateEarly?.changePct, '(Đáng báo động)')}
            icon="◔"
            tone={data?.summary?.lateEarly?.tone}
          />

          <StatCard
            title="Nghỉ phép / Vắng mặt"
            value={`${data?.summary?.leaveAbsence?.value || 0} ngày`}
            note={formatTrend(data?.summary?.leaveAbsence?.changePct, '(Ổn định)')}
            icon="☷"
            tone={data?.summary?.leaveAbsence?.tone}
          />

          <StatCard
            title="Làm thêm giờ (OT)"
            value={`${data?.summary?.overtime?.value || 0} giờ`}
            note={formatTrend(data?.summary?.overtime?.changePct, 'so với tháng trước')}
            icon="◌"
            tone="stable"
          />
        </div>

        <div style={box}>
          <h4 style={boxTitle}>Tỷ lệ đi trễ theo phòng ban</h4>

          {Array.isArray(data?.departmentLateness) && data.departmentLateness.map((d, i) => (
            <Progress
              key={i}
              label={d.department}
              percent={d.percentage}
              color={progressColors[d.color] || d.color || '#6b7280'}
            />
          ))}
        </div>

        <div style={box}>
          <h4 style={boxTitle}>Nhân viên cần chú ý</h4>

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
              {!Array.isArray(data?.attentionEmployees) || data.attentionEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>
                    Không có dữ liệu vi phạm
                  </td>
                </tr>
              ) : (
                data.attentionEmployees.map((item, index) => (
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

                    <td>{formatMinutes(item.totalLateMinutes)}</td>

                    <td>
                      <button
                        style={btnSmall}
                        onClick={() => handleRemind(item)}
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
          background: trendStyle.background
        }}
      >
        {note}
      </span>
    </div>
  );
};

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
  marginBottom: '20px',
  gap: '16px',
  flexWrap: 'wrap'
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
  padding: '8px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const monthNavButton = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  border: 'none',
  background: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: '22px',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
};

const monthValue = {
  minWidth: '150px',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a'
};

const cardRow = {
  display: 'grid',
  gridTemplateColumns: '1.25fr 1fr 1fr 1fr',
  gap: '16px'
};

const cardMain = {
  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  color: '#fff',
  padding: '20px',
  borderRadius: '16px',
  boxShadow: '0 12px 24px rgba(14, 165, 233, 0.22)'
};

const cardMainTitle = {
  fontSize: '13px',
  opacity: 0.9
};

const cardMainValue = {
  fontSize: '38px',
  fontWeight: 800,
  margin: '8px 0 14px'
};

const cardMainBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.18)',
  color: '#ecfeff',
  fontSize: '12px',
  fontWeight: 600
};

const card = {
  background: '#ffffff',
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)'
};

const cardTop = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px'
};

const cardTitle = {
  fontSize: '13px',
  color: '#64748b'
};

const cardIcon = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  color: '#f59e0b',
  fontSize: '15px'
};

const cardValue = {
  fontSize: '34px',
  fontWeight: 700,
  margin: '12px 0 16px',
  color: '#1f2937'
};

const cardNote = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
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
  whiteSpace: 'nowrap'
};

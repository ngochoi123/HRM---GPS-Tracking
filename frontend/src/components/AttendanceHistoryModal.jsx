import React, { useMemo } from 'react';
import { Calendar, Search, Clock3, CalendarDays, AlertTriangle, Link2, CheckCircle2, PlayCircle } from 'lucide-react';
import './AttendanceHistoryModal.css';

const weekdayVi = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 ? 'CN' : `Thứ ${day + 1}`;
};

const fmtDateVi = (date) => new Date(date).toLocaleDateString('vi-VN');

const fmtTime = (value) => {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const fmtHour = (value) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0,0';
  return n.toFixed(1).replace('.', ',');
};

const statusLabel = (row) => {
  const status = row?.status;
  const hasCheckIn = !!row?.check_in_time;
  const hasCheckOut = !!row?.check_out_time;
  if (hasCheckIn && !hasCheckOut) {
    return { text: 'Đang làm', tone: 'working', icon: <PlayCircle size={14} /> };
  }
  switch (status) {
    case 'on_time':
      return { text: 'Đúng giờ', tone: 'ok', icon: <CheckCircle2 size={14} /> };
    case 'late':
      return { text: 'Đi trễ', tone: 'warn', icon: <AlertTriangle size={14} /> };
    case 'early_leave':
      return { text: 'Về sớm', tone: 'warn', icon: <AlertTriangle size={14} /> };
    case 'absent':
      return { text: 'Vắng mặt', tone: 'bad', icon: <AlertTriangle size={14} /> };
    default:
      return { text: 'Đang cập nhật', tone: 'warn', icon: <AlertTriangle size={14} /> };
  }
};

export default function AttendanceHistoryModal({
  open,
  onClose,
  monthYear,
  setMonthYear,
  loading,
  error,
  data,
  onSearch,
}) {
  const summary = data?.summary || null;
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  const { month, year } = useMemo(() => {
    const [y, m] = String(monthYear || '').split('-');
    const yy = Number(y);
    const mm = Number(m);
    return {
      year: Number.isFinite(yy) ? yy : new Date().getFullYear(),
      month: Number.isFinite(mm) ? mm : new Date().getMonth() + 1,
    };
  }, [monthYear]);

  const monthLabel = useMemo(() => `Tháng ${month}, ${year}`, [month, year]);

  const totalHours = summary?.totalHours ?? 0;
  const daysWorked = summary?.daysWorked ?? 0;
  const workingDaysInMonth = summary?.workingDaysInMonth ?? null;
  const lateOrEarlyCount = summary?.lateOrEarlyCount ?? 0;
  const compliancePercent = summary?.compliancePercent ?? 0;

  if (!open) return null;

  return (
    <div className="ahm-overlay" role="dialog" aria-modal="true">
      <div className="ahm-shell">
        <div className="ahm-top">
          <div className="ahm-title">
            <h2>Lịch Sử chấm công</h2>
            <p>Chi tiết thời gian làm việc và chuyên cần của bạn.</p>
          </div>

          <div className="ahm-filter">
            <span className="ahm-filter-label">
              <Calendar size={16} className="ahm-icon-calendar" /> Tháng:
            </span>
            <div className="ahm-month-vi" aria-label="Chọn tháng năm">
              <select
                className="ahm-month-vi-select"
                value={String(month)}
                onChange={(e) => {
                  const mm = String(e.target.value).padStart(2, '0');
                  setMonthYear(`${year}-${mm}`);
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return (
                    <option key={m} value={String(m)}>
                      Tháng {m}
                    </option>
                  );
                })}
              </select>
              <select
                className="ahm-month-vi-select"
                value={String(year)}
                onChange={(e) => {
                  const yy = e.target.value;
                  const mm = String(month).padStart(2, '0');
                  setMonthYear(`${yy}-${mm}`);
                }}
              >
                {Array.from({ length: 7 }).map((_, i) => {
                  const y = new Date().getFullYear() - 3 + i;
                  return (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
            <button className="ahm-search" type="button" onClick={onSearch} aria-label="Tìm kiếm">
              <Search size={18} />
            </button>
          </div>
        </div>

        <div className="ahm-body">
          <div className="ahm-stats">
            <div className="ahm-stat primary">
              <div className="ahm-stat-icon">
                <Clock3 size={18} className="ahm-icon-total-hours" />
              </div>
              <div>
                <div className="ahm-stat-label">Tổng giờ làm việc</div>
                <div className="ahm-stat-value">{fmtHour(totalHours)}</div>
                <div className="ahm-stat-sub">{monthLabel ? `~ ${monthLabel}` : '—'}</div>
              </div>
            </div>

            <div className="ahm-stat">
              <div className="ahm-stat-icon">
                <CalendarDays size={18} className="ahm-icon-days-worked" />
              </div>
              <div>
                <div className="ahm-stat-label">Ngày công thực tế</div>
                <div className="ahm-stat-value">
                  {daysWorked}
                  {workingDaysInMonth != null ? (
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}> / {workingDaysInMonth} ngày</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ahm-stat">
              <div className="ahm-stat-icon">
                <AlertTriangle size={18} className="ahm-icon-late-early" />
              </div>
              <div>
                <div className="ahm-stat-label">Đi trễ / Về sớm</div>
                <div className="ahm-stat-value">{lateOrEarlyCount} lần</div>
              </div>
            </div>

            <div className="ahm-stat">
              <div className="ahm-stat-icon">
                <Link2 size={18} className="ahm-icon-compliance" />
              </div>
              <div>
                <div className="ahm-stat-label">Công chuẩn (Ước tính)</div>
                <div className="ahm-stat-value">{compliancePercent}%</div>
              </div>
            </div>
          </div>

          <div className="ahm-section-head">
            <div className="ahm-section-title">Chi tiết theo ngày ({monthLabel || '—'})</div>
            <div className="ahm-legend" aria-label="Chú thích">
                    <span><i className="ahm-dot green" /> Đúng giờ</span>
                    <span><i className="ahm-dot yellow" /> Đi trễ / Về sớm</span>
              <span><i className="ahm-dot red" /> Vắng mặt</span>
            </div>
          </div>

          <div className="ahm-table-wrap">
            {loading ? (
              <div className="ahm-state">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="ahm-state" style={{ color: '#b91c1c' }}>{error}</div>
            ) : rows.length === 0 ? (
              <div className="ahm-state">Không có dữ liệu trong tháng này.</div>
            ) : (
              <table className="ahm-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Thứ</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Tổng giờ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const s = statusLabel(r);
                    return (
                      <tr key={`${r.attendance_date}_${String(r.check_in_time || '')}`}>
                        <td>{fmtDateVi(r.attendance_date)}</td>
                        <td>{weekdayVi(r.attendance_date)}</td>
                        <td>{fmtTime(r.check_in_time)}</td>
                        <td>{fmtTime(r.check_out_time)}</td>
                        <td style={{ fontWeight: 900 }}>{fmtHour(r.total_work_hours)}</td>
                        <td>
                          <span className={`ahm-pill ${s.tone}`}>
                            {s.icon} {s.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="ahm-footer">
          <button type="button" className="ahm-close" onClick={onClose}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}


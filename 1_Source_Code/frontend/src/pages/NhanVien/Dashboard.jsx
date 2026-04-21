import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { attendanceService } from '../../services/attendanceService';
import { notificationService } from '../../services/notificationService';

const SHIFT_START_HOUR = 7;
const SHIFT_START_MINUTE = 30;
const SHIFT_END_HOUR = 17;
const SHIFT_END_MINUTE = 0;
const LUNCH_START_HOUR = 11;
const LUNCH_START_MINUTE = 30;
const LUNCH_END_HOUR = 13;
const LUNCH_END_MINUTE = 0;
const STANDARD_DAY_HOURS = 8;

const createTimeToday = (hour, minute) => {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return value;
};

const getRemainingWorkMinutes = (currentTime) => {
  const now = currentTime instanceof Date ? currentTime : new Date();
  const shiftStart = createTimeToday(SHIFT_START_HOUR, SHIFT_START_MINUTE);
  const lunchStart = createTimeToday(LUNCH_START_HOUR, LUNCH_START_MINUTE);
  const lunchEnd = createTimeToday(LUNCH_END_HOUR, LUNCH_END_MINUTE);
  const shiftEnd = createTimeToday(SHIFT_END_HOUR, SHIFT_END_MINUTE);

  if (now >= shiftEnd) return 0;
  if (now < shiftStart) return STANDARD_DAY_HOURS * 60;
  if (now < lunchStart) {
    return Math.round((lunchStart - now) / 60000) + Math.round((shiftEnd - lunchEnd) / 60000);
  }
  if (now < lunchEnd) {
    return Math.round((shiftEnd - lunchEnd) / 60000);
  }
  return Math.max(0, Math.round((shiftEnd - now) / 60000));
};

const formatMinutesAsHours = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}m`;
};

const formatWorkDays = (value) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0';
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const formatNotificationTime = (value, currentTime = new Date()) => {
  if (!value) return 'Hệ thống';

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'Hệ thống';

  const now = currentTime instanceof Date ? currentTime : new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return createdAt.toLocaleDateString('vi-VN');
};

const getNotificationDotClass = (notificationType, isRead) => {
  if (!isRead) return 'green';
  return notificationType === 'warning' ? 'orange' : 'gray';
};

const getWorkStatus = (checkInTime, checkOutTime, currentTime) => {
  const now = currentTime instanceof Date ? currentTime : new Date();
  const shiftStart = createTimeToday(SHIFT_START_HOUR, SHIFT_START_MINUTE);
  const shiftEnd = createTimeToday(SHIFT_END_HOUR, SHIFT_END_MINUTE);
  const lunchStart = createTimeToday(LUNCH_START_HOUR, LUNCH_START_MINUTE);
  const lunchEnd = createTimeToday(LUNCH_END_HOUR, LUNCH_END_MINUTE);

  if (!checkInTime) {
    if (now < shiftStart) {
      const diff = Math.floor((shiftStart - now) / 60000);
      return {
        text: `Còn ${diff} phút để vào ca`,
        type: 'success',
        canCheckIn: true
      };
    }

    if (now >= shiftEnd) {
      return { text: 'Hết ca làm', type: 'done', canCheckIn: false };
    }

    const lateMinutes = Math.floor((now - shiftStart) / 60000);
    return {
      text: `Bạn đã đi trễ ${lateMinutes} phút`,
      type: 'danger',
      canCheckIn: true
    };
  }

  if (checkInTime && !checkOutTime) {
    if (now >= shiftEnd) {
      const overtimeMinutes = Math.abs(Math.floor((shiftEnd - now) / 60000));
      return {
        text: `Quá giờ ${overtimeMinutes} phút`,
        type: 'danger',
        canCheckIn: false
      };
    }

    if (now >= lunchStart && now < lunchEnd) {
      return {
        text: 'Đang trong giờ nghỉ trưa',
        type: 'warning',
        canCheckIn: false
      };
    }

    return {
      text: `Còn ${getRemainingWorkMinutes(now)} phút để checkout`,
      type: 'warning',
      canCheckIn: false
    };
  }

  return {
    text: 'Đã hoàn thành ca',
    type: 'done',
    canCheckIn: false
  };
};

const getTimeRemaining = (checkInTime, checkOutTime, currentTime) => {
  const now = currentTime instanceof Date ? currentTime : new Date();
  const shiftStart = createTimeToday(SHIFT_START_HOUR, SHIFT_START_MINUTE);
  const shiftEnd = createTimeToday(SHIFT_END_HOUR, SHIFT_END_MINUTE);

  if (!checkInTime) {
    if (now < shiftStart) {
      return `Còn ${Math.floor((shiftStart - now) / 60000)} phút`;
    }
    if (now >= shiftEnd) {
      return 'Hết ca';
    }
    return 'Chưa vào ca';
  }

  if (checkInTime && !checkOutTime) {
    if (now >= shiftEnd) return 'Hết giờ';
    return formatMinutesAsHours(getRemainingWorkMinutes(now));
  }

  return 'Đã xong';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    name: '',
    stats: {},
  });
  const [attendance, setAttendance] = useState({
    checkIn: null,
    checkOut: null
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const employeeId = useMemo(() => {
    if (!user) return null;
    return user.employee_id || user.id || null;
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!employeeId) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      attendanceService.getSummary(employeeId),
      attendanceService.getHistory(employeeId, { month, year })
    ])
      .then(([summaryResult, historyResult]) => {
        const attendanceToday = summaryResult?.data?.attendanceToday || {};
        const historyRows = Array.isArray(historyResult?.data?.rows) ? historyResult.data.rows : [];
        const historySummary = historyResult?.data?.summary || {};
        const absentCount = historyRows.filter((row) => row?.status === 'absent').length;

        setData({
          name: user?.full_name || user?.name || '',
          stats: {
            present: historySummary.daysWorked || 0,
            late: historySummary.lateOrEarlyCount || 0,
            absent: absentCount
          }
        });

        setAttendance({
          checkIn: attendanceToday.checkInTime || null,
          checkOut: attendanceToday.checkOutTime || null
        });
      })
      .catch((err) => console.error(err));
  }, [employeeId, user]);

  useEffect(() => {
    if (!employeeId) return;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const list = await notificationService.getMyBell(employeeId);
        if (!cancelled) {
          setNotifications(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (!cancelled) console.error(error);
      }
    };

    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    const onCreated = () => {
      void loadNotifications();
    };

    window.addEventListener('newNotificationCreated', onCreated);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('newNotificationCreated', onCreated);
    };
  }, [employeeId]);

  const workStatus = getWorkStatus(attendance.checkIn, attendance.checkOut, currentTime);
  const displayedNotifications = notifications.slice(0, 2);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content-box">
        <div className="left-section">
          <div className="checkin-card">
            <div className="checkin-info">
              <h4 className="date-text">
                {currentTime.toLocaleDateString('vi-VN')}
              </h4>

              <h2 className="time-text">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </h2>

              <div className="status-badge">
                <span className="icon-check">✓</span>
                <span>{workStatus.text}</span>
              </div>

              <p className="gps-status">● Tọa độ GPS sẵn sàng</p>
            </div>

            <div className="checkin-action-group">
              <button
                className="checkin-button"
                
                onClick={() => navigate('/NhanVien/checkin', {
                  state: { employeeId }
                })}
              >
                ĐIỂM DANH VÀO
              </button>

              <p className="external-status-text">
                Trạng thái:{' '}
                <span>
                  {attendance.checkIn
                    ? attendance.checkOut
                      ? 'Đã checkout'
                      : 'Đã check-in'
                    : 'Chưa check-in'}
                </span>
              </p>
            </div>
          </div>

          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon-wrapper success">✓</div>
              <p>Ngày công tháng</p>
              <h3>{formatWorkDays(data.stats.present)}</h3>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper warning">!</div>
              <p>Đi trễ / Về sớm</p>
              <h3 className="warning-text">{data.stats.late || 0}</h3>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper danger">X</div>
              <p>Ngày vắng mặt</p>
              <h3 className="danger-text">{data.stats.absent || 0}</h3>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="info-card">
            <h4 className="section-title">Ca làm việc hôm nay</h4>

            <div className="info-item">
              <span className="time-label">Giờ vào ca</span>
              <span className="time-value">07:30 AM</span>
            </div>

            <div className="info-item">
              <span className="time-label">Giờ ra ca</span>
              <span className="time-value">05:00 PM</span>
            </div>

            <div className="time-remaining-container">
              <div className="info-item remaining">
                <span>Thời gian còn lại</span>
                <span className="time-remaining-value">
                  {getTimeRemaining(attendance.checkIn, attendance.checkOut, currentTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="notification-card">
            <div className="notif-header">
              <h4>Thông báo</h4>
              <button
                type="button"
                className="see-all see-all-button"
                onClick={() => window.dispatchEvent(new Event('openNotificationBell'))}
              >
                Xem tất cả
              </button>
            </div>

            <ul className="notif-list">
              {displayedNotifications.length > 0 ? (
                displayedNotifications.map((notification) => {
                  const dotClass = getNotificationDotClass(
                    notification?.notification_type,
                    Boolean(notification?.is_read)
                  );

                  return (
                    <li key={notification.id}>
                      <div className={`notif-dot ${dotClass}`}></div>
                      <div className="notif-content">
                        <p>{notification.title || 'Thông báo hệ thống'}</p>
                        <span className="notif-time">
                          {formatNotificationTime(notification.created_at, currentTime)}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="notif-empty">Chưa có thông báo</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

//  STATUS
const getWorkStatus = (checkInTime, checkOutTime) => {
  const now = new Date();

  const shifts = [
    { name: 'morning', start: 7, end: 11 },
    { name: 'afternoon', start: 13, end: 17 }
  ];

  const currentShift = shifts.find(shift => {
    const start = new Date();
    start.setHours(shift.start, 0, 0);

    const end = new Date();
    end.setHours(shift.end, 0, 0);

    return now >= start && now <= end;
  });

  if (!currentShift) {
    return { text: 'Hết ca làm', type: 'done', canCheckIn: false };
  }

  const start = new Date();
  start.setHours(currentShift.start, 0, 0);

  const end = new Date();
  end.setHours(currentShift.end, 0, 0);

  if (!checkInTime) {
    const diff = Math.floor((now - start) / 60000);

    if (diff < 0) {
      return {
        text: `Còn ${Math.abs(diff)} phút để vào ca`,
        type: 'success',
        canCheckIn: true
      };
    } else {
      return {
        text: `Bạn đã đi trễ ${diff} phút`,
        type: 'danger',
        canCheckIn: true
      };
    }
  }

  if (checkInTime && !checkOutTime) {
    const diff = Math.floor((end - now) / 60000);

    return {
      text:
        diff > 0
          ? `Còn ${diff} phút để checkout`
          : `Quá giờ ${Math.abs(diff)} phút`,
      type: diff > 0 ? 'warning' : 'danger',
      canCheckIn: false
    };
  }

  return {
    text: 'Đã hoàn thành ca',
    type: 'done',
    canCheckIn: false
  };
};

//  TIME REMAINING
const getTimeRemaining = (checkInTime, checkOutTime) => {
  const now = new Date();

  const shifts = [
    { name: 'morning', start: 7, end: 11 },
    { name: 'afternoon', start: 13, end: 17 }
  ];

  let currentShift = shifts.find(shift => {
    const start = new Date();
    start.setHours(shift.start, 0, 0);

    const end = new Date();
    end.setHours(shift.end, 0, 0);

    return now >= start && now <= end;
  });

  // nếu chưa tới ca → lấy ca tiếp theo
  if (!currentShift) {
    currentShift = shifts.find(shift => {
      const start = new Date();
      start.setHours(shift.start, 0, 0);
      return now < start;
    });
  }

  if (!currentShift) return 'Hết ca';

  const start = new Date();
  start.setHours(currentShift.start, 0, 0);

  const end = new Date();
  end.setHours(currentShift.end, 0, 0);

  // ❌ chưa check-in
  if (!checkInTime) {
    if (now < start) {
      const diff = Math.floor((start - now) / 60000);
      return `Còn ${diff} phút`;
    } else {
      const diff = Math.floor((now - start) / 60000);
      return `Chưa vào ca`;
    }
  }

  // ✅ đã check-in
  if (checkInTime && !checkOutTime) {
    const diff = Math.floor((end - now) / 60000);

    if (diff <= 0) return 'Hết giờ';

    const h = Math.floor(diff / 60);
    const m = diff % 60;

    return `${h}h ${m}m`;
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) return;

    fetch(`http://localhost:5000/api/employee/dashboard/${user.id}`)
      .then(res => res.json())
      .then(result => {
        if (!result.employee) return;

        setData({
          name: result.employee.full_name || '',
          stats: result.stats || {}
        });

        setAttendance({
          checkIn: result.checkIn,
          checkOut: result.checkOut
        });
      })
      .catch(err => console.error(err));

  }, []);

  const workStatus = getWorkStatus(attendance.checkIn, attendance.checkOut);

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
                disabled={!workStatus.canCheckIn}
                onClick={() => navigate('/NhanVien/checkin',{
  state: { employeeId: JSON.parse(localStorage.getItem('user')).id }
})}
              >
                ĐIỂM DANH VÀO
              </button>

              <p className="external-status-text">
                Trạng thái:{' '}
                <span >
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
              <h3>{data.stats.present || 0}</h3>
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
              <span className="time-value">07:00 AM</span>
            </div>

            <div className="info-item">
              <span className="time-label">Giờ ra ca</span>
              <span className="time-value">05:00 PM</span>
            </div>

            <div className="time-remaining-container">
              <div className="info-item remaining">
                <span>Thời gian còn lại</span>
                <span className="time-remaining-value">
                  {getTimeRemaining(attendance.checkIn, attendance.checkOut)}
                </span>
              </div>
            </div>
          </div>

          <div className="notification-card">
            <div className="notif-header">
              <h4>Thông báo</h4>
              <a href="#" className="see-all">Xem tất cả</a>
            </div>

            <ul className="notif-list">
              <li>
                <div className="notif-dot green"></div>
                <div className="notif-content">
                  <p>Duyệt đơn xin nghỉ phép</p>
                  <span className="notif-time">10 phút trước</span>
                </div>
              </li>

              <li>
                <div className="notif-dot orange"></div>
                <div className="notif-content">
                  <p>Bạn chưa check-in hôm nay</p>
                  <span className="notif-time">Hệ thống</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
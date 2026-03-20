import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-wrapper">
      {/* VÒNG TỔNG MÀU XANH BAO QUANH CHÍNH LÀ ĐÂY */}
      <div className="dashboard-content-box">
        
        {/* CỘT TRÁI: ĐIỂM DANH & THỐNG KÊ */}
        <div className="left-section">
          <div className="checkin-card">
            <div className="checkin-info">
              <h4 className="date-text">Thứ Ba, 17 tháng 3, 2026</h4>
              <h2 className="time-text">7:55 AM</h2>
              <div className="status-badge">
                <span className="icon-check">✓</span>
                <span>Bạn đang đến sớm 5 phút</span>
              </div>
              <p className="gps-status">● Tọa độ GPS sẵn sàng</p>
            </div>
            
            <button className="checkin-button">
              <span className="btn-main-text">ĐIỂM DANH VÀO</span>
              <span className="btn-sub-text">Trạng thái: Chưa Check-in</span>
            </button>
          </div>

          {/* HÀNG THỐNG KÊ - ĐÃ SỬA ĐỂ CHIỀU CAO BẰNG NHAU */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon-wrapper success">✓</div>
              <p>Ngày công tháng</p>
              <h3>12</h3>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon-wrapper warning">!</div>
              <p>Đi trễ / Về sớm</p>
              <h3 className="warning-text">02</h3>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon-wrapper danger">X</div>
              <p>Ngày vắng mặt</p>
              <h3 className="danger-text">0</h3>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CA LÀM & THÔNG BÁO */}
        <div className="right-section">
          <div className="info-card">
            <h4 className="section-title">Ca làm việc hôm nay</h4>
            <div className="info-item">
              <span className="time-value1" >Giờ vào ca</span>
              <span className="time-value">08:00 AM</span>
            </div>
            <div className="info-item">
              <span className="time-value1" >Giờ ra ca</span>
              <span className="time-value">05:00 PM</span>
            </div>
            <div className="time-remaining-container">
                <div className="info-item remaining">
                    <span>Thời gian còn lại</span>
                    <span className="time-remaining-value">8h 5m</span>
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
                  <p>Duyệt đơn xin nghỉ phép ngày 20/03/2026.</p>
                  <span className="notif-time">10 phút trước • HR Dept</span>
                </div>
              </li>
              <li>
                <div className="notif-dot orange"></div>
                <div className="notif-content">
                  <p>Lưu ý: Bạn chưa điểm danh vào ca sáng nay!</p>
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
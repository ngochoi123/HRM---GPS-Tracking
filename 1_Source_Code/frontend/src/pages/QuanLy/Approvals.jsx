import React from 'react';
<<<<<<< HEAD
import { FaRegSquareCheck } from "react-icons/fa6";
import { CiCircleCheck } from "react-icons/ci";
import { MdHistory,MdOutlineRemoveRedEye } from "react-icons/md";
import "./Approvals.css";

const Approvals = () => {
  return (
    <div className="approvals-container">

         {/* ================= Header ================= */}
        <div className="approvals-header">
            
              <div>
                <h2 className="approvals-title"><span className="approvals-icon-wrapper"><FaRegSquareCheck className="approvals-icon-main" /></span>Trung tâm phê duyệt đơn từ</h2>
                <p className="approvals-text">
                  Quản lý, xét duyệt, các yêu cầu nghỉ phép, tăng ca của đội ngũ.
                </p>
              </div>
            
              <div className="approvals-header-right">
                <button
                  className="approvals-btn-history"
                  
                >
                 <MdHistory  size={18} /> Lịch sử phê duyệt
                </button>
                <button
                  className="approvals-btn-all"
                  
                >
                  <CiCircleCheck strokeWidth={1} size={18}/>Duyệt tất cả
                </button>
              </div>

            
        </div>
        {/* ================= Stats bar ================= */}
        <div className="approvals-statsbar">
          <div className="approvals-statsbar-left">
            <div className="stat-group">
              <span className="stat-label">CHỜ DUYỆT</span>
              <span className="stat-number orange">12</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-group">
              <span className="stat-label">ĐÃ DUYỆT (TUẦN)</span>
              <span className="stat-number green">45</span>
            </div>
            <div className="stat-divider"></div>
          </div>

          <div className="approvals-statsbar-right">
            <div className="filter-tabs">
              <button className="filter-tab active">Tất cả yêu cầu</button>
              <button className="filter-tab">Nghỉ phép</button>
              <button className="filter-tab">Làm thêm giờ (OT)</button>      
            </div>
          </div>
        </div>
        {/* ================= Content ================= */}
        <div className="approvals-content">
        <h3 className="content-title">YÊU CẦU TỪ NHÂN VIÊN</h3>

        {/* Card 1 */}
        <div className="request-card">
          <div className="card-border-left" style={{ backgroundColor: "#10b981" }}></div>
          <div className="card-user-section">
            <div className="avatar">CD</div>
            <div className="user-info">
              <span className="user-name">Chu Tuấn Dũng</span>
              <span className="user-role">Frontend Developer</span>
            </div>
          </div>
          <div className="card-info-section">
            <div className="tag-wrapper">
              <span className="tag-type green-bg">🍃 Nghỉ phép năm</span>
              <span className="tag-status">🕒 Gửi 5 giờ trước</span>
            </div>
            <h4 className="request-title">Xin nghỉ phép giải quyết việc gia đình</h4>
            <p className="request-time">Thời gian: Chiều 14/03/2026 (0.5 ngày)</p>
          </div>
          <div className="card-action-section">
            <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
            <div className="action-buttons">
              <button className="btn-text-reject">Từ chối</button>
              <button className="btn-approve-primary">Phê duyệt</button>
            </div>
          </div>
        </div>
        <div className="request-card">
          <div className="card-border-left" style={{ backgroundColor: "#10b981" }}></div>
          <div className="card-user-section">
            <div className="avatar">CD</div>
            <div className="user-info">
              <span className="user-name">Chu Tuấn Dũng</span>
              <span className="user-role">Frontend Developer</span>
            </div>
          </div>
          <div className="card-info-section">
            <div className="tag-wrapper">
              <span className="tag-type green-bg">🍃 Nghỉ phép năm</span>
              <span className="tag-status">🕒 Gửi 5 giờ trước</span>
            </div>
            <h4 className="request-title">Xin nghỉ phép giải quyết việc gia đình</h4>
            <p className="request-time">Thời gian: Chiều 14/03/2026 (0.5 ngày)</p>
          </div>
          <div className="card-action-section">
            <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
            <div className="action-buttons">
              <button className="btn-text-reject">Từ chối</button>
              <button className="btn-approve-primary">Phê duyệt</button>
            </div>
          </div>
        </div>
        <div className="request-card">
          <div className="card-border-left" style={{ backgroundColor: "#10b981" }}></div>
          <div className="card-user-section">
            <div className="avatar">CD</div>
            <div className="user-info">
              <span className="user-name">Chu Tuấn Dũng</span>
              <span className="user-role">Frontend Developer</span>
            </div>
          </div>
          <div className="card-info-section">
            <div className="tag-wrapper">
              <span className="tag-type green-bg">🍃 Nghỉ phép năm</span>
              <span className="tag-status">🕒 Gửi 5 giờ trước</span>
            </div>
            <h4 className="request-title">Xin nghỉ phép giải quyết việc gia đình</h4>
            <p className="request-time">Thời gian: Chiều 14/03/2026 (0.5 ngày)</p>
          </div>
          <div className="card-action-section">
            <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
            <div className="action-buttons">
              <button className="btn-text-reject">Từ chối</button>
              <button className="btn-approve-primary">Phê duyệt</button>
            </div>
          </div>
        </div>
        <div className="request-card">
          <div className="card-border-left" style={{ backgroundColor: "#10b981" }}></div>
          <div className="card-user-section">
            <div className="avatar">CD</div>
            <div className="user-info">
              <span className="user-name">Chu Tuấn Dũng</span>
              <span className="user-role">Frontend Developer</span>
            </div>
          </div>
          <div className="card-info-section">
            <div className="tag-wrapper">
              <span className="tag-type green-bg">🍃 Nghỉ phép năm</span>
              <span className="tag-status">🕒 Gửi 5 giờ trước</span>
            </div>
            <h4 className="request-title">Xin nghỉ phép giải quyết việc gia đình</h4>
            <p className="request-time">Thời gian: Chiều 14/03/2026 (0.5 ngày)</p>
          </div>
          <div className="card-action-section">
            <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
            <div className="action-buttons">
              <button className="btn-text-reject">Từ chối</button>
              <button className="btn-approve-primary">Phê duyệt</button>
            </div>
          </div>
        </div>
        <div className="request-card">
          <div className="card-border-left" style={{ backgroundColor: "#10b981" }}></div>
          <div className="card-user-section">
            <div className="avatar">CD</div>
            <div className="user-info">
              <span className="user-name">Chu Tuấn Dũng</span>
              <span className="user-role">Frontend Developer</span>
            </div>
          </div>
          <div className="card-info-section">
            <div className="tag-wrapper">
              <span className="tag-type green-bg">🍃 Nghỉ phép năm</span>
              <span className="tag-status">🕒 Gửi 5 giờ trước</span>
            </div>
            <h4 className="request-title">Xin nghỉ phép giải quyết việc gia đình</h4>
            <p className="request-time">Thời gian: Chiều 14/03/2026 (0.5 ngày)</p>
          </div>
          <div className="card-action-section">
            <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
            <div className="action-buttons">
              <button className="btn-text-reject">Từ chối</button>
              <button className="btn-approve-primary">Phê duyệt</button>
            </div>
          </div>
        </div>
        </div>
    </div>
  );
};

export default Approvals;
=======

export default function Approvals() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-semibold">Approvals</h1>
      <p className="mt-4 text-slate-600">Chưa có nội dung. Thêm UI và logic phê duyệt đơn từ vào đây.</p>
    </div>
  );
}
>>>>>>> develop

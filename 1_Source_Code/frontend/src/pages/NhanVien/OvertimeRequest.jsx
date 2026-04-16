import React, { useState, useEffect } from 'react';
import axiosClient from "../../api/axiosClient";
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { employeeService } from "../../services/employeeService";
import { IoArrowBack } from "react-icons/io5";
import { GoCheckCircle } from "react-icons/go";
import { MdCalendarMonth } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { LuClock2 } from "react-icons/lu";
import { GoBlocked } from "react-icons/go";
import './OvertimeRequest.css'
const OvertimeRequest = () => {
  const [form, setForm] = useState({
    ot_date: "",
    start_time: "",
    end_time: "",
    reason: ""
  });
const user = JSON.parse(localStorage.getItem("user") || "{}");
const [approvers, setApprovers] = useState([]);   // danh sách
const [approverId, setApproverId] = useState(""); // người chọn
const [recentRequests, setRecentRequests] = useState([]);
const [view, setView] = useState("create");
const [requests, setRequests] = useState([]);
const [filterMonth, setFilterMonth] = useState("");
const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
const [showConfirmCancel, setShowConfirmCancel] = useState(false);
const [notification, setNotification] = useState("");



const [showModal, setShowModal] = useState(false);
const [selectedRequest, setSelectedRequest] = useState(null);

const openModal = (request) => {
  setSelectedRequest(request);
  setShowModal(true);
};

const closeModal = () => {
  setSelectedRequest(null);
  setShowModal(false);
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
};

const formatTime = (time) => {
  if (!time) return "";
  return time.slice(0, 5);
};


const calculateOTHours = (start, end) => {
  if (!start || !end) return "";

  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);

  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff <= 0) return "Không hợp lệ";

  const h = Math.floor(diff / 60);
  const m = diff % 60;

  return `${h}h ${m}p`;
};

const filteredRequests = filterMonth
  ? requests.filter((r) => {
      if (!r.ot_date) return false;

      const d = new Date(r.ot_date);

      const ym = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

      return ym === filterMonth;
    })
  : requests;

const handleSubmit = async () => {
  // 1. Validate đầy đủ
  if (!form.ot_date) {
    setShowConfirmSubmit(false);
    setNotification("Vui lòng chọn ngày tăng ca!");
    setTimeout(() => setNotification(""), 3000);
    return;
  }
    if (!approverId) {
    setShowConfirmSubmit(false);
    setNotification("Vui lòng chọn người kiểm duyệt!");
    setTimeout(() => setNotification(""), 3000);
    return;
  }

  if (!form.start_time || !form.end_time) {
    setShowConfirmSubmit(false);
    setNotification("Vui lòng chọn thời gian bắt đầu và kết thúc!");
    setTimeout(() => setNotification(""), 3000);
    return;
  }


  if (!form.reason.trim()) {
    setShowConfirmSubmit(false);
    setNotification("Vui lòng nhập nội dung công việc!");
    setTimeout(() => setNotification(""), 3000);
    return;
  }

  // 2. Check logic thời gian
  const [h1, m1] = form.start_time.split(":").map(Number);
  const [h2, m2] = form.end_time.split(":").map(Number);

  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;

  if (end <= start) {
    setShowConfirmSubmit(false);
    setNotification("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
    setTimeout(() => setNotification(""), 3000);
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const payload = {
      employee_id: user.id,
      ot_date: form.ot_date,
      start_time: form.start_time,
      end_time: form.end_time,
      reason: form.reason,
      approver_id: approverId
    };

    await employeeService.createOvertimeRequest(payload);

    const res = await employeeService.getOvertimeRequests(user.id);
    const data = res?.data || res || [];

    setRequests(data);
    setRecentRequests(data.slice(0, 3));

    // reset form
    setForm({
      ot_date: "",
      start_time: "",
      end_time: "",
      reason: ""
    });

    setApproverId("");

    setShowConfirmSubmit(false);
    setNotification("Gửi đơn tăng ca thành công!");

    setTimeout(() => setNotification(""), 3000);

  } catch (err) {
    console.error(err);
    setNotification("Lỗi gửi đơn!");
    setTimeout(() => setNotification(""), 3000);
  }
};

const handleCancelConfirm = () => {
  setForm({
    ot_date: "",
    start_time: "",
    end_time: "",
    reason: ""
  });

  setApproverId("");

  setShowConfirmCancel(false);
  setNotification("Đã xóa dữ liệu!");

  setTimeout(() => setNotification(""), 2000);
};


const totalApprovedOTHours = requests
  .filter((r) => {
    if (r.status !== "approved") return false;
    if (!r.ot_date) return false;

    const d = new Date(r.ot_date);

    const ym = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

    return filterMonth ? ym === filterMonth : true;
  })
  .reduce((sum, r) => {
    if (!r.start_time || !r.end_time) return sum;

    const [h1, m1] = r.start_time.split(":").map(Number);
    const [h2, m2] = r.end_time.split(":").map(Number);

    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff <= 0) return sum;

    return sum + diff / 60;
  }, 0);
  const totalApprovedOTHoursFixed = totalApprovedOTHours.toFixed(1);
const getLatestMonthYear = () => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return "--/----";
  }

  const sorted = [...requests].sort(
    (a, b) =>
      new Date(b.start_datetime || b.created_at) -
      new Date(a.start_datetime || a.created_at)
  );

  const latest = new Date(
    sorted[0].start_datetime || sorted[0].created_at
  );

  if (isNaN(latest)) return "--/----";

  const month = String(latest.getMonth() + 1).padStart(2, "0");
  const year = latest.getFullYear();

  return `${month}/${year}`;
};

  const calculateHours = () => {
    if (!form.start_time || !form.end_time) return "Chưa rõ";

    const [h1, m1] = form.start_time.split(":").map(Number);
    const [h2, m2] = form.end_time.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    if (end <= start) return "Không hợp lệ";

    const diff = end - start;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return `${hours}h ${minutes}p`;
   };

  const formatDateDMY = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};
  

  const displayMonth = filterMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [year, month] = displayMonth.split("-");

   useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getApprovers(user.id)
    .then((res) => {
      console.log("Approvers Data:", res); 
            
      const data = res?.data || res || [];
      setApprovers(data);
    })
    .catch((err) => {
      console.error("Lỗi lấy approvers:", err);
      setApprovers([]);
    });
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getOvertimeRequests(user.id)
    .then((res) => {
      const data = res?.data || res || [];

      console.log("OT REQUESTS:", data);

      setRequests(data);
      setRecentRequests(data.slice(0, 3));
    })
    .catch((err) => {
      console.error("Lỗi lấy OT:", err);
      setRequests([]);
      setRecentRequests([]);
    });
}, [user?.id]);
useEffect(() => {
  console.log("STATE REQUESTS:", requests);
}, [requests]);

  return (
    
    <div className="request-container">
        {notification && (
          <div className="toast">
            {notification}
          </div>
        )}
      <div className="request-left">
        {view === "create" ? (
    <>
        <div className="request-left-header">
            <div className="header-left">
                <h2>Tạo đơn xin tăng ca</h2>
                <p>Tạo và quản lý đơn tăng ca của bạn.</p>
            </div>
            <div className="header-right">
                <button className="btn-cannel" onClick={() => setShowConfirmCancel(true)}>
                    <HiMiniXCircle /> Hủy
                </button>
            </div>
        </div>

        <div className="request-left-content">
            <div className="info-section">
                <h3 className="section-title">
                    <FaRegFileAlt className="icon" /> Thông tin chung
                </h3>
                <div className="input-grid">
                    <div className="input-group">
                        <label>Ngày tăng ca</label>
                        <input
                            type="date"
                            className="input-option"
                            value={form.ot_date}
                            onChange={(e) =>
                                setForm({ ...form, ot_date: e.target.value })
                            }
                        />
                    </div>

                    <div className="input-group">
                        <label>Người kiểm duyệt</label>
                            <select
                            className="input-option"
                            value={approverId}
                            onChange={(e) => setApproverId(e.target.value)}
                            >
                                <option value="" disabled hidden>
                                    Chọn người kiểm duyệt
                                </option>

                                {approvers.map((appr) => (
                                    <option key={appr.id} value={appr.id}>
                                    {appr.full_name} ({appr.position_name})
                                    </option>
                                ))}
                            </select>
                    </div>
                </div>
            </div>

            <div className="info-section">
                <h3 className="section-title">
                    <FaRegClock className="icon" /> Thời gian tăng ca
                </h3>
                <div className="input-grid">
                    <div className="input-group">
                        <label>Thời gian bắt đầu tăng ca</label>
                        <input
                            type="time"
                            className="input-option"
                            value={form.start_time}
                            onChange={(e) =>
                                setForm({ ...form, start_time: e.target.value })
                            }
                        />
                    </div>

                    <div className="input-group">
                        <label>Thời gian kết thúc tăng ca</label>
                        <input
                            type="time"
                            className="input-option"
                            value={form.end_time}
                            onChange={(e) =>
                                setForm({ ...form, end_time: e.target.value })
                            }
                        />
                    </div>
                   
                </div>
                <div className="info-section-bottom">
                        <div className="info-section-bottom-left">
                            <p>Tổng thời gian tăng ca dự kiến:</p>
                        </div>
                        <div className="info-section-bottom-right">
                            <p>{calculateHours()}   
                            </p>
                        </div>
                </div>
            </div>

            <div className="info-section">
                <h3 className="section-title">
                    <MdChatBubbleOutline className="icon" /> Nội dung công việc
                </h3>

                <div className="input-grid-1">
                    <div className="input-group" style={{ marginTop: "10px" }}>
                    <label>Mô tả nội dung công việc</label>
                    <textarea
                        className="input-option-1"
                        value={form.reason}
                        placeholder="Nội dung công việc..."
                        onChange={(e) =>
                            setForm({ ...form, reason: e.target.value })
                        }
                    />
                    </div>
                </div>

            </div>

        </div>

        <div className="acction-footer">
            <button className="btn-request" onClick={() => setShowConfirmSubmit(true)} >
                <BsSend /> Gửi
            </button>
        </div>
    </>
  ) : (
    <>
        {/* ================= HISTORY ================= */}
        <div className="history-page-header">
        <div>
            <h2>Đơn đã gửi</h2>
            <p>Tất cả các đơn bạn đã gửi</p>
        </div>

        <button className="btn-back" onClick={() => setView("create")}>
            <IoArrowBack /> Quay lại
        </button>
        </div>

        {/* CARD */}
        <div className="history-card">

        {/* FILTER */}
        <div className="history-filter">
            <h4>Chi tiết theo ngày (Tháng {getLatestMonthYear()})</h4>

            <div className="filter-right">
            <div className="filter-right-search">
                <MdCalendarMonth className="month-icon" />
                <span> Tháng: </span>
            </div>
            <input
                className="input-month-search"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
            />
            <button className="btn-search" onClick={() => {}}><CiSearch size={20} /></button>
            </div>
        </div>

        {/* TABLE */}
        <div className="history-table-container">
            <table className="history-table">
            <thead>
                <tr>
                <th>Ngày gửi đơn</th>
                <th>Ngày tăng ca</th>
                <th>Thời gian bắt đầu</th>
                <th>Thời gian kết thúc</th>
                <th>Tổng thời gian tăng ca</th>
                <th>Trạng thái</th>
                </tr>
            </thead>
                <tbody>
                    {filteredRequests.length === 0 ? (
                        <tr>
                        <td colSpan="6" className="empty">
                            Không có dữ liệu đơn tăng ca
                        </td>
                        </tr>
                    ) : (
                        filteredRequests.map((r) => (
                        <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => openModal(r)}>

                            {/* Ngày gửi đơn */}
                            <td>{formatDate(r.created_at)}</td>

                            {/* Loại đơn */}
                            <td> {formatDate(r.ot_date)}</td>

                            {/* Thời gian bắt đầu */}
                            <td>
                            {formatDate(r.ot_date)} {formatTime(r.start_time)}
                            </td>

                            {/* Thời gian kết thúc */}
                            <td>
                            {formatDate(r.ot_date)} {formatTime(r.end_time)}
                            </td>

                            {/* Tổng giờ OT */}
                            <td>{calculateOTHours(r.start_time, r.end_time)}</td>

                            {/* Trạng thái */}
                            <td>
                                <span className={`status-pill ${r.status}`} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                                    <span className="dot" style={{ marginRight: '4px' }}>●</span>
                                    {r.status === "approved"
                                    ? "Đã duyệt"
                                    : r.status === "pending"
                                    ? "Chờ duyệt"
                                    : "Từ chối"}
                                </span>
                            </td>

                        </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        </div>

    </>
    )}                    
      </div>

      {showModal && selectedRequest && (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>

      <h2 style={{ marginBottom: "20px", fontSize: "20px",fontWeight:"bold" }}>
        Chi tiết đơn tăng ca
      </h2>

      {/* THÔNG TIN CHUNG */}
      <div className="info-section">
        <h3 className="section-title">
          <FaRegFileAlt className="icon" /> Thông tin chung
        </h3>

        <div className="input-grid">
          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Ngày tăng ca</label>
            <input
              type="text"
              className="input-option-2"
              value={formatDateDMY(selectedRequest.ot_date)}
              readOnly
            />
          </div>

          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Người kiểm duyệt</label>
            <input
              type="text"
              className="input-option-2"
              value={selectedRequest.approver_name || "---"}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* THỜI GIAN */}
      <div className="info-section">
        <h3 className="section-title">
          <FaRegClock className="icon" /> Thời gian tăng ca
        </h3>

        <div className="input-grid">
          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Bắt đầu</label>
            <input
              type="time"
              className="input-option-2"
              value={selectedRequest.start_time || ""}
              readOnly
            />
          </div>

          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Kết thúc</label>
            <input
              type="time"
              className="input-option-2"
              value={selectedRequest.end_time || ""}
              readOnly
            />
          </div>
        </div>

        <div className="info-section-bottom-1">
          <div className="info-section-bottom-left">
            <p>Tổng thời gian:</p>
          </div>

          <div className="info-section-bottom-right">
            <p>
              {calculateOTHours(
                selectedRequest.start_time,
                selectedRequest.end_time
              )}
            </p>
          </div>
        </div>
      </div>

      {/* NỘI DUNG */}
      <div className="info-section">
        <h3 className="section-title">
          <MdChatBubbleOutline className="icon" /> Nội dung công việc
        </h3>

        <textarea
          className="input-option-3"
          value={selectedRequest.reason || ""}
          readOnly
        />
      </div>

      {/* TRẠNG THÁI */}
      <div className="info-section">
        <h3 className="section-title">Trạng thái</h3>

        <span className={`status-pill ${selectedRequest.status}`}>
          {selectedRequest.status === "approved"
            ? "Đã duyệt"
            : selectedRequest.status === "pending"
            ? "Chờ duyệt"
            : "Từ chối"}
        </span>
      </div>

      {/* BUTTON */}
      <div style={{ textAlign: "right" }}>
        <button onClick={closeModal} className="btn-close-modal">
          Đóng
        </button>
      </div>

    </div>
  </div>
)}

      <div className="request-right">
        <div className="card-request-top">
  <div className="card-header">
    <PiClockCounterClockwise style={{ fontSize: "20px" }} />
    <span>Tăng ca tháng {month}/{year}</span>
  </div>

  <div className="card-main-value">
    <span className="remaining-days">
      {totalApprovedOTHours.toFixed(1)}
    </span>

    <span className="total-days">giờ</span>
  </div>

  <div className="card-sub-text">
    Tổng giờ tăng ca của bạn trong tháng này
  </div>

  <div className="card-footer">
    <div className="usage-info">
      <span>
        Số đơn được duyệt:{" "}
        {requests.filter(r => r.status === "approved").length}
      </span>
    </div>

    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{
          width: `${Math.min((totalApprovedOTHours / 60) * 100, 100)}%`
        }}
      />
    </div>
  </div>


  <svg
    className="umbrella-bg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.5"
  >
    <path d="M23 12a11.02 11.02 0 0 0-22 0zm-11 0v9" />
    <path d="M9 21a3 3 0 0 0 6 0" />
  </svg>
</div>
        <div className="card-request-bot-1">
  <div className="card-header-bot">
    <h3 className="card-header-bot-2">
      <PiClockCounterClockwise style={{ fontSize: "17px", color: "green" }} />
      Đơn gần đây
    </h3>

    <button className="btn-all" onClick={() => setView("history")}>
      Xem tất cả
    </button>
  </div>

  <div className="card-content-bot">
    {recentRequests.length === 0 ? (
      <p className="empty-text">Chưa có đơn nào</p>
    ) : (
      recentRequests.map((r) => (
        <div className="recent-item" key={r.id}>
          
          <div className={`recent-icon-wrapper ${r.status}`}>
            {r.status === "approved" ? <GoCheckCircle /> :
             r.status === "pending" ? <LuClock2 /> :
             r.status === "rejected" ? <GoBlocked /> :
             null}
          </div>
        
          <div className="recent-info">          
            <p className="recent-type">
              Tăng ca
            </p>
            <p className="recent-date">
              {formatDate(r.ot_date)} ({r.start_time} - {r.end_time})
            </p>

          </div>

          {/* STATUS - dùng chung class leave */}
          <div className="recent-right">
            <span className={`status-pill ${r.status}`}>
              {r.status === "approved"
                ? "ĐÃ DUYỆT"
                : r.status === "pending"
                ? "CHỜ DUYỆT"
                : "TỪ CHỐI"}
            </span>
          </div>

        </div>
      ))
    )}
  </div>
</div>

      </div>
    {showConfirmSubmit && (
  <div className="modal-overlay" onClick={() => setShowConfirmSubmit(false)}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận gửi đơn</h3>
      <p>Bạn có chắc muốn gửi đơn tăng ca này không?</p>

      <div className="confirm-actions">
        <button className="btn-confirm" onClick={handleSubmit}>
          Đồng ý
        </button>

        <button className="btn-cancel" onClick={() => setShowConfirmSubmit(false)}>
          Hủy
        </button>
      </div>
    </div>
  </div>
)}

{showConfirmCancel && (
  <div className="modal-overlay" onClick={() => setShowConfirmCancel(false)}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận hủy</h3>
      <p>Dữ liệu nhập sẽ bị xóa. Bạn có chắc không?</p>

      <div className="confirm-actions">
        <button className="btn-danger" onClick={handleCancelConfirm}>
          Xóa dữ liệu
        </button>

        <button className="btn-cancel" onClick={() => setShowConfirmCancel(false)}>
          Quay lại
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default OvertimeRequest;
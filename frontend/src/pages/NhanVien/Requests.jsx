import React, { useEffect, useState, useRef } from "react";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { HiMiniXCircle } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { FiClock } from "react-icons/fi";
import { PiClockCounterClockwise } from "react-icons/pi";
import axios from "axios";
import { MdCalendarMonth } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { GoCheckCircle } from "react-icons/go";
import { LuClock2 } from "react-icons/lu";
import { IoArrowBack } from "react-icons/io5";

import "./Requests.css";

const Requests = () => {
  const fileRef = useRef();
  const [requests, setRequests] = useState([]);
  console.log("REQUESTS:", requests);
  const [form, setForm] = useState({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [view, setView] = useState("create"); 
// "create" | "history"
  const [recentRequests, setRecentRequests] = useState([]);
  const [notification, setNotification] = useState("");
  const [filterMonth, setFilterMonth] = useState(""); // yyyy-mm

  const [approvers, setApprovers] = useState([]); // danh sách người kiểm duyệt
  const [approverId, setApproverId] = useState(""); // id người được chọn

  const user = JSON.parse(localStorage.getItem("user"));

  const [selectedRequest, setSelectedRequest] = useState(null);
const [showModal, setShowModal] = useState(false);

// Hàm mở modal khi click vào dòng
const handleRowClick = (request) => {
  setSelectedRequest(request);
  setShowModal(true);
};

// Hàm đóng modal
const closeModal = () => {
  setShowModal(false);
  setSelectedRequest(null);
};


  // Mapping loại đơn từ Database sang Tiếng Việt
const getLeaveTypeText = (type) => {
  const types = {
    annual: "Nghỉ phép năm",
    sick: "Nghỉ ốm",
    unpaid: "Nghỉ không lương",
    ot: "Nghỉ bù (OT)",
    maternity: "Nghỉ thai sản",
    bereavement: "Nghỉ tang"
  };
  return types[type] || type;
};

const filteredRequests = filterMonth
  ? requests.filter((r) => {
      const date = new Date(r.start_datetime); // hoặc r.created_at nếu muốn theo ngày tạo
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return yearMonth === filterMonth;
    })
  : requests;

// Định dạng ngày hiển thị (dd/mm/yyyy)
const formatDate = (dateStr) => {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const getLatestMonthYear = () => {
  if (!requests || requests.length === 0) return "";

  // Sắp xếp theo ngày bắt đầu giảm dần
  const sorted = [...requests].sort(
    (a, b) => new Date(b.start_datetime) - new Date(a.start_datetime)
  );

  const latest = new Date(sorted[0].start_datetime);
  const month = latest.getMonth() + 1; // 0-indexed
  const year = latest.getFullYear();

  return `${month.toString().padStart(2, "0")}/${year}`;
};

// Tính tổng số ngày nghỉ dự kiến
const calculateTotalDays = (start, end) => {
  if (!start || !end) return "0 ngày";

  let startDate = new Date(start);
  let endDate = new Date(end);

  // reset giờ để tránh lệch timezone
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let count = 0;

  while (startDate <= endDate) {
    const day = startDate.getDay(); // 0 = Chủ nhật

    if (day !== 0) {
      count++;
    }

    startDate.setDate(startDate.getDate() + 1);
  }

  return `${count} ngày`;
};

  useEffect(() => {
  if (!user?.id) return;

  axios
    .get(`http://localhost:5000/api/employee/leave-request/${user.id}`)
    .then((res) => {
      setRecentRequests(res.data.slice(0, 3)); // lấy 3 đơn gần nhất
    })
    .catch((err) => console.error(err));
}, [user?.id]);

  useEffect(() => {
  if (view !== "history") return;
  if (!user?.id) return;

  axios
    .get(`http://localhost:5000/api/employee/leave-request/${user.id}`)
    .then((res) => {
      console.log("DATA:", res.data); // debug
      setRequests(res.data);
    })
    .catch((err) => console.error(err));
  }, [view, user?.id]);

  // ----------------- Load approvers (trưởng trực tiếp + Director) -----------------
  useEffect(() => {

     if (view !== "create") return;
    if (!user?.id) return;

    axios
      .get(`http://localhost:5000/api/employee/approvers/${user.id}`)
      .then((res) => {
        // res.data: [{id, full_name, role_code}, ...]
        setApprovers(res.data);
      })
      .catch((err) => console.error(err));
  }, [view,user?.id]);

  // ----------------- Submit -----------------
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!approverId) { alert("Chọn người kiểm duyệt!"); return; }


  

  const payload = new FormData();
  payload.append("userId", user.id);
  payload.append("leave_type", form.type);
  payload.append("start_datetime", form.startDate);
  payload.append("end_datetime", form.endDate);
  payload.append("reason", form.reason);
  payload.append("approverId", approverId);

  const fileInput = document.getElementById("file-upload");
  if (fileRef.current && fileRef.current.files.length > 0) {
  payload.append("attachment", fileRef.current.files[0]);
  }

  try {
        await axios.post(
          "http://localhost:5000/api/employee/leave-request",
          payload
        );

        setNotification("Gửi đơn thành công!");
        setTimeout(() => setNotification(""), 3000);

        const res = await axios.get(`http://localhost:5000/api/employee/leave-request/${user.id}`);
        setRequests(res.data);

      } catch (err) {
        console.error(err);
        setNotification("Lỗi tạo đơn!");
        setTimeout(() => setNotification(""), 3000);
      }
};

  const calculateDays = () => {
  if (!form.startDate || !form.endDate) return 0;

  const start = new Date(form.startDate);
  const end = new Date(form.endDate);

  const diffTime = end - start;

  if (diffTime < 0) return 0;

  const diffDays = diffTime / (1000 * 60 * 60 * 24) + 1;

  return diffDays;
};

  return (
    <div className="request-container">
      {notification && (
      <div className="toast">
        {notification}
      </div>)}

      {/* LEFT */}
      <div className="request-left">

        {view === "create" ? (
    <>
      {/* ================= HEADER ================= */}
      <div className="request-left-header">
        <div className="header-left">
          <h2>Tạo đơn nghỉ phép</h2>
          <p>Tạo và quản lý đơn nghỉ của bạn.</p>
        </div>
        <div className="header-right">
          <button className="btn-cannel">
            <HiMiniXCircle /> Hủy
          </button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="request-left-content">

        {/* THÔNG TIN CHUNG */}
        <div className="info-section">
          <h3 className="section-title">
            <FaRegFileAlt className="icon" /> Thông tin chung
          </h3>

          <div className="input-grid">
            <div className="input-group">
              <label>Loại đơn</label>
              <select
                className="input-option"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
                }
              >
                <option value="">Chọn loại đơn</option>
                <option value="annual">Nghỉ phép hàng năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="maternity">Nghỉ thai sản</option>
                <option value="bereavement">Nghỉ tang</option>
              </select>
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

        {/* THỜI GIAN */}
        <div className="info-section">
          <h3 className="section-title">
            <FaRegClock className="icon" /> Thời gian nghỉ
          </h3>

          <div className="input-grid">
            <div className="input-group">
              <label>Ngày bắt đầu</label>
              <input
                type="date"
                className="input-option"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>

            <div className="input-group">
              <label>Ngày kết thúc</label>
              <input
                type="date"
                className="input-option"
                value={form.endDate}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="info-section-bottom">
            <div className="info-section-bottom-left">
              <p>Tổng thời gian nghỉ dự kiến:</p>
            </div>
            <div className="info-section-bottom-right">
              <p>
                {!form.startDate || !form.endDate
                  ? "Chưa rõ"
                  : `${calculateDays()} Ngày`}
              </p>
            </div>
          </div>
        </div>

        {/* CHI TIẾT */}
        <div className="info-section">
          <h3 className="section-title">
            <MdChatBubbleOutline className="icon" /> Chi tiết thêm
          </h3>

          <div className="input-grid-1">
            <div className="input-group" style={{ marginTop: "20px" }}>
              <label>Lý do cụ thể</label>
              <input
                type="text"
                className="input-option-1"
                placeholder="Nhập lý do..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />
            </div>

            <div className="input-group" style={{ marginTop: "20px" }}>
              <label>Đính kèm tài liệu</label>
              <label htmlFor="file-upload" className="file-uploader">
                <IoCloudUploadOutline className="file-icon" />
                <div className="file-text">
                  <span className="file-bold">Nhấn để chọn file</span>
                </div>
                <div className="file-note">
                  PNG, JPG, PDF, Word (Max 10MB)
                </div>
                <input ref={fileRef} id="file-upload" type="file" hidden />
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* ================= FOOTER ================= */}
      <div className="acction-footer">
        <button className="btn-request" onClick={handleSubmit}>
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
                  <th>Ngày</th>
                  <th>Loại đơn</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Tổng ngày nghỉ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
               {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">Không có dữ liệu đơn đã gửi</td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} 
                      onClick={() => handleRowClick(r)} 
                      style={{ cursor: "pointer" }}
                    >
                      {/* Cột Ngày: Hiển thị ngày tạo đơn (created_at) */}
                      <td>{formatDate(r.created_at)}</td>

                      {/* Cột Loại đơn */}
                      <td style={{ fontWeight: "500" }}>{getLeaveTypeText(r.leave_type)}</td>

                      {/* Cột Ngày bắt đầu */}
                      <td>{formatDate(r.start_datetime)}</td>

                      {/* Cột Ngày kết thúc */}
                      <td>{formatDate(r.end_datetime)}</td>

                      {/* Cột Tổng ngày nghỉ */}
                      <td>{calculateTotalDays(r.start_datetime, r.end_datetime)}</td>

                      {/* Cột Trạng thái với Style Pill (giống ảnh image_192663.png) */}
                      <td>
                        <span className={`status-pill ${r.status}`}>
                          <span className="dot">● </span>
                          {r.status === 'approved' ? 'Đã duyệt' : 
                          r.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
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
            <h2 style={{marginBottom:"20px",fontSize:"20px"}}>Chi tiết đơn nghỉ phép</h2>

            {/* THÔNG TIN CHUNG */}
            <div className="info-section">
              <h3 className="section-title">
                <FaRegFileAlt className="icon" /> Thông tin chung
              </h3>
              <div className="input-grid">
                <div className="input-group-1">
                  <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Loại đơn</label>
                  <input
                    type="text"
                    className="input-option-2"
                    value={getLeaveTypeText(selectedRequest.leave_type)}
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
                <FaRegClock className="icon" /> Thời gian nghỉ
              </h3>
              <div className="input-grid">
                <div className="input-group-1">
                  <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="input-option-2"
                    value={selectedRequest.start_datetime?.split("T")[0] || ""}
                    readOnly
                  />
                </div>
                <div className="input-group-1">
                  <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Ngày kết thúc</label>
                  <input
                    type="date"
                    className="input-option-2"
                    value={selectedRequest.end_datetime?.split("T")[0] || ""}
                    readOnly
                  />
                </div>
              </div>
              <div className="info-section-bottom-1">
                <div className="info-section-bottom-left">
                  <p>Tổng thời gian nghỉ :</p>
                </div>
                <div className="info-section-bottom-right">
                  <p>
                    {calculateTotalDays(selectedRequest.start_datetime, selectedRequest.end_datetime)}
                  </p>
                </div>
              </div>
            </div>

            {/* CHI TIẾT */}
            <div className="info-section">
              <h3 className="section-title">
                <MdChatBubbleOutline className="icon" /> Chi tiết thêm
              </h3>
              <div className="input-grid-1">
                <div className="input-group" style={{ marginTop: "20px" }}>
                  <label>Lý do cụ thể</label>
                  <textarea
                    className="input-option-3"
                    value={selectedRequest.reason}
                    readOnly
                  />
                </div>

                {selectedRequest.attachment && (
                  <div className="input-group" style={{ marginTop: "20px" }}>
                    <label>File đính kèm</label>
                    <a
                      href={selectedRequest.attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="file-link"
                    >
                      Xem file
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button onClick={closeModal} className="btn-close-modal">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* RIGHT */}
      <div className="request-right">
        <div className="card-request-top">
          <div className="card-header">
            <FiClock style={{ fontSize: "20px" }} />
            <span>Quỹ phép năm 2026</span>
          </div>

          <div className="card-main-value">
            <span className="remaining-days">08.5</span>
            <span className="total-days">/ 12 ngày</span>
          </div>

          <div className="card-sub-text">Số phép còn lại có thể sử dụng</div>

          <div className="card-footer">
            <div className="usage-info">
              <span>Đã dùng: 3.5 ngày</span>
              <span>29%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "29%" }}></div>
            </div>
          </div>

          <svg
            className="umbrella-bg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 12a11.02 11.02 0 0 0-22 0zm-11 0v9"></path>
            <path d="M9 21a3 3 0 0 0 6 0"></path>
          </svg>
        </div>

        <div className="card-request-bot">
          <div className="card-header-bot">
            <h3 className="card-header-bot-2">
              <PiClockCounterClockwise
                style={{ fontSize: "17px", color: "green" }}
              />
              Đơn gần đây
            </h3>
            <button className="btn-all" onClick={() => setView("history")} >Xem tất cả</button>
          </div>

          <div className="card-content-bot">
            {recentRequests.length === 0 ? (
              <p className="empty-text">Chưa có đơn nào</p>
            ) : (
              recentRequests.map((r) => (
                <div className="recent-item" key={r.id}>
                  {/* Phần icon bên trái */}
                  <div className={`recent-icon-wrapper ${r.status}`}>
                    {r.status === "approved" ? <GoCheckCircle /> : <LuClock2 />}
                  </div>

                  {/* Phần nội dung giữa */}
                  <div className="recent-info">
                    <p className="recent-type">{getLeaveTypeText(r.leave_type)}</p>
                    <p className="recent-date">
                      {formatDate(r.start_datetime)} - {formatDate(r.end_datetime)} ({calculateTotalDays(r.start_datetime, r.end_datetime)})
                    </p>
                  </div>

                  {/* Phần nhãn trạng thái bên phải */}
                  <div className="recent-right">
                    <span  className={`status-pill ${r.status}`}>
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
      
      

    </div>
  );
};

export default Requests;
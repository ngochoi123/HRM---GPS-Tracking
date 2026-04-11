import React, { useEffect, useState, useRef } from "react";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { HiMiniXCircle } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { FiClock } from "react-icons/fi";
import { PiClockCounterClockwise } from "react-icons/pi";
import { MdCalendarMonth } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { GoCheckCircle,GoBlocked  } from "react-icons/go";
import { LuClock2 } from "react-icons/lu";
import { IoArrowBack } from "react-icons/io5";
import { employeeService } from "../../services/employeeService";


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

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")|| "{}");

  const [selectedRequest, setSelectedRequest] = useState(null);
const [showModal, setShowModal] = useState(false);

// Hàm mở modal khi click vào dòng
const handleRowClick = (request) => {
  setSelectedRequest(request);
  setShowModal(true);
};

const handleCancel = () => {
  setForm({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  setApproverId("");

  // reset file
  if (fileRef.current) {
    fileRef.current.value = "";
  }
};

// Hàm đóng modal
const closeModal = () => {
  setShowModal(false);
  setSelectedRequest(null);
};

const handleCloseAllModals = () => {
  setShowConfirmSubmit(false);
  setShowConfirmCancel(false);
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

const LEAVE_LIMIT = 12;
const currentYear = new Date().getFullYear();

const getAnnualUsedDays = () => {
  const currentYear = new Date().getFullYear();

  return requests
    .filter((r) => {
      // Đảm bảo loại đơn là annual và đã được duyệt
return r.leave_type === "annual" && r.status === "approved";
    })
    .reduce((total, r) => {
      let start = new Date(r.start_datetime);
      let end = new Date(r.end_datetime);
      
      // Kiểm tra nếu ngày tháng không hợp lệ
      if (isNaN(start) || isNaN(end)) return total;

      let count = 0;
      let current = new Date(start);
      // Reset giờ về 0 để so sánh chính xác ngày
      current.setHours(0, 0, 0, 0);
      let finalEnd = new Date(end);
      finalEnd.setHours(0, 0, 0, 0);

      while (current <= finalEnd) {
        const year = current.getFullYear();
        const day = current.getDay(); // 0: Chủ nhật, 6: Thứ bảy

        // Kiểm tra đúng năm và không phải cuối tuần
        if (year === currentYear && day !== 0 && day !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return total + count;
    }, 0);
};


const used = getAnnualUsedDays();
const remaining = LEAVE_LIMIT - used;
const percentUsed = (used / LEAVE_LIMIT) * 100;

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

  employeeService
    .getLeaveRequests(user.id)
    .then((res) => {
      const data = res?.data || res || [];
      setRequests(data);
      setRecentRequests(data.slice(0, 3)); // lấy 3 đơn gần nhất
    })
    .catch((err) => console.error(err));
}, [user?.id]);

  useEffect(() => {
  if (view !== "history") return;
  if (!user?.id) return;

  employeeService
    .getLeaveRequests(user.id)
    .then((res) => {
      console.log("DATA:", res);
      setRequests(res?.data || res || []);
    })
    .catch((err) => console.error(err));
}, [view, user?.id]);

  // ----------------- Load approvers (trưởng trực tiếp + Director) -----------------
  useEffect(() => {

     if (view !== "create") return;
    if (!user?.id) return;

    employeeService
      .getApprovers(user.id)
      .then((res) => {
        setApprovers(res?.data || res || []);
      })
    .catch((err) => console.error(err));
  }, [view,user?.id]);

  // ----------------- Submit -----------------

  const submitRequest = async () => {
  if (!approverId) {
    alert("Chọn người kiểm duyệt!");
    return;
  }

  const payload = new FormData();
  payload.append("userId", user.id);
  payload.append("leave_type", form.type);
  payload.append("start_datetime", form.startDate);
  payload.append("end_datetime", form.endDate);
  payload.append("reason", form.reason);
  payload.append("approverId", approverId);

  if (fileRef.current?.files[0]) {
    payload.append("attachment", fileRef.current.files[0]);
  }

  try {
    await employeeService.createLeaveRequest(payload);

    // 1. Hiển thị thông báo
    setNotification("Gửi đơn thành công!");
    
    // 2. Đóng modal xác nhận ngay lập tức
    setShowConfirmSubmit(false);
    
    // 3. Reset form về trạng thái trống
    handleCancel();

    // 4. Reload lại danh sách đơn để cập nhật UI
    const res = await employeeService.getLeaveRequests(user.id);
    const data = res?.data || res || [];
    setRequests(data);
    setRecentRequests(data.slice(0, 3));

    // 5. QUAN TRỌNG: Tự động tắt thông báo sau 3 giây
    setTimeout(() => {
      setNotification("");
    }, 3000);
    setShowConfirmSubmit(false);

  } catch (err) {
    console.error(err);
    setNotification("Lỗi tạo đơn!");
  }
};

const handleCancelConfirm = () => {
  setForm({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  setApproverId("");

  if (fileRef.current) fileRef.current.value = "";

  setShowConfirmCancel(false);
};

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
        await employeeService.createLeaveRequest(payload);

        // reload lại danh sách
        const res = await employeeService.getLeaveRequests(user.id);
        const data = res?.data || res || [];

        setRequests(data);
        setRecentRequests(data.slice(0, 3));

        // reset form
        handleCancel();

        setNotification("Gửi đơn thành công!");
        setShowConfirmSubmit(false);

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
          <h2>Tạo đơn xin nghỉ phép</h2>
          <p>Tạo và quản lý đơn nghỉ của bạn.</p>
        </div>
        <div className="header-right">
          <button className="btn-cannel" onClick={() => setShowConfirmCancel(true)}>
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
              <textarea
                className="input-option-1"
                placeholder="Nhập nội dung..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
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
        <button className="btn-request" onClick={() => setShowConfirmSubmit(true)}>
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
                          r.status === 'pending' ? 'Chờ duyệt' : 
                          r.status === 'rejected' ? 'Từ chối': 'không xác định'
                          }
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
                  <label style={{textAlign:"left",marginLeft:"7px"}}>Lý do cụ thể</label>
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
            <span>Quỹ phép năm {new Date().getFullYear()}</span>
          </div>

          <div className="card-main-value">
            <span className="remaining-days">{remaining.toFixed(1)}</span>
            <span className="total-days">/ {LEAVE_LIMIT} ngày</span>
          </div>

          <div className="card-sub-text">Số phép còn lại có thể sử dụng</div>

          <div className="card-footer">
            <div className="usage-info">
              <span>Đã dùng: {used.toFixed(1)} ngày</span>
              <span>{percentUsed.toFixed(0)}%</span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              ></div>
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
                    {r.status === "approved" ? <GoCheckCircle /> :
                    r.status === "pending" ? <LuClock2 /> :
                    r.status === "rejected" ? <GoBlocked /> :
                    null}
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
                        ? "CHỜ DUYỆT" :
                        r.status === 'rejected' ? 'TỪ CHỐI' :''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {showConfirmSubmit && (
  <div className="modal-overlay" onClick={handleCloseAllModals}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3>Xác nhận gửi đơn</h3>
      <p>Bạn có chắc muốn gửi đơn này không?</p>

      <div className="confirm-actions">
        <button
          className="btn-confirm"
          onClick={submitRequest}
        >
          Đồng ý
        </button>

        <button
          className="btn-cancel"
          onClick={() => setShowConfirmSubmit(false)}
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
)}

{showConfirmCancel && (
  <div className="modal-overlay" onClick={handleCloseAllModals}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3>Xác nhận hủy</h3>
      <p>Dữ liệu đã nhập sẽ bị xóa. Bạn có chắc không?</p>

      <div className="confirm-actions">
        <button
          className="btn-danger"
          onClick={handleCancelConfirm}
        >
          Xóa dữ liệu
</button>

        <button
          className="btn-cancel"
          onClick={() => setShowConfirmCancel(false)}
        >
          Quay lại
        </button>
      </div>
    </div>
  </div>
)}
      
    </div>
  );
};

export default Requests;

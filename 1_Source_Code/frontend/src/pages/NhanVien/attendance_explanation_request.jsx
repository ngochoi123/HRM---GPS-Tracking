import React, { useState, useEffect } from 'react';
// Đã xóa import axiosClient thừa
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { employeeService } from "../../services/employeeService";
import { IoArrowBack } from "react-icons/io5";
import { GoCheckCircle } from "react-icons/go";
import { MdCalendarMonth } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { LuClock2 } from "react-icons/lu";
import { FiClock } from "react-icons/fi";
import { GoBlocked } from "react-icons/go";
import './ae_request.css'

// 1. SỬA TÊN COMPONENT VIẾT HOA CHỮ CÁI ĐẦU
const AttendanceExplanationRequest = () => {

const fileRef = React.useRef();

const user = JSON.parse(localStorage.getItem("user") || "{}");
const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
const [showConfirmCancel, setShowConfirmCancel] = useState(false);
const [notification, setNotification] = useState({ message: "", type: "" });
const [selectedFile, setSelectedFile] = useState(null);
const [view, setView] = useState("create"); // create | history
const [requests, setRequests] = useState([]);
const [recentRequests, setRecentRequests] = useState([]);
const [selectedRequest, setSelectedRequest] = useState(null);
const [showModal, setShowModal] = useState(false);
const [filterMonth, setFilterMonth] = useState("");
const total = requests.length;
const approved = requests.filter(r => r.status === "approved").length;
const pending = requests.filter(r => r.status === "pending").length;
const rejected = requests.filter(r => r.status === "rejected").length;

// Đã xóa biến percentApproved không sử dụng

const [form, setForm] = useState({
  date: "",
  type: "",
  checkin: "",
  checkout: "",
  reason: "",
});
const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};
const closeModal = () => {
  setShowModal(false);
  setSelectedRequest(null);
};

const [approverId, setApproverId] = useState("");
const [approvers, setApprovers] = useState([]);
useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getApprovers(user.id)
    .then((res) => setApprovers(res?.data || res || []))
    .catch(console.error);
}, [user?.id]);

const handleSubmit = async () => {
  if (!form.date && !approverId && !form.type && !form.checkin &&!form.checkout && !form.reason.trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập thông tin!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
   if (!form.date) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn ngày cần giải trình!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!form.type) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn loại đơn giải trình!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!approverId) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Chọn người kiểm duyệt!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!form.checkin || !form.checkout) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn thời gian vào, thời gian ra!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
    }

    // validate time logic
    const checkinMin = toMinutes(form.checkin);
    const checkoutMin = toMinutes(form.checkout);
    const limitMin = 21 * 60; // 21:00

    if (checkinMin >= checkoutMin) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Thời gian vào phải nhỏ thời gian giờ ra!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
    }

    if (checkoutMin > limitMin) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Thời gian ra phải nhỏ hơn hoặc bằng 21:00!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
    }
    const minCheckin = 7 * 60; // 07:00

if (checkinMin < minCheckin) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Thời gian vào phải sau hoặc bằng 07:00!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}
  if (!form.reason.trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập lý do!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  

  const formData = new FormData();

  formData.append("userId", user.id);
  formData.append("attendance_date", form.date);
  formData.append("explanation_type", form.type);
  formData.append("proposed_check_in", form.checkin);
  formData.append("proposed_check_out", form.checkout);
  formData.append("reason", form.reason);
  formData.append("approverId", approverId);

  if (fileRef.current?.files[0]) {
    formData.append("file", fileRef.current.files[0]);
  }

  try {
    await employeeService.createExplanationRequest(formData);
    const res = await employeeService.getExplanationRequests(user.id);
    const data = res?.data || res || [];
    setRequests(data);
    setRecentRequests(data.slice(0, 3));

    setNotification({ message: "Gửi đơn giải trình thành công!", type: "success" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    setShowConfirmSubmit(false);

    handleResetForm(false); 

    setTimeout(() => {
      setNotification("");
    }, 3000);

  } catch (err) {
    console.error(err.response?.data || err);
    setNotification({ message: "Gửi thất bại!", type: "error" });
  }
};
const getExplanationText = (type) => {
  return {
    forgot_checkin: "Quên checkin",
    forgot_checkout: "Quên checkout",
    late_arrival: "Đi muộn",
    early_leave: "Về sớm",
    system_error: "Lỗi hệ thống"
  }[type] || type;
};
const handleResetForm = (showToast = true) => {
  setForm({
    date: "",
    type: "",
    checkin: "",
    checkout: "",
    reason: "",
  });

  setApproverId("");

  if (fileRef.current) fileRef.current.value = "";
  setSelectedFile(null);

  setShowConfirmCancel(false);

  if (showToast) {
    setNotification({
      message: "Đã xóa dữ liệu!",
      type: "success"
    });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  }
};
useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getExplanationRequests(user.id)
    .then((res) => {
      const data = res?.data || res || [];
      setRequests(data);
      setRecentRequests(data.slice(0, 3));
    })
    .catch(console.error);
}, [user?.id]);

const getLatestMonthYear = () => {
  if (!requests || requests.length === 0) return "";

  const sorted = [...requests].sort(
    (a, b) => new Date(b.attendance_date) - new Date(a.attendance_date)
  );

  const latest = new Date(sorted[0].attendance_date);
  const month = latest.getMonth() + 1;
  const year = latest.getFullYear();

  return `${month.toString().padStart(2, "0")}/${year}`;
};

const filteredRequests = filterMonth
  ? requests.filter((r) => {
      const date = new Date(r.attendance_date);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      return yearMonth === filterMonth;
    })
  : requests;
    return(
        <div className="request-container">
            {notification.message && (
                <div className={`toast ${notification.type}`}>
                {notification.message}
                </div>
            )}
            <div className="request-left">
            {view === "create" ? (
            <>
                 <div className="request-left-header">
                    <div className="header-left">
                         <h2 style={{color:"#ef4444"}} >Tạo đơn xin giải trình</h2>
                        <p>Tạo và báo cáo giải trình của bạn.</p>
                    </div>
                    <div className="header-right">
                        <button className="btn-cannel" onClick={() => setShowConfirmCancel(true)}>
                            <HiMiniXCircle  /> Hủy
                        </button>
                    </div>
                </div>
                <div className="request-left-content">
                    <div className="info-section">
                        
                        <h3 className="section-title">
                            <FaRegFileAlt className="icon" style={{ color: "red" }}/> Thông tin chung
                        </h3>
                        
                        <div className="input-grid">
                            <div className="input-group">
                                <label>Ngày cần giải trình</label>
                                <input
                                    type="date"
                                    className="input-option"
                                    value={form.date}
                                    onChange={(e) =>
                                        setForm({ ...form, date: e.target.value })
                                    }

                                />
                            </div>
                            <div className="input-group">
                                <label>Loại giải trình</label>
                                <select
                                    className="input-option"
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm({ ...form, type: e.target.value })
                                    }
                                    >
                                    <option value="">Chọn loại giải trình </option>

                                    <option value="forgot_checkin">Quên chấm công vào</option>
                                    <option value="forgot_checkout">Quên chấm công ra</option>
                                    <option value="system_error">Lỗi hệ thống</option>
                                    <option value="late_arrival">Đi muộn</option>
                                    <option value="early_leave">Về sớm</option>
                                </select>
                            </div>
                            
                        </div>
                        <div className="info-section-bottom-ae-request">
                            <div className="info-section-bottom-ae-request-left">
                                <p>Người kiểm duyệt:</p>
                            </div>
                            <div className="info-section-bottom-ae-request-right">
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
                            <FaRegClock className="icon" style={{ color: "red" }}/> Thời gian thực tế
                        </h3>
                        <div className="input-grid">
                            <div className="input-group">
                                <label>Thời gian vào</label>
                                <input
                                    type="time"
                                    className="input-option"
                                    value={form.checkin}
                                    onChange={(e) =>
                                        setForm({ ...form, checkin: e.target.value })
                                    }
                                />
                            </div>
                            <div className="input-group">
                                <label>Thời gian ra</label>
                                <input
                                    type="time"
                                    className="input-option"
                                    value={form.checkout}
                                    onChange={(e) =>
                                        setForm({ ...form, checkout: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        
                        
                    </div>
                    <div className="info-section">
                        <h3 className="section-title">
                            <MdChatBubbleOutline className="icon" style={{ color: "red" }}/> Giải trình
                        </h3>
                        <div className="input-grid-1">
                            <div className="input-group" style={{ marginTop: "10px" }}>
                            <label>Lý do cụ thể</label>
                            <textarea
                                className="input-option-1"
                                value={form.reason}
                                onChange={(e) =>
                                    setForm({ ...form, reason: e.target.value })
                                }
                                placeholder="Giải trình lý do cụ thể..."

                            />
                            </div>
                            <div className="input-group" style={{ marginTop: "20px" }}>
                                          <label>Đính kèm tài liệu</label>
                                          <label htmlFor="file-upload" className="file-uploader">
                                                {!selectedFile ? (
                                                    <>
                                                    <IoCloudUploadOutline className="file-icon" style={{ color: "red" }} />

                                                    <div className="file-text">
                                                        <span className="file-bold" style={{ color: "red" }}>
                                                        Nhấn để chọn file
                                                        </span>
                                                    </div>

                                                    <div className="file-note">
                                                        PNG, JPG, PDF, Word (Max 10MB)
                                                    </div>
                                                    </>
                                                ) : (
                                                    <div className="file-preview">
                                                    <div className="file-left">📎</div>

                                                    <div className="file-info">
                                                        <span className="file-name">{selectedFile.name}</span>
                                                        <span className="file-size">
                                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="file-remove"
                                                        onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation(); // 🔥 cực kỳ quan trọng
                                                        setSelectedFile(null);
                                                        if (fileRef.current) fileRef.current.value = "";
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                    </div>
                                                )}

                                                <input
                                                    id="file-upload"
                                                    type="file"
                                                    hidden
                                                    ref={fileRef}
                                                    onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) setSelectedFile(file);
                                                    }}
                                                />
                                            </label>
                            </div>
                        </div>
                    </div>
                    
                </div>

                <div className="acction-footer">
                    <button className="btn-request" style={{background:"red"}} onClick={() => setShowConfirmSubmit(true)} >
                        <BsSend /> Gửi
                    </button>
                </div>
  </>
) : (
  <>
    {/* ===== HISTORY ===== */}
    <div className="history-page-header">
      <div>
        <h2>Đơn giải trình đã gửi</h2>
        <p>Tất cả các đơn bạn đã gửi</p>
      </div>

      <button className="btn-back" onClick={() => setView("create")}>
        <IoArrowBack /> Quay lại
      </button>
    </div>

    <div className="history-card">
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
                    <button style={{background:"red"}} className="btn-search" onClick={() => {}}><CiSearch size={20} /></button>
                  </div>
                </div>
      <div className="history-table-container">
        <table className="history-table" >
          <thead >
            <tr>
                <th style={{ background: "red", color: "white" }}>Ngày tạo đơn</th>
                <th style={{ background: "red", color: "white" }}>Ngày cần giải trình</th>
                <th style={{ background: "red", color: "white" }}>Loại đơn</th>
                <th style={{ background: "red", color: "white" }}>Thời gian vào</th>
                <th style={{ background: "red", color: "white" }}>Thời gian ra</th>
                <th style={{ background: "red", color: "white" }}>Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => {  
                    
                    setSelectedRequest(r);
                    setShowModal(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>{new Date(r.created_at).toLocaleDateString("vi-VN")}</td>
                  <td>{new Date(r.attendance_date).toLocaleDateString("vi-VN")}</td>

                  <td>{getExplanationText(r.explanation_type)}</td>

                  <td>{r.proposed_check_in}</td>

                  <td>{r.proposed_check_out}</td>

                  <td>
                    <span className={`status-pill ${r.status}`}>
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
      <h2 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "bold" }}>
        Chi tiết đơn giải trình
      </h2>

      {/* THÔNG TIN CHUNG */}
      <div className="info-section">
        <h3 className="section-title">
          <FaRegFileAlt className="icon" /> Thông tin chung
        </h3>

        <div className="input-grid">
          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Loại giải trình</label>
            <input
              type="text"
              className="input-option-2"
              value={getExplanationText(selectedRequest.explanation_type)}
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

      {/* NGÀY */}
      <div className="info-section">
        <h3 className="section-title">
          <MdCalendarMonth className="icon" /> Ngày giải trình
        </h3>

        <div className="input-grid">
          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Ngày</label>
            <input
              type="date"
              className="input-option-2"
              value={selectedRequest.attendance_date?.split("T")[0] || ""}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* THỜI GIAN */}
      <div className="info-section">
        <h3 className="section-title">
          <FaRegClock className="icon" /> Thời gian thực tế
        </h3>

        <div className="input-grid">
          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Checkin</label>
            <input
              type="text"
              className="input-option-2"
              value={selectedRequest.proposed_check_in || "---"}
              readOnly
            />
          </div>

          <div className="input-group-1">
            <label style={{textAlign:"left",marginLeft:"5px",fontWeight:"bold",fontSize:"13px"}}>Checkout</label>
            <input
              type="text"
              className="input-option-2"
              value={selectedRequest.proposed_check_out || "---"}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* LÝ DO */}
      <div className="info-section">
        <h3 className="section-title">
          <MdChatBubbleOutline className="icon" /> Lý do
        </h3>
        
        <textarea
          className="input-option-3"
          value={selectedRequest.reason || ""}
          readOnly
        />
      </div>

      {/* FILE */}
      {selectedRequest.attachment_url && (
  <div className="info-section file-section">
    <label>File đính kèm</label>

    <div className="file-box">
      <div className="file-left">📎</div>

      <div className="file-info">
        <span className="file-name">
          {selectedRequest.attachment_url
            .split("-")
            .slice(1)
            .join("-")}
        </span>
      </div>

      <a
        href={`http://localhost:5000/uploads/${selectedRequest.attachment_url}`}
        target="_blank"
        rel="noreferrer"
        className="file-view-btn"
      >
        Xem
      </a>
    </div>
  </div>
)}

      <div style={{ textAlign: "right" }}>
        <button onClick={closeModal} className="btn-close-modal">
          Đóng
        </button>
      </div>
    </div>
  </div>
)}

            <div className="request-right">

                <div className="card-request-top" style={{background:"linear-gradient(135deg, #ef4444 40%, #f97316 100%)"}}>
                    <div className="card-header">
    <FiClock style={{ fontSize: "20px" }} />
    <span>Thống kê giải trình {new Date().getFullYear()}</span>
  </div>

  {/* MAIN */}
  <div className="card-main-value">
    <span className="remaining-days">{total}</span>
    <span className="total-days"> đơn</span>
  </div>

  <div className="card-sub-text">Tổng số đơn giải trình đã gửi</div>

  {/* DETAIL */}
  <div className="card-footer" style={{marginTop:"10px"}}>
    <div className="usage-info" style={{ display:"flex", gap: "4px",fontSize:"13px" }}>
      <span>✔ Đã duyệt: {approved}</span>
      <span>⏳ Chờ duyệt: {pending}</span>
      <span>✖ Từ chối: {rejected}</span>
    </div>

    {/* PROGRESS */}

  </div>

  {/* ICON BG */}
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

                <div className="card-request-bot" style={{minHeight:"765px"}}>
                    <div className="card-header-bot">
                            <h3 className="card-header-bot-2">
                            <PiClockCounterClockwise
                                style={{ fontSize: "17px", color: "red" }}
                            />
                                Đơn gần đây
                            </h3>
                            <button className="btn-all" style={{color:"red"}}  onClick={() => setView("history")} >Xem tất cả</button>
                    </div>
                    <div className="card-content-bot">
  {recentRequests.length === 0 ? (
    <p className="empty-text">Chưa có đơn nào</p>
  ) : (
    recentRequests.map((r) => (
      <div className="recent-item" key={r.id}>
        {/* ICON */}
        <div className={`recent-icon-wrapper ${r.status}`}>
          {r.status === "approved" ? <GoCheckCircle /> :
          r.status === "pending" ? <LuClock2 /> :
          r.status === "rejected" ? <GoBlocked /> :
          null}
        </div>

        {/* NỘI DUNG */}
        <div className="recent-info">
          <p className="recent-type">
            {getExplanationText(r.explanation_type)}
          </p>

          <p className="recent-date">
            {new Date(r.attendance_date).toLocaleDateString("vi-VN")}
            {" "}({r.proposed_check_in} - {r.proposed_check_out})
          </p>
        </div>

        {/* STATUS */}
        <div className="recent-right">
          <span className={`status-pill ${r.status}`}>
            {r.status === "approved"
              ? "ĐÃ DUYỆT"
              : r.status === "pending"
              ? "CHỜ DUYỆT"
              : r.status === "rejected"
              ? "TỪ CHỐI"
              : ""}
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
      <p>Bạn có chắc muốn gửi đơn giải trình không?</p>

      <div className="confirm-actions">
        <button className="btn-confirm" onClick={handleSubmit} style={{background:"red"}}>
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
      <p>Dữ liệu sẽ bị xóa toàn bộ</p>

      <div className="confirm-actions">
        <button className="btn-danger" onClick={handleResetForm}>
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

// 2. NHỚ ĐỔI TÊN Ở PHẦN EXPORT NỮA NHÉ
export default AttendanceExplanationRequest;
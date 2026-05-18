import React, { useState, useEffect } from 'react';
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { employeeService } from "../../services/employeeService";
import { GoCheckCircle } from "react-icons/go";
import { LuClock2 } from "react-icons/lu";
import { FiClock } from "react-icons/fi";
import { GoBlocked } from "react-icons/go";
import { useLocation } from "react-router-dom";
import { StatusPill, ApproverFeedback, MonthFilter, HistoryPageHeader, ConfirmModal, Toast } from '../../components/RequestSharedComponents';

import './ae_request.css'

const today = new Date().toISOString().split('T')[0];

// 1. SỬA TÊN COMPONENT VIẾT HOA CHỮ CÁI ĐẦU
const AttendanceExplanationRequest = () => {

const fileRef = React.useRef();
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
const location = useLocation();
const state = location.state;

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


const user = JSON.parse(localStorage.getItem('user') || '{}');
const [approverId, setApproverId] = useState("");
const [approvers, setApprovers] = useState([]);
useEffect(() => {
  if (!user?.id) return;
  employeeService
    .getApprovers(user.id)
    .then((res) => {
      const data = res?.data || res || [];
      setApprovers(data);
      // Tự động chọn quản lý trực tiếp (phần tử đầu tiên, priority=1)
      if (data.length > 0) setApproverId(data[0].id);
    })
    .catch(console.error);
}, [user?.id]);

const handleSubmit = async () => {
  if (new Date(form.date) >= new Date(today)) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Không được chọn ngày chưa diễn ra!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }

  if (!form.date && !approverId && !form.type && !form.checkin &&!form.checkout && !(form.reason || "").trim()) {
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
  // validate theo type
 // ===== VALIDATE THEO TYPE =====


    else if (form.type === "late_arrival") {
      if (!form.checkin) {
        setShowConfirmSubmit(false);
        setNotification({ message: "Vui lòng nhập thời gian vào!", type: "error" });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      const checkinMin = toMinutes(form.checkin);
      const minCheckin = 7 * 60;

      if (checkinMin < minCheckin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian vào phải >= 07:00!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      //  không cho nhập checkout
      if (form.checkout) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Đi muộn không cần nhập thời gian ra!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }
    }

    else if (form.type === "early_leave") {
      if (!form.checkin || !form.checkout) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Vui lòng nhập đầy đủ giờ vào và giờ ra!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      const checkinMin = toMinutes(form.checkin);
      const checkoutMin = toMinutes(form.checkout);
      const limitMin = 21 * 60;

      if (checkinMin >= checkoutMin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian vào phải nhỏ hơn thời gian ra!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      if (checkoutMin > limitMin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian ra phải <= 21:00!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }
    }

    else if (form.type !== "system_error") {
      // forgot_checkin, forgot_checkout
      if (!form.checkin || !form.checkout) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Vui lòng chọn thời gian vào, thời gian ra!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      const checkinMin = toMinutes(form.checkin);
      const checkoutMin = toMinutes(form.checkout);
      const limitMin = 21 * 60;
      const minCheckin = 7 * 60;

      if (checkinMin >= checkoutMin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian vào phải nhỏ hơn thời gian ra!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      if (checkoutMin > limitMin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian ra phải <= 21:00!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }

      if (checkinMin < minCheckin) {
        setShowConfirmSubmit(false);
        setNotification({
          message: "Thời gian vào phải >= 07:00!",
          type: "error",
        });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
        return;
      }
    }
  if (!form.reason.trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập lý do!", type: "error" });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  

  const formData = new FormData();

  formData.append("attendance_date", form.date);
  formData.append("explanation_type", form.type);
  formData.append("proposed_check_in", form.checkin);
  formData.append("proposed_check_out", form.checkout);
  formData.append("reason", form.reason);
  formData.append("approverId", approverId);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const file = selectedFile;

if (file && file.size > MAX_SIZE) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "File không được vượt quá 10MB!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}
  if (file) formData.append("file", file);

  try {
    await employeeService.createExplanationRequest(formData);
    const res = await employeeService.getExplanationRequests();
    const data = res?.data || res || [];
    setRequests(data);
    setRecentRequests(data.slice(0, 3));

    setNotification({ message: "Gửi đơn giải trình thành công!", type: "success" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    setShowConfirmSubmit(false);

    handleResetForm(false); 

  } catch {   
    setNotification({ message: "Gửi thất bại!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
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
  if (!state) return;

  const { date, checkIn, checkOut, type } = state;
// eslint-disable-next-line react-hooks/set-state-in-effect
  setForm((prev) => ({
    ...prev,
    date: date ? date.split("T")[0] : "",

    type: type || "",

    checkin:
      type === "late_arrival" && checkIn
        ? new Date(checkIn).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",

    checkout:
      type === "early_leave" && checkOut
        ? new Date(checkOut).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",

    // nếu về sớm thì giữ cả checkin + checkout
    ...(type === "early_leave" && {
      checkin: checkIn
        ? new Date(checkIn).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    }),

    // nếu vắng mặt → clear hết
    ...(type === "system_error" && {
      checkin: "",
      checkout: "",
    }),
  }));

  // set mặc định người duyệt (quản lý trực tiếp)
  if (approvers.length > 0) {
    setApproverId(approvers[0].id);
  }
}, [state, approvers]);

useEffect(() => {
  employeeService
    .getExplanationRequests()
    .then((res) => {
      const data = res?.data || res || [];
      setRequests(data);
      setRecentRequests(data.slice(0, 3));
    })
    .catch(console.error);
}, []);

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
                                    max={today}
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
                                    onChange={(e) => {
                                      const value = e.target.value;

                                      setForm(prev => ({
                                        ...prev,
                                        type: value,
                                        ...(value === "system_error" && {
                                          checkin: "",
                                          checkout: ""
                                        }),
                                        ...(value === "late_arrival" && {
                                          checkout: ""
                                        })
                                      }));
                                    }}
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
                                disabled={user?.role?.toUpperCase() === 'EMPLOYEE'}
                                style={{
                                    backgroundColor: user?.role?.toUpperCase() === 'EMPLOYEE' ? '#f3f4f6' : '#fff',
                                    cursor: user?.role?.toUpperCase() === 'EMPLOYEE' ? 'not-allowed' : 'pointer'
                                }}
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
                                    disabled={form.type === "system_error"}
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
                                    disabled={
                                      form.type === "system_error" || form.type === "late_arrival"
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
  const file = e.target.files?.[0];
  if (!file) return;

  const MAX_SIZE = 10 * 1024 * 1024;

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
  ];

  const allowedExt = /\.(pdf|doc|docx|png|jpg|jpeg)$/i;

  const isValid =
    allowedTypes.includes(file.type) || allowedExt.test(file.name);

  if (!isValid) {
    setNotification({
      message: "Chỉ chấp nhận PDF, DOC, DOCX, PNG, JPG!",
      type: "error",
    });
    e.target.value = "";
    setSelectedFile(null);
    return;
  }

  if (file.size > MAX_SIZE) {
    setNotification({
      message: "File không được vượt quá 10MB!",
      type: "error",
    });
    e.target.value = "";
    setSelectedFile(null);
    return;
  }

  setSelectedFile(file);
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
    <HistoryPageHeader
      title="Đơn giải trình đã gửi"
      subtitle="Tất cả các đơn bạn đã gửi"
      onBack={() => setView("create")}
    />

    <div className="history-card">
        <div className="history-filter">
                  <h4>Chi tiết theo ngày (Tháng {getLatestMonthYear(requests, 'attendance_date')})</h4>
                  <MonthFilter value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
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
                <th style={{ background: "red", color: "white" }}>Lý do từ chối</th>
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

                  <td><StatusPill status={r.status} /></td>
                  <td className="reject-reason">
                    {r.status === "rejected" ? (r.reject_reason || "---") : "---"}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Lớp phủ tối (Backdrop mô phỏng Modal) */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeModal}></div>

          {/* CONTAINER CHÍNH CỦA ĐƠN TỪ */}
          <div className="bg-white w-full max-w-[500px] rounded-3xl shadow-2xl p-6 md:p-8 relative z-10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-y-auto">
              
              {/* Tiêu đề */}
              <h2 className="text-center text-lg font-bold text-[#1f2937] mb-6">Chi tiết đơn giải trình</h2>

              {/* Khối 1: Thông tin chung */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegFileAlt className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thông tin chung</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Loại giải trình</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {getExplanationText(selectedRequest.explanation_type)}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Người kiểm duyệt</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60 truncate" title={selectedRequest.approver_name || "---"}>
                              {selectedRequest.approver_name || "---"}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Khối 2: Thời gian & Ngày */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegClock className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thời gian & Ngày</h3>
                  </div>
                  <div className="mb-4">
                      <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Ngày giải trình</label>
                      <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                          {new Date(selectedRequest.attendance_date).toLocaleDateString("vi-VN")}
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Check-in đề xuất</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {selectedRequest.proposed_check_in || "---"}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Check-out đề xuất</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {selectedRequest.proposed_check_out || "---"}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Khối 3: Nội dung & Đính kèm */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <MdChatBubbleOutline className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Lý do giải trình</h3>
                  </div>
                  <textarea 
                    readOnly 
                    className="w-full bg-slate-200/70 text-gray-700 text-[13px] font-medium p-3 rounded-lg border border-slate-300/60 resize-none outline-none mb-3" 
                    rows="2"
                    value={selectedRequest.reason || "Không có nội dung"}
                  />

                  {selectedRequest.attachment_url && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">📎</span>
                        <span className="text-[12px] text-slate-600 truncate">{selectedRequest.attachment_url.split('-').slice(1).join('-')}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a 
                          href={`http://localhost:5000/uploads/${selectedRequest.attachment_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          Xem
                        </a>
                      </div>
                    </div>
                  )}
              </div>

              {/* Khối 4: Trạng thái & Lý do */}
              <ApproverFeedback 
                status={selectedRequest.status} 
                reason={selectedRequest.reject_reason} 
              />

              {/* Footer Action */}
              <div className="flex justify-end mt-2">
                  <button 
                    onClick={closeModal}
                    className="bg-[#05a643] hover:bg-[#048736] text-white font-bold text-[14px] py-2.5 px-8 rounded-xl shadow-md transition-all active:scale-95"
                  >
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


export default AttendanceExplanationRequest;

import React, { useState, useEffect } from 'react';
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { employeeService } from "../../services/employeeService";
import { GoCheckCircle } from "react-icons/go";
import { LuClock2 } from "react-icons/lu";
import { GoBlocked } from "react-icons/go";
import { StatusPill, ApproverFeedback, MonthFilter, HistoryPageHeader, ConfirmModal, Toast } from '../../components/RequestSharedComponents';
import { formatDate, formatDateDMY } from '../../components/requestUtils';
import './OvertimeRequest.css'

const today = new Date().toISOString().split('T')[0];
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
const [leaveRequests, setLeaveRequests] = useState([]);
const [filterMonth, setFilterMonth] = useState("");
const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
const [showConfirmCancel, setShowConfirmCancel] = useState(false);
const [notification, setNotification] = useState({ message: "", type: "" });



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

// formatDate – imported from shared/requestUtils

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
  if (!form.ot_date && !approverId && !form.start_time &&!form.end_time && !(form.reason || "").trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập thông tin!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!form.ot_date) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn ngày tăng ca!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  const today = new Date();
today.setHours(0, 0, 0, 0);

const selectedDate = new Date(form.ot_date);
selectedDate.setHours(0, 0, 0, 0);

//  Rule 1: ngày không được trong quá khứ
if (new Date(form.ot_date) < new Date(today)) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Lỗi logic: Không được chọn ngày trong quá khứ!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

//  Rule 2: chỉ được chọn trong vòng 10 ngày tới
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 10);
maxDate.setHours(0, 0, 0, 0);

if (selectedDate > maxDate) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Chỉ được đăng ký tăng ca trong vòng 10 ngày tới!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}
    if (!approverId) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn người kiểm duyệt!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }

  if (!form.start_time || !form.end_time) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn thời gian bắt đầu và thời gian kết thúc!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }


  if (!form.reason.trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập nội dung công việc!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }

 const [h1, m1] = form.start_time.split(":").map(Number);
const [h2, m2] = form.end_time.split(":").map(Number);

const start = h1 * 60 + m1;
const end = h2 * 60 + m2;

const now = new Date();
const currentMinutes = now.getHours() * 60 + now.getMinutes();

//  Rule 1: nếu chọn ngày hôm nay thì start_time phải > hiện tại
if (form.ot_date === new Date().toISOString().split("T")[0]) {
  if (start <= currentMinutes) {
    setShowConfirmSubmit(false);
    setNotification({
      message: "Giờ bắt đầu phải lớn hơn thời gian hiện tại!",
      type: "error",
    });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
}
if (end <= start) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Giờ kết thúc phải lớn hơn giờ bắt đầu!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}
//  Rule 3: end <= 21:00
const limitEnd = 21 * 60;
if (end > limitEnd) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Giờ kết thúc không được vượt quá 21:00!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

//  Rule 2: end phải > start ít nhất 2 tiếng
if (end - start < 120) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Thời gian tăng ca phải tối thiểu 2 tiếng!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}




//  Rule 4: start phải trong khoảng 09:00 - 19:00
const minStart = 9 * 60;
const maxStart = 19 * 60;

if (start < minStart || start > maxStart) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Giờ bắt đầu phải từ 09:00 đến 19:00!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

const overlapType = isOverlap(form.ot_date, form.start_time, form.end_time);
if (overlapType) {
  setShowConfirmSubmit(false);
  setNotification({
    message: overlapType === "leave" 
      ? "Ngày này bạn đã đăng ký nghỉ phép, không thể xin tăng ca!" 
      : "Bạn đã có đơn tăng ca trùng thời gian!",
    type: "error",
  });

  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

  try {
    const payload = {
      ot_date: form.ot_date,
      start_time: form.start_time,
      end_time: form.end_time,
      reason: form.reason,
      approver_id: approverId
    };

    await employeeService.createOvertimeRequest(payload);

    const res = await employeeService.getOvertimeRequests();
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
    setNotification({
      message: "Gửi đơn thành công!",
      type: "success",
    });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);

  } catch (err) {
    console.error(err);
    setNotification({ message: "Lỗi gửi đơn!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
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

  // formatDateDMY – imported from shared/requestUtils
  

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
      // Tự động chọn quản lý trực tiếp (phần tử đầu tiên, priority=1)
      if (data.length > 0) setApproverId(data[0].id);
    })
    .catch((err) => {
      console.error("Lỗi lấy approvers:", err);
      setApprovers([]);
    });
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getOvertimeRequests()
    .then((res) => {
      const data = res?.data || res || [];
      setRequests(data);
      setRecentRequests(data.slice(0, 3));
    })
    .catch((err) => {
      console.error("Lỗi lấy OT:", err);
      setRequests([]);
      setRecentRequests([]);
    });

  employeeService
    .getLeaveRequests()
    .then((res) => {
      setLeaveRequests(res?.data || res || []);
    })
    .catch((err) => console.error("Lỗi lấy Leave:", err));
}, [user?.id]);
useEffect(() => {
  console.log("STATE REQUESTS:", requests);
}, [requests]);

const isOverlap = (newDate, newStart, newEnd) => {
  const newStartMin =
    parseInt(newStart.split(":")[0]) * 60 +
    parseInt(newStart.split(":")[1]);

  const newEndMin =
    parseInt(newEnd.split(":")[0]) * 60 +
    parseInt(newEnd.split(":")[1]);

  const otDate = new Date(newDate);
  otDate.setHours(0, 0, 0, 0);

  // 1. Check overlap with OT Requests
  const overlapOT = requests.some((r) => {
    if (r.status === "rejected") return false;
    if (r.ot_date !== newDate) return false;

    const oldStartMin =
      parseInt(r.start_time.split(":")[0]) * 60 +
      parseInt(r.start_time.split(":")[1]);

    const oldEndMin =
      parseInt(r.end_time.split(":")[0]) * 60 +
      parseInt(r.end_time.split(":")[1]);

    return newStartMin < oldEndMin && newEndMin > oldStartMin;
  });

  if (overlapOT) return "ot";

  // 2. Check overlap with Leave Requests
  const overlapLeave = leaveRequests.some((r) => {
    if (r.status !== "approved" && r.status !== "pending") return false;

    const startB = new Date(r.start_datetime);
    const endB = new Date(r.end_datetime);
    startB.setHours(0, 0, 0, 0);
    endB.setHours(0, 0, 0, 0);

    return otDate >= startB && otDate <= endB;
  });

  if (overlapLeave) return "leave";

  return null;
};

  return (
    
    <div className="request-container">
        <Toast message={notification.message} type={notification.type} />
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
                          min={today}
                          max={(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 10);
                            return d.toISOString().split("T")[0];
                          })()}
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
                    <FaRegClock className="icon" /> Thời gian tăng ca
                </h3>
                <div className="input-grid">
                    <div className="input-group">
                        <label>Thời gian bắt đầu tăng ca</label>
                        <input
                          type="time"
                          className="input-option"
                          value={form.start_time}
                          min="09:00"
                          max="19:00"
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
                          min={form.start_time || "09:00"} // luôn phải >= start_time
                          max="21:00"
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
        <HistoryPageHeader
          title="Đơn đã gửi"
          subtitle="Tất cả các đơn bạn đã gửi"
          onBack={() => setView("create")}
        />

        {/* CARD */}
        <div className="history-card">

        {/* FILTER */}
        <div className="history-filter">
            <h4>Chi tiết theo ngày (Tháng {getLatestMonthYear(requests, 'ot_date')})</h4>
            <MonthFilter value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
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
                <th>Lý do từ chối</th>
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
                            <td><StatusPill status={r.status} /></td>

                            {/* Lý do từ chối */}
                            <td style={{ color: r.status === 'rejected' ? '#dc2626' : '#6b7280', fontSize: '13px' }}>
                              {r.status === 'rejected' ? (r.reject_reason || '---') : '---'}
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
              <h2 className="text-center text-lg font-bold text-[#1f2937] mb-6">Chi tiết đơn tăng ca</h2>

              {/* Khối 1: Thông tin chung */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegFileAlt className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thông tin chung</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Ngày tăng ca</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {formatDateDMY(selectedRequest.ot_date)}
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

              {/* Khối 2: Thời gian tăng ca */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegClock className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thời gian tăng ca</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Bắt đầu</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {selectedRequest.start_time}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Kết thúc</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {selectedRequest.end_time}
                          </div>
                      </div>
                  </div>
                  
                  {/* Highlight Tổng thời gian */}
                  <div className="bg-[#dcfce7] border border-[#86efac] rounded-xl p-3 flex justify-between items-center">
                      <span className="text-[13px] text-gray-700 font-medium">Tổng thời gian:</span>
                      <span className="text-[13px] font-bold text-[#16a34a]">
                        {calculateOTHours(selectedRequest.start_time, selectedRequest.end_time)}
                      </span>
                  </div>
              </div>

              {/* Khối 3: Nội dung công việc */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <MdChatBubbleOutline className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Nội dung công việc</h3>
                  </div>
                  <textarea 
                    readOnly 
                    className="w-full bg-slate-200/70 text-gray-700 text-[13px] font-medium p-3 rounded-lg border border-slate-300/60 resize-none outline-none" 
                    rows="2"
                    value={selectedRequest.reason || "Không có nội dung"}
                  />
              </div>

              {/* Khối 4: Trạng thái & Lý do */}
              <div className="pb-4">
                <ApproverFeedback 
                  status={selectedRequest.status} 
                  reason={selectedRequest.reject_reason} 
                />
              </div>

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
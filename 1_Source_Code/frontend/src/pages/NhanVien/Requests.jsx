import React, { useEffect, useState, useRef } from "react";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { HiMiniXCircle } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { FiClock } from "react-icons/fi";
import { PiClockCounterClockwise } from "react-icons/pi";
import { GoCheckCircle, GoBlocked } from "react-icons/go";
import { LuClock2 } from "react-icons/lu";
import { employeeService } from "../../services/employeeService";
import { StatusPill, ApproverFeedback, MonthFilter, HistoryPageHeader, ConfirmModal, Toast } from '../../components/RequestSharedComponents';

import "./Requests.css";

const today = new Date().toISOString().split("T")[0];

const Requests = () => {
  const fileRef = useRef();
  const [requests, setRequests] = useState([]);
  console.log("REQUESTS:", requests);
  const [form, setForm] = useState({
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [otRequests, setOtRequests] = useState([]);



  const [view, setView] = useState("create"); 
// "create" | "history"
  const [recentRequests, setRecentRequests] = useState([]);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [filterMonth, setFilterMonth] = useState(""); // yyyy-mm

  const [approvers, setApprovers] = useState([]); // danh sách người kiểm duyệt
  const [approverId, setApproverId] = useState(""); // id người được chọn

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")|| "{}");

  const [selectedRequest, setSelectedRequest] = useState(null);
const [showModal, setShowModal] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);

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
  setSelectedFile(null);
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

const countWorkDays = (start, end) => {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isValidLeaveDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
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
const isValidLeaveDay = (date) => {
  const day = date.getDay();
  return day !== 0; // chỉ loại Chủ nhật
};

const LEAVE_LIMIT = 12;

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
        if (year === currentYear && day !== 0) {
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

  const days = countWorkDays(start, end);
  return `${days} ngày`;
};

  useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getLeaveRequests()
    .then((res) => {
      const data = res?.data || res || [];
      setRequests(data);
      setRecentRequests(data.slice(0, 3)); // lấy 3 đơn gần nhất
    })
    .catch((err) => console.error(err));

  employeeService
    .getOvertimeRequests()
    .then((res) => {
      setOtRequests(res?.data || res || []);
    })
    .catch((err) => console.error(err));
}, [user?.id]);

  useEffect(() => {
  if (view !== "history") return;
  if (!user?.id) return;

  employeeService
    .getLeaveRequests()
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
      const data = res?.data || res || [];
        setApprovers(data);
        // Tự động chọn quản lý trực tiếp (phần tử đầu tiên, priority=1)
        if (data.length > 0) setApproverId(data[0].id);
      })
    .catch((err) => console.error(err));
  }, [view,user?.id]);


const getUsedDaysByType = (type) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return requests
    .filter((r) => r.leave_type === type && r.status === "approved")
    .reduce((total, r) => {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);

      let count = 0;
      let cur = new Date(start);
      cur.setHours(0, 0, 0, 0);

      const final = new Date(end);
      final.setHours(0, 0, 0, 0);

      while (cur <= final) {
        const y = cur.getFullYear();
        const m = cur.getMonth();

        if ((type === "annual" || type === "maternity")) {
          if (y === currentYear && isValidLeaveDay(cur)) count++;
        } else {
          if (y === currentYear && m === currentMonth && isValidLeaveDay(cur)) count++;
        }

        cur.setDate(cur.getDate() + 1);
      }

      return total + count;
    }, 0);
};

const getMaxLeaveDays = (type) => {
  switch (type) {
    case "annual":
      return 12;

    case "maternity":
      return 180;

    case "sick":
      return 2;

    case "unpaid":
      return 1;

    case "bereavement":
      return 7;

    default:
      return 0;
  }
};


  // ----------------- Submit -----------------

  const submitRequest = async () => {
  if (!form.type && !approverId && !form.startDate &&!form.endDate && !(form.reason || "").trim()) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng nhập thông tin!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!form.type) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn loại đơn!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!approverId) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn người kiểm duyệt!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  if (!form.startDate || !form.endDate) {
    setShowConfirmSubmit(false);
    setNotification({ message: "Vui lòng chọn ngày bắt đầu và ngày kết thúc!", type: "error" });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    return;
  }
  // ===== VALIDATE DATE =====
const today = new Date();
today.setHours(0, 0, 0, 0);

const start = new Date(form.startDate);
const end = new Date(form.endDate);

// 1. Không được chọn ngày trong quá khứ
if (new Date(form.startDate) < new Date(today)) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Lỗi logic: Không được chọn ngày trong quá khứ!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

// 2. Ngày kết thúc phải >= ngày bắt đầu (cho phép nghỉ 1 ngày)
if (end < start) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Ngày kết thúc không được trước ngày bắt đầu!",
    type: "error",
  });
  setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  return;
}

// 3. Khoảng nghỉ không quá 30 ngày
const diffDays = (end - start) / (1000 * 60 * 60 * 24);

if (diffDays > 30) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Thời gian nghỉ không được vượt quá 30 ngày!",
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


 const requestDays = calculateDays();
  const usedDays = getUsedDaysByType(form.type);
  const maxDays = getMaxLeaveDays(form.type);

  const remaining = maxDays - usedDays;

  if (remaining <= 0) {
  setShowConfirmSubmit(false);
  setNotification({
    message: "Bạn đã hết số ngày phép cho loại này!",
    type: "error",
  });
  setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 3000);
  return;
}

  if (requestDays > remaining) {
    setShowConfirmSubmit(false);
    setNotification({
      message: `Bạn chỉ còn ${remaining} ngày phép cho loại này!`,
      type: "error",
    });

    setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 3000);

    return;
  }

  const file = selectedFile;
  const MAX_SIZE = 10 * 1024 * 1024;

  

if (file) {
  if (file.size > MAX_SIZE) {
    setNotification({
      message: "File không được vượt quá 10MB!",
      type: "error",
    });
    return;
  }
}

const overlapType = isOverlapping(form.startDate, form.endDate);
if (overlapType) {
  setShowConfirmSubmit(false);
  setNotification({
    message: overlapType === "ot" 
      ? "Ngày này bạn đã đăng ký tăng ca, không thể xin nghỉ phép!" 
      : "Khoảng thời gian nghỉ bị trùng với đơn đã gửi!",
    type: "error",
  });

  setTimeout(() => {
    setNotification({ message: "", type: "" });
  }, 3000);

  return;
}

  const payload = new FormData();
  payload.append("leave_type", form.type);
  payload.append("start_datetime", form.startDate);
  payload.append("end_datetime", form.endDate);
  payload.append("reason", form.reason);
  payload.append("approverId", approverId);


  if (file) payload.append("attachment", file);

  try {
    await employeeService.createLeaveRequest(payload);

    // 1. Hiển thị thông báo
    setNotification({message: "Gửi đơn thành công!",type: "success",});
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    // 2. Đóng modal xác nhận ngay lập tức
    setShowConfirmSubmit(false);
    
    // 3. Reset form về trạng thái trống
    handleCancel();

    // 4. Reload lại danh sách đơn để cập nhật UI
    const res = await employeeService.getLeaveRequests();
    const data = res?.data || res || [];
    setRequests(data);
    setRecentRequests(data.slice(0, 3));

    // 5. QUAN TRỌNG: Tự động tắt thông báo sau 3 giây
    setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 3000);
    setShowConfirmSubmit(false);

  } catch (err) {
    console.error(err);
    setNotification({message: "Lỗi gửi đơn!",type: "error",});
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
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
  setSelectedFile(null);
  setShowConfirmCancel(false);
};



const calculateDays = () => {
  return countWorkDays(form.startDate, form.endDate);
};

const isOverlapping = (newStart, newEnd) => {
  const startA = new Date(newStart);
  const endA = new Date(newEnd);
  startA.setHours(0, 0, 0, 0);
  endA.setHours(0, 0, 0, 0);

  // 1. Check overlap with Leave Requests
  const overlapLeave = requests.some((r) => {
    if (r.status !== "approved" && r.status !== "pending") return false;

    const startB = new Date(r.start_datetime);
    const endB = new Date(r.end_datetime);
    startB.setHours(0, 0, 0, 0);
    endB.setHours(0, 0, 0, 0);

    return startA <= endB && endA >= startB;
  });

  if (overlapLeave) return "leave";

  // 2. Check overlap with OT Requests
  // Since OT is single day, we check if ot_date is within [startA, endA]
  const overlapOT = otRequests.some((r) => {
    if (r.status !== "approved" && r.status !== "pending") return false;
    
    const otDate = new Date(r.ot_date);
    otDate.setHours(0, 0, 0, 0);

    return otDate >= startA && otDate <= endA;
  });

  if (overlapOT) return "ot";

  return null;
};

  return (
    <div className="request-container">

      <Toast message={notification.message} type={notification.type} />

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
                min={today}
                max={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30); // tối đa 30 ngày
                  return d.toISOString().split("T")[0];
                })()}
                onChange={(e) => {
                  const newStart = e.target.value;
                  // Nếu endDate đang nhỏ hơn startDate mới → tự đặt lại bằng startDate mới
                  const newEnd = form.endDate && form.endDate < newStart ? newStart : form.endDate;
                  setForm({ ...form, startDate: newStart, endDate: newEnd });
                }}
              />
            </div>

            <div className="input-group">
              <label>Ngày kết thúc</label>
              <input
                type="date"
                className="input-option"
                value={form.endDate}
                min={form.startDate || today}
                max={(() => {
                  if (!form.startDate) return "";
                  const d = new Date(form.startDate);
                  d.setDate(d.getDate() + 30);
                  return d.toISOString().split("T")[0];
                })()}
                onChange={(e) => {
                  setForm({ ...form, endDate: e.target.value });
                }}
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
            <div className="input-group" style={{ marginTop: "10px" }}>
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
                {!selectedFile ? (
                  <>
                    <IoCloudUploadOutline className="file-icon" />

                    <div className="file-text">
                      <span className="file-bold">Nhấn để chọn file</span>
                    </div>

                    <div className="file-note">
                      PNG, JPG, PDF, Word (Max 10MB)
                    </div>
                  </>
                ) : (
                  <div className="file-preview">
                    <div className="file-left">
                      📎
                    </div>

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
                        e.preventDefault(); // ❗ tránh trigger label
                        setSelectedFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <input
  ref={fileRef}
  id="file-upload"
  type="file"
  hidden
  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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
      <HistoryPageHeader
          title="Đơn đã gửi"
          subtitle="Tất cả các đơn bạn đã gửi"
          onBack={() => setView("create")}
        />

      {/* CARD */}
      <div className="history-card">

        {/* FILTER */}
        <div className="history-filter">
          <h4>Chi tiết theo ngày (Tháng {getLatestMonthYear(requests, 'start_datetime')})</h4>
            <MonthFilter value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
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
                  <th>Lý do từ chối</th>
                </tr>
              </thead>
              <tbody>
               {requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty">Không có dữ liệu đơn đã gửi</td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} 
                      onClick={() => {console.log(r),handleRowClick(r)}} 
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

                      {/* Cột Trạng thái */}
                      <td><StatusPill status={r.status} /></td>

                      {/* Cột Lý do từ chối */}
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

      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Lớp phủ tối (Backdrop mô phỏng Modal) */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeModal}></div>

          {/* CONTAINER CHÍNH CỦA ĐƠN TỪ */}
          <div className="bg-white w-full max-w-[500px] rounded-3xl shadow-2xl p-6 md:p-8 relative z-10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-y-auto">
              
              {/* Tiêu đề */}
              <h2 className="text-center text-lg font-bold text-[#1f2937] mb-6">Chi tiết đơn nghỉ phép</h2>

              {/* Khối 1: Thông tin chung */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegFileAlt className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thông tin chung</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Loại nghỉ phép</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {getLeaveTypeText(selectedRequest.leave_type)}
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

              {/* Khối 2: Thời gian nghỉ */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <FaRegClock className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Thời gian nghỉ</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Từ ngày</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {formatDate(selectedRequest.start_datetime)}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-[#1f2937] mb-1.5 uppercase tracking-wider">Đến ngày</label>
                          <div className="bg-slate-200/70 text-gray-700 text-[13px] font-medium p-2.5 rounded-lg border border-slate-300/60">
                              {formatDate(selectedRequest.end_datetime)}
                          </div>
                      </div>
                  </div>
                  
                  {/* Highlight Tổng thời gian */}
                  <div className="bg-[#dcfce7] border border-[#86efac] rounded-xl p-3 flex justify-between items-center">
                      <span className="text-[13px] text-gray-700 font-medium">Tổng ngày nghỉ:</span>
                      <span className="text-[13px] font-bold text-[#16a34a]">
                        {calculateTotalDays(selectedRequest.start_datetime, selectedRequest.end_datetime)}
                      </span>
                  </div>
              </div>

              {/* Khối 3: Nội dung & Đính kèm */}
              <div className="border border-gray-200 rounded-[16px] p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                      <MdChatBubbleOutline className="w-[18px] h-[18px] text-emerald-500" />
                      <h3 className="font-bold text-gray-700 text-[13px]">Lý do & Minh chứng</h3>
                  </div>
                  <textarea 
                    readOnly 
                    className="w-full bg-slate-200/70 text-gray-700 text-[13px] font-medium p-3 rounded-lg border border-slate-300/60 resize-none outline-none mb-3" 
                    rows="2"
                    value={selectedRequest.reason || "Không có lý do"}
                  />

                  {selectedRequest.attachment && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">📎</span>
                        <span className="text-[12px] text-slate-600 truncate">{selectedRequest.attachment}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a 
                          href={`http://localhost:5000/uploads/${selectedRequest.attachment}`} 
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
    </>
  )}
      </div>
      {/* RIGHT SIDE STATISTICS */}
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
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận gửi đơn</h3>
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
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận hủy</h3>
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

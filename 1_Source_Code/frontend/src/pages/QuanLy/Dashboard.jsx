import React, { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Phone,
  Bell,
  MapPin,
  Calendar,
  AlertCircle,
  X,
  Send,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { notificationService } from "../../services/notificationService";

const SHIFT_START_HOUR = 7;
const SHIFT_START_MINUTE = 30;

const formatAttendanceTime = (value) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const getPresentBadge = (status, hasCheckOut) => {
  switch (status) {
    case "on_time":
      return { text: "Đúng giờ", tone: "success" };
    case "late":
      return { text: "Đi muộn", tone: "warning" };
    case "early_leave":
      return { text: "Về sớm", tone: "danger" };
    default:
      return hasCheckOut
        ? { text: "Đã checkout", tone: "neutral" }
        : { text: "Đã check-in", tone: "neutral" };
  }
};

const getAbsentBadge = (leaveStatus, now = new Date()) => {
  if (leaveStatus === "approved") {
    return { text: "Đã duyệt nghỉ phép", tone: "leave" };
  }

  const shiftStart = new Date(now);
  shiftStart.setHours(SHIFT_START_HOUR, SHIFT_START_MINUTE, 0, 0);

  if (now < shiftStart) {
    return { text: "Chưa tới giờ vào ca", tone: "pending" };
  }

  return { text: "Chưa check-in / Vắng mặt", tone: "danger" };
};

export default function DashboardQuanLy() {
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", kind: "success" });
  const [composeForm, setComposeForm] = useState({
    employeeId: "",
    employeeName: "",
    departmentId: "",
    departmentName: "",
    target: "Cá nhân",
    type: "Bình thường",
    title: "",
    content: "",
  });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    left: false,
    center: false,
    right: false,
  });
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const savedRange = useRef(null);

  const showToast = (message, kind = "success", duration = 2800) => {
    setToast({ show: true, message, kind });
    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, duration);
  };

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchData = () => {
    axiosClient
      .get("/manager/dashboard/present")
      .then((data) => {
        const mapped = data.map((emp) => ({
          id: emp.employee_id,
          name: emp.full_name,
          phone: emp.phone_number,
          time: formatAttendanceTime(emp.check_in_time),
          lat: emp.check_in_latitude,
          lng: emp.check_in_longitude,
          location: emp.location_name || "Không rõ",
          status: emp.attendance_status || null,
          checkOutTime: emp.check_out_time || null,
        }));
        setPresentEmployees(mapped);
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu hiện diện:", err.message);
        setPresentEmployees([]);
      });

    axiosClient
      .get("/manager/dashboard/absent")
      .then((data) => {
        const mapped = data.map((emp) => ({
          id: emp.employee_id,
          name: emp.full_name,
          phone: emp.phone_number,
          leaveStatus: emp.leave_status || null,
          departmentId: emp.department_id ? String(emp.department_id) : "",
          departmentName: emp.department_name || "",
        }));
        setAbsentEmployees(mapped);
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu vắng mặt:", err.message);
        setAbsentEmployees([]);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!composeModalOpen || !editorRef.current) return;
    editorRef.current.innerHTML = composeForm.content || "";
  }, [composeModalOpen, composeForm.content]);

  const createPresetNotification = (employee) => {
    const todayLabel = new Date().toLocaleDateString("vi-VN");
    const shouldWarn = employee?.leaveStatus !== "approved";
    const title = shouldWarn
      ? `Cảnh cáo đi làm chưa đúng quy định (${todayLabel})`
      : `Nhắc nhở cập nhật trạng thái chấm công (${todayLabel})`;

    const content = shouldWarn
      ? `<p>Chào <strong>${employee.name}</strong>,</p>
<p>Quản lý ghi nhận hôm nay bạn <strong>chưa check-in / vắng mặt</strong> mà không có trạng thái nghỉ phép hợp lệ.</p>
<ul>
  <li>Vui lòng phản hồi ngay lý do vắng mặt.</li>
  <li>Thực hiện chấm công đúng quy định từ ngày làm việc tiếp theo.</li>
  <li>Nếu tái diễn, công ty sẽ áp dụng hình thức xử lý theo nội quy.</li>
</ul>
<p>Đề nghị bạn nghiêm túc thực hiện.</p>`
      : `<p>Chào <strong>${employee.name}</strong>,</p>
<p>Bạn đang có trạng thái nghỉ phép được duyệt trong hôm nay, vui lòng kiểm tra lại thông tin để đảm bảo dữ liệu chấm công chính xác.</p>
<ul>
  <li>Nếu có thay đổi lịch làm việc, hãy báo quản lý trực tiếp.</li>
  <li>Nếu đã đi làm, vui lòng cập nhật chấm công đúng quy định.</li>
</ul>
<p>Xin cảm ơn bạn đã phối hợp.</p>`;

    return {
      target: "Cá nhân",
      title,
      type: shouldWarn ? "Cảnh báo" : "Bình thường",
      departmentId: employee.departmentId || "",
      departmentName: employee.departmentName || "",
      employeeId: employee.id,
      employeeName: employee.name || "",
      content,
      source: "manager-dashboard",
    };
  };

  const stripHtml = (value) =>
    String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const placeCaretAtEnd = (el) => {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const selectionInsideEditor = (el) => {
    if (!el) return false;
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    let node = selection.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    return node ? el.contains(node) : false;
  };

  const updateToolbarStatus = () => {
    if (!editorRef.current) return;
    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      bulletList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      left: document.queryCommandState("justifyLeft"),
      center: document.queryCommandState("justifyCenter"),
      right: document.queryCommandState("justifyRight"),
    });
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.getRangeAt && selection.rangeCount) {
      savedRange.current = selection.getRangeAt(0);
    }
    updateToolbarStatus();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!savedRange.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };

  const execCmd = (cmd, val = null) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (!selectionInsideEditor(el)) {
      placeCaretAtEnd(el);
    }
    document.execCommand(cmd, false, val);
    const html = el.innerHTML || "";
    setComposeForm((prev) => ({ ...prev, content: html }));
    updateToolbarStatus();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      execCmd("insertImage", event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAttachmentUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = String(event.target.result || "");
      const safeName = String(file.name || "tep-dinh-kem").replace(/"/g, "&quot;");
      execCmd(
        "insertHTML",
        `&nbsp;<a href="${dataUrl}" download="${safeName}" target="_blank" rel="noopener noreferrer" class="text-teal-700 font-semibold underline">📎 ${safeName}</a>&nbsp;`
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertLink = () => {
    const raw = String(linkUrl || "").trim();
    if (!raw || !editorRef.current) return;
    const formattedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    editorRef.current.focus();
    restoreSelection();
    if (!selectionInsideEditor(editorRef.current)) {
      placeCaretAtEnd(editorRef.current);
    }
    document.execCommand("createLink", false, formattedUrl);
    const html = editorRef.current.innerHTML || "";
    setComposeForm((prev) => ({ ...prev, content: html }));
    setLinkUrl("");
    setShowLinkInput(false);
    updateToolbarStatus();
  };

  const handleOpenComposeNotification = (employee) => {
    if (!employee?.id) return;
    const prefillNotification = createPresetNotification(employee);
    setComposeError("");
    setComposeForm({
      employeeId: prefillNotification.employeeId || "",
      employeeName: prefillNotification.employeeName || "",
      departmentId: prefillNotification.departmentId || "",
      departmentName: prefillNotification.departmentName || "",
      target: "Cá nhân",
      type: prefillNotification.type || "Bình thường",
      title: prefillNotification.title || "",
      content: prefillNotification.content || "",
    });
    setShowLinkInput(false);
    setLinkUrl("");
    setComposeModalOpen(true);
  };

  const handleSendReminderNotification = async () => {
    const title = String(composeForm.title || "").trim();
    const content = String(editorRef.current?.innerHTML || composeForm.content || "").trim();

    if (!composeForm.employeeId) {
      setComposeError("Không xác định được nhân viên nhận thông báo.");
      return;
    }
    if (!title) {
      setComposeError("Vui lòng nhập tiêu đề thông báo.");
      return;
    }
    if (!stripHtml(content)) {
      setComposeError("Vui lòng nhập nội dung thông báo.");
      return;
    }

    setSendingNotification(true);
    setComposeError("");
    try {
      const userString = localStorage.getItem("user");
      const user = userString ? JSON.parse(userString) : {};
      const senderId = user.employee_id || user.id || null;
      const contentText = stripHtml(content);
      const payload = {
        title,
        target: "Cá nhân",
        notification_type: composeForm.type === "Cảnh báo" ? "warning" : "info",
        department_id: composeForm.departmentId || null,
        employee_id: composeForm.employeeId,
        content,
        desc: `${contentText.slice(0, 60)}${contentText.length > 60 ? "..." : ""}`,
        status: "Đã gửi",
        sender_id: senderId,
      };

      await notificationService.createNotification(payload);
      setComposeModalOpen(false);
      showToast("Đã gửi thông báo thành công.", "success");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Không thể gửi thông báo.";
      setComposeError(message);
      showToast(`Gửi thất bại: ${message}`, "error", 3500);
    } finally {
      setSendingNotification(false);
    }
  };

  const total = presentEmployees.length + absentEmployees.length;
  const present = presentEmployees.length;
  const absent = absentEmployees.length;
  const performance = total === 0 ? 0 : Math.round((present / total) * 100);

  const getPerformanceColor = () => {
    if (performance >= 90) return "from-emerald-400 to-emerald-600";
    if (performance >= 70) return "from-blue-400 to-blue-600";
    if (performance >= 50) return "from-amber-400 to-amber-500";
    return "from-rose-400 to-rose-600";
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Tổng quan Bộ phận
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 text-sm">
            <Calendar size={16} /> Hôm nay: {today}
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchData();
            setTimeout(() => setLoading(false), 800);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Cập nhật dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Tổng nhân sự</p>
              <h2 className="text-3xl font-extrabold text-slate-800">{total}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Đã có mặt</p>
              <h2 className="text-3xl font-extrabold text-emerald-600">{present}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <UserCheck className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Vắng mặt / Chưa tới</p>
              <h2 className="text-3xl font-extrabold text-rose-600">{absent}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <UserX className="text-rose-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-end mb-2">
            <p className="text-slate-500 text-sm font-medium">Tỷ lệ đi làm</p>
            <h2 className="text-2xl font-extrabold text-slate-800">{performance}%</h2>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`bg-gradient-to-r ${getPerformanceColor()} h-full rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${performance}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Nhân sự đã Check-in
            </h2>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              {present} người
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {presentEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Chưa có ai check-in hôm nay</p>
              </div>
            ) : (
              presentEmployees.map((emp, index) => {
                const badge = getPresentBadge(emp.status, Boolean(emp.checkOutTime));

                return (
                  <div
                    key={emp.id || index}
                    className="flex justify-between items-center p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center font-bold text-indigo-700 shadow-sm">
                        {emp.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                        <button
                          className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 group-hover:text-indigo-600 transition-colors"
                          onClick={() =>
                            window.open(
                              `https://maps.google.com/?q=${emp.lat},${emp.lng}`,
                              "_blank"
                            )
                          }
                        >
                          <MapPin size={12} /> {emp.location}
                        </button>
                      </div>
                    </div>

                    <div className="min-w-[102px] flex flex-col items-end justify-center gap-1 text-right">
                      <p className="text-sm font-bold text-slate-700 leading-none">{emp.time}</p>
                      <span
                        className={`h-6 text-[10px] font-bold uppercase tracking-wider px-2 rounded inline-flex items-center justify-center whitespace-nowrap ${
                          badge.tone === "success"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : badge.tone === "warning"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : badge.tone === "danger"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Chưa có tín hiệu
            </h2>
            <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">
              {absent} người
            </span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {absentEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <UserCheck size={32} className="mb-2 opacity-50 text-emerald-500" />
                <p className="text-sm">Tuyệt vời! 100% nhân sự đã có mặt.</p>
              </div>
            ) : (
              absentEmployees.map((emp, index) => {
                const badge = getAbsentBadge(emp.leaveStatus);
                const isLeave = badge.tone === "leave";

                return (
                  <div
                    key={emp.id || index}
                    className={`flex justify-between items-center p-3.5 border rounded-xl transition-colors ${
                      isLeave
                        ? "border-blue-100 bg-blue-50/50 hover:bg-blue-50"
                        : badge.tone === "pending"
                        ? "border-amber-100 bg-amber-50/40 hover:bg-amber-50"
                        : "border-rose-100 bg-rose-50/30 hover:bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                          isLeave
                            ? "bg-blue-100 text-blue-700"
                            : badge.tone === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {emp.name?.charAt(0)}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                        <span
                          className={`text-[11px] font-medium mt-0.5 inline-block ${
                            isLeave
                              ? "text-blue-600"
                              : badge.tone === "pending"
                              ? "text-amber-600"
                              : "text-rose-500"
                          }`}
                        >
                          {badge.text}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative group">
                        <button className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Phone size={16} />
                        </button>
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap z-10">
                          {emp.phone || "Chưa cập nhật SĐT"}
                          <div className="absolute top-full right-3 w-2 h-2 bg-slate-800 transform rotate-45 -mt-1"></div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenComposeNotification(emp)}
                        title="Gửi nhắc nhở"
                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Bell size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {composeModalOpen && (
        <div className="fixed inset-0 z-[110] overflow-y-auto overflow-x-hidden bg-slate-900/40 backdrop-blur-md">
          <div className="min-h-[100dvh] flex justify-center items-start px-4 py-6 sm:px-6 sm:py-10">
            <div className="bg-white w-full max-w-[58rem] rounded-[28px] shadow-2xl border border-slate-100">
              <div className="px-6 sm:px-10 pt-8 pb-4 flex justify-between items-start gap-4 border-b border-slate-100/80">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 font-bold text-2xl">
                    📝
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                      Soạn thông báo
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                      Mẫu soạn giống trang Quản Lý Thông Báo, đã tự fill sẵn dữ liệu nhân viên.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComposeModalOpen(false)}
                  className="shrink-0 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 sm:px-10 pt-6 pb-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nhân viên nhận
                    </label>
                    <input
                      value={composeForm.employeeName || "Chưa xác định"}
                      disabled
                      className="w-full rounded-2xl px-6 py-4 border-2 border-transparent bg-slate-50 font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Phòng ban
                    </label>
                    <input
                      value={composeForm.departmentName || "Chưa phân bổ"}
                      disabled
                      className="w-full rounded-2xl px-6 py-4 border-2 border-transparent bg-slate-50 font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tiêu đề thông báo *
                  </label>
                  <input
                    className="w-full rounded-2xl px-6 py-4 border-2 border-transparent bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700"
                    value={composeForm.title}
                    onChange={(e) =>
                      setComposeForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Đối tượng nhận
                    </label>
                    <input
                      value="Cá nhân"
                      disabled
                      className="w-full rounded-2xl px-6 py-4 border-2 border-transparent bg-slate-50 font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Phân loại
                    </label>
                    <select
                      className="w-full rounded-2xl px-6 py-4 border-2 border-transparent bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700"
                      value={composeForm.type}
                      onChange={(e) =>
                        setComposeForm((prev) => ({ ...prev, type: e.target.value }))
                      }
                    >
                      <option value="Bình thường">Bình thường</option>
                      <option value="Cảnh báo">Cảnh báo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nội dung chi tiết *
                  </label>
                  <div className="rounded-[24px] overflow-hidden transition-all bg-[#FCFDFF] border-2 border-slate-50 focus-within:border-blue-100">
                    <div className="flex items-center gap-1 p-3 bg-white border-b border-slate-50 relative">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("bold")} className={`p-2.5 rounded-xl transition-all ${activeStyles.bold ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><Bold size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("italic")} className={`p-2.5 rounded-xl transition-all ${activeStyles.italic ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><Italic size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("underline")} className={`p-2.5 rounded-xl transition-all ${activeStyles.underline ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><Underline size={18} /></button>
                      <div className="w-px h-5 bg-slate-100 mx-2"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("justifyLeft")} className={`p-2.5 rounded-xl transition-all ${activeStyles.left ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}><AlignLeft size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("justifyCenter")} className={`p-2.5 rounded-xl transition-all ${activeStyles.center ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}><AlignCenter size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("justifyRight")} className={`p-2.5 rounded-xl transition-all ${activeStyles.right ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}><AlignRight size={18} /></button>
                      <div className="w-px h-5 bg-slate-100 mx-2"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("insertUnorderedList")} className={`p-2.5 rounded-xl transition-all ${activeStyles.bulletList ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><List size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd("insertOrderedList")} className={`p-2.5 rounded-xl transition-all ${activeStyles.orderedList ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><ListOrdered size={18} /></button>

                      <div className="relative z-[120]">
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowLinkInput((v) => !v); }} className={`p-2.5 rounded-xl transition-all ${showLinkInput ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"}`}><LinkIcon size={18} /></button>
                        {showLinkInput && (
                          <div className="absolute top-full left-0 mt-2 p-3 bg-white shadow-2xl rounded-2xl border border-slate-200 flex flex-wrap gap-2 z-[130] w-[min(18rem,calc(100vw-2rem))]">
                            <input
                              type="url"
                              className="min-w-0 flex-1 basis-[8rem] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
                              placeholder="https://..."
                              value={linkUrl}
                              onChange={(e) => setLinkUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  insertLink();
                                }
                              }}
                            />
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="shrink-0 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">
                              Chèn
                            </button>
                          </div>
                        )}
                      </div>

                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-500 rounded-xl transition-all"><ImageIcon size={18} /></button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => attachmentInputRef.current?.click()} className="p-2.5 text-slate-500 hover:bg-slate-50 hover:text-teal-600 rounded-xl transition-all"><Paperclip size={18} /></button>
                      <input type="file" ref={attachmentInputRef} className="hidden" onChange={handleAttachmentUpload} />
                    </div>

                    <div
                      ref={editorRef}
                      contentEditable
                      className="notification-editor-content p-6 sm:p-8 min-h-[220px] outline-none text-slate-600 text-sm sm:text-base font-medium leading-relaxed [&_a]:text-teal-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-7 [&_li]:my-0.5"
                      onMouseUp={saveSelection}
                      onKeyUp={saveSelection}
                      onBlur={saveSelection}
                      onInput={() =>
                        setComposeForm((prev) => ({
                          ...prev,
                          content: editorRef.current?.innerHTML || "",
                        }))
                      }
                    />
                  </div>
                </div>

                {composeError ? (
                  <p className="text-sm font-semibold text-red-600">{composeError}</p>
                ) : null}
              </div>

              <div className="px-6 sm:px-10 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/40 rounded-b-[28px]">
                <button
                  type="button"
                  onClick={() => setComposeModalOpen(false)}
                  className="px-8 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleSendReminderNotification}
                  disabled={sendingNotification}
                  className="px-10 py-3.5 bg-[#00B4D8] text-white rounded-2xl text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-[#0096B4] transition-all disabled:opacity-60"
                >
                  <Send size={18} className="shrink-0" /> {sendingNotification ? "ĐANG GỬI..." : "GỬI NGAY"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div
          className={`fixed right-5 bottom-5 z-[220] max-w-sm rounded-xl px-4 py-3 shadow-lg border text-sm font-semibold transition-all ${
            toast.kind === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

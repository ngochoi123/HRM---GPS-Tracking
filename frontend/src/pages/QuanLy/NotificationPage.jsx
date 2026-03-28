import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Eye, Edit, X, Search, ChevronLeft, ChevronRight, 
  Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, 
  Image as ImageIcon, Send, Save, AlignLeft, AlignCenter, AlignRight 
} from "lucide-react"; 
import axios from "axios";

// HỆ THỐNG ICON THÔNG MINH
import { 
  FaInfoCircle, FaExclamationTriangle, FaMoneyBillWave, FaUmbrellaBeach, FaCheckCircle
} from "react-icons/fa";
import NotificationDetailModal from "../../components/Notifications/NotificationDetailModal";

/** Giá trị legacy trong DB (.data cũ: 'Tất cả nhân viên') → đồng bộ với option form ('Toàn công ty'). */
function normalizeNotificationTargetForForm(t) {
  const v = String(t || "").trim();
  if (!v || v === "Tất cả nhân viên") return "Toàn công ty";
  return v;
}

function isCompanyWideTarget(t) {
  const s = String(t || "").trim();
  return s === "Toàn công ty" || s === "Tất cả nhân viên";
}

/** Giữ chỗ cố định cho dòng lỗi — tránh modal bị giãn/nhảy khi validate. */
function FieldErrorSlot({ message }) {
  return (
    <div className="mt-1.5 ml-1 min-h-[2.25rem]" aria-live="polite">
      {message ? <p className="text-sm text-red-600 font-medium leading-snug">{message}</p> : null}
    </div>
  );
}

export default function NotificationPage() {
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRange = useRef(null);
  /** Vùng cuộn của bảng — đổi trang thì kéo về đầu danh sách */
  const tableScrollRef = useRef(null); 

  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", kind: "success" });
  /** Lỗi validate form modal (tiêu đề, đối tượng, nội dung, phòng ban, nhân viên). */
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTarget, setFilterTarget] = useState("all");
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterEmployees, setFilterEmployees] = useState([]);
  const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; 

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // State quản lý trạng thái sáng đèn (Active) của các nút công cụ
  const [activeStyles, setActiveStyles] = useState({
    bold: false, italic: false, underline: false, 
    bulletList: false, orderedList: false,
    left: false, center: false, right: false
  });

  const [form, setForm] = useState({
    title: "",
    target: "Toàn công ty",
    type: "Bình thường",
    department_id: "",
    employee_id: "",
    content: "",
  });

  // --- HÀM KIỂM TRA TRẠNG THÁI ĐỊNH DẠNG TẠI CON TRỎ ---
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
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      savedRange.current = sel.getRangeAt(0);
    }
    updateToolbarStatus();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const execCmd = (cmd, val = null) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(cmd, false, val);
    updateToolbarStatus(); // Cập nhật ngay khi nhấn nút
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => execCmd("insertImage", event.target.result);
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  const insertLink = () => {
    if (linkUrl) {
      restoreSelection(); 
      const formattedUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      execCmd("createLink", formattedUrl);
      setLinkUrl("");
      setShowLinkInput(false);
      savedRange.current = null;
    }
  };

  const getSmartIcon = (title, type) => {
    const lowerTitle = title?.toLowerCase() || "";
    if (lowerTitle.includes('hè')) return { icon: <FaUmbrellaBeach size={18} />, bg: "bg-orange-100", textColor: "text-orange-500" };
    if (lowerTitle.includes('lương')) return { icon: <FaMoneyBillWave size={18} />, bg: "bg-green-100", textColor: "text-green-600" };
    if (type === 'warning') return { icon: <FaExclamationTriangle size={18} />, bg: "bg-red-100", textColor: "text-red-500" };
    return { icon: <FaInfoCircle size={18} />, bg: "bg-blue-100", textColor: "text-blue-500" };
  };

  const normalizeNotificationType = (t) => {
    if (!t) return "info";
    const v = String(t).toLowerCase();
    if (v.includes("cảnh") || v === "warning") return "warning";
    if (v.includes("bình") || v === "info" || v === "thông tin") return "info";
    if (v === "system") return "system";
    return t;
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/notifications");
      const formattedData = response.data.map(item => {
        const d = new Date(item.created_at); 
        const { icon, bg, textColor } = getSmartIcon(item.title, item.notification_type);
        return {
          ...item, icon, bg, textColor,
          date: d.toLocaleDateString('vi-VN'),
          time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: item.status || "Đã gửi"
        };
      });
      setData(formattedData);
    } catch (error) { console.error("Lỗi tải data:", error); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/departments/dropdown/departments");
        setDepartments(res.data || []);
      } catch (error) {
        console.error("Lỗi tải phòng ban:", error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (form.target !== "Cá nhân" || !form.department_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmployees([]);
      return;
    }
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/departments/${form.department_id}/employees`);
        setEmployees(res.data || []);
      } catch (error) {
        console.error("Lỗi tải nhân viên theo phòng ban:", error);
      }
    };
    fetchEmployees();
  }, [form.target, form.department_id]);

  useEffect(() => {
    if (filterTarget !== "Cá nhân" || !filterDeptId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterEmployees([]);
      return;
    }
    const load = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/departments/${filterDeptId}/employees`
        );
        setFilterEmployees(res.data || []);
      } catch (error) {
        console.error("Lỗi tải nhân viên (lọc):", error);
        setFilterEmployees([]);
      }
    };
    load();
  }, [filterTarget, filterDeptId]);

  useEffect(() => {
    if (open && editorRef.current) {
      editorRef.current.innerHTML = editItem ? editItem.content : "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateToolbarStatus();
    }
  }, [open, editItem]);

  const clearFormError = useCallback((key) => {
    setFormErrors((prev) => {
      if (prev[key] == null) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /** Text thuần từ editor (bỏ HTML) để kiểm tra có nội dung hay không. */
  const getEditorPlainText = () => {
    if (!editorRef.current) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = editorRef.current.innerHTML || "";
    return (tmp.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  };

  /** Ràng buộc: tiêu đề, đối tượng (kèm phòng ban/nhân viên khi cần), nội dung — áp dụng cả Lưu nháp và Gửi. */
  const validateNotificationForm = () => {
    const err = {};
    if (!String(form.title || "").trim()) {
      err.title = "Vui lòng nhập tiêu đề thông báo.";
    }
    if (!editorRef.current) {
      err.content = "Không tìm thấy vùng nhập nội dung.";
    } else if (!getEditorPlainText()) {
      err.content = "Vui lòng nhập nội dung chi tiết.";
    }
    if (form.target === "Phòng ban" || form.target === "Cá nhân") {
      if (!String(form.department_id || "").trim()) {
        err.department = "Vui lòng chọn phòng ban.";
      }
    }
    if (form.target === "Cá nhân" && !String(form.employee_id || "").trim()) {
      err.employee = "Vui lòng chọn nhân viên.";
    }
    return err;
  };

  const closeComposeModal = () => {
    setOpen(false);
    setFormErrors({});
  };

  const handleSaveNotification = async (isDraft = false) => {
    const err = validateNotificationForm();
    if (Object.keys(err).length > 0) {
      setFormErrors(err);
      return;
    }
    setFormErrors({});
    try {
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : {};
      const senderId = user.employee_id || user.id || null;

      const finalContent = editorRef.current.innerHTML;
      const autoDesc = (editorRef.current.textContent || '').substring(0, 60) + '...';
      const finalStatus = isDraft
        ? 'Nháp'
        : editItem
          ? (editItem.status === 'Nháp' ? 'Đã gửi' : 'Đã chỉnh sửa')
          : 'Đã gửi';

      const payload = {
        title: form.title,
        target: form.target,
        notification_type: normalizeNotificationType(form.type),
        department_id: form.department_id || null,
        employee_id: form.employee_id || null,
        content: finalContent,
        desc: autoDesc,
        status: finalStatus,
        sender_id: senderId
      };

      if (editItem) { await axios.put(`http://localhost:5000/api/notifications/${editItem.id}`, payload); }
      else { await axios.post("http://localhost:5000/api/notifications", payload); }

      setOpen(false);
      setFormErrors({});
      fetchNotifications();
      setToast({
        show: true,
        kind: "success",
        message: isDraft ? "Đã lưu bản nháp thành công!" : "Thông báo đã được gửi đi!",
      });
      setTimeout(() => setToast({ show: false, message: "", kind: "success" }), 3000);
      if (!isDraft) window.dispatchEvent(new Event("newNotificationCreated"));
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data?.error || error.message || "Lỗi khi lưu dữ liệu!";
      setToast({ show: true, kind: "error", message: `Lỗi khi lưu dữ liệu: ${message}` });
      setTimeout(() => setToast({ show: false, message: "", kind: "success" }), 5000);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.filter((item) => {
      if (q && !String(item.title || "").toLowerCase().includes(q)) return false;
      if (filterStatus !== "Tất cả trạng thái" && item.status !== filterStatus) return false;

      const ft = filterTarget;
      if (ft === "all" || ft === "Tất cả phòng ban") return true;
      if (ft === "Toàn công ty") return isCompanyWideTarget(item.target);

      if (ft === "Phòng ban") {
        if (String(item.target || "").trim() !== "Phòng ban") return false;
        if (!filterDeptId) return true;
        return Number(item.target_department_id) === Number(filterDeptId);
      }

      if (ft === "Cá nhân") {
        if (String(item.target || "").trim() !== "Cá nhân") return false;
        if (!filterDeptId) return true;
        if (Number(item.target_department_id) !== Number(filterDeptId)) return false;
        if (!filterEmployeeId) return true;
        return String(item.target_employee_id || "") === String(filterEmployeeId);
      }

      return true;
    });
  }, [
    data,
    searchTerm,
    filterTarget,
    filterDeptId,
    filterEmployeeId,
    filterStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage) || 1);
  const page = Math.min(currentPage, totalPages);
  const currentItems = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6 font-sans relative">
      <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col h-[calc(100vh-100px)] min-h-[750px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><span className="text-2xl">🔔</span></div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Quản Lý Thông báo</h1>
              <p className="text-sm text-gray-400 font-medium">Truyền thông nội bộ thời gian thực</p>
            </div>
          </div>
          <button onClick={() => { setFormErrors({}); setEditItem(null); setForm({ title: "", target: "Toàn công ty", type: "Bình thường", department_id: "", employee_id: "", content: "" }); setOpen(true); }} className="bg-[#14b8a6] hover:bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all flex items-center gap-2 active:scale-95">
            <span>➕</span> Tạo thông báo
          </button>
        </div>

        {/* TOOLBAR FILTER — mỗi select trong cột có nhãn, không bọc font-bold chung (tránh lỗi click/stacking) */}
        <div className="border border-gray-100 rounded-2xl bg-gray-50/50 flex flex-col gap-4 p-4 shrink-0 mb-4 font-sans">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input type="text" placeholder="Tìm kiếm nhanh..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-medium" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1 shrink-0 w-full min-[360px]:w-auto min-w-0 sm:min-w-[11rem]">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Đối tượng</span>
              <select
                autoComplete="off"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm cursor-pointer outline-none font-sans font-semibold text-gray-800"
                value={filterTarget}
                onChange={(e) => {
                  setFilterTarget(e.target.value);
                  setFilterDeptId("");
                  setFilterEmployeeId("");
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="Toàn công ty">Toàn công ty</option>
                <option value="Phòng ban">Phòng ban</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>
            {(filterTarget === "Phòng ban" || filterTarget === "Cá nhân") && (
              <div className="flex flex-col gap-1 shrink-0 w-full min-[360px]:w-auto min-w-0 sm:min-w-[12rem]">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Chọn phòng ban</span>
                <select
                  autoComplete="off"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm cursor-pointer outline-none font-sans font-medium text-gray-800"
                  value={filterDeptId}
                  onChange={(e) => {
                    setFilterDeptId(e.target.value);
                    setFilterEmployeeId("");
                    setCurrentPage(1);
                  }}
                >
                  <option value="">— Chọn phòng ban —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filterTarget === "Cá nhân" && filterDeptId && (
              <div className="flex flex-col gap-1 shrink-0 w-full min-[360px]:w-auto min-w-0 sm:min-w-[12rem]">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Chọn nhân viên</span>
                <select
                  autoComplete="off"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm cursor-pointer outline-none font-sans font-medium text-gray-800"
                  value={filterEmployeeId}
                  onChange={(e) => {
                    setFilterEmployeeId(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">— Chọn nhân viên —</option>
                  {filterEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1 shrink-0 w-full min-[360px]:w-auto min-w-0 sm:min-w-[10rem]">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Trạng thái</span>
              <select
                autoComplete="off"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm cursor-pointer outline-none font-sans font-medium text-gray-800"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                <option value="Đã gửi">Đã gửi</option>
                <option value="Đã chỉnh sửa">Đã chỉnh sửa</option>
                <option value="Nháp">Nháp</option>
              </select>
            </div>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU — min-h-0 + scrollbar-gutter + đủ số dòng/trang để không nhảy ngang khi đổi trang */}
        <div
          ref={tableScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border border-gray-100 rounded-2xl [scrollbar-gutter:stable]"
        >
          <table className="w-full text-sm text-left border-collapse table-fixed font-sans">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-[36%]">Thông báo</th>
                <th className="p-4 w-[18%]">Đối tượng</th>
                <th className="p-4 w-[14%]">Ngày tạo</th>
                <th className="p-4 w-[14%]">Trạng thái</th>
                <th className="p-4 w-[18%] text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors h-[75px]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${row.bg} ${row.textColor} shrink-0`}>{row.icon}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{row.title}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{row.desc}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 font-bold text-xs">{row.target}</td>
                  <td className="p-4 text-gray-500 font-bold text-xs">{row.date} <br/><span className="text-[10px] text-gray-300 uppercase">{row.time}</span></td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      row.status === "Đã gửi" ? "bg-green-100 text-green-700"
                        : row.status === "Đã chỉnh sửa" ? "bg-orange-100 text-orange-700"
                        : row.status === "Nháp" ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-500"
                    }`}>{row.status}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setViewItem(row)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><Eye size={18}/></button>
                      <button
                        onClick={() => {
                          setFormErrors({});
                          const mappedType = row.notification_type === 'warning' ? 'Cảnh báo' : 'Bình thường';
                          setEditItem(row);
                          setForm({
                            title: row.title,
                            target: normalizeNotificationTargetForForm(row.target),
                            type: mappedType,
                            department_id:
                              row.target_department_id != null
                                ? String(row.target_department_id)
                                : row.department_id || '',
                            employee_id:
                              row.target_employee_id || row.employee_id || '',
                            content: row.content
                          });
                          setOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-white rounded-xl shadow-sm transition-all"
                      >
                        <Edit size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, itemsPerPage - currentItems.length) }).map((_, i) => (
                <tr key={`row-pad-${page}-${i}`} className="h-[75px] pointer-events-none" aria-hidden="true">
                  <td colSpan={5} className="p-0 border-0 bg-transparent" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        <div className="mt-auto pt-6 flex items-center justify-between bg-white shrink-0 font-sans">
          <p className="text-xs text-gray-400 font-bold italic uppercase tracking-widest font-sans">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1 font-sans">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all font-sans"><ChevronLeft size={18}/></button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} type="button" onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? "bg-blue-500 text-white shadow-lg shadow-blue-100" : "border border-gray-100 text-gray-400 hover:bg-gray-50"}`}>{i + 1}</button>
            ))}
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all font-sans"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      {/* --- MODAL SOẠN THẢO HIỆN ĐẠI --- */}
      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300 font-sans">
          <div className="min-h-[100dvh] flex justify-center items-start px-4 py-6 sm:px-6 sm:py-10">
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white w-full max-w-[58rem] rounded-[28px] shadow-2xl border border-slate-100 font-sans"
            >
            <div className="px-6 sm:px-10 pt-8 pb-4 flex justify-between items-start gap-4 border-b border-slate-100/80">
               <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 font-bold text-2xl font-sans">📝</div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">{editItem ? "Hiệu chỉnh thông báo" : "Soạn thông báo mới"}</h2>
                    <p className="text-slate-400 text-sm font-medium mt-1 font-sans">Vui lòng điền đủ thông tin để rải thông báo nội bộ.</p>
                  </div>
               </div>
               <button type="button" onClick={closeComposeModal} className="shrink-0 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all font-sans"><X size={20}/></button>
            </div>

            <div className="px-6 sm:px-10 pt-6 pb-8 space-y-6">
              <div className="space-y-2 font-sans">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Tiêu đề thông báo *</label>
                <input
                  className={`w-full rounded-2xl px-6 py-4 outline-none transition-all font-bold text-slate-700 font-sans border-2 ${
                    formErrors.title ? "border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-300" : "border-transparent bg-slate-50 focus:ring-2 focus:ring-blue-400"
                  }`}
                  placeholder="Nhập tiêu đề thông báo..."
                  value={form.title}
                  onChange={(e) => {
                    clearFormError("title");
                    setForm({ ...form, title: e.target.value });
                  }}
                />
                <FieldErrorSlot message={formErrors.title} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 font-sans min-w-0">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Đối tượng nhận *</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none font-bold text-slate-600 cursor-pointer appearance-none font-sans focus:ring-2 focus:ring-blue-400"
                    value={form.target}
                    onChange={(e) => {
                      clearFormError("department");
                      clearFormError("employee");
                      setForm({ ...form, target: e.target.value, department_id: "", employee_id: "" });
                    }}
                  >
                    <option value="Toàn công ty">Toàn công ty</option>
                    <option value="Phòng ban">Phòng ban</option>
                    <option value="Cá nhân">Cá nhân</option>
                  </select>
                </div>
                <div className="space-y-2 font-sans min-w-0">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Phân loại *</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-slate-600 appearance-none cursor-pointer font-sans" value={form.type} onChange={(e)=>setForm({...form, type: e.target.value})}>
                    <option value="Bình thường">Bình thường</option>
                    <option>Cảnh báo</option>
                  </select>
                </div>
              </div>

              {form.target === "Phòng ban" && (
                <div className="space-y-2 font-sans w-full">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Phòng ban *</label>
                  <select
                    className={`w-full rounded-2xl px-6 py-4 outline-none font-bold text-slate-600 cursor-pointer appearance-none font-sans border-2 ${
                      formErrors.department ? "border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-300" : "border-transparent bg-slate-50 focus:ring-2 focus:ring-blue-400"
                    }`}
                    value={form.department_id}
                    onChange={(e) => {
                      clearFormError("department");
                      clearFormError("employee");
                      setForm({ ...form, department_id: e.target.value, employee_id: "" });
                    }}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                  <FieldErrorSlot message={formErrors.department} />
                </div>
              )}

              {form.target === "Cá nhân" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 font-sans min-w-0">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Phòng ban *</label>
                    <select
                      className={`w-full rounded-2xl px-6 py-4 outline-none font-bold text-slate-600 cursor-pointer appearance-none font-sans border-2 ${
                        formErrors.department ? "border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-300" : "border-transparent bg-slate-50 focus:ring-2 focus:ring-blue-400"
                      }`}
                      value={form.department_id}
                      onChange={(e) => {
                        clearFormError("department");
                        clearFormError("employee");
                        setForm({ ...form, department_id: e.target.value, employee_id: "" });
                      }}
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                      ))}
                    </select>
                    <FieldErrorSlot message={formErrors.department} />
                  </div>
                  <div className="space-y-2 font-sans min-w-0">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Nhân viên *</label>
                    <select
                      className={`w-full rounded-2xl px-6 py-4 outline-none font-bold text-slate-600 cursor-pointer appearance-none font-sans border-2 ${
                        formErrors.employee ? "border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-300" : "border-transparent bg-slate-50 focus:ring-2 focus:ring-blue-400"
                      }`}
                      value={form.employee_id}
                      onChange={(e) => {
                        clearFormError("employee");
                        setForm({ ...form, employee_id: e.target.value });
                      }}
                      disabled={!form.department_id}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                    <FieldErrorSlot message={formErrors.employee} />
                  </div>
                </div>
              )}

              <div className="space-y-2 relative font-sans">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 font-sans font-sans font-sans">Nội dung chi tiết *</label>
                <div
                  className={`rounded-[24px] overflow-hidden transition-all bg-[#FCFDFF] border-2 ${
                    formErrors.content ? "border-red-300 ring-2 ring-red-100" : "border-slate-50 focus-within:border-blue-100"
                  }`}
                >
                  {/* TOOLBAR VỚI HIỆU ỨNG TÔ ĐẬM (ACTIVE) */}
                  <div className="flex items-center gap-1 p-3 bg-white border-b border-slate-50 relative font-sans">
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('bold')} className={`p-2.5 rounded-xl transition-all ${activeStyles.bold ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-500'}`}><Bold size={18}/></button>
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('italic')} className={`p-2.5 rounded-xl transition-all ${activeStyles.italic ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-500'}`}><Italic size={18}/></button>
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('underline')} className={`p-2.5 rounded-xl transition-all ${activeStyles.underline ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-500'}`}><Underline size={18}/></button>
                    
                    <div className="w-px h-5 bg-slate-100 mx-2 font-sans font-sans"></div>
                    
                    {/* NÚT CĂN LỀ */}
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('justifyLeft')} className={`p-2.5 rounded-xl transition-all ${activeStyles.left ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><AlignLeft size={18}/></button>
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('justifyCenter')} className={`p-2.5 rounded-xl transition-all ${activeStyles.center ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><AlignCenter size={18}/></button>
                    <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>execCmd('justifyRight')} className={`p-2.5 rounded-xl transition-all ${activeStyles.right ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><AlignRight size={18}/></button>
                    
                    <div className="w-px h-5 bg-slate-100 mx-2 font-sans"></div>
                    
                    {/* CHỨC NĂNG LIST ĐƯỢC NÂNG CẤP */}
                    <button 
                      type="button" 
                      onMouseDown={(e)=>e.preventDefault()} 
                      onClick={()=>execCmd('insertUnorderedList')} 
                      title="Dấu chấm đầu dòng"
                      className={`p-2.5 rounded-xl transition-all ${activeStyles.bulletList ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-500'}`}
                    >
                      <List size={18}/>
                    </button>
                    <button 
                      type="button" 
                      onMouseDown={(e)=>e.preventDefault()} 
                      onClick={()=>execCmd('insertOrderedList')} 
                      title="Đánh số thứ tự"
                      className={`p-2.5 rounded-xl transition-all ${activeStyles.orderedList ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-500'}`}
                    >
                      <ListOrdered size={18}/>
                    </button>
                    
                    <div className="relative font-sans">
                      <button 
                        type="button" 
                        onClick={() => {
                          saveSelection(); 
                          setShowLinkInput(!showLinkInput);
                        }} 
                        className={`p-2 rounded-xl transition-all ${showLinkInput ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <LinkIcon size={18}/>
                      </button>
                      {showLinkInput && (
                        <div className="absolute top-full left-0 mt-3 p-4 bg-white shadow-2xl rounded-2xl border border-slate-100 flex gap-2 z-[110] animate-in slide-in-from-top-2 w-72 font-sans font-sans">
                          <input 
                            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none flex-1 font-bold font-sans" 
                            autoFocus 
                            placeholder="Dán link hoặc nhập URL..." 
                            value={linkUrl} 
                            onChange={(e)=>setLinkUrl(e.target.value)} 
                          />
                          <button onClick={insertLink} className="bg-blue-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase font-sans">Chèn</button>
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={()=>fileInputRef.current.click()} className="p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-500 rounded-xl transition-all font-sans"><ImageIcon size={18}/></button>
                    <input type="file" ref={fileInputRef} className="hidden font-sans" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  
                  <div 
                    ref={editorRef} 
                    contentEditable 
                    className="p-6 sm:p-8 min-h-[200px] outline-none text-slate-600 text-sm sm:text-base font-medium leading-relaxed font-sans" 
                    onMouseUp={saveSelection}
                    onKeyUp={saveSelection}
                    onBlur={saveSelection}
                    onInput={() => clearFormError("content")}
                  />
                </div>
                <FieldErrorSlot message={formErrors.content} />
              </div>
            </div>

            <div className="px-6 sm:px-10 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-slate-50/40 rounded-b-[28px] font-sans">
              <button type="button" onClick={()=>handleSaveNotification(true)} className="px-8 py-3.5 bg-slate-800 text-white rounded-2xl text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-slate-100 active:scale-[0.99] font-sans"><Save size={18} className="shrink-0"/> LƯU NHÁP</button>
              <button type="button" onClick={()=>handleSaveNotification(false)} className="px-10 py-3.5 bg-[#00B4D8] text-white rounded-2xl text-sm font-black inline-flex items-center justify-center gap-2 hover:bg-[#0096B4] transition-all shadow-lg shadow-blue-100 active:scale-[0.99] font-sans"><Send size={18} className="shrink-0"/> GỬI NGAY</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST: thành công (modal) / lỗi API (thanh dưới) */}
      {toast.show && toast.kind === "success" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/10 backdrop-blur-sm transition-all duration-500 font-sans font-sans">
          <div className="bg-white rounded-[40px] shadow-2xl p-12 flex flex-col items-center animate-in zoom-in-75 duration-300 border border-white min-w-[350px] font-sans">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner font-sans">
              <FaCheckCircle className="text-green-500 text-5xl animate-bounce font-sans" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter font-sans">Thành công!</h3>
            <p className="text-slate-400 font-bold text-center leading-tight font-sans font-sans">{toast.message}</p>
          </div>
        </div>
      )}
      {toast.show && toast.kind === "error" && (
        <div className="fixed bottom-6 left-1/2 z-[200] max-w-lg w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-xl shadow-red-100/50 animate-in slide-in-from-bottom-4 duration-300 font-sans">
          <p className="text-sm font-bold text-red-700 text-center leading-snug">{toast.message}</p>
        </div>
      )}

      <NotificationDetailModal isOpen={!!viewItem} onClose={()=>setViewItem(null)} notification={viewItem} />
    </div>
  );
}
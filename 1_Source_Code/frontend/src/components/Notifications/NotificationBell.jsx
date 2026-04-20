import React, { useState, useRef, useEffect, startTransition } from "react";
import { Bell, CheckCircle2, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import NotificationDetailModal from "./NotificationDetailModal";
import { notificationService } from "../../services/notificationService";
import {
  FaInfoCircle,
  FaExclamationTriangle,
  FaCogs,
  FaMoneyBillWave,
  FaUmbrellaBeach,
  FaSnowflake,
  FaBirthdayCake,
  FaGift,
  FaClock,
  FaPlane,
  FaHeartbeat,
  FaBullhorn
} from "react-icons/fa";
import { MdEventNote, MdGroups } from "react-icons/md";

async function fetchBellList(userId) {
  return notificationService.getMyBell(userId);
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef(null);
  const listScrollRef = useRef(null);
  const [selectedNoti, setSelectedNoti] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : {};
  const myUserId = user.employee_id || user.id;
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const isReadValue = (value) => {
    if (value === true || value === 1) return true;
    const normalized = String(value).toLowerCase();
    return normalized === "true" || normalized === "1";
  };

  useEffect(() => {
    if (!myUserId) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const list = await fetchBellList(myUserId);
        if (cancelled) return;
        startTransition(() => {
          setNotifications(Array.isArray(list) ? list : []);
        });
      } catch (error) {
        if (!cancelled) console.error("Lỗi khi lấy chuông thông báo:", error);
      }
    };

    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [myUserId]);

  useEffect(() => {
    if (!myUserId) return undefined;

    const onCreated = () => {
      void (async () => {
        try {
          const list = await fetchBellList(myUserId);
          startTransition(() => setNotifications(Array.isArray(list) ? list : []));
        } catch (error) {
          console.error("Lỗi khi lấy chuông thông báo:", error);
        }
      })();
    };

    window.addEventListener("newNotificationCreated", onCreated);
    return () => window.removeEventListener("newNotificationCreated", onCreated);
  }, [myUserId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = window.requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, isExpanded]);

  useEffect(() => {
    const handleOpenBell = () => {
      setIsOpen(true);
      setIsExpanded(true);
    };

    window.addEventListener("openNotificationBell", handleOpenBell);
    return () => window.removeEventListener("openNotificationBell", handleOpenBell);
  }, []);

  const markAllAsRead = async () => {
    try {
      setNotifications(safeNotifications.map((item) => ({ ...item, is_read: true })));
      await notificationService.markAllAsRead(myUserId);
    } catch (error) {
      console.error("Lỗi khi đánh dấu đọc tất cả:", error);
    }
  };

  const handleViewNotification = async (noti) => {
    const createdDate = new Date(noti.created_at);
    const timeStr = createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const dateStr = createdDate.toLocaleDateString("vi-VN");
    const { icon, bg, textColor } = getSmartIcon(noti.title, noti.notification_type);

    setSelectedNoti({
      ...noti,
      fullTime: `${timeStr}, ${dateStr}`,
      target: "Cá nhân",
      icon,
      bg,
      textColor
    });

    setIsOpen(false);
    setIsExpanded(false);

    if (!isReadValue(noti.is_read)) {
      try {
        setNotifications((prev) =>
          prev.map((item) => (item.id === noti.id ? { ...item, is_read: true } : item))
        );
        await notificationService.markAsRead(noti.id, myUserId);
      } catch (error) {
        console.error("Lỗi không cập nhật được trạng thái đã đọc:", error);
      }
    }
  };

  const getSmartIcon = (title, type) => {
    const lowerTitle = String(title || "").toLowerCase();

    if (
      lowerTitle.includes("từ chối") ||
      lowerTitle.includes("trả về") ||
      lowerTitle.includes("bổ sung")
    ) {
      return { icon: <FaExclamationTriangle size={16} />, bg: "bg-red-100", textColor: "text-red-500" };
    }

    if (lowerTitle.includes("hè") || lowerTitle.includes("biển") || lowerTitle.includes("du lịch")) return { icon: <FaUmbrellaBeach size={16} />, bg: "bg-orange-100", textColor: "text-orange-500" };
    if (lowerTitle.includes("đông") || lowerTitle.includes("lạnh")) return { icon: <FaSnowflake size={16} />, bg: "bg-cyan-100", textColor: "text-cyan-600" };
    if (lowerTitle.includes("lương") || lowerTitle.includes("thưởng") || lowerTitle.includes("tiền")) return { icon: <FaMoneyBillWave size={16} />, bg: "bg-green-100", textColor: "text-green-600" };
    if (lowerTitle.includes("sinh nhật") || lowerTitle.includes("kỷ niệm")) return { icon: <FaBirthdayCake size={16} />, bg: "bg-fuchsia-100", textColor: "text-fuchsia-600" };
    if (lowerTitle.includes("quà") || lowerTitle.includes("tặng")) return { icon: <FaGift size={16} />, bg: "bg-rose-100", textColor: "text-rose-600" };
    if (lowerTitle.includes("họp") || lowerTitle.includes("meeting") || lowerTitle.includes("giao ban")) return { icon: <MdGroups size={18} />, bg: "bg-indigo-100", textColor: "text-indigo-600" };
    if (lowerTitle.includes("nghỉ") || lowerTitle.includes("lễ") || lowerTitle.includes("phép")) return { icon: <MdEventNote size={16} />, bg: "bg-pink-100", textColor: "text-pink-600" };
    if (lowerTitle.includes("tăng ca") || lowerTitle.includes("giờ") || lowerTitle.includes("chấm công") || lowerTitle.includes("ca làm")) return { icon: <FaClock size={16} />, bg: "bg-purple-100", textColor: "text-purple-600" };
    if (lowerTitle.includes("công tác") || lowerTitle.includes("chuyến đi")) return { icon: <FaPlane size={16} />, bg: "bg-sky-100", textColor: "text-sky-600" };
    if (lowerTitle.includes("sức khỏe") || lowerTitle.includes("khám") || lowerTitle.includes("bảo hiểm")) return { icon: <FaHeartbeat size={16} />, bg: "bg-red-50", textColor: "text-red-400" };
    if (lowerTitle.includes("thông báo") || lowerTitle.includes("tin tức")) return { icon: <FaBullhorn size={16} />, bg: "bg-yellow-100", textColor: "text-yellow-600" };
    if (type === "warning") return { icon: <FaExclamationTriangle size={16} />, bg: "bg-red-100", textColor: "text-red-500" };
    if (type === "system") return { icon: <FaCogs size={16} />, bg: "bg-gray-200", textColor: "text-gray-600" };
    return { icon: <FaInfoCircle size={16} />, bg: "bg-blue-100", textColor: "text-blue-500" };
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    const text = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
    if (text.length <= 72) return text || "…";
    return `${text.slice(0, 72).trim()}…`;
  };

  const normalizeNotificationType = (t) => {
    if (!t) return "info";
    const v = String(t).toLowerCase();
    if (v.includes("cảnh") || v === "warning") return "warning";
    if (v.includes("bình") || v === "info" || v === "thông tin") return "info";
    if (v === "system") return "system";
    return t;
  };

  const unreadCount = safeNotifications.filter((item) => !isReadValue(item.is_read)).length;
  const previewLimit = 5;
  const hasMoreThanPreview = safeNotifications.length > previewLimit;

  const displayedNotifications =
    isExpanded || !hasMoreThanPreview ? safeNotifications : safeNotifications.slice(0, previewLimit);

  const hasAttachment = (content) => {
    return String(content || "").includes("📎") || String(content || "").includes("href=");
  };

  return (
    <div className="relative inline-block font-sans antialiased" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => {
          setIsOpen((value) => !value);
          if (isOpen) setIsExpanded(false);
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 ${
          isOpen
            ? "bg-teal-50 text-teal-600 shadow-inner"
            : "text-slate-500 hover:bg-slate-100 hover:text-teal-600"
        }`}
      >
        <Bell size={22} strokeWidth={2} className={unreadCount > 0 ? "text-teal-600" : undefined} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-3 w-[min(100vw-1.5rem,24rem)] sm:w-[26rem] origin-top-right text-[15px] leading-normal animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          role="menu"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-900/[0.04]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3.5">
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Thông báo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {notifications.length === 0
                    ? "Chưa có tin"
                    : unreadCount > 0
                      ? `${notifications.length} tin · ${unreadCount} chưa đọc`
                      : `${notifications.length} tin`}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/80 hover:text-teal-800"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    Đọc hết
                  </span>
                </button>
              )}
            </div>

            <div
              ref={listScrollRef}
              className={`overflow-y-auto overscroll-contain bg-slate-50/50 [scrollbar-gutter:stable] [scrollbar-width:thin] transition-[max-height] duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 ${
                isExpanded ? "max-h-[min(58vh,480px)]" : "max-h-[min(42vh,320px)]"
              }`}
            >
              {displayedNotifications.length > 0 ? (
                <ul className="flex flex-col gap-1.5 p-2.5">
                  {displayedNotifications.map((noti) => {
                    const createdDate = new Date(noti.created_at);
                    const timeStr = createdDate.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    const { icon, bg, textColor } = getSmartIcon(noti.title, noti.notification_type);
                    const isUnread = !isReadValue(noti.is_read);

                    return (
                      <li key={noti.id} className="list-none">
                        <button
                          type="button"
                          onClick={() => handleViewNotification(noti)}
                          className={`group relative flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 ${
                            isUnread
                              ? normalizeNotificationType(noti.notification_type) === "warning"
                                ? "border-red-200 bg-red-50 hover:bg-red-100 shadow-[0_4px_12px_rgba(239,68,68,0.15)]"
                                : "border-sky-200 bg-sky-50 hover:bg-sky-100 shadow-[0_4px_12px_rgba(56,189,248,0.15)]"
                              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-[0_1px_6px_rgba(15,23,42,0.04)]"
                          }`}
                        >
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${textColor}`}>
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden pr-1">
                            <div className="flex items-start gap-2">
                              <p
                                className={`min-w-0 flex-1 break-words line-clamp-2 text-[15px] leading-snug tracking-tight ${
                                  isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                                }`}
                              >
                                {noti.title}
                              </p>
                              {isUnread && (
                                <span
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 ring-2 ring-sky-200"
                                  title="Chưa đọc"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
                              {stripHtml(noti.content || noti.desc || "")}
                            </p>
                            <p className="mt-2 text-xs tabular-nums text-slate-400 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                {timeStr}
                                {hasAttachment(noti.content || noti.desc) && (
                                  <span className="flex items-center gap-1 text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded-md text-[10px]">
                                    <Paperclip size={10} strokeWidth={3} />
                                    Đính kèm
                                  </span>
                                )}
                              </span>
                              {noti.status === "Đã chỉnh sửa" && (
                                <span>
                                  {" "}
                                  <span className="text-slate-300">·</span>{" "}
                                  <span className="font-medium text-amber-700/90">Đã chỉnh sửa</span>
                                </span>
                              )}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-inner">
                    <Bell size={30} strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-bold text-slate-700">Chưa có thông báo</p>
                  <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-slate-500">
                    Khi có tin mới, bạn sẽ thấy tại đây.
                  </p>
                </div>
              )}
            </div>

            {notifications.length > 0 && hasMoreThanPreview && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/80 py-3.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50/90"
              >
                {isExpanded ? (
                  <>
                    Thu gọn <ChevronUp size={16} strokeWidth={2.25} />
                  </>
                ) : (
                  <>
                    Xem thêm <ChevronDown size={16} strokeWidth={2.25} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <NotificationDetailModal
        isOpen={!!selectedNoti}
        onClose={() => setSelectedNoti(null)}
        notification={selectedNoti}
        viewContext="bell"
        currentUserId={myUserId}
      />
    </div>
  );
}

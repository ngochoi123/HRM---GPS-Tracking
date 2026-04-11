import React, { useEffect, useState, startTransition } from "react";
import { X, Users, Calendar, Tag, FileText, Loader2, ChevronDown } from "lucide-react";
import { notificationService } from "../../services/notificationService";

function statusBadgeClass(status) {
  if (status === "Đã gửi") return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  if (status === "Nháp") return "bg-amber-50 text-amber-900 ring-amber-200/80";
  if (status === "Đã chỉnh sửa") return "bg-orange-50 text-orange-900 ring-orange-200/80";
  return "bg-slate-100 text-slate-700 ring-slate-200/80";
}

function typeLabel(type) {
  if (!type) return "Bình thường";
  const v = String(type).toLowerCase();
  if (v === "warning") return "Cảnh báo";
  if (v === "system") return "Hệ thống";
  if (v === "info") return "Bình thường";
  return String(type);
}

function isWarningNotificationType(type) {
  if (!type) return false;
  const v = String(type).toLowerCase();
  return v === "warning" || v.includes("cảnh");
}

export default function NotificationDetailModal({ isOpen, onClose, notification }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !notification?.id) return;
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setDetail(null);
    });
    notificationService
      .getNotificationDetail(notification.id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, notification?.id]);

  if (!isOpen || !notification) return null;

  const n = detail?.notification;
  const status = n?.status ?? notification.status ?? "—";
  const title = n?.title ?? notification.title;
  const desc = n?.desc ?? notification.desc;
  const contentHtml = n?.content ?? notification.content ?? "";
  const target = n?.target ?? notification.target ?? "—";
  const notifType = n?.notification_type ?? notification.notification_type;

  const createdRaw = n?.created_at ?? notification.created_at;
  const created = createdRaw ? new Date(createdRaw) : null;
  const dateStr = created
    ? created.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const timeStr = created
    ? created.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const sender = detail?.sender;
  const target_scope = detail?.target_scope;
  const recipients = detail?.recipients ?? [];
  const recipient_count = detail?.recipient_count ?? 0;
  const department_names = detail?.department_names ?? [];
  const recipients_truncated = detail?.recipients_truncated;

  const senderDisplay = sender?.full_name
    ? `${sender.full_name}${sender.employee_code ? ` · ${sender.employee_code}` : ""}`
    : "Không xác định";

  const deptSummary =
    department_names.length > 0 ? department_names.slice(0, 3).join(" · ") : null;
  const deptMore =
    department_names.length > 3 ? ` +${department_names.length - 3}` : "";

  const plannedEmp = target_scope?.employee;
  const plannedDept = target_scope?.department;

  let audienceDetail = null;
  if (target === "Cá nhân") {
    if (recipient_count === 1 && recipients[0]) {
      audienceDetail = `${recipients[0].full_name} (${recipients[0].employee_code})`;
    } else if (plannedEmp) {
      audienceDetail = `${plannedEmp.full_name} (${plannedEmp.employee_code})`;
    }
  } else if (target === "Phòng ban") {
    audienceDetail =
      plannedDept?.department_name ||
      (department_names.length > 0 ? department_names.join(" · ") : null);
  } else if (target === "Toàn công ty" || target === "Tất cả nhân viên") {
    audienceDetail = "Tất cả nhân viên đang làm việc (theo hệ thống)";
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/55 backdrop-blur-md font-sans overflow-y-auto overflow-x-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#f8fafc] w-full max-w-[96vw] sm:max-w-[72rem] max-h-[min(92vh,920px)] my-auto rounded-2xl shadow-[0_25px_80px_-12px_rgba(15,23,42,0.45)] border border-slate-200/90 flex flex-col min-h-0 min-w-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-doc-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Một vùng cuộn duy nhất — tránh lồng overflow khiến phải đưa chuột ra ngoài mới cuộn */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
          {/* Header dính trên khi cuộn */}
          <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-5 py-3.5 sm:px-7">
            <div className="flex min-w-0 items-center gap-2.5 text-slate-700">
              <FileText className="h-5 w-5 shrink-0 text-teal-600" strokeWidth={2} />
              <span className="truncate text-sm font-bold uppercase tracking-wider text-slate-500">
                Chi tiết thông báo
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Đóng"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>

          <div className="min-h-0 flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
              <Loader2 className="w-9 h-9 animate-spin text-teal-600" />
              <p className="text-sm font-medium">Đang tải…</p>
            </div>
          )}

          {!loading && !detail && (
            <div className="px-6 py-16 text-center text-slate-500 text-sm">
              Không tải được chi tiết. Vui lòng thử lại.
            </div>
          )}

          {!loading && detail && (
            <div className="flex flex-col min-h-full">
              {/* Dải meta — một hàng, nhỏ */}
              <div className="shrink-0 px-5 sm:px-8 pt-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-600">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wide ring-1 ${statusBadgeClass(
                    status
                  )}`}
                >
                  {status}
                </span>
                <span className="hidden sm:inline text-slate-200">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Tag
                    className={`w-3.5 h-3.5 shrink-0 ${isWarningNotificationType(notifType) ? "text-red-600" : "text-teal-600"}`}
                  />
                  <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">
                    Phân loại
                  </span>
                  <span
                    className={`font-bold ${isWarningNotificationType(notifType) ? "text-red-600" : "text-slate-800"}`}
                  >
                    {typeLabel(notifType)}
                  </span>
                </span>
                <span className="hidden sm:inline text-slate-200">|</span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-medium text-slate-700">{dateStr}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono tabular-nums text-slate-600">{timeStr}</span>
                </span>
              </div>

              {/* Tiêu đề — trọng tâm */}
              <div className="shrink-0 px-5 sm:px-8 pb-4">
                <h2
                  id="notif-doc-title"
                  className="text-2xl sm:text-3xl md:text-[2rem] font-extrabold text-slate-900 leading-[1.2] tracking-tight break-words max-w-full"
                >
                  {title}
                </h2>
              </div>

              {/* Thông tin gửi/nhận — gọn, một khối */}
              <div className="shrink-0 mx-5 sm:mx-8 mb-4 rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 text-xs sm:text-sm text-slate-600 shadow-sm">
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-baseline">
                  <span>
                    <span className="text-slate-400 font-medium">Người gửi:</span>{" "}
                    <strong className="text-slate-800 font-semibold">{senderDisplay}</strong>
                    {sender?.work_email && (
                      <span className="text-slate-400 font-normal hidden sm:inline">
                        {" "}
                        · {sender.work_email}
                      </span>
                    )}
                  </span>
                  <span className="text-slate-200 hidden sm:inline" aria-hidden>
                    |
                  </span>
                  <span>
                    <span className="text-slate-400 font-medium">Gửi đến:</span>{" "}
                    <strong className="text-slate-800 font-semibold">{target}</strong>
                    {recipient_count > 0 && (
                      <span className="text-slate-500">
                        {" "}
                        · <strong className="text-slate-700">{recipient_count}</strong> nhân viên
                      </span>
                    )}
                  </span>
                </div>
                {audienceDetail && (
                  <p className="mt-2.5 text-slate-800">
                    <span className="text-slate-400 font-medium">Chi tiết phạm vi nhận:</span>{" "}
                    <strong className="font-semibold text-teal-900">{audienceDetail}</strong>
                  </p>
                )}
                {deptSummary && target !== "Phòng ban" && (
                  <p className="mt-2 text-slate-500">
                    <span className="text-slate-400 font-medium">Phòng ban (theo danh sách đã gửi):</span>{" "}
                    <span className="text-slate-700">
                      {deptSummary}
                      {deptMore}
                    </span>
                  </p>
                )}
                {recipient_count === 0 &&
                  status === "Nháp" &&
                  !audienceDetail && (
                  <p className="mt-2 text-slate-500 text-xs leading-relaxed">
                    Bản nháp — chưa phát hành. Dùng <strong className="text-slate-600">Gửi ngay</strong>{" "}
                    để gửi tới phạm vi đã chọn trên form.
                  </p>
                )}
                {recipient_count > 0 && target !== "Cá nhân" && (
                  <details className="mt-2 group border-t border-slate-100 pt-2">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-teal-700 font-semibold hover:text-teal-800 select-none [&::-webkit-details-marker]:hidden">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>Danh sách người nhận</span>
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      {recipients_truncated && (
                        <span className="text-slate-400 font-normal text-[11px]">
                          · tối đa {recipients.length} dòng
                        </span>
                      )}
                    </summary>
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/90 text-xs divide-y divide-slate-100">
                      {recipients.map((r, idx) => (
                        <div
                          key={`${r.employee_code}-${idx}`}
                          className="px-3 py-1.5 flex flex-wrap justify-between gap-1"
                        >
                          <span className="font-medium text-slate-800">{r.full_name}</span>
                          <span className="text-slate-500 font-mono">
                            {r.employee_code}
                            {r.department_name ? ` · ${r.department_name}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Nội dung — chỉ giãn theo nội dung; dài thì cuộn trong khung có trần */}
              <div className="shrink-0 px-5 sm:px-8 pb-8">
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
                  <div className="shrink-0 px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100/90">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Nội dung
                    </span>
                  </div>
                  <div
                    className="px-5 sm:px-6 py-5 text-slate-800 leading-[1.75] text-base sm:text-lg
                      overflow-x-hidden break-words max-w-full
                      [&_a]:text-teal-600 [&_a]:underline [&_a]:break-all [&_a]:break-words
                      [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-sm
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
                      [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3"
                    dangerouslySetInnerHTML={{ __html: contentHtml || desc || "" }}
                  />
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

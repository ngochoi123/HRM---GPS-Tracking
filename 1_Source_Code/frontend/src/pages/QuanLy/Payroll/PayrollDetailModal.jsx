import React, { useState, useEffect, useLayoutEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import { payrollService } from '../../../services/payrollService';

// Hàm format số nguyên
const fmt = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

/** Công / tổng công: 2 chữ số thập phân (tránh lỗi hiển thị float). */
const fmtPayrollDec2 = (val) => {
  if (val == null || val === '') return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  return (Math.round(n * 100) / 100).toFixed(2);
};

/** Khớp system_config DEFAULT_WORK_HOURS trong DB — đủ/ngày để hiển thị "Đủ công" vs "Thiếu giờ". */
const STANDARD_DAY_HOURS = 8;

const parseHoursNum = (val) => {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const hasTimeValue = (v) => {
  if (v == null) return false;
  const s = String(v).trim();
  return s !== '' && s !== '-';
};

/** Chuẩn hoá HH:mm (backend/API có thể trả "8:30"). */
const toTimeInputValue = (v) => {
  if (v == null || v === '' || v === '-') return '';
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
};

/** So sánh hai chuỗi HH:mm cùng ngày (phút từ nửa đêm). */
const compareHmSameDay = (a, b) => {
  const pa = toTimeInputValue(a);
  const pb = toTimeInputValue(b);
  if (!pa || !pb) return 0;
  const [ha, ma] = pa.split(':').map(Number);
  const [hb, mb] = pb.split(':').map(Number);
  return ha * 60 + ma - (hb * 60 + mb);
};

const HM2 = (n) => String(n).padStart(2, '0');
const HOURS_24_OPTIONS = Array.from({ length: 24 }, (_, i) => HM2(i));
const MINUTES_60_OPTIONS = Array.from({ length: 60 }, (_, i) => HM2(i));

const timePickerBtnClass =
  'min-h-[2.75rem] rounded-xl py-2 text-sm font-semibold tabular-nums transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

const POPOVER_Z = 12000;
const POPOVER_HEADER_FOOTER_PX = 132;

const easePayroll = [0.22, 1, 0.36, 1];

/**
 * Ô "14 : 25"; icon mở panel. Portal + fixed tránh bị modal cắt; 2 cột Giờ | Phút cuộn độc lập.
 */
const TimePicker24 = ({ value, onChange, onClearError }) => {
  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draftH, setDraftH] = useState('');
  const [draftM, setDraftM] = useState('');
  const [popoverStyle, setPopoverStyle] = useState({
    top: 0,
    left: 0,
    width: 360,
    maxBodyH: 280,
  });

  const t = toTimeInputValue(value);
  const displayH = t ? t.slice(0, 2) : null;
  const displayM = t ? t.slice(3, 5) : null;

  const openPanel = () => {
    const cur = toTimeInputValue(value);
    setDraftH(cur ? cur.slice(0, 2) : '');
    setDraftM(cur ? cur.slice(3, 5) : '');
    setOpen((o) => !o);
    onClearError?.();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const run = () => {
      const anchor = wrapRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 10;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const width = Math.min(400, Math.max(280, vw - margin * 2));
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, vw - width - margin));

      const headerFooterReserve = POPOVER_HEADER_FOOTER_PX;
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const preferBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
      let top = preferBelow ? rect.bottom + margin : rect.top - margin;
      let maxBodyH = preferBelow
        ? Math.max(180, spaceBelow - headerFooterReserve)
        : Math.max(180, spaceAbove - headerFooterReserve);

      if (preferBelow && top + headerFooterReserve + maxBodyH > vh - margin) {
        maxBodyH = Math.max(160, vh - margin - top - headerFooterReserve);
      }
      if (!preferBelow) {
        const popoverEst = headerFooterReserve + maxBodyH;
        top = rect.top - popoverEst;
        if (top < margin) {
          top = margin;
          maxBodyH = Math.max(160, rect.top - margin - headerFooterReserve - margin);
        }
      }

      setPopoverStyle({
        top,
        left,
        width,
        maxBodyH: Math.min(maxBodyH, Math.floor(vh * 0.55)),
      });
    };
    run();
    window.addEventListener('resize', run);
    window.addEventListener('scroll', run, true);
    return () => {
      window.removeEventListener('resize', run);
      window.removeEventListener('scroll', run, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      const node = e.target;
      if (wrapRef.current?.contains(node)) return;
      if (popoverRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tmr = requestAnimationFrame(() => {
      popoverRef.current?.querySelector('button:not([disabled])')?.focus();
    });
    return () => cancelAnimationFrame(tmr);
  }, [open]);

  const pickHour = (hh) => {
    const keepM = draftM || toTimeInputValue(value)?.slice(3, 5) || '';
    setDraftH(hh);
    if (keepM) {
      setDraftM(keepM);
      onChange(`${hh}:${keepM}`);
    } else {
      setDraftM('');
    }
    onClearError?.();
  };

  const pickMinute = (mm) => {
    if (!draftH) return;
    onChange(`${draftH}:${mm}`);
    onClearError?.();
    setOpen(false);
  };

  const clearTime = () => {
    onChange('');
    setDraftH('');
    setDraftM('');
    onClearError?.();
    setOpen(false);
  };

  const popover = open ? (
    <Motion.div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed flex max-h-[min(92vh,calc(100vh-1.25rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06]"
      style={{
        top: popoverStyle.top,
        left: popoverStyle.left,
        width: popoverStyle.width,
        zIndex: POPOVER_Z,
      }}
      initial={{ opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easePayroll }}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
        <p
          id={titleId}
          className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"
        >
          Chọn giờ (24h)
        </p>
        <p className="mt-1 text-center text-xl font-bold tabular-nums tracking-tight text-slate-900">
          {draftH || '—'}
          <span className="mx-2 font-semibold text-slate-400">:</span>
          {draftM || '—'}
        </p>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 sm:flex-row sm:gap-0 sm:divide-x sm:divide-slate-100"
        style={{ maxHeight: popoverStyle.maxBodyH }}
      >
        <section className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden px-1 sm:px-3">
          <h3 className="mb-2 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Giờ
          </h3>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
            <div className="grid grid-cols-4 gap-1.5">
              {HOURS_24_OPTIONS.map((x) => {
                const sel = draftH === x;
                return (
                  <button
                    key={x}
                    type="button"
                    onClick={() => pickHour(x)}
                    className={`${timePickerBtnClass} ${
                      sel
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200'
                    }`}
                  >
                    {x}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden px-1 sm:px-3">
          <h3 className="mb-2 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Phút
          </h3>
          <div
            className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch] ${!draftH ? 'pointer-events-none opacity-40' : ''}`}
            aria-disabled={!draftH}
          >
            <div className="grid grid-cols-5 gap-1.5">
            {MINUTES_60_OPTIONS.map((x) => {
              const disabled = !draftH;
              const sel = Boolean(draftH) && draftM === x;
              return (
                <button
                  key={x}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickMinute(x)}
                  className={`${timePickerBtnClass} ${
                    disabled
                      ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                      : sel
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200'
                  }`}
                >
                  {x}
                </button>
              );
            })}
            </div>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <button
          type="button"
          onClick={clearTime}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 underline-offset-2 hover:text-red-600 hover:underline"
        >
          Xóa giờ
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Đóng
        </button>
      </div>
    </Motion.div>
  ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex min-h-[3.75rem] w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <div
          className="flex min-w-0 flex-1 items-center text-left tabular-nums"
          aria-live="polite"
        >
          <span className="text-[1.35rem] font-bold leading-none tracking-tight text-gray-900 sm:text-2xl">
            {displayH ?? '—'}
          </span>
          <span className="select-none px-2 text-[1.15rem] font-medium text-slate-400 sm:px-2.5 sm:text-xl">
            :
          </span>
          <span className="text-[1.35rem] font-bold leading-none tracking-tight text-gray-900 sm:text-2xl">
            {displayM ?? '—'}
          </span>
        </div>

        <button
          type="button"
          onClick={openPanel}
          aria-label="Mở chọn giờ theo định dạng 24 giờ"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? titleId : undefined}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50/80 text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 ${open ? 'border-blue-400 bg-blue-50 text-blue-600 ring-2 ring-blue-200/60' : ''}`}
        >
          <Clock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
    </div>
  );
};

const getTodayYmdVN = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) return null;
  return `${y}-${m}-${d}`;
};

/** payrollMonthYear: YYYY-MM từ input tháng lương */
const rowYmdFromPayroll = (dayPad, payrollMonthYear) => {
  if (!payrollMonthYear || !dayPad) return null;
  const [y, m] = payrollMonthYear.split('-');
  if (!y || !m) return null;
  const d = String(dayPad).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Giao diện giống mock: chữ trạng thái màu (xanh đủ / vàng thiếu giờ / đỏ vắng / xám tương lai).
 * Check-in nhưng chưa checkout: Đang làm (hôm nay) hoặc Chưa checkout (ngày đã qua).
 */
const resolveAttendanceRowUi = (row, payrollMonthYear) => {
  if (row.status === 'future') {
    return {
      label: 'Chưa tới ngày',
      statusClass: 'text-gray-400 font-semibold',
      rowClass: 'bg-white',
      muted: true,
    };
  }
  if (row.status === 'absent') {
    return {
      label: 'Vắng',
      statusClass: 'text-[#ef4444] font-bold',
      rowClass: 'bg-white',
      muted: false,
    };
  }

  const hrs = parseHoursNum(row.hours);
  const hasAnyPunch = hasTimeValue(row.checkIn) || hasTimeValue(row.checkOut);

  if (hasTimeValue(row.checkIn) && !hasTimeValue(row.checkOut)) {
    const rowYmd = rowYmdFromPayroll(row.day, payrollMonthYear);
    const todayYmd = getTodayYmdVN();
    if (rowYmd && todayYmd) {
      if (rowYmd < todayYmd) {
        return {
          label: 'Chưa checkout',
          statusClass: 'text-sky-700 font-bold',
          rowClass: 'bg-white',
          muted: false,
        };
      }
      if (rowYmd === todayYmd) {
        return {
          label: 'Đang làm',
          statusClass: 'text-[#2563eb] font-bold',
          rowClass: 'bg-white',
          muted: false,
        };
      }
    }
    return {
      label: 'Đang làm',
      statusClass: 'text-[#2563eb] font-bold',
      rowClass: 'bg-white',
      muted: false,
    };
  }

  if (hrs !== null && hrs >= STANDARD_DAY_HOURS - 0.001) {
    return {
      label: 'Đủ công',
      statusClass: 'text-[#10b981] font-bold',
      rowClass: 'bg-white',
      muted: false,
    };
  }

  if (hasAnyPunch || hrs !== null || row.status) {
    return {
      label: 'Thiếu giờ',
      statusClass: 'text-[#ca8a04] font-bold',
      rowClass: 'bg-white',
      muted: false,
    };
  }

  return {
    label: '—',
    statusClass: 'text-gray-500 font-medium',
    rowClass: 'bg-white',
    muted: false,
  };
};

const PayrollDetailModal = ({ data, payrollMonthYear, onClose, onAttendanceSaved }) => {
  const [editingDay, setEditingDay] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!editingDay) return;
    setEditCheckIn(toTimeInputValue(editingDay.checkIn));
    setEditCheckOut(toTimeInputValue(editingDay.checkOut));
    setFormError('');
  }, [editingDay]);

  if (!data) return null;

  const attendanceDetail = Array.isArray(data.attendance_detail) ? data.attendance_detail : [];

  const handleSaveEdit = async () => {
    if (!data.employee_id) {
      toast.error('Thiếu mã định danh nhân viên — không thể lưu.');
      return;
    }
    if (!editingDay?.attendance_date) {
      toast.error('Thiếu ngày công.');
      return;
    }
    if (!editCheckIn && !editCheckOut) {
      toast.error('Nhập ít nhất check-in hoặc check-out.');
      return;
    }
    if (editCheckOut && !editCheckIn) {
      toast.error('Cần có giờ check-in khi nhập check-out.');
      return;
    }

    if (editCheckIn && editCheckOut && compareHmSameDay(editCheckOut, editCheckIn) <= 0) {
      const msg = 'Giờ ra phải sau giờ vào trong cùng một ngày.';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormError('');

    setSaving(true);
    try {
      const payload = {
        employeeId: data.employee_id,
        attendanceDate: editingDay.attendance_date,
        checkIn: editCheckIn || null,
        checkOut: editCheckOut || null,
      };
      if (editingDay.attendance_id != null && editingDay.attendance_id !== '') {
        payload.attendanceId = editingDay.attendance_id;
      }
      const res = await payrollService.correctAttendance(payload);
      if (res?.success) {
        toast.success('Đã lưu giờ chấm công.', { id: 'payroll-attendance-saved' });
        setEditingDay(null);
        if (typeof onAttendanceSaved === 'function') await onAttendanceSaved();
      } else {
        toast.error(res?.error || 'Lưu thất bại.');
      }
    } catch (err) {
      const raw = err?.response?.data;
      const msg =
        (typeof raw === 'object' && raw != null && (raw.error || raw.message)) ||
        (typeof raw === 'string' && raw) ||
        err?.message ||
        'Lưu thất bại.';
      setFormError(String(msg));
      toast.error(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Motion.div
      className="fixed inset-0 z-[9999]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: easePayroll }}
    >
      {/* FIX ZOOM 1: cuộn nội dung, nền full màn hình */}
      <div className="font-sans h-full overflow-y-auto bg-[#f4f6f8] custom-scrollbar text-gray-900 antialiased">
        {/* Container căn giữa */}
        <div className="min-h-screen p-4 md:p-6 lg:p-8 flex justify-center items-start">
          {/* FIX ZOOM 2: w-full max-w-[1400px] overflow-hidden ép khung không bung quá màn hình */}
          <Motion.div
            className="bg-white w-full max-w-[1400px] rounded-2xl shadow-lg border border-gray-100 p-5 md:p-8 flex flex-col gap-8 md:gap-10 overflow-hidden relative"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: easePayroll, delay: 0.02 }}
          >
            
            {/* HEADER */}
            <div className="flex justify-between items-center pb-2 md:pb-4">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                Chi tiết tính lương
              </h1>
              <button 
                onClick={onClose} 
                className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-sm whitespace-nowrap"
              >
                Quay Lại
              </button>
            </div>

            {/* 1. THÔNG TIN NHÂN VIÊN */}
            <section className="w-full">
              <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">Thông tin nhân viên</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <InfoCard label="MÃ NHÂN VIÊN" value={data.employee_code} />
                <InfoCard label="TÊN" value={data.full_name} />
                <InfoCard label="PHÒNG BAN" value={data.department_name} />
                <InfoCard label="CHỨC VỤ" value={data.position_name || 'Nhân Viên'} />
              </div>
            </section>

            {/* 2. CHI TIẾT LƯƠNG */}
            <section className="w-full max-w-full">
              <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">Chi tiết lương</h2>
              
              {/* FIX ZOOM 3: w-full overflow-x-auto giúp cuộn ngang mượt mà khi màn hình hẹp/zoom to */}
              <div className="w-full overflow-x-auto border border-gray-100 rounded-lg custom-scrollbar">
                <table className="w-full min-w-max text-center text-sm whitespace-nowrap font-sans">
                  <thead className="bg-[#f8f9fa] text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-4 px-4 font-semibold text-[13px]">Thu nhập tháng</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Số ngày công</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Tăng ca</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Kỷ luật</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Thưởng</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">BHXH DN</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">BHXH NLĐ</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Thu nhập sau BH</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Doanh Nghiệp Đóng Thuế</th>
                      <th className="py-4 px-4 font-semibold text-[13px]">Chi phí tiền lương</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    <tr>
                      <td className="py-5 px-4 tabular-nums">{fmt(data.actual_salary)}</td>
                      <td className="py-5 px-4 tabular-nums">{fmtPayrollDec2(data.total_work_days)}</td>
                      <td className="py-5 px-4 tabular-nums">{data.overtime > 0 ? fmt(data.overtime) : '0'}</td>
                      <td className="py-5 px-4 tabular-nums">{data.discipline > 0 ? fmt(data.discipline) : '0'}</td>
                      <td className="py-5 px-4 bg-gray-50/50 font-bold tabular-nums">{fmt(data.reward)}</td>
                      <td className="py-5 px-4 tabular-nums">{fmt(data.compInsurance?.total)}</td>
                      <td className="py-5 px-4 tabular-nums">{fmt(data.empInsurance?.total)}</td>
                      <td className="py-5 px-4 tabular-nums font-semibold">{fmt(data.income_after_insurance)}</td>
                      <td className="py-5 px-4 tabular-nums">{fmt(data.compInsurance?.total)}</td>
                      <td className="py-5 px-4 tabular-nums font-semibold">{fmt(data.company_cost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. CHI TIẾT NGÀY CÔNG */}
            <section className="pb-8 w-full max-w-full">
              <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">Chi tiết ngày công</h2>
              
              {/* FIX ZOOM 4: Giống bảng lương, bọc cuộn ngang và khóa min-w-max */}
              <div className="w-full overflow-x-auto border border-gray-100 rounded-lg custom-scrollbar">
                <table className="w-full min-w-[860px] text-center text-sm whitespace-nowrap font-sans">
                  <thead className="bg-[#f8f9fa] text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-5 text-left font-semibold text-[13px] tracking-tight">Ngày</th>
                      <th className="py-3.5 px-5 font-semibold text-[13px] tracking-tight">Check In</th>
                      <th className="py-3.5 px-5 font-semibold text-[13px] tracking-tight">Check Out</th>
                      <th className="py-3.5 px-5 font-semibold text-[13px] tracking-tight">Số giờ</th>
                      <th className="py-3.5 px-4 font-semibold text-[13px] tracking-tight">Công</th>
                      <th className="py-3.5 px-4 font-semibold text-[13px] tracking-tight">Tăng Ca</th>
                      <th className="py-3.5 px-4 text-left font-semibold text-[13px] tracking-tight">Trạng thái</th>
                      <th className="py-3.5 px-5 text-right font-semibold text-[13px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {attendanceDetail.map((row, idx) => {
                      const ui = resolveAttendanceRowUi(row, payrollMonthYear);
                      const muted = ui.muted ? 'text-gray-400' : 'text-gray-900';
                      const timeCell =
                        'min-w-[5.75rem] py-4 px-5 text-[15px] font-semibold tabular-nums tracking-normal';
                      const numCell =
                        'py-4 px-4 text-[15px] font-semibold tabular-nums text-gray-900';

                      return (
                      <tr
                        key={idx}
                        className={`${ui.rowClass} hover:bg-gray-50/80 transition-colors`}
                      >
                        <td className={`py-4 px-5 text-left text-[13px] font-bold tabular-nums ${muted}`}>
                          {row.day}
                        </td>
                        <td className={`${timeCell} ${ui.muted ? 'text-gray-400' : 'text-gray-900'}`}>
                          {row.checkIn || '-'}
                        </td>
                        <td className={`${timeCell} ${ui.muted ? 'text-gray-400' : 'text-gray-900'}`}>
                          {row.checkOut || '-'}
                        </td>
                        <td className={`${numCell} ${ui.muted ? '!text-gray-400' : ''}`}>
                          {row.hours != null && row.hours !== '' ? row.hours : '-'}
                        </td>
                        <td className={`${numCell} ${ui.muted ? '!text-gray-400' : ''}`}>
                          {typeof row.cong === 'number' ? fmtPayrollDec2(row.cong) : '-'}
                        </td>

                        <td className={`py-4 px-4 ${ui.muted ? 'text-gray-400' : 'text-gray-900'}`}>
                          {row.ot != null && row.ot !== '' && Number(row.ot) > 0 ? (
                            <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                              <span className="text-[15px] font-semibold tabular-nums text-gray-900">
                                {row.ot}
                              </span>
                              <button
                                type="button"
                                className="text-[11px] font-medium text-[#3b82f6] hover:text-blue-700 hover:underline cursor-pointer bg-transparent border-0 p-0"
                              >
                                Xem đơn
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="py-4 px-4 text-left text-sm">
                          <span className={ui.statusClass}>{ui.label}</span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            disabled={row.status === 'future'}
                            onClick={() => setEditingDay(row)}
                            title={
                              row.status === 'future'
                                ? 'Chưa tới ngày — không chỉnh sửa'
                                : 'Chỉnh sửa giờ chấm công'
                            }
                            className={`text-white text-xs font-semibold py-2 px-4 rounded-md shadow-sm transition-colors active:scale-[0.98] ${
                              row.status === 'future'
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#f59e0b] hover:bg-[#d97706]'
                            }`}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                    {attendanceDetail.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 font-medium">
                          Chưa có dữ liệu chấm công.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </Motion.div>
        </div>
      </div>

      {/* POPUP CHỈNH SỬA NGÀY CÔNG (Nằm đè lên trên cùng, z-[10000]) */}
      <AnimatePresence>
        {editingDay && (
          <Motion.div
            key={`payroll-edit-${editingDay.attendance_date}-${editingDay.day}`}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/60 backdrop-blur-sm p-4 font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: easePayroll }}
          >
            <Motion.div
              className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] w-full max-w-[460px] overflow-visible p-8 md:p-10 border border-gray-100"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.34, ease: easePayroll }}
            >
            
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2 tracking-tight">
              Chỉnh sửa ngày công
            </h3>
            <p className="text-center text-sm text-gray-500 mb-8 tabular-nums">
              Ngày {editingDay.day}/{String(payrollMonthYear || '').split('-')[1] || '—'}/
              {String(payrollMonthYear || '').split('-')[0] || '—'}
            </p>

            <div className="space-y-9 overflow-visible">
              <div className="overflow-visible">
                <label className="mb-3 block text-[15px] font-medium text-slate-600">Check In</label>
                <TimePicker24
                  value={editCheckIn}
                  onChange={setEditCheckIn}
                  onClearError={() => setFormError('')}
                />
              </div>

              <div className="overflow-visible">
                <label className="mb-3 block text-[15px] font-medium text-slate-600">Check Out</label>
                <TimePicker24
                  value={editCheckOut}
                  onChange={setEditCheckOut}
                  onClearError={() => setFormError('')}
                />
              </div>
            </div>

            {formError ? (
              <p className="mt-4 text-sm text-red-600 font-medium leading-snug" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 mt-10">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEdit}
                className="bg-[#22c55e] hover:bg-green-600 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-bold text-[15px] transition-all active:scale-95 shadow-sm"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditingDay(null)}
                className="bg-[#ef4444] hover:bg-red-600 text-white px-8 py-3 rounded-xl font-bold text-[15px] transition-all active:scale-95 shadow-sm"
              >
                Hủy
              </button>
            </div>
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

// Component Thẻ thông tin
const InfoCard = ({ label, value }) => (
  <div className="bg-[#fcfbf2] border border-[#f5f0db] rounded-xl py-4 md:py-5 px-4 flex flex-col items-center justify-center w-full shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
    <span className="text-[10px] md:text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">{label}</span>
    <span className="text-sm md:text-base font-bold text-gray-900 text-center break-words w-full leading-snug">{value}</span>
  </div>
);

export default PayrollDetailModal;
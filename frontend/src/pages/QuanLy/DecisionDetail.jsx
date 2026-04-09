import React, { useEffect, useState, useCallback } from 'react';
import { managerDecisionService } from '../../services/managerDecisionService';
import {
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileText,
  Bell,
  Paperclip,
  Trophy,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

// File attachment có thể trả về relative path, base sẽ lấy từ VITE_API_URL (bỏ /api)
const FILE_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

function getInitials(name) {
  if (!name) return 'NV';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDateVi(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoneyVi(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('vi-VN').format(num);
}

function formLabel(decisionType, form) {
  const reward = {
    money: 'Thưởng tiền mặt',
    gift: 'Tặng hiện vật / Quà',
    certificate: 'Tặng Bằng khen',
  };
  const discipline = {
    money: 'Phạt tiền mặt',
    warning: 'Cảnh cáo',
    fire: 'Sa thải',
  };
  const map = decisionType === 'reward' ? reward : discipline;
  return map[form] || form;
}

function parseAttachments(attachmentUrl) {
  if (!attachmentUrl || !String(attachmentUrl).trim()) return [];
  return String(attachmentUrl)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => {
      const name = decodeURIComponent(url.split('/').pop() || 'tai-lieu');
      const lower = name.toLowerCase();
      let kind = 'other';
      if (/\.pdf$/i.test(lower)) kind = 'pdf';
      else if (/\.(doc|docx)$/i.test(lower)) kind = 'word';
      else if (/\.(png|jpe?g|gif|webp)$/i.test(lower)) kind = 'image';
      return { url, name, kind };
    });
}

function FileRow({ item }) {
  const href = item.url.startsWith('http') ? item.url : `${FILE_ORIGIN}${item.url}`;
  const meta =
    item.kind === 'pdf'
      ? { Icon: FileText, box: 'bg-red-50 text-red-600', line: 'PDF' }
      : item.kind === 'word'
        ? { Icon: FileText, box: 'bg-blue-50 text-blue-600', line: 'Word' }
        : item.kind === 'image'
          ? { Icon: ImageIcon, box: 'bg-emerald-50 text-emerald-600', line: 'Ảnh' }
          : { Icon: FileText, box: 'bg-slate-100 text-slate-600', line: 'Tệp' };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${meta.box}`}>
        <meta.Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-800">{item.name}</p>
        <p className="text-xs text-slate-500">{meta.line}</p>
      </div>
      <a
        href={href}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-1.5">
          <Download size={16} />
          Tải xuống
        </span>
      </a>
    </div>
  );
}

export default function DecisionDetail({ decisionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!decisionId) return;
    setLoading(true);
    try {
      const res = await managerDecisionService.getDecisionById(decisionId);
      if (res?.success) setDetail(res.data);
    } catch (e) {
      console.error(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const attachments = detail ? parseAttachments(detail.attachment_url) : [];
  const isReward = detail?.decision_type === 'reward';
  const amountNum = detail ? Number(detail.amount) || 0 : 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Không tải được chi tiết quyết định.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-700"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Chi tiết Khen thưởng / Kỷ luật</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>
      </div>

      {/* Nhân viên + Số QĐ + Badge */}
      <div className="mb-8 grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
            {getInitials(detail.employee_name)}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Người lao động</p>
            <p className="text-lg font-bold text-slate-900">{detail.employee_name}</p>
            <p className="text-sm text-slate-500">{detail.department_name || 'Chưa xếp phòng'}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center border-t border-slate-100 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Số Quyết định</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{detail.decision_number}</p>
        </div>
        <div className="flex flex-col justify-center border-t border-slate-100 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Phân loại quyết định</p>
          <div className="mt-2">
            {isReward ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                <Trophy size={16} />
                Khen thưởng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-bold text-rose-700">
                Kỷ luật
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chi tiết thực thi */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white">
            <FileText size={14} />
          </span>
          Chi tiết thực thi
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Hình thức</p>
            <p className="mt-1 font-bold text-slate-900">{formLabel(detail.decision_type, detail.form)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {isReward ? 'Số tiền thưởng (VNĐ)' : 'Số tiền (VNĐ)'}
            </p>
            <p className="mt-1 font-bold">
              {amountNum > 0 ? (
                <span className={isReward ? 'text-emerald-600' : 'text-rose-600'}>
                  {isReward ? '+ ' : '- '}
                  {formatMoneyVi(amountNum)} VNĐ
                </span>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Ngày hiệu lực</p>
            <p className="mt-1 font-bold text-slate-900">{formatDateVi(detail.issue_date)}</p>
          </div>
        </div>
      </div>

      {/* Lý do */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-slate-500">Lý do chi tiết</p>
        <div className="rounded-xl bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-800">
          {detail.reason}
        </div>
      </div>

      {/* Tài liệu đính kèm */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-400 text-white">
            <Paperclip size={14} />
          </span>
          Tài liệu đính kèm ({attachments.length} file)
        </h2>
        {attachments.length ? (
          <div className="flex flex-col gap-3">
            {attachments.map((item) => (
              <FileRow key={item.url} item={item} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            Không có tài liệu đính kèm.
          </p>
        )}
      </div>

      {/* Cấu hình thông báo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white">
            <Bell size={14} />
          </span>
          Cấu hình thông báo
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5">
            <span className="text-sm font-semibold text-slate-800">Gửi thông báo Push đến nhân viên</span>
            {detail.notify_push_sent ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Đã bật</span>
            ) : (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Đã tắt</span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5">
            <span className="text-sm font-semibold text-slate-800">Gửi Email kèm file Quyết định (PDF)</span>
            {detail.notify_email_sent ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Đã bật</span>
            ) : (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Đã tắt</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

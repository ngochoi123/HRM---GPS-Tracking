import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import {
  BadgeCheck,
  Banknote,
  CalendarRange,
  CheckCheck,
  CheckSquare,
  Eye,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  UserRound,
  X
} from 'lucide-react';
import { directorApprovalService } from '../../services/directorApprovalService';
import './Approvals.css';

const initialFilters = {
  tab: 'payroll',
  q: '',
  departmentId: '',
  requestType: 'all'
};

const currencyFormatter = {
  format: (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' VNĐ'
};

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const FILE_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const shortName = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeAttachmentPath = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return text.replace(/^\/+/, '').replace(/^uploads\/+/i, '');
};

const buildAttachmentUrl = (attachment = '') => {
  const normalized = normalizeAttachmentPath(attachment);
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return FILE_ORIGIN ? `${FILE_ORIGIN}/uploads/${normalized}` : `/uploads/${normalized}`;
};

const normalizeApprovalItem = (item = {}) => {
  const normalized = {
    ...item,
    employeeName: pickFirst(item.employeeName, item.employee_name),
    employeeCode: pickFirst(item.employeeCode, item.employee_code),
    departmentName: pickFirst(item.departmentName, item.department_name),
    positionName: pickFirst(item.positionName, item.position_name),
    timeLabel: pickFirst(item.timeLabel, item.month_year, item.range_label, item.meta_label),
    createdAt: pickFirst(item.createdAt, item.created_at),
    amount: Number(pickFirst(item.amount, item.net_salary, 0)),
    allowance: Number(pickFirst(item.allowance, item.totalAllowance, item.total_allowance, 0)),
    deduction: Number(pickFirst(item.deduction, item.totalDeduction, item.total_deduction, 0)),
    baseSalarySnapshot: Number(pickFirst(item.baseSalarySnapshot, item.base_salary_snapshot, 0)),
    attachment: pickFirst(item.attachment, item.attachment_url, item.detail?.attachment),
    detail: item.detail || {}
  };

  if (!normalized.detail.baseSalarySnapshot && normalized.baseSalarySnapshot) {
    normalized.detail.baseSalarySnapshot = normalized.baseSalarySnapshot;
  }
  if (normalized.detail.totalWorkDays == null) {
    normalized.detail.totalWorkDays = Number(
      pickFirst(item.totalWorkDays, item.total_work_days, normalized.detail.totalWorkDays, 0)
    );
  }
  if (normalized.detail.totalAllowance == null) {
    normalized.detail.totalAllowance = normalized.allowance;
  }
  if (normalized.detail.totalDeduction == null) {
    normalized.detail.totalDeduction = normalized.deduction;
  }
  if (normalized.detail.netSalary == null) {
    normalized.detail.netSalary = normalized.amount;
  }
  if (normalized.detail.incomeAfterInsurance == null) {
    normalized.detail.incomeAfterInsurance = normalized.amount;
  }
  if (!normalized.detail.attachment && normalized.attachment) {
    normalized.detail.attachment = normalized.attachment;
  }

  return normalized;
};

const requestTypeLabel = (item) => {
  if (item?.type === 'payroll') return 'Bảng lương';
  if (item?.type === 'overtime') return 'Đơn tăng ca';
  if (item?.type === 'explanation') return item?.explanationTypeLabel || 'Đơn giải trình';
  return item?.leaveTypeLabel || 'Đơn phép';
};

const getRequestMetaLabel = (item) => {
  if (item?.type === 'payroll') return 'Thông tin lương';
  if (item?.type === 'overtime') return 'Ca tăng ca';
  if (item?.type === 'explanation') return 'Ngày giải trình';
  return 'Thời gian nghỉ';
};

const getRequestMetaSub = (item) => {
  if (item?.type === 'payroll') return currencyFormatter.format(item.amount);
  if (item?.type === 'overtime') return item.durationLabel || 'Không có thông tin thời lượng';
  if (item?.type === 'explanation') {
    return `${item.checkInLabel || '--:--'} - ${item.checkOutLabel || '--:--'}`;
  }
  return `${item.durationDays} ngày`;
};

const getRequestSummaryTitle = (item) => {
  if (item?.type === 'overtime') return 'Ca tăng ca';
  if (item?.type === 'explanation') return 'Thông tin giải trình';
  if (item?.type === 'leave') return 'Thời gian nghỉ';
  return 'Thông tin lương';
};

const getReasonPreview = (text, wordLimit = 10, charLimit = 60) => {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return 'Không có lý do';

  const words = normalizedText.split(/\s+/);
  if (words.length === 1) {
    return normalizedText.length > charLimit
      ? `${normalizedText.slice(0, charLimit).trim()}...`
      : normalizedText;
  }

  if (words.length <= wordLimit) {
    const previewText = normalizedText.length > charLimit
      ? normalizedText.slice(0, charLimit).trim()
      : normalizedText;
    return previewText !== normalizedText ? `${previewText}...` : previewText;
  }

  const previewByWords = words.slice(0, wordLimit).join(' ');
  const previewText = previewByWords.length > charLimit
    ? previewByWords.slice(0, charLimit).trim()
    : previewByWords;

  return `${previewText}...`;
};

const splitViDateTimeLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) return { date: '', time: '' };

  // Support both "21/04/2026, 07:00" and "07:00 21/4/26" formats
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const timeMatch = text.match(/(\d{1,2}:\d{2})/);

  return {
    date: dateMatch?.[1] || '',
    time: timeMatch?.[1] || ''
  };
};

const getTableTimeMain = (item) => {
  if (item?.type === 'overtime') return item.otDateLabel || item.timeLabel;
  if (item?.type === 'explanation') return item.attendanceDateLabel || item.timeLabel;
  if (item?.type === 'leave') {
    const start = splitViDateTimeLabel(item.startDateLabel || '');
    const end = splitViDateTimeLabel(item.endDateLabel || '');
    if (start.date && end.date) return start.date === end.date ? start.date : `${start.date} - ${end.date}`;
    return item.timeLabel;
  }
  return item.timeLabel;
};

const getTableTimeSub = (item) => {
  if (item?.type === 'leave') {
    const start = splitViDateTimeLabel(item.startDateLabel || '');
    const end = splitViDateTimeLabel(item.endDateLabel || '');
    const hasAnyTime = Boolean(start.time || end.time);
    const timeRange = hasAnyTime ? `${start.time || '--:--'}-${end.time || '--:--'}` : '';
    return (
      <>
        {timeRange ? <span className="time-sub-line">{timeRange}</span> : null}
        <span className="time-sub-line">Tổng cộng: {item.durationDays} ngày</span>
      </>
    );
  }

  if (item?.type === 'overtime') {
    const timeRange = item.timeRangeLabel || 'Không có thông tin';
    return (
      <>
        <span className="time-sub-line">Tổng cộng: {item.durationLabel || 'Không có thông tin'}</span>
        <span className="time-sub-line">{timeRange}</span>
      </>
    );
  }

  if (item?.type === 'explanation') {
    return item.timeRangeLabel || 'Không có thông tin';
  }

  return item.createdAt
    ? `Tạo lúc: ${dateTimeFormatter.format(new Date(item.createdAt))}`
    : 'Chưa có thời gian tạo';
};

const getPayrollPreviewMetrics = (item) => {
  const detail = item?.detail || {};
  const baseSalarySnapshot = Number(detail.baseSalarySnapshot ?? item?.baseSalarySnapshot ?? 0);
  const reward = Number(detail.reward ?? item?.reward ?? 0);
  const discipline = Number(detail.discipline ?? item?.discipline ?? 0);
  const overtime = Number(detail.overtime ?? item?.overtime ?? 0);
  const companyInsurance = detail.companyInsurance || item?.companyInsurance || {
    bhxh: baseSalarySnapshot * 0.175,
    bhyt: baseSalarySnapshot * 0.03,
    bhtn: baseSalarySnapshot * 0.01,
    total: baseSalarySnapshot * 0.215
  };
  const employeeInsurance = detail.employeeInsurance || item?.employeeInsurance || {
    bhxh: baseSalarySnapshot * 0.08,
    bhyt: baseSalarySnapshot * 0.015,
    bhtn: baseSalarySnapshot * 0.01,
    total: baseSalarySnapshot * 0.105
  };

  return {
    baseSalarySnapshot,
    totalWorkDays: Number(detail.totalWorkDays ?? 0),
    overtime,
    reward,
    discipline,
    companyInsurance: {
      bhxh: Number(companyInsurance.bhxh || 0),
      bhyt: Number(companyInsurance.bhyt || 0),
      bhtn: Number(companyInsurance.bhtn || 0),
      total: Number(companyInsurance.total || 0)
    },
    employeeInsurance: {
      bhxh: Number(employeeInsurance.bhxh || 0),
      bhyt: Number(employeeInsurance.bhyt || 0),
      bhtn: Number(employeeInsurance.bhtn || 0),
      total: Number(employeeInsurance.total || 0)
    },
    allowance: Number(item?.allowance ?? detail.totalAllowance ?? 0),
    deduction: Number(item?.deduction ?? detail.totalDeduction ?? 0),
    incomeAfterInsurance: Number(
      detail.incomeAfterInsurance ?? item?.incomeAfterInsurance ?? item?.amount ?? 0
    ),
    companyCost: Number(
      detail.companyCost ??
        item?.companyCost ??
        (baseSalarySnapshot + Number(companyInsurance.total || 0) + reward - discipline)
    ),
    finalNetSalary: Number(item?.amount ?? detail.netSalary ?? 0)
  };
};

export default function ApprovalsDirector() {
  const location = useLocation();
  const [filters, setFilters] = useState(initialFilters);
  const [meta, setMeta] = useState({
    stats: { payrollPendingCount: 0, leavePendingCount: 0 },
    options: { departments: [], requestTypes: [] }
  });
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const dashboardNavRef = useRef({ applied: false, focusId: null });
  const latestFetchRef = useRef(0);

  const activeTab = filters.tab;
  const isLeaveTab = activeTab === 'leave';

  const fetchApprovals = async (nextFilters = filters) => {
    const fetchId = Date.now() + Math.random();
    latestFetchRef.current = fetchId;
    setLoading(true);
    try {
      const response = await directorApprovalService.getOverview({
        tab: nextFilters.tab,
        q: nextFilters.q,
        departmentId: nextFilters.departmentId || undefined,
        requestType: nextFilters.requestType
      });

      if (latestFetchRef.current !== fetchId) return;
      const payload = response?.success ? response : response?.data ?? response;
      if (payload?.success) {
        const nextItems = (payload?.data?.items || payload?.data?.payroll || []).map(normalizeApprovalItem);
        setItems(nextItems);
        setMeta({
          stats: payload?.data?.stats || meta.stats,
          options: payload?.data?.options || meta.options
        });
        setSelectedIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)));
      }
    } catch (error) {
      if (latestFetchRef.current === fetchId) {
        console.error('fetchApprovals error:', error);
        toast.error('Không tải được danh sách phê duyệt');
      }
    } finally {
      if (latestFetchRef.current === fetchId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchApprovals(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.tab, filters.departmentId, filters.requestType]);

  useEffect(() => {
    const state = location?.state || null;
    if (!state?.fromDashboard || dashboardNavRef.current.applied) return;

    const nextTab = state.tab === 'payroll' ? 'payroll' : 'leave';
    const nextRequestType =
      state.requestType === 'leave' || state.requestType === 'overtime' || state.requestType === 'explanation'
        ? state.requestType
        : 'all';

    const nextFilters = {
      ...filters,
      tab: nextTab,
      requestType: nextRequestType,
      q: ''
    };

    dashboardNavRef.current.applied = true;
    dashboardNavRef.current.focusId = state.focusId || null;

    // Tránh render "data cũ" (payroll) khi điều hướng từ Dashboard
    setPreviewItem(null);
    setSelectedIds([]);
    setItems([]);
    setLoading(true);

    setFilters((prev) => ({
      ...prev,
      tab: nextTab,
      requestType: nextRequestType,
      q: ''
    }));

    // Fetch ngay với filter mới (tránh lệch do effect + stale data)
    fetchApprovals(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  useEffect(() => {
    // Chỉ debounce khi đang gõ tìm kiếm.
    // Tránh case mount ban đầu (q = '') tạo 1 request cũ (tab payroll) chạy trễ và đè lên list "Đơn phép".
    if (!String(filters.q || '').trim()) return;
    const timer = setTimeout(() => {
      fetchApprovals(filters);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  useEffect(() => {
    const focusId = dashboardNavRef.current.focusId;
    if (!focusId || loading) return;
    const found = items.find((it) => String(it.id) === String(focusId));
    if (found) {
      setPreviewItem(found);
      dashboardNavRef.current.focusId = null;
    }
  }, [items, loading]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const allChecked = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    setSelectedIds(allChecked ? [] : items.map((item) => item.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleAction = async (type, id, action) => {
    setSubmitting(true);
    try {
      const response = await directorApprovalService.updateStatus(type, id, action);
      const payload = response?.success ? response : response?.data ?? response;
      if (payload?.success) {
        toast.success(payload.message || 'Cập nhật thành công');
        setPreviewItem(null);
        setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
        fetchApprovals(filters);
      }
    } catch (error) {
      console.error('handleAction error:', error);
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedItems.length) {
      toast.error('Chưa chọn mục nào để duyệt');
      return;
    }

    setSubmitting(true);
    try {
      const response = await directorApprovalService.bulkApprove(
        selectedItems.map((item) => ({ id: item.id, type: item.type }))
      );
      const payload = response?.success ? response : response?.data ?? response;
      if (payload?.success) {
        toast.success(payload.message || 'Đã duyệt hàng loạt');
        setSelectedIds([]);
        fetchApprovals(filters);
      }
    } catch (error) {
      console.error('handleBulkApprove error:', error);
      toast.error(error?.response?.data?.message || 'Không thể duyệt hàng loạt');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const payrollMetrics =
    previewItem?.type === 'payroll' ? getPayrollPreviewMetrics(previewItem) : null;

  return (
    <div className="director-approvals-page">
      <section className="director-approvals-shell">
        <header className="director-approvals-header">
          <div>
            <h1 className="director-approvals-title">
              <span className="director-approvals-title-icon">
                <BadgeCheck size={20} />
              </span>
              Trung tâm Phê duyệt (Cấp Giám đốc)
            </h1>
            <p className="director-approvals-subtitle">
              Đưa ra quyết định cuối cùng cho bảng lương và các đơn phép, tăng ca vượt cấp.
            </p>
          </div>

          <button
            type="button"
            className="director-approvals-bulk-btn"
            onClick={handleBulkApprove}
            disabled={submitting || !selectedItems.length}
          >
            {submitting ? <LoaderCircle size={18} className="spin" /> : <CheckCheck size={18} />}
            Duyệt hàng loạt đã chọn
          </button>
        </header>

        <div className="director-approvals-tabs">
          <button
            type="button"
            className={`director-approvals-tab ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => updateFilter('tab', 'payroll')}
          >
            <FileSpreadsheet size={16} />
            Bảng lương chờ duyệt
            <span
              className={`tab-badge ${Number(meta.stats.payrollPendingCount || 0) > 0 ? 'danger' : 'neutral'}`}
            >
              {meta.stats.payrollPendingCount}
            </span>
          </button>

          <button
            type="button"
            className={`director-approvals-tab ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => updateFilter('tab', 'leave')}
          >
            <CalendarRange size={16} />
            Đơn từ
            <span
              className={`tab-badge ${Number(meta.stats.leavePendingCount || 0) > 0 ? 'danger' : 'neutral'}`}
            >
              {meta.stats.leavePendingCount}
            </span>
          </button>
        </div>

        <div className="director-approvals-filters">
          <label className="filter-input search">
            <Search size={18} />
            <input
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder={
                isLeaveTab
                  ? 'Tìm theo mã đơn, tên nhân viên, nội dung lý do...'
                  : 'Tìm theo kỳ lương, mã nhân viên, tên nhân viên...'
              }
            />
          </label>

          <label className="filter-input select">
            <select
              value={filters.departmentId}
              onChange={(event) => updateFilter('departmentId', event.target.value)}
            >
              <option value="">Tất cả phòng ban</option>
              {meta.options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.department_name}
                </option>
              ))}
            </select>
          </label>

          <label className={`filter-input select ${isLeaveTab ? '' : 'disabled'}`}>
            <select
              value={filters.requestType}
              onChange={(event) => updateFilter('requestType', event.target.value)}
              disabled={!isLeaveTab}
            >
              {(meta.options.requestTypes || []).map((requestType) => (
                <option key={requestType.value} value={requestType.value}>
                  {requestType.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="director-approvals-table-wrap">
          {loading ? (
            <div className="director-approvals-empty loading">
              <LoaderCircle size={18} className="spin" />
              Đang tải dữ liệu phê duyệt...
            </div>
          ) : items.length === 0 ? (
            <div className="director-approvals-empty">
              Không có yêu cầu nào cần xử lý theo bộ lọc hiện tại.
            </div>
          ) : (
            <>
              <table className="director-approvals-table">
                <thead>
                  <tr>
                    <th className="checkbox-col">
                      <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} />
                    </th>
                    <th>Thông tin đơn</th>
                    <th>Người làm đơn</th>
                    <th>{isLeaveTab ? 'Thời gian / ca làm' : 'Kỳ lương'}</th>
                    <th>{isLeaveTab ? 'Loại yêu cầu' : 'Tổng thực nhận'}</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                        />
                      </td>

                      <td>
                        <div className="approval-code">{item.code}</div>
                        <div className={`approval-pill ${item.type}`}>
                          {requestTypeLabel(item)}
                        </div>
                      </td>

                      <td>
                        <div className="employee-cell">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.employeeName} className="employee-avatar" />
                          ) : (
                            <div className="employee-avatar fallback">{shortName(item.employeeName)}</div>
                          )}
                          <div>
                            <div className="employee-name">{item.employeeName}</div>
                            <div className="employee-meta">
                              {item.departmentName}
                              {item.positionName ? ` • ${item.positionName}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="time-main">{getTableTimeMain(item)}</div>
                        <div className="time-sub">{getTableTimeSub(item)}</div>
                      </td>

                      <td>
                        {item.type !== 'payroll' ? (
                          <>
                            <div className={`approval-pill ${item.type}`}>{requestTypeLabel(item)}</div>
                            <div className="reason-sub">{getReasonPreview(item.subtitle)}</div>
                          </>
                        ) : (
                          <>
                            <div className="salary-main">{currencyFormatter.format(item.amount)}</div>
                            <div className="salary-sub">
                              Phụ cấp {currencyFormatter.format(item.allowance)} • Khấu trừ{' '}
                              {currencyFormatter.format(item.deduction)}
                            </div>
                          </>
                        )}
                      </td>

                      <td>
                        <div className="action-row">
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => setPreviewItem(item)}
                            aria-label="Xem nhanh"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            className="reject-btn"
                            onClick={() => handleAction(item.type, item.id, 'reject')}
                            disabled={submitting}
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            className="approve-btn"
                            onClick={() => handleAction(item.type, item.id, 'approve')}
                            disabled={submitting}
                          >
                            Duyệt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="director-approvals-footer">
                Đang hiển thị <strong>{items.length}</strong> yêu cầu cần xử lý
              </div>
            </>
          )}
        </div>
      </section>

      {previewItem && (
        <div className="approval-preview-overlay" onClick={() => setPreviewItem(null)}>
          <div
            className="approval-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="preview-close-btn"
              onClick={() => setPreviewItem(null)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            <div className="preview-badge-row">
              <span className={`approval-pill ${previewItem.type}`}>
                {requestTypeLabel(previewItem)}
              </span>
              <span className="preview-code">{previewItem.code}</span>
            </div>
            <div className="approval-preview-content">
              <h3 className="preview-title">{previewItem.employeeName}</h3>
              <p className="preview-subtitle">
                {previewItem.departmentName}
                {previewItem.positionName ? ` • ${previewItem.positionName}` : ''}
              </p>

              <div className={`preview-grid ${previewItem.type === 'overtime' ? 'single' : ''}`}>
                <div className="preview-card">
                  <div className="preview-card-label">
                    <UserRound size={16} />
                    Người gửi
                  </div>
                  <div className="preview-card-value">{previewItem.employeeName}</div>
                  <div className="preview-card-sub">
                    {previewItem.employeeCode || 'Không có mã nhân viên'}
                  </div>
                </div>

                {previewItem.type !== 'overtime' && (
                  <div className="preview-card">
                    <div className="preview-card-label">
                      {previewItem.type === 'payroll' ? <Banknote size={16} /> : <CalendarRange size={16} />}
                      {getRequestMetaLabel(previewItem)}
                    </div>
                    <div className="preview-card-value">{previewItem.timeLabel}</div>
                    <div className="preview-card-sub">{getRequestMetaSub(previewItem)}</div>
                  </div>
                )}
              </div>

              <div className="preview-section">
                <h4>Chi tiết</h4>
                {previewItem.type === 'payroll' && payrollMetrics ? (
                  <div className="preview-payroll-layout">
                    <div className="preview-summary-grid">
                      <div className="preview-summary-card">
                        <span>Lương cơ bản chốt</span>
                        <strong>{currencyFormatter.format(payrollMetrics.baseSalarySnapshot)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Số ngày công</span>
                        <strong>{payrollMetrics.totalWorkDays.toFixed(2)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Tăng ca</span>
                        <strong>{currencyFormatter.format(payrollMetrics.overtime)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Kỷ luật</span>
                        <strong>{currencyFormatter.format(payrollMetrics.discipline)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Thưởng</span>
                        <strong>{currencyFormatter.format(payrollMetrics.reward)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Phụ cấp</span>
                        <strong>{currencyFormatter.format(payrollMetrics.allowance)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Khấu trừ</span>
                        <strong>{currencyFormatter.format(payrollMetrics.deduction)}</strong>
                      </div>
                      <div className="preview-summary-card">
                        <span>Thực nhận tháng</span>
                        <strong>{currencyFormatter.format(payrollMetrics.incomeAfterInsurance)}</strong>
                      </div>
                    </div>

                    <div className="preview-insurance-group">
                      <details className="preview-disclosure" open>
                        <summary>
                          <span>Doanh nghiệp đóng bảo hiểm</span>
                          <strong>{currencyFormatter.format(payrollMetrics.companyInsurance.total)}</strong>
                        </summary>
                        <div className="preview-disclosure-body">
                          <div><span>BHXH</span><strong>{currencyFormatter.format(payrollMetrics.companyInsurance.bhxh)}</strong></div>
                          <div><span>BHYT</span><strong>{currencyFormatter.format(payrollMetrics.companyInsurance.bhyt)}</strong></div>
                          <div><span>BHTN</span><strong>{currencyFormatter.format(payrollMetrics.companyInsurance.bhtn)}</strong></div>
                        </div>
                      </details>

                      <details className="preview-disclosure">
                        <summary>
                          <span>Người lao động đóng bảo hiểm</span>
                          <strong>{currencyFormatter.format(payrollMetrics.employeeInsurance.total)}</strong>
                        </summary>
                        <div className="preview-disclosure-body">
                          <div><span>BHXH</span><strong>{currencyFormatter.format(payrollMetrics.employeeInsurance.bhxh)}</strong></div>
                          <div><span>BHYT</span><strong>{currencyFormatter.format(payrollMetrics.employeeInsurance.bhyt)}</strong></div>
                          <div><span>BHTN</span><strong>{currencyFormatter.format(payrollMetrics.employeeInsurance.bhtn)}</strong></div>
                        </div>
                      </details>
                    </div>

                    <div className="preview-result-grid">
                      <div className="preview-result-card">
                        <span>Thực nhận cuối cùng</span>
                        <strong>{currencyFormatter.format(payrollMetrics.finalNetSalary)}</strong>
                      </div>
                      <div className="preview-result-card emphasis">
                        <span>Chi phí tiền lương</span>
                        <strong>{currencyFormatter.format(payrollMetrics.companyCost)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="preview-request-layout">
                    <div className="preview-request-grid">
                      <div className="preview-request-card">
                        <span>Loại yêu cầu</span>
                        <strong>{requestTypeLabel(previewItem)}</strong>
                      </div>
                      <div className="preview-request-card">
                        <span>Quản lý trực tiếp</span>
                        <strong>{previewItem.directManagerName || 'Chưa có thông tin'}</strong>
                      </div>
                      <div className="preview-request-card">
                        <span>{previewItem.type === 'overtime' ? 'Tổng thời lượng' : 'Tổng thời gian nghỉ'}</span>
                        <strong>
                          {previewItem.type === 'overtime'
                            ? previewItem.durationLabel || 'Không có thông tin'
                            : `${previewItem.durationDays} ngày`}
                        </strong>
                      </div>
                    </div>
                    {previewItem.type === 'overtime' ? (
                      <div className="preview-request-schedule">
                        <span className="preview-request-schedule-title">Ca tăng ca</span>
                        <div className="preview-request-schedule-grid">
                          <div className="preview-request-card focus">
                            <span>Ngày tăng ca</span>
                            <strong>{previewItem.otDateLabel || 'Không có thông tin'}</strong>
                          </div>
                          <div className="preview-request-card focus">
                            <span>Khung giờ tăng ca</span>
                            <strong>{previewItem.timeRangeLabel || previewItem.timeLabel || 'Không có thông tin'}</strong>
                          </div>
                        </div>
                      </div>
                    ) : previewItem.type === 'explanation' ? (
                      <div className="preview-request-schedule">
                        <span className="preview-request-schedule-title">Thông tin giải trình chấm công</span>
                        <div className="preview-request-schedule-grid">
                          <div className="preview-request-card focus">
                            <span>Ngày giải trình</span>
                            <strong>{previewItem.attendanceDateLabel || 'Không có thông tin'}</strong>
                          </div>
                          <div className="preview-request-card focus">
                            <span>Khung giờ đề xuất</span>
                            <strong>{previewItem.timeRangeLabel || 'Không có thông tin'}</strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="preview-request-grid">
                        <div className="preview-request-card">
                          <span>Bắt đầu</span>
                          <strong>{previewItem.startDateLabel || 'Không có thông tin'}</strong>
                        </div>
                        <div className="preview-request-card">
                          <span>Kết thúc</span>
                          <strong>{previewItem.endDateLabel || 'Không có thông tin'}</strong>
                        </div>
                      </div>
                    )}
                    <div className="preview-request-note spotlight">
                      <span>{getRequestSummaryTitle(previewItem)}</span>
                      <h5>Nội dung đơn</h5>
                      <p>{previewItem.detail.reason || 'Không có nội dung bổ sung'}</p>
                    </div>
                    {previewItem.detail.attachment ? (
                      <div className="preview-request-note">
                        <span>Đính kèm tài liệu</span>
                        <a
                          className="preview-attachment-link"
                          href={buildAttachmentUrl(previewItem.detail.attachment)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📎 {normalizeAttachmentPath(previewItem.detail.attachment)}
                        </a>
                      </div>
                    ) : (
                      <p className="preview-attachment-empty preview-attachment-empty--inline">
                        Không có tài liệu đính kèm
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="preview-actions">
              <button
                type="button"
                className="reject-btn"
                onClick={() => handleAction(previewItem.type, previewItem.id, 'reject')}
                disabled={submitting}
              >
                Từ chối
              </button>
              <button
                type="button"
                className="approve-btn"
                onClick={() => handleAction(previewItem.type, previewItem.id, 'approve')}
                disabled={submitting}
              >
                <CheckSquare size={16} />
                Duyệt yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

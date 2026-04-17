import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  FileText,
  Filter,
  Sparkles
} from 'lucide-react';
import requestsStatsService from '../../../services/requestsStatsService';
import { managerApprovals } from '../../../services/managerApprovals';
import {
  buildSeedRequestsStats,
  SQL_SEED_ACTIVE_MONTH,
  SQL_SEED_MANAGER_ID,
  SQL_SEED_MANAGER_USERNAME
} from '../../../services/requestsStatsSeedService';

const breakdownPalette = {
  annual: '#0ea5e9',
  sick: '#fb7185',
  unpaid: '#f59e0b',
  maternity: '#8b5cf6',
  bereavement: '#94a3b8',
  overtime: '#10b981'
};

const breakdownLabelMap = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  maternity: 'Thai sản',
  bereavement: 'Nghỉ việc riêng',
  overtime: 'Tăng ca'
};

const formatMonth = (monthStr) => {
  if (!monthStr) return 'Tháng hiện tại';
  const [year, month] = String(monthStr).split('-');
  return `Tháng ${month}/${year}`;
};

const shiftMonth = (monthStr, delta) => {
  const [year, month] = String(monthStr || SQL_SEED_ACTIVE_MONTH).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatCompactDate = (dateValue) => {
  if (!dateValue) return '--';
  return new Date(dateValue).toLocaleDateString('vi-VN');
};

const formatRelativeWaiting = (hours, isOverdue) => {
  const numeric = Number(hours || 0);
  if (isOverdue) {
    return `Quá hạn: ${formatWaitingTime(numeric)}`;
  }
  if (numeric >= 24) {
    const days = Math.floor(numeric / 24);
    const remainHours = Math.round(numeric % 24);
    return remainHours > 0 ? `${days} ngày ${remainHours} giờ trước` : `${days} ngày trước`;
  }
  if (numeric >= 1) return `${Math.round(numeric)} giờ trước`;
  return `${Math.max(1, Math.round(numeric * 60))} phút trước`;
};

const formatDelta = (current, previous, positiveLabel, negativeLabel = positiveLabel) => {
  const diff = Number(current || 0) - Number(previous || 0);
  if (diff === 0) return 'Không đổi so với tháng trước';
  return `${diff > 0 ? '+' : ''}${diff} ${diff > 0 ? positiveLabel : negativeLabel}`;
};

const formatApprovalRateDelta = (current, previous) => {
  const diff = Math.round((Number(current || 0) - Number(previous || 0)) * 10) / 10;
  if (diff === 0) return 'Giữ nguyên so với tháng trước';
  return `${diff > 0 ? '+' : ''}${diff}% so với tháng trước`;
};

const formatWaitingTime = (hours) => {
  const numeric = Number(hours || 0);
  if (numeric >= 24) {
    const days = Math.floor(numeric / 24);
    const remainHours = Math.round(numeric % 24);
    return remainHours > 0 ? `${days} ngày ${remainHours} giờ` : `${days} ngày`;
  }
  if (numeric >= 1) return `${Math.round(numeric)} giờ`;
  return `${Math.max(1, Math.round(numeric * 60))} phút`;
};

const formatRequestType = (row) => {
  if (row.type === 'overtime') return 'Tăng ca';
  return breakdownLabelMap[row.subtype] || 'Đơn nghỉ phép';
};

const formatStatusLabel = (status) => {
  if (status === 'approved') return 'Đã duyệt';
  if (status === 'rejected') return 'Từ chối';
  return 'Chờ duyệt';
};

const getRequestTypeStyle = (row) => {
  if (row.type === 'overtime') return { background: '#e0f2fe', color: '#0369a1' };
  if (row.subtype === 'annual') return { background: '#dcfce7', color: '#15803d' };
  if (row.subtype === 'sick') return { background: '#ffe4e6', color: '#be123c' };
  return { background: '#fef3c7', color: '#b45309' };
};

const getStatusStyle = (status) => {
  if (status === 'approved') return { background: '#dcfce7', color: '#15803d' };
  if (status === 'rejected') return { background: '#fee2e2', color: '#b91c1c' };
  return { background: '#fef3c7', color: '#b45309' };
};

const getAvatarTone = (index) => {
  const tones = [
    { background: '#dbeafe', color: '#2563eb' },
    { background: '#fee2e2', color: '#dc2626' },
    { background: '#ede9fe', color: '#7c3aed' },
    { background: '#dcfce7', color: '#059669' }
  ];
  return tones[index % tones.length];
};

const buildBreakdownItems = (rows, total) => {
  if (!Array.isArray(rows) || rows.length === 0 || total === 0) return [];
  return rows.map((row) => ({
    ...row,
    label: breakdownLabelMap[row.key] || row.key,
    percentage: Math.round((Number(row.total || 0) / total) * 1000) / 10,
    color: breakdownPalette[row.key] || '#94a3b8'
  }));
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const SummaryCard = ({ title, value, suffix, note, icon, tone, progress }) => {
  const toneMap = {
    blue: { soft: '#eff6ff', strong: '#0284c7' },
    amber: { soft: '#fff7ed', strong: '#d97706' },
    green: { soft: '#ecfdf5', strong: '#059669' },
    violet: { soft: '#f5f3ff', strong: '#7c3aed' }
  };

  const currentTone = toneMap[tone] || toneMap.blue;

  return (
    <div style={summaryCard}>
      <div style={summaryHead}>
        <div>
          <div style={summaryTitle}>{title}</div>
          <div style={summaryValueRow}>
            <span style={summaryValue}>{value}</span>
            <span style={summarySuffix}>{suffix}</span>
          </div>
        </div>
        <div style={{ ...summaryIcon, background: currentTone.soft, color: currentTone.strong }}>{icon}</div>
      </div>

      {typeof progress === 'number' ? (
        <div style={miniTrack}>
          <div style={{ ...miniFill, width: `${Math.min(progress, 100)}%`, background: currentTone.strong }} />
        </div>
      ) : null}

      <div style={summaryNote}>{note}</div>
    </div>
  );
};

const RequestsStats = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [usingSeedData, setUsingSeedData] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [expandedRequestIds, setExpandedRequestIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const user = getStoredUser();
  const managerId = user?.employee_id || user?.id || '';
  const username = String(user?.username || user?.email || '').toLowerCase();

  const applySeedData = (month) => {
    setData(buildSeedRequestsStats(month || SQL_SEED_ACTIVE_MONTH));
    setUsingSeedData(true);
    setSelectedRequestIds([]);
  };

  const loadData = async (month = selectedMonth) => {
    if (!managerId) {
      setError('Không xác định được tài khoản quản lý.');
      setData(null);
      return;
    }

    try {
      setError('');
      const response = await requestsStatsService.getManagerRequestsStats(managerId, month || undefined);
      setUsingSeedData(false);
      setSelectedRequestIds([]);
      setData(response);

      if (response?.month && response.month !== selectedMonth) {
        setSelectedMonth(response.month);
      }
    } catch (err) {
      console.error('load requests stats error:', err);
      const looksLikeSeedManager =
        managerId === SQL_SEED_MANAGER_ID || username === SQL_SEED_MANAGER_USERNAME;

      if (looksLikeSeedManager) {
        applySeedData(month || SQL_SEED_ACTIVE_MONTH);
        setError('');
      } else {
        setError('Không tải được thống kê đơn từ.');
      }
    }
  };

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    setSelectedRequestIds([]);
    setExpandedRequestIds([]);
    setCurrentPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    setSelectedRequestIds([]);
    setExpandedRequestIds([]);
    setCurrentPage(1);
  }, [statusFilter, requestTypeFilter]);

  const handleApprovalAction = async (requestType, requestId, action) => {
    if (usingSeedData) return;

    try {
      setError('');
      setSuccessMessage('');
      setActionLoadingId(requestId);
      if (action === 'approved') {
        await managerApprovals.approveRequest(requestType, requestId, managerId);
        setSuccessMessage('Đã duyệt đơn thành công.');
      } else {
        await managerApprovals.rejectRequest(requestType, requestId, managerId);
        setSuccessMessage('Đã từ chối đơn thành công.');
      }
      await loadData(selectedMonth);
    } catch (err) {
      console.error('approval action error:', err);
      setError('Cập nhật trạng thái đơn thất bại.');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleBlockedAction = (item) => {
    if (usingSeedData) {
      setError('Dữ liệu mẫu từ dataKhang.sql không thể duyệt hoặc từ chối trực tiếp.');
      return;
    }

    if (item.status !== 'pending') {
      setError(`Đơn này đã ở trạng thái "${formatStatusLabel(item.status)}".`);
      return;
    }

    setError('Đơn này không thuộc quyền duyệt của tài khoản hiện tại.');
  };

  const handleSelectRequest = (requestId) => {
    setSelectedRequestIds((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const handleSelectAllPending = (rows) => {
    const pendingIds = rows
      .filter((item) => item.status === 'pending' && item.canApprove)
      .map((item) => item.id);

    const allSelected =
      pendingIds.length > 0 && pendingIds.every((id) => selectedRequestIds.includes(id));

    if (allSelected) {
      setSelectedRequestIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
      return;
    }

    setSelectedRequestIds((prev) => Array.from(new Set([...prev, ...pendingIds])));
  };

  const handleQuickApprove = async () => {
    if (usingSeedData || selectedRequestIds.length === 0) return;

    try {
      setError('');
      setSuccessMessage('');
      setActionLoadingId('bulk-approve');
      const selectedRows = (data?.monthlyRequests || []).filter(
        (item) => selectedRequestIds.includes(item.id) && item.status === 'pending' && item.canApprove
      );

      await Promise.all(
        selectedRows.map((item) => managerApprovals.approveRequest(item.type, item.id, managerId))
      );

      setSuccessMessage(`Đã phê duyệt ${selectedRows.length} đơn.`);
      await loadData(selectedMonth);
    } catch (err) {
      console.error('quick approve error:', err);
      setError('Phê duyệt nhanh thất bại.');
    } finally {
      setActionLoadingId('');
    }
  };

  const filteredRequests = useMemo(() => {
    const items = Array.isArray(data?.monthlyRequests) ? data.monthlyRequests : [];
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      const normalizedType = item.type === 'overtime' ? 'overtime' : item.subtype || 'other';
      const matchesType = requestTypeFilter === 'all' ? true : normalizedType === requestTypeFilter;
      return matchesStatus && matchesType;
    });
  }, [data?.monthlyRequests, statusFilter, requestTypeFilter]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const rowsForTable = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, safePage]);

  const allVisibleNotesExpanded =
    rowsForTable.length > 0 &&
    rowsForTable.every((item) => expandedRequestIds.includes(item.id));

  const toggleVisibleNotes = () => {
    const visibleIds = rowsForTable.map((item) => item.id);
    if (visibleIds.length === 0) return;

    if (allVisibleNotesExpanded) {
      setExpandedRequestIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setExpandedRequestIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  if (!data && error) {
    return <div style={{ padding: 24 }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>;
  }

  const summary = data.summary || {};
  const breakdownItems = buildBreakdownItems(data.breakdown || [], Number(summary.totalCurrent || 0));
  const monthlyRequests = Array.isArray(data.monthlyRequests) ? data.monthlyRequests : [];
  const actionableVisibleRows = rowsForTable.filter(
    (item) => item.status === 'pending' && item.canApprove
  );
  const allVisiblePendingSelected =
    actionableVisibleRows.length > 0 &&
    actionableVisibleRows.every((item) => selectedRequestIds.includes(item.id));

  return (
    <div style={page}>
      <div style={shell}>
        <div style={heroPanel}>
          <div style={heroContent}>
            <div style={titleRow}>
              <span style={titleIconWrap}>
                <FileText size={18} color="#0ea5e9" />
              </span>
              <div>
                <h1 style={title}>Thống kê Đơn từ và Phê duyệt</h1>
                <p style={subtitle}>
                  Theo dõi đơn nghỉ phép, tăng ca và tình trạng xử lý trong phạm vi quản lý.
                </p>
              </div>
            </div>
          </div>

          <div style={monthBox}>
            <button
              type="button"
              style={monthButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev || data.month, -1))}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={monthLabel}>
              <CalendarDays size={16} color="#0ea5e9" />
              <span>{formatMonth(selectedMonth || data.month)}</span>
            </div>
            <button
              type="button"
              style={monthButton}
              onClick={() => setSelectedMonth((prev) => shiftMonth(prev || data.month, 1))}
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}
        {successMessage ? <div style={successBox}>{successMessage}</div> : null}

        <div style={overviewGrid}>
          <SummaryCard
            title="Tổng số đơn"
            value={summary.totalCurrent || 0}
            suffix="đơn"
            note={formatDelta(summary.totalCurrent, summary.totalPrevious, 'đơn tăng', 'đơn giảm')}
            icon={<FileText size={18} color="#0284c7" />}
            tone="blue"
          />
          <SummaryCard
            title="Đang chờ duyệt"
            value={summary.pendingCurrent || 0}
            suffix="đơn"
            note={`${summary.overduePendingCurrent || 0} đơn quá 24 giờ`}
            icon={<Clock3 size={18} color="#d97706" />}
            tone="amber"
          />
          <SummaryCard
            title="Tỷ lệ duyệt"
            value={summary.approvalRateCurrent || 0}
            suffix="%"
            note={formatApprovalRateDelta(summary.approvalRateCurrent, summary.approvalRatePrevious)}
            icon={<CheckCircle2 size={18} color="#059669" />}
            tone="green"
            progress={summary.approvalRateCurrent || 0}
          />
          <SummaryCard
            title="Thời gian chờ TB"
            value={summary.averageWaitHoursCurrent || 0}
            suffix="giờ"
            note={formatDelta(summary.averageWaitHoursPrevious, summary.averageWaitHoursCurrent, 'nhanh hơn', 'chậm hơn')}
            icon={<Sparkles size={18} color="#7c3aed" />}
            tone="violet"
          />
        </div>

        <div style={contentGrid}>
          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <h3 style={sectionTitle}>
                  <Filter size={18} color="#8b5cf6" />
                  Phân loại đơn từ
                </h3>
                <p style={sectionSubtitle}>
                  Tỷ trọng đơn phát sinh trong {formatMonth(selectedMonth || data.month).toLowerCase()}
                </p>
              </div>
            </div>

            {breakdownItems.length === 0 ? (
              <div style={emptyState}>Không có đơn phát sinh trong tháng này.</div>
            ) : (
              breakdownItems.map((item) => (
                <div key={item.key} style={progressItem}>
                  <div style={progressHeader}>
                    <div style={progressLabel}>
                      <span style={{ ...progressDot, background: item.color }} />
                      <span>{item.label}</span>
                    </div>
                    <div style={progressMeta}>
                      <span>{item.total} đơn</span>
                      <strong>{item.percentage}%</strong>
                    </div>
                  </div>
                  <div style={progressTrack}>
                    <div
                      style={{
                        ...progressFill,
                        width: `${item.percentage}%`,
                        background: item.color
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </section>

          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <h3 style={sectionTitle}>
                  <Sparkles size={18} color="#0ea5e9" />
                  Điểm nhấn tháng này
                </h3>
                <p style={sectionSubtitle}>Tóm tắt nhanh để theo dõi tình trạng xử lý.</p>
              </div>
            </div>

            <div style={insightList}>
              <div style={insightItem}>
                <span style={insightLabel}>Đơn đã duyệt</span>
                <strong style={insightValue}>{summary.approvedCurrent || 0}</strong>
              </div>
              <div style={insightItem}>
                <span style={insightLabel}>Đơn bị từ chối</span>
                <strong style={insightValue}>{summary.rejectedCurrent || 0}</strong>
              </div>
              <div style={insightItem}>
                <span style={insightLabel}>Có thể duyệt nhanh</span>
                <strong style={insightValue}>{selectedRequestIds.length}</strong>
              </div>
              <div style={insightItem}>
                <span style={insightLabel}>Nhân viên có đơn</span>
                <strong style={insightValue}>{new Set(monthlyRequests.map((item) => item.employeeId)).size}</strong>
              </div>
            </div>

            <div style={infoBox}>
              {usingSeedData
                ? 'Đang hiển thị dữ liệu seed từ dataKhang.sql vì API chưa trả dữ liệu.'
                : 'Các nút duyệt hoặc từ chối chỉ bật cho những đơn mà tài khoản hiện tại thực sự có quyền xử lý.'}
            </div>
          </section>
        </div>

        <section style={tableCard}>
          <div style={tableToolbar}>
            <div>
            <h3 style={{ ...sectionTitle, fontSize: '18px' }}>
  <Clock3 size={18} color="#f59e0b" />
  Danh sách chờ phê duyệt
</h3>
<p style={{ ...sectionSubtitle, fontSize: '13px' }}>
  Các yêu cầu đang chờ bạn xử lý trong {formatMonth(selectedMonth || data.month).toLowerCase()}
</p>
            </div>

            <div style={toolbarActions}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={filterSelect}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chưa duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
              <select
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value)}
                style={filterSelect}
              >
                <option value="all">Tất cả loại yêu cầu</option>
                <option value="annual">Nghỉ phép năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="maternity">Thai sản</option>
                <option value="bereavement">Nghỉ việc riêng</option>
                <option value="overtime">Tăng ca</option>
              </select>
              <button
                type="button"
                style={secondaryToolbarButton}
                onClick={toggleVisibleNotes}
              >
                {allVisibleNotesExpanded ? 'Thu gọn ghi chú' : 'Xem ghi chú'}
              </button>
              <button
                type="button"
                style={{
                  ...primaryToolbarButton,
                  opacity: selectedRequestIds.length === 0 || usingSeedData ? 0.6 : 1,
                  cursor: selectedRequestIds.length === 0 || usingSeedData ? 'not-allowed' : 'pointer'
                }}
                disabled={selectedRequestIds.length === 0 || usingSeedData || actionLoadingId === 'bulk-approve'}
                onClick={handleQuickApprove}
              >
                Phê duyệt nhanh ({selectedRequestIds.length})
              </button>
            </div>
          </div>

          <div style={listWrap}>
            <div style={listHeaderRow}>
              <div style={checkHeaderCell}>
                <input
                  type="checkbox"
                  checked={allVisiblePendingSelected}
                  onChange={() => handleSelectAllPending(rowsForTable)}
                  disabled={actionableVisibleRows.length === 0 || usingSeedData}
                />
              </div>
              <div style={listHeadCell}>Nhân viên gửi</div>
              <div style={listHeadCell}>Loại yêu cầu</div>
              <div style={listHeadCell}>Thời gian chờ</div>
              <div style={listHeadCell}>Người duyệt</div>
              <div style={{ ...listHeadCell, textAlign: 'right' }}>Thao tác</div>
            </div>

            {rowsForTable.length === 0 ? (
              <div style={emptyListState}>Không có đơn phù hợp với bộ lọc hiện tại.</div>
            ) : (
              rowsForTable.map((item, index) => {
                const isPending = item.status === 'pending';
                const canApprove = Boolean(item.canApprove) && !usingSeedData;
                const avatarTone = getAvatarTone(index);
                const showApproveButtons = isPending && canApprove;
                const showActionButtons = isPending;

                return (
                  <div key={item.id} style={requestRow(isPending)}>
                    <div style={checkCell}>
                      {isPending ? (
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(item.id)}
                          onChange={() => handleSelectRequest(item.id)}
                          disabled={!canApprove}
                        />
                      ) : null}
                    </div>

                    <div style={requestCell}>
                      <div style={employeeCard}>
                        <div style={{ ...avatar, ...avatarTone }}>
                          {item.employeeName?.trim()?.charAt(0)?.toUpperCase() || 'N'}
                        </div>
                        <div style={employeeInfo}>
                          <div style={employeeName}>{item.employeeName}</div>
                          <div style={employeeMeta}>
                            {item.departmentName || 'Chưa phân bổ'}
                            {item.positionName ? ` | ${item.positionName}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={requestCell}>
                      <div style={typeCol}>
                        <span style={{ ...typeTag, ...getRequestTypeStyle(item) }}>
                          {formatRequestType(item)}
                        </span>
                        {expandedRequestIds.includes(item.id) ? (
                          <span style={subText}>{item.reason || 'Không có ghi chú'}</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={requestCell}>
                      <div style={waitCol}>
                        <div
                          style={{
                            ...waitPrimary,
                            color: item.isOverdue ? '#dc2626' : '#0f172a',
                            fontWeight: item.isOverdue ? 700 : 600
                          }}
                        >
                          {formatRelativeWaiting(item.waitingHours, item.isOverdue)}
                        </div>
                        <span style={subText}>{formatCompactDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <div style={requestCell}>
                      <div style={approverBlock}>
                        <div style={approverName}>{item.approverName || 'Chưa gán'}</div>
                        <div style={subText}>{formatStatusLabel(item.status)}</div>
                      </div>
                    </div>

                    <div style={{ ...requestCell, display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={actionsPanel}>
                        {showActionButtons ? (
                          <>
                            <button
                              type="button"
                              style={{
                                ...approveButton,
                                ...(showApproveButtons ? {} : disabledActionButton),
                                ...(actionLoadingId === item.id ? actionButtonLoading : {})
                              }}
                              disabled={actionLoadingId === item.id}
                              onClick={() =>
                                showApproveButtons
                                  ? handleApprovalAction(item.type, item.id, 'approved')
                                  : handleBlockedAction(item)
                              }
                            >
                              {actionLoadingId === item.id ? (
                                <>
                                  <Loader2 size={14} style={spinnerIcon} />
                                  Đang xử lý
                                </>
                              ) : (
                                'Duyệt'
                              )}
                            </button>
                            <button
                              type="button"
                              style={{
                                ...rejectButton,
                                ...(showApproveButtons ? {} : disabledActionButton),
                                ...(actionLoadingId === item.id ? actionButtonLoading : {})
                              }}
                              disabled={actionLoadingId === item.id}
                              onClick={() =>
                                showApproveButtons
                                  ? handleApprovalAction(item.type, item.id, 'rejected')
                                  : handleBlockedAction(item)
                              }
                            >
                              Từ chối
                            </button>
                            {!showApproveButtons ? (
                              <span style={{ ...doneText, ...pendingInfoTag }}>
                                Không duyệt được
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span
                            style={{
                              ...doneText,
                              ...getStatusStyle(item.status)
                            }}
                          >
                            {formatStatusLabel(item.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {filteredRequests.length > PAGE_SIZE ? (
              <div style={paginationBar}>
                <button
                  type="button"
                  style={{
                    ...pageButton,
                    ...(safePage === 1 ? disabledPageButton : {})
                  }}
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Trước
                </button>
                <span style={pageInfo}>
                  Trang {safePage}/{totalPages}
                </span>
                <button
                  type="button"
                  style={{
                    ...pageButton,
                    ...(safePage === totalPages ? disabledPageButton : {})
                  }}
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Sau
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RequestsStats;

const page = {
  minHeight: '100vh',
  padding: '24px',
  background: 'linear-gradient(180deg, #eef4ef 0%, #f7fafc 100%)'
};

const shell = {
  background: '#ffffff',
  borderRadius: '28px',
  padding: '28px',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(226, 232, 240, 0.9)'
};

const heroPanel = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '18px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  padding: '18px 20px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #f8fdff 0%, #f7f7ff 100%)',
  border: '1px solid #e6eef8',
  marginBottom: '16px'
};

const heroContent = { flex: '1 1 420px' };
const titleRow = { display: 'flex', alignItems: 'flex-start', gap: '12px' };
const titleIconWrap = {
  width: '36px',
  height: '36px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #dff6ff 0%, #ecfeff 100%)',
  flexShrink: 0
};

const title = { margin: 0, fontSize: '24px', lineHeight: 1.2, fontWeight: 800, color: '#0f172a' };
const subtitle = { margin: '6px 0 0', fontSize: '13px', color: '#64748b', maxWidth: '620px' };
const monthBox = { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' };
const monthButton = { width: '34px', height: '34px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const monthLabel = { minWidth: '156px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155' };
const errorBox = { marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', fontSize: '13px' };
const successBox = { marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', fontSize: '13px' };
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' };
const summaryCard = { padding: '18px', borderRadius: '22px', border: '1px solid #edf2f7', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' };
const summaryHead = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' };
const summaryTitle = { fontSize: '14px', fontWeight: 600, color: '#64748b' };
const summaryValueRow = { display: 'flex', gap: '8px', alignItems: 'baseline', marginTop: '10px' };
const summaryValue = { fontSize: '38px', lineHeight: 1, fontWeight: 800, color: '#0f172a' };
const summarySuffix = { fontSize: '14px', color: '#64748b', fontWeight: 600 };
const summaryIcon = { width: '42px', height: '42px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const summaryNote = { marginTop: '12px', fontSize: '12px', color: '#64748b' };
const miniTrack = { marginTop: '12px', width: '100%', height: '6px', borderRadius: '999px', background: '#edf2f7', overflow: 'hidden' };
const miniFill = { height: '100%', borderRadius: '999px' };
const contentGrid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.9fr)', gap: '16px', marginBottom: '20px' };
const sectionCard = { padding: '20px', borderRadius: '22px', border: '1px solid #eef2f7', background: '#ffffff', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)' };
const sectionHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' };
const sectionTitle = { margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#0f172a' };
const sectionSubtitle = { margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' };
const emptyState = { padding: '18px', borderRadius: '16px', background: '#f8fafc', color: '#64748b', fontSize: '14px' };
const progressItem = { marginTop: '18px' };
const progressHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' };
const progressLabel = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#334155' };
const progressMeta = { display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#475569' };
const progressDot = { width: '10px', height: '10px', borderRadius: '999px' };
const progressTrack = { width: '100%', height: '9px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' };
const progressFill = { height: '100%', borderRadius: '999px' };
const insightList = { display: 'grid', gap: '10px' };
const insightItem = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7' };
const insightLabel = { fontSize: '13px', color: '#64748b' };
const insightValue = { fontSize: '16px', color: '#0f172a' };
const infoBox = { marginTop: '14px', padding: '14px', borderRadius: '16px', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', lineHeight: 1.5 };
const tableCard = { borderRadius: '24px', border: '1px solid #edf2f7', background: '#ffffff', boxShadow: '0 14px 32px rgba(15, 23, 42, 0.05)', overflow: 'hidden' };
const tableToolbar = { padding: '22px 22px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' };
const toolbarActions = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' };
const filterSelect = {
  border: '1px solid #d9e3ef',
  background: '#ffffff',
  color: '#475569',
  padding: '10px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none'
};
const secondaryToolbarButton = { border: '1px solid #d9e3ef', background: '#ffffff', color: '#475569', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };
const primaryToolbarButton = { border: '1px solid #38bdf8', background: '#38bdf8', color: '#ffffff', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 };
const listWrap = { padding: '16px 18px 20px', background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)', overflowX: 'auto', overflowY: 'hidden' };
const listGridTemplate = 
'42px 2fr 1.5fr 1.2fr 1.2fr 1.4fr';const listHeaderRow = {
  display: 'grid',
  gridTemplateColumns: listGridTemplate,
  gap: '12px',
  alignItems: 'center',
  padding: '10px 14px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#64748b',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
  minWidth: '920px'
};
const listHeadCell = { whiteSpace: 'nowrap' };
const checkHeaderCell = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const requestRow = (isPending) => ({
  display: 'grid',
  gridTemplateColumns: listGridTemplate,
  gap: '12px',
  alignItems: 'center',
  marginTop: '10px',
  padding: '16px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  minWidth: '920px',
  background: isPending ? '#fffef7' : '#ffffff',
  boxShadow: '0 6px 14px rgba(0,0,0,0.04)',
  transition: 'all 0.2s ease',
  cursor: 'pointer'
});
const requestCell = { display: 'flex', alignItems: 'stretch', minWidth: 0 };
const checkCell = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const emptyListState = { minWidth: '920px', padding: '28px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' };
const paginationBar = { minWidth: '920px', marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '6px', borderTop: '1px solid #eef2f7' };
const pageButton = { border: '1px solid #d9e3ef', background: '#ffffff', color: '#475569', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minWidth: '74px' };
const disabledPageButton = { opacity: 0.5, cursor: 'not-allowed' };
const pageInfo = { fontSize: '13px', fontWeight: 700, color: '#64748b', minWidth: '88px', textAlign: 'center' };
const employeeCard = { display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' };
const employeeInfo = { minWidth: 0, display: 'grid', gap: '4px' };
const avatar = { width: '34px', height: '34px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: '12px' };
const employeeName = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a'
};
const employeeMeta = {
  fontSize: '12px',
  color: '#64748b'
};
const typeCol = { display: 'grid', gap: '8px', alignContent: 'center', minHeight: '64px' };
const waitCol = { display: 'grid', gap: '6px', alignContent: 'center', minHeight: '64px' };
const waitPrimary = {
  fontSize: '14px',
  fontWeight: 700
};const subText = {
  fontSize: '13px',
  color: '#475569',
  lineHeight: 1.5,
  background: '#f8fafc',
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid #eef2f7',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};
const typeTag = {
  padding: '6px 14px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  border: '1px solid rgba(0,0,0,0.05)'
};
const approverBlock = { display: 'grid', alignContent: 'center', minHeight: '64px' };
const approverName = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#334155'
};const actionsPanel = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', width: '100%', minHeight: '64px', flexWrap: 'wrap' };
const approveButton = {
  border: 'none',
  background: '#22c55e',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer'
};

const rejectButton = {
  border: 'none',
  background: '#ef4444',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer'
};
const disabledActionButton = {
  background: '#e5e7eb',
  color: '#9ca3af',
  cursor: 'not-allowed'
};
const actionButtonLoading = { opacity: 0.75, cursor: 'wait' };
const spinnerIcon = { animation: 'spin 1s linear infinite' };
const doneText = {
  fontSize: '11px',
  fontWeight: 700,
  padding: '6px 12px',
  borderRadius: '999px'
};const pendingInfoTag = { background: '#fff7ed', color: '#c2410c' };

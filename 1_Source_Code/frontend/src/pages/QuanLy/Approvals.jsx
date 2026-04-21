import React, { useEffect, useState } from 'react';
import { FaRegSquareCheck } from "react-icons/fa6";
import { CiCircleCheck } from "react-icons/ci";
import { MdHistory,MdOutlineRemoveRedEye } from "react-icons/md";
import { managerApprovals } from '../../services/managerApprovals';
import { CiCalendar } from "react-icons/ci";
import { IoMoonOutline } from "react-icons/io5";
import { CiClock2 } from "react-icons/ci";
import moment from 'moment';
import 'moment/dist/locale/vi';
moment.updateLocale('vi', {
  relativeTime: {
    future: "%s tới",
    past: "%s trước",
    s: 'vài giây',
    ss: '%d giây',
    m: '1 phút',      
    mm: '%d phút',
    h: '1 giờ',       
    hh: '%d giờ',
    d: '1 ngày',      
    dd: '%d ngày',
    w: '1 tuần',
    ww: '%d tuần',
    M: '1 tháng',
    MM: '%d tháng',
    y: '1 năm',
    yy: '%d năm'
  },
  week: {
    dow: 1 
  }
});

import "./Approvals.css";

const Approvals = () => {
  
  const user = JSON.parse(localStorage.getItem("user")); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [approvingAll, setApprovingAll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  //đơn chờ duyệt
  const totalPending = requests.length;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);



  const leaveTypes = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  ot: "Nghỉ bù (OT)",
  maternity: "Nghỉ thai sản",
  bereavement: "Nghỉ tang"
  };
  const explanationTypes = {
  forgot_checkin: "Quên chấm công vào",
  forgot_checkout: "Quên chấm công ra",
  system_error: "Lỗi hệ thống",
  late_arrival: "Đi muộn",
  early_leave: "Về sớm"
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await managerApprovals.getApprovalRequests(user.id);
        // Lưu ý: Tùy vào cấu trúc trả về của axiosClient, có thể là res.data hoặc res
        setRequests(res.data || res); 
      } catch (err) {
        console.error("Lỗi load approvals:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [resPending, resApproved] = await Promise.all([
          managerApprovals.getApprovalRequests(user.id),
          managerApprovals.getApprovalHistory(user.id)
        ]);

        setRequests(resPending.data || resPending);
        setApprovedRequests(resApproved.data || resApproved);

      } catch (err) {
        console.error("Lỗi load approvals:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user.id]);

  const handleApprove = async (type, id) => {
    try {
      await managerApprovals.approveRequest(type, id,user.id);
      setRequests(prev => prev.filter(r => r.id !== id || r.type !== type));
      alert("Đã phê duyệt đơn thành công!");
    } catch (err) {
      console.log("APPROVE ERROR:", err.response?.data || err.message);
  alert(err.response?.data?.message || "Phê duyệt thất bại");
    }
  };

  const handleReject = async (type, id, reason = "") => {
  try {
    await managerApprovals.rejectRequest(type, id, user.id, reason);
    setRequests(prev => prev.filter(r => r.id !== id || r.type !== type));
    alert("Đã từ chối đơn!");
  } catch (err) {
    alert("Thao tác thất bại");
  }
};
const handleApproveAll = async () => {
  if (requests.length === 0) return;

  const confirm = window.confirm("Bạn có chắc muốn duyệt tất cả?");
  if (!confirm) return;

  try {
    setApprovingAll(true);

    await Promise.all(
      requests.map(req =>
        managerApprovals.approveRequest(req.type, req.id,user.id)
      )
    );

    // UX mượt: fade out thay vì mất liền
    setRequests([]);

    const resApproved = await managerApprovals.getApprovalHistory(user.id);
    setApprovedRequests(resApproved.data || resApproved);

  } catch (err) {
    console.error(err);
  } finally {
    setApprovingAll(false);
  }
};

  const totalApprovedThisWeek = approvedRequests.filter(req => {
    const startOfWeek = moment().startOf('week'); 
    const endOfWeek = moment().endOf('week');

    const date = moment(req.updated_at);

    return date.isBetween(startOfWeek, endOfWeek, null, '[]');
  }).length;

  // Logic lọc dữ liệu
  const filteredRequests = requests.filter(req => {
    if (filterType === 'all') return true;
    return req.type === filterType;
  });
  const filteredHistory = approvedRequests.filter(req => {
    if (historyFilter === 'all') return true;
    return req.type === historyFilter;
  });

  const countDaysExcludingSunday = (start, end) => {
  let current = moment(start);
  const last = moment(end);

  let count = 0;

  while (current.isSameOrBefore(last, 'day')) {
    if (current.day() !== 0) { // 0 = Chủ nhật
      count++;
    }
    current.add(1, 'day');
  }

  return count;
};
  return (
    <div className="approvals-container">

         {/* ================= Header ================= */}
        <div className="approvals-header">
            
              <div>
                <h2 className="approvals-title"><span className="approvals-icon-wrapper"><FaRegSquareCheck className="approvals-icon-main" /></span>Trung tâm phê duyệt đơn từ</h2>
                <p className="approvals-text">
                  Quản lý, xét duyệt, các yêu cầu nghỉ phép, tăng ca của đội ngũ.
                </p>
              </div>
            
              <div className="approvals-header-right">
                <button
                  className="approvals-btn-history"
                  onClick={() => setShowHistory(true)}
                >
                 <MdHistory  size={18} /> Lịch sử phê duyệt
                </button>
                <button
                  className="approvals-btn-all"
                  onClick={handleApproveAll}
                  disabled={approvingAll}
                >
                  <CiCircleCheck size={18}/>
                  {approvingAll ? "Đang duyệt..." : "Duyệt tất cả"}
                </button>
              </div>

            
        </div>
        {/* ================= Stats bar ================= */}
        <div className="approvals-statsbar">
          <div className="approvals-statsbar-left">
            <div className="stat-group">
              <span className="stat-label">CHỜ DUYỆT</span>
              <span className="stat-number orange">{totalPending}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-group">
              <span className="stat-label">ĐÃ DUYỆT (TUẦN)</span>
              <span className="stat-number green">{totalApprovedThisWeek}</span>
            </div>
            <div className="stat-divider"></div>
          </div>

          <div className="approvals-statsbar-right">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                Tất cả yêu cầu
              </button>

              <button
                className={`filter-tab ${filterType === 'leave' ? 'active' : ''}`}
                onClick={() => setFilterType('leave')}
              >
                Nghỉ phép
              </button>

              <button
                className={`filter-tab ${filterType === 'overtime' ? 'active' : ''}`}
                onClick={() => setFilterType('overtime')}
              >
                Làm thêm giờ (OT)
              </button>
              <button
                className={`filter-tab ${filterType === 'explanation' ? 'active' : ''}`}
                onClick={() => setFilterType('explanation')}
              >
                Giải trình
              </button>
            </div>
          </div>
        </div>
        {/* ================= Content ================= */}
        <div className="approvals-content">
        <h3 className="content-title">YÊU CẦU TỪ NHÂN VIÊN</h3>

        {/* Card 1 */}
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : filteredRequests.length === 0 ? (
          <p style={{marginLeft:"5px"}}>Không có yêu cầu nào cần duyệt.</p>
        ) : (
          filteredRequests.map((req) => (
            <div className="request-card" key={`${req.type}-${req.id}`} style={{
              borderLeft: `5px solid ${
              req.type === 'leave'
                ? "#34D399"
                : req.type === 'overtime'
                ? "#7E22CE"
                : req.type === 'explanation'
                ? "#F59E0B"
                : "red"
            }`
            }}>
                      
              <div className="card-user-section">
                <div className="avatar">{req.employee_name?.substring(0, 2).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{req.employee_name}</span>
                  <span className="user-role">Nhân viên</span>
                </div>
              </div>

              <div className="card-info-section">
                <div className="tag-wrapper">
                  <span
                    className={`tag-type ${
                      req.type === 'leave'
                        ? 'green-bg'
                        : req.type === 'overtime'
                        ? 'orange-bg'
                        : 'yellow-bg'
                    }`}
                  >
                    {req.type === 'leave' && (
                      <>
                        <CiCalendar size={15} style={{ marginRight: "4px" }} />
                        {leaveTypes[req.leave_type] || "Nghỉ khác"}
                      </>
                    )}

                    {req.type === 'overtime' && (
                      <>
                        <IoMoonOutline size={15} style={{ marginRight: "4px" }} />
                        Làm thêm giờ (OT)
                      </>
                    )}

                    {req.type === 'explanation' && (
                      <>
                        <CiClock2 size={15} style={{ marginRight: "4px" }} />
                        Giải trình 
                      </>
                    )}
                  </span>
                  <span className="tag-status"><CiClock2 style={{ display: 'block' }} /> {moment(req.created_at).fromNow()}</span>
                </div>
                <h4 className="request-title">  {req.reason
                  ? req.reason.length > 30
                    ? req.reason.slice(0, 30) + " ..."
                    : req.reason
                  : "Không có lý do chi tiết"}
                </h4>
              
                <p className="request-time">
                    <span className="time-label">Thời gian:</span>{" "}
                    {moment(req.start_datetime).format('DD/MM/YYYY')} 
                    {req.type === 'overtime'
                      ? ` (${req.start_time} - ${req.end_time})`
                      : ` đến ${moment(req.end_datetime).format('DD/MM/YYYY')}`}
                </p>
              </div>

              <div className="card-action-section">
                <button className="btn-icon-view" onClick={() => setSelectedRequest(req)}><MdOutlineRemoveRedEye size={20} /></button>
                <div className="action-buttons">
                  <button
                    className="btn-text-reject"
                    onClick={() => {
                      if (req.type === "explanation") {
                        setRejectTarget(req);
                        setShowRejectModal(true);
                      } else {
                        handleReject(req.type, req.id);
                      }
                    }}
                  >
                    Từ chối
                  </button>
                  <button className="btn-approve-primary" onClick={() => handleApprove(req.type, req.id)}>Phê duyệt</button>
                </div>
              </div>
            </div>
          ))
        )}

        </div>
        {showHistory && (
          <div className="modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="approvals-btn-close" onClick={() => setShowHistory(false)}>Đóng</button>
              <div className="modal-header">
                <h3>Lịch sử phê duyệt</h3>
                <select 
                  className="history-dropdown"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="all">Tất cả đơn</option>
                  <option value="leave">Nghỉ phép</option>
                  <option value="overtime">Tăng ca</option>
                </select>
                
              </div>

              

              <div className="modal-body">
                {approvedRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <MdHistory size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                    <p>Chưa có dữ liệu lịch sử duyệt đơn.</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {filteredHistory.map(req => (
                      <div key={`${req.type}-${req.id}`} className="history-item">
                        <div className="history-info">
                          <span className="history-user">{req.employee_name}</span>
                          <span className={`history-type-chip ${req.type === 'leave' ? 'type-leave' : 'type-overtime'}`}>
                            {req.type === 'leave' ? 'Nghỉ phép' : 'Làm thêm giờ'}
                          </span>
                        </div>
                        
                        <div className="history-meta">
                          <span className="status-approved">
                            <CiCircleCheck size={16} /> Đã duyệt
                          </span>
                          <span className="history-time">
                            {moment(req.updated_at).calendar(null, {
                              sameDay: '[Hôm nay lúc] HH:mm',
                              lastDay: '[Hôm qua lúc] HH:mm',
                              lastWeek: 'DD/MM/YYYY [lúc] HH:mm',
                              sameElse: 'DD/MM/YYYY'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
        {selectedRequest && (
          <div className="request-detail-overlay" onClick={() => setSelectedRequest(null)}>
            <div className="request-detail-modal" onClick={(e) => e.stopPropagation()}>
              
              {/* Header */}
              <div className="request-detail-header">
                <h3>
                  Chi tiết đơn{" "}
                  {selectedRequest.type === 'leave'
                    ? 'xin phép'
                    : selectedRequest.type === 'overtime'
                    ? 'tăng ca'
                    : 'giải trình'}
                </h3>
                <button className="request-detail-btn-close" onClick={() => setSelectedRequest(null)}>✕</button>
              </div>

              <div className="request-detail-body">
                {/* User Info Section */}
                <div className="request-detail-user-card">
                  <div className="request-detail-avatar">
                    {selectedRequest.employee_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="request-detail-user-info">
                    <h4>{selectedRequest.employee_name}</h4>
                    <p>{selectedRequest.position_name} - {selectedRequest.department_name}</p> 
                  </div>
                </div>

                {/* 1. Thông tin chung */}
                <div className="request-detail-section">
                  <div className="section-title">
                    <span className="icon">📄</span> Thông tin chung
                  </div>
                  <div className="section-grid">
                    <div className="input-group">
                      <label>Loại đơn</label>
                     <div className="fake-input">
                       {selectedRequest.type === 'leave'
                      ? leaveTypes[selectedRequest.leave_type]
                      : selectedRequest.type === 'overtime'
                      ? "Làm thêm giờ (OT)"
                      : explanationTypes[selectedRequest.explanation_type] || "Đơn giải trình"}
                    </div>
                    </div>
                    <div className="input-group">
                      <label>
                        {selectedRequest.type === "explanation"
                          ? "Ngày cần giải trình"
                          : "Người kiểm duyệt"}
                      </label>
                      <div className="fake-input">{selectedRequest.type === "explanation"
                        ? moment(selectedRequest.start_datetime).format("DD/MM/YYYY")
                        : selectedRequest.approver_name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Thời gian nghỉ/làm việc */}
                <div className="request-detail-section">
                  <div className="section-title">
                    <span className="icon">📅</span> {selectedRequest.type === "explanation"
                      ? "Thời gian thực tế"
                      : selectedRequest.type === "leave"
                      ? "Thời gian nghỉ"
                      : "Thời gian làm"}
                  </div>
                  <div className="section-grid">
                    <div className="input-group">
                      <label>{selectedRequest.type === "explanation"
                          ? "Thời gian vào"
                          : "Bắt đầu vào"}</label>
                      <div className="fake-input">
                       {selectedRequest.type === "explanation"
                          ? selectedRequest.start_time_ex
                          : `${moment(selectedRequest.start_datetime).format("DD/MM/YYYY")}${
                              selectedRequest.type === "overtime"
                                ? ` - ${selectedRequest.start_time}`
                                : ""
                            }`
                        }
                      </div>
                    </div>
                    <div className="input-group">
                      <label>{selectedRequest.type === "explanation"
                          ? "Thời gian ra"
                          : "Kết thúc vào"}</label>
                      <div className="fake-input">
                        {selectedRequest.type === "explanation"
                          ? selectedRequest.end_time_ex
                          : `${moment(selectedRequest.end_datetime).format("DD/MM/YYYY")}${
                              selectedRequest.type === "overtime"
                                ? ` - ${selectedRequest.end_time}`
                                : ""
                            }`
                        }
                      </div>
                    </div>
                  </div>
                  {selectedRequest.type !== "explanation" && (
                    <div className="total-time-badge">
                      Tổng thời gian {selectedRequest.type === 'leave' ? 'nghỉ' : 'làm'} dự kiến:{" "}
                      <span>
                        {selectedRequest.type === 'leave'
                          ? `${countDaysExcludingSunday(
                              selectedRequest.start_datetime,
                              selectedRequest.end_datetime
                            )} ngày`
                          : `${moment(selectedRequest.end_time, "HH:mm")
                              .diff(moment(selectedRequest.start_time, "HH:mm"), 'hours', true)} giờ`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Chi tiết thêm */}
                <div className="request-detail-section">
                  <div className="section-title">
                    <span className="icon">💬</span>{" "}
                      {selectedRequest.type === "explanation" ? "Giải trình" : "Chi tiết thêm"}
                  </div>
                  <div className="input-group full-width">
                    <label>{selectedRequest.type === "explanation" ? "Lý do giải trình cụ thể" : "Lý do cụ thể"}</label>
                    <div className="fake-textarea">
                      {selectedRequest.reason || "Không có lý do chi tiết."}
                    </div>
                  </div>
                  
                  {(selectedRequest.type === "leave" || selectedRequest.type === "explanation") && (
                    <div
                      className="input-group full-width"
                      style={{ marginTop: "15px" }}
                    >
                      <label>Tài liệu đính kèm</label>

                      <div className="attachment-box">
                        {selectedRequest.attachment ? (
                          <>
                            <span className="paperclip">📎</span>

                            {/* nếu backend lưu full URL hoặc file name */}
                            <span className="file-name">
                              {selectedRequest.attachment ? (
                                <a
                                  href={`http://localhost:5000/uploads/${selectedRequest.attachment}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="file-link"
                                >
                                  {selectedRequest.attachment}
                                </a>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>
                                  Không có tài liệu đính kèm
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>
                            Không có tài liệu đính kèm
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
{showRejectModal && (
  <div className="asp-modal-overlay" onClick={() => setShowRejectModal(false)}>
    <div className="asp-modal-content" onClick={(e) => e.stopPropagation()}>
      <h3>Lý do từ chối</h3>

      <textarea
        className="asp-modal-textarea"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="Nhập lý do chi tiết tại đây..."
      />

      <div className="asp-modal-actions">
        <button 
          className="asp-btn-cancel" 
          onClick={() => setShowRejectModal(false)}
        >
          Hủy
        </button>

        <button
          className="asp-btn-confirm"
          onClick={() => {
            if (!rejectReason.trim()) {
              alert("Vui lòng nhập lý do");
              return;
            }

            handleReject(
              rejectTarget.type,
              rejectTarget.id,
              rejectReason
            );

            setShowRejectModal(false);
            setRejectReason("");
            setRejectTarget(null);
          }}
        >
          Xác nhận từ chối
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Approvals;

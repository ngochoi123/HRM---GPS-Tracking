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
    }
});

import "./Approvals.css";

const Approvals = () => {
  
  const user = JSON.parse(localStorage.getItem("user")); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const leaveTypes = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  ot: "Nghỉ bù (OT)",
  maternity: "Nghỉ thai sản",
  bereavement: "Nghỉ tang"
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
  const handleApprove = async (type, id) => {
    try {
      await managerApprovals.approveRequest(type, id);
      setRequests(prev => prev.filter(r => r.id !== id || r.type !== type));
      alert("Đã phê duyệt đơn thành công!");
    } catch (err) {
      alert("Phê duyệt thất bại");
    }
  };

  const handleReject = async (type, id) => {
    try {
      await managerApprovals.rejectRequest(type, id);
      setRequests(prev => prev.filter(r => r.id !== id || r.type !== type));
      alert("Đã từ chối đơn!");
    } catch (err) {
      alert("Thao tác thất bại");
    }
  };

  // Logic lọc dữ liệu
  const filteredRequests = requests.filter(req => {
    if (filterType === 'all') return true;
    return req.type === filterType;
  });
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
                  
                >
                 <MdHistory  size={18} /> Lịch sử phê duyệt
                </button>
                <button
                  className="approvals-btn-all"
                  
                >
                  <CiCircleCheck strokeWidth={1} size={18}/>Duyệt tất cả
                </button>
              </div>

            
        </div>
        {/* ================= Stats bar ================= */}
        <div className="approvals-statsbar">
          <div className="approvals-statsbar-left">
            <div className="stat-group">
              <span className="stat-label">CHỜ DUYỆT</span>
              <span className="stat-number orange">12</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-group">
              <span className="stat-label">ĐÃ DUYỆT (TUẦN)</span>
              <span className="stat-number green">45</span>
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
          <p>Không có yêu cầu nào cần duyệt.</p>
        ) : (
          filteredRequests.map((req) => (
            <div className="request-card" key={`${req.type}-${req.id}`} style={{
              borderLeft: `5px solid ${req.type === 'leave' ? "#34D399" : "#7E22CE"}`
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
                  <span className={`tag-type ${req.type === 'leave' ? 'green-bg' : 'orange-bg'}`}>
                    {req.type === 'leave' ? (
                      <>
                        <CiCalendar size={15} style={{ marginRight: "4px" }} />
                        {leaveTypes[req.leave_type] || "Nghỉ khác"}
                      </>
                    ) : (
                      <>
                        <IoMoonOutline size={15} style={{ marginRight: "4px" }} />
                        Làm thêm giờ (OT)
                      </>
                    )}
                  </span>
                  <span className="tag-status"><CiClock2 style={{ display: 'block' }} /> {moment(req.created_at).fromNow()}</span>
                </div>
                <h4 className="request-title">{req.reason || "Không có lý do chi tiết"}</h4>
              
                <p className="request-time">
                    <span className="time-label">Thời gian:</span>{" "}
                    {moment(req.start_datetime).format('DD/MM/YYYY')} 
                    {req.type === 'overtime'
                      ? ` (${req.start_time} - ${req.end_time})`
                      : ` đến ${moment(req.end_datetime).format('DD/MM/YYYY')}`}
                </p>
              </div>

              <div className="card-action-section">
                <button className="btn-icon-view"><MdOutlineRemoveRedEye size={20} /></button>
                <div className="action-buttons">
                  <button className="btn-text-reject" onClick={() => handleReject(req.type, req.id)}>Từ chối</button>
                  <button className="btn-approve-primary" onClick={() => handleApprove(req.type, req.id)}>Phê duyệt</button>
                </div>
              </div>
            </div>
          ))
        )}

        </div>
    </div>
  );
};

export default Approvals;

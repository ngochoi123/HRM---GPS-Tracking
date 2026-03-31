import React, { useEffect, useState, useRef } from "react";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { HiMiniXCircle } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { FiClock } from "react-icons/fi";
import { PiClockCounterClockwise } from "react-icons/pi";
import axios from "axios";

import "./Requests.css";

const Requests = () => {
  const fileRef = useRef();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [view, setView] = useState("create"); 
// "create" | "history"

  const [notification, setNotification] = useState("");
  const [approvers, setApprovers] = useState([]); // danh sách người kiểm duyệt
  const [approverId, setApproverId] = useState(""); // id người được chọn

  const user = JSON.parse(localStorage.getItem("user"));


  // ----------------- Load approvers (trưởng trực tiếp + Director) -----------------
  useEffect(() => {
    if (view==="history" &&!user?.id) return;

    axios
      .get(`http://localhost:5000/api/employee/approvers/${user.id}`)
      .then((res) => {
        // res.data: [{id, full_name, role_code}, ...]
        setApprovers(res.data);
      })
      .catch((err) => console.error(err));
  }, [view,user?.id]);

  // ----------------- Submit -----------------
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!approverId) { alert("Chọn người kiểm duyệt!"); return; }


  

  const payload = new FormData();
  payload.append("userId", user.id);
  payload.append("leave_type", form.type);
  payload.append("start_datetime", form.startDate);
  payload.append("end_datetime", form.endDate);
  payload.append("reason", form.reason);
  payload.append("approverId", approverId);

  const fileInput = document.getElementById("file-upload");
  if (fileRef.current && fileRef.current.files.length > 0) {
  payload.append("attachment", fileRef.current.files[0]);
  }

  try {
        await axios.post(
          "http://localhost:5000/api/employee/leave-request",
          payload
        );

        setNotification("Gửi đơn thành công!");
        setTimeout(() => setNotification(""), 3000);

        const res = await axios.get(`http://localhost:5000/api/employee/leave-request/${user.id}`);
        setRequests(res.data);

      } catch (err) {
        console.error(err);
        setNotification("Lỗi tạo đơn!");
        setTimeout(() => setNotification(""), 3000);
      }
};

  const calculateDays = () => {
  if (!form.startDate || !form.endDate) return 0;

  const start = new Date(form.startDate);
  const end = new Date(form.endDate);

  const diffTime = end - start;

  if (diffTime < 0) return 0;

  const diffDays = diffTime / (1000 * 60 * 60 * 24) + 1;

  return diffDays;
};

  return (
    <div className="request-container">
      {notification && (
      <div className="toast">
        {notification}
      </div>)}

      {/* LEFT */}
      <div className="request-left">

        {view === "create" ? (
    <>
      {/* ================= HEADER ================= */}
      <div className="request-left-header">
        <div className="header-left">
          <h2>Tạo đơn nghỉ phép</h2>
          <p>Tạo và quản lý đơn nghỉ của bạn.</p>
        </div>
        <div className="header-right">
          <button className="btn-cannel">
            <HiMiniXCircle /> Hủy
          </button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="request-left-content">

        {/* THÔNG TIN CHUNG */}
        <div className="info-section">
          <h3 className="section-title">
            <FaRegFileAlt className="icon" /> Thông tin chung
          </h3>

          <div className="input-grid">
            <div className="input-group">
              <label>Loại đơn</label>
              <select
                className="input-option"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
                }
              >
                <option value="">Chọn loại đơn</option>
                <option value="annual">Nghỉ phép hàng năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="maternity">Nghỉ thai sản</option>
                <option value="bereavement">Nghỉ tang</option>
              </select>
            </div>

            <div className="input-group">
              <label>Người kiểm duyệt</label>
              <select
                className="input-option"
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
              >
                <option value="" disabled hidden>
                  Chọn người kiểm duyệt
                </option>
                {approvers.map((appr) => (
                  <option key={appr.id} value={appr.id}>
                    {appr.full_name} ({appr.position_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* THỜI GIAN */}
        <div className="info-section">
          <h3 className="section-title">
            <FaRegClock className="icon" /> Thời gian nghỉ
          </h3>

          <div className="input-grid">
            <div className="input-group">
              <label>Ngày bắt đầu</label>
              <input
                type="date"
                className="input-option"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>

            <div className="input-group">
              <label>Ngày kết thúc</label>
              <input
                type="date"
                className="input-option"
                value={form.endDate}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="info-section-bottom">
            <div className="info-section-bottom-left">
              <p>Tổng thời gian nghỉ dự kiến:</p>
            </div>
            <div className="info-section-bottom-right">
              <p>
                {!form.startDate || !form.endDate
                  ? "Chưa rõ"
                  : `${calculateDays()} Ngày`}
              </p>
            </div>
          </div>
        </div>

        {/* CHI TIẾT */}
        <div className="info-section">
          <h3 className="section-title">
            <MdChatBubbleOutline className="icon" /> Chi tiết thêm
          </h3>

          <div className="input-grid-1">
            <div className="input-group" style={{ marginTop: "20px" }}>
              <label>Lý do cụ thể</label>
              <input
                type="text"
                className="input-option-1"
                placeholder="Nhập lý do..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />
            </div>

            <div className="input-group" style={{ marginTop: "20px" }}>
              <label>Đính kèm tài liệu</label>
              <label htmlFor="file-upload" className="file-uploader">
                <IoCloudUploadOutline className="file-icon" />
                <div className="file-text">
                  <span className="file-bold">Nhấn để chọn file</span>
                </div>
                <div className="file-note">
                  PNG, JPG, PDF, Word (Max 10MB)
                </div>
                <input ref={fileRef} id="file-upload" type="file" hidden />
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* ================= FOOTER ================= */}
      <div className="acction-footer">
        <button className="btn-request" onClick={handleSubmit}>
          <BsSend /> Gửi
        </button>
      </div>
    </>
  ) : (
    <>
      {/* ================= HISTORY ================= */}
      <div className="history-header">
        <h2>Đơn đã gửi</h2>

        <div style={{ display: "flex", gap: "10px" }}>
          <input type="month" />
          <button>🔍</button>

          <button onClick={() => setView("create")}>
            ← Quay lại
          </button>
        </div>
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Loại đơn</th>
            <th>Trạng thái</th>
          </tr>
        </thead>

        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan="3">Không có dữ liệu</td>
            </tr>
          ) : (
            requests.map((r) => (
              <tr key={r.id}>
                <td>{r.start_datetime}</td>
                <td>{r.leave_type}</td>
                <td>{r.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )}



      </div>

      {/* RIGHT */}
      <div className="request-right">
        <div className="card-request-top">
          <div className="card-header">
            <FiClock style={{ fontSize: "20px" }} />
            <span>Quỹ phép năm 2026</span>
          </div>

          <div className="card-main-value">
            <span className="remaining-days">08.5</span>
            <span className="total-days">/ 12 ngày</span>
          </div>

          <div className="card-sub-text">Số phép còn lại có thể sử dụng</div>

          <div className="card-footer">
            <div className="usage-info">
              <span>Đã dùng: 3.5 ngày</span>
              <span>29%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "29%" }}></div>
            </div>
          </div>

          <svg
            className="umbrella-bg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 12a11.02 11.02 0 0 0-22 0zm-11 0v9"></path>
            <path d="M9 21a3 3 0 0 0 6 0"></path>
          </svg>
        </div>

        <div className="card-request-bot">
          <div className="card-header-bot">
            <h3 className="card-header-bot-2">
              <PiClockCounterClockwise
                style={{ fontSize: "17px", color: "green" }}
              />
              Đơn gần đây
            </h3>
            <button className="btn-all" onClick={() => setView("history")} >Xem tất cả</button>
          </div>

          <div className="card-content-bot">{/* load đơn gần đây */}</div>
        </div>
      </div>


    </div>
  );
};

export default Requests;
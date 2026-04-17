import React, { useState, useEffect } from 'react';
import axiosClient from "../../api/axiosClient";
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import { employeeService } from "../../services/employeeService";
import { IoArrowBack } from "react-icons/io5";
import { GoCheckCircle } from "react-icons/go";
import { MdCalendarMonth } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { LuClock2 } from "react-icons/lu";
import { GoBlocked } from "react-icons/go";
import './ae_request.css'
const attendance_explanation_request = () => {

    const fileRef = React.useRef();

const user = JSON.parse(localStorage.getItem("user") || "{}");
const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
const [showConfirmCancel, setShowConfirmCancel] = useState(false);
const [notification, setNotification] = useState("");

const [form, setForm] = useState({
  date: "",
  type: "",
  checkin: "",
  checkout: "",
  reason: "",
});

const [approverId, setApproverId] = useState("");
const [approvers, setApprovers] = useState([]);
useEffect(() => {
  if (!user?.id) return;

  employeeService
    .getApprovers(user.id)
    .then((res) => setApprovers(res?.data || res || []))
    .catch(console.error);
}, [user?.id]);
const handleSubmit = async () => {
  if (!approverId) {
    setShowConfirmSubmit(false);
    setNotification("Chọn người kiểm duyệt!");
    return;
  }

  const formData = new FormData();

  formData.append("userId", user.id);
  formData.append("attendance_date", form.date);
  formData.append("explanation_type", form.type);
  formData.append("proposed_check_in", form.checkin);
  formData.append("proposed_check_out", form.checkout);
  formData.append("reason", form.reason);
  formData.append("approverId", approverId);

  if (fileRef.current?.files[0]) {
    formData.append("attachment", fileRef.current.files[0]);
  }

  try {
    await employeeService.createExplanationRequest(formData);

    setNotification("Gửi giải trình thành công!");
    setShowConfirmSubmit(false);

    handleResetForm(); 

    setTimeout(() => {
      setNotification("");
    }, 3000);

  } catch (err) {
    console.error(err.response?.data || err);
    setNotification("Gửi thất bại!");
  }
};
const handleResetForm = () => {
  setForm({
    date: "",
    type: "",
    checkin: "",
    checkout: "",
    reason: "",
  });

  setApproverId("");

  if (fileRef.current) fileRef.current.value = "";
  setSelectedFile(null);

  setShowConfirmCancel(false);
};
    return(
        <div className="request-container">
            {notification && (
            <div className="toast">
                {notification}
            </div>
            )}
            <div className="request-left">
                <div className="request-left-header">
                    <div className="header-left">
                         <h2 style={{color:"#ef4444"}} >Tạo đơn xin giải trình</h2>
                        <p>Tạo và báo cáo giải trình của bạn.</p>
                    </div>
                    <div className="header-right">
                        <button className="btn-cannel" onClick={() => setShowConfirmCancel(true)}>
                            <HiMiniXCircle  /> Hủy
                        </button>
                    </div>
                </div>
                <div className="request-left-content">
                    <div className="info-section">
                        
                        <h3 className="section-title">
                            <FaRegFileAlt className="icon" style={{ color: "red" }}/> Thông tin chung
                        </h3>
                        
                        <div className="input-grid">
                            <div className="input-group">
                                <label>Ngày cần giải trình</label>
                                <input
                                    type="date"
                                    className="input-option"
                                    value={form.date}
                                    onChange={(e) =>
                                        setForm({ ...form, date: e.target.value })
                                    }

                                />
                            </div>
                            <div className="input-group">
                                <label>Loại giải trình</label>
                                <select
                                    className="input-option"
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm({ ...form, type: e.target.value })
                                    }
                                    >
                                    <option value="">Chọn loại giải trình </option>

                                    <option value="forgot_checkin">Quên chấm công vào</option>
                                    <option value="forgot_checkout">Quên chấm công ra</option>
                                    <option value="system_error">Lỗi hệ thống</option>
                                    <option value="late_arrival">Đi muộn</option>
                                    <option value="early_leave">Về sớm</option>
                                </select>
                            </div>
                            
                        </div>
                        <div className="info-section-bottom-ae-request">
                            <div className="info-section-bottom-ae-request-left">
                                <p>Người kiểm duyệt:</p>
                            </div>
                            <div className="info-section-bottom-ae-request-right">
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
                    <div className="info-section">
                        <h3 className="section-title">
                            <FaRegClock className="icon" style={{ color: "red" }}/> Thời gian thực tế
                        </h3>
                        <div className="input-grid">
                            <div className="input-group">
                                <label>Thời gian vào</label>
                                <input
                                    type="time"
                                    className="input-option"
                                    value={form.checkin}
                                    onChange={(e) =>
                                        setForm({ ...form, checkin: e.target.value })
                                    }
                                />
                            </div>
                            <div className="input-group">
                                <label>Thời gian ra</label>
                                <input
                                    type="time"
                                    className="input-option"
                                    value={form.checkout}
                                    onChange={(e) =>
                                        setForm({ ...form, checkout: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        
                        
                    </div>
                    <div className="info-section">
                        <h3 className="section-title">
                            <MdChatBubbleOutline className="icon" style={{ color: "red" }}/> Giải trình
                        </h3>
                        <div className="input-grid-1">
                            <div className="input-group" style={{ marginTop: "10px" }}>
                            <label>Lý do cụ thể</label>
                            <textarea
                                className="input-option-1"
                                value={form.reason}
                                onChange={(e) =>
                                    setForm({ ...form, reason: e.target.value })
                                }
                                placeholder="Giải trình lý do cụ thể..."

                            />
                            </div>
                            <div className="input-group" style={{ marginTop: "20px" }}>
                                          <label>Đính kèm tài liệu</label>
                                          <label htmlFor="file-upload" className="file-uploader">
                                            <IoCloudUploadOutline className="file-icon" style={{color:"red"}} />
                                            <div className="file-text">
                                              <span className="file-bold" style={{color:"red"}}>Nhấn để chọn file</span>
                                            </div>
                                            <div className="file-note">
                                              PNG, JPG, PDF, Word (Max 10MB)
                                            </div>
                                            <input  id="file-upload" type="file" hidden />
                                          </label>
                            </div>
                        </div>
                    </div>
                    
                </div>

                <div className="acction-footer">
                    <button className="btn-request" style={{background:"red"}} onClick={() => setShowConfirmSubmit(true)} >
                        <BsSend /> Gửi
                    </button>
                </div>
            </div>
            <div className="request-right">

                <div className="card-request-top" style={{background:"linear-gradient(135deg, #ef4444 40%, #f97316 100%)"}}></div>

                <div className="card-request-bot" style={{minHeight:"765px"}}>
                    <div className="card-header-bot">
                            <h3 className="card-header-bot-2">
                            <PiClockCounterClockwise
                                style={{ fontSize: "17px", color: "red" }}
                            />
                                Đơn gần đây
                            </h3>
                            <button className="btn-all" style={{color:"red"}} >Xem tất cả</button>
                    </div>
                </div>
            </div>

            {showConfirmSubmit && (
  <div className="modal-overlay" onClick={() => setShowConfirmSubmit(false)}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận gửi đơn</h3>
      <p>Bạn có chắc muốn gửi đơn giải trình không?</p>

      <div className="confirm-actions">
        <button className="btn-confirm" onClick={handleSubmit} style={{background:"red"}}>
          Đồng ý
        </button>
        <button className="btn-cancel" onClick={() => setShowConfirmSubmit(false)}>
          Hủy
        </button>
      </div>
    </div>
  </div>
)}

{showConfirmCancel && (
  <div className="modal-overlay" onClick={() => setShowConfirmCancel(false)}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <h3 style={{fontWeight:"bold",fontSize:"18px"}}>Xác nhận hủy</h3>
      <p>Dữ liệu sẽ bị xóa toàn bộ</p>

      <div className="confirm-actions">
        <button className="btn-danger" onClick={handleResetForm}>
          Xóa dữ liệu
        </button>

        <button className="btn-cancel" onClick={() => setShowConfirmCancel(false)}>
          Quay lại
        </button>
      </div>
    </div>
  </div>
)}

        </div>



    );
};

export default attendance_explanation_request;
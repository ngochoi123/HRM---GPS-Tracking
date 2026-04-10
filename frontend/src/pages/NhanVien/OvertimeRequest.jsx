import React, { useState, useEffect } from 'react';
import axios from "axios";
import { HiMiniXCircle } from "react-icons/hi2";
import { MdChatBubbleOutline } from "react-icons/md";
import { BsSend } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { FaUser, FaRegFileAlt, FaRegClock } from "react-icons/fa";
import './OvertimeRequest.css'
const OvertimeRequest = () => {
  const [form, setForm] = useState({
    ot_date: "",
    start_time: "",
    end_time: "",
    reason: ""
  });

const handleSubmit = async () => {
  if (!form.ot_date || !form.start_time || !form.end_time || !approverId) {
    alert("Vui lòng nhập đầy đủ thông tin!");
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const payload = {
      employee_id: user.id,
      ot_date: form.ot_date,
      start_time: form.start_time,
      end_time: form.end_time,
      reason: form.reason,
      approver_id: approverId
    };

    await axios.post(
      "http://localhost:5000/api/employee/overtime-request",
      payload
    );

    alert("Gửi đơn tăng ca thành công!");

    setForm({
      ot_date: "",
      start_time: "",
      end_time: "",
      reason: ""
    });

    setApproverId(""); 

  } catch (err) {
    console.error(err);
    alert("Lỗi gửi đơn!");
  }
};

  const calculateHours = () => {
    if (!form.start_time || !form.end_time) return "Chưa rõ";

    const [h1, m1] = form.start_time.split(":").map(Number);
    const [h2, m2] = form.end_time.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    if (end <= start) return "Không hợp lệ";

    const diff = end - start;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return `${hours}h ${minutes}p`;
   };

  const [approvers, setApprovers] = useState([]);   // danh sách
  const [approverId, setApproverId] = useState(""); // người chọn

  const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
    if (!user?.id) return;

    axios
        .get(`http://localhost:5000/api/employee/approvers/${user.id}`)
        .then((res) => {
        setApprovers(res.data);
        })
        .catch((err) => console.error(err));
    }, [user?.id]);
  return (
    <div className="request-container">
    
      <div className="request-left">

        <div className="request-left-header">
            <div className="header-left">
                <h2>Tạo xin đơn tăng ca</h2>
                <p>Tạo và quản lý đơn tăng ca của bạn.</p>
            </div>
            <div className="header-right">
                <button className="btn-cannel">
                    <HiMiniXCircle /> Hủy
                </button>
            </div>
        </div>

        <div className="request-left-content">
            <div className="info-section">
                <h3 className="section-title">
                    <FaRegFileAlt className="icon" /> Thông tin chung
                </h3>
                <div className="input-grid">
                    <div className="input-group">
                        <label>Ngày tăng ca</label>
                        <input
                            type="date"
                            className="input-option"
                            value={form.ot_date}
                            onChange={(e) =>
                                setForm({ ...form, ot_date: e.target.value })
                            }
                        />
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

            <div className="info-section">
                <h3 className="section-title">
                    <FaRegClock className="icon" /> Thời gian tăng ca
                </h3>
                <div className="input-grid">
                    <div className="input-group">
                        <label>Thời gian bắt đầu tăng ca</label>
                        <input
                            type="time"
                            className="input-option"
                            value={form.start_time}
                            onChange={(e) =>
                                setForm({ ...form, start_time: e.target.value })
                            }
                        />
                    </div>

                    <div className="input-group">
                        <label>Thời gian kết thúc tăng ca</label>
                        <input
                            type="time"
                            className="input-option"
                            value={form.end_time}
                            onChange={(e) =>
                                setForm({ ...form, end_time: e.target.value })
                            }
                        />
                    </div>
                   
                </div>
                <div className="info-section-bottom">
                        <div className="info-section-bottom-left">
                            <p>Tổng thời gian tăng ca dự kiến:</p>
                        </div>
                        <div className="info-section-bottom-right">
                            <p>{calculateHours()}   
                            </p>
                        </div>
                    </div>
            </div>

            <div className="info-section">
                <h3 className="section-title">
                    <MdChatBubbleOutline className="icon" /> Nội dung công việc
                </h3>

                <div className="input-grid-1">
                    <div className="input-group" style={{ marginTop: "20px" }}>
                    <label>Mô tả nội dung công việc</label>
                    <textarea
                        className="input-option-1"
                        value={form.reason}
                        onChange={(e) =>
                            setForm({ ...form, reason: e.target.value })
                        }
                    />
                    </div>
                </div>

            </div>

        </div>

        <div className="acction-footer">
            <button className="btn-request" onClick={handleSubmit} >
                <BsSend /> Gửi
            </button>
        </div>

      </div>

      <div className="request-right">
        <div className="card-request-top"></div>
        <div className="card-request-bot-1">
            <div className="card-header-bot">
                <h3 className="card-header-bot-2">
                    <PiClockCounterClockwise style={{ fontSize: "17px", color: "green" }}
                    /> Đơn gần đây
                </h3>
                <button className="btn-all" onClick={() => setView("history")} >Xem tất cả</button>
            </div>
        </div>

      </div>

    </div>
  );
};

export default OvertimeRequest;
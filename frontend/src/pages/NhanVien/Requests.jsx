import React, { useEffect, useState } from "react";
import { FaUser, FaRegFileAlt,FaRegClock } from "react-icons/fa";
import { MdChatBubbleOutline } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { HiMiniXCircle } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { FiClock } from "react-icons/fi";
import axios from "axios";
import { PiClockCounterClockwise } from "react-icons/pi";

import "./Requests.css";

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  // load danh sách đơn
  useEffect(() => {
    if (!user?.id) return;

    axios
      .get(`http://localhost:5000/api/employee/leave-request/${user.id}`)
      .then(res => setRequests(res.data))
      .catch(err => console.error(err));
  }, []);

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://localhost:5000/api/employee/leave-request",
        {
          userId: user.id,
          ...form
        }
      );

      alert("Tạo đơn thành công!");

      // reload list
      const res = await axios.get(
        `http://localhost:5000/api/employee/leave-request/${user.id}`
      );
      setRequests(res.data);

    } catch (err) {
      console.error(err);
      alert("Lỗi tạo đơn!");
    }
  };

  return (
    <div className="request-container">
      
      {/* LEFT */}
      <div className="request-left">
          {/* LEFT - header*/}
        <div className="request-left-header">
          <div className="header-left">
              <h2>Tạo đơn</h2>
              <p>Tạo và quản lý đơn nghỉ của bạn.</p>
              </div>

              <div className="header-right">               
                <button className="btn-cannel" ><HiMiniXCircle/> Hủy</button>
              </div>
        </div>

          {/* LEFT - content*/}
        <div className="request-left-content">
          <div className="info-section">
              <h3 className="section-title"><FaRegFileAlt className="icon" /> Thông tin chung</h3>
              
              <div className="input-grid">
                <div className="input-group">
                  <label>Loại đơn</label>
                   <select className="input-option">
                    <option value="" disabled hidden>
                      Chọn loại đơn
                    </option>
                    <option value="leave">Nghỉ phép</option>
                    <option value="business_trip">Công tác</option>
                    <option value="confirmation">Xác nhận</option>
                  </select>
                </div>

                 <div className="input-group">
                  <label>Người kiểm duyệt</label>
                   <select className="input-option" >
                    <option value="" disabled hidden>
                      Chọn người kiểm duyệt
                    </option>
                    <option value="leave">Trần Lỉnh</option>
                    <option value="business_trip">Lỉnh Trần</option>
                    <option value="confirmation">Quốc Lỉnh</option>
                  </select>
                </div>
              </div>
            


          </div>

          <div className="info-section">
            <h3 className="section-title"><FaRegClock className="icon" /> Thời gian nghỉ</h3>
              
              <div className="input-grid">
                <div className="input-group">
                  <label>Ngày bắt đầu</label>
                   <input
                    type="date"
                    className="input-option"
                  />
                </div>

                 <div className="input-group">
                  <label>Ngày kết thúc</label>
                   <input
                    type="date"
                    className="input-option"
                  />
                </div>
              </div>

              <div className="info-section-bottom">

                <div className="info-section-bottom-left">
                  <p>Tổng thời gian nghỉ dự kiến:</p>
                </div>

                <div className="info-section-bottom-right">
                  <p>2 Ngày</p>
                </div>

            </div>

          </div>


          <div className="info-section">
              <h3 className="section-title"><MdChatBubbleOutline  className="icon" /> Chi tiết thêm</h3>
              
              <div className="input-grid-1">

                <div className="input-group" style={{marginTop:"20px"}}>
                  <label>Lý do cụ thể</label>
                  <input
                          type="text"
                          className="input-option-1"
                          placeholder="Nhập lý do..."
                  />
                </div>
                <div className="input-group" style={{marginTop:"20px"}}>
                  <label>Đính kèm tài liệu,tệp (Hình ảnh/PDF/Word)</label>
                  <label htmlFor="file-upload" className="file-uploader">
                    <IoCloudUploadOutline className="file-icon"/> {/* icon upload */}
                    <div className="file-text">
                      <span className="file-bold">Nhấn để chọn file</span> hoặc kéo thả vào đây
                    </div>
                    <div className="file-note">
                      Hỗ trợ định dạng: PNG, JPG, PDF, Word (Tối đa 10MB)
                    </div>
                    <input id="file-upload" type="file" hidden />
                  </label>
                </div>
                  
                 
              </div>



          </div>
        </div>

        <div className="acction-footer">
          <button className="btn-request"><BsSend/> Gửi</button>
        </div>

      </div>




      <div className="request-right">


          <div className="card-request-top">
                <div className="card-header">
                  <FiClock style={{fontSize:"20px"}}/> {/* Bạn có thể dùng FontAwesome hoặc SVG */}
                  <span>Quỹ phép năm 2026</span>
                 </div>

              <div className="card-main-value">
                <span className="remaining-days">08.5</span>
                <span className="total-days">/ 12 ngày</span>
              </div>

              <div className="card-sub-text">
                Số phép còn lại có thể sử dụng
              </div>

              <div className="card-footer">
                <div className="usage-info">
                  <span>Đã dùng: 3.5 ngày</span>
                  <span>29%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '29%' }}></div>
                </div>
              </div>

              {/* Biểu tượng chiếc ô mờ ở góc */}
              
              <svg class="umbrella-bg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 12a11.02 11.02 0 0 0-22 0zm-11 0v9"></path>
                <path d="M9 21a3 3 0 0 0 6 0"></path>
              </svg>
          </div>


        <div className="card-request-bot">

          <div className="card-header-bot">
            <h3 className="card-header-bot-2"><PiClockCounterClockwise style={{fontSize:"17px",color:"green"}}/>Đơn gần đây</h3>
            <button className="btn-all">Xem tất cả</button>
          </div>

          <div className="card-content-bot">

          </div>

        </div>
      </div>


    </div>
  );
};

export default Requests;
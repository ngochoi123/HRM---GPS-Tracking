import React, { useEffect, useState } from "react";
import { FaUser, FaCalendarAlt, FaBriefcase } from "react-icons/fa";
import axios from "axios";
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
              <h2>Đơn nghỉ phép</h2>
              <p>Tạo và quản lý đơn nghỉ của bạn.</p>
              </div>

              <div className="header-right">               
                <span className="badge-green">Hủy</span>
              </div>
        </div>

          {/* LEFT - content*/}
        <div className="request-left-content">
          <div className="info-section">
              <h3 className="section-title"><FaUser className="icon" /> Thông tin chung</h3>
              
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
            <h3 className="section-title"><FaUser className="icon" /> Thông tin chung</h3>
              
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
              <h3 className="section-title"><FaUser className="icon" /> Thông tin chung</h3>
              
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
        </div>
      </div>
      <div className="request-right">
        <div className="card-request-top">

        </div>
        <div className="card-request-bot">

        </div>
      </div>


    </div>
  );
};

export default Requests;
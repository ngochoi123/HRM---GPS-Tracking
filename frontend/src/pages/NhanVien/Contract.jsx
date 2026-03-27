import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Contract.css";
import { FaUser, FaFileAlt, FaCalendarAlt, FaBriefcase } from "react-icons/fa"; // Cài đặt: npm install react-icons

const Contract = () => {
  const [contract, setContract] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userLocal = JSON.parse(localStorage.getItem("user"));
    if (!userLocal?.id) return;

    axios
      .get(`http://localhost:5000/api/employee/contract/${userLocal.id}`)
      .then((res) => setContract(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!contract) return <div className="loading">Đang tải hợp đồng...</div>;

  return (
    <div className="contract-container">
      <div className="contract-header">
        <div className="header-left">
          <h2>Hợp đồng lao động</h2>
          <p>Chi tiết hợp đồng lao động.</p>
        </div>
        <div className="header-right">
          <span className="badge-gray">Thời hạn:</span>
          <span className="badge-green">1 năm</span>
        </div>
      </div>

      <div className="contract-content">
        {/* Section 1: Thông tin chung */}
        <section className="info-section">
          <h3 className="section-title"><FaUser className="icon" /> Thông tin chung</h3>
          <div className="input-grid">
            <div className="input-group">
              <label>Tên người lao động</label>
              <input type="text" value={contract.full_name} readOnly />
            </div>
            <div className="input-group">
              <label>Số/Mã hợp đồng</label>
              <input type="text" value={contract.contract_number} readOnly />
            </div>
          </div>
        </section>

        {/* Section 2: Thời gian nghỉ */}
        <section className="info-section">
          <h3 className="section-title"><FaCalendarAlt className="icon" /> Thời gian</h3>
          <div className="input-grid">
            <div className="input-group">
              <label>Bắt đầu từ</label>
              <input type="text" value={contract.start_date} readOnly />
            </div>
            <div className="input-group">
              <label>Kết thúc vào</label>
              <input type="text" value={contract.end_date || "mm/dd/yyyy"} readOnly />
            </div>
          </div>
        </section>

        {/* Section 3: Chi tiết công việc */}
        <section className="info-section">
          <h3 className="section-title"><FaBriefcase className="icon" /> Chi tiết công việc</h3>
          <div className="input-grid">
            <div className="input-group">
              <label>Phòng ban</label>
              <input type="text" value={contract.department_name} readOnly />
            </div>
            <div className="input-group">
              <label>Loại hợp đồng</label>
              <input
                    type="text"
                    value={
                    contract.contract_type === "fixed_3y"
                        ? "3 năm"
                        : contract.contract_type === "fixed_1y"
                        ? "1 năm"
                        : contract.contract_type === "indefinite"
                            ? "Không xác định thời hạn"
                            : "Chưa có dữ liệu"
                    }
                    readOnly
                />
            </div>
            <div className="input-group">
              <label>Chức vụ</label>
              <input type="text" value={contract.position_name} readOnly />
            </div>
            <div className="input-group">
              <label>Lương/Tháng</label>
              <input type="text" value={`${Number(contract.base_salary).toLocaleString()} VND`} readOnly />
            </div>
          </div>
        </section>

        <div className="action-footer">
            <button className="btn-back" onClick={() => navigate('/NhanVien/profile')}>← Quay lại</button>
        </div>
      </div>
    </div>
  );
};

export default Contract;
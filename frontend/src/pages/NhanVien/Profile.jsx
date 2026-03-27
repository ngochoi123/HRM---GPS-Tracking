import React, { useEffect, useState } from "react";
import axios from "axios";
import { IoPersonSharp } from "react-icons/io5";
import { FiBriefcase } from "react-icons/fi";
import { ImProfile } from "react-icons/im";
import { LuPhone } from "react-icons/lu";
import { MdOutlineEmail } from "react-icons/md";
import { FaAddressBook } from "react-icons/fa";
import "./Profile.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async () => {
  try {
    const userLocal = JSON.parse(localStorage.getItem("user"));

    const res = await axios.post(
      "http://localhost:5000/api/employee/change-password",
      {
        userId: userLocal.id,
        oldPassword,
        newPassword,
      }
    );

    alert(res.data.message);
    setShowModal(false);

  } catch (err) {
    alert(err.response?.data?.message || "Lỗi");
  }
};


  useEffect(() => {
    
    const userLocal = JSON.parse(localStorage.getItem("user"));
    if (!userLocal?.id) return;

    axios
      .get(`http://localhost:5000/api/employee/profile/${userLocal.id}`)
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!user) {
    return <div className="profile-page-background">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="profile-page-background">
      <div className="profile-content-wrapper">

        {/* ===== MAIN CARD ===== */}
        <div className="card-main">

          {/* ===== HEADER ===== */}
          <div className="profile-top-bar">
            <div>
              <h2 className="main-title"><span className="icon-wrapper"><ImProfile className="icon-main" /></span>Thông tin cá nhân</h2>
              <p className="sub-text">
                Thông tin cá nhân, hợp đồng lao động của bạn.
              </p>
            </div>

            <button className="btn-back-outline">
              ← Quay lại
            </button>
          </div>

          {/* ===== SUMMARY ===== */}
          <div className="card-summary">
            
            {/* Avatar */}
            <div className="avatar-wrapper">
              <img
                src={user.avatar_url || "https://i.pravatar.cc/150"}
                alt="avatar"
              />
              <div className="online-status-dot"></div>
            </div>

            {/* Info */}
            <div>
              <h3>
                {user.full_name}
                <span className="badge-active">● Đang làm việc</span>
              </h3>

              <p className="sub-text">
                💼 {user.position_name} ({user.department_name})
              </p>

              <div className="pill-group">
                <span className="icon-pill-group-m"><FaAddressBook className="icon-pill-group"/> {user.employee_code}</span>
                <span className="icon-pill-group-m"><MdOutlineEmail className="icon-pill-group" /> {user.work_email}</span>
                <span className="icon-pill-group-m"><LuPhone className="icon-pill-group" /> {user.phone_number}</span>
              </div>
            </div>
          </div>

          {/* ===== GRID ===== */}
          <div className="profile-details-grid">

            {/* ==== PERSONAL ==== */}
            <div className="card-detail">
              <h4 className="card-title text-green">
                <IoPersonSharp className="icon-green" /> Thông tin cá nhân
              </h4>

              <div className="data-row">
                <span className="label">Họ và tên</span>
                <span className="value">{user.full_name}</span>
              </div>

              <div className="data-row">
                <span className="label">CCCD</span>
                <span className="value">
                  {user.identity_card_number || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Ngày sinh</span>
                <span className="value">
                  {user.date_of_birth || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Giới tính</span>
                <span className="value">
                  {user.gender ? "Nam" : "Nữ"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Email cá nhân</span>
                <span className="value">
                  {user.personal_email || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Tài khoản ngân hàng</span>
                <span className="value">
                  {user.bank_account_number || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Địa chỉ</span>
                <span className="value">
                  {user.address || "—"}
                </span>
              </div>
            </div>

            {/* ==== WORK ==== */}
            <div className="card-detail">
              <h4 className="card-title text-brown">
                <FiBriefcase className="icon-green" /> Thông tin công việc
              </h4>

              <div className="data-row">
                <span className="label">Phòng ban</span>
                <span className="value">{user.department_name}</span>
              </div>

              <div className="data-row">
                <span className="label">Chức vụ</span>
                <span className="value">{user.position_name}</span>
              </div>

              <div className="data-row">
                <span className="label">Loại hợp đồng</span>
                <span className="contract-badge">
                  Xác định thời hạn (3 năm)
                </span>
              </div>

              <div className="data-row">
                <span className="label">Ngày gia nhập</span>
                <span className="value">
                  {user.join_date || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Quản lý trực tiếp</span>
                <span className="value">
                  {user.manager_name || "—"}
                </span>
              </div>
            </div>

          </div>

          {/* ===== FOOTER ===== */}
          <div className="profile-footer">
            <button className="btn-password" onClick={() => setShowModal(true)}>
              🔒 Đổi mật khẩu
            </button>

            <button className="btn-contract">
              📄 Hợp đồng lao động
            </button>
          </div>
          
        </div>

        {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 >Đổi mật khẩu</h3>

            <input
              type="password"
              placeholder="Mật khẩu cũ"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <button onClick={handleChangePassword} className="accpet">
              Xác nhận
            </button>

            <button onClick={() => setShowModal(false)} className="canncel" >
              Huỷ
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { IoPersonSharp } from "react-icons/io5";
import { FiBriefcase } from "react-icons/fi";
import { ImProfile } from "react-icons/im";
import { LuPhone } from "react-icons/lu";
import { MdOutlineEmail } from "react-icons/md";
import { FaAddressBook } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router-dom";

import "./Profile.css";
import { employeeService } from "../../services/employeeService";

export default function Profile() {
    const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const { id } = useParams();
  const [showContractModal, setShowContractModal] = useState(false);
const [contractMessage, setContractMessage] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGoContract = () => {
    if (!user?.contract_type) {
        setContractMessage("Nhân viên chưa có hợp đồng");
        setShowContractModal(true);
        return;
      }

    const isActive =
      user?.is_active === true ||
      user?.is_active === 1;

    if (!isActive) {
      setContractMessage("Hợp đồng đã hết hiệu lực");
      setShowContractModal(true);
      return;
    }

    navigate("/NhanVien/contracts");
  };

const handleCloseModal = () => {
  setShowModal(false);

  // reset toàn bộ form
  setOldPassword("");
  setNewPassword("");
  setConfirmPassword("");
  setModalMessage("");
};

const handleChangePassword = async () => {

  if (!oldPassword || !newPassword || !confirmPassword) {
  setModalMessage("Vui lòng nhập đầy đủ thông tin!");
  return;
  }

  if (oldPassword === newPassword) {
    setModalMessage("Mật khẩu mới không được trùng mật khẩu!");
    return;
  }

  // Kiểm tra mật khẩu mới vs xác nhận
  if (newPassword !== confirmPassword) {
    setModalMessage("Mật khẩu mới và xác nhận không khớp!");
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

  if (!passwordRegex.test(newPassword)) {
    setModalMessage(
      "Mật khẩu mới phải tối thiểu 6 ký tự, gồm chữ thường, chữ hoa và số!"
    );
    return;
  }

  try {
    const userLocal = JSON.parse(localStorage.getItem("user"));

    await employeeService.changePassword({
      userId: userLocal.id,
      oldPassword,
      newPassword,
    });
      setModalMessage("Đổi mật khẩu thành công!");

      // reset input
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // tự đóng sau 2s
      setTimeout(() => {
        setShowModal(false);
        setModalMessage("");
      }, 2000);


  } catch (err) {
    setModalMessage(err.response?.data?.message || "Lỗi khi đổi mật khẩu");
  }
};


useEffect(() => {
  const userLocal = JSON.parse(localStorage.getItem("user"));

  const targetId = id || userLocal?.id; // ✅ nếu có id thì dùng id, không thì dùng user hiện tại

  if (!targetId) return;

  employeeService
    .getProfile(targetId)
    .then((res) => setUser(res))
    .catch((err) => console.error(err));
}, [id]);

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
          
            <div>
              <button
                className="btn-back-outline"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
            </div>

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
                <span className="label">Họ và tên:</span>
                <span className="value">{user.full_name}</span>
              </div>

              <div className="data-row">
                <span className="label">CCCD:</span>
                <span className="value">
                  {user.identity_card_number || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Ngày sinh:</span>
                <span className="value">
                  {user.date_of_birth || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Giới tính:</span>
                <span className="value">
                  {user.gender ? "Nam" : "Nữ"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Email cá nhân:</span>
                <span className="value">
                  {user.personal_email || "—"}
                </span>
              </div>
              
              <div className="data-row">
                <span className="label">Ngân hàng:</span>
                <span className="value">
                  {user.bank_name || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Số tài khoản:</span>
                <span className="value">
                  {user.bank_account_number || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Địa chỉ:</span>
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
                <span className="label">Phòng ban:</span>
                <span className="value">{user.department_name}</span>
              </div>

              <div className="data-row">
                <span className="label">Chức vụ:</span>
                <span className="value">{user.position_name}</span>
              </div>

              <div className="data-row">
                <span className="label">Loại hợp đồng:</span>
                <span className="contract-badge">
                  {user.contract_type === "fixed_3y"
                    ? "Xác định thời hạn (3 năm)"
                    : user.contract_type === "fixed_1y"
                      ? "Xác định thời hạn (1 năm)"
                      : user.contract_type === "indefinite"
                        ? "Không xác định thời hạn"
                        : "Chưa có hợp đồng"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Ngày gia nhập:</span>
                <span className="value">
                  {user.join_date || "—"}
                </span>
              </div>

              <div className="data-row">
                <span className="label">Quản lý trực tiếp:</span>
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

            <button className="btn-contract" onClick={handleGoContract}>
              📄 Hợp đồng lao động
            </button>
          </div>
          
        </div>

       {showModal && (
          <div className="modal" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Đổi mật khẩu</h3>

              <div className="password-input">
                <input
                  type={showOld ? "text" : "password"}
                  placeholder="Mật khẩu cũ"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />

                <span onClick={() => setShowOld(!showOld)}>
                  {showOld ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>

              <div className="password-input">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <span onClick={() => setShowNew(!showNew)}>
                    {showNew ? <FiEyeOff /> : <FiEye />}
                  </span>
                </div>

              <div className="password-input">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <span onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>

              {modalMessage && (
                <p className={`modal-message-text ${modalMessage.includes("thành công") ? "success" : "error"}`}>
                  {modalMessage}
                </p>
              )}

              <button onClick={handleChangePassword} className="accpet">
                Xác nhận
              </button>

              <button onClick={handleCloseModal} className="canncel">
                Huỷ
              </button>
            </div>
          </div>
        )}
        {showContractModal && (
  <div className="modal" onClick={() => setShowContractModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>

      <h3 className="modal-title">Thông báo</h3>

      <p className="modal-message">
        {contractMessage}
      </p>

      <button
        onClick={() => setShowContractModal(false)}
        className="btn-ok"
      >
        OK
      </button>

    </div>
  </div>
        )}

      </div>
    </div>
  );
}
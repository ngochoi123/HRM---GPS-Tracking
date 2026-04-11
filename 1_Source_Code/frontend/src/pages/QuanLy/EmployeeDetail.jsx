import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Briefcase, ShieldCheck, Mail, Phone, Hash, Loader2, Key, Edit } from 'lucide-react';
import { managerEmployeeService } from '../../services/managerEmployeeService';
import { adminUserService } from '../../services/adminUserService';

export default function EmployeeDetail({ employee, onBack, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Gọi API kéo full data chi tiết của nhân viên này
    const fetchDetail = async () => {
      try {
        const res = await managerEmployeeService.getEmployeeById(employee.id);
        setDetail(res);
      } catch (error) {
        console.error("Lỗi khi kéo chi tiết nhân viên:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employee && employee.id) {
      fetchDetail();
    }
  }, [employee]);

  // Hàm tính thâm niên (Ví dụ: Từ 2021 đến nay)
  const calculateTenure = (joinDateStr) => {
    if (!joinDateStr) return "";
    const joinDate = new Date(joinDateStr);
    const now = new Date();
    const diffTime = Math.abs(now - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years === 0 && months === 0) return "(Mới gia nhập)";
    if (years === 0) return `(${months} tháng)`;
    return `(${years} năm ${months} tháng)`;
  };

  // Format ngày tháng chuẩn VN
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleResetPassword = async () => {
    if (!detail) return;

    const mailTo = detail.personal_email || detail.work_email;
    if (!mailTo || String(mailTo).trim() === '') {
      alert(`Nhân viên ${detail.full_name || ''} chưa có email cá nhân hoặc email công ty. Không thể cấp lại mật khẩu!`);
      return;
    }

    if (!detail.username) {
      alert('Nhân viên này chưa có tài khoản đăng nhập. Không thể cấp lại mật khẩu!');
      return;
    }

    if (!window.confirm(
      `Xác nhận reset mật khẩu cho tài khoản ${detail.username}?\nHệ thống sẽ gửi mật khẩu tạm thời đến: ${mailTo}`
    )) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await adminUserService.resetUserPassword(mailTo);
      if (response?.success) {
        alert(`Thành công! Mật khẩu mới đã được gửi đến: ${mailTo}.\nNhân viên sẽ phải đổi mật khẩu khi đăng nhập.`);
      } else {
        alert(response?.message || 'Lỗi khi thực hiện reset mật khẩu!');
      }
    } catch (error) {
      console.error('Lỗi API reset password:', error);
      const errorMsg = error.response?.data?.message || 'Không thể kết nối đến máy chủ!';
      alert(`Lỗi: ${errorMsg}`);
    } finally {
      setIsResetting(false);
    }
  };

  // MÀN HÌNH LOADING TRONG LÚC ĐỢI API
  if (loading) {
    return (
      <div className="bg-slate-50 min-h-[500px] flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-cyan-500 mb-4" size={40} />
        <p className="text-slate-500">Đang tải hồ sơ nhân viên...</p>
      </div>
    );
  }

  // NẾU API LỖI KHÔNG CÓ DATA
  if (!detail) {
    return (
      <div className="p-8 text-center text-red-500">
        Lỗi không thể tải dữ liệu! <button onClick={onBack} className="underline ml-2">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        
        {/* TOP HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
              <User className="text-cyan-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Hồ sơ Nhân viên</h1>
              <p className="text-sm text-slate-500 mt-1">Xem chi tiết thông tin cá nhân, công việc và tài khoản của nhân viên.</p>
            </div>
          </div>
          
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>

        {/* PROFILE HEADER (Avatar & Basic Info) */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-8 pb-8 border-b border-slate-100">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-200 to-blue-200 flex items-center justify-center text-3xl font-bold text-cyan-800 shadow-md border-4 border-white">
              {detail.full_name?.split(' ').pop().charAt(0) || 'U'}
            </div>
            <div className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-white rounded-full ${detail.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{detail.full_name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5
                ${detail.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}
              `}>
                <span className={`w-1.5 h-1.5 rounded-full ${detail.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                {detail.statusText}
              </span>
            </div>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 mb-4">
              <Briefcase size={16} /> {detail.position_title || 'Chưa phân bổ'} - {detail.department_title || 'Chưa phân bổ'}
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600 font-medium">
                <Hash size={14} className="text-cyan-500"/> {detail.employee_code}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">
                <Mail size={14} className="text-cyan-500"/> {detail.work_email || 'Chưa cập nhật'}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600">
                <Phone size={14} className="text-cyan-500"/> {detail.phone_number || 'Chưa cập nhật'}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN INFO GRIDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <User className="text-cyan-500" size={20} /> Thông tin cá nhân
            </h3>
            <div className="space-y-4">
              <InfoRow label="Họ và tên" value={detail.full_name} />
              <InfoRow label="CCCD" value={detail.identity_card_number || "Chưa cập nhật"} />
              <InfoRow label="Ngày sinh" value={formatDate(detail.date_of_birth)} />
              <InfoRow label="Số điện thoại" value={detail.phone_number || "Chưa cập nhật"} />
              <InfoRow label="Giới tính" value={detail.gender === false ? "Nữ" : "Nam"} />
              <InfoRow label="Email cá nhân" value={detail.personal_email || "Chưa cập nhật"} />
              <InfoRow label="Địa chỉ cư trú" value={detail.current_address || "Chưa cập nhật"} />
              <InfoRow label="Số tài khoản" value={`${detail.bank_account_number || ''} ${detail.bank_name || 'Chưa cập nhật'}`} />
            </div>
          </div>

          {/* CỘT 2: THÔNG TIN CÔNG VIỆC */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <Briefcase className="text-cyan-500" size={20} /> Thông tin công việc
            </h3>
            <div className="space-y-4">
                <InfoRow label="Email công ty" value={detail.work_email || 'Chưa cập nhật'} />
              <InfoRow label="Phòng ban" value={detail.department_title || 'Chưa có'} />
              <InfoRow label="Chức vụ" value={detail.position_title || 'Chưa có'} />
              <InfoRow label="Loại hợp đồng" value={<span className="text-cyan-600 bg-cyan-50 px-2 py-1 rounded text-xs font-semibold uppercase">{detail.contract_type?.replace('_', ' ') || 'Chưa xác định'}</span>} />
              <InfoRow label="Ngày gia nhập" value={<>{formatDate(detail.join_date)} <span className="text-emerald-500 text-xs font-medium ml-1">{calculateTenure(detail.join_date)}</span></>} />
            </div>
          </div>

        </div>

        {/* THÔNG TIN TÀI KHOẢN (Lấy từ bảng user_account) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
            <ShieldCheck className="text-cyan-500" size={20} /> Thông tin tài khoản đăng nhập
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Tên đăng nhập (Username)</p>
              <p className="font-bold text-slate-800">{detail.username || 'Chưa tạo tài khoản'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Vai trò phân quyền</p>
              <p className="font-bold text-slate-800 uppercase">{detail.role_code || 'USER'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Đăng nhập lần cuối</p>
              <p className="font-medium text-slate-700">
                {detail.last_login ? new Date(detail.last_login).toLocaleString('vi-VN') : 'Chưa từng đăng nhập'}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isResetting}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isResetting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Đang gửi...
              </>
            ) : (
              <>
                <Key size={16} /> Cấp lại mật khẩu
              </>
            )}
          </button>
            <button 
            onClick={onEdit} 
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm shadow-cyan-200"
            >
            <Edit size={16} /> Chỉnh sửa hồ sơ
            </button>
        </div>

      </div>
    </div>
  );
}

// Component render dòng dữ liệu
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-3 border-b border-slate-50/50 last:border-0">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className="font-medium text-slate-800 text-sm text-right max-w-[60%]">{value}</span>
  </div>
);
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  Building2,
  MapPin,
  Briefcase,
  FileText,
  Users,
  LogOut
} from "lucide-react";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("isLogin");
    navigate("/login", { replace: true });
  };

  // 🎯 function check active
  const isActive = (path) => location.pathname === path;

  // 🎯 class chung cho menu
  const menuClass = (path) =>
    `flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
      isActive(path)
        ? "bg-blue-500 text-white"
        : "hover:bg-gray-100 text-gray-700"
    }`;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl flex flex-col justify-between">
        <div>
          <div className="p-6 text-2xl font-bold text-blue-600">
            QLNS
          </div>

          <nav className="px-4 space-y-2">

            <div onClick={() => navigate("/dashboard")} className={menuClass("/dashboard")}>
              <LayoutDashboard size={18} />
              Dashboard
            </div>

            <div onClick={() => navigate("/approvals")} className={menuClass("/approvals")}>
              <FileCheck size={18} />
              Xét duyệt tài liệu
            </div>

            <div onClick={() => navigate("/departments")} className={menuClass("/departments")}>
              <Building2 size={18} />
              Quản lý phòng ban
            </div>

            <div onClick={() => navigate("/branches")} className={menuClass("/branches")}>
              <MapPin size={18} />
              Quản lý chi nhánh
            </div>

            <div onClick={() => navigate("/positions")} className={menuClass("/positions")}>
              <Briefcase size={18} />
              Quản lý chức vụ
            </div>

            <div onClick={() => navigate("/employees")} className={menuClass("/employees")}>
              <Users size={18} />
              Quản lý nhân viên
            </div>

            <div onClick={() => navigate("/contracts")} className={menuClass("/contracts")}>
              <FileText size={18} />
              Quản lý hợp đồng
            </div>

          </nav>
        </div>

        {/* User + Logout */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-200 rounded-full"></div>
            <div>
              <div className="font-semibold">Admin</div>
              <div className="text-sm text-gray-500">Manager</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
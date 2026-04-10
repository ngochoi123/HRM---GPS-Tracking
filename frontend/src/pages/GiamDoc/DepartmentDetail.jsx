import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Users,
  Briefcase,
  Building,
  ArrowLeft,
  Pencil
} from "lucide-react";
import { directorDepartmentService } from "../../services/directorDepartmentService";

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dep, emp] = await Promise.all([
        directorDepartmentService.getDepartmentById(id),
        directorDepartmentService.getEmployeesByDepartment(id),
      ]);
      setDepartment(dep);
      setEmployees(emp || []);
    } catch (err) {
      console.error("Lỗi fetch:", err);
    }
  };

  if (!department) return <div className="p-6">Loading...</div>;

  // Search filter
  const filteredEmployees = employees.filter((emp) => {
    const keyword = search.toLowerCase();

    return (
      emp.full_name?.toLowerCase().includes(keyword) ||
      emp.employee_code?.toLowerCase().includes(keyword) ||
      emp.position_name?.toLowerCase().includes(keyword)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / perPage);
  const start = (currentPage - 1) * perPage;
  const currentEmployees = filteredEmployees.slice(start, start + perPage);

  const description =
    department.description ||
    "Chưa có mô tả cho phòng ban này.";

  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-xl font-semibold">Chi tiết phòng ban</h1>
              <p className="text-sm text-gray-400">
                Quản lý thông tin và nhân sự
              </p>
            </div>
          </div>

          <button
  onClick={() => navigate(`/GiamDoc/departments/edit/${id}`)}
  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-xl shadow"
>
  <Pencil size={16} />
  Chỉnh sửa
</button>
        </div>

        {/* MAIN */}
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">

          {/* TOP */}
          <div className="grid grid-cols-3 gap-6">

            {/* INFO */}
            <div className="col-span-2 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-800">
                {department.department_name}
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                {description}
              </p>

              <div className="flex gap-3 mt-4 text-sm">
                <span className="bg-white px-3 py-1 rounded-lg shadow text-gray-600">
                  {department.department_code}
                </span>

                <span className="flex items-center gap-1 text-gray-500">
                  <Building size={14} />
                  {department.branch_name}
                </span>
              </div>
            </div>

            {/* MANAGER */}
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-inner">
              <p className="text-xs text-gray-400 mb-3 uppercase">
                Trưởng phòng
              </p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {department.manager_name?.charAt(0) || "?"}
                </div>

                <div>
                  <p className="font-semibold">
                    {department.manager_name || "Chưa có"}
                  </p>
                  <p className="text-xs text-gray-400">Manager</p>
                </div>
              </div>

              <div className="mt-4 text-sm space-y-2 text-gray-600">
                <p className="flex gap-2 items-center">
                  <Mail size={14} />
                  {department.manager_email || "-"}
                </p>
                <p className="flex gap-2 items-center">
                  <Phone size={14} />
                  {department.manager_phone || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* EMPLOYEE TABLE */}
          <div className="bg-white p-5 rounded-2xl shadow">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">
                Danh sách nhân sự trực thuộc
              </h2>

              <input
                placeholder="Tìm nhân viên..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="py-3">Mã NV</th>
                    <th>Họ & Tên</th>
                    <th>Chức danh</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {currentEmployees.map((emp) => {
                    const email = emp.work_email || emp.personal_email;

                    return (
                      <tr
                        key={emp.id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="py-3 font-medium text-gray-600">
                          {emp.employee_code}
                        </td>

                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white flex items-center justify-center text-sm font-bold">
                              {emp.full_name?.charAt(0)}
                            </div>
                            <span className="font-medium">
                              {emp.full_name}
                            </span>
                          </div>
                        </td>

                        <td className="text-gray-600">
                          {emp.position_name || "-"}
                        </td>

                        <td className="text-gray-500">
                          {email || "-"}
                        </td>

                        <td>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              emp.status === "active"
                                ? "bg-green-100 text-green-600"
                                : emp.status === "probation"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {emp.status === "active"
                              ? "Đang làm việc"
                              : emp.status === "probation"
                              ? "Thử việc"
                              : "Nghỉ việc"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
              <p>
                Hiển thị {start + 1}–
                {Math.min(start + perPage, filteredEmployees.length)} trong tổng{" "}
                {filteredEmployees.length} nhân sự
              </p>

              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  ←
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "border hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
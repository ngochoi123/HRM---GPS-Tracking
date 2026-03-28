import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  Building,
  ArrowLeft,
  Pencil,
  Loader2
} from "lucide-react";

export default function BranchesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const branchRes = await axios.get(`http://localhost:5000/api/director/branches/${id}`);
      const data = branchRes.data;
      setBranch(data);
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
    } catch (err) {
      console.error("Lỗi fetch chi nhánh:", err);
      toast.error(err.response?.data?.message || "Không tải được chi tiết chi nhánh");
      setBranch(null);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-3 text-green-600 min-h-[40vh]">
        <Loader2 className="animate-spin" size={24} />
        <span className="font-medium">Đang tải...</span>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-gray-600">Không tìm thấy chi nhánh hoặc đã xảy ra lỗi.</p>
        <button
          type="button"
          onClick={() => navigate("/GiamDoc/branches")}
          className="text-green-600 font-medium hover:underline"
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  const filteredDepartments = departments.filter((dept) => {
    const keyword = search.toLowerCase();
    return (
      dept.department_name?.toLowerCase().includes(keyword) ||
      dept.department_code?.toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.ceil(filteredDepartments.length / perPage);
  const start = (currentPage - 1) * perPage;
  const currentDepartments = filteredDepartments.slice(start, start + perPage);

  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-xl font-semibold">Chi tiết chi nhánh</h1>
              <p className="text-sm text-gray-400">Quản lý thông tin và phòng ban</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/GiamDoc/branches/edit/${id}`)}
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
              <h2 className="text-2xl font-bold text-gray-800">{branch.branch_name}</h2>

              <p className="text-sm text-gray-500 mt-2">
                {[branch.province, branch.address].filter(Boolean).join(" — ") || "Chưa có địa chỉ cho chi nhánh này."}
              </p>

              {branch.description ? (
                <p className="text-sm text-gray-600 mt-3 border-t border-blue-100 pt-3">{branch.description}</p>
              ) : null}

              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                <span className="bg-white px-3 py-1 rounded-lg shadow text-gray-600">
                  {branch.branch_code}
                </span>

                <span className="flex items-center gap-1 text-gray-500">
                  <Building size={14} />
                  Chi nhánh
                </span>

                {branch.hotline ? (
                  <span className="bg-white px-3 py-1 rounded-lg shadow text-gray-600">
                    Hotline: {branch.hotline}
                  </span>
                ) : null}

                {branch.email ? (
                  <span className="flex items-center gap-1 text-gray-600">
                    <Mail size={14} />
                    {branch.email}
                  </span>
                ) : null}
              </div>
            </div>

            {/* MANAGER */}
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-inner">
              <p className="text-xs text-gray-400 mb-3 uppercase">Quản lý chi nhánh</p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {branch.manager_name?.charAt(0) || "?"}
                </div>

                <div>
                  <p className="font-semibold">{branch.manager_name || "Chưa có"}</p>
                  <p className="text-xs text-gray-400">Manager</p>
                </div>
              </div>

              <div className="mt-4 text-sm space-y-2 text-gray-600">
                <p className="flex gap-2 items-center">
                  <Mail size={14} />
                  {branch.manager_email || "-"}
                </p>
                <p className="flex gap-2 items-center">
                  <Phone size={14} />
                  {branch.manager_phone || "-"}
                </p>
              </div>
            </div>

          </div>

          {/* DEPARTMENT TABLE */}
          <div className="bg-white p-5 rounded-2xl shadow">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">
                Danh sách phòng ban trực thuộc
              </h2>

              <input
                placeholder="Tìm phòng ban..."
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
                    <th className="py-3">Mã PB</th>
                    <th>Tên phòng ban</th>
                    <th>Nhân sự</th>
                  </tr>
                </thead>

                <tbody>
                  {currentDepartments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="border-b hover:bg-gray-50 transition"
                      onClick={() => navigate(`/GiamDoc/departments/${dept.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="py-3 font-medium text-gray-600">{dept.department_code}</td>
                      <td>{dept.department_name}</td>
                      <td>
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
                          {dept.total_employees || 0} người
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
              <p>
                Hiển thị {start + 1}–{Math.min(start + perPage, filteredDepartments.length)} trong tổng{" "}
                {filteredDepartments.length} phòng ban
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  ←
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-500 text-white" : "border hover:bg-gray-100"}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
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
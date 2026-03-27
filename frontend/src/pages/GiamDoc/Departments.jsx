import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye
} from "lucide-react";

export default function Departments() {
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.log("🔥 Lỗi load departments:", err.response?.data);
  
      // ❗ QUAN TRỌNG: KHÔNG redirect login
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filtered = departments.filter(
    (dep) =>
      dep.department_code?.toLowerCase().includes(search.toLowerCase()) ||
      dep.department_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Quản lý phòng ban
        </h1>

        <button
          onClick={() => navigate("/GiamDoc/departments/create")}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-xl shadow-lg"
        >
          <Plus size={18} />
          Thêm phòng ban
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow flex items-center gap-3 border">
        <Search className="text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo mã hoặc tên phòng ban..."
          className="w-full outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-6 py-3">Mã PB</th>
              <th className="text-left px-6 py-3">Tên phòng ban</th>
              <th className="text-left px-6 py-3">Chi nhánh</th>
              <th className="text-left px-6 py-3">Trưởng phòng</th>
              <th className="text-left px-6 py-3">Số nhân sự</th>
              <th className="text-center px-6 py-3">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((dep) => (
              <tr key={dep.id} className="border-t hover:bg-blue-50">

                <td className="px-6 py-4 font-semibold text-blue-600">
                  {dep.department_code}
                </td>

                <td className="px-6 py-4 font-medium">
                  {dep.department_name}
                </td>

                <td className="px-6 py-4 text-gray-500">
                  {dep.branch_name || "-"}
                </td>

                <td className="px-6 py-4">
                  {dep.manager_name || "-"}
                </td>

                <td className="px-6 py-4">
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs">
                    {dep.total_employees} người
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">

                    <button
                      onClick={() => navigate(`/GiamDoc/departments/${dep.id}`)}
                      className="p-2 bg-blue-100 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                    onClick={() => navigate(`/GiamDoc/departments/edit/${dep.id}`)}
                    className="p-2 bg-yellow-100 rounded-lg"
                    >
                    <Pencil size={16} />
                    </button>

                    <button
                    onClick={() => navigate(`/GiamDoc/departments/delete/${dep.id}`)}
                    className="p-2 bg-red-100 rounded-lg hover:bg-red-200"
                    >
                    <Trash2 size={16} />
                  </button>

                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            Không có dữ liệu
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2
} from "lucide-react";

export default function Branches() {
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBranches = async () => {
    try {
      setLoading(true);

      const res = await axios.get("http://localhost:5000/api/branches");
      setBranches(res.data || []);

    } catch (err) {
      console.log("🔥 Lỗi load branches:", err.response?.data);
      toast.error("Không tải được danh sách chi nhánh");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const filtered = branches.filter(
    (b) =>
      b.branch_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.branch_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Quản lý chi nhánh
        </h1>

        <button
          onClick={() => navigate("/GiamDoc/branches/create")}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-xl shadow-lg"
        >
          <Plus size={18} />
          Thêm chi nhánh
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow flex items-center gap-3 border">
        <Search className="text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo mã hoặc tên chi nhánh..."
          className="w-full outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow p-10 flex justify-center items-center">
          <div className="flex items-center gap-3 text-green-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-medium">Đang tải dữ liệu...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow border overflow-hidden">
          <table className="w-full text-sm">

            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="text-left px-6 py-3">Mã CN</th>
                <th className="text-left px-6 py-3">Tên chi nhánh</th>
                <th className="text-left px-6 py-3">Địa chỉ</th>
                <th className="text-left px-6 py-3">Số phòng ban</th>
                <th className="text-left px-6 py-3">Nhân sự</th>
                <th className="text-center px-6 py-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t hover:bg-green-50">

                  <td className="px-6 py-4 font-semibold text-green-600">
                    {b.branch_code}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {b.branch_name}
                  </td>

                  <td className="px-6 py-4 text-gray-500">
                    {b.address || "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs">
                      {b.total_departments} phòng
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
                      {b.total_employees} người
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">

                      <button
                        onClick={() => navigate(`/GiamDoc/branches/${b.id}`)}
                        className="p-2 bg-blue-100 rounded-lg"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/GiamDoc/branches/edit/${b.id}`)}
                        className="p-2 bg-yellow-100 rounded-lg"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/GiamDoc/branches/delete/${b.id}`)}
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
      )}

    </div>
  );
}
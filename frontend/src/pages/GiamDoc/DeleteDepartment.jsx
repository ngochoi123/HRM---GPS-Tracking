import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

export default function DeleteDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [checked, setChecked] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [moveDepartmentId, setMoveDepartmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasEmployees, setHasEmployees] = useState(false);

  // 🔥 Thêm state confirm đẹp
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchDepartment();
    fetchDepartments();
  }, [id]);

  // 🔹 Lấy phòng ban hiện tại
  const fetchDepartment = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `http://localhost:5000/api/director/departments/${id}`
      );

      const data = res.data?.data || res.data;

      setDepartment(data);

      if (data?.total_employees > 0) {
        setHasEmployees(true);
      }

    } catch (err) {
      console.log(err);
      toast.error("Không tải được thông tin phòng ban");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Dropdown phòng ban
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/director/departments`
      );

      setDepartments(res.data?.data || res.data || []);

    } catch (err) {
      console.log(err);
      toast.error("Không tải được danh sách phòng ban");
    }
  };

  // 🔥 XÓA
  const handleDelete = async () => {

    try {
      setDeleting(true);

      await axios.delete(
        `http://localhost:5000/api/director/departments/${id}`,
        {
          data: {
            move_to_department_id: targetDepartment || null
          }
        }
      );

      toast.success("Xoá phòng ban thành công");
      navigate("/GiamDoc/departments");

    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Lỗi xoá phòng ban"
      );
    } finally {
      setDeleting(false);
    }
  };

  // 🔄 Loading page
  if (loading || !department) {
    return (
      <div className="p-10 flex justify-center items-center">
        <div className="flex gap-3 text-blue-500">
          <Loader2 className="animate-spin" />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  // ✅ Điều kiện bật nút xoá
  const canDelete =
    checked &&
    confirmCode.trim() === String(department.department_code).trim() &&
    (department.total_employees === 0 || targetDepartment);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow border p-6 space-y-6 relative">

        {/* HEADER */}
        <div className="flex items-center justify-between relative">
          <button
            onClick={() => navigate("/GiamDoc/departments")}
            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 justify-center">
              <AlertTriangle className="text-red-500" />
              Xoá phòng ban
            </h2>
            <p className="text-sm text-gray-500">
              Hành động này có thể ảnh hưởng đến cấu trúc nhân sự.
            </p>
          </div>
        </div>

        {/* INFO */}
        <div className="border rounded-xl p-5 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-4">
            🏢 Thông tin phòng ban
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tên phòng ban</p>
              <p className="font-semibold">{department.department_name}</p>
            </div>

            <div>
              <p className="text-gray-500">Mã phòng ban</p>
              <p className="font-semibold">{department.department_code}</p>
            </div>

            <div>
              <p className="text-gray-500">Trưởng phòng</p>
              <p>{department.manager_name || "-"}</p>
            </div>

            <div>
              <p className="text-gray-500">Chi nhánh</p>
              <p>{department.branch_name || "-"}</p>
            </div>
          </div>
        </div>

        {/* WARNING */}
        {department.total_employees > 0 && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl space-y-3">
            <p className="text-red-600 font-semibold">
              ⚠️ Có {department.total_employees} nhân sự
            </p>

            <select
              className="w-full border p-2 rounded-lg"
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value)}
            >
              <option value="">-- Chọn phòng ban tiếp nhận --</option>

              {departments
                .filter((d) => d.id !== department.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.department_name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* CONFIRM */}
        <div className="border rounded-xl p-5 space-y-3">
          <p className="text-sm text-gray-500">
            Nhập mã <b>{department.department_code}</b> để xác nhận
          </p>

          <input
            type="text"
            className="w-full border p-2 rounded-lg"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => setChecked(!checked)}
            />
            Tôi hiểu hành động này không thể hoàn tác
          </label>
        </div>

        {/* ACTION */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => navigate("/GiamDoc/departments")}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Hủy thao tác
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canDelete || deleting}
            className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 transition ${
              !canDelete || deleting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {deleting && <Loader2 className="animate-spin" size={16} />}
            🗑️ Xoá phòng ban
          </button>
        </div>
      </div>

      {/* 🔥 Confirm Modal đẹp */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">

            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" />
              <h3 className="font-semibold text-lg">
                Xác nhận xoá
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xoá phòng ban này không?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Huỷ
              </button>

              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleDelete();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Xoá
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
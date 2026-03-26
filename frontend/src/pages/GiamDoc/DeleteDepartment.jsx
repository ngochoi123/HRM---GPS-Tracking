import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function DeleteDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [checked, setChecked] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState("");

  useEffect(() => {
    fetchDepartment();
    fetchDepartments();
  }, []);

  // 🔹 Lấy phòng ban hiện tại
  const fetchDepartment = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/departments/${id}`);
      setDepartment(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔹 Dropdown phòng ban
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/departments/dropdown/departments`
      );
      setDepartments(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 XÓA
  const handleDelete = async () => {
    if (confirmCode !== department.department_code) {
      alert("❌ Mã phòng ban không đúng");
      return;
    }

    if (!checked) {
      alert("❌ Bạn chưa xác nhận");
      return;
    }

    if (department.total_employees > 0 && !targetDepartment) {
      alert("❌ Phải chọn phòng ban chuyển nhân sự");
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/departments/${id}`,
        {
          data: {
            move_to_department_id: targetDepartment || null,
          },
        }
      );

      alert("✅ Xoá thành công");
      navigate("/GiamDoc/departments");
    } catch (err) {
      console.log(err);
      alert("❌ Xoá thất bại");
    }
  };

  if (!department) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow border p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" />
              Xoá phòng ban
            </h2>
            <p className="text-sm text-gray-500">
              Hành động này có thể ảnh hưởng đến cấu trúc nhân sự.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
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
            <p className="text-red-600 font-semibold flex items-center gap-2">
              ⚠️ Cảnh báo: Có {department.total_employees} nhân sự
            </p>

            <p className="text-sm text-red-500">
              Phòng ban này đang có nhân viên. Bạn phải chuyển họ sang phòng ban khác trước khi xoá.
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
            placeholder="Nhập mã phòng ban..."
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
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Hủy thao tác
          </button>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
            disabled={!checked || confirmCode !== department.department_code}
          >
            🗑️ Xoá phòng ban
          </button>
        </div>
      </div>
    </div>
  );
}
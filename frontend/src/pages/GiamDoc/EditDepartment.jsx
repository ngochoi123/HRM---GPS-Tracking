import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

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

  // 🔹 Lấy danh sách phòng ban để chuyển
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/departments/dropdown/departments`);
      setDepartments(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 XOÁ
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
            move_to_department_id: targetDepartment || null
          }
        }
      );

      alert("✅ Xoá thành công");
      navigate("/GiamDoc/departments");

    } catch (err) {
      console.log(err.response?.data);
      alert("❌ Xoá thất bại");
    }
  };

  if (!department) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-red-600">
        ⚠️ Xác nhận xoá phòng ban
      </h1>

      {/* INFO */}
      <div className="bg-white p-5 rounded-2xl shadow border space-y-2">
        <p><b>Tên:</b> {department.department_name}</p>
        <p><b>Mã:</b> {department.department_code}</p>
      </div>

      {/* WARNING */}
      {department.total_employees > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3">

          <p className="text-red-600 font-semibold">
            ⚠️ Có {department.total_employees} nhân sự
          </p>

          <select
            className="w-full border p-2 rounded-lg"
            value={targetDepartment}
            onChange={(e) => setTargetDepartment(e.target.value)}
          >
            <option value="">-- Chọn phòng ban chuyển đến --</option>

            {departments
              .filter(d => d.id !== department.id)
              .map(d => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* CONFIRM */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Nhập mã phòng ban để xác nhận..."
          className="w-full border p-2 rounded-lg"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => setChecked(!checked)}
          />
          Tôi hiểu hành động này không thể hoàn tác
        </label>
      </div>

      {/* ACTION */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded-lg"
        >
          Hủy
        </button>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Xoá phòng ban
        </button>
      </div>

    </div>
  );
}
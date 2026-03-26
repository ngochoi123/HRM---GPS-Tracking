import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function DepartmentCreate() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    department_name: "",
    department_code: "",
    description: "",
    branch_id: "",
    manager_id: "",
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/branches");
      setBranches(res.data || []);
    } catch (err) {
      console.error("Lỗi load chi nhánh:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/departments",
        {
          department_name: form.department_name,
          department_code: form.department_code,
          description: form.description || "",
          branch_id: form.branch_id || null,
          is_active: form.is_active
        }
      );

      console.log("✅ Created:", res.data);
      alert("Tạo phòng ban thành công!");
      navigate("/GiamDoc/departments");

    } catch (err) {
      console.error("🔥 FULL ERROR:", err);

      if (err.response) {
        alert(err.response.data?.message || "Lỗi từ server");
      } else if (err.request) {
        alert("Không nhận được phản hồi từ server!");
      } else {
        alert("Lỗi hệ thống!");
      }
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-semibold">
                Thêm phòng ban mới
              </h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Thiết lập thông tin cơ bản, cơ cấu quản lý và chức năng phòng ban.
            </p>
          </div>
        </div>

        {/* SECTION 1 */}
        <div className="border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">
            Thông tin cơ bản
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-medium">
                Tên phòng ban *
              </label>
              <input
                name="department_name"
                placeholder="Ví dụ: Phòng Kỹ thuật..."
                className="mt-1 w-full border rounded-xl p-3"
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Mã phòng ban
              </label>
              <input
                name="department_code"
                placeholder="Tự động nếu để trống"
                className="mt-1 w-full border rounded-xl p-3"
                onChange={handleChange}
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">
                Mô tả chức năng
              </label>
              <textarea
                name="description"
                placeholder="Nhập mô tả phòng ban..."
                className="mt-1 w-full border rounded-xl p-3 h-24"
                onChange={handleChange}
              />
            </div>

          </div>
        </div>

        {/* SECTION 2 */}
        <div className="border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">
            Cơ cấu & Quản lý
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-medium">
                Chi nhánh *
              </label>
              <select
                name="branch_id"
                className="mt-1 w-full border rounded-xl p-3"
                value={form.branch_id}
                onChange={(e) =>
                  setForm({ ...form, branch_id: Number(e.target.value) })
                }
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Trưởng phòng (tùy chọn)
              </label>
              <input
                disabled
                placeholder="Sẽ bổ nhiệm sau"
                className="mt-1 w-full border rounded-xl p-3 bg-gray-100"
              />
            </div>

          </div>
        </div>

        {/* STATUS */}
<div className="bg-blue-50 rounded-2xl p-5 flex justify-between items-center">
  <div>
    <p className="font-medium text-gray-700">
      Trạng thái phòng ban
    </p>
    <p className="text-sm text-gray-400">
      Quyết định phòng ban có hoạt động hay không
    </p>

    {/* 👇 HIỂN THỊ TRẠNG THÁI */}
    <p className={`mt-2 text-sm font-semibold ${
      form.is_active ? "text-green-600" : "text-red-500"
    }`}>
      {form.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
    </p>
  </div>

  {/* TOGGLE */}
  <div
    onClick={() =>
      setForm((prev) => ({
        ...prev,
        is_active: !prev.is_active
      }))
    }
    className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition ${
      form.is_active ? "bg-blue-500" : "bg-gray-300"
    }`}
  >
    <div
      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition ${
        form.is_active ? "translate-x-7" : "translate-x-0"
      }`}
    />
  </div>
</div>

        {/* ACTION */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 bg-gray-200 rounded-xl"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl shadow"
          >
            + Tạo phòng ban
          </button>
        </div>

      </div>
    </div>
  );
}
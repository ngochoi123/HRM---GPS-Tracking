import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    department_name: "",
    department_code: "",
    description: "",
    branch_id: "",
    manager_id: "",
    is_active: true
  });

  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchDepartment();
    fetchBranches();
    fetchManagers();
  }, [id]);

  const fetchDepartment = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/departments/${id}`
      );

      const data = res.data?.data || res.data;

      setForm({
        department_name: data.department_name || "",
        department_code: data.department_code || "",
        description: data.description || "",
        branch_id: data.branch_id ? String(data.branch_id) : "",
        manager_id: data.manager_id ? String(data.manager_id) : "",
        is_active: data.is_active ?? true
      });

    } catch (err) {
      console.log("Lỗi load department:", err);
      toast.error("Không tải được thông tin phòng ban");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/branches"
      );
      setBranches(res.data || []);
    } catch (err) {
      console.log(err);
      toast.error("Không tải được chi nhánh");
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/departments/${id}/employees`
      );

      setManagers(res.data || []);

    } catch (err) {
      console.log("Lỗi load managers:", err);
      toast.error("Không tải được danh sách nhân sự");
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      await axios.put(
        `http://localhost:5000/api/departments/${id}`,
        form
      );

      toast.success("Cập nhật phòng ban thành công");

      setTimeout(() => {
        navigate("/GiamDoc/departments");
      }, 1000);

    } catch (err) {
      console.log("Lỗi lưu:", err.response?.data || err);
      toast.error("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center items-center">
        <div className="flex gap-3 text-blue-500">
          <Loader2 className="animate-spin" />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-2xl shadow p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 border rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-bold">
                Chỉnh sửa thông tin phòng ban
              </h2>
              <p className="text-gray-500 text-sm">
                Cập nhật thông tin cơ bản, cơ cấu quản lý và chức năng của phòng ban.
              </p>
            </div>
          </div>
        </div>

        {/* Thông tin cơ bản */}
        <div className="border rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-4 text-lg">
            Thông tin cơ bản
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Tên phòng ban
              </label>
              <input
                value={form.department_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    department_name: e.target.value
                  })
                }
                className="w-full border p-2 rounded-lg mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Mã phòng ban
              </label>
              <input
                value={form.department_code}
                readOnly
                disabled
                className="w-full border p-2 rounded-lg mt-1 bg-gray-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">
              Mô tả chức năng / nhiệm vụ chính
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value
                })
              }
              className="w-full border p-2 rounded-lg mt-1"
            />
          </div>
        </div>

        {/* Cơ cấu quản lý */}
        <div className="border rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-4 text-lg">
            Cơ cấu & Quản lý
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Trực thuộc chi nhánh
              </label>
              <select
                value={form.branch_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    branch_id: e.target.value
                  })
                }
                className="w-full border p-2 rounded-lg mt-1"
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Bổ nhiệm trưởng phòng
              </label>
              <select
                value={form.manager_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    manager_id: e.target.value
                  })
                }
                className="w-full border p-2 rounded-lg mt-1"
              >
                <option value="">Chọn trưởng phòng</option>
                {managers.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Trạng thái */}
        <div className="border rounded-xl p-5 mb-6 bg-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">
                Trạng thái phòng ban
              </h3>
              <p className="text-sm text-gray-500">
                Quyết định phòng ban này có đang hoạt động hay không.
              </p>
            </div>

            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_active: e.target.checked
                })
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate("/GiamDoc/departments")}
            className="px-5 py-2 border rounded-xl"
          >
            Hủy bỏ
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            Lưu thay đổi
          </button>
        </div>

      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-2">
              Xác nhận cập nhật
            </h3>

            <p className="text-gray-500 mb-5">
              Bạn có chắc chắn muốn cập nhật phòng ban này?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Huỷ
              </button>

              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleSubmit();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
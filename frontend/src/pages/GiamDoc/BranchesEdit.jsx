import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Pencil,
  Info,
  MapPin,
  Shield,
  Save,
  Loader2,
  ChevronDown
} from "lucide-react";

/** Đọc ghi chú từ description (text thuần hoặc JSON cũ { notes, detail }) */
function parseDescriptionNotes(raw) {
  if (!raw || !String(raw).trim()) return "";
  try {
    const j = JSON.parse(raw);
    if (j && typeof j === "object") {
      const n = j.notes ?? j.detail;
      if (n != null && n !== "") return String(n);
    }
  } catch {
    /* text thuần */
  }
  return String(raw);
}

export default function BranchesEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState([]);

  const [form, setForm] = useState({
    branch_name: "",
    branch_code: "",
    address: "",
    hotline: "",
    email: "",
    notes: "",
    is_active: true,
    manager_id: ""
  });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [branchRes, candRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/director/branches/${id}`),
        axios
          .get(`http://localhost:5000/api/director/branches/${id}/manager-candidates`)
          .catch(() => ({ data: [] }))
      ]);

      const b = branchRes.data;

      let mgrList = Array.isArray(candRes.data) ? [...candRes.data] : [];
      if (b.manager_id && !mgrList.some((c) => c.id === b.manager_id)) {
        mgrList.unshift({
          id: b.manager_id,
          full_name: b.manager_name || "Quản lý hiện tại",
          employee_code: ""
        });
      }

      setForm({
        branch_name: b.branch_name || "",
        branch_code: b.branch_code || "",
        address: b.address || "",
        hotline: b.hotline || "",
        email: b.email || "",
        notes: parseDescriptionNotes(b.description),
        is_active: b.is_active !== false,
        manager_id: b.manager_id != null ? String(b.manager_id) : ""
      });
      setCandidates(mgrList);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không tải được chi nhánh");
      navigate("/GiamDoc/branches");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.branch_name.trim()) {
      toast.error("Tên chi nhánh không được để trống");
      return;
    }
    if (!form.address.trim()) {
      toast.error("Địa chỉ chi tiết không được để trống");
      return;
    }

    try {
      setSaving(true);
      const description = form.notes.trim() || null;

      await axios.put(`http://localhost:5000/api/director/branches/${id}`, {
        branch_name: form.branch_name.trim(),
        branch_code: form.branch_code,
        province: null,
        address: form.address.trim(),
        hotline: form.hotline.trim() || null,
        email: form.email.trim() || null,
        description,
        is_active: form.is_active,
        manager_id: form.manager_id || null
      });

      toast.success("Cập nhật chi nhánh thành công");
      navigate(`/GiamDoc/branches/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center gap-3 text-green-600">
        <Loader2 className="animate-spin" size={28} />
        <span className="font-medium">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-400 flex items-center justify-center shadow-md shrink-0">
              <Pencil className="text-white" size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chỉnh sửa thông tin chi nhánh
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Cập nhật thông tin cơ bản, địa chỉ và người quản lý của chi nhánh.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/GiamDoc/branches")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin cơ bản */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
                <Info size={18} />
              </span>
              <h2 className="text-lg font-bold text-gray-900">Thông tin cơ bản</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Tên chi nhánh / Văn phòng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.branch_name}
                  onChange={(e) => setField("branch_name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Mã chi nhánh (Không thể sửa)
                </label>
                <input
                  type="text"
                  value={form.branch_code}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-800">
                  Địa chỉ chi tiết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Số nhà, đường, phường, quận, tỉnh..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Địa chỉ & liên hệ — branch: address, hotline, email (.data) */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
                <MapPin size={18} />
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Địa chỉ &amp; Thông tin liên hệ
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Hotline / Điện thoại bàn
                </label>
                <input
                  type="text"
                  value={form.hotline}
                  onChange={(e) => setField("hotline", e.target.value)}
                  placeholder="0236 3123 456"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Email liên hệ (Tùy chọn)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="danang@company.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Quản lý & trạng thái — is_active; quản lý qua department.manager_id (logic hiện có) */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
                <Shield size={18} />
              </span>
              <h2 className="text-lg font-bold text-gray-900">Quản lý &amp; Trạng thái</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Giám đốc / Quản lý chi nhánh
                </label>
                <div className="relative">
                  <select
                    value={form.manager_id}
                    onChange={(e) => setField("manager_id", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">— Chọn nhân sự —</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {form.branch_name ? ` - ${form.branch_name}` : ""}
                        {c.employee_code ? ` · ${c.employee_code}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={18}
                  />
                </div>
                {candidates.length === 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Chưa có nhân viên thuộc chi nhánh này — thêm phòng ban &amp; nhân sự để chọn quản lý.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Trạng thái hoạt động
                </label>
                <div className="flex items-center justify-between rounded-lg border border-gray-300 px-4 py-3 bg-gray-50/80">
                  <span className="text-sm text-gray-700">
                    {form.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.is_active}
                      onChange={() => setField("is_active", !form.is_active)}
                    />
                    <div
                      className="relative h-7 w-12 rounded-full bg-gray-300 transition peer-focus:ring-2 peer-focus:ring-green-500/40 peer-checked:bg-green-500 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-5"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">Ghi chú / mô tả thêm</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Thông tin bổ sung (lưu trong cột description của bảng branch)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-y"
              />
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/GiamDoc/branches")}
              className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

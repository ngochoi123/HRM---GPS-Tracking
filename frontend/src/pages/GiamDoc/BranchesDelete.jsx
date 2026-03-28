import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  Trash2,
  Users
} from "lucide-react";

export default function BranchesDelete() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [branch, setBranch] = useState(null);
  const [otherBranches, setOtherBranches] = useState([]);

  const [confirmCode, setConfirmCode] = useState("");
  const [checked, setChecked] = useState(false);
  const [moveToBranchId, setMoveToBranchId] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [bRes, listRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/director/branches/${id}`),
        axios.get("http://localhost:5000/api/director/branches")
      ]);

      setBranch(bRes.data);
      const list = Array.isArray(listRes.data) ? listRes.data : [];
      setOtherBranches(list.filter((b) => String(b.id) !== String(id)));
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

  const totalEmployees = branch?.total_employees ?? 0;
  const totalDepartments = branch?.total_departments ?? 0;

  const codeMatch =
    branch &&
    confirmCode.trim().toLowerCase() ===
      String(branch.branch_code || "").trim().toLowerCase();

  const transferOk = totalEmployees === 0 || Boolean(moveToBranchId);
  const canDelete = Boolean(branch) && checked && codeMatch && transferOk;

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      setDeleting(true);
      await axios.delete(`http://localhost:5000/api/director/branches/${id}`, {
        data: {
          confirm_code: confirmCode.trim(),
          move_to_branch_id: totalEmployees > 0 ? moveToBranchId : null
        }
      });
      toast.success("Xóa chi nhánh thành công");
      navigate("/GiamDoc/branches");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không xóa được chi nhánh");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !branch) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center gap-3 text-blue-600">
        <Loader2 className="animate-spin" size={28} />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Xóa chi nhánh
              <AlertTriangle className="text-red-500 shrink-0" size={26} />
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">
              Hành động này có tính phá hủy và sẽ đóng cửa chi nhánh trên hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/GiamDoc/branches")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>
        </div>

        {/* Chi tiết */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
              <MapPin size={18} />
            </span>
            <h2 className="text-lg font-bold text-gray-900">Thông tin chi tiết</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Tên chi nhánh
              </p>
              <p className="font-bold text-gray-900 text-base">{branch.branch_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Mã định danh
              </p>
              <span className="inline-block font-bold text-gray-800 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg">
                {branch.branch_code}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Khu vực
              </p>
              <p className="text-gray-800">{branch.province || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Địa chỉ
              </p>
              <p className="text-gray-800">{branch.address || "—"}</p>
            </div>
          </div>
        </section>

        {/* Cảnh báo + chuyển nhân sự */}
        {totalEmployees > 0 && (
          <section className="rounded-2xl border border-red-200 bg-red-50/90 p-6 md:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 shrink-0">
                <Users size={22} />
              </span>
              <div>
                <p className="font-bold text-red-800">
                  Cảnh báo: Tồn tại {totalEmployees} nhân sự trực thuộc!
                </p>
                <p className="text-sm text-red-900/90 mt-2 leading-relaxed">
                  Chi nhánh này hiện đang quản lý {totalDepartments} phòng ban và{" "}
                  {totalEmployees} nhân viên. Việc xóa chi nhánh sẽ đóng cửa cơ sở
                  này. Vui lòng chọn trụ sở/chi nhánh mới để tiếp nhận các nhân sự
                  này.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-red-950">
                Điều chuyển {totalEmployees} nhân sự về:
              </label>
              <select
                value={moveToBranchId}
                onChange={(e) => setMoveToBranchId(e.target.value)}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              >
                <option value="">— Chọn chi nhánh tiếp nhận —</option>
                {otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name} ({b.branch_code})
                  </option>
                ))}
              </select>
              {otherBranches.length === 0 && (
                <p className="text-xs text-red-800">
                  Chưa có chi nhánh khác để tiếp nhận — hãy tạo thêm chi nhánh trước
                  khi xóa.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Xác nhận an toàn */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Để đảm bảo an toàn, vui lòng gõ mã chi nhánh{" "}
            <strong className="text-gray-900">{branch.branch_code}</strong> vào ô
            bên dưới để xác nhận lệnh xóa.
          </p>
          <input
            type="text"
            autoComplete="off"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="NHẬP MÃ CHI NHÁNH ĐỂ XÁC NHẬN..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
          />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Tôi hiểu rằng hành động này không thể hoàn tác.
            </span>
          </label>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-wrap justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate("/GiamDoc/branches")}
            className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50"
          >
            Hủy thao tác
          </button>
          <button
            type="button"
            disabled={!canDelete || deleting || (totalEmployees > 0 && otherBranches.length === 0)}
            onClick={handleDelete}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-sm transition ${
              canDelete && !(totalEmployees > 0 && otherBranches.length === 0)
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {deleting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Trash2 size={18} />
            )}
            Xóa chi nhánh
          </button>
        </div>
      </div>
    </div>
  );
}

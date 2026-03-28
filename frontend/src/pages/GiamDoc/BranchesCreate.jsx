import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Globe
} from "lucide-react";

export default function CreateBranch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    branch_name: "",
    branch_code: "",
    province: "",
    address: "",
    hotline: "",
    email: "",
    description: "",
    is_active: true
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.branch_name.trim()) {
      return toast.error("Tên chi nhánh không được để trống");
    }

    try {
      setLoading(true);
      // ⚡ URL cập nhật theo BE mới
      await axios.post("http://localhost:5000/api/director/branch", form);
      toast.success("Thêm chi nhánh thành công!");
      navigate("/GiamDoc/branches");
    } catch (error) {
      console.error("🔥 CREATE BRANCH ERROR:", error);
      const message = error.response?.data?.message || "Lỗi thêm chi nhánh";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Nút quay lại */}
      <button
        onClick={() => navigate("/GiamDoc/branches")}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border rounded-xl shadow-sm hover:shadow hover:bg-gray-50 transition"
      >
        <ArrowLeft size={18} />
        Quay lại
      </button>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Building2 className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Thêm chi nhánh / trụ sở mới</h2>
            <p className="text-sm text-gray-500">Thiết lập thông tin chi nhánh mới</p>
          </div>
        </div>

        {/* THÔNG TIN CƠ BẢN */}
        <div className="border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" /> Thông tin cơ bản
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Tên chi nhánh *</label>
              <input
                name="branch_name"
                value={form.branch_name}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Mã chi nhánh</label>
              <input
                name="branch_code"
                value={form.branch_code}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <Globe size={14} /> Tỉnh / Thành phố
              </label>
              <input
                name="province"
                value={form.province}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Địa chỉ chi tiết</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* LIÊN HỆ */}
        <div className="border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Phone size={18} className="text-green-500" /> Thông tin liên hệ
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <Phone size={14} /> Hotline
              </label>
              <input
                name="hotline"
                value={form.hotline}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <Mail size={14} /> Email
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 flex items-center gap-2">
              <FileText size={14} /> Mô tả
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              rows={3}
            />
          </div>
        </div>

        {/* TRẠNG THÁI */}
        <div className="border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">Trạng thái hoạt động</p>
            <p className="text-sm text-gray-500">Bật để chi nhánh hoạt động</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={() =>
                setForm(prev => ({ ...prev, is_active: !prev.is_active }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer
              peer-checked:bg-blue-500
              after:content-['']
              after:absolute after:top-0.5 after:left-[2px]
              after:bg-white after:border-gray-300 after:border
              after:rounded-full after:h-5 after:w-5 after:transition-all
              peer-checked:after:translate-x-full peer-checked:after:border-white">
            </div>
          </label>
        </div>

        {/* ACTION */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => navigate("/GiamDoc/branches")}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition"
          >
            Huỷ
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600
              hover:from-blue-600 hover:to-blue-700 text-white rounded-xl flex items-center gap-2 transition shadow"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            <Save size={16} />
            Lưu chi nhánh
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Eye, Edit2, Trash2, Award, Loader2, Coins, AlertTriangle } from 'lucide-react';
import AddEditPosition from './AddEditPosition';

export default function PositionManagement() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [positionToDelete, setPositionToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // States cho bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/giamdoc/positions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPositions(res.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách chức vụ:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // 💰 HÀM FORMAT TIỀN TỆ VNĐ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // 🎨 HÀM RENDER MÀU SẮC CHO CẤP BẬC (LEVEL)
  const getLevelBadge = (level) => {
    switch (level) {
      case 'director':
        return <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-md text-xs font-bold uppercase">Executive / Director</span>;
      case 'manager':
        return <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-md text-xs font-bold uppercase">Manager</span>;
      case 'senior':
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-bold uppercase">Senior</span>;
      case 'middle':
        return <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-md text-xs font-bold uppercase">Middle</span>;
      case 'junior':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold uppercase">Junior</span>;
      case 'fresher':
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold uppercase">Staff / Fresher</span>;
      case 'intern':
        return <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-md text-xs font-bold uppercase">Trainee / Intern</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-md text-xs font-bold uppercase">{level || 'Unknown'}</span>;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/giamdoc/positions/${positionToDelete.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Đã xóa chức vụ thành công!');
      setPositionToDelete(null);
      setDeleteConfirmText('');
      fetchPositions();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa!');
    } finally {
      setIsDeleting(false);
    }
  };

  // NẾU ĐANG THÊM HOẶC SỬA -> Trả về Form
  if (isAdding || editingPosition) {
    return (
      <AddEditPosition 
        position={editingPosition}
        onBack={() => { setIsAdding(false); setEditingPosition(null); }}
        onSaveSuccess={() => {
          setIsAdding(false); 
          setEditingPosition(null);
          fetchPositions(); // Cập nhật lại danh sách sau khi Lưu
        }}
      />
    );
  }

  // 🔍 LOGIC LỌC DỮ LIỆU
  const filteredPositions = positions.filter(pos => {
    const matchSearch = pos.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        pos.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = departmentFilter === 'ALL' || pos.department === departmentFilter;
    const matchLevel = levelFilter === 'ALL' || pos.level === levelFilter;
    
    return matchSearch && matchDept && matchLevel;
  });

  const uniqueDepartments = [...new Set(positions.map(p => p.department))];

  return (
    <div className="p-6 bg-white min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
              <Award className="text-cyan-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quản lý Chức vụ & Cấp bậc</h1>
              <p className="text-sm text-slate-500 mt-1">Thiết lập danh mục chức danh, phân bổ phòng ban và khung lương cơ bản.</p>
            </div>
          </div>
          
          {/* 👉 NÚT THÊM CHỨC VỤ */}
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-sm shadow-cyan-200"
          >
            <Plus size={18} /> Thêm chức vụ
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã, tên chức vụ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-sm"
            />
          </div>
          
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full md:w-56 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-cyan-400 shadow-sm"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {uniqueDepartments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>

          <select 
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-cyan-400 shadow-sm"
          >
            <option value="ALL">Tất cả cấp bậc</option>
            <option value="director">Executive / Director</option>
            <option value="manager">Manager</option>
            <option value="senior">Senior</option>
            <option value="middle">Middle</option>
            <option value="junior">Junior</option>
            <option value="fresher">Staff / Fresher</option>
            <option value="intern">Trainee / Intern</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">MÃ CV</th>
                  <th className="py-4 px-6">TÊN CHỨC VỤ</th>
                  <th className="py-4 px-6">PHÒNG BAN</th>
                  <th className="py-4 px-6 text-center">CẤP BẬC (LEVEL)</th>
                  <th className="py-4 px-6 text-right">LƯƠNG CƠ BẢN (MIN)</th>
                  <th className="py-4 px-6 text-center">NS HIỆN TẠI</th>
                  <th className="py-4 px-6 text-center">THAO TÁC</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-10 text-center">
                      <Loader2 className="animate-spin text-cyan-500 mx-auto mb-2" size={32} />
                      <p className="text-slate-500">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-slate-500">
                      Không tìm thấy chức vụ nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-4 px-6 text-sm font-medium text-slate-500">{pos.code}</td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-800">{pos.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{pos.department}</td>
                      <td className="py-4 px-6 text-center">
                        {getLevelBadge(pos.level)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-sm font-bold text-emerald-600">
                          <Coins size={14} className="text-emerald-500" />
                          {formatCurrency(pos.baseSalaryMin)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                          {pos.employeeCount}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-2">
                          {/* 👉 NÚT SỬA */}
                          <button 
                            onClick={() => setEditingPosition(pos)}
                            className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors" 
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          
                          {/* 👉 NÚT XÓA */}
                          <button 
                            onClick={() => setPositionToDelete(pos)}
                            className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-500 hover:text-white transition-colors" 
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* FOOTER */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-500 flex justify-between items-center">
            <span>
              Hiển thị <span className="font-bold text-slate-700">{filteredPositions.length > 0 ? 1 : 0}</span> đến <span className="font-bold text-slate-700">{filteredPositions.length}</span> trong tổng số <span className="font-bold text-slate-800">{filteredPositions.length}</span> chức vụ
            </span>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 👉 POPUP XÁC NHẬN XÓA CHỨC VỤ */}
        {/* ========================================================== */}
        {positionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-xl font-bold">Cảnh báo xóa chức vụ</h3>
              </div>
              
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Bạn đang thao tác xóa chức vụ <span className="font-bold text-slate-800">{positionToDelete.name}</span>. 
                Hành động này <span className="font-bold text-red-500">không thể hoàn tác</span>.
                <br /><br />
                <span className="text-xs italic text-amber-600">
                  Lưu ý: Hệ thống sẽ chặn thao tác xóa nếu chức vụ này đang được gắn cho nhân viên.
                </span>
              </p>

              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vui lòng nhập chữ <span className="font-bold text-red-600 select-none">delete</span> để xác nhận:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-red-400 focus:ring-1 focus:ring-red-400 focus:outline-none transition-all"
                  placeholder="Nhập chữ delete..."
                  autoComplete="off"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setPositionToDelete(null); setDeleteConfirmText(''); }}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || isDeleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
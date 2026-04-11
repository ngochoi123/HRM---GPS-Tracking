import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Users, AlertTriangle, Loader2 } from 'lucide-react';
import EmployeeDetail from './EmployeeDetail';
import EditEmployee from './EditEmployee';
import AddEmployee from './AddEmployee';
import { managerEmployeeService } from '../../services/managerEmployeeService';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // States cho Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // State lưu nhân viên đang xem, chỉnh sửa & thêm mới
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await managerEmployeeService.getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách nhân viên:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 🎨 HÀM XỬ LÝ MÀU SẮC TRẠNG THÁI
  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };
      case 'on_leave':
        return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' };
      case 'inactive':
        return { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
    }
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await managerEmployeeService.deleteEmployee(employeeToDelete.id);
      alert('Đã xóa nhân viên thành công!');
      
      // Đóng popup, reset chữ và load lại danh sách
      setEmployeeToDelete(null);
      setDeleteConfirmText('');
      fetchEmployees();
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Có lỗi xảy ra khi xóa nhân viên này!');
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔍 LOGIC LỌC DỮ LIỆU
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    
    return matchSearch && matchDept && matchStatus;
  });

  // 📄 LOGIC PHÂN TRANG
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirst, indexOfLast);

  // ==========================================================
  // 1. NẾU ĐANG BẤM NÚT "THÊM NHÂN VIÊN" -> HIỂN THỊ FORM THÊM
  // ==========================================================
  if (isAdding) {
    return (
      <AddEmployee 
        onBack={() => setIsAdding(false)} 
        onSaveSuccess={() => {
          setIsAdding(false);
          fetchEmployees(); // Load lại danh sách sau khi thêm thành công
        }} 
      />
    );
  }

  // ==========================================================
  // 2. NẾU ĐANG BẤM NÚT "SỬA" -> HIỂN THỊ FORM CHỈNH SỬA
  // ==========================================================
  if (editingEmployee) {
    return (
      <EditEmployee 
        employee={editingEmployee} 
        onBack={() => setEditingEmployee(null)} 
        onSaveSuccess={() => {
          setEditingEmployee(null); // Tắt form
          setViewingEmployee(null); // Trở về danh sách
          fetchEmployees(); // Kéo lại data mới nhất từ DB
        }} 
      />
    );
  }

  // ==========================================================
  // 3. NẾU ĐANG BẤM NÚT "XEM" -> HIỂN THỊ TRANG CHI TIẾT
  // ==========================================================
  if (viewingEmployee) {
    return (
      <EmployeeDetail 
        employee={viewingEmployee} 
        onBack={() => setViewingEmployee(null)} 
        onEdit={() => setEditingEmployee(viewingEmployee)} // Cho phép bấm nút "Edit" từ trong trang Chi tiết
      />
    );
  }

  // ==========================================================
  // 4. MẶC ĐỊNH -> HIỂN THỊ BẢNG DANH SÁCH
  // ==========================================================
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
              <Users className="text-cyan-500" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Danh sách nhân viên</h1>
              <p className="text-sm text-slate-500 mt-0.5">Quản lý thông tin, chức vụ và trạng thái của toàn bộ nhân sự.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-cyan-200"
          >
            <Plus size={18} /> Thêm nhân viên
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã NV, email..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>
          
          <select 
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
            className="w-full md:w-56 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Tất cả phòng ban</option>
            <option value="Công nghệ (IT)">Công nghệ (IT)</option>
            <option value="Nhân sự (HR)">Nhân sự (HR)</option>
            <option value="Marketing">Marketing</option>
            <option value="Kế toán">Kế toán</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="on_leave">Nghỉ phép/Thai sản</option>
            <option value="inactive">Đã nghỉ việc</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-4 px-4 font-semibold">MÃ NV</th>
                <th className="py-4 px-4 font-semibold">NHÂN VIÊN</th>
                <th className="py-4 px-4 font-semibold">CHỨC VỤ</th>
                <th className="py-4 px-4 font-semibold">PHÒNG BAN</th>
                <th className="py-4 px-4 font-semibold text-center">TRẠNG THÁI</th>
                <th className="py-4 px-4 font-semibold text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.map((emp) => {
                const styles = getStatusStyle(emp.status);
                
                return (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-4 text-sm font-medium text-slate-600">{emp.code}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-100 to-blue-100 flex items-center justify-center font-bold text-cyan-700 text-sm">
                          {emp.name.split(' ').pop().charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">{emp.position}</td>
                    <td className="py-4 px-4 text-sm font-medium text-slate-700">{emp.department}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${styles.bg} ${styles.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
                        {emp.statusText}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        
                        {/* NÚT XEM */}
                        <button 
                          onClick={() => setViewingEmployee(emp)} 
                          className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500 hover:bg-cyan-500 hover:text-white transition-colors" 
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>

                        {/* NÚT SỬA */}
                        <button 
                          onClick={() => setEditingEmployee(emp)} 
                          className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors" 
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* NÚT XÓA */}
                        <button onClick={() => setEmployeeToDelete(emp)} className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-500 hover:text-white transition-colors" title="Xóa">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {currentEmployees.length === 0 && !loading && (
            <div className="py-10 text-center text-slate-500">
              Không tìm thấy nhân viên nào phù hợp với bộ lọc.
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-slate-100 gap-4">
          <div className="text-sm text-slate-500">
            Hiển thị <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : indexOfFirst + 1}</span> đến <span className="font-semibold text-slate-700">{Math.min(indexOfLast, totalItems)}</span> trong tổng số <span className="font-bold text-slate-800">{totalItems}</span> nhân viên
          </div>
          
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors
                  ${currentPage === i + 1 
                    ? 'bg-cyan-500 text-white border-transparent' 
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {i + 1}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
            {employeeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-xl font-bold">Cảnh báo xóa nhân viên</h3>
              </div>
              
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                Bạn đang thao tác xóa nhân viên <span className="font-bold text-slate-800">{employeeToDelete.name}</span>. 
                Hành động này sẽ xóa toàn bộ hồ sơ và tài khoản đăng nhập của nhân viên này, và <span className="font-bold text-red-500">không thể hoàn tác</span>.
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
                  onClick={() => { setEmployeeToDelete(null); setDeleteConfirmText(''); }}
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
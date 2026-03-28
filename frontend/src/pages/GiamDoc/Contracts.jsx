import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, FileText, Eye, Edit2, Clock, Loader2 } from 'lucide-react';
//import AddEditContract from './AddEditContract';

export default function ContractManagement() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // States lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // States quản lý Form
  const [isAdding, setIsAdding] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/giamdoc/contracts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setContracts(res.data);
    } catch (error) {
      console.error("Lỗi khi tải hợp đồng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // 🎨 Cấu hình hiển thị Loại hợp đồng
  const getTypeBadge = (typeCode, typeName) => {
    switch (typeCode) {
      case 'indefinite':
        return <span className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold">{typeName}</span>;
      case 'probation':
        return <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">{typeName}</span>;
      default:
        return <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{typeName}</span>;
    }
  };

  // 🎨 Cấu hình hiển thị Trạng thái
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Còn hiệu lực</span>;
      case 'expiring_soon':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Sắp hết hạn</span>;
      case 'expired':
      case 'terminated':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Đã chấm dứt</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Không xác định";
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // NẾU ĐANG BẤM NÚT THÊM / SỬA -> Hiển thị form
  if (isAdding || editingContract) {
    return (
      <AddEditContract 
        contract={editingContract}
        onBack={() => { setIsAdding(false); setEditingContract(null); }}
        onSaveSuccess={() => {
          setIsAdding(false);
          setEditingContract(null);
          fetchContracts(); // Cập nhật lại list sau khi lưu
        }}
      />
    );
  }

  // Lọc dữ liệu
  const filteredContracts = contracts.filter(c => {
    const matchSearch = c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || c.typeCode === typeFilter;
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
              <FileText className="text-cyan-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Danh sách Hợp đồng lao động</h1>
              <p className="text-sm text-slate-500 mt-1">Quản lý thông tin, thời hạn và trạng thái hợp đồng của toàn bộ nhân sự.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {/* Nút Xuất Excel đã được gỡ bỏ khỏi đây */}
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-sm shadow-cyan-200"
            >
              <Plus size={18} /> Tạo hợp đồng mới
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo mã HĐ, tên nhân viên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-sm"
            />
          </div>
          
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full md:w-56 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-cyan-400 shadow-sm">
            <option value="ALL">Tất cả loại HĐ</option>
            <option value="indefinite">Vô thời hạn</option>
            <option value="probation">Thử việc</option>
            <option value="fixed_1y">Xác định TH (1 năm)</option>
            <option value="fixed_3y">Xác định TH (3 năm)</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-48 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-cyan-400 shadow-sm">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="active">Còn hiệu lực</option>
            <option value="expiring_soon">Sắp hết hạn</option>
            <option value="terminated">Đã chấm dứt</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">MÃ HĐ</th>
                  <th className="py-4 px-6">NHÂN VIÊN</th>
                  <th className="py-4 px-6">LOẠI HỢP ĐỒNG</th>
                  <th className="py-4 px-6">THỜI HẠN</th>
                  <th className="py-4 px-6 text-center">TRẠNG THÁI</th>
                  <th className="py-4 px-6 text-center">THAO TÁC</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="py-10 text-center"><Loader2 className="animate-spin text-cyan-500 mx-auto mb-2" size={32} /></td></tr>
                ) : filteredContracts.length === 0 ? (
                  <tr><td colSpan="6" className="py-10 text-center text-slate-500">Chưa có dữ liệu hợp đồng.</td></tr>
                ) : (
                  filteredContracts.map((c) => (
                    <tr key={c.id} className={`hover:bg-slate-50/70 transition-colors group ${!c.isActive ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-6 text-sm font-medium text-slate-500">{c.contractNumber}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-100 to-blue-100 flex items-center justify-center font-bold text-cyan-700 text-sm">
                            {c.employeeName.split(' ').pop().charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{c.employeeName}</p>
                            <p className="text-xs text-slate-500">{c.positionName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">{getTypeBadge(c.typeCode, c.typeName)}</td>
                      <td className="py-4 px-6">
                        <p className={`text-sm font-bold ${!c.isActive ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {formatDate(c.startDate)} - {c.endDate ? formatDate(c.endDate) : 'Không xác định'}
                        </p>
                        {c.status === 'expiring_soon' && c.daysLeft && (
                          <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
                            <Clock size={12} /> Còn {c.daysLeft} ngày
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">{getStatusBadge(c.status)}</td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500 hover:bg-cyan-500 hover:text-white transition-colors" title="Xem">
                            <Eye size={15} />
                          </button>
                          <button 
                            onClick={() => setEditingContract(c)}
                            className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors" 
                            title="Sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { ArrowLeft, Edit2, FileText, User, Briefcase, Calculator, Clock, CheckCircle2 } from 'lucide-react';

export default function ViewContract({ contract, onBack, onEdit }) {
  if (!contract) return null;

  // Format Tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Format Ngày tháng
  const formatDate = (dateStr) => {
    if (!dateStr) return "Không xác định";
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // Tính tổng lương
  const allowances = Array.isArray(contract.allowances) ? contract.allowances : [];
  const totalSalary = Number(contract.baseSalary || 0) + allowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Badge Trạng thái
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Còn hiệu lực</span>;
      case 'expiring_soon':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Sắp hết hạn</span>;
      case 'expired':
      case 'terminated':
        return <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-bold">Đã chấm dứt</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">
      <div className="max-w-4xl mx-auto pt-6 px-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">Chi tiết Hợp đồng</h1>
                {getStatusBadge(contract.status)}
              </div>
              <p className="text-sm text-slate-500 mt-1">Mã HĐ: <span className="font-bold text-cyan-600">{contract.contractNumber}</span></p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={onEdit} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all">
              <Edit2 size={16} /> Chỉnh sửa hợp đồng
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHI TIẾT ("TỜ A4") */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          
          {/* Section 1: Đối tượng */}
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              <User className="text-cyan-500" size={20} /> Bên B - Người lao động
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 px-2">
              <div>
                <p className="text-sm text-slate-500 mb-1">Họ và tên</p>
                <p className="font-bold text-slate-800 text-lg">{contract.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Chức vụ đảm nhận</p>
                <p className="font-semibold text-slate-700">{contract.positionName}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Thời hạn */}
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              <Clock className="text-amber-500" size={20} /> Thời hạn hợp đồng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 px-2">
              <div>
                <p className="text-sm text-slate-500 mb-1">Loại hợp đồng</p>
                <p className="font-semibold text-slate-700">{contract.typeName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Thời gian hiệu lực</p>
                <p className="font-semibold text-slate-700">
                  {formatDate(contract.startDate)} <span className="mx-2 text-slate-400">đến</span> {contract.endDate ? formatDate(contract.endDate) : 'Vô thời hạn'}
                </p>
              </div>
              {contract.status === 'expiring_soon' && (
                <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-amber-700 text-sm mt-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p><strong>Chú ý:</strong> Hợp đồng này sắp hết hạn trong <strong>{contract.daysLeft} ngày</strong> nữa. Vui lòng xem xét gia hạn.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Lương & Phụ cấp */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              <Calculator className="text-emerald-500" size={20} /> Chế độ đãi ngộ
            </h3>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600 font-medium">Lương cơ bản (Theo hợp đồng):</span>
                <span className="font-bold text-slate-800 text-lg">{formatCurrency(contract.baseSalary)}</span>
              </div>

              {allowances.length > 0 && (
                <div className="border-t border-dashed border-slate-300 py-4">
                  <p className="text-sm text-slate-500 mb-3 font-semibold">Các khoản phụ cấp:</p>
                  <ul className="space-y-2">
                    {allowances.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {item.name}</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 mt-2 flex justify-between items-center">
                <span className="text-slate-800 font-bold">Tổng thu nhập ước tính/tháng:</span>
                <span className="font-bold text-emerald-600 text-2xl">{formatCurrency(totalSalary)}</span>
              </div>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
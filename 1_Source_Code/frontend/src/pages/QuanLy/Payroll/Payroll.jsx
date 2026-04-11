import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calculator, Eye, FileSpreadsheet, Send, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { payrollService } from '../../../services/payrollService'; 
import PayrollDetailModal from './PayrollDetailModal';
import * as XLSX from 'xlsx';

const Payroll = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [monthYear, setMonthYear] = useState('2026-03');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedRows, setSelectedRows] = useState([]);

  // Hàm format số nguyên (loại bỏ thập phân để bảng gọn gàng)
  const fmt = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

  useEffect(() => {
    fetchPayrollData();
  }, [monthYear]);

  const fetchPayrollData = async () => {
    if (!monthYear) return;
    setLoading(true);
    try {
      const [year, month] = monthYear.split('-');
      const formattedMonthYear = `${month}-${year}`;

      const res = await payrollService.getCalculation(formattedMonthYear, null);
      if (res.success) {
        setData(res.data);
        setCurrentPage(1);
        setSelectedRows([]); 
        if(res.data.length === 0) toast.error("Không tìm thấy dữ liệu tháng này!");
        else toast.success(`Đã tải bảng lương tháng ${month}/${year}`);
      }
    } catch (e) { 
      toast.error("Lỗi lấy dữ liệu từ hệ thống!"); 
      console.error(e);
    }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(currentData.map(item => item.employee_code));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (code) => {
    setSelectedRows(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleDownloadExcel = () => {
    if (data.length === 0) {
      toast.error("Không có dữ liệu để tải xuống!");
      return;
    }

    const excelData = data.map((item, idx) => ({
      'STT': idx + 1,
      'Mã NV': item.employee_code,
      'Tên Nhân Viên': item.full_name,
      'Phòng Ban': item.department_name,
      'Thu Nhập Tháng': Math.round(item.actual_salary),
      'Số Ngày Công': item.total_work_days,
      'Tăng Ca': item.overtime || 0,
      'Kỷ Luật': Math.round(item.discipline || 0),
      'Thưởng': Math.round(item.reward || 0),
      'DN Đóng BHXH (17.5%)': Math.round(item.compInsurance.bhxh),
      'DN Đóng BHYT (3%)': Math.round(item.compInsurance.bhyt),
      'DN Đóng BHTN (1%)': Math.round(item.compInsurance.bhtn),
      'NLĐ Đóng BHXH (8%)': Math.round(item.empInsurance.bhxh),
      'NLĐ Đóng BHYT (1.5%)': Math.round(item.empInsurance.bhyt),
      'NLĐ Đóng BHTN (1%)': Math.round(item.empInsurance.bhtn),
      'Thu Nhập Sau BH': Math.round(item.income_after_insurance),
      'Doanh Nghiệp Đóng Thuế': Math.round(item.pitTax),
      'Chi Phí Tiền Lương': Math.round(item.company_cost),
      'Thực Nhận (NET)': Math.round(item.net_salary)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangLuong");
    
    const [year, month] = monthYear.split('-');
    XLSX.writeFile(workbook, `Bang_luong_thang_${month}-${year}.xlsx`);
  };

  const startItem = data.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);

  // LOGIC RÀNG BUỘC: Kiểm tra nếu chọn từ 2 người trở lên
  const isMultipleSelected = selectedRows.length >= 2;

  return (
    <div className="p-3 md:p-5 bg-[#f8f9fa] min-h-[calc(100vh-60px)] flex flex-col w-full">
      
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-gray-800 flex items-center gap-3 uppercase tracking-tight">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white"><FileSpreadsheet size={20} /></div>
            Báo cáo lương hiện tại
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={monthYear} 
            onChange={e => setMonthYear(e.target.value)} 
            className="border-2 border-gray-200 px-4 py-2 rounded-xl w-36 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 transition-colors shadow-sm cursor-pointer" 
          />
          <button disabled={data.length===0 || loading} className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm">
            <Send size={16}/> Gửi đến Giám đốc
          </button>
        </div>
      </div>

      {loading && (
        <div className="w-full h-1 bg-blue-50 overflow-hidden mb-2 rounded-full shrink-0">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '50%' }}></div>
        </div>
      )}

      {/* Bảng Lương Chính */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden mb-4 min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-[10.5px] xl:text-[11.5px] leading-tight whitespace-nowrap">
            <thead className="sticky top-0 z-30 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
              {/* Tiêu đề nền vàng/kem nhạt, chữ xám đậm. Đã xóa divide-x để bỏ khung thô */}
              <tr className="bg-[#fdfcf5] text-gray-700 font-bold text-center">
                <th rowSpan="2" className="p-2 min-w-[200px] sticky left-0 z-40 bg-[#fdfcf5] shadow-[2px_0_5px_rgba(0,0,0,0.04)] text-left pl-4 border-b border-gray-200">
                  {/* Ô tick dễ click hơn nhờ thẻ label */}
                  <label className="flex items-center gap-3 cursor-pointer p-1 -m-1">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={currentData.length > 0 && selectedRows.length === currentData.length}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-green-600"
                    />
                    <span>Tên Nhân Viên</span>
                  </label>
                </th>
                <th rowSpan="2" className="p-2 border-b border-gray-200">Thu Nhập Tháng</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200">Số Ngày Công</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200">Tăng Ca</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-red-500">Kỷ Luật</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-green-600">Thưởng</th>
                
                <th colSpan="3" className="p-1.5 border-b border-gray-200">Doanh Nghiệp Đóng BH</th>
                <th colSpan="3" className="p-1.5 border-b border-gray-200">Người Lao Động Đóng BH</th>
                
                <th rowSpan="2" className="p-2 border-b border-gray-200">Thu Nhập Sau BH</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-orange-500">Doanh Nghiệp Đóng Thuế</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-indigo-700">Chi phí Tiền Lương</th>
                
                {/* Cột Action (trống tiêu đề) */}
                <th rowSpan="2" className="w-16 sticky right-0 z-40 bg-[#fdfcf5] border-b border-gray-200 shadow-[-2px_0_5px_rgba(0,0,0,0.04)]"></th>
              </tr>
              {/* Tỷ lệ % nằm dưới tên BH */}
              <tr className="bg-[#fdfcf5] text-gray-600 font-bold text-center border-b border-gray-200">
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHXH</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">17.5%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHYT</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">3%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHTN</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">1%</span></div></th>
                
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHXH</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">8%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHYT</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">1.5%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHTN</span><span className="text-[9px] font-medium opacity-70 mt-0.5">1%</span></div></th>
              </tr>
            </thead>
            
            {/* Đã xóa divide-x để bỏ khung dọc */}
            <tbody className="font-medium text-gray-600">
              {currentData.length === 0 && !loading ? (
                <tr><td colSpan="18" className="text-center py-16 text-gray-400 text-sm">Chưa có dữ liệu.</td></tr>
              ) : (
                currentData.map((item, idx) => {
                  const isSelected = selectedRows.includes(item.employee_code);
                  const rowBg = isSelected ? 'bg-green-50 text-gray-900' : 'bg-white hover:bg-gray-50/80';
                  const stickyBg = isSelected ? 'bg-green-50' : 'bg-white group-hover:bg-gray-50/80';

                  return (
                    <tr key={idx} className={`transition-colors border-b border-gray-50 group ${rowBg}`}>
                      
                      <td className={`px-4 py-3 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${stickyBg}`}>
                        <label className="flex items-center gap-3 cursor-pointer relative p-1 -m-1">
                          {/* Vạch đỏ ở lề trái nếu chọn */}
                          {isSelected && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-500 rounded-r-sm z-50"></div>}
                          
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.employee_code)}
                            className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-green-600 mt-0.5"
                          />
                          <div>
                            <div className="font-bold text-gray-800">{item.full_name}</div>
                            <div className="text-[9px] text-gray-400 font-mono mt-0.5">{item.employee_code}</div>
                          </div>
                        </label>
                      </td>
                      
                      {/* Các cột số tiền được tô đậm (font-bold) */}
                      <td className="px-2 py-3 text-right font-bold text-blue-800">{fmt(item.actual_salary)}</td>
                      <td className="px-2 py-3 text-center text-blue-600 font-bold bg-blue-50/10">{item.total_work_days}</td>
                      <td className="px-2 py-3 text-center text-gray-400">{item.overtime > 0 ? item.overtime : '-'}</td>
                      <td className="px-2 py-3 text-center text-red-500 font-bold">{item.discipline > 0 ? fmt(item.discipline) : '-'}</td>
                      <td className="px-2 py-3 text-right text-green-500 font-bold">{item.reward > 0 ? fmt(item.reward) : '-'}</td>
                      
                      <td className="px-2 py-3 text-right">{fmt(item.compInsurance.bhxh)}</td>
                      <td className="px-2 py-3 text-right">{fmt(item.compInsurance.bhyt)}</td>
                      <td className="px-2 py-3 text-right">{fmt(item.compInsurance.bhtn)}</td>
                      
                      <td className="px-2 py-3 text-right">{fmt(item.empInsurance.bhxh)}</td>
                      <td className="px-2 py-3 text-right">{fmt(item.empInsurance.bhyt)}</td>
                      <td className="px-2 py-3 text-right">{fmt(item.empInsurance.bhtn)}</td>
                      
                      <td className="px-2 py-3 text-right font-bold text-gray-700 bg-gray-50/50">{fmt(item.income_after_insurance)}</td>
                      <td className="px-2 py-3 text-right text-orange-500 font-bold">{fmt(item.pitTax)}</td>
                      <td className="px-2 py-3 text-right font-black text-indigo-600 bg-indigo-50/20">{fmt(item.company_cost)}</td>
                      
                      {/* Nút Xem (Eye) */}
                      <td className={`px-2 py-3 text-center sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)] ${stickyBg}`}>
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => !isMultipleSelected && setSelected(item)} 
                            disabled={isMultipleSelected}
                            className={`p-2 rounded-full transition-all shadow-sm ${
                              isMultipleSelected 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-95'
                            }`}
                            title={isMultipleSelected ? "Chỉ được xem chi tiết 1 nhân viên" : "Xem chi tiết"}
                          >
                            <Eye size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex w-full items-center justify-between shrink-0 pb-1">
        <div className="flex-1 flex justify-start">
          {data.length > 0 && (
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-all">
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (totalPages > 5 && page > 3 && page < totalPages) {
                    if (page === 4) return <span key={page} className="px-1 text-gray-400 text-xs">...</span>;
                    return null;
                  }
                  return (
                    <button key={page} onClick={() => handlePageChange(page)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${currentPage === page ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                      {page}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex justify-center">
          <button onClick={handleDownloadExcel} disabled={data.length === 0} className="bg-[#0f172a] hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50">
            <Download size={16} /> Tải xuống Excel
          </button>
        </div>

        <div className="flex-1 flex justify-end">
          {data.length > 0 && (
            <span className="text-xs text-gray-500 font-medium">
              Hiển thị {startItem} đến {endItem} trong {data.length} nhân viên
            </span>
          )}
        </div>
      </div>

      {selected && <PayrollDetailModal data={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
export default Payroll;
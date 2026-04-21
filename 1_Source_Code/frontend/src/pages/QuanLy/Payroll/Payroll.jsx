import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, FileSpreadsheet, Send, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { payrollService } from '../../../services/payrollService';
import PayrollDetailModal from './PayrollDetailModal';
import * as XLSX from 'xlsx';

const PAYROLL_VI_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const buildPayrollYearOptions = () => {
  const nowY = new Date().getFullYear();
  const list = [];
  const from = 2000;
  const to = nowY + 10;
  for (let y = from; y <= to; y += 1) list.push(y);
  return list;
};

const isPayrollSubmittable = (item) => (item?.payroll_status || 'draft') === 'draft';

const payrollStatusLabelMap = {
  draft: 'Chưa gửi',
  pending_approval: 'Đã gửi Giám đốc',
  approved: 'Giám đốc đã duyệt',
  paid: 'Đã chi trả'
};

const Payroll = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role === 'MANAGER';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedRows, setSelectedRows] = useState([]);

  const payrollScrollRef = useRef(null);
  const payrollZoomRef = useRef(null);
  const fetchRequestRef = useRef(0);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectableCurrentData = currentData.filter(isPayrollSubmittable);

  const payrollYearOptions = React.useMemo(() => buildPayrollYearOptions(), []);
  const rawParts = (monthYear || '').split('-');
  let payrollYearStr = rawParts[0];
  let payrollMonthStr = rawParts[1];
  if (!/^\d{4}$/.test(payrollYearStr)) payrollYearStr = String(new Date().getFullYear());
  if (!/^\d{2}$/.test(payrollMonthStr)) payrollMonthStr = '01';
  const selectedYearNum = parseInt(payrollYearStr, 10);
  const yearOptionsForSelect = React.useMemo(() => {
    if (Number.isFinite(selectedYearNum) && !payrollYearOptions.includes(selectedYearNum)) {
      return [...payrollYearOptions, selectedYearNum].sort((a, b) => a - b);
    }
    return payrollYearOptions;
  }, [payrollYearOptions, selectedYearNum]);

  /** Zoom nhẹ đồng đều để ~16 cột vừa khung, giữ nguyên tỷ lệ padding/chữ (không đổi layout). */
  useLayoutEffect(() => {
    const scroll = payrollScrollRef.current;
    const zoomEl = payrollZoomRef.current;
    if (!scroll || !zoomEl) return;
    const table = zoomEl.querySelector('table');
    if (!table) return;

    const supportsZoom =
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1');

    const fit = () => {
      zoomEl.style.zoom = '1';
      zoomEl.style.transform = '';
      zoomEl.style.transformOrigin = '';
      zoomEl.style.width = '';
      void zoomEl.offsetHeight;

      const avail = Math.max(0, scroll.clientWidth - 8);
      const need = table.scrollWidth;
      let z = 1;
      if (need > avail && avail > 0) {
        z = Math.max(0.76, Math.min(1, avail / need));
      }

      if (supportsZoom) {
        zoomEl.style.zoom = String(z);
      } else {
        zoomEl.style.transformOrigin = 'top left';
        zoomEl.style.transform = `scale(${z})`;
        zoomEl.style.width = z < 1 ? `${100 / z}%` : '';
      }
    };

    const ro = new ResizeObserver(fit);
    ro.observe(scroll);
    fit();
    return () => ro.disconnect();
  }, [data.length, currentPage, loading, monthYear, currentData.length]);

  const fmt = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

  const fmtPayrollDec2 = (val) => {
    if (val == null || val === '') return '0,00';
    const n = Number(val);
    if (!Number.isFinite(n)) return String(val);
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.round(n * 100) / 100);
  };

  const fetchPayrollData = useCallback(async (options = {}) => {
    if (!monthYear) return;
    const silent = Boolean(options.silent);
    const preserveEmployeeCode = options.preserveEmployeeCode ?? null;
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;

    setLoading(true);
    try {
      const [year, month] = monthYear.split('-');
      const formattedMonthYear = `${month}-${year}`;
      if (!preserveEmployeeCode) {
        setSelected(null);
      }

      const res = await payrollService.getCalculation(formattedMonthYear, isManager ? user.department_id : null);
      if (fetchRequestRef.current !== requestId) {
        return;
      }
      if (res?.success) {
        const rows = Array.isArray(res.data) ? res.data : [];
        const normalizedRows = rows.map((row) => ({
          ...row,
          total_work_days: Number.isFinite(Number(row?.total_work_days))
            ? Number(row.total_work_days)
            : 0,
        }));

        setData(normalizedRows);
        if (!preserveEmployeeCode) {
          setCurrentPage(1);
        }
        setSelectedRows((prev) =>
          prev.filter((code) => normalizedRows.some((row) => row.employee_code === code && isPayrollSubmittable(row)))
        );
        if (preserveEmployeeCode) {
          const row = normalizedRows.find((d) => d.employee_code === preserveEmployeeCode);
          if (row) setSelected(row);
        }
        if (!silent) {
          if (normalizedRows.length === 0) {
            toast.error('Không tìm thấy dữ liệu tháng này!', { id: `payroll-empty-${year}-${month}` });
          } else {
            toast.success(`Đã tải bảng lương tháng ${month}/${year}`, {
              id: `payroll-loaded-${year}-${month}`,
            });
          }
        }
      } else {
        setData([]);
        setSelectedRows([]);
        if (!preserveEmployeeCode) {
          setCurrentPage(1);
        }
        if (!silent) {
          toast.error(res?.error || res?.message || 'Không thể tải dữ liệu bảng lương.');
        }
      }
    } catch (e) {
      toast.error('Lỗi lấy dữ liệu từ hệ thống!', { id: 'payroll-fetch-error' });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthYear]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows((prev) => [
        ...new Set([...prev, ...selectableCurrentData.map((item) => item.employee_code)])
      ]);
    } else {
      setSelectedRows((prev) =>
        prev.filter((code) => !selectableCurrentData.some((item) => item.employee_code === code))
      );
    }
  };

  const handleSelectRow = (code, disabled = false) => {
    if (disabled) return;
    setSelectedRows(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleDownloadExcel = () => {
    if (data.length === 0) {
      toast.error('Không có dữ liệu để tải xuống!');
      return;
    }

    const excelData = data.map((item, idx) => ({
      STT: idx + 1,
      'Mã NV': item.employee_code,
      'Tên Nhân Viên': item.full_name,
      'Phòng Ban': item.department_name,
      'Thu Nhập Tháng': Math.round(item.actual_salary),
      'Số Ngày Công': Math.round(Number(item.total_work_days || 0) * 100) / 100,
      'Tăng Ca': item.overtime || 0,
      'Kỷ Luật': Math.round(item.discipline || 0),
      'Thưởng': Math.round(item.reward || 0),
      'DN Đóng BHXH (17.5%)': Math.round(item.compInsurance.bhxh),
      'DN Đóng BHYT (3%)': Math.round(item.compInsurance.bhyt),
      'DN Đóng BHTN (1%)': Math.round(item.compInsurance.bhtn),
      'NLĐ Đóng BHXH (8%)': Math.round(item.empInsurance.bhxh),
      'NLĐ Đóng BHYT (1.5%)': Math.round(item.empInsurance.bhyt),
      'NLĐ Đóng BHTN (1%)': Math.round(item.empInsurance.bhtn),
      'Thực Nhận Tháng': Math.round(item.income_after_insurance),
      'Tổng DN Đóng BH': Math.round(item.compInsurance.total),
      'Chi Phí Tiền Lương': Math.round(item.company_cost)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangLuong');
    
    const [year, month] = monthYear.split('-');
    XLSX.writeFile(workbook, `Bang_luong_thang_${month}-${year}.xlsx`);
  };

  const handleSubmitToDirector = async () => {
    if (!selectedRows.length) {
      toast.error('Hãy chọn ít nhất một bảng lương để gửi.');
      return;
    }

    try {
      setLoading(true);
      const [year, month] = monthYear.split('-');
      const formattedMonthYear = `${month}-${year}`;

      const res = await payrollService.submitToDirector({
        monthYear: formattedMonthYear,
        employeeCodes: selectedRows
      });

      if (res?.success) {
        toast.success(res.message || 'Đã gửi bảng lương đến Giám đốc.');
        setSelectedRows([]);
        await fetchPayrollData({ silent: true });
      }
    } catch (error) {
      console.error('handleSubmitToDirector error:', error);
      toast.error(error?.response?.data?.message || 'Không thể gửi bảng lương đến Giám đốc.');
    } finally {
      setLoading(false);
    }
  };

  const startItem = data.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);
  const isMultipleSelected = selectedRows.length >= 2;

  const easeOut = [0.22, 1, 0.36, 1];

  return (
    <Motion.div
      className="font-sans p-3 md:p-5 bg-[#f8f9fa] min-h-[calc(100vh-60px)] flex flex-col w-full text-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.38, ease: easeOut }}
    >
      <Motion.div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center gap-4 mb-4 shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.04, ease: easeOut }}
      >
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900 flex items-center gap-3 uppercase tracking-tight">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white"><FileSpreadsheet size={20} /></div>
            Báo cáo lương hiện tại
          </h1>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div
            className="flex items-center gap-1.5 shrink-0 border-2 border-gray-200 rounded-xl px-2.5 py-1.5 sm:py-2 shadow-sm bg-white focus-within:border-blue-500 transition-colors"
            title="Chọn kỳ bảng lương (tháng / năm)"
          >
            <Calendar className="w-[18px] h-[18px] text-gray-500 shrink-0" aria-hidden />
            <select
              aria-label="Chọn tháng"
              value={payrollMonthStr}
              onChange={(e) => setMonthYear(`${payrollYearStr}-${e.target.value}`)}
              className="payroll-period-select min-w-[7.25rem] sm:min-w-[7.75rem] border-0 bg-transparent text-sm font-bold text-gray-700 cursor-pointer py-1 pl-1 pr-6 appearance-none bg-[length:1rem] bg-[right_0.15rem_center] bg-no-repeat outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              {PAYROLL_VI_MONTHS.map((label, i) => {
                const val = String(i + 1).padStart(2, '0');
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
            <select
              aria-label="Chọn năm"
              value={payrollYearStr}
              onChange={(e) => setMonthYear(`${e.target.value}-${payrollMonthStr}`)}
              className="payroll-period-select min-w-[8.75rem] sm:min-w-[9rem] border-0 bg-transparent text-sm font-bold text-gray-700 cursor-pointer py-1 pl-1 pr-6 appearance-none bg-[length:1rem] bg-[right_0.15rem_center] bg-no-repeat outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0 tabular-nums"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              {yearOptionsForSelect.map((y) => (
                <option key={y} value={String(y)}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSubmitToDirector}
            disabled={data.length === 0 || loading || selectedRows.length === 0}
            className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Send size={16}/> Gửi đến Giám đốc
          </button>
        </div>
      </Motion.div>

      {loading && (
        <div className="w-full h-1 bg-blue-50 overflow-hidden mb-2 rounded-full shrink-0">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '50%' }}></div>
        </div>
      )}

      <Motion.div
        className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden mb-4 min-h-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: easeOut }}
      >
        <div ref={payrollScrollRef} className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <div ref={payrollZoomRef} className="w-max min-w-full">
          <table className="w-full min-w-max text-left text-xs xl:text-sm leading-snug whitespace-nowrap font-sans">
            <thead className="sticky top-0 z-30 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
              <tr className="bg-[#fdfcf5] text-gray-700 font-bold text-center">
                <th rowSpan="2" className="p-2 min-w-[200px] sticky left-0 z-40 bg-[#fdfcf5] shadow-[2px_0_5px_rgba(0,0,0,0.04)] text-left pl-4 border-b border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer p-1 -m-1">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectableCurrentData.length > 0 && selectableCurrentData.every((item) => selectedRows.includes(item.employee_code))}
                      disabled={selectableCurrentData.length === 0}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-green-600 disabled:cursor-not-allowed"
                    />
                    <span>Tên Nhân Viên</span>
                  </label>
                </th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-blue-800">Thu Nhập Tháng</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200">Số Ngày Công</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200">Tăng Ca</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-red-500">Kỷ Luật</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-green-600">Thưởng</th>
                
                <th colSpan="3" className="p-1.5 border-b border-gray-200">Doanh Nghiệp Đóng BH</th>
                <th colSpan="3" className="p-1.5 border-b border-gray-200">Người Lao Động Đóng BH</th>
                
                <th rowSpan="2" className="p-2 border-b border-gray-200">Thực Nhận Tháng</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-orange-500">Tổng DN Đóng BH</th>
                <th rowSpan="2" className="p-2 border-b border-gray-200 text-indigo-700">Chi phí Tiền Lương</th>
                
                <th rowSpan="2" className="w-16 sticky right-0 z-40 bg-[#fdfcf5] border-b border-gray-200 shadow-[-2px_0_5px_rgba(0,0,0,0.04)]"></th>
              </tr>
              <tr className="bg-[#fdfcf5] text-gray-600 font-bold text-center border-b border-gray-200">
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHXH</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">17.5%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHYT</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">3%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHTN</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">1%</span></div></th>
                
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHXH</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">8%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHYT</span><span className="text-[9px] font-semibold opacity-70 mt-0.5">1.5%</span></div></th>
                <th className="p-1.5"><div className="flex flex-col items-center"><span>BHTN</span><span className="text-[9px] font-medium opacity-70 mt-0.5">1%</span></div></th>
              </tr>
            </thead>
            
            <tbody className="font-medium text-gray-600">
              {currentData.length === 0 && !loading ? (
                <tr><td colSpan="18" className="text-center py-16 text-gray-400 text-sm">Chưa có dữ liệu.</td></tr>
              ) : (
                currentData.map((item, idx) => {
                  const isSelected = selectedRows.includes(item.employee_code);
                  const isSubmittable = isPayrollSubmittable(item);
                  const rowBg = isSelected ? 'bg-green-50 text-gray-900' : 'bg-white hover:bg-gray-50/80';
                  const stickyBg = isSelected ? 'bg-green-50' : 'bg-white group-hover:bg-gray-50/80';

                  return (
                    <tr key={idx} className={`transition-colors border-b border-gray-50 group ${rowBg}`}>
                      
                      <td className={`px-4 py-3 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${stickyBg}`}>
                        <label className="flex items-center gap-3 cursor-pointer relative p-1 -m-1">
                          {isSelected && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-500 rounded-r-sm z-50"></div>}
                          
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSubmittable}
                            onChange={() => handleSelectRow(item.employee_code, !isSubmittable)}
                            className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-green-600 mt-0.5 disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className="font-bold text-gray-800">{item.full_name}</div>
                            <div className="text-[10px] text-gray-500 font-semibold tabular-nums tracking-wide mt-0.5">{item.employee_code}</div>
                            <div className={`text-[10px] font-bold mt-1 ${
                              item.payroll_status === 'approved'
                                ? 'text-emerald-600'
                                : item.payroll_status === 'pending_approval'
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                            }`}>
                              {payrollStatusLabelMap[item.payroll_status || 'draft'] || 'Chưa gửi'}
                            </div>
                          </div>
                        </label>
                      </td>
                      
                      <td className="px-2 py-3 text-right font-bold text-blue-800 tabular-nums">{fmt(item.actual_salary)}</td>
                      <td className="px-2 py-3 text-center text-blue-600 font-bold bg-blue-50/10 tabular-nums">{fmtPayrollDec2(item.total_work_days)}</td>
                      <td className="px-2 py-3 text-center text-gray-500 tabular-nums">{fmtPayrollDec2(item.overtime)}</td>
                      <td className="px-2 py-3 text-center text-red-500 font-bold tabular-nums">{item.discipline > 0 ? fmt(item.discipline) : '-'}</td>
                      <td className="px-2 py-3 text-right text-green-600 font-bold tabular-nums">{item.reward > 0 ? fmt(item.reward) : '-'}</td>
                      
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.compInsurance.bhxh)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.compInsurance.bhyt)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.compInsurance.bhtn)}</td>
                      
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.empInsurance.bhxh)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.empInsurance.bhyt)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmt(item.empInsurance.bhtn)}</td>
                      
                      <td className="px-2 py-3 text-right font-bold text-gray-800 bg-gray-50/50 tabular-nums">{fmt(item.income_after_insurance)}</td>
                      <td className="px-2 py-3 text-right text-orange-600 font-bold tabular-nums">{fmt(item.compInsurance.total)}</td>
                      <td className="px-2 py-3 text-right font-extrabold text-indigo-700 bg-indigo-50/20 tabular-nums">{fmt(item.company_cost)}</td>
                      
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
                            title={isMultipleSelected ? 'Chỉ được xem chi tiết 1 nhân viên' : 'Xem chi tiết'}
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
      </Motion.div>

      <Motion.div
        className="flex w-full items-center justify-between shrink-0 pb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, delay: 0.12, ease: easeOut }}
      >
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
      </Motion.div>

      <AnimatePresence mode="wait">
        {selected && (
          <PayrollDetailModal
            key={selected.employee_code}
            data={selected}
            payrollMonthYear={monthYear}
            onClose={() => setSelected(null)}
            onAttendanceSaved={() =>
              fetchPayrollData({ silent: true, preserveEmployeeCode: selected.employee_code })
            }
          />
        )}
      </AnimatePresence>
    </Motion.div>
  );
};
export default Payroll;

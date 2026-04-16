import React, { useState, useEffect } from 'react';
import { 
  PieChart, Calendar, TrendingUp, CreditCard, Gift, 
  Landmark, Layers, Monitor, Megaphone, Briefcase, Users,
  ArrowLeft, CheckCircle, ChevronRight, Loader2, UserCircle
} from 'lucide-react';
import payrollStatisticsService from '../../../services/payrollStatisticsService';

// Format currency
const formatVND = (amount) => {
  if (amount == null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatMillions = (amount) => {
  if (amount == null) return '0 Triệu';
  const val = Number(amount) / 1000000;
  return `${val.toLocaleString('vi-VN')} Triệu`;
};

// Map colors based on department ID or index
const colors = ['bg-indigo-500', 'bg-amber-400', 'bg-emerald-400', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
const iconMap = [Monitor, Megaphone, Briefcase, Users, Layers, Landmark];

export default function PayrollStatistics() {
  // Tháng hiện tại (Ví dụ: Tháng 04/2026 thì lấy tháng 4. Chú ý payroll trong máy tính test giả lập thường là tháng 8/2023)
  // Chọn mặc định là tháng 8 năm 2023 vì dữ liệu mock thường ở đó
  const [month, setMonth] = useState(4); 
  const [year] = useState(2026);

  const [isLoading, setIsLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Drill-down State
  const [selectedDept, setSelectedDept] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [isApproving, setIsApproving] = useState(false);

  const fetchMainData = async () => {
    try {
      setIsLoading(true);
      const [overviewData, deptsData] = await Promise.all([
        payrollStatisticsService.getOverview(month, year),
        payrollStatisticsService.getDepartmentBreakdown(month, year)
      ]);
      setOverview(overviewData);
      setDepartments(deptsData || []);
    } catch (error) {
      console.error("Lỗi fetch dữ liệu tổng quan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async (deptId) => {
    try {
      setIsEmployeesLoading(true);
      setSelectedEmpIds([]);
      const emps = await payrollStatisticsService.getDepartmentEmployees(deptId, month, year);
      setEmployees(emps || []);
    } catch (error) {
      console.error("Lỗi fetch nhân sự phòng ban:", error);
    } finally {
      setIsEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchMainData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    if (selectedDept) {
      fetchEmployees(selectedDept.department_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, month, year]);


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = employees
        .filter(emp => emp.status === 'draft' || emp.status === 'pending_approval' || emp.status === 'pending')
        .map(emp => emp.payroll_id);
      setSelectedEmpIds(pendingIds);
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleQuickApprove = async () => {
    if (selectedEmpIds.length === 0) return;
    try {
      setIsApproving(true);
      await payrollStatisticsService.quickApprove(selectedEmpIds);
      alert(`Đã duyệt thành công ${selectedEmpIds.length} bảng lương!`);
      // Reload danh sách nhân viên
      fetchEmployees(selectedDept.department_id);
    } catch (error) {
      console.error("Lỗi duyệt", error);
      alert("Có lỗi xảy ra khi duyệt.");
    } finally {
      setIsApproving(false);
    }
  };

  // Tính toán dữ liệu pie chart/biểu đồ
  const totalNetAllDepartments = departments.reduce((sum, d) => sum + Number(d.total_net_salary), 0);

  const renderTopCards =() => {
    if (!overview) return null;
    
    // Calculate total fund based on mock logic (base + allowance + deduction)
    const totalFund = Number(overview.total_base_salary) + Number(overview.total_allowance) + Number(overview.total_deduction) || 1;
    const basePct = ((Number(overview.total_base_salary) / totalFund) * 100).toFixed(1);
    const allowPct = ((Number(overview.total_allowance) / totalFund) * 100).toFixed(1);
    const deductPct = ((Number(overview.total_deduction) / totalFund) * 100).toFixed(1);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Card 1 */}
        <div className="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] rounded-[20px] p-6 text-white relative overflow-hidden shadow-lg shadow-cyan-500/20">
          <div className="relative z-10">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-cyan-100 mb-1">Tổng Quỹ Lương Thực Chi</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold">{formatMillions(overview.total_net_salary)}</span>
            </div>
          </div>
          <CreditCard className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[13px] font-semibold text-gray-500">Tổng lương</h3>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 absolute right-6 top-6">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-3">{formatMillions(overview.total_base_salary)}</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${basePct}%` }}></div>
              </div>
              <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">Chiếm {basePct}% quỹ lương</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[13px] font-semibold text-gray-500">Thưởng & Phụ cấp</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 absolute right-6 top-6">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-3">{formatMillions(overview.total_allowance)}</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${allowPct}%` }}></div>
              </div>
              <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">Chiếm {allowPct}% quỹ lương</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[13px] font-semibold text-gray-500">Khấu trừ / BHXH</h3>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 absolute right-6 top-6">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-3">{formatMillions(overview.total_deduction)}</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${deductPct}%` }}></div>
              </div>
              <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">Chiếm {deductPct}% quỹ lương</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentList = () => {
    // Calculate totals for table footer
    const totalHeadcount = departments.reduce((sum, d) => sum + Number(d.headcount), 0);
    const totalBaseSalary = departments.reduce((sum, d) => sum + Number(d.total_base_salary), 0);
    const totalAllowance = departments.reduce((sum, d) => sum + Number(d.total_allowance), 0);
    const totalNetSalary = departments.reduce((sum, d) => sum + Number(d.total_net_salary), 0);
    const totalDeduction = departments.reduce((sum, d) => sum + Number(d.total_deduction), 0);

    return (
      <div className="space-y-6">
        {/* CHART SECTION */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <PieChart className="w-5 h-5 text-indigo-500" />
              Tỷ trọng theo phòng ban
            </h2>
            <p className="text-sm text-gray-500 mt-1">Phân bổ tháng {month}/{year}</p>
          </div>
          <div className="space-y-6">
            {departments.map((d, idx) => {
              const bg = colors[idx % colors.length];
              const pct = totalNetAllDepartments > 0 ? (Number(d.total_net_salary) / totalNetAllDepartments) * 100 : 0;
              return (
                <div key={d.department_id}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${bg}`}></span>
                      <span className="text-sm font-bold text-gray-700">{d.department_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{pct.toFixed(1)}% </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <Layers className="w-5 h-5 text-cyan-500" />
              Bảng phân tích chi phí theo phòng ban (Tháng {String(month).padStart(2,'0')}/{year})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase">Phòng Ban</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-center">Số lượng NS</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-right">Tổng lương</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-right">Tổng thưởng/Phụ cấp</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-right">Khấu trừ</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-right">Tổng chi phí</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((d, idx) => {
                   const Icon = iconMap[idx % iconMap.length];
                   return (
                  <tr key={d.department_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-gray-800 text-sm">{d.department_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center text-sm font-medium text-gray-600">{d.headcount}</td>
                    <td className="py-4 px-6 text-right text-sm font-medium text-gray-600">{formatVND(d.total_base_salary)}</td>
                    <td className="py-4 px-6 text-right text-sm font-bold text-emerald-500">+{formatVND(d.total_allowance)}</td>
                    <td className="py-4 px-6 text-right text-sm font-bold text-rose-500">-{formatVND(d.total_deduction)}</td>
                    <td className="py-4 px-6 text-right text-sm font-bold text-gray-900">{formatVND(d.total_net_salary)}</td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => setSelectedDept(d)}
                        className="text-cyan-600 hover:text-cyan-800 font-semibold text-xs border border-cyan-200 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 mx-auto"
                      >
                        Chi tiết <ChevronRight className="w-3 h-3"/>
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
              <tfoot className="bg-gray-50/80 border-t-2 border-gray-100">
                <tr>
                  <td className="py-4 px-6 font-bold text-gray-900 text-sm uppercase">Tổng cộng toàn công ty</td>
                  <td className="py-4 px-6 text-center font-bold text-gray-900">{totalHeadcount}</td>
                  <td className="py-4 px-6 text-right font-bold text-gray-900">{formatVND(totalBaseSalary)}</td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-600">+{formatVND(totalAllowance)}</td>
                  <td className="py-4 px-6 text-right font-bold text-rose-500">-{formatVND(totalDeduction)}</td>
                  <td className="py-4 px-6 text-right font-bold text-cyan-600 text-base">{formatVND(totalNetSalary)}</td>
                  <td className="py-4 px-6"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDrillDown = () => {
    const pendingCount = employees.filter(emp => emp.status === 'draft' || emp.status === 'pending_approval' || emp.status === 'pending').length;

    return (
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
        {/* Header toolbar */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedDept(null)}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center gap-2 font-semibold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Quay Lại
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 border-l-2 border-gray-300 pl-4">
               {selectedDept.department_name} (Tháng {month}/{year})
            </h2>
          </div>
          
          {selectedEmpIds.length > 0 && (
            <div className="bg-cyan-50 border border-cyan-100 px-4 py-2 rounded-xl flex items-center gap-4 shadow-sm animate-fade-in">
              <span className="text-sm font-bold text-cyan-800 tracking-wide">
                Đã chọn {selectedEmpIds.length} nhân sự
              </span>
              <button 
                onClick={handleQuickApprove}
                disabled={isApproving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4" />}
                Duyệt Nhanh
              </button>
            </div>
          )}
        </div>

        {/* Data table */}
        <div className="overflow-x-auto relative">
          {isEmployeesLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="py-4 px-6 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-cyan-600 border-gray-300"
                    onChange={handleSelectAll}
                    checked={employees.length > 0 && pendingCount > 0 && selectedEmpIds.length === pendingCount}
                    disabled={pendingCount === 0}
                  />
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase">Nhân Viên</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-right">Tổng Lương</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-right">Phụ Cấp</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-right">Khấu Trừ</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-right">Thực Nhận</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-center">Trạng Thái</th>
                <th className="py-4 px-4 text-[11px] font-bold text-gray-500 uppercase text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 && !isEmployeesLoading && (
                <tr className="text-center py-8 text-gray-500"><td colSpan={8} className="py-8">Không có dữ liệu nhân sự</td></tr>
              )}
              {employees.map((emp) => {
                const isPending = emp.status === 'draft' || emp.status === 'pending_approval' || emp.status === 'pending';
                const isSelected = selectedEmpIds.includes(emp.payroll_id);

                return (
                  <tr key={emp.payroll_id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-cyan-50/30' : ''}`}>
                    <td className="py-4 px-6">
                      {isPending ? (
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-cyan-600 border-gray-300 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleSelectOne(emp.payroll_id)}
                        />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="font-bold text-gray-800 text-sm leading-tight">{emp.employee_name}</div>
                          <div className="text-xs text-gray-500">{emp.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-gray-600">{formatVND(emp.base_salary_snapshot)}</td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-emerald-500">+{formatVND(emp.total_allowance)}</td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-rose-500">-{formatVND(emp.total_deduction)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-cyan-600">{formatVND(emp.net_salary)}</td>
                    <td className="py-4 px-4 text-center">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        !isPending ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                       }`}>
                         {!isPending ? 'Đã duyệt' : 'Chờ duyệt'}
                       </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                       {isPending && (
                         <button 
                           onClick={() => {
                             setSelectedEmpIds([emp.payroll_id]);
                           }}
                           className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors"
                         >
                           Duyệt
                         </button>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-gray-800">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <PieChart className="w-6 h-6 text-cyan-500" />
            Thống kê Lương & Chi phí
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý quỹ lương, chi phí theo phòng ban và duyệt lương trực tiếp.</p>
        </div>
        <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1">
           <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">&lt;</button>
           <div className="px-4 py-2 font-bold text-cyan-700 flex items-center gap-2">
              <Calendar className="w-4 h-4"/> Tháng {String(month).padStart(2, '0')}/{year}
           </div>
           <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">&gt;</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* LUỒNG 1: TỔNG QUAN, khi chưa chọn phần tử phòng ban nào */}
          {!selectedDept && (
             <div className="animate-fade-in-up">
               {renderTopCards()}
               {renderDepartmentList()}
             </div>
          )}

          {/* LUỒNG 2: DRILL-DOWN NHÂN SỰ */}
          {selectedDept && (
             <div className="animate-fade-in-up">
               {renderDrillDown()}
             </div>
          )}
        </>
      )}

      {/* Global CSS animation */}
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
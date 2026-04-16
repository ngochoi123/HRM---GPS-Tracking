import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleAlert,
  CircleDollarSign,
  Landmark,
  PlusCircle,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import './Payroll.css';
import { payrollService } from '../../services/payrollService';
import { employeeService } from '../../services/employeeService';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatCurrencyWithUnit = (value, unit = 'VNĐ') => `${formatCurrency(value)} ${unit}`;

const getCurrentMonthInputValue = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/** Tháng 1–12 hiển thị tiếng Việt (thay cho hộp thoại browser tiếng Anh). */
const PAYROLL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0');
  return { value, label: `Tháng ${i + 1}` };
});

const buildPayrollYearOptions = () => {
  const nowY = new Date().getFullYear();
  const list = [];
  const from = nowY - 6;
  const to = nowY + 2;
  for (let y = from; y <= to; y += 1) list.push(y);
  return list;
};

const toBackendMonthYear = (yyyyMm) => {
  const [year, month] = String(yyyyMm || '').split('-');
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return null;
  return `${month}-${year}`;
};

const normalizeNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const getPreviousMonthInputValue = (yyyyMm) => {
  const [yearText, monthText] = String(yyyyMm || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;

  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
};

const getTrendMeta = (currentValue, previousValue) => {
  const current = normalizeNumber(currentValue);
  const previous = normalizeNumber(previousValue);

  if (previous <= 0 || current >= previous) {
    return { icon: TrendingUp, className: 'up' };
  }

  return { icon: TrendingDown, className: 'down' };
};

const buildPayrollViewModel = (payrollRow, employeeProfile, previousPayrollRow = null) => {
  const empInsurance = payrollRow?.empInsurance || {};
  const reward = normalizeNumber(payrollRow?.reward);
  const discipline = normalizeNumber(payrollRow?.discipline);
  const deductions = [
    {
      label: 'Bảo hiểm Xã hội (BHXH)',
      sublabel: '8% x Lương đóng bảo hiểm',
      amount: normalizeNumber(empInsurance?.bhxh),
    },
    {
      label: 'Bảo hiểm Y tế (BHYT)',
      sublabel: '1.5% x Lương đóng bảo hiểm',
      amount: normalizeNumber(empInsurance?.bhyt),
    },
    {
      label: 'Bảo hiểm Thất nghiệp (BHTN)',
      sublabel: '1% x Lương đóng bảo hiểm',
      amount: normalizeNumber(empInsurance?.bhtn),
    },
    ...(discipline > 0
      ? [
          {
            label: 'Kỷ luật / Khấu trừ khác',
            sublabel: 'Các khoản phạt / tạm ứng trong tháng',
            amount: discipline,
            sublabelClassName: 'highlight',
          },
        ]
      : []),
  ];
  const apiTotalDeduction = normalizeNumber(payrollRow?.total_deduction);
  const netPayApi = normalizeNumber(payrollRow?.net_salary ?? payrollRow?.income_after_insurance);

  // Lương (theo công) = (Số ngày công + Tăng ca x2) * Thu nhập tháng / 26
  // - API trả `total_work_days` (ngày công) và `overtime` (tăng ca)
  // - "Thu nhập tháng" lấy theo lương tháng (ưu tiên actual_salary/base_salary/base_salary_snapshot)
  const monthIncome =
    normalizeNumber(payrollRow?.actual_salary) ||
    normalizeNumber(payrollRow?.base_salary) ||
    normalizeNumber(payrollRow?.base_salary_snapshot);
  const workDaysForSalary = normalizeNumber(payrollRow?.total_work_days);
  const overtimeForSalary = normalizeNumber(payrollRow?.overtime);
  const weightedOvertimeForSalary = overtimeForSalary * 2;
  const salaryByAttendance = Math.max(
    0,
    ((workDaysForSalary + weightedOvertimeForSalary) * monthIncome) / 26
  );

  const workDays = payrollRow?.total_work_days;
  const workDaysDisplay =
    workDays != null && workDays !== '' && Number.isFinite(Number(workDays))
      ? `${Number(workDays).toFixed(2).replace('.', ',')}/26`
      : '0,00/26';
  const overtimeDisplay = Number.isFinite(overtimeForSalary)
    ? Number(overtimeForSalary).toFixed(2).replace('.', ',')
    : '0,00';

  const incomes = [
    {
      label: 'Lương (theo công)',
      sublabel: `Công: ${workDaysDisplay} | Tăng ca: ${overtimeDisplay} (x2 khi tính lương)`,
      amount: salaryByAttendance,
    },
    ...(reward > 0
      ? [
          {
            label: 'Thưởng',
            sublabel: 'Tổng thưởng trong tháng',
            amount: reward,
          },
        ]
      : []),
  ];

  // Tổng thu nhập / khấu trừ luôn lấy từ chi tiết để không bị lệch.
  const derivedIncomeTotal = incomes.reduce((sum, item) => sum + normalizeNumber(item.amount), 0);
  const derivedDeductionTotal = deductions.reduce((sum, item) => sum + normalizeNumber(item.amount), 0);
  const displayTotalDeduction = apiTotalDeduction > 0 ? apiTotalDeduction : derivedDeductionTotal;

  // Trend so với tháng trước: cũng dựa trên tổng chi tiết.
  const previousReward = normalizeNumber(previousPayrollRow?.reward);
  const previousDiscipline = normalizeNumber(previousPayrollRow?.discipline);
  const previousEmpInsurance = previousPayrollRow?.empInsurance || {};
  const previousDeductionItems = [
    normalizeNumber(previousEmpInsurance?.bhxh),
    normalizeNumber(previousEmpInsurance?.bhyt),
    normalizeNumber(previousEmpInsurance?.bhtn),
    ...(previousDiscipline > 0 ? [previousDiscipline] : []),
  ];
  const previousDerivedDeductionTotal = previousDeductionItems.reduce((sum, v) => sum + normalizeNumber(v), 0);
  const previousTotalDeduction = normalizeNumber(previousPayrollRow?.total_deduction);
  const previousDisplayDeduction = previousTotalDeduction > 0 ? previousTotalDeduction : previousDerivedDeductionTotal;

  const previousMonthIncome =
    normalizeNumber(previousPayrollRow?.actual_salary) ||
    normalizeNumber(previousPayrollRow?.base_salary) ||
    normalizeNumber(previousPayrollRow?.base_salary_snapshot);
  const previousWorkDays = normalizeNumber(previousPayrollRow?.total_work_days);
  const previousOvertime = normalizeNumber(previousPayrollRow?.overtime);
  const previousWeightedOvertime = previousOvertime * 2;
  const previousSalaryByAttendance = Math.max(
    0,
    ((previousWorkDays + previousWeightedOvertime) * previousMonthIncome) / 26
  );
  const previousIncomes = [
    previousSalaryByAttendance,
    ...(previousReward > 0 ? [previousReward] : []),
  ];
  const previousDerivedIncomeTotal = previousIncomes.reduce((sum, v) => sum + normalizeNumber(v), 0);

  const totalIncome = derivedIncomeTotal;
  const netPay = netPayApi > 0 ? netPayApi : Math.max(0, totalIncome - displayTotalDeduction);

  return {
    netPay,
    totalIncome,
    totalDeduction: displayTotalDeduction,
    summaryTrend: {
      totalIncome: getTrendMeta(totalIncome, previousDerivedIncomeTotal),
      totalDeduction: getTrendMeta(displayTotalDeduction, previousDisplayDeduction),
    },
    incomes,
    deductions,
    bankInfo: {
      bankName: employeeProfile?.bank_name || '—',
      bankAccount: employeeProfile?.bank_account_number || '—',
      note: 'Lương được thanh toán theo quy định công ty. Nếu có thắc mắc về bảng lương, vui lòng liên hệ bộ phận Hành chính Nhân sự (HR).',
    },
  };
};

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInputValue());
  const payrollYearOptions = useMemo(() => buildPayrollYearOptions(), []);
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState(() =>
    buildPayrollViewModel(
      null,
      null
    )
  );
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const employeeId = user?.id;
    if (!employeeId) return;
    employeeService
      .getProfile(employeeId)
      .then((res) => setEmployeeProfile(res))
      .catch(() => {
        setEmployeeProfile(null);
      });
  }, []);

  async function fetchPayroll() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const employeeId = user?.id;
    if (!employeeId) {
      setErrorMessage('Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.');
      return;
    }

    const monthYear = toBackendMonthYear(selectedMonth);
    if (!monthYear) {
      setErrorMessage('Kỳ lương không hợp lệ.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const previousMonthInput = getPreviousMonthInputValue(selectedMonth);
      const previousMonthYear = previousMonthInput ? toBackendMonthYear(previousMonthInput) : null;
      const [res, previousRes] = await Promise.all([
        payrollService.getCalculation(monthYear, null),
        previousMonthYear
          ? payrollService.getCalculation(previousMonthYear, null).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (!res?.success) {
        setErrorMessage(res?.error || res?.message || 'Không thể tải dữ liệu bảng lương.');
        setPayrollData(buildPayrollViewModel(null, employeeProfile));
        return;
      }

      const rows = Array.isArray(res?.data) ? res.data : [];
      const mine = rows.find((r) => String(r?.employee_id) === String(employeeId));
      if (!mine) {
        setErrorMessage('Tháng này chưa có dữ liệu bảng lương của bạn.');
        setPayrollData(buildPayrollViewModel(null, employeeProfile));
        return;
      }

      const previousRows = Array.isArray(previousRes?.data) ? previousRes.data : [];
      const previousMine = previousRows.find((r) => String(r?.employee_id) === String(employeeId)) || null;

      setPayrollData(buildPayrollViewModel(mine, employeeProfile, previousMine));
    } catch (err) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.message === 'string' ? err.message : null);
      setErrorMessage(serverMsg || 'Lỗi lấy dữ liệu từ hệ thống!');
      setPayrollData(buildPayrollViewModel(null, employeeProfile));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfile]);

  const incomeTotal = useMemo(
    () => payrollData.incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payrollData]
  );

  const deductionTotal = useMemo(
    () => payrollData.deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payrollData]
  );

  const periodParts = useMemo(() => {
    const rawParts = String(selectedMonth || '').split('-');
    const payrollYearStr = /^\d{4}$/.test(rawParts[0]) ? rawParts[0] : String(new Date().getFullYear());
    const payrollMonthStr = /^\d{2}$/.test(rawParts[1]) ? rawParts[1] : '01';
    return { payrollYearStr, payrollMonthStr };
  }, [selectedMonth]);

  const yearOptionsForSelect = useMemo(() => {
    const y = parseInt(periodParts.payrollYearStr, 10);
    if (Number.isFinite(y) && !payrollYearOptions.includes(y)) {
      return [...payrollYearOptions, y].sort((a, b) => a - b);
    }
    return payrollYearOptions;
  }, [periodParts.payrollYearStr, payrollYearOptions]);

  const handlePeriodMonthChange = (monthVal) => {
    setSelectedMonth(`${periodParts.payrollYearStr}-${monthVal}`);
  };

  const handlePeriodYearChange = (yearVal) => {
    setSelectedMonth(`${yearVal}-${periodParts.payrollMonthStr}`);
  };

  const IncomeTrendIcon = payrollData.summaryTrend?.totalIncome?.icon || TrendingUp;
  const DeductionTrendIcon = payrollData.summaryTrend?.totalDeduction?.icon || TrendingDown;

  return (
    <div className="employee-payroll-page">
      <div className="employee-payroll-shell">
        <div className="employee-payroll-header">
          <div>
            <h1 className="employee-payroll-title">
              <span className="employee-payroll-title-icon">
                <CircleDollarSign size={24} />
              </span>
              Bảng lương cá nhân
            </h1>
            <p className="employee-payroll-subtitle">
              Chi tiết thu nhập và các khoản khấu trừ trong tháng của bạn.
            </p>
          </div>

          <div className="employee-payroll-toolbar">
            <div className="employee-payroll-monthbox">
              <CalendarDays size={22} />
              <span>Kỳ lương:</span>
              <div className="employee-payroll-period-selects" title="Chọn tháng và năm để lọc bảng lương">
                <select
                  aria-label="Chọn tháng"
                  className="employee-payroll-period-select"
                  value={periodParts.payrollMonthStr}
                  onChange={(e) => handlePeriodMonthChange(e.target.value)}
                >
                  {PAYROLL_MONTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="employee-payroll-period-sep" aria-hidden>
                  /
                </span>
                <select
                  aria-label="Chọn năm"
                  className="employee-payroll-period-select employee-payroll-period-select-year"
                  value={periodParts.payrollYearStr}
                  onChange={(e) => handlePeriodYearChange(e.target.value)}
                >
                  {yearOptionsForSelect.map((y) => (
                    <option key={y} value={String(y)}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="employee-payroll-search-btn"
              onClick={fetchPayroll}
              disabled={loading}
            >
              <Search size={18} />
              {loading ? 'Đang tải...' : 'Tìm'}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div style={{ paddingTop: 14, color: '#b42318', fontWeight: 700, fontSize: 13 }}>
            {errorMessage}
          </div>
        ) : null}

        <div className="employee-payroll-grid">
          <section className="employee-payroll-left-column">
            <div className="employee-payroll-summary-card">
              <div className="employee-payroll-summary-head">
                <div>
                  <p className="employee-payroll-summary-label">THỰC LÃNH (NET PAY)</p>
                  <div className="employee-payroll-summary-value">
                    {formatCurrency(payrollData.netPay)}
                    <span>VNĐ</span>
                  </div>
                </div>
                <span className="employee-payroll-status">Đã thanh toán</span>
              </div>

              <div className="employee-payroll-summary-foot">
                <div className="employee-payroll-summary-metric">
                  <span>Tổng thu nhập</span>
                  <strong>
                    <span className={`employee-payroll-trend ${payrollData.summaryTrend?.totalIncome?.className || 'up'}`}>
                      <IncomeTrendIcon size={13} />
                    </span>
                    {formatCurrencyWithUnit(payrollData.totalIncome)}
                  </strong>
                </div>
                <div className="employee-payroll-summary-metric">
                  <span>Tổng khấu trừ</span>
                  <strong>
                    <span
                      className={`employee-payroll-trend deduction ${payrollData.summaryTrend?.totalDeduction?.className || 'down'}`}
                    >
                      <DeductionTrendIcon size={13} />
                    </span>
                    {formatCurrencyWithUnit(payrollData.totalDeduction)}
                  </strong>
                </div>
              </div>

              <div className="employee-payroll-summary-watermark">
                <CircleAlert size={72} />
              </div>
            </div>

            <div className="employee-payroll-panel employee-payroll-income-panel">
              <h2 className="employee-payroll-panel-title income">
                <PlusCircle size={18} />
                Chi tiết Thu nhập
              </h2>

              <div className="employee-payroll-list">
                {payrollData.incomes.map((item) => (
                  <div key={item.label} className="employee-payroll-list-row">
                    <div>
                      <p>{item.label}</p>
                      <span>{item.sublabel}</span>
                    </div>
                    <strong>{formatCurrencyWithUnit(item.amount)}</strong>
                  </div>
                ))}
              </div>

              <div className="employee-payroll-total-strip">
                <span>TỔNG CỘNG THU NHẬP</span>
                <strong>{formatCurrencyWithUnit(incomeTotal)}</strong>
              </div>
            </div>
          </section>

          <section className="employee-payroll-right-column">
            <div className="employee-payroll-panel">
              <h2 className="employee-payroll-panel-title deduction">
                <CircleAlert size={18} />
                Chi tiết Khấu trừ
              </h2>

              <div className="employee-payroll-list">
                {payrollData.deductions.map((item) => (
                  <div key={item.label} className="employee-payroll-list-row">
                    <div>
                      <p>{item.label}</p>
                      <span className={item.sublabelClassName || ''}>{item.sublabel}</span>
                    </div>
                    <strong className="negative">- {formatCurrencyWithUnit(item.amount)}</strong>
                  </div>
                ))}
              </div>

              <div className="employee-payroll-total-strip danger">
                <span>TỔNG CỘNG KHẤU TRỪ</span>
                <strong>- {formatCurrencyWithUnit(deductionTotal)}</strong>
              </div>
            </div>

            <div className="employee-payroll-bank-card">
              <h2 className="employee-payroll-panel-title bank">
                <Landmark size={18} />
                Thông tin chuyển khoản
              </h2>

              <div className="employee-payroll-bank-grid">
                <div>
                  <span>Ngân hàng</span>
                  <strong>{employeeProfile?.bank_name || payrollData.bankInfo.bankName}</strong>
                </div>
                <div>
                  <span>Số tài khoản</span>
                  <strong>{employeeProfile?.bank_account_number || payrollData.bankInfo.bankAccount}</strong>
                </div>
              </div>

              <p className="employee-payroll-bank-note">
                * {payrollData.bankInfo.note}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

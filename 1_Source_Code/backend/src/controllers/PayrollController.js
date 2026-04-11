const db = require('../config/database');
const {
    calcStandardWorkHours,
    getAttendanceStatusForCheckIn,
    getAttendanceStatusForCheckOut,
} = require('../services/attendanceActions');

/** Hiển thị HH:mm theo giờ VN (khớp dữ liệu timestamptz trong DB). */
const formatTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === 'hour')?.value;
    const mm = parts.find((p) => p.type === 'minute')?.value;
    if (hh == null || mm == null) return null;
    return `${hh}:${mm}`;
};

const formatHours = (value) => {
    if (!value || Number.isNaN(Number(value))) return '0.00';
    return Number(value).toFixed(2);
};

/** Giờ công ngày tính lương: tối đa 8h; vượt phần chỉ tính qua tăng ca đã duyệt (cột OT riêng). */
const STANDARD_DAY_HOURS_CAP = 8;

const capWorkHoursForPayroll = (raw) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, STANDARD_DAY_HOURS_CAP);
};

/** Công ngày (0–1) từ giờ đã trần, 2 chữ số thập phân — tránh lỗi float khi cộng. */
const congFromCappedHours = (cappedHours) => {
    const ratio = Math.min(cappedHours / STANDARD_DAY_HOURS_CAP, 1);
    return Math.round(ratio * 100) / 100;
};

const roundWorkDaysSum = (sum) => Math.round(sum * 100) / 100;

/** Ngày hiện tại theo lịch VN (YYYY-MM-DD) — tránh server UTC làm nhầm "chưa tới ngày" vs "vắng". */
const getTodayYmdHoChiMinh = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year').value;
    const m = parts.find((p) => p.type === 'month').value;
    const d = parts.find((p) => p.type === 'day').value;
    return `${y}-${m}-${d}`;
};

const ymdForCalendarDay = (yearStr, monthStr, dayOfMonth) => {
    const m = String(monthStr).padStart(2, '0');
    const d = String(dayOfMonth).padStart(2, '0');
    return `${yearStr}-${m}-${d}`;
};

/** Lấy key ngày (01–31) từ cột date PG — ưu tiên chuỗi YYYY-MM-DD để khỏi lệch múi giờ. */
const dayKeyFromPgDate = (value) => {
    if (value == null) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(8, 10);
    }
    const iso = value instanceof Date ? value.toISOString() : String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(8, 10);
    return String(new Date(value).getUTCDate()).padStart(2, '0');
};

/** YYYY-MM-DD từ cột date PG — ưu tiên chuỗi để tránh lệch timezone. */
const ymdFromPgDate = (value) => {
    if (value == null) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_HM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

const parseHmToVNDate = (attendanceDateYmd, hm) => {
    if (!attendanceDateYmd || !hm || !TIME_HM_RE.test(hm)) return null;
    const [h, m] = hm.split(':').map(Number);
    const iso = `${attendanceDateYmd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+07:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const resolveStatusAfterEdit = (checkInDt, checkOutDt) => {
    if (checkInDt && checkOutDt) {
        return getAttendanceStatusForCheckOut(checkInDt, checkOutDt);
    }
    if (checkInDt) {
        return getAttendanceStatusForCheckIn(checkInDt) || 'on_time';
    }
    return 'absent';
};

const calculatePayroll = async (req, res) => {
    console.log("🚀🚀🚀 CHÚ Ý: ĐÃ VÀO HÀM TÍNH LƯƠNG!!! Tháng:", req.query.monthYear);
    const { monthYear, departmentId } = req.query;
    let tx;

    try {
        tx = await db.transaction();
        let empQuery = `
            SELECT e.id, e.employee_code, e.full_name, c.base_salary, d.department_name
            FROM employee e 
            JOIN contract c ON e.id = c.employee_id 
            JOIN position p ON e.position_id = p.id
            JOIN department d ON p.department_id = d.id
            WHERE c.is_active = true AND e.status = 'active'
        `;
        
        const replacements = {};
        if (departmentId) {
            empQuery += ` AND d.id = :deptId`;
            replacements.deptId = departmentId;
        }

        const employees = await db.query(empQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
            transaction: tx
        });

        const results = [];
        for (const emp of employees) {
            const attendanceRows = await db.query(
                `SELECT
                    id,
                    attendance_date,
                    check_in_time,
                    check_out_time,
                    status,
                    total_work_hours
                 FROM attendance
                 WHERE employee_id = :id
                   AND to_char(attendance_date, 'MM-YYYY') = :my`,
                {
                    replacements: { id: emp.id, my: monthYear },
                    type: db.QueryTypes.SELECT,
                    transaction: tx
                }
            );

            const decisions = await db.query(
                `SELECT decision_type, SUM(amount) as total FROM hr_decision 
                 WHERE employee_id = :id AND to_char(issue_date, 'MM-YYYY') = :my 
                 GROUP BY decision_type`,
                { replacements: { id: emp.id, my: monthYear }, type: db.QueryTypes.SELECT, transaction: tx }
            );

            const overtimeRows = await db.query(
                `SELECT
                    ot_date,
                    SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) AS ot_hours
                 FROM overtime_request
                 WHERE employee_id = :id
                   AND to_char(ot_date, 'MM-YYYY') = :my
                   AND status = 'approved'
                 GROUP BY ot_date`,
                {
                    replacements: { id: emp.id, my: monthYear },
                    type: db.QueryTypes.SELECT,
                    transaction: tx
                }
            );

            let reward = 0, discipline = 0;
            decisions.forEach(d => {
                if (d.decision_type === 'reward') reward = parseFloat(d.total);
                if (d.decision_type === 'discipline') discipline = parseFloat(d.total);
            });

            const otHours = overtimeRows.reduce(
                (sum, row) => sum + parseFloat(row.ot_hours || 0),
                0
            );

            const attendanceByDay = new Map();
            attendanceRows.forEach((row) => {
                const day = dayKeyFromPgDate(row.attendance_date);
                if (day) attendanceByDay.set(day, row);
            });

            const overtimeByDay = new Map();
            overtimeRows.forEach((row) => {
                const day = dayKeyFromPgDate(row.ot_date);
                if (day) overtimeByDay.set(day, parseFloat(row.ot_hours || 0));
            });

            const [month, year] = monthYear.split('-');
            const todayYmd = getTodayYmdHoChiMinh();

            const attendanceDetail = Array.from({ length: 26 }, (_, index) => {
                const day = String(index + 1).padStart(2, '0');
                const row = attendanceByDay.get(day);
                const rowYmd = ymdForCalendarDay(year, month, index + 1);
                const isFuture = rowYmd > todayYmd;

                if (row) {
                    const rawHours = parseFloat(row.total_work_hours || 0);
                    const workHours = capWorkHoursForPayroll(rawHours);
                    const otRaw = overtimeByDay.get(day);
                    const otNum = otRaw != null ? parseFloat(otRaw) : 0;
                    const otDisplay =
                        Number.isFinite(otNum) && otNum > 0 ? formatHours(otNum) : null;

                    return {
                        day,
                        attendance_id: row.id,
                        attendance_date: ymdFromPgDate(row.attendance_date) || rowYmd,
                        checkIn: formatTime(row.check_in_time),
                        checkOut: formatTime(row.check_out_time),
                        hours: formatHours(workHours),
                        cong: congFromCappedHours(workHours),
                        ot: otDisplay,
                        status: row.status || 'on_time'
                    };
                }

                return {
                    day,
                    attendance_id: null,
                    attendance_date: rowYmd,
                    checkIn: null,
                    checkOut: null,
                    hours: null,
                    cong: null,
                    ot: null,
                    status: isFuture ? 'future' : 'absent'
                };
            });

            const days = roundWorkDaysSum(
                attendanceDetail.reduce((sum, row) => {
                    if (typeof row.cong === 'number') return sum + row.cong;
                    return sum;
                }, 0)
            );

            // 1. THU NHẬP THÁNG = Lương cơ bản
            const base = parseFloat(emp.base_salary || 0);
            const overtimeMoney = otHours * (base / 22 / 8) * 1.5;
            const actualSalary = base;

            // 2. TÍNH BẢO HIỂM (Tính theo Lương CB / Thu Nhập Tháng)
            const compInsurance = {
                bhxh: base * 0.175,
                bhyt: base * 0.03,
                bhtn: base * 0.01,
                total: base * 0.215 // Tổng DN Đóng BH
            };
            const empInsurance = {
                bhxh: base * 0.08,
                bhyt: base * 0.015,
                bhtn: base * 0.01,
                total: base * 0.105 // Tổng NLĐ Đóng BH
            };

            // 3. THỰC NHẬN THÁNG = Lương cơ bản - BH NLĐ - Kỷ luật + Thưởng
            const incomeAfterIns = actualSalary - empInsurance.total - discipline + reward;

            // 4. CHI PHÍ TIỀN LƯƠNG = Lương cơ bản (thu nhập tháng) + Tổng DN đóng BH + Thưởng - Phạt
            const companyCost = actualSalary + compInsurance.total + reward - discipline;

            // Thực nhận dùng cùng logic với Thu nhập sau BH ở bảng tổng hợp
            const netSalary = incomeAfterIns;
            const totalAllowance = reward + overtimeMoney;
            const totalDeduction = empInsurance.total + discipline;

            const [payrollRow] = await db.query(
                `INSERT INTO payroll (
                    employee_id,
                    month_year,
                    base_salary_snapshot,
                    total_work_days,
                    total_allowance,
                    total_deduction,
                    net_salary,
                    status
                )
                VALUES (
                    :employeeId,
                    :monthYear,
                    :baseSalary,
                    :totalWorkDays,
                    :totalAllowance,
                    :totalDeduction,
                    :netSalary,
                    'draft'
                )
                ON CONFLICT (employee_id, month_year)
                DO UPDATE SET
                    base_salary_snapshot = EXCLUDED.base_salary_snapshot,
                    total_work_days = EXCLUDED.total_work_days,
                    total_allowance = EXCLUDED.total_allowance,
                    total_deduction = EXCLUDED.total_deduction,
                    net_salary = EXCLUDED.net_salary
                RETURNING id`,
                {
                    replacements: {
                        employeeId: emp.id,
                        monthYear,
                        baseSalary: base,
                        totalWorkDays: days,
                        totalAllowance,
                        totalDeduction,
                        netSalary
                    },
                    type: db.QueryTypes.SELECT,
                    transaction: tx
                }
            );

            await db.query(
                `UPDATE hr_decision
                 SET payroll_id = :payrollId
                 WHERE employee_id = :employeeId
                   AND to_char(issue_date, 'MM-YYYY') = :monthYear`,
                {
                    replacements: {
                        payrollId: payrollRow.id,
                        employeeId: emp.id,
                        monthYear
                    },
                    transaction: tx
                }
            );

            results.push({
                employee_id: emp.id,
                employee_code: emp.employee_code,
                full_name: emp.full_name,
                department_name: emp.department_name,
                base_salary: base, 
                actual_salary: actualSalary, 
                total_work_days: days,
                overtime: overtimeMoney,
                discipline: discipline,
                reward: reward,
                compInsurance,
                empInsurance,
                income_after_insurance: incomeAfterIns,
                company_cost: companyCost,
                net_salary: netSalary,
                attendance_detail: attendanceDetail
            });
        }
        await tx.commit();
        res.json({ success: true, data: results });
    } catch (error) { 
        if (tx) await tx.rollback();
        res.status(500).json({ success: false, error: error.message }); 
    }
};

/**
 * Sửa giờ check-in / check-out (bảng attendance) — dùng khi chấm công sai, cần chỉnh tay.
 * Body: { employeeId, attendanceDate, checkIn?, checkOut?, attendanceId? }
 */
const correctAttendance = async (req, res) => {
    let tx;
    try {
        const { employeeId, attendanceDate, checkIn, checkOut, attendanceId } = req.body || {};

        if (!employeeId || !UUID_RE.test(String(employeeId))) {
            return res.status(400).json({ success: false, error: 'employeeId không hợp lệ.' });
        }

        const attDate =
            typeof attendanceDate === 'string' ? attendanceDate.trim().slice(0, 10) : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(attDate)) {
            return res.status(400).json({ success: false, error: 'attendanceDate phải là YYYY-MM-DD.' });
        }

        const todayYmd = getTodayYmdHoChiMinh();
        if (attDate > todayYmd) {
            return res.status(400).json({ success: false, error: 'Không được sửa ngày tương lai.' });
        }

        const normIn = checkIn == null || checkIn === '' ? null : String(checkIn).trim();
        const normOut = checkOut == null || checkOut === '' ? null : String(checkOut).trim();

        if (normIn && !TIME_HM_RE.test(normIn)) {
            return res.status(400).json({ success: false, error: 'Định dạng giờ check-in không hợp lệ (HH:mm).' });
        }
        if (normOut && !TIME_HM_RE.test(normOut)) {
            return res.status(400).json({ success: false, error: 'Định dạng giờ check-out không hợp lệ (HH:mm).' });
        }

        if (!normIn && !normOut) {
            return res.status(400).json({ success: false, error: 'Cần nhập ít nhất check-in hoặc check-out.' });
        }
        if (normOut && !normIn) {
            return res.status(400).json({ success: false, error: 'Phải có giờ check-in khi có check-out.' });
        }

        const checkInDt = normIn ? parseHmToVNDate(attDate, normIn) : null;
        const checkOutDt = normOut ? parseHmToVNDate(attDate, normOut) : null;
        if (normIn && !checkInDt) {
            return res.status(400).json({ success: false, error: 'Không đọc được thời gian check-in.' });
        }
        if (normOut && !checkOutDt) {
            return res.status(400).json({ success: false, error: 'Không đọc được thời gian check-out.' });
        }
        if (checkInDt && checkOutDt && checkOutDt.getTime() <= checkInDt.getTime()) {
            return res.status(400).json({ success: false, error: 'Check-out phải sau check-in.' });
        }

        const totalHours =
            checkInDt && checkOutDt ? calcStandardWorkHours(checkInDt, checkOutDt) : 0;
        const status = resolveStatusAfterEdit(checkInDt, checkOutDt);

        tx = await db.transaction();

        const [empRow] = await db.query(
            `SELECT id FROM employee WHERE id = :eid LIMIT 1`,
            { replacements: { eid: employeeId }, type: db.QueryTypes.SELECT, transaction: tx }
        );
        if (!empRow) {
            await tx.rollback();
            return res.status(404).json({ success: false, error: 'Không tìm thấy nhân viên.' });
        }

        let targetId =
            attendanceId != null && attendanceId !== ''
                ? Number(attendanceId)
                : null;
        if (targetId != null && !Number.isFinite(targetId)) {
            await tx.rollback();
            return res.status(400).json({ success: false, error: 'attendanceId không hợp lệ.' });
        }

        if (targetId) {
            const [existing] = await db.query(
                `SELECT id FROM attendance
                 WHERE id = :aid AND employee_id = :eid AND attendance_date = CAST(:ad AS DATE)
                 LIMIT 1`,
                {
                    replacements: { aid: targetId, eid: employeeId, ad: attDate },
                    type: db.QueryTypes.SELECT,
                    transaction: tx,
                }
            );
            if (!existing) {
                await tx.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Không tìm thấy bản ghi chấm công hoặc không khớp nhân viên/ngày.',
                });
            }
        } else {
            const [byDay] = await db.query(
                `SELECT id FROM attendance WHERE employee_id = :eid AND attendance_date = CAST(:ad AS DATE) LIMIT 1`,
                {
                    replacements: { eid: employeeId, ad: attDate },
                    type: db.QueryTypes.SELECT,
                    transaction: tx,
                }
            );
            targetId = byDay ? Number(byDay.id) : null;
        }

        if (targetId) {
            await db.query(
                `UPDATE attendance SET
                    check_in_time = :cin,
                    check_out_time = :cout,
                    total_work_hours = :th,
                    status = :st
                 WHERE id = :id`,
                {
                    replacements: {
                        id: targetId,
                        cin: checkInDt,
                        cout: checkOutDt,
                        th: totalHours,
                        st: status,
                    },
                    transaction: tx,
                }
            );
        } else {
            if (!checkInDt) {
                await tx.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Ngày chưa có dữ liệu chấm công — cần nhập check-in để tạo bản ghi.',
                });
            }
            const insertedRows = await db.query(
                `INSERT INTO attendance (
                    employee_id,
                    attendance_date,
                    check_in_time,
                    check_out_time,
                    total_work_hours,
                    status
                ) VALUES (
                    :eid,
                    CAST(:ad AS DATE),
                    :cin,
                    :cout,
                    :th,
                    :st
                ) RETURNING id`,
                {
                    replacements: {
                        eid: employeeId,
                        ad: attDate,
                        cin: checkInDt,
                        cout: checkOutDt,
                        th: totalHours,
                        st: status,
                    },
                    type: db.QueryTypes.SELECT,
                    transaction: tx,
                }
            );
            const first = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
            targetId = first && first.id != null ? Number(first.id) : null;
        }

        await tx.commit();
        return res.json({
            success: true,
            data: {
                attendanceId: targetId,
                attendanceDate: attDate,
                checkIn: normIn,
                checkOut: normOut,
                totalWorkHours: Number(Number(totalHours).toFixed(2)),
                status,
            },
        });
    } catch (error) {
        if (tx) await tx.rollback();
        console.error('correctAttendance', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { calculatePayroll, correctAttendance };

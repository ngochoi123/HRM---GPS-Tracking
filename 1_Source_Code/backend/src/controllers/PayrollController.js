const db = require('../config/database');
const { calculateTaxesAndInsurances } = require('../services/payrollService');

const calculatePayroll = async (req, res) => {
    console.log("🚀🚀🚀 CHÚ Ý: ĐÃ VÀO HÀM TÍNH LƯƠNG!!! Tháng:", req.query.monthYear);
    const { monthYear, departmentId } = req.query;

    try {
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

        const employees = await db.query(empQuery, { replacements, type: db.QueryTypes.SELECT });

        const results = [];
        for (const emp of employees) {
            const [att] = await db.query(
                `SELECT COUNT(id) as days FROM attendance 
                 WHERE employee_id = :id AND to_char(attendance_date, 'MM-YYYY') = :my 
                 AND status IN ('on_time', 'late', 'early_leave')`,
                { replacements: { id: emp.id, my: monthYear },
                type: db.QueryTypes.SELECT }
                
            );

            const decisions = await db.query(
                `SELECT decision_type, SUM(amount) as total FROM hr_decision 
                 WHERE employee_id = :id AND to_char(issue_date, 'MM-YYYY') = :my 
                 GROUP BY decision_type`,
                { replacements: { id: emp.id, my: monthYear }, type: db.QueryTypes.SELECT }
            );

            let reward = 0, discipline = 0;
            decisions.forEach(d => {
                if (d.decision_type === 'reward') reward = parseFloat(d.total);
                if (d.decision_type === 'discipline') discipline = parseFloat(d.total);
            });

            const [ot] = await db.query(
                `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) as ot_hours 
                 FROM overtime_request 
                 WHERE employee_id = :id AND to_char(ot_date, 'MM-YYYY') = :my AND status = 'approved'`,
                { replacements: { id: emp.id, my: monthYear }, type: db.QueryTypes.SELECT }
            );
            
            // 1. THU NHẬP THÁNG = Lương Cơ Bản
            const base = parseFloat(emp.base_salary || 0);
            const actualSalary = base; 
            
            const days = parseFloat(att?.days || 0);
            const otHours = parseFloat(ot?.ot_hours || 0);
            const overtimeMoney = otHours * (base / 22 / 8) * 1.5;

            // 2. TÍNH BẢO HIỂM (Dựa trên Lương CB)
            const compInsurance = {
                bhxh: base * 0.175,
                bhyt: base * 0.03,
                bhtn: base * 0.01,
                total: base * 0.215
            };
            const empInsurance = {
                bhxh: base * 0.08,
                bhyt: base * 0.015,
                bhtn: base * 0.01,
                total: base * 0.105
            };

            // 3. THU NHẬP SAU BH (Của NLĐ) = Thu nhập tháng - Tổng BH Người lao động
            const incomeAfterIns = actualSalary - empInsurance.total;

            // 4. TÍNH THUẾ TNCN (Gross = Thu nhập tháng + Thưởng + Tăng ca)
            const gross = actualSalary + reward + overtimeMoney;
            const { pitTax } = calculateTaxesAndInsurances(base, gross);

            // 5. THỰC NHẬN (NET) = Thu nhập sau BH + Thưởng + Tăng Ca - Kỷ luật - Thuế TNCN
            const netSalary = incomeAfterIns + reward + overtimeMoney - discipline - pitTax;

            // 6. CHI PHÍ TIỀN LƯƠNG (Của Công ty) = Tổng Gross + Doanh Nghiệp Đóng BH
            // Công thức này bao hàm cả (Thực nhận + Thuế TNCN + BH NLĐ + Kỷ luật + BH DN)
            const companyCost = gross + compInsurance.total;

            results.push({
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
                pitTax: pitTax, 
                net_salary: netSalary,
                company_cost: companyCost
            });
        }
        res.json({ success: true, data: results });
    } catch (error) { 
        res.status(500).json({ success: false, error: error.message }); 
    }
};

module.exports = { calculatePayroll };
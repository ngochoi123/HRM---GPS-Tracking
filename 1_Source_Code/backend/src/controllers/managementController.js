
const db = require('../config/database'); 
const bcrypt = require('bcrypt');
const { sendAccountEmail } = require('../services/emailService');

const getEmployees = async (req, res) => {
  try {

    const query = `
      SELECT 
        e.id, 
        e.employee_code AS code, 
        e.full_name AS name, 
        e.work_email AS email, 
        p.position_name AS position, 
        d.department_name AS department, 
        e.status 
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      ORDER BY e.created_at DESC;
    `;

    
    const employees = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    const formattedData = employees.map(emp => {
      let statusText = 'Không xác định';
      if (emp.status === 'active') statusText = 'Đang làm việc';
      else if (emp.status === 'on_leave') statusText = 'Nghỉ phép/Thai sản';
      else if (emp.status === 'inactive') statusText = 'Đã nghỉ việc';

      return {
        id: emp.id,
        code: emp.code || 'Chưa cập nhật',
        name: emp.name,
        email: emp.email || 'Chưa cập nhật',
        position: emp.position || 'Chưa phân bổ',
        department: emp.department || 'Chưa phân bổ',
        status: emp.status,
        statusText: statusText
      };
    });

    res.status(200).json(formattedData);

  } catch (error) {
    console.error('Lỗi API getEmployees:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách nhân viên' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        e.*, 
        e.address AS current_address,
        p.position_name AS position_title, 
        d.department_name AS department_title,
        u.username,
        u.role_code,
        u.last_login
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN user_account u ON u.employee_id = e.id
      WHERE e.id = :id
    `;

    const result = await db.query(query, {
      replacements: { id: id },
      type: db.QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    const emp = result[0];
    let statusText = 'Không xác định';
    if (emp.status === 'active') statusText = 'Đang làm việc';
    else if (emp.status === 'on_leave') statusText = 'Nghỉ phép/Thai sản';
    else if (emp.status === 'inactive') statusText = 'Đã nghỉ việc';
    
    emp.statusText = statusText;

    res.status(200).json(emp);

  } catch (error) {
    console.error('Lỗi API getEmployeeById:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { 
      full_name, phone_number, personal_email, current_address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, department_id, join_date, direct_manager_id
    } = req.body;

    const updateQuery = `
      UPDATE employee
      SET full_name = :full_name,
          phone_number = :phone_number,
          personal_email = :personal_email,
          address = :address, 
          identity_card_number = :identity_card_number,
          date_of_birth = :date_of_birth,
          gender = :gender,
          bank_account_number = :bank_account_number,
          bank_name = :bank_name,
          status = :status,
          work_email = :work_email,
          position_id = :position_id,
          join_date = :join_date,
          direct_manager_id = :direct_manager_id,
          updated_at = NOW()
      WHERE id = :id
    `;

    await db.query(updateQuery, {
      replacements: { 
        id: id, 
        full_name: full_name || null, 
        phone_number: phone_number || null, 
        personal_email: personal_email || null, 
        
        address: current_address || null,  
        
        identity_card_number: identity_card_number || null, 
        date_of_birth: date_of_birth || null, 
        gender: (gender !== undefined && gender !== '') ? gender : null, 
        bank_account_number: bank_account_number || null, 
        bank_name: bank_name || null, 
        status: status || 'active',
        work_email: work_email || null,
        position_id: position_id || null, 
        join_date: join_date || null,
        direct_manager_id: direct_manager_id || null
      },
      type: db.QueryTypes.UPDATE
    });

    res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công!' });

  } catch (error) {
    console.error('Lỗi API updateEmployee:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật' });
  }
};
const getFormOptions = async (req, res) => {
  try {
    const departments = await db.query(
      "SELECT id, department_name FROM department ORDER BY department_name", 
      { type: db.QueryTypes.SELECT }
    );

    const positions = await db.query(
      "SELECT id, position_name, department_id FROM position ORDER BY position_name", 
      { type: db.QueryTypes.SELECT }
    );

    const managers = await db.query(
      `SELECT e.id, e.full_name, p.department_id 
       FROM employee e
       LEFT JOIN position p ON e.position_id = p.id
       WHERE e.status = 'active' 
       ORDER BY e.full_name`, 
      { type: db.QueryTypes.SELECT }
    );

    res.status(200).json({ departments, positions, managers });
  } catch (error) {
    console.error('Lỗi API getFormOptions:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tạo dữ liệu form' });
  }
};
const createEmployee = async (req, res) => {
  const t = await db.transaction();

  try {
    const { 
      full_name, phone_number, personal_email, address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, join_date, direct_manager_id, // ðŸ‘‰ ÄÃ£ xÃ³a department_id á»Ÿ Ä‘Ã¢y
      username, password, send_email 
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `NV-${new Date().getFullYear()}-${randomSuffix}`;

    const insertEmpQuery = `
      INSERT INTO employee (
        employee_code, full_name, phone_number, personal_email, address, 
        identity_card_number, date_of_birth, gender, bank_account_number, bank_name, 
        status, work_email, position_id, join_date, direct_manager_id
      ) VALUES (
        :employee_code, :full_name, :phone_number, :personal_email, :address, 
        :identity_card_number, :date_of_birth, :gender, :bank_account_number, :bank_name, 
        :status, :work_email, :position_id, :join_date, :direct_manager_id
      ) RETURNING id;
    `;

    const empResult = await db.query(insertEmpQuery, {
      replacements: {
        employee_code, full_name, 
        phone_number: phone_number || null, 
        personal_email: personal_email || null, 
        address: address || null,
        identity_card_number: identity_card_number || null, 
        date_of_birth: date_of_birth || null, 
        gender: (gender !== undefined && gender !== '') ? gender : null, 
        bank_account_number: bank_account_number || null, 
        bank_name: bank_name || null, 
        status: status || 'active',
        work_email: work_email || null,
        position_id: position_id || null, 
  
        join_date: join_date || null,
        direct_manager_id: direct_manager_id || null
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    const newEmployeeId = empResult[0][0].id;

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
      INSERT INTO user_account (
        employee_id, username, password_hash, role_code, require_pass_change
      ) VALUES (
        :employee_id, :username, :password_hash, 'employee', true
      )
    `;

    await db.query(insertUserQuery, {
      replacements: {
        employee_id: newEmployeeId,
        username: username,
        password_hash: password_hash
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    await t.commit();

if (send_email === true || send_email === 'true') {
      try {
        const targetEmail = personal_email || work_email || username; 

        await sendAccountEmail(
          targetEmail, 
          full_name, 
          username, 
          password
        );
        
        console.log(`Đã gửi email cấp tài khoản tới: ${targetEmail}`);
        
        return res.status(201).json({ success: true, message: 'Thêm nhân viên và gửi email cấp tài khoản thành công!' });
      } catch (emailError) {
        console.error('Lỗi gửi email:', emailError);
        return res.status(201).json({ 
          success: true, 
          message: 'Đã thêm nhân viên thành công, nhưng cấu hình gửi Email đang bị lỗi. Vui lòng cấp lại pass sau.' 
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Thêm nhân viên và cấp tài khoản thành công!' });

  } catch (error) {
    try {
        await t.rollback();
    } catch (rbError) {
        console.error('Lỗi rollback:', rbError);
    }
    
    console.error('Lỗi API createEmployee:', error);
    if (error.original && error.original.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email/Username này đã tồn tại trong hệ thống!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi thêm nhân viên' });
  }
};
const deleteEmployee = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const emp = await db.query('SELECT id FROM employee WHERE id = :id', {
      replacements: { id },
      type: db.QueryTypes.SELECT,
      transaction: t
    });

    if (emp.length === 0) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }
    await db.query('UPDATE department SET manager_id = NULL WHERE manager_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('UPDATE employee SET direct_manager_id = NULL WHERE direct_manager_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('UPDATE leave_request SET approver_id = NULL WHERE approver_id = :id', {
      replacements: { id },
      transaction: t
    });

    await db.query('DELETE FROM attendance WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('DELETE FROM hr_decision WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('DELETE FROM leave_request WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('DELETE FROM overtime_request WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('DELETE FROM contract WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });
    await db.query('DELETE FROM payroll WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });

    await db.query('DELETE FROM user_account WHERE employee_id = :id', {
      replacements: { id },
      transaction: t
    });

    await db.query('DELETE FROM employee WHERE id = :id', {
      replacements: { id },
      transaction: t
    });

    await t.commit();
    res.status(200).json({ success: true, message: 'Xóa nhân viên thành công' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi API deleteEmployee:', error);
    const pgCode = error.original?.code || error.parent?.code;
    const msg = String(error.original?.message || error.message || '');
    if (pgCode === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key')) {
      return res.status(409).json({
        success: false,
        message:
          'Không thể xóa nhân viên vì vẫn còn dữ liệu liên quan trong hệ thống. Vui lòng thử lại hoặc liên hệ quản trị.'
      });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi xóa nhân viên' });
  }
};

const getPresentEmployees = async (req, res) => {
  try {
const query = `
      SELECT 
        e.full_name, 
        e.phone_number, 
        a.check_in_time, 
        a.check_in_latitude, 
        a.check_in_longitude, 
        wl.location_name
      FROM employee e
      JOIN attendance a ON e.id = a.employee_id
      LEFT JOIN work_location wl ON a.work_location_id = wl.id
      WHERE a.attendance_date = CURRENT_DATE
    `;

    const employees = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error('Lỗi API getPresentEmployees:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải dữ liệu hiện diện' });
  }
};

const getAbsentEmployees = async (req, res) => {
  try {
const query = `
      SELECT 
        e.full_name, 
        e.phone_number, 
        lr.status AS leave_status
      FROM employee e
      LEFT JOIN leave_request lr 
        ON e.id = lr.employee_id 
        AND CURRENT_DATE >= DATE(lr.start_datetime) 
        AND CURRENT_DATE <= DATE(lr.end_datetime)
      WHERE e.status = 'active' 
        AND e.id NOT IN (
          SELECT employee_id 
          FROM attendance
          WHERE attendance_date = CURRENT_DATE
        )
    `;

    const employees = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error('Lỗi API getAbsentEmployees:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải dữ liệu vắng mặt' });
  }
};
const getChangesSummary = async (req, res) => {
  try {
    const { month } = req.query; // yyyy-MM

    const query = `
      SELECT
  (SELECT COUNT(*) 
   FROM employee 
   WHERE join_date <= TO_DATE(:month, 'YYYY-MM')
     AND (status = 'active' OR TO_CHAR(updated_at, 'YYYY-MM') > :month)
  ) AS total,

  (SELECT COUNT(*) 
   FROM employee 
   WHERE TO_CHAR(join_date, 'YYYY-MM') = :month
  ) AS new_employees,

  (SELECT COUNT(*) 
   FROM employee 
   WHERE status = 'inactive'
     AND TO_CHAR(updated_at, 'YYYY-MM') = :month
  ) AS leave_employees
    `;

    const result = await db.query(query, {
      replacements: { month },
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result[0]);

  } catch (error) {
    console.error('Lỗi getChangesSummary:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
const getChangesList = async (req, res) => {
  try {
    const { month } = req.query;

    const query = `
      SELECT 
        e.id AS employee_id,
        e.full_name,
        d.department_name,
        'Gia nhập' AS type,
        e.join_date AS date
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE TO_CHAR(e.join_date, 'YYYY-MM') = :month

      UNION ALL

      SELECT 
        e.id AS employee_id,
        e.full_name,
        d.department_name,
        'Nghỉ việc' AS type,
        e.updated_at AS date
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE e.status = 'inactive'
        AND TO_CHAR(e.updated_at, 'YYYY-MM') = :month

      UNION ALL

      SELECT 
        e.id AS employee_id,
        e.full_name,
        d.department_name,
        'Nghỉ phép' AS type,
        lr.start_datetime AS date
      FROM leave_request lr
      JOIN employee e ON e.id = lr.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE lr.status = 'approved'
        AND TO_CHAR(lr.start_datetime, 'YYYY-MM') = :month

      ORDER BY date DESC;
    `;

    const result = await db.query(query, {
      replacements: { month },
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Lỗi getChangesList:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
const getTenureStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        CASE 
          WHEN AGE(CURRENT_DATE, join_date) < INTERVAL '1 year' THEN 'fresher'
          WHEN AGE(CURRENT_DATE, join_date) < INTERVAL '3 years' THEN 'junior'
          WHEN AGE(CURRENT_DATE, join_date) < INTERVAL '5 years' THEN 'mid'
          ELSE 'senior'
        END AS level,
        COUNT(*) as count
      FROM employee
      WHERE status = 'active' AND join_date IS NOT NULL
      GROUP BY level
    `;

    const result = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    const data = {
      fresher: 0,
      junior: 0,
      mid: 0,
      senior: 0
    };

    let total = 0;

    result.forEach(item => {
      data[item.level] = Number(item.count);
      total += Number(item.count);
    });

    const percentData = {
      fresher: total ? Math.round((data.fresher / total) * 100) : 0,
      junior: total ? Math.round((data.junior / total) * 100) : 0,
      mid: total ? Math.round((data.mid / total) * 100) : 0,
      senior: total ? Math.round((data.senior / total) * 100) : 0
    };

    res.status(200).json(percentData);

  } catch (error) {
    console.error('Lỗi getTenureStats:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
const getApprovalRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveQuery = `
      SELECT 
    lr.id,
    lr.employee_id,
    e.full_name AS employee_name,
    approver.full_name AS approver_name,

    p.position_name,
    d.department_name,

    'leave' AS type,
    lr.leave_type,
    lr.start_datetime,
    lr.end_datetime,
    lr.reason,
    lr.status,
    lr.created_at

  FROM leave_request lr
  JOIN employee e ON lr.employee_id = e.id
  LEFT JOIN employee approver ON lr.approver_id = approver.id

  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id

  WHERE lr.approver_id = :id
  AND lr.status = 'pending'
    `;

    const otQuery = `
      SELECT 
    ot.id,
    ot.employee_id,
    e.full_name AS employee_name,
    approver.full_name AS approver_name,

    p.position_name,
    d.department_name,

    'overtime' AS type,
    NULL AS leave_type,
    ot.ot_date AS start_datetime,
    ot.ot_date AS end_datetime,
    ot.reason,
    ot.status,
    ot.created_at,
    ot.start_time,
    ot.end_time

  FROM overtime_request ot
  JOIN employee e ON ot.employee_id = e.id
  LEFT JOIN employee approver ON ot.approver_id = approver.id

  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id

  WHERE ot.approver_id = :id
  AND ot.status = 'pending'
    `;

    const [leaveRows] = await db.query(leaveQuery, {
      replacements: { id }
    });

    const [otRows] = await db.query(otQuery, {
      replacements: { id }
    });

    const combined = [...leaveRows, ...otRows].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json(combined);

  } catch (error) {
    console.error(" getApprovalRequests error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const updateApprovalStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body; // approved | rejected

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    let query = '';

    if (type === 'leave') {
      query = `
        UPDATE leave_request
        SET status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *;
      `;
    }

    else if (type === 'overtime') {
      query = `
        UPDATE overtime_request
        SET status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *;
      `;
    }

    else {
      return res.status(400).json({ message: 'Type không hợp lệ' });
    }

    const [result] = await db.query(query, {
      replacements: { id, status }
    });

    res.json({
      message: 'Cập nhật thành công',
      data: result[0]
    });

  } catch (error) {
    console.error(" updateApprovalStatus:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
const getApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM (
      SELECT 
        lr.id,
        lr.employee_id,
        e.full_name AS employee_name,
        'leave' AS type,
        lr.status,
        lr.updated_at   
      FROM leave_request lr
      JOIN employee e ON lr.employee_id = e.id
      WHERE lr.approver_id = :id
      AND lr.status = 'approved'

      UNION ALL

      SELECT 
        ot.id,
        ot.employee_id,
        e.full_name AS employee_name,
        'overtime' AS type,
        ot.status,
        ot.updated_at   
      FROM overtime_request ot
      JOIN employee e ON ot.employee_id = e.id
      WHERE ot.approver_id = :id
      AND ot.status = 'approved'
    ) t
    ORDER BY updated_at DESC
    `;

    const [rows] = await db.query(query, {
      replacements: { id }
    });

    res.json(rows);

  } catch (error) {
    console.error(" getApprovalHistory:", error);
    res.status(500).json({ message: error.message });
  }
};

const getAttendanceStats = async (req, res) => {
  try {
    let monthParam = req.query.month ? String(req.query.month) : '';
    if (monthParam && !/^\d{4}-\d{2}$/.test(String(monthParam))) {
      return res.status(400).json({ message: 'Tham số month (YYYY-MM) không hợp lệ' });
    }

    if (!monthParam) {
      const latestMonthRow = await db.query(
        `
        SELECT TO_CHAR(MAX(attendance_date), 'YYYY-MM') AS latest_month
        FROM attendance
        `,
        { type: db.QueryTypes.SELECT }
      );

      monthParam = latestMonthRow[0]?.latest_month || new Date().toISOString().slice(0, 7);
    }

    const [y, m] = monthParam.split('-').map((n) => parseInt(n, 10));
    const curStart = new Date(Date.UTC(y, m - 1, 1));
    const curEnd = new Date(Date.UTC(y, m, 1));
    const prevStart = new Date(Date.UTC(y, m - 2, 1));
    const prevEnd = curStart;

    const curStartStr = curStart.toISOString().slice(0, 10);
    const curEndStr = curEnd.toISOString().slice(0, 10);
    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const attendanceAgg = await db.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN a.attendance_date >= :cur_start AND a.attendance_date < :cur_end
          THEN COALESCE(a.total_work_hours, 0) ELSE 0 END), 0)::float AS work_hours_cur,
        COALESCE(SUM(CASE WHEN a.attendance_date >= :prev_start AND a.attendance_date < :prev_end
          THEN COALESCE(a.total_work_hours, 0) ELSE 0 END), 0)::float AS work_hours_prev,
        COALESCE(SUM(CASE WHEN a.attendance_date >= :cur_start AND a.attendance_date < :cur_end
            AND a.status IN ('late', 'early_leave') THEN 1 ELSE 0 END), 0)::int AS late_early_cur,
        COALESCE(SUM(CASE WHEN a.attendance_date >= :prev_start AND a.attendance_date < :prev_end
            AND a.status IN ('late', 'early_leave') THEN 1 ELSE 0 END), 0)::int AS late_early_prev
      FROM attendance a
      JOIN employee e ON e.id = a.employee_id AND e.status = 'active'
      `,
      {
        replacements: {
          cur_start: curStartStr,
          cur_end: curEndStr,
          prev_start: prevStartStr,
          prev_end: prevEndStr,
        },
        type: db.QueryTypes.SELECT,
      }
    );

    const leaveRows = await db.query(
      `
      SELECT
        COALESCE(SUM(
          GREATEST(0,
            (LEAST(DATE(lr.end_datetime), (:cur_end::date - INTERVAL '1 day')::date)
             - GREATEST(DATE(lr.start_datetime), :cur_start::date) + 1)
          )
        ), 0)::int AS leave_days_cur
      FROM leave_request lr
      WHERE lr.status = 'approved'
        AND lr.start_datetime < :cur_end
        AND lr.end_datetime > :cur_start
      `,
      {
        replacements: { cur_start: curStartStr, cur_end: curEndStr },
        type: db.QueryTypes.SELECT,
      }
    );

    const leaveRowsPrev = await db.query(
      `
      SELECT
        COALESCE(SUM(
          GREATEST(0,
            (LEAST(DATE(lr.end_datetime), (:prev_end::date - INTERVAL '1 day')::date)
             - GREATEST(DATE(lr.start_datetime), :prev_start::date) + 1)
          )
        ), 0)::int AS leave_days_prev
      FROM leave_request lr
      WHERE lr.status = 'approved'
        AND lr.start_datetime < :prev_end
        AND lr.end_datetime > :prev_start
      `,
      {
        replacements: { prev_start: prevStartStr, prev_end: prevEndStr },
        type: db.QueryTypes.SELECT,
      }
    );

    const otAgg = await db.query(
      `
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (o.end_time - o.start_time)) / 3600.0), 0)::float AS ot_cur
      FROM overtime_request o
      WHERE o.status = 'approved'
        AND o.ot_date >= :cur_start AND o.ot_date < :cur_end
      `,
      {
        replacements: { cur_start: curStartStr, cur_end: curEndStr },
        type: db.QueryTypes.SELECT,
      }
    );

    const otAggPrev = await db.query(
      `
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (o.end_time - o.start_time)) / 3600.0), 0)::float AS ot_prev
      FROM overtime_request o
      WHERE o.status = 'approved'
        AND o.ot_date >= :prev_start AND o.ot_date < :prev_end
      `,
      {
        replacements: { prev_start: prevStartStr, prev_end: prevEndStr },
        type: db.QueryTypes.SELECT,
      }
    );

    const tolRow = await db.query(
      `SELECT COALESCE((SELECT config_value::int FROM system_config WHERE config_key = 'DEFAULT_LATE_TOLERANCE'), 15) AS tol`,
      { type: db.QueryTypes.SELECT }
    );
    const tolMin = tolRow[0]?.tol ?? 15;

    const deptRows = await db.query(
      `
      SELECT
        d.id AS department_id,
        d.department_name,
        COUNT(*) FILTER (WHERE a.status IN ('late', 'early_leave'))::int AS incident_count
      FROM department d
      JOIN "position" p ON p.department_id = d.id
      JOIN employee e ON e.position_id = p.id AND e.status = 'active'
      LEFT JOIN attendance a ON a.employee_id = e.id
        AND a.attendance_date >= :cur_start AND a.attendance_date < :cur_end
      GROUP BY d.id, d.department_name
      HAVING COUNT(*) FILTER (WHERE a.status IN ('late', 'early_leave')) > 0
      ORDER BY incident_count DESC
      `,
      {
        replacements: { cur_start: curStartStr, cur_end: curEndStr },
        type: db.QueryTypes.SELECT,
      }
    );

    const totalDeptIncidents = deptRows.reduce((s, r) => s + Number(r.incident_count || 0), 0);
    const barColors = ['red', 'orange', 'blue', 'emerald', 'violet'];
    const departmentChart = deptRows.map((row, idx) => ({
      department: row.department_name,
      count: Number(row.incident_count),
      percentage:
        totalDeptIncidents > 0
          ? Math.round((Number(row.incident_count) / totalDeptIncidents) * 1000) / 10
          : 0,
      color: barColors[idx % barColors.length],
    }));

    const attentionRows = await db.query(
      `
      SELECT
        e.id,
        e.employee_code,
        e.full_name,
        e.avatar_url,
        d.id AS department_id,
        d.department_name,
        COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0)::int AS late_count,
        COALESCE(SUM(
          CASE
            WHEN a.status = 'late' AND a.check_in_time IS NOT NULL THEN
              CASE
                WHEN (a.check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
                  BETWEEN TIME '07:30' AND TIME '11:30'
                THEN GREATEST(0,
                  EXTRACT(EPOCH FROM (
                    (a.check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
                    - (TIME '07:30' + (interval '1 minute' * :tol_min))
                  )) / 60.0
                )
                WHEN (a.check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
                  BETWEEN TIME '13:00' AND TIME '17:00'
                THEN GREATEST(0,
                  EXTRACT(EPOCH FROM (
                    (a.check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
                    - (TIME '13:00' + (interval '1 minute' * :tol_min))
                  )) / 60.0
                )
                ELSE 0
              END
            ELSE 0
          END
        ), 0)::float AS total_late_minutes
      FROM employee e
      JOIN "position" p ON e.position_id = p.id
      JOIN department d ON p.department_id = d.id
      LEFT JOIN attendance a ON a.employee_id = e.id
        AND a.attendance_date >= :cur_start AND a.attendance_date < :cur_end
      WHERE e.status = 'active'
      GROUP BY e.id, e.employee_code, e.full_name, e.avatar_url, d.id, d.department_name
      HAVING COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0) > 0
      ORDER BY late_count DESC, total_late_minutes DESC
      LIMIT 50
      `,
      {
        replacements: { cur_start: curStartStr, cur_end: curEndStr, tol_min: tolMin },
        type: db.QueryTypes.SELECT,
      }
    );

    const attentionEmployees = attentionRows.map((row) => {
      const lateCount = Number(row.late_count);
      const totalLateMinutes = Math.round(Number(row.total_late_minutes));
      const actionType = lateCount >= 7 || totalLateMinutes >= 180 ? 'warning' : 'remind';
      return {
        id: row.id,
        employeeCode: row.employee_code,
        name: row.full_name,
        avatarUrl: row.avatar_url,
        departmentId: row.department_id,
        dept: row.department_name,
        lateCount,
        totalLateMinutes,
        actionType,
      };
    });

    const pct = (cur, prev) => {
      const c = Number(cur);
      const p = Number(prev);
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 1000) / 10;
    };

    const att = attendanceAgg[0] || {};
    const leaveCur = leaveRows[0]?.leave_days_cur ?? 0;
    const leavePrev = leaveRowsPrev[0]?.leave_days_prev ?? 0;
    const otCur = otAgg[0]?.ot_cur ?? 0;
    const otPrev = otAggPrev[0]?.ot_prev ?? 0;

    res.status(200).json({
      month: monthParam,
      summary: {
        totalWorkHours: {
          value: Math.round(Number(att.work_hours_cur || 0) * 10) / 10,
          changePct: pct(att.work_hours_cur, att.work_hours_prev),
          label: 'Tổng giờ công thực tế',
          unit: 'giờ',
        },
        lateEarly: {
          value: Number(att.late_early_cur || 0),
          changePct: pct(att.late_early_cur, att.late_early_prev),
          label: 'Đi trễ / Về sớm',
          unit: 'lượt',
          tone: Number(att.late_early_cur || 0) > Number(att.late_early_prev || 0) ? 'alarming' : 'neutral',
        },
        leaveAbsence: {
          value: Number(leaveCur),
          changePct: pct(leaveCur, leavePrev),
          label: 'Nghỉ phép / Thai sản',
          unit: 'ngày',
          tone: leaveCur <= leavePrev ? 'stable' : 'neutral',
        },
        overtime: {
          value: Math.round(Number(otCur) * 10) / 10,
          changePct: pct(otCur, otPrev),
          label: 'Làm thêm giờ (OT)',
          unit: 'giờ',
        },
      },
      departmentLateness: departmentChart,
      attentionEmployees,
    });
  } catch (error) {
    console.error('Lỗi getAttendanceStats:', error);
    res.status(500).json({ message: 'Lỗi server khi tải thống kê chấm công' });
  }
};
const getPayrollOverview = async (req, res) => {
  try {
    const { month, year } = req.query; // e.g. 08, 2023
    let monthYear = `${String(month).padStart(2, '0')}-${year}`;

    const query = `
          SELECT 
            COALESCE(SUM(net_salary), 0) AS total_net_salary,
            -- Thêm dòng này để tính chính xác Tổng Quỹ Lương (Gross):
            COALESCE(SUM(net_salary + total_deduction), 0) AS total_gross_salary, 
            COALESCE(SUM(net_salary - total_allowance + total_deduction), 0) AS total_base_salary,
            COALESCE(SUM(total_allowance), 0) AS total_allowance,
            COALESCE(SUM(total_deduction), 0) AS total_deduction
          FROM payroll
          WHERE month_year = :monthYear
        `;

    const result = await db.query(query, {
      replacements: { monthYear },
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result[0]);
  } catch (error) {
    console.error('Lỗi getPayrollOverview:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const getDepartmentPayrollBreakdown = async (req, res) => {
  try {
    const { month, year } = req.query;
    let monthYear = `${String(month).padStart(2, '0')}-${year}`;

    const query = `
      SELECT 
        d.id AS department_id,
        d.department_name,
        COUNT(e.id) AS headcount,
        COALESCE(SUM(p.net_salary - p.total_allowance + p.total_deduction), 0) AS total_base_salary,
        COALESCE(SUM(p.total_allowance), 0) AS total_allowance,
        COALESCE(SUM(p.total_deduction), 0) AS total_deduction,
        -- Cột Tổng chi phí của bảng xếp hạng phòng ban:
        COALESCE(SUM(p.net_salary + p.total_deduction), 0) AS total_gross_salary,
        COALESCE(SUM(p.net_salary), 0) AS total_net_salary
      FROM payroll p
      JOIN employee e ON p.employee_id = e.id
      LEFT JOIN position pos ON e.position_id = pos.id
      LEFT JOIN department d ON pos.department_id = d.id
      WHERE p.month_year = :monthYear
      GROUP BY d.id, d.department_name
      ORDER BY total_net_salary DESC
    `;

    const result = await db.query(query, {
      replacements: { monthYear },
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi getDepartmentPayrollBreakdown:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const getEmployeesByDepartmentPayroll = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { month, year } = req.query;
    let monthYear = `${String(month).padStart(2, '0')}-${year}`;

    const query = `
      SELECT 
        p.id AS payroll_id,
        e.employee_code,
        e.full_name AS employee_name,
        (p.net_salary - p.total_allowance + p.total_deduction) AS base_salary_snapshot,
        p.total_allowance,
        p.total_deduction,
        p.net_salary,
        p.status
      FROM payroll p
      JOIN employee e ON p.employee_id = e.id
      LEFT JOIN position pos ON e.position_id = pos.id
      WHERE pos.department_id = :departmentId
        AND p.month_year = :monthYear
      ORDER BY e.full_name ASC
    `;

    const result = await db.query(query, {
      replacements: { departmentId, monthYear },
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi getEmployeesByDepartmentPayroll:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const quickApprovePayroll = async (req, res) => {
  try {
    const { payrollIds } = req.body;
    if (!payrollIds || !payrollIds.length) {
      return res.status(400).json({ message: 'Không có bảng lương nào được chọn' });
    }

    const query = `
      UPDATE payroll
      SET status = 'approved'
      WHERE id IN (:payrollIds) AND status != 'approved'
      RETURNING id, status
    `;

    const result = await db.query(query, {
      replacements: { payrollIds },
      type: db.QueryTypes.UPDATE
    });

    res.status(200).json({ 
      success: true, 
      message: `Đã duyệt thành công ${result[1]} bảng lương`, 
      updatedCount: result[1] 
    });
  } catch (error) {
    console.error('Lỗi quickApprovePayroll:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  getFormOptions ,
  createEmployee,
  deleteEmployee,
  getPresentEmployees,
  getAbsentEmployees,
  getChangesSummary,
  getChangesList,
  getTenureStats,
  getApprovalRequests,
  updateApprovalStatus,
  getApprovalHistory,
  getAttendanceStats,
  getPayrollOverview,
  getDepartmentPayrollBreakdown,
  getEmployeesByDepartmentPayroll,
  quickApprovePayroll
};





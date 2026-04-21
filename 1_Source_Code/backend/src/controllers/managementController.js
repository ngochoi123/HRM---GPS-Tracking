
const db = require('../config/database'); 
const bcrypt = require('bcrypt');
const { sendAccountEmail } = require('../services/emailService');

const getEmployees = async (req, res) => {
  try {
    const { role, department_id } = req.user;
    // Director có thể truyền ?departmentId=X để lọc theo phòng ban
    const { departmentId } = req.query;

    let whereClause = '';
    let replacements = {};

    if (role === 'MANAGER') {
      // MANAGER: bắt buộc chỉ xem phòng ban của mình (server-side enforcement)
      whereClause = 'WHERE p.department_id = :deptId';
      replacements.deptId = department_id;
    } else if ((role === 'DIRECTOR' || role === 'ADMIN') && departmentId) {
      // DIRECTOR/ADMIN có thể lọc theo phòng ban cụ thể nếu truyền param
      whereClause = 'WHERE p.department_id = :deptId';
      replacements.deptId = departmentId;
    }

    const query = `
      SELECT 
        e.id, 
        e.employee_code AS code, 
        e.full_name AS name, 
        e.work_email AS email, 
        p.position_name AS position, 
        d.id AS department_id,
        d.department_name AS department, 
        e.status 
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      ${whereClause}
      ORDER BY e.created_at DESC;
    `;

    const employees = await db.query(query, {
      replacements,
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
        department_id: emp.department_id,
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
    
    const { role, department_id } = req.user;
    let scopingClause = '';
    let replacements = { id };

    if (role === 'MANAGER') {
      scopingClause = 'AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

    const query = `
      SELECT 
        e.*, 
        e.address AS current_address,
        p.position_name AS position_title, 
        d.department_name AS department_title,
        p.department_id,
        u.username,
        u.role_code,
        u.last_login
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN user_account u ON u.employee_id = e.id
      WHERE e.id = :id ${scopingClause}
    `;

    const result = await db.query(query, {
      replacements,
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

const getFormOptions = async (req, res) => {
  try {
    const { role, department_id } = req.user;
    let deptWhere = '';
    let posWhere = '';
    let mgrWhere = "WHERE e.status = 'active'";
    let replacements = {};

    if (role === 'MANAGER') {
      deptWhere = 'WHERE id = :deptId';
      posWhere = 'WHERE department_id = :deptId';
      mgrWhere += ' AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

    const departments = await db.query(
      `SELECT id, department_name FROM department ${deptWhere} ORDER BY department_name`, 
      { replacements, type: db.QueryTypes.SELECT }
    );

    const positions = await db.query(
      `SELECT id, position_name, department_id FROM position ${posWhere} ORDER BY position_name`, 
      { replacements, type: db.QueryTypes.SELECT }
    );

    const managers = await db.query(
      `SELECT e.id, e.full_name, p.department_id 
       FROM employee e
       LEFT JOIN position p ON e.position_id = p.id
       ${mgrWhere}
       ORDER BY e.full_name`, 
      { replacements, type: db.QueryTypes.SELECT }
    );

    res.status(200).json({ departments, positions, managers });
  } catch (error) {
    console.error('Lỗi API getFormOptions:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tạo dữ liệu form' });
  }
};
/*
const createEmployee = async (req, res) => {
  // Logic moved to EmployeeController.js
};
*/

  // Legacy employee creation and update logic has been moved to EmployeeController.js
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
    const { role, department_id } = req.user;
    let whereClause = '';
    let replacements = {};

    if (role === 'MANAGER') {
      whereClause = 'AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

    const query = `
      SELECT 
        e.id AS employee_id,
        e.full_name, 
        e.phone_number, 
        a.check_in_time, 
        a.check_out_time,
        a.status AS attendance_status,
        a.check_in_latitude, 
        a.check_in_longitude, 
        wl.location_name
      FROM employee e
      JOIN attendance a ON e.id = a.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN work_location wl ON a.work_location_id = wl.id
      WHERE e.status = 'active'
        AND a.attendance_date = CURRENT_DATE
        AND a.check_in_time IS NOT NULL
        ${whereClause}
      ORDER BY a.check_in_time ASC
    `;

    const employees = await db.query(query, {
      replacements,
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
    const { role, department_id: managerDeptId } = req.user;
    let scopingClause = '';
    let replacements = {};

    if (role === 'MANAGER') {
      scopingClause = 'AND p.department_id = :deptId';
      replacements.deptId = managerDeptId;
    }

    const query = `
      SELECT 
        e.id AS employee_id,
        e.full_name, 
        e.phone_number, 
        lr.status AS leave_status,
        d.id AS department_id,
        d.department_name
      FROM employee e
      LEFT JOIN "position" p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN LATERAL (
        SELECT leave_request.status
        FROM leave_request
        WHERE leave_request.employee_id = e.id
          AND leave_request.status = 'approved'
          AND CURRENT_DATE >= DATE(leave_request.start_datetime)
          AND CURRENT_DATE <= DATE(leave_request.end_datetime)
        ORDER BY leave_request.created_at DESC
        LIMIT 1
      ) lr ON TRUE
      WHERE e.status = 'active' 
        AND e.id NOT IN (
          SELECT employee_id 
          FROM attendance
          WHERE attendance_date = CURRENT_DATE
            AND check_in_time IS NOT NULL
        )
        ${scopingClause}
      ORDER BY e.full_name ASC
    `;

    const employees = await db.query(query, {
      replacements,
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

    const { role, department_id } = req.user;
    let scopingClause = '';
    let replacements = { month };

    if (role === 'MANAGER') {
      scopingClause = 'AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

    const query = `
      SELECT
        (SELECT COUNT(*) 
         FROM employee e
         LEFT JOIN position p ON e.position_id = p.id
         WHERE e.join_date <= TO_DATE(:month, 'YYYY-MM')
           AND (e.status = 'active' OR TO_CHAR(e.updated_at, 'YYYY-MM') > :month)
           ${scopingClause}
        ) AS total,

        (SELECT COUNT(*) 
         FROM employee e
         LEFT JOIN position p ON e.position_id = p.id
         WHERE TO_CHAR(e.join_date, 'YYYY-MM') = :month
           ${scopingClause}
        ) AS new_employees,

        (SELECT COUNT(*) 
         FROM employee e
         LEFT JOIN position p ON e.position_id = p.id
         WHERE e.status = 'inactive'
           AND TO_CHAR(e.updated_at, 'YYYY-MM') = :month
           ${scopingClause}
        ) AS leave_employees
    `;

    const result = await db.query(query, {
      replacements,
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

    const { role, department_id } = req.user;
    let scopingClause = '';
    let replacements = { month };

    if (role === 'MANAGER') {
      scopingClause = 'AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

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
      ${scopingClause}

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
        ${scopingClause}

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
        ${scopingClause}

      ORDER BY date DESC;
    `;

    const result = await db.query(query, {
      replacements,
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
    lr.created_at,
    lr.attachment

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
    const explanationQuery = `
  SELECT 
    aer.id,
    aer.employee_id,
    e.full_name AS employee_name,
    approver.full_name AS approver_name,

    p.position_name,
    d.department_name,

    'explanation' AS type,
    aer.explanation_type AS explanation_type,
    aer.proposed_check_in AS start_time_ex,
    aer.proposed_check_out AS end_time_ex,
    aer.reason,
    aer.status,
    aer.created_at,
    aer.attachment_url AS attachment

  FROM attendance_explanation_request aer
  JOIN employee e ON aer.employee_id = e.id
  LEFT JOIN employee approver ON aer.approver_id = approver.id
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id

  WHERE aer.approver_id = :id
  AND aer.status = 'pending'
`;

    const [leaveRows] = await db.query(leaveQuery, {
      replacements: { id }
    });

    const [otRows] = await db.query(otQuery, {
      replacements: { id }
    });
    const [explanationRows] = await db.query(explanationQuery, {
      replacements: { id }
    });

    
    const combined = [...leaveRows, ...otRows,...explanationRows].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json(combined);

  } catch (error) {
    console.error(" getApprovalRequests error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const LEAVE_TYPE_LABELS = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  ot: 'Nghỉ bù',
  maternity: 'Nghỉ thai sản',
  bereavement: 'Nghỉ việc riêng'
};

const formatDateTimeVi = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed);
};

const createPersonalNotification = async ({ transaction, employeeId, title, desc, content, notificationType = 'info' }) => {
  const rows = await db.query(
    `
    INSERT INTO notification (
      title,
      content,
      notification_type,
      target,
      "desc",
      status,
      target_employee_id,
      created_at
    )
    VALUES (:title, :content, :notificationType, 'Cá nhân', :desc, 'Đã gửi', :employeeId, NOW())
    RETURNING id
    `,
    {
      replacements: { title, content, notificationType, desc: desc || '', employeeId },
      type: db.QueryTypes.SELECT,
      transaction
    }
  );

  const notificationId = rows?.[0]?.id;
  if (!notificationId) {
    throw new Error('Không thể tạo thông báo.');
  }

  await db.query(
    `INSERT INTO notification_recipient (notification_id, employee_id) VALUES (:notificationId, :employeeId)`,
    {
      replacements: { notificationId, employeeId },
      transaction
    }
  );
};

const createRequestApprovalNotification = async ({ transaction, type, requestRow, isApproved }) => {
  if (!requestRow?.employee_id) return;

  const isLeave = type === 'leave';
  const requestLabel = isLeave
    ? LEAVE_TYPE_LABELS[requestRow.leave_type] || 'Đơn nghỉ phép'
    : 'Đơn tăng ca';

  const title = isApproved ? `${requestLabel} đã được duyệt` : `${requestLabel} bị từ chối`;
  const desc = isApproved
    ? 'Yêu cầu của bạn đã được quản lý phê duyệt.'
    : 'Yêu cầu của bạn đã bị quản lý từ chối.';

  const timeLabel = isLeave
    ? `${formatDateTimeVi(requestRow.start_datetime)} - ${formatDateTimeVi(requestRow.end_datetime)}`
    : `${formatDateTimeVi(requestRow.ot_date)} ${requestRow.start_time || ''}-${requestRow.end_time || ''}`.trim();

  const content = isApproved
    ? `${requestLabel} của bạn cho thời gian ${timeLabel} đã được phê duyệt. Lý do: ${requestRow.reason || 'Không có'}.`
    : `${requestLabel} của bạn cho thời gian ${timeLabel} đã bị từ chối. Lý do: ${requestRow.reason || 'Không có'}.`;

  await createPersonalNotification({
    transaction,
    employeeId: requestRow.employee_id,
    title,
    desc,
    content,
    notificationType: isApproved ? 'info' : 'warning'
  });
};

const updateApprovalStatus = async (req, res) => {
  const tx = await db.transaction();
  try {
    const { type, id } = req.params;
    const { status, approverId } = req.body; // approved | rejected

    if (!['approved', 'rejected'].includes(status)) {
      await tx.rollback();
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    if (!approverId) {
      return res.status(400).json({ message: 'Thiếu thông tin người duyệt' });
    }

    let query = '';
    let detailQuery = '';

    if (type === 'leave') {
      requestLabel = 'Đơn nghỉ phép';
      query = `
        UPDATE leave_request
        SET status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
          AND approver_id = :approver_id
          AND status = 'pending'
        RETURNING *;
      `;
      detailQuery = `
        SELECT id, employee_id, leave_type, start_datetime, end_datetime, reason
        FROM leave_request
        WHERE id = :id
        LIMIT 1
      `;
    }

    else if (type === 'overtime') {
      requestLabel = 'Đơn tăng ca';
      query = `
        UPDATE overtime_request
        SET status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
          AND approver_id = :approver_id
          AND status = 'pending'
        RETURNING *;
      `;
      detailQuery = `
        SELECT id, employee_id, ot_date, start_time, end_time, reason
        FROM overtime_request
        WHERE id = :id
        LIMIT 1
      `;
    }
    else if (type === 'explanation') {
      query = `
        UPDATE attendance_explanation_request
        SET status = :status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *;
      `;
    }

    else {
      await tx.rollback();
      return res.status(400).json({ message: 'Type không hợp lệ' });
    }

    const transaction = await db.transaction();

    try {
      const detailRows = await db.query(detailQuery, {
        replacements: { id },
        type: db.QueryTypes.SELECT,
        transaction
      });

      const requestRow = detailRows?.[0];
      if (!requestRow) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Không tìm thấy đơn cần xử lý' });
      }

      const [result] = await db.query(query, {
        replacements: { id, status, approver_id: approverId },
        transaction
      });

      if (!result?.[0]) {
        await transaction.rollback();
        return res.status(403).json({
          message: 'Bạn không có quyền xử lý đơn này hoặc đơn đã được cập nhật trước đó'
        });
      }

      await createRequestApprovalNotification({
        transaction,
        type,
        requestRow,
        isApproved: status === 'approved'
      });

      await transaction.commit();

      res.json({
        message: 'Cập nhật thành công',
        data: result[0]
      });
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    if (tx && !tx.finished) await tx.rollback();
    console.error("❌ updateApprovalStatus:", error);
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
        aer.id,
        aer.employee_id,
        e.full_name AS employee_name,
        'explanation' AS type,
        aer.status,
        aer.updated_at
      FROM attendance_explanation_request aer
      JOIN employee e ON aer.employee_id = e.id
      WHERE aer.approver_id = :id
      AND aer.status = 'approved'

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

const getRequestsStats = async (req, res) => {
  try {
    const { role, department_id } = req.user;
    const { id: managerId } = req.params; // Keeping managerId for CTE fallback or specific views
    let monthParam = req.query.month ? String(req.query.month) : '';

    if (monthParam && !/^\d{4}-\d{2}$/.test(monthParam)) {
      return res.status(400).json({ message: 'Tham số month (YYYY-MM) không hợp lệ' });
    }

    let managedEmployeesClause = '';
    let replacementsCte = { manager_id: managerId };

    if (role === 'MANAGER') {
      managedEmployeesClause = 'WHERE p.department_id = :deptId';
      replacementsCte.deptId = department_id;
    } else {
      // For Director/Admin: Full company access
      managedEmployeesClause = ''; 
    }

    const baseRequestsCte = `
      WITH managed_employees AS (
        SELECT DISTINCT e.id
        FROM employee e
        LEFT JOIN position p ON p.id = e.position_id
        ${managedEmployeesClause}
      ),
      requests AS (
        SELECT
          lr.id,
          'leave'::text AS request_type,
          lr.leave_type::text AS request_subtype,
          lr.employee_id,
          lr.approver_id,
          lr.status::text AS status,
          lr.created_at,
          lr.start_datetime AS request_date,
          lr.reason
        FROM leave_request lr
        JOIN managed_employees me ON me.id = lr.employee_id

        UNION ALL

        SELECT
          ot.id,
          'overtime'::text AS request_type,
          'overtime'::text AS request_subtype,
          ot.employee_id,
          ot.approver_id,
          ot.status::text AS status,
          ot.created_at,
          ot.ot_date::timestamp with time zone AS request_date,
          ot.reason
        FROM overtime_request ot
        JOIN managed_employees me ON me.id = ot.employee_id
      )
    `;

    if (!monthParam) {
      const latestMonthRow = await db.query(
        `
        ${baseRequestsCte}
        SELECT TO_CHAR(MAX(created_at), 'YYYY-MM') AS latest_month
        FROM requests
        `,
        {
          replacements: replacementsCte,
          type: db.QueryTypes.SELECT
        }
      );

      monthParam = latestMonthRow[0]?.latest_month || new Date().toISOString().slice(0, 7);
    }

    const [year, month] = monthParam.split('-').map(Number);
    const currentStart = new Date(Date.UTC(year, month - 1, 1));
    const currentEnd = new Date(Date.UTC(year, month, 1));
    const previousStart = new Date(Date.UTC(year, month - 2, 1));
    const previousEnd = currentStart;

    const currentStartStr = currentStart.toISOString().slice(0, 10);
    const currentEndStr = currentEnd.toISOString().slice(0, 10);
    const previousStartStr = previousStart.toISOString().slice(0, 10);
    const previousEndStr = previousEnd.toISOString().slice(0, 10);

    const summaryRows = await db.query(
      `
      ${baseRequestsCte}
      SELECT
        COUNT(*) FILTER (
          WHERE created_at >= :cur_start AND created_at < :cur_end
        )::int AS total_current,
        COUNT(*) FILTER (
          WHERE created_at >= :prev_start AND created_at < :prev_end
        )::int AS total_previous,

        COUNT(*) FILTER (
          WHERE created_at >= :cur_start AND created_at < :cur_end
            AND status = 'pending'
        )::int AS pending_current,
        COUNT(*) FILTER (
          WHERE created_at >= :prev_start AND created_at < :prev_end
            AND status = 'pending'
        )::int AS pending_previous,

        COUNT(*) FILTER (
          WHERE created_at >= :cur_start AND created_at < :cur_end
            AND status = 'approved'
        )::int AS approved_current,
        COUNT(*) FILTER (
          WHERE created_at >= :prev_start AND created_at < :prev_end
            AND status = 'approved'
        )::int AS approved_previous,

        COUNT(*) FILTER (
          WHERE created_at >= :cur_start AND created_at < :cur_end
            AND status = 'rejected'
        )::int AS rejected_current,
        COUNT(*) FILTER (
          WHERE created_at >= :prev_start AND created_at < :prev_end
            AND status = 'rejected'
        )::int AS rejected_previous,

        COUNT(*) FILTER (
          WHERE created_at >= :cur_start AND created_at < :cur_end
            AND status = 'pending'
            AND created_at <= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        )::int AS overdue_pending_current,

        COALESCE(AVG(
          CASE
            WHEN created_at >= :cur_start AND created_at < :cur_end
              AND status = 'pending'
            THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600.0
          END
        ), 0)::float AS average_wait_hours_current,

        COALESCE(AVG(
          CASE
            WHEN created_at >= :prev_start AND created_at < :prev_end
              AND status = 'pending'
            THEN EXTRACT(EPOCH FROM ((:prev_end::timestamp) - created_at)) / 3600.0
          END
        ), 0)::float AS average_wait_hours_previous
      FROM requests
      `,
      {
        replacements: {
          ...replacementsCte,
          cur_start: currentStartStr,
          cur_end: currentEndStr,
          prev_start: previousStartStr,
          prev_end: previousEndStr
        },
        type: db.QueryTypes.SELECT
      }
    );

    const breakdownRows = await db.query(
      `
      ${baseRequestsCte}
      SELECT
        request_subtype,
        COUNT(*)::int AS total
      FROM requests
      WHERE created_at >= :cur_start AND created_at < :cur_end
      GROUP BY request_subtype
      ORDER BY total DESC, request_subtype ASC
      `,
      {
        replacements: {
          ...replacementsCte,
          cur_start: currentStartStr,
          cur_end: currentEndStr
        },
        type: db.QueryTypes.SELECT
      }
    );

    const pendingRows = await db.query(
      `
      ${baseRequestsCte}
      SELECT
        r.id,
        r.request_type,
        r.request_subtype,
        r.status,
        r.created_at,
        r.request_date,
        r.reason,
        e.id AS employee_id,
        e.employee_code,
        e.full_name AS employee_name,
        approver.full_name AS approver_name,
        p.position_name,
        d.department_name,
        (r.approver_id = :manager_id AND r.status = 'pending') AS can_approve,
        ROUND((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r.created_at)) / 3600.0)::numeric, 1)::float AS waiting_hours,
        (r.created_at <= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS is_overdue
      FROM requests r
      JOIN employee e ON e.id = r.employee_id
      LEFT JOIN employee approver ON approver.id = r.approver_id
      LEFT JOIN position p ON p.id = e.position_id
      LEFT JOIN department d ON d.id = p.department_id
      WHERE r.status = 'pending'
      ORDER BY is_overdue DESC, r.created_at ASC
      LIMIT 10
      `,
      {
        replacements: { ...replacementsCte },
        type: db.QueryTypes.SELECT
      }
    );

    const monthlyRows = await db.query(
      `
      ${baseRequestsCte}
      SELECT
        r.id,
        r.request_type,
        r.request_subtype,
        r.status,
        r.created_at,
        r.request_date,
        r.reason,
        e.id AS employee_id,
        e.employee_code,
        e.full_name AS employee_name,
        approver.full_name AS approver_name,
        p.position_name,
        d.department_name,
        (r.approver_id = :manager_id AND r.status = 'pending') AS can_approve,
        ROUND((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r.created_at)) / 3600.0)::numeric, 1)::float AS waiting_hours,
        (r.created_at <= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS is_overdue
      FROM requests r
      JOIN employee e ON e.id = r.employee_id
      LEFT JOIN employee approver ON approver.id = r.approver_id
      LEFT JOIN position p ON p.id = e.position_id
      LEFT JOIN department d ON d.id = p.department_id
      WHERE r.created_at >= :cur_start AND r.created_at < :cur_end
      ORDER BY r.created_at DESC, r.employee_id ASC
      `,
      {
        replacements: {
          ...replacementsCte,
          cur_start: currentStartStr,
          cur_end: currentEndStr
        },
        type: db.QueryTypes.SELECT
      }
    );

    const summary = summaryRows[0] || {};
    const resolvedCurrent =
      Number(summary.approved_current || 0) + Number(summary.rejected_current || 0);
    const resolvedPrevious =
      Number(summary.approved_previous || 0) + Number(summary.rejected_previous || 0);

    res.json({
      month: monthParam,
      summary: {
        totalCurrent: Number(summary.total_current || 0),
        totalPrevious: Number(summary.total_previous || 0),
        pendingCurrent: Number(summary.pending_current || 0),
        pendingPrevious: Number(summary.pending_previous || 0),
        approvedCurrent: Number(summary.approved_current || 0),
        approvedPrevious: Number(summary.approved_previous || 0),
        rejectedCurrent: Number(summary.rejected_current || 0),
        rejectedPrevious: Number(summary.rejected_previous || 0),
        overduePendingCurrent: Number(summary.overdue_pending_current || 0),
        approvalRateCurrent:
          resolvedCurrent > 0
            ? Math.round((Number(summary.approved_current || 0) / resolvedCurrent) * 1000) / 10
            : 0,
        approvalRatePrevious:
          resolvedPrevious > 0
            ? Math.round((Number(summary.approved_previous || 0) / resolvedPrevious) * 1000) / 10
            : 0,
        averageWaitHoursCurrent:
          Math.round(Number(summary.average_wait_hours_current || 0) * 10) / 10,
        averageWaitHoursPrevious:
          Math.round(Number(summary.average_wait_hours_previous || 0) * 10) / 10
      },
      breakdown: breakdownRows.map((row) => ({
        key: row.request_subtype,
        total: Number(row.total || 0)
      })),
      pendingRequests: pendingRows.map((row) => ({
        id: row.id,
        type: row.request_type,
        subtype: row.request_subtype,
        status: row.status,
        createdAt: row.created_at,
        requestDate: row.request_date,
        reason: row.reason,
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        employeeName: row.employee_name,
        approverName: row.approver_name,
        positionName: row.position_name,
        departmentName: row.department_name,
        canApprove: Boolean(row.can_approve),
        waitingHours: Number(row.waiting_hours || 0),
        isOverdue: Boolean(row.is_overdue)
      })),
      monthlyRequests: monthlyRows.map((row) => ({
        id: row.id,
        type: row.request_type,
        subtype: row.request_subtype,
        status: row.status,
        createdAt: row.created_at,
        requestDate: row.request_date,
        reason: row.reason,
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        employeeName: row.employee_name,
        approverName: row.approver_name,
        positionName: row.position_name,
        departmentName: row.department_name,
        canApprove: Boolean(row.can_approve),
        waitingHours: Number(row.waiting_hours || 0),
        isOverdue: Boolean(row.is_overdue)
      }))
    });
  } catch (error) {
    console.error('getRequestsStats error:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thống kê đơn từ' });
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

    const { role, department_id } = req.user;
    let scopingClause = '';
    let replacements = {
      cur_start: curStartStr,
      cur_end: curEndStr,
      prev_start: prevStartStr,
      prev_end: prevEndStr,
    };

    if (role === 'MANAGER') {
      scopingClause = 'AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

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
      LEFT JOIN position p ON e.position_id = p.id
      WHERE 1=1 ${scopingClause}
      `,
      {
        replacements,
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
      JOIN employee e ON e.id = lr.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      WHERE lr.status = 'approved'
        AND lr.start_datetime < :cur_end
        AND lr.end_datetime > :cur_start
        ${scopingClause}
      `,
      {
        replacements,
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
      JOIN employee e ON e.id = lr.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      WHERE lr.status = 'approved'
        AND lr.start_datetime < :prev_end
        AND lr.end_datetime > :prev_start
        ${scopingClause}
      `,
      {
        replacements,
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
      WHERE 1=1 ${scopingClause}
      GROUP BY d.id, d.department_name
      HAVING COUNT(*) FILTER (WHERE a.status IN ('late', 'early_leave')) > 0
      ORDER BY incident_count DESC
      `,
      {
        replacements: { cur_start: curStartStr, cur_end: curEndStr, ...replacements },
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
        ${scopingClause}
      GROUP BY e.id, e.employee_code, e.full_name, e.avatar_url, d.id, d.department_name
      HAVING COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0) > 0
      ORDER BY late_count DESC, total_late_minutes DESC
      LIMIT 50
      `,
      {
        replacements: { ...replacements, tol_min: tolMin },
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

    const { role, department_id } = req.user;
    let scopingClause = '';
    let replacements = { monthYear };

    if (role === 'MANAGER') {
      scopingClause = 'AND pos.department_id = :deptId';
      replacements.deptId = department_id;
    }

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
        ${scopingClause}
      GROUP BY d.id, d.department_name
      ORDER BY total_net_salary DESC
    `;

    const result = await db.query(query, {
      replacements,
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
  // updateEmployee, // Moved to EmployeeController.js
  getFormOptions ,
  // createEmployee, // Moved to EmployeeController.js
  deleteEmployee,
  getPresentEmployees,
  getAbsentEmployees,
  getChangesSummary,
  getChangesList,
  getTenureStats,
  getApprovalRequests,
  updateApprovalStatus,
  getApprovalHistory,
  getRequestsStats,
  getAttendanceStats,
  getPayrollOverview,
  getDepartmentPayrollBreakdown,
  getEmployeesByDepartmentPayroll,
  quickApprovePayroll
};





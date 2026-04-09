
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

    // 2. Thực thi query bằng Sequelize
    const employees = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    // 3. Format lại data cho chuẩn với Frontend cần
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

    // 4. Trả kết quả về cho Frontend
    res.status(200).json(formattedData);

  } catch (error) {
    console.error('Lỗi API getEmployees:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách nhân viên' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query JOIN 4 bảng: employee, position, department, user_account
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

    // Format lại trạng thái
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
    
    // Lấy FULL dữ liệu từ form Frontend gửi lên (Lưu ý: FE đang gửi lên là current_address)
    const { 
      full_name, phone_number, personal_email, current_address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, department_id, join_date, direct_manager_id
    } = req.body;

    // Câu lệnh Update SQL (Sử dụng đúng cột address của DB)
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
        
        // 👉 CHỈNH LẠI CHỖ NÀY: Gán giá trị từ current_address (FE) vào cột address (DB)
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
// API lấy danh sách Phòng ban, Chức vụ và Quản lý để đưa vào Combobox
const getFormOptions = async (req, res) => {
  try {
    // 1. Lấy danh sách Phòng ban
    const departments = await db.query(
      "SELECT id, department_name FROM department ORDER BY department_name", 
      { type: db.QueryTypes.SELECT }
    );

    // 2. Lấy danh sách Chức vụ
    const positions = await db.query(
      "SELECT id, position_name, department_id FROM position ORDER BY position_name", 
      { type: db.QueryTypes.SELECT }
    );

    // 3. Lấy danh sách Nhân viên (JOIN position để biết họ thuộc Phòng ban nào)
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
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải dữ liệu form' });
  }
};
const createEmployee = async (req, res) => {
  const t = await db.transaction();

  try {
    const { 
      full_name, phone_number, personal_email, address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, join_date, direct_manager_id, // 👉 Đã xóa department_id ở đây
      username, password, send_email 
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `NV-${new Date().getFullYear()}-${randomSuffix}`;

    // 👉 Đã xóa hoàn toàn department_id khỏi câu Query
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

    // ==========================================
    // 4. MỌI THỨ THÀNH CÔNG -> GHI VÀO DATABASE
    // ==========================================
    await t.commit();

    // ==========================================
    // 5. SAU KHI GHI XONG MỚI BẮT ĐẦU GỬI EMAIL
    // ==========================================
if (send_email === true || send_email === 'true') {
      try {
        const targetEmail = personal_email || work_email || username; // Dự phòng trường hợp user không nhập email cá nhân

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
        // Trả về 201 vì DB đã ghi thành công, chỉ báo lỗi phần mail
        return res.status(201).json({ 
          success: true, 
          message: 'Đã thêm nhân viên thành công, nhưng cấu hình gửi Email đang bị lỗi. Vui lòng cấp lại pass sau.' 
        });
      }
    }

    // Nếu không tick ô gửi mail
    return res.status(201).json({ success: true, message: 'Thêm nhân viên và cấp tài khoản thành công!' });

  } catch (error) {
    // Chỉ Rollback khi lỗi CƠ SỞ DỮ LIỆU
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

    // Bỏ tham chiếu tới nhân viên (tránh RESTRICT khi xóa)
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

    // Các bảng FK tới employee thường là ON DELETE RESTRICT — xóa trước khi xóa employee
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
    // Lưu ý: Đổi tên bảng 'leave_request' và 'attendance' cho khớp với database
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
    const query = `
      SELECT
        (SELECT COUNT(*) FROM employee WHERE status = 'active') AS total,

        (SELECT COUNT(*) 
         FROM employee 
         WHERE DATE_TRUNC('month', join_date) = DATE_TRUNC('month', CURRENT_DATE)
        ) AS new_employees,

        (SELECT COUNT(*) 
         FROM employee 
         WHERE status = 'inactive'
         AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
        ) AS leave_employees
    `;

    const result = await db.query(query, {
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
    const query = `
      SELECT 
        e.full_name,
        d.department_name,
        CASE 
          WHEN DATE_TRUNC('month', e.join_date) = DATE_TRUNC('month', CURRENT_DATE)
          THEN 'Gia nhập'
          ELSE 'Nghỉ việc'
        END AS type,
        COALESCE(e.updated_at, e.join_date) AS date
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE 
        DATE_TRUNC('month', e.join_date) = DATE_TRUNC('month', CURRENT_DATE)
        OR (
          e.status = 'inactive' 
          AND DATE_TRUNC('month', e.updated_at) = DATE_TRUNC('month', CURRENT_DATE)
        )
      ORDER BY date DESC
    `;

    const result = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Lỗi getChangesList:', error);
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
  getChangesList
};




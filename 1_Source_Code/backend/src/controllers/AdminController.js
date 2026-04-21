const db = require('../config/database');
const { sendAccountEmail } = require('../services/emailService');
const { Employee, UserAccount, Position, Department } = require('../models');
const bcrypt = require('bcrypt');

// ==========================================
// 1. LẤY DANH SÁCH USER
// ==========================================
const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        ua.id, e.full_name,
        COALESCE(e.personal_email, e.work_email) AS email,
        ua.username, ua.role_code, ua.status 
      FROM user_account ua
      LEFT JOIN employee e ON e.id = ua.employee_id
      ORDER BY CASE WHEN ua.role_code = 'ADMIN' THEN 1 ELSE 2 END, ua.id DESC
    `;
    const usersDB = await db.query(query, { type: db.QueryTypes.SELECT });
    res.status(200).json(usersDB);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy dữ liệu' });
  }
};

// ==========================================
// 2. TẠO TÀI KHOẢN 
// ==========================================
const createUser = async (req, res) => {
  const { 
    isNewEmployee, employeeId, 
    fullName, email, positionId, 
    username, password, role, status, sendEmail 
  } = req.body; 

  // --- 🛑 CHỐT CHẶN ROLE: Chỉ cho phép 4 quyền ---
  const validRoles = ['EMPLOYEE', 'MANAGER', 'DIRECTOR', 'ADMIN'];
  const finalRole = role ? role.toUpperCase() : 'EMPLOYEE'; // Mặc định là EMPLOYEE

  if (!validRoles.includes(finalRole)) {
    return res.status(400).json({ 
      success: false, 
      message: "Quyền không hợp lệ! Chỉ chấp nhận: EMPLOYEE, MANAGER, DIRECTOR, ADMIN" 
    });
  }
  // ------------------------------------------------

  const transaction = await db.transaction();

  try {
    let finalEmployeeId = employeeId ? employeeId : null;

    if (isNewEmployee === true || isNewEmployee === 'true') {
      // Gen mã nhân viên tự động
      const randomEmpCode = 'EMP-' + Math.floor(100000 + Math.random() * 900000);

      // Sử dụng model Employee
      const newEmployee = await Employee.create({
        employee_code: randomEmpCode,
        full_name: fullName,
        work_email: email || null,
        position_id: positionId || null,
        status: 'active'
      }, { transaction });

      finalEmployeeId = newEmployee.id;

      // Xử lý logic hierarchy nếu đây là Manager mới (Tương tự EmployeeController)
      if (positionId) {
        const pos = await Position.findByPk(positionId, { transaction });
        if (pos && pos.level === 'manager') {
          // Cập nhật department.manager_id
          await Department.update(
            { manager_id: finalEmployeeId },
            { where: { id: pos.department_id }, transaction }
          );

          // Cascade direct_manager_id cho nhân viên trong phòng
          await Employee.update(
            { direct_manager_id: finalEmployeeId },
            { 
              where: { 
                position_id: {
                  [db.Sequelize.Op.in]: db.Sequelize.literal(`(SELECT id FROM position WHERE department_id = '${pos.department_id}')`)
                },
                id: { [db.Sequelize.Op.ne]: finalEmployeeId },
                status: 'active'
              }, 
              transaction 
            }
          );
        }
      }
    }

    // Tạo tài khoản UserAccount bằng Sequelize
    const salt = await bcrypt.gen_salt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await UserAccount.create({
      employee_id: finalEmployeeId,
      username: username,
      password_hash: password_hash,
      role_code: finalRole,
      status: status ? status.toLowerCase() : 'active',
      require_pass_change: true
    }, { transaction });

    // BƯỚC 3: XÁC NHẬN LƯU VÀO DATABASE
    await transaction.commit(); 

    // BƯỚC 4: GỬI EMAIL (Tách ra try-catch riêng để không ảnh hưởng luồng chính)
    if (sendEmail === true && email) {
      try {
        await sendAccountEmail(email, fullName || 'Nhân viên', username, password);
      } catch (mailError) {
        // Chỉ in ra log, không ném lỗi ra ngoài làm sập quá trình
        console.error("⚠️ Tài khoản đã tạo, nhưng lỗi khi gửi Email:", mailError);
      }
    }

    // TRẢ VỀ THÀNH CÔNG (Dù email có gửi được hay không)
    res.status(201).json({ 
      success: true, 
      message: "Tạo tài khoản thành công!", 
      user: userResult[0] 
    });

  } catch (error) {
    // 🛑 CHỐT CHẶN MỚI: Chỉ Rollback nếu giao dịch CHƯA được commit
    if (!t.finished) {
      await t.rollback();
    }
    
    console.error("Lỗi khi tạo tài khoản:", error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false, 
        message: "Email hoặc Tên đăng nhập này đã tồn tại trong hệ thống!" 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: "Lỗi máy chủ nội bộ", 
      error: error.message 
    });
  }
};

// ==========================================
// 3. CẬP NHẬT TÀI KHOẢN (CHUẨN HÓA ROLE)
// ==========================================
const updateUser = async (req, res) => {
  const { id } = req.params; 
  let { role, status } = req.body;
  try {
    let updateFields = [];
    let replacements = { id };

    if (role) {
      // --- 🛑 CHỐT CHẶN ROLE KHI CẬP NHẬT ---
      const validRoles = ['EMPLOYEE', 'MANAGER', 'DIRECTOR', 'ADMIN'];
      const finalRole = role.toUpperCase();
      
      if (!validRoles.includes(finalRole)) {
        return res.status(400).json({ success: false, message: "Quyền không hợp lệ!" });
      }

      updateFields.push('role_code = :role');
      replacements.role = finalRole;
    }
    if (status) {
      updateFields.push('status = :status');
      replacements.status = status.toLowerCase();
    }

    if (updateFields.length > 0) {
      const query = `UPDATE user_account SET ${updateFields.join(', ')} WHERE id = :id RETURNING id;`;
      await db.query(query, { replacements });
    }

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật tài khoản:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật tài khoản" });
  }
};

// ==========================================
// 4. CÁC HÀM KHÁC
// ==========================================
const getEmployeesWithoutAccount = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.employee_code, 
        e.full_name,
        p.position_name
      FROM employee e
      LEFT JOIN user_account ua ON e.id = ua.employee_id
      LEFT JOIN position p ON e.position_id = p.id
      WHERE ua.id IS NULL 
      AND e.status = 'active'
      ORDER BY e.created_at DESC;
    `;
    
    const employees = await db.query(query, { type: db.QueryTypes.SELECT });
    
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên chưa có tài khoản:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

const adminForceResetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || String(email).trim() === '') {
      return res.status(400).json({ success: false, message: 'Thiếu email!' });
    }

    const temporaryPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);

    const updateQuery = `
      UPDATE user_account 
      SET password_hash = crypt(:pass, gen_salt('bf')),
          require_pass_change = true
      WHERE employee_id = (
        SELECT id FROM employee 
        WHERE personal_email = :email OR work_email = :email 
        LIMIT 1
      )
    `;

    const [, metadata] = await db.query(updateQuery, { 
      replacements: { pass: temporaryPassword, email: email } 
    });

    if (!metadata || metadata.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy tài khoản gắn với email này hoặc nhân viên chưa có user đăng nhập.'
      });
    }

    const users = await db.query(
      `SELECT full_name, username FROM employee e 
       JOIN user_account ua ON e.id = ua.employee_id 
       WHERE e.personal_email = :email OR e.work_email = :email 
       LIMIT 1`,
      { replacements: { email }, type: db.QueryTypes.SELECT }
    );

    const user = users && users[0];
    if (!user) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng sau khi cập nhật.' });
    }

    await sendAccountEmail(email, user.full_name, user.username, temporaryPassword);

    res.status(200).json({ success: true, message: 'Đã reset và bật cờ đổi mật khẩu thành công!' });

  } catch (error) {
    console.error('adminForceResetPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
};

// ==========================================
// SYNC: Cập nhật direct_manager_id cho toàn bộ nhân  viên
// theo manager_id hiện tại của phòng ban
// ==========================================
const syncManagerAssignments = async (req, res) => {
  const t = await db.transaction();
  try {
    // Bước 1: Cập nhật direct_manager_id của tất cả nhân viên active
    // dựa trên manager_id của phòng ban họ thuộc về
    const result = await db.query(
      `UPDATE employee
       SET direct_manager_id = d.manager_id
       FROM position p
       JOIN department d ON p.department_id = d.id
       WHERE employee.position_id = p.id
         AND d.manager_id IS NOT NULL
         AND employee.id != d.manager_id
         AND employee.status = 'active'
         AND (employee.direct_manager_id IS DISTINCT FROM d.manager_id)`,
      { type: db.QueryTypes.UPDATE, transaction: t }
    );

    // Bước 2: nhân viên thuộc phòng chưa có manager -> set NULL để không bị stale
    await db.query(
      `UPDATE employee
       SET direct_manager_id = NULL
       FROM position p
       JOIN department d ON p.department_id = d.id
       WHERE employee.position_id = p.id
         AND d.manager_id IS NULL
         AND employee.direct_manager_id IS NOT NULL
         AND employee.status = 'active'`,
      { type: db.QueryTypes.UPDATE, transaction: t }
    );

    await t.commit();
    const updatedCount = result[1] || 0;
    res.status(200).json({
      success: true,
      message: `Đã đồng bộ direct_manager_id cho ${updatedCount} nhân viên thành công.`
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('syncManagerAssignments error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi sync: ' + error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  getEmployeesWithoutAccount,
  adminForceResetPassword,
  syncManagerAssignments
};

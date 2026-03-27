const db = require('../config/database');
const { sendAccountEmail } = require('../services/emailService');

// ==========================================
// 1. LẤY DANH SÁCH USER
// ==========================================
const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        ua.id, e.full_name, e.work_email as email, ua.username, ua.role_code, ua.status 
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
// 2. TẠO TÀI KHOẢN (ĐÃ FIX TOÀN BỘ LỖI)
// ==========================================
const createUser = async (req, res) => {
  const { 
    isNewEmployee, employeeId, 
    fullName, email, positionId, 
    username, password, role, status, sendEmail 
  } = req.body; 

  const t = await db.transaction();

  try {
    let finalEmployeeId = employeeId ? employeeId : null;

    if (isNewEmployee === true || isNewEmployee === 'true') {
      // Gen mã nhân viên tự động
      const randomEmpCode = 'EMP-' + Math.floor(100000 + Math.random() * 900000);

      const insertEmpQuery = `
        INSERT INTO employee (employee_code, full_name, work_email, position_id)
        VALUES (:empCode, :fullName, :email, :positionId)
        RETURNING id;
      `;
      const [empResult] = await db.query(insertEmpQuery, {
        replacements: { 
          empCode: randomEmpCode, 
          fullName: fullName, 
          email: email || null, 
          positionId: positionId || null 
        },
        transaction: t
      });
      finalEmployeeId = empResult[0].id;
    }

    const insertUserQuery = `
      INSERT INTO user_account (employee_id, username, password_hash, role_code, status)
      VALUES (:finalEmployeeId, :username, crypt(:password, gen_salt('bf')), :role, :status)
      RETURNING id, username;
    `;
    const [userResult] = await db.query(insertUserQuery, {
      replacements: { 
        finalEmployeeId, username, password, role, 
        status: status ? status.toLowerCase() : 'active' 
      },
      transaction: t
    });

    // BƯỚC 3: XÁC NHẬN LƯU VÀO DATABASE
    await t.commit(); 

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
// 3. CẬP NHẬT TÀI KHOẢN
// ==========================================
const updateUser = async (req, res) => {
  const { id } = req.params; 
  let { role, status } = req.body;
  try {
    if (status) status = status.toLowerCase();
    const query = `UPDATE user_account SET role_code = :role, status = :status WHERE id = :id RETURNING id;`;
    await db.query(query, { replacements: { role, status, id } });
    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật tài khoản" });
  }
};

const getEmployeesWithoutAccount = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.employee_code, 
        e.full_name,
        p.position_name -- Nếu bạn có bảng chức vụ (position), lấy thêm tên chức vụ cho đẹp
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


// module.exports = { getAllUsers, createUser, updateUser, getEmployeesWithoutAccount };

module.exports = { getAllUsers, createUser, updateUser, getEmployeesWithoutAccount };
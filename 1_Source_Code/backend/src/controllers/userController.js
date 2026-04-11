// Lấy danh sách tất cả người dùng (Join bảng user_account và employee)
const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.role_code as role, u.status, e.full_name as name, e.email
      FROM user_account u
      LEFT JOIN employee e ON u.employee_id = e.id
      ORDER BY u.id DESC;
    `;
    const { rows } = await pool.query(query); // pool là kết nối DB của bạn
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu" });
  }
};
const createUser = async (req, res) => {
  // 1. Lấy ĐẦY ĐỦ các trường từ Frontend gửi lên
  const { employeeId, username, password, role, status, sendEmail, email, fullName } = req.body; 

  try {
    // 2. Viết câu lệnh SQL (Dùng chuẩn Sequelize để bảo mật, chống SQL Injection)
    const query = `
      INSERT INTO user_account (employee_id, username, password_hash, role_code, status)
      VALUES (:employeeId, :username, crypt(:password, gen_salt('bf')), :role, :status)
      RETURNING id, username;
    `;
    
    // 3. Thực thi Query bằng db 
    const [results, metadata] = await db.query(query, {
      replacements: { 
        employeeId: employeeId, 
        username: username, 
        password: password, 
        role: role, 
        status: status 
      }
    });

    // 4. KIỂM TRA VÀ GỬI EMAIL
    // Nếu Frontend gửi lên sendEmail = true VÀ có cung cấp email
    if (sendEmail === true && email) {
      await sendAccountEmail(email, fullName || 'Nhân viên', username, password);
    }

    // 5. Trả kết quả thành công về Frontend
    res.status(201).json({ 
      success: true, 
      message: "Tạo tài khoản thành công!", 
      user: results[0] 
    });

  } catch (error) {
    console.error("Lỗi khi tạo tài khoản:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi máy chủ nội bộ khi tạo tài khoản", 
      error: error.message 
    });
  }
};
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;
  try {
    const query = `
      UPDATE user_account 
      SET role_code = $1, status = $2 
      WHERE id = $3 RETURNING id;
    `;
    await pool.query(query, [role, status, id]);
    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật tài khoản" });
  }
};
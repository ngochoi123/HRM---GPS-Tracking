
const db = require('../config/database'); 
const bcrypt = require('bcrypt');
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
  // Khởi tạo Transaction để đảm bảo tính toàn vẹn dữ liệu (Lưu cả Nhân viên + Tài khoản)
  const t = await db.transaction();

  try {
    const { 
      full_name, phone_number, personal_email, address, 
      identity_card_number, date_of_birth, gender, 
      bank_account_number, bank_name, status,
      work_email, position_id, department_id, join_date, direct_manager_id,
      // 2 trường dành riêng cho tài khoản
      username, password 
    } = req.body;

    // 1. Tự động sinh Mã nhân viên (VD: NV-2026-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `NV-${new Date().getFullYear()}-${randomSuffix}`;

    // 2. Insert vào bảng employee (Sử dụng RETURNING id để lấy ID vừa tạo)
    const insertEmpQuery = `
      INSERT INTO employee (
        employee_code, full_name, phone_number, personal_email, address, 
        identity_card_number, date_of_birth, gender, bank_account_number, bank_name, 
        status, work_email, position_id, department_id, join_date, direct_manager_id
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
        department_id: department_id || null,
        join_date: join_date || null,
        direct_manager_id: direct_manager_id || null
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    const newEmployeeId = empResult[0][0].id; // Lấy UUID vừa tạo

    // 3. Mã hóa mật khẩu và Insert vào bảng user_account
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
      INSERT INTO user_account (
        employee_id, username, password_hash, role_code, require_pass_change
      ) VALUES (
        :employee_id, :username, :password_hash, 'employee', true
      )
    `;
    // Lưu ý: role_code mặc định là 'employee', require_pass_change = true để họ phải đổi pass lần đầu đăng nhập

    await db.query(insertUserQuery, {
      replacements: {
        employee_id: newEmployeeId,
        username: username, // Ở FE sẽ bắt nhập đúng định dạng Email
        password_hash: password_hash
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    // 4. Nếu mọi thứ thành công -> Xác nhận Transaction
    await t.commit();

    const { send_email } = req.body;
    if (send_email === true || send_email === 'true') {
      try {
        await sendAccountEmail({
        email: username,
        subject: 'Chào mừng bạn đến với công ty - Thông tin tài khoản',
        message: `Xin chào ${full_name},\n\nTài khoản của bạn là:\nUsername: ${username}\nPassword: ${password}\n\nVui lòng đổi mật khẩu trong lần đăng nhập đầu tiên.`
        });
        console.log(`[Thành công] Đã gửi email cấp tài khoản tới: ${username}`);
      } catch (emailError) {
        console.error('Lỗi khi gửi email cấp tài khoản:', emailError);
        // Do đã Insert DB thành công nên vẫn trả về 201, nhưng kèm thông báo cảnh báo
        return res.status(201).json({ 
          success: true, 
          message: 'Thêm nhân viên thành công, nhưng cấu hình gửi Email đang bị lỗi!' 
        });
      }
    }
    res.status(201).json({ success: true, message: 'Thêm nhân viên và cấp tài khoản thành công!' });

  } catch (error) {
    // Nếu có bất kỳ lỗi gì (VD: Trùng username) -> Hủy bỏ toàn bộ (Rollback)
    await t.rollback();
    console.error('Lỗi API createEmployee:', error);
    
    // Bắt lỗi trùng lặp từ DB để báo cho FE
    if (error.original && error.original.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email/Username này đã tồn tại trong hệ thống!' });
    }
    
    res.status(500).json({ success: false, message: 'Lỗi Server khi thêm nhân viên' });
  }
};
const deleteEmployee = async (req, res) => {
  const t = await db.transaction(); // Khởi tạo Transaction

  try {
    const { id } = req.params;

    // 1. Kiểm tra xem nhân viên có tồn tại không
    const emp = await db.query("SELECT id FROM employee WHERE id = :id", {
      replacements: { id },
      type: db.QueryTypes.SELECT
    });

    if (emp.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // 2. Xóa tài khoản đăng nhập (user_account) trước để tránh lỗi khóa ngoại
    await db.query("DELETE FROM user_account WHERE employee_id = :id", {
      replacements: { id },
      type: db.QueryTypes.DELETE,
      transaction: t
    });

    // 3. Xóa hồ sơ nhân viên
    await db.query("DELETE FROM employee WHERE id = :id", {
      replacements: { id },
      type: db.QueryTypes.DELETE,
      transaction: t
    });

    // Nếu mọi thứ trơn tru -> Lưu thay đổi
    await t.commit();
    res.status(200).json({ success: true, message: 'Xóa nhân viên thành công' });

  } catch (error) {
    // Nếu có lỗi -> Hoàn tác toàn bộ
    await t.rollback();
    console.error('Lỗi API deleteEmployee:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi xóa nhân viên' });
  }
};

// 👉 Đừng quên xuất hàm ra nhé
module.exports = {
  getEmployees, getEmployeeById, updateEmployee, getFormOptions, createEmployee,
  deleteEmployee 
};
// NHỚ XUẤT HÀM NÀY RA NHÉ!
module.exports = {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  getFormOptions ,
  createEmployee,
    deleteEmployee
};




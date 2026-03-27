// Thay đổi đường dẫn import db cho khớp với project của bạn
const db = require('../config/database'); 

const getEmployees = async (req, res) => {
  try {
    // 1. SỬA LẠI CÂU QUERY CHUẨN THEO FILE qlnsupdate.sql
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

module.exports = {
  getEmployees
};
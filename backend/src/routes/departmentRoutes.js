const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { QueryTypes } = require('sequelize');

// ==============================
// 1️⃣ LẤY DANH SÁCH PHÒNG BAN
// ==============================
router.get('/', async (req, res) => {
  try {
    const departments = await db.query(
      `
      SELECT 
        d.id,
        d.department_code,
        d.department_name,
        d.description,
        d.is_active,
        b.branch_name,
        e.full_name AS manager_name,
        e.work_email AS manager_email,
        e.phone_number AS manager_phone,
        COALESCE(emp_count.total, 0) AS total_employees
      FROM department d
      LEFT JOIN branch b ON d.branch_id = b.id
      LEFT JOIN employee e ON d.manager_id = e.id
      LEFT JOIN (
        SELECT position.department_id, COUNT(emp.id) AS total
        FROM employee emp
        LEFT JOIN position ON emp.position_id = position.id
        GROUP BY position.department_id
      ) emp_count ON emp_count.department_id = d.id
      ORDER BY d.department_name;
      `,
      { type: QueryTypes.SELECT }
    );
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy phòng ban' });
  }
});

// ==============================
// 2️⃣ LẤY PHÒNG BAN THEO ID
// ==============================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [department] = await db.query(
      `
      SELECT 
        d.id,
        d.department_code,
        d.department_name,
        d.description,
        d.is_active,
        b.branch_name,
        e.full_name AS manager_name,
        e.work_email AS manager_email,
        e.phone_number AS manager_phone,
        COALESCE(emp_count.total, 0) AS total_employees
      FROM department d
      LEFT JOIN branch b ON d.branch_id = b.id
      LEFT JOIN employee e ON d.manager_id = e.id
      LEFT JOIN (
        SELECT p.department_id, COUNT(emp.id) AS total
        FROM employee emp
        LEFT JOIN position p ON emp.position_id = p.id
        GROUP BY p.department_id
      ) emp_count ON emp_count.department_id = d.id
      WHERE d.id = :id
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy phòng ban" });
  }
});

// ==============================
// 3️⃣ LẤY NHÂN VIÊN THEO PHÒNG BAN
// ==============================
router.get('/:id/employees', async (req, res) => {
  const { id } = req.params;
  try {
    const employees = await db.query(
      `
      SELECT 
        emp.id,
        emp.employee_code,
        emp.full_name,
        emp.phone_number,
        emp.work_email,
        p.position_name
      FROM employee emp
      LEFT JOIN position p ON emp.position_id = p.id
      WHERE p.department_id = :deptId
      ORDER BY emp.full_name;
      `,
      { type: QueryTypes.SELECT, replacements: { deptId: id } }
    );
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy nhân viên' });
  }
});

// ==============================
// 4️⃣ TẠO PHÒNG BAN
// ==============================
router.post('/', async (req, res) => {
  const { department_code, department_name, branch_id, manager_id, description, is_active } = req.body;
  if (!department_name) return res.status(400).json({ message: "Thiếu tên phòng ban" });

  try {
    const [result] = await db.query(
      `
      INSERT INTO department 
      (department_code, department_name, branch_id, manager_id, description, is_active)
      VALUES (:code, :name, :branch, :manager, :description, :active)
      RETURNING *;
      `,
      {
        replacements: {
          code: department_code || `PB_${Date.now()}`,
          name: department_name,
          branch: branch_id || null,
          manager: manager_id || null,
          description: description || null,
          active: is_active ?? true
        },
        type: QueryTypes.INSERT
      }
    );
    res.json({ message: "Tạo phòng ban thành công", data: result[0] });
  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// 5️⃣ CẬP NHẬT PHÒNG BAN
// ==============================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { department_name, branch_id, manager_id, description, is_active } = req.body;
  try {
    await db.query(
      `
      UPDATE department
      SET department_name = :name,
          branch_id = :branch,
          manager_id = :manager,
          description = :description,
          is_active = :active
      WHERE id = :id
      `,
      { replacements: { id, name: department_name, branch: branch_id || null, manager: manager_id || null, description: description || null, active: is_active ?? true } }
    );
    res.json({ message: "Cập nhật phòng ban thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật phòng ban" });
  }
});

// ==============================
// 6️⃣ DROPDOWN PHÒNG BAN
// ==============================
router.get('/dropdown/departments', async (req, res) => {
  try {
    const data = await db.query(`SELECT id, department_name FROM department ORDER BY department_name`, { type: QueryTypes.SELECT });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Lỗi load dropdown" });
  }
});

// ==============================
// 7️⃣ XOÁ PHÒNG BAN (TỐI ƯU)
// ==============================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { move_to_department_id } = req.body;

  try {
    // Kiểm tra số nhân viên
    const [empCheck] = await db.query(
      `SELECT COUNT(emp.id) AS total
       FROM employee emp
       LEFT JOIN position p ON emp.position_id = p.id
       WHERE p.department_id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const totalEmployees = parseInt(empCheck.total);

    // Kiểm tra số position
    const [posCheck] = await db.query(
      `SELECT COUNT(*) AS total FROM position WHERE department_id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const totalPositions = parseInt(posCheck.total);

    // Nếu có nhân viên mà không chọn phòng chuyển → lỗi
    if (totalEmployees > 0 && !move_to_department_id) {
      return res.status(400).json({ message: "Phải chọn phòng ban chuyển nhân sự" });
    }

    // Chuyển nhân viên sang phòng khác nếu cần
    if (totalEmployees > 0) {
      await db.query(`UPDATE position SET department_id = :newDept WHERE department_id = :oldDept`, { replacements: { newDept: move_to_department_id, oldDept: id } });
    }

    // Chuyển position trống sang phòng khác nếu cần
    if (move_to_department_id && totalPositions > 0) {
      await db.query(`UPDATE position SET department_id = :newDept WHERE department_id = :oldDept`, { replacements: { newDept: move_to_department_id, oldDept: id } });
    }

    // Xoá phòng ban
    await db.query(`DELETE FROM department WHERE id = :id`, { replacements: { id } });

    res.json({ message: "Xoá phòng ban thành công" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
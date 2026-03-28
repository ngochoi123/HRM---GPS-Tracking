const express = require("express");
const router = express.Router();
const db = require("../config/database");

// =====================================================
// 1. SUMMARY
// =====================================================
router.get("/summary", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(e.id)::int AS total,

        COUNT(a.id) FILTER (
          WHERE a.status IN ('on_time','late','early_leave')
        )::int AS present

      FROM employee e

      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date >= CURRENT_DATE - INTERVAL '1 day'

      WHERE e.status = 'active'
    `);

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 2. DEPARTMENTS (FIX COUNT)
// =====================================================
router.get("/departments", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id AS department_id,
        d.department_name,

        COUNT(DISTINCT e.id)::int AS total,

        COUNT(DISTINCT e.id) FILTER (WHERE a.status = 'on_time')::int AS on_time,
        COUNT(DISTINCT e.id) FILTER (WHERE a.status = 'late')::int AS late,
        COUNT(DISTINCT e.id) FILTER (WHERE a.status = 'early_leave')::int AS early_leave,

        COUNT(DISTINCT e.id) FILTER (
          WHERE a.status = 'absent' OR a.id IS NULL
        )::int AS absent

      FROM department d

      LEFT JOIN position p ON p.department_id = d.id

      LEFT JOIN employee e 
        ON e.position_id = p.id
        AND e.status = 'active'

      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date = CURRENT_DATE

      GROUP BY d.id, d.department_name
      ORDER BY d.department_name
    `);

    res.json(result.rows || []);
  } catch (err) {
    console.error("DEPARTMENTS ERROR:", err);
    res.status(500).json({ error: "Lỗi departments" });
  }
});


// =====================================================
// 3. MANAGERS (OK)
// =====================================================
router.get("/managers", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.department_name,
        COALESCE(e.full_name, 'Chưa có trưởng phòng') AS full_name,
        e.avatar_url,
        COALESCE(a.status, 'absent') AS status

      FROM department d

      LEFT JOIN employee e 
        ON d.manager_id = e.id

      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date = CURRENT_DATE

      ORDER BY d.department_name
    `);

    res.json(result.rows || []);
  } catch (err) {
    console.error("MANAGERS ERROR:", err);
    res.status(500).json({ error: "Lỗi managers" });
  }
});


// =====================================================
// 4. REQUESTS (OK)
// =====================================================
router.get("/requests", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        lr.id,
        e.full_name,
        'leave' AS type,
        lr.created_at
      FROM leave_request lr
      JOIN employee e ON e.id = lr.employee_id
      WHERE lr.status = 'pending'

      UNION ALL

      SELECT 
        ot.id,
        e.full_name,
        'overtime' AS type,
        ot.created_at
      FROM overtime_request ot
      JOIN employee e ON e.id = ot.employee_id
      WHERE ot.status = 'pending'

      ORDER BY created_at DESC
      LIMIT 6
    `);

    res.json(result.rows || []);
  } catch (err) {
    console.error("REQUESTS ERROR:", err);
    res.status(500).json({ error: "Lỗi requests" });
  }
});


// =====================================================
// 5. SALARY (OK)
// =====================================================
router.get("/salary", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(net_salary),0)::float AS total_salary
      FROM payroll
      WHERE month_year = TO_CHAR(CURRENT_DATE, 'MM-YYYY')
    `);

    res.json(result.rows[0] || { total_salary: 0 });
  } catch (err) {
    console.error("SALARY ERROR:", err);
    res.status(500).json({ error: "Lỗi salary" });
  }
});

module.exports = router;
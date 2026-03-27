const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { QueryTypes } = require('sequelize');

router.get("/", async (req, res) => {
  try {
    const branches = await db.query(
      `
      SELECT 
        b.id,
        b.branch_code,
        b.branch_name,
        b.address,

        -- ✅ Đếm phòng ban
        (
          SELECT COUNT(*) 
          FROM department d 
          WHERE d.branch_id = b.id
        )::int AS total_departments,

        -- ✅ Đếm nhân viên
        (
          SELECT COUNT(*) 
          FROM employee e
          JOIN position p ON e.position_id = p.id
          JOIN department d ON p.department_id = d.id
          WHERE d.branch_id = b.id
          AND e.status = 'active'
        )::int AS total_employees

      FROM branch b
      WHERE b.is_active = true
      ORDER BY b.branch_name
      `,
      { type: QueryTypes.SELECT }
    );

    res.json(branches);

  } catch (err) {
    console.error("🔥 BRANCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
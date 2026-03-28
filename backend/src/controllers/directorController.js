const db = require("../config/database");
const { QueryTypes } = require("sequelize");

// ================= DASHBOARD =================
const getSummary = async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
};

const getDepartmentsStats = async (req, res) => {
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
      LEFT JOIN employee e ON e.position_id = p.id AND e.status = 'active'
      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date = CURRENT_DATE
      GROUP BY d.id, d.department_name
      ORDER BY d.department_name
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Lỗi departments stats" });
  }
};

const getManagers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.department_name,
        COALESCE(e.full_name, 'Chưa có trưởng phòng') AS full_name,
        e.avatar_url,
        COALESCE(a.status, 'absent') AS status
      FROM department d
      LEFT JOIN employee e ON d.manager_id = e.id
      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date = CURRENT_DATE
      ORDER BY d.department_name
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Lỗi managers" });
  }
};

const getRequests = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lr.id, e.full_name, 'leave' AS type, lr.created_at
      FROM leave_request lr
      JOIN employee e ON e.id = lr.employee_id
      WHERE lr.status = 'pending'
      UNION ALL
      SELECT ot.id, e.full_name, 'overtime', ot.created_at
      FROM overtime_request ot
      JOIN employee e ON e.id = ot.employee_id
      WHERE ot.status = 'pending'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Lỗi requests" });
  }
};

const getSalary = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COALESCE(SUM(net_salary),0)::float AS total_salary
      FROM payroll
      WHERE month_year = TO_CHAR(CURRENT_DATE, 'MM-YYYY')
    `);
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Lỗi salary" });
  }
};

// ================= DEPARTMENT =================
const getDepartments = async (req, res) => {
  try {
    const data = await db.query(`
      SELECT 
        d.id,
        d.department_code,
        d.department_name,
        d.description,
        d.is_active,
        b.branch_name,
        e.full_name AS manager_name,
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
      ORDER BY d.department_name
    `, { type: QueryTypes.SELECT });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const data = await db.query(`
      SELECT 
        d.id,
        d.department_code,
        d.department_name,
        d.description,
        d.is_active,
        d.branch_id,
        d.manager_id,
        b.branch_name,
        e.full_name AS manager_name,
        e.work_email AS manager_email,
        e.phone_number AS manager_phone,
        COALESCE(emp_count.total, 0) AS total_employees
      FROM department d
      LEFT JOIN branch b ON d.branch_id = b.id
      LEFT JOIN employee e ON d.manager_id = e.id
      LEFT JOIN (
        SELECT 
          p.department_id, 
          COUNT(emp.id) AS total
        FROM employee emp
        LEFT JOIN position p ON emp.position_id = p.id
        GROUP BY p.department_id
      ) emp_count 
      ON emp_count.department_id = d.id
      WHERE d.id = :id
    `, {
      replacements: { id: req.params.id },
      type: QueryTypes.SELECT
    });

    res.json(data[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmployeesByDepartment = async (req, res) => {
  try {
    const data = await db.query(`
      SELECT 
        emp.id,
        emp.employee_code,
        emp.full_name,
        emp.work_email,
        emp.personal_email,
        emp.status,
        emp.avatar_url,
        p.position_name
      FROM employee emp
      INNER JOIN position p ON emp.position_id = p.id
      WHERE p.department_id = :id
      ORDER BY emp.full_name
    `, {
      replacements: { id: req.params.id },
      type: QueryTypes.SELECT
    });

    res.json(data);

  } catch (err) {
    console.error("🔥 getEmployeesByDepartment error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================= DEPARTMENT CRUD =================
const createDepartment = async (req, res) => {
  try {
    const {
      department_name,
      department_code,
      description,
      branch_id,
      manager_id,
      is_active
    } = req.body;

    const code = department_code || `PB_${Date.now()}`;

    const data = await db.query(`
      INSERT INTO department (
        department_name,
        department_code,
        description,
        branch_id,
        manager_id,
        is_active
      )
      VALUES (
        :department_name,
        :department_code,
        :description,
        :branch_id,
        :manager_id,
        :is_active
      )
      RETURNING *
    `, {
      replacements: {
        department_name,
        department_code: code,
        description: description || null,
        branch_id: branch_id || null,
        manager_id: manager_id || null,
        is_active: is_active ?? true
      },
      type: QueryTypes.INSERT
    });

    res.json(data[0]);

  } catch (err) {
    console.error("🔥 CREATE DEPARTMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const {
      department_name,
      department_code,
      description,
      branch_id,
      manager_id,
      is_active
    } = req.body;

    await db.query(`
      UPDATE department
      SET 
        department_name = :department_name,
        department_code = :department_code,
        description = :description,
        branch_id = :branch_id,
        manager_id = :manager_id,
        is_active = :is_active
      WHERE id = :id
    `, {
      replacements: {
        id: req.params.id,
        department_name,
        department_code,
        description,
        branch_id,
        manager_id,
        is_active
      }
    });

    res.json({ message: "Updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteDepartment = async (req, res) => {
  const transaction = await db.transaction();

  try {

    const move_to_department_id =
      req.body?.move_to_department_id ||
      req.body?.moveDepartmentId ||
      null;

    const departmentId = req.params.id;

    if (move_to_department_id == departmentId) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Không thể chuyển sang chính phòng ban này"
      });
    }

    const department = await db.query(`
      SELECT id FROM department WHERE id = :id
    `, {
      replacements: { id: departmentId },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!department.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Phòng ban không tồn tại" });
    }

    const employees = await db.query(`
      SELECT COUNT(*)::int as total
      FROM employee emp
      JOIN position p ON emp.position_id = p.id
      WHERE p.department_id = :id
    `, {
      replacements: { id: departmentId },
      type: QueryTypes.SELECT,
      transaction
    });

    if (employees[0].total > 0 && !move_to_department_id) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Phòng ban còn nhân sự, cần chọn phòng ban chuyển"
      });
    }

    if (employees[0].total > 0 && move_to_department_id) {

      let newPosition = await db.query(`
        SELECT id
        FROM position
        WHERE department_id = :dept
        LIMIT 1
      `, {
        replacements: { dept: move_to_department_id },
        type: QueryTypes.SELECT,
        transaction
      });

      let positionId;

      if (!newPosition.length) {

        const position_code = `NV_${Date.now()}`;

        const createdPosition = await db.query(`
          INSERT INTO position (
            position_code,
            position_name,
            department_id,
            level,
            base_salary_min
          )
          VALUES (
            :position_code,
            'Nhân viên',
            :dept,
            'junior',
            0
          )
          RETURNING id
        `, {
          replacements: { 
            dept: move_to_department_id,
            position_code
          },
          type: QueryTypes.INSERT,
          transaction
        });

        positionId = createdPosition[0][0].id;

      } else {
        positionId = newPosition[0].id;
      }

      await db.query(`
        UPDATE employee
        SET position_id = :positionId
        WHERE position_id IN (
          SELECT id FROM position WHERE department_id = :oldDept
        )
      `, {
        replacements: {
          positionId,
          oldDept: departmentId
        },
        transaction
      });
    }

    await db.query(`
      DELETE FROM department WHERE id = :id
    `, {
      replacements: { id: departmentId },
      transaction
    });

    await transaction.commit();

    res.json({ message: "Xoá phòng ban thành công" });

  } catch (err) {
    await transaction.rollback();
    console.error("DELETE DEPARTMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================= BRANCH CRUD =================
const getBranches = async (req, res) => {
  try {
    const data = await db.query(`
      SELECT 
        b.id,
        b.branch_code,
        b.branch_name,
        b.province,
        b.address,
        b.hotline,
        b.email,
        b.description,
        b.is_active,
        (
          SELECT COUNT(*) FROM department d WHERE d.branch_id = b.id
        )::int AS total_departments,
        (
          SELECT COUNT(*) 
          FROM employee e
          JOIN position p ON e.position_id = p.id
          JOIN department d ON p.department_id = d.id
          WHERE d.branch_id = b.id
        )::int AS total_employees
      FROM branch b
      ORDER BY b.branch_name
    `, { type: QueryTypes.SELECT });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBranchById = async (req, res) => {
    const { id } = req.params;
  
    try {
      // 1. Thông tin chi nhánh + trưởng chi nhánh
      const branchQuery = `
        SELECT 
          b.id,
          b.branch_code,
          b.branch_name,
          b.address,
          b.province,
          b.hotline,
          b.email,
          b.description,
          b.is_active,
          e.id AS manager_id,
          e.full_name AS manager_name,
          e.work_email AS manager_email,
          e.phone_number AS manager_phone
        FROM branch b
        LEFT JOIN employee e ON e.id = (
          SELECT manager_id FROM department WHERE branch_id = b.id LIMIT 1
        )
        WHERE b.id = :branchId
        LIMIT 1
      `;
      const branchRes = await db.query(branchQuery, {
        type: QueryTypes.SELECT,
        replacements: { branchId: id }
      });
  
      if (!branchRes.length) return res.status(404).json({ message: "Chi nhánh không tồn tại" });
  
      const branch = branchRes[0];
  
      // 2. Danh sách phòng ban
      const departmentsQuery = `
        SELECT 
          d.id,
          d.department_code,
          d.department_name,
          d.is_active,
          e.id AS manager_id,
          e.full_name AS manager_name,
          COALESCE(emp_count.total, 0)::int AS total_employees
        FROM department d
        LEFT JOIN employee e ON d.manager_id = e.id
        LEFT JOIN (
          SELECT p.department_id, COUNT(emp.id) AS total
          FROM employee emp
          LEFT JOIN position p ON emp.position_id = p.id
          GROUP BY p.department_id
        ) emp_count ON emp_count.department_id = d.id
        WHERE d.branch_id = :branchId
        ORDER BY d.created_at
      `;
      const departments = await db.query(departmentsQuery, {
        type: QueryTypes.SELECT,
        replacements: { branchId: id }
      });
  
      branch.departments = departments;
  
      // 3. Tổng số phòng ban & nhân sự
      const totalsQuery = `
        SELECT
          COUNT(DISTINCT d.id) AS total_departments,
          COUNT(DISTINCT e.id) AS total_employees
        FROM department d
        LEFT JOIN employee e ON e.position_id IN (
          SELECT id FROM position WHERE department_id = d.id
        )
        WHERE d.branch_id = :branchId
      `;
      const totals = await db.query(totalsQuery, {
        type: QueryTypes.SELECT,
        replacements: { branchId: id }
      });
  
      branch.total_departments = totals[0].total_departments || 0;
      branch.total_employees = totals[0].total_employees || 0;
  
      return res.json(branch);
  
    } catch (err) {
      console.error("🔥 Lỗi getBranchById:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  };
  

const createBranch = async (req, res) => {
    try {
      const {
        branch_name,
        branch_code,
        province,
        address,
        hotline,
        email,
        description,
        is_active
      } = req.body;
  
      if (!branch_name?.trim()) {
        return res.status(400).json({ message: "Tên chi nhánh không được để trống" });
      }
  
      const code = branch_code || `BR_${Date.now()}`;
  
      const data = await db.query(
        `INSERT INTO branch (
          branch_name,
          branch_code,
          province,
          address,
          hotline,
          email,
          description,
          is_active
        ) VALUES (
          :branch_name,
          :branch_code,
          :province,
          :address,
          :hotline,
          :email,
          :description,
          :is_active
        ) RETURNING *`,
        {
          replacements: {
            branch_name,
            branch_code: code,
            province: province || null,
            address: address || null,
            hotline: hotline || null,
            email: email || null,
            description: description || null,
            is_active: is_active ?? true
          },
          type: QueryTypes.INSERT
        }
      );
  
      // data[0][0] là object branch mới
      res.json(data[0][0]);
    } catch (err) {
      console.error("🔥 CREATE BRANCH ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  };
  

const getBranchManagerCandidates = async (req, res) => {
  try {
    const branchId = req.params.id;
    const rows = await db.query(
      `
      SELECT DISTINCT e.id, e.full_name, e.employee_code
      FROM employee e
      INNER JOIN position p ON e.position_id = p.id
      INNER JOIN department d ON p.department_id = d.id
      WHERE d.branch_id = :branchId AND e.status = 'active'
      ORDER BY e.full_name
      `,
      { replacements: { branchId }, type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    console.error("🔥 getBranchManagerCandidates:", err);
    res.status(500).json({ message: err.message });
  }
};

const updateBranch = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const {
      branch_name,
      branch_code,
      province,
      address,
      hotline,
      email,
      description,
      is_active,
      manager_id
    } = req.body;

    const branchId = req.params.id;

    const exists = await db.query(`SELECT id FROM branch WHERE id = :id`, {
      replacements: { id: branchId },
      type: QueryTypes.SELECT,
      transaction
    });
    if (!exists.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Chi nhánh không tồn tại" });
    }

    await db.query(
      `
      UPDATE branch
      SET 
        branch_name = :branch_name,
        branch_code = :branch_code,
        province = :province,
        address = :address,
        hotline = :hotline,
        email = :email,
        description = :description,
        is_active = :is_active
      WHERE id = :id
    `,
      {
        replacements: {
          id: branchId,
          branch_name,
          branch_code,
          province,
          address,
          hotline,
          email,
          description,
          is_active
        },
        transaction
      }
    );

    if (manager_id !== undefined) {
      const firstDept = await db.query(
        `
        SELECT id FROM department
        WHERE branch_id = :branchId
        ORDER BY created_at ASC NULLS LAST, id ASC
        LIMIT 1
      `,
        {
          replacements: { branchId },
          type: QueryTypes.SELECT,
          transaction
        }
      );
      if (firstDept.length) {
        const mid = manager_id === "" || manager_id === null ? null : manager_id;
        await db.query(
          `UPDATE department SET manager_id = :manager_id WHERE id = :dept_id`,
          {
            replacements: { manager_id: mid, dept_id: firstDept[0].id },
            transaction
          }
        );
      }
    }

    await transaction.commit();
    res.json({ message: "Cập nhật chi nhánh thành công" });
  } catch (err) {
    await transaction.rollback();
    console.error("🔥 UPDATE BRANCH ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

const deleteBranch = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const branchId = req.params.id;
    const confirm_code = req.body?.confirm_code ?? req.body?.confirmCode ?? "";
    const move_to_branch_id =
      req.body?.move_to_branch_id ??
      req.body?.moveToBranchId ??
      null;

    const branchRows = await db.query(
      `
      SELECT id, branch_code, branch_name
      FROM branch WHERE id = :id
    `,
      {
        replacements: { id: branchId },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!branchRows.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Chi nhánh không tồn tại" });
    }

    const expectedCode = String(branchRows[0].branch_code || "").trim();
    const got = String(confirm_code || "").trim();
    if (!got || expectedCode.toLowerCase() !== got.toLowerCase()) {
      await transaction.rollback();
      return res.status(400).json({ message: "Mã xác nhận không khớp với mã chi nhánh" });
    }

    const empCountRows = await db.query(
      `
      SELECT COUNT(DISTINCT e.id)::int AS total
      FROM employee e
      INNER JOIN position p ON e.position_id = p.id
      INNER JOIN department d ON p.department_id = d.id
      WHERE d.branch_id = :branchId
    `,
      {
        replacements: { branchId },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const totalEmployees = empCountRows[0]?.total ?? 0;

    if (totalEmployees > 0) {
      const tid = move_to_branch_id != null ? String(move_to_branch_id) : "";
      if (!tid) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Chi nhánh còn nhân sự — vui lòng chọn chi nhánh tiếp nhận"
        });
      }
      if (tid === String(branchId)) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Không thể chuyển nhân sự sang chính chi nhánh này"
        });
      }

      const target = await db.query(
        `SELECT id FROM branch WHERE id = :id`,
        {
          replacements: { id: tid },
          type: QueryTypes.SELECT,
          transaction
        }
      );
      if (!target.length) {
        await transaction.rollback();
        return res.status(400).json({ message: "Chi nhánh tiếp nhận không tồn tại" });
      }

      let deptRows = await db.query(
        `
        SELECT id FROM department
        WHERE branch_id = :bid
        ORDER BY id ASC
        LIMIT 1
      `,
        {
          replacements: { bid: tid },
          type: QueryTypes.SELECT,
          transaction
        }
      );

      let targetDeptId;
      if (!deptRows.length) {
        const deptCode = `PB_TX_${Date.now()}`;
        const insDept = await db.query(
          `
          INSERT INTO department (
            department_code,
            department_name,
            branch_id,
            is_active
          )
          VALUES (
            :department_code,
            'Tiếp nhận nhân sự',
            :branch_id,
            true
          )
          RETURNING id
        `,
          {
            replacements: {
              department_code: deptCode,
              branch_id: tid
            },
            type: QueryTypes.INSERT,
            transaction
          }
        );
        targetDeptId = insDept[0][0].id;
      } else {
        targetDeptId = deptRows[0].id;
      }

      let posRows = await db.query(
        `
        SELECT id FROM position
        WHERE department_id = :dept
        LIMIT 1
      `,
        {
          replacements: { dept: targetDeptId },
          type: QueryTypes.SELECT,
          transaction
        }
      );

      let targetPositionId;
      if (!posRows.length) {
        const position_code = `VT_${Date.now()}`;
        const insPos = await db.query(
          `
          INSERT INTO position (
            position_code,
            position_name,
            department_id,
            level,
            base_salary_min
          )
          VALUES (
            :position_code,
            'Nhân viên',
            :dept,
            'junior',
            0
          )
          RETURNING id
        `,
          {
            replacements: {
              position_code,
              dept: targetDeptId
            },
            type: QueryTypes.INSERT,
            transaction
          }
        );
        targetPositionId = insPos[0][0].id;
      } else {
        targetPositionId = posRows[0].id;
      }

      await db.query(
        `
        UPDATE employee e
        SET position_id = :newPos
        WHERE e.id IN (
          SELECT DISTINCT e2.id
          FROM employee e2
          INNER JOIN position p2 ON e2.position_id = p2.id
          INNER JOIN department d2 ON p2.department_id = d2.id
          WHERE d2.branch_id = :sourceBranch
        )
      `,
        {
          replacements: {
            newPos: targetPositionId,
            sourceBranch: branchId
          },
          transaction
        }
      );
    }

    await db.query(
      `DELETE FROM department WHERE branch_id = :id`,
      {
        replacements: { id: branchId },
        transaction
      }
    );

    await db.query(
      `DELETE FROM branch WHERE id = :id`,
      {
        replacements: { id: branchId },
        transaction
      }
    );

    await transaction.commit();
    res.json({ message: "Xoá chi nhánh thành công" });
  } catch (err) {
    await transaction.rollback();
    console.error("🔥 DELETE BRANCH ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================= EXPORT =================
module.exports = {
  getSummary,
  getDepartmentsStats,
  getManagers,
  getRequests,
  getSalary,
  getDepartments,
  getDepartmentById,
  getEmployeesByDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getBranches,
  getBranchById,
  getBranchManagerCandidates,
  createBranch,
  updateBranch,
  deleteBranch
};
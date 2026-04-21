const db = require("../config/database");
const { QueryTypes } = require("sequelize");

// ================= DASHBOARD =================
const getSummary = async (req, res) => {
  try {
    const { role, department_id } = req.user;
    let whereClause = "WHERE e.status = 'active'";
    let replacements = {};

    if (role === 'MANAGER') {
      whereClause += ' AND p.department_id = :deptId';
      replacements.deptId = department_id;
    }

    const result = await db.query(`
      SELECT 
        COUNT(e.id)::int AS total,
        COUNT(a.id) FILTER (
          WHERE a.status IN ('on_time','late','early_leave')
        )::int AS present
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN attendance a 
        ON a.employee_id = e.id
        AND a.attendance_date = CURRENT_DATE
      ${whereClause}
    `, { replacements, type: QueryTypes.SELECT });
    
    res.json(result[0] || { total: 0, present: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDepartmentsStats = async (req, res) => {
  try {
    const { role, department_id } = req.user;
    let scopingClause = "";
    let replacements = {};

    if (role === 'MANAGER') {
      scopingClause = 'WHERE d.id = :deptId';
      replacements.deptId = department_id;
    }

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
      ${scopingClause}
      GROUP BY d.id, d.department_name
      ORDER BY d.department_name
    `, { replacements, type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) {
    console.error("error getDepartmentsStats:", err);
    res.status(500).json({ error: "Lỗi departments stats" });
  }
};

const getManagers = async (req, res) => {
  try {
    const { role, department_id } = req.user;

    // Quản lý chỉ xem được trưởng phòng của mình (chính họ)
    if (role === 'MANAGER' && !department_id) {
       return res.json([]);
    }

    const whereClause = role === 'MANAGER' ? 'WHERE d.id = :deptId' : 'WHERE 1=1';

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
      ${whereClause}
      ORDER BY d.department_name
    `, { replacements: { deptId: department_id }, type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) {
    console.error("error getManagers:", err);
    res.status(500).json({ error: "Lỗi managers" });
  }
};

const getRequests = async (req, res) => {
  try {
    const { role, department_id } = req.user;

    // Scoping query for requests
    const scopingClause = role === 'MANAGER' 
      ? 'AND EXISTS (SELECT 1 FROM employee emp JOIN position p ON emp.position_id = p.id WHERE emp.id = lr.employee_id AND p.department_id = :deptId)'
      : 'AND EXISTS (SELECT 1 FROM employee appr JOIN position ap ON appr.position_id = ap.id WHERE appr.id = lr.approver_id AND ap.level = \'director\')';

    const scopingClauseOT = role === 'MANAGER' 
      ? 'AND EXISTS (SELECT 1 FROM employee emp JOIN position p ON emp.position_id = p.id WHERE emp.id = ot.employee_id AND p.department_id = :deptId)'
      : 'AND EXISTS (SELECT 1 FROM employee appr JOIN position ap ON appr.position_id = ap.id WHERE appr.id = ot.approver_id AND ap.level = \'director\')';

    const result = await db.query(`
      SELECT lr.id, e.full_name, 'leave' AS type, lr.created_at
      FROM leave_request lr
      JOIN employee e ON e.id = lr.employee_id
      WHERE lr.status = 'pending' ${scopingClause}
      UNION ALL
      SELECT ot.id, e.full_name, 'overtime', ot.created_at
      FROM overtime_request ot
      JOIN employee e ON e.id = ot.employee_id
      WHERE ot.status = 'pending' ${scopingClauseOT}
      ORDER BY created_at DESC
      LIMIT 6
    `, { replacements: { deptId: department_id }, type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) {
    console.error("error getRequests:", err);
    res.status(500).json({ error: "Lỗi requests" });
  }
};

const getSalary = async (req, res) => {
  try {
    const { role } = req.user;
    if (role === 'MANAGER') {
      return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối: Quản lý không có quyền xem thống kê lương." });
    }

    const result = await db.query(`
      SELECT COALESCE(SUM(net_salary),0)::float AS total_salary
      FROM payroll
      WHERE month_year = TO_CHAR(CURRENT_DATE, 'MM-YYYY')
        AND status = 'approved'
    `, { type: db.QueryTypes.SELECT });
    res.json(result[0] || { total_salary: 0 });
  } catch (err) {
    console.error("error getSalary:", err);
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

const checkDepartmentManager = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `SELECT e.id, e.full_name 
       FROM department d
       JOIN employee e ON d.manager_id = e.id
       WHERE d.id = :id AND d.manager_id IS NOT NULL`,
      { replacements: { id }, type: db.QueryTypes.SELECT }
    );

    if (result) {
      return res.json({ hasManager: true, managerName: result.full_name });
    }
    res.json({ hasManager: false });
  } catch (err) {
    console.error("Error checkDepartmentManager:", err);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra trưởng phòng" });
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

// API lấy danh sách Phòng ban, Chức vụ và Quản lý để đưa vào Combobox (cho Giám đốc)
const getFormOptions = async (req, res) => {
  try {
    const departments = await db.query(
      "SELECT id, department_name FROM department ORDER BY department_name", 
      { type: QueryTypes.SELECT }
    );

    const positions = await db.query(
      "SELECT id, position_name, department_id FROM position ORDER BY position_name", 
      { type: QueryTypes.SELECT }
    );

    const managers = await db.query(
      `SELECT e.id, e.full_name, p.department_id 
       FROM employee e
       LEFT JOIN position p ON e.position_id = p.id
       WHERE e.status = 'active' 
       ORDER BY e.full_name`, 
      { type: QueryTypes.SELECT }
    );

    res.status(200).json({ departments, positions, managers });
  } catch (error) {
    console.error('Lỗi API getFormOptions:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải dữ liệu form' });
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

    // ✅ Validation: 1 Manager / 1 Department
    if (manager_id) {
      const [existingManager] = await db.query(
        `SELECT id, department_name FROM department WHERE manager_id = :manager_id`,
        { replacements: { manager_id }, type: QueryTypes.SELECT }
      );
      if (existingManager) {
        return res.status(400).json({ 
          success: false, 
          message: `Nhân viên này đang là quản lý của phòng ban: ${existingManager.department_name}` 
        });
      }
    }

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
    const { id } = req.params;
    const {
      department_name,
      department_code,
      description,
      branch_id,
      manager_id,
      is_active
    } = req.body;

    // ✅ Validation: 1 Manager / 1 Department
    if (manager_id) {
      const [existingManager] = await db.query(
        `SELECT id, department_name FROM department WHERE manager_id = :manager_id AND id != :id`,
        { replacements: { manager_id, id }, type: QueryTypes.SELECT }
      );
      if (existingManager) {
        return res.status(400).json({ 
          success: false, 
          message: `Nhân viên này đang là quản lý của phòng ban khác: ${existingManager.department_name}` 
        });
      }
    }

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
  const { id: branchId } = req.params;
  const { transfer_to_branch_id } = req.body;

  // Bước 1: Validate dữ liệu đầu vào (Early Return)
  if (!branchId) {
    return res.status(400).json({ success: false, message: "Thiếu ID chi nhánh cần xóa!" });
  }

  const transaction = await db.transaction();

  try {
    // Bước 2: Truy vấn Database - Kiểm tra nhân sự trực thuộc
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM location_assignment la
      JOIN work_location wl ON la.work_location_id = wl.id
      WHERE wl.branch_id = :branchId
    `;
    const [result] = await db.query(checkQuery, { replacements: { branchId }, transaction });
    const affectedEmployees = parseInt(result[0].count, 10);

    // Bước 3: Logic nghiệp vụ (Guard Clauses)
    if (affectedEmployees > 0) {
      if (!transfer_to_branch_id) {
        await transaction.rollback(); // Hủy DB ngay lập tức
        return res.status(400).json({ 
          success: false, 
          requires_transfer: true,
          affected_count: affectedEmployees,
          message: `Chi nhánh đang có ${affectedEmployees} nhân sự. Vui lòng chọn chi nhánh tiếp nhận!` 
        });
      }

      // Thực hiện dời nhân sự sang nơi mới
      await db.query(`
        UPDATE work_location 
        SET branch_id = :transferTo 
        WHERE branch_id = :oldBranchId
      `, { 
        replacements: { transferTo: transfer_to_branch_id, oldBranchId: branchId },
        transaction 
      });
    }

    // Bước 4: Xóa chi nhánh (khi đã trống)
    await db.query(`DELETE FROM branch WHERE id = :branchId`, {
      replacements: { branchId },
      transaction
    });

    // Bước 5: Chốt giao dịch (Mọi thay đổi trên DB được lưu vĩnh viễn)
    await transaction.commit();

    // Bước 6: Các tác vụ phụ (Side Effects) - Tách biệt hoàn toàn khỏi DB
    try {
      emitAdminLocationsUpdated(req);
    } catch (socketErr) {
      console.warn("[Socket Warning] Lỗi cập nhật realtime:", socketErr.message);
    }

    // Bước 7: Trả về kết quả cho Frontend
    return res.status(200).json({ 
      success: true, 
      message: affectedEmployees > 0 
        ? `Đã chuyển ${affectedEmployees} nhân sự và xóa chi nhánh thành công!` 
        : `Đã xóa chi nhánh thành công!` 
    });

  } catch (error) {
    // KỸ THUẬT SẠCH NHẤT: Khai thác thuộc tính native của Sequelize
    // Chỉ rollback nếu giao dịch chưa có trạng thái 'commit' hoặc 'rollback'
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error("[deleteBranch] LỖI XÓA CHI NHÁNH:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống khi xóa: " + error.message });
  }
};
const getPositions = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.position_code, 
        p.position_name, 
        p.level, 
        p.base_salary_min, -- 👉 Đã thêm cột lương
        d.department_name,
        COUNT(e.id) AS employee_count
      FROM position p
      LEFT JOIN department d ON p.department_id = d.id
      -- Chỉ đếm những nhân viên đang active
      LEFT JOIN employee e ON p.id = e.position_id AND e.status = 'active'
      GROUP BY p.id, p.position_code, p.position_name, p.level, p.base_salary_min, d.department_name
      ORDER BY p.position_code ASC;
    `;

    const positions = await db.query(query, {
      type: db.QueryTypes.SELECT
    });

    // Format lại dữ liệu cho FrontEnd
    const formattedData = positions.map(pos => ({
      id: pos.id,
      code: pos.position_code,
      name: pos.position_name,
      department: pos.department_name || 'Chưa phân bổ',
      level: pos.level,
      baseSalaryMin: pos.base_salary_min || 0, // 👉 Bơm lương xuống FE
      employeeCount: parseInt(pos.employee_count, 10) || 0
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Lỗi API getPositions:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách chức vụ' });
  }
};
// Thêm chức vụ mới
const createPosition = async (req, res) => {
  try {

    const { position_code, position_name, department_id, level, base_salary_min } = req.body;

    // ✅ Validate level
    const validLevels = [
      'intern','fresher','junior','middle','senior','manager','director'
    ];

    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Level không hợp lệ!"
      });
    }

    // 🔥 Check trùng
    const exists = await db.query(`
      SELECT id FROM position 
      WHERE position_code = :code OR position_name = :name
    `, {
      replacements: {
        code: position_code,
        name: position_name
      },
      type: QueryTypes.SELECT
    });

    if (exists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mã hoặc tên chức vụ đã tồn tại!"
      });
    }

    // ✅ Insert
    await db.query(`
      INSERT INTO position (position_code, position_name, department_id, level, base_salary_min)
      VALUES (:position_code, :position_name, :department_id, :level, :base_salary_min)
    `, {
      replacements: {
        position_code,
        position_name,
        department_id: department_id || null,
        level,
        base_salary_min: base_salary_min || 0
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({ success: true, message: 'Thêm chức vụ thành công!' });

  } catch (error) {
    console.error('Lỗi API createPosition:', error);

    if (error.original && error.original.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Mã chức vụ này đã tồn tại!'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi Server khi thêm chức vụ'
    });
  }
};

// Cập nhật chức vụ
const updatePosition = async (req, res) => {
  try {
    // ✅ Lấy dữ liệu trước
    const { id } = req.params;
    const { position_code, position_name, department_id, level, base_salary_min } = req.body;

    // ✅ Validate level
    const validLevels = [
      'intern','fresher','junior','middle','senior','manager','director'
    ];

    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Level không hợp lệ!"
      });
    }

    // 🔥 Check trùng (trừ chính nó)
    const exists = await db.query(`
      SELECT id FROM position 
      WHERE (position_code = :code OR position_name = :name)
      AND id != :id
    `, {
      replacements: {
        id,
        code: position_code,
        name: position_name
      },
      type: QueryTypes.SELECT
    });

    if (exists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mã hoặc tên chức vụ đã tồn tại!"
      });
    }

    // ✅ Update
    await db.query(`
      UPDATE position 
      SET position_code = :position_code,
          position_name = :position_name,
          department_id = :department_id,
          level = :level,
          base_salary_min = :base_salary_min
      WHERE id = :id
    `, {
      replacements: {
        id,
        position_code,
        position_name,
        department_id: department_id || null,
        level,
        base_salary_min: base_salary_min || 0
      },
      type: QueryTypes.UPDATE
    });

    res.status(200).json({ success: true, message: 'Cập nhật chức vụ thành công!' });

  } catch (error) {
    console.error('Lỗi API updatePosition:', error);

    if (error.original && error.original.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Mã chức vụ này đã bị trùng với chức vụ khác!'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi Server khi cập nhật chức vụ'
    });
  }
};

// Xóa chức vụ
const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM position WHERE id = :id", {
      replacements: { id },
      type: db.QueryTypes.DELETE
    });
    res.status(200).json({ success: true, message: 'Xóa chức vụ thành công!' });
  } catch (error) {
    console.error('Lỗi API deletePosition:', error);
    // Lỗi 23503 là lỗi Khóa ngoại (đang có nhân viên giữ chức vụ này)
    if (error.original && error.original.code === '23503') {
      return res.status(400).json({ success: false, message: 'Không thể xóa! Đang có nhân viên giữ chức vụ này.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi xóa chức vụ' });
  }
};
// ==========================================
// QUẢN LÝ HỢP ĐỒNG LAO ĐỘNG
// ==========================================

const getContracts = async (req, res) => {
  try {
    const { role } = req.user;
    if (role === 'MANAGER') {
      return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối: Quản lý không có quyền xem thống kê hợp đồng." });
    }

    const query = `
      SELECT 
        c.id, 
        c.contract_number, 
        c.contract_type, 
        c.start_date, 
        c.end_date, 
        c.base_salary,
        c.allowances,
        c.is_active,
        e.id AS employee_id,
        e.full_name AS employee_name, 
        p.position_name,
        d.department_name,
        b.branch_name
      FROM contract c
      JOIN employee e ON c.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      LEFT JOIN branch b ON d.branch_id = b.id
      ORDER BY c.created_at DESC;
    `;

    const contracts = await db.query(query, { type: db.QueryTypes.SELECT });

    // Format dữ liệu trước khi trả về FE
    const formattedData = contracts.map(c => {
      let status = 'active';
      let daysLeft = null;

      if (!c.is_active) {
        status = 'terminated'; 
      } else if (c.end_date) {
        const endDate = new Date(c.end_date);
        const now = new Date();
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) status = 'expired'; 
        else if (diffDays <= 30) {
          status = 'expiring_soon'; 
          daysLeft = diffDays;
        }
      }

      const typeMap = {
        'probation': 'Thử việc',
        'fixed_1y': 'Xác định TH (1 năm)',
        'fixed_3y': 'Xác định TH (3 năm)',
        'indefinite': 'Vô thời hạn'
      };

      return {
        id: c.id,
        contractNumber: c.contract_number,
        employeeName: c.employee_name,
        positionName: c.position_name || 'Chưa cập nhật',
        typeCode: c.contract_type,
        typeName: typeMap[c.contract_type] || 'Khác',
        startDate: c.start_date,
        endDate: c.end_date,
        status: status,
        daysLeft: daysLeft,
        isActive: c.is_active,
        baseSalary: c.base_salary, // 👉 Gửi xuống FE để form Edit đọc
        allowances: c.allowances || [], // 👉 Gửi xuống FE để form Edit đọc
        departmentName: c.department_name || 'Chưa phân bổ',
        branchName: c.branch_name || 'Hệ thống'
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Lỗi API getContracts:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải hợp đồng' });
  }
};


// 1. Lấy danh sách Nhân viên (Chưa có HĐ active) và Chức vụ cho Combobox
const getContractFormOptions = async (req, res) => {
  try {
    // Lấy nhân viên kèm ID chức vụ, phòng ban, chi nhánh
    // CHỈ lấy những người chưa có hợp đồng đang có hiệu lực (is_active = true)
    const employees = await db.query(`
      SELECT 
        e.id, 
        e.full_name, 
        e.employee_code, 
        e.position_id,
        p.department_id,
        d.branch_id
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM contract c 
        WHERE c.employee_id = e.id AND c.is_active = true
      )
      ORDER BY e.full_name ASC
    `, { type: db.QueryTypes.SELECT });
    
    // Lấy danh sách chức vụ kèm mức lương sàn
    const positions = await db.query(`
      SELECT id, position_name, base_salary_min 
      FROM position 
      ORDER BY position_name ASC
    `, { type: db.QueryTypes.SELECT });

    // Lấy danh sách chi nhánh để hiển thị bộ lọc trên FE
    const branches = await db.query(`
      SELECT id, branch_name FROM branch WHERE is_active = true ORDER BY branch_name ASC
    `, { type: db.QueryTypes.SELECT });

    // Lấy danh sách phòng ban để hiển thị bộ lọc trên FE
    const departments = await db.query(`
      SELECT id, department_name, branch_id FROM department WHERE is_active = true ORDER BY department_name ASC
    `, { type: db.QueryTypes.SELECT });

    res.status(200).json({ employees, positions, branches, departments });
  } catch (error) {
    console.error('Lỗi getContractFormOptions:', error);
    res.status(500).json({ message: 'Lỗi Server' });
  }
};

// 2. Tạo hợp đồng mới (Có cập nhật chức vụ cho nhân viên)
const createContract = async (req, res) => {
  const t = await db.transaction();
  try {
    const { employee_id, position_id, contract_type, start_date, end_date, basic_salary, allowances } = req.body;
    
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const contract_number = `HD-${new Date().getFullYear()}-${randomSuffix}`;

    // 👉 Ép kiểu CAST(:allowances AS JSONB) để Postgres hiểu đây là mảng động
    const insertQuery = `
      INSERT INTO contract (contract_number, employee_id, contract_type, start_date, end_date, base_salary, allowances)
      VALUES (:contract_number, :employee_id, :contract_type, :start_date, :end_date, :base_salary, CAST(:allowances AS JSONB))
    `;
    await db.query(insertQuery, {
      replacements: {
        contract_number, employee_id, contract_type, start_date,
        end_date: end_date || null,
        base_salary: basic_salary || 0,
        allowances: JSON.stringify(allowances || []) 
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    if (position_id) {
      await db.query(`UPDATE employee SET position_id = :position_id WHERE id = :employee_id`, {
        replacements: { position_id, employee_id },
        type: db.QueryTypes.UPDATE,
        transaction: t
      });
    }

    await t.commit();
    res.status(201).json({ success: true, message: 'Tạo hợp đồng và cập nhật chức vụ thành công!' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi createContract:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo hợp đồng' });
  }
};

// 3. CẬP NHẬT HỢP ĐỒNG (Bỏ updated_at và ép kiểu JSONB)
const updateContract = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { employee_id, position_id, contract_type, start_date, end_date, basic_salary, allowances } = req.body;

    // 👉 Đã xóa dòng updated_at = NOW() để tránh lỗi DB không có cột này
    const updateQuery = `
      UPDATE contract
      SET contract_type = :contract_type,
          start_date = :start_date,
          end_date = :end_date,
          base_salary = :base_salary,
          allowances = CAST(:allowances AS JSONB)
      WHERE id = :id
    `;
    await db.query(updateQuery, {
      replacements: {
        id, contract_type, start_date,
        end_date: end_date || null,
        base_salary: basic_salary || 0,
        allowances: JSON.stringify(allowances || [])
      },
      type: db.QueryTypes.UPDATE,
      transaction: t
    });

    // Cập nhật chức vụ cho Nhân viên
    if (employee_id && position_id) {
      await db.query(`UPDATE employee SET position_id = :position_id WHERE id = :employee_id`, {
        replacements: { position_id, employee_id },
        type: db.QueryTypes.UPDATE,
        transaction: t
      });
    }

    await t.commit();
    res.status(200).json({ success: true, message: 'Cập nhật hợp đồng thành công!' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi updateContract:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật' });
  }
};

// dashboardController.js
const getDashboardOverview = async (req, res) => {
  try {
    // Thay thế Mục 1, 2, 3, 4 trong getDashboardOverview bằng đoạn này:

    // 1. Tổng nhân sự active
    const [[{ total_emp }]] = await db.query("SELECT COUNT(*)::int as total_emp FROM employee WHERE status = 'active'");
    
    // 2. Hiện diện hôm nay (on_time, late, early_leave)
    const [[{ present_today }]] = await db.query(`
      SELECT COUNT(DISTINCT employee_id)::int as present_today 
      FROM attendance WHERE attendance_date = CURRENT_DATE AND status != 'absent'
    `);

    // 3. Tổng yêu cầu đang pending (các đơn thuộc phạm vi Giám đốc + Bảng lương chờ duyệt)
    const [[{ total_req }]] = await db.query(`
      SELECT (
        (SELECT COUNT(*)::int
          FROM leave_request lr
          WHERE lr.status = 'pending'
            AND EXISTS (
              SELECT 1 FROM employee appr
              JOIN position ap ON appr.position_id = ap.id
              WHERE appr.id = lr.approver_id AND ap.level = 'director'
            )
        ) +
        (SELECT COUNT(*)::int
          FROM overtime_request ot
          WHERE ot.status = 'pending'
            AND EXISTS (
              SELECT 1 FROM employee appr
              JOIN position ap ON appr.position_id = ap.id
              WHERE appr.id = ot.approver_id AND ap.level = 'director'
            )
        ) +
        (SELECT COUNT(*)::int
          FROM attendance_explanation_request aer
          WHERE aer.status = 'pending'
            AND EXISTS (
              SELECT 1 FROM employee appr
              JOIN position ap ON appr.position_id = ap.id
              WHERE appr.id = aer.approver_id AND ap.level = 'director'
            )
        ) +
        (SELECT COUNT(*)::int FROM payroll WHERE status = 'pending_approval')
      ) as total_req
    `);

    // 4. Quỹ lương (Tổng base_salary của nhân viên active - lấy active contract mới nhất)
    // Đã XÓA GROUP BY null và thêm ép kiểu
    const [[{ total_salary }]] = await db.query(`
      SELECT COALESCE(SUM(c.base_salary), 0)::float as total_salary 
      FROM employee e
      JOIN contract c ON e.id = c.employee_id AND c.is_active = true
      WHERE e.status = 'active'
    `);

    // 5. Yêu cầu chờ duyệt (Lấy 8 cái mới nhất)
    const [requests] = await db.query(`
      SELECT lr.id, e.full_name as name, 'leave' as type, lr.created_at
      FROM leave_request lr
      JOIN employee e ON lr.employee_id = e.id
      WHERE lr.status = 'pending'
        AND EXISTS (
          SELECT 1 FROM employee appr
          JOIN position ap ON appr.position_id = ap.id
          WHERE appr.id = lr.approver_id AND ap.level = 'director'
        )
      UNION ALL
      SELECT ot.id, e.full_name as name, 'overtime' as type, ot.created_at
      FROM overtime_request ot
      JOIN employee e ON ot.employee_id = e.id
      WHERE ot.status = 'pending'
        AND EXISTS (
          SELECT 1 FROM employee appr
          JOIN position ap ON appr.position_id = ap.id
          WHERE appr.id = ot.approver_id AND ap.level = 'director'
        )
      UNION ALL
      SELECT aer.id, e.full_name as name, 'explanation' as type, aer.created_at
      FROM attendance_explanation_request aer
      JOIN employee e ON aer.employee_id = e.id
      WHERE aer.status = 'pending'
        AND EXISTS (
          SELECT 1 FROM employee appr
          JOIN position ap ON appr.position_id = ap.id
          WHERE appr.id = aer.approver_id AND ap.level = 'director'
        )
      UNION ALL
      SELECT pr.id, e.full_name as name, 'payroll' as type, pr.created_at
      FROM payroll pr
      JOIN employee e ON pr.employee_id = e.id
      WHERE pr.status = 'pending_approval'
      ORDER BY created_at DESC
      LIMIT 8
    `);

    // 6. Trạng thái Trưởng phòng hôm nay
    const [managers] = await db.query(`
      SELECT e.full_name as name, d.department_name as dept, COALESCE(a.status, 'absent') as status 
      FROM department d
      LEFT JOIN employee e ON d.manager_id = e.id
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = CURRENT_DATE
      WHERE e.id IS NOT NULL
      ORDER BY d.department_name
    `);

    // 7. Thống kê theo phòng ban
    const [departments] = await db.query(`
      SELECT 
        d.department_name as name,
        COUNT(e.id) as total,
        SUM(CASE WHEN a.status = 'on_time' THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'early_leave' THEN 1 ELSE 0 END) as early_leave
      FROM department d
      JOIN "position" p ON d.id = p.department_id
      JOIN employee e ON p.id = e.position_id AND e.status = 'active'
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = CURRENT_DATE
      GROUP BY d.id, d.department_name
    `);

    // Trả về đúng format UI cần
    res.json({
      success: true,
      data: {
        summary: {
          total: total_emp || 0,
          present: present_today || 0,
          salary: total_salary || 0,
          requests: total_req || 0
        },
        departments: (departments || []).map(d => ({
          name: d.name,
          total: d.total || 0,
          on_time: d.on_time || 0,
          late: d.late || 0,
          early_leave: d.early_leave || 0
        })),
        managers: managers || [],
        requests: requests || []
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPersonalNotification = async ({ transaction, employeeId, senderId = null, title, desc, content, notificationType = 'info' }) => {
  const rows = await db.query(
    `
    INSERT INTO notification (
      title,
      content,
      notification_type,
      target,
      "desc",
      status,
      sender_id,
      target_employee_id,
      created_at
    )
    VALUES (:title, :content, :notificationType, 'Cá nhân', :desc, 'Đã gửi', :senderId, :employeeId, NOW())
    RETURNING id
    `,
    {
      replacements: { title, content, notificationType, desc: desc || '', senderId, employeeId },
      type: QueryTypes.SELECT,
      transaction
    }
  );

  const notificationId = rows?.[0]?.id;
  if (!notificationId) {
    throw new Error('Không thể tạo thông báo.');
  }

  await db.query(
    `INSERT INTO notification_recipient (notification_id, employee_id) VALUES (:notificationId, :employeeId)`,
    { replacements: { notificationId, employeeId }, transaction }
  );
};

const createApprovalNotification = async ({ transaction, type, employeeId, employeeName, monthYear, payrollRow, requestRow, isApproved }) => {
  if (type === 'payroll') {
    const title = isApproved ? `Bảng lương ${monthYear} đã được duyệt` : `Bảng lương ${monthYear} bị từ chối`;
    const desc = isApproved ? 'Giám đốc đã duyệt bảng lương của bạn.' : 'Giám đốc đã từ chối bảng lương của bạn.';
    const netSalaryText = Number(payrollRow?.net_salary || 0).toLocaleString('vi-VN');
    const deductionText = Number(payrollRow?.total_deduction || 0).toLocaleString('vi-VN');
    const content = isApproved
      ? `
        <p><strong style="color:#065f46">Bảng lương tháng ${monthYear} của bạn đã được Giám đốc duyệt.</strong></p>
        <div style="margin:10px 0;padding:10px 12px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:10px;">
          <p style="margin:0;"><strong>Thực nhận:</strong> ${netSalaryText} VNĐ</p>
          <p style="margin:8px 0 0;"><strong>Tổng khấu trừ:</strong> ${deductionText} VNĐ</p>
        </div>
      `
      : `
        <p><strong style="color:#b91c1c">Bảng lương tháng ${monthYear} của bạn chưa được duyệt.</strong></p>
        <p>Vui lòng kiểm tra lại thông tin bảng lương hoặc liên hệ bộ phận phụ trách để được hỗ trợ.</p>
      `;

    return createPersonalNotification({
      transaction,
      employeeId,
      senderId: null,
      title,
      desc,
      content,
      notificationType: isApproved ? 'info' : 'warning'
    });
  }

  const isLeave = type === 'leave';
  const isExplanation = type === 'explanation';
  const requestLabel = isLeave ? 'Đơn phép' : isExplanation ? 'Đơn giải trình' : 'Đơn tăng ca';
  const title = isApproved ? `${requestLabel} đã được duyệt` : `${requestLabel} bị từ chối`;
  const desc = isApproved ? 'Yêu cầu của bạn đã được Giám đốc phê duyệt.' : 'Yêu cầu của bạn đã bị Giám đốc từ chối.';
  const rangeLabel = isLeave
    ? `${formatDateTimeVi(requestRow?.start_datetime)} - ${formatDateTimeVi(requestRow?.end_datetime)}`
    : isExplanation
      ? `${formatDateVi(requestRow?.attendance_date)} ${normalizeTimeText(requestRow?.proposed_check_in) || '--:--'} - ${normalizeTimeText(requestRow?.proposed_check_out) || '--:--'}`
      : `${formatDateVi(requestRow?.ot_date)} ${normalizeTimeText(requestRow?.start_time)} - ${normalizeTimeText(requestRow?.end_time)}`.trim();
  const reasonText = requestRow?.reason || 'Không có';
  const tone = isApproved
    ? {
        titleColor: '#065f46',
        border: '#a7f3d0',
        background: '#ecfdf5'
      }
    : {
        titleColor: '#b91c1c',
        border: '#fecaca',
        background: '#fef2f2'
      };
  const content = isApproved
    ? `
      <p style="margin:0 0 8px;"><strong style="color:${tone.titleColor};font-size:18px;">${requestLabel} của bạn đã được chấp thuận.</strong></p>
      <div style="margin:10px 0;padding:12px 14px;border:1px solid ${tone.border};background:${tone.background};border-radius:12px;">
        <p style="margin:0 0 8px;"><strong>Thời gian:</strong> ${rangeLabel}</p>
        <p style="margin:0;"><strong>Lý do trong đơn:</strong> ${reasonText}</p>
      </div>
    `
    : `
      <p style="margin:0 0 8px;"><strong style="color:${tone.titleColor};font-size:18px;">${requestLabel} của bạn đã bị từ chối.</strong></p>
      <div style="margin:10px 0;padding:12px 14px;border:1px solid ${tone.border};background:${tone.background};border-radius:12px;">
        <p style="margin:0 0 8px;"><strong>Thời gian:</strong> ${rangeLabel}</p>
        <p style="margin:0;"><strong>Lý do trong đơn:</strong> ${reasonText}</p>
      </div>
    `;

  return createPersonalNotification({
    transaction,
    employeeId,
    senderId: requestRow?.approver_id || null,
    title,
    desc,
    content,
    notificationType: isApproved ? 'info' : 'warning'
  });
};

const LEAVE_TYPE_LABELS = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
  ot: 'Nghỉ bù (OT)',
  maternity: 'Nghỉ thai sản',
  bereavement: 'Nghỉ tang'
};

const EXPLANATION_TYPE_LABELS = {
  forgot_checkin: 'Quên chấm công vào',
  forgot_checkout: 'Quên chấm công ra',
  system_error: 'Lỗi hệ thống',
  late_arrival: 'Đi muộn',
  early_leave: 'Về sớm'
};

const formatDateTimeVi = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(parsed);
};

const formatDateVi = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(parsed);
};

const normalizeTimeText = (value) => {
  if (!value) return '';
  return String(value).slice(0, 5);
};

const getOvertimeDurationMinutes = (startTime, endTime) => {
  const startText = normalizeTimeText(startTime);
  const endText = normalizeTimeText(endTime);
  if (!startText || !endText) return 0;

  const [startHour = 0, startMinute = 0] = startText.split(':').map(Number);
  const [endHour = 0, endMinute = 0] = endText.split(':').map(Number);

  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) {
    return 0;
  }

  let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  return totalMinutes;
};

const formatOvertimeDurationLabel = (startTime, endTime) => {
  const totalMinutes = getOvertimeDurationMinutes(startTime, endTime);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours} giờ ${minutes} phút`;
  if (hours) return `${hours} giờ`;
  if (minutes) return `${minutes} phút`;
  return '0 phút';
};

const getLeaveDurationDays = (startDateTime, endDateTime) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(Number(diffDays.toFixed(2)), 0);
};

const getPayrollApprovalRows = async (transaction = null) => db.query(
  `
  SELECT pr.id, pr.employee_id, pr.month_year, pr.status, pr.net_salary, pr.base_salary_snapshot, pr.total_work_days, pr.total_allowance, pr.total_deduction,
         pr.created_at,
         e.employee_code, e.full_name, d.id AS department_id, d.department_name, p.position_name
  FROM payroll pr
  JOIN employee e ON pr.employee_id = e.id
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id
  WHERE pr.status = 'pending_approval'
  ORDER BY pr.created_at DESC
  `,
  { type: QueryTypes.SELECT, transaction }
);

const getLeaveApprovalRows = async (transaction = null) => db.query(
  `
  SELECT lr.id, lr.employee_id, lr.leave_type, lr.start_datetime, lr.end_datetime, lr.reason, lr.status, lr.attachment,
         lr.created_at, e.employee_code, e.full_name, d.id AS department_id, d.department_name, p.position_name,
         dm.full_name AS direct_manager_name
  FROM leave_request lr
  JOIN employee e ON lr.employee_id = e.id
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id
  LEFT JOIN employee dm ON e.direct_manager_id = dm.id
  WHERE lr.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employee appr
      JOIN position ap ON appr.position_id = ap.id
      WHERE appr.id = lr.approver_id AND ap.level = 'director'
    )
  ORDER BY lr.created_at DESC
  `,
  { type: QueryTypes.SELECT, transaction }
);

const getOvertimeApprovalRows = async (transaction = null) => db.query(
  `
  SELECT ot.id, ot.employee_id, ot.ot_date, ot.start_time, ot.end_time, ot.reason, ot.status,
         ot.created_at, e.employee_code, e.full_name, d.id AS department_id, d.department_name, p.position_name,
         dm.full_name AS direct_manager_name
  FROM overtime_request ot
  JOIN employee e ON ot.employee_id = e.id
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id
  LEFT JOIN employee dm ON e.direct_manager_id = dm.id
  WHERE ot.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employee appr
      JOIN position ap ON appr.position_id = ap.id
      WHERE appr.id = ot.approver_id AND ap.level = 'director'
    )
  ORDER BY ot.created_at DESC
  `,
  { type: QueryTypes.SELECT, transaction }
);

const getExplanationApprovalRows = async (transaction = null) => db.query(
  `
  SELECT aer.id, aer.employee_id, aer.attendance_date, aer.explanation_type, aer.proposed_check_in, aer.proposed_check_out,
         aer.reason, aer.attachment_url, aer.status, aer.created_at,
         e.employee_code, e.full_name, d.id AS department_id, d.department_name, p.position_name,
         dm.full_name AS direct_manager_name
  FROM attendance_explanation_request aer
  JOIN employee e ON aer.employee_id = e.id
  LEFT JOIN position p ON e.position_id = p.id
  LEFT JOIN department d ON p.department_id = d.id
  LEFT JOIN employee dm ON e.direct_manager_id = dm.id
  WHERE aer.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employee appr
      JOIN position ap ON appr.position_id = ap.id
      WHERE appr.id = aer.approver_id AND ap.level = 'director'
    )
  ORDER BY aer.created_at DESC
  `,
  { type: QueryTypes.SELECT, transaction }
);

const applyApprovedExplanationToAttendance = async ({ transaction, request }) => {
  const attendanceDate = request?.attendance_date;
  const checkInTime = normalizeTimeText(request?.proposed_check_in);
  const checkOutTime = normalizeTimeText(request?.proposed_check_out);

  if (!request?.employee_id || !attendanceDate) return;

  await db.query(
    `
    INSERT INTO attendance (employee_id, attendance_date, check_in_time, check_out_time)
    VALUES (
      :employeeId,
      :attendanceDate,
      CASE
        WHEN :checkInTime <> '' THEN timezone('Asia/Ho_Chi_Minh', :attendanceDate::date + :checkInTime::time)
        ELSE NULL
      END,
      CASE
        WHEN :checkOutTime <> '' THEN timezone('Asia/Ho_Chi_Minh', :attendanceDate::date + :checkOutTime::time)
        ELSE NULL
      END
    )
    ON CONFLICT (employee_id, attendance_date)
    DO UPDATE SET
      check_in_time = COALESCE(EXCLUDED.check_in_time, attendance.check_in_time),
      check_out_time = COALESCE(EXCLUDED.check_out_time, attendance.check_out_time)
    `,
    {
      replacements: {
        employeeId: request.employee_id,
        attendanceDate,
        checkInTime,
        checkOutTime
      },
      transaction
    }
  );

  await db.query(
    `
    UPDATE attendance
    SET
      status = CASE
        WHEN check_in_time IS NULL THEN 'absent'::attendance_status
        WHEN (check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time > TIME '07:30:00' THEN 'late'::attendance_status
        WHEN check_out_time IS NOT NULL
          AND (check_out_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time < TIME '17:00:00' THEN 'early_leave'::attendance_status
        ELSE 'on_time'::attendance_status
      END,
      total_work_hours = CASE
        WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL AND check_out_time >= check_in_time
          THEN ROUND((EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0)::numeric, 2)
        ELSE 0
      END
    WHERE employee_id = :employeeId
      AND attendance_date = :attendanceDate::date
    `,
    {
      replacements: {
        employeeId: request.employee_id,
        attendanceDate
      },
      transaction
    }
  );
};

const processDirectorApproval = async ({ transaction, type, id, action }) => {
  const isApproved = action === 'approve';

  if (type === 'payroll') {
    const rows = await db.query(
      `SELECT pr.*, e.full_name, e.employee_code FROM payroll pr JOIN employee e ON pr.employee_id = e.id WHERE pr.id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT, transaction }
    );
    const payroll = rows[0];
    if (!payroll) throw new Error('Không tìm thấy bảng lương.');

    await db.query(`UPDATE payroll SET status = :status WHERE id = :id`, {
      replacements: { status: isApproved ? 'approved' : 'draft', id },
      transaction
    });

    await createApprovalNotification({
      transaction,
      type,
      employeeId: payroll.employee_id,
      employeeName: payroll.full_name,
      monthYear: payroll.month_year,
      payrollRow: payroll,
      isApproved
    });

    return;
  }

  const tableName =
    type === 'leave'
      ? 'leave_request'
      : type === 'overtime'
        ? 'overtime_request'
        : type === 'explanation'
          ? 'attendance_explanation_request'
          : null;
  if (!tableName) throw new Error('Loại yêu cầu không hợp lệ.');

  const rows = await db.query(
    `SELECT req.*, e.full_name, e.employee_code FROM ${tableName} req JOIN employee e ON req.employee_id = e.id WHERE req.id = :id LIMIT 1`,
    { replacements: { id }, type: QueryTypes.SELECT, transaction }
  );
  const request = rows[0];
  if (!request) throw new Error('Không tìm thấy yêu cầu.');

  await db.query(`UPDATE ${tableName} SET status = :status WHERE id = :id`, {
    replacements: { status: isApproved ? 'approved' : 'rejected', id },
    transaction
  });

  if (type === 'explanation' && isApproved) {
    await applyApprovedExplanationToAttendance({ transaction, request });
  }

  await createApprovalNotification({
    transaction,
    type,
    employeeId: request.employee_id,
    employeeName: request.full_name,
    requestRow: request,
    isApproved
  });
};

const getDirectorApprovalsOverview = async (req, res) => {
  try {
    const tab = String(req.query?.tab || 'payroll');
    const q = String(req.query?.q || '').trim().toLowerCase();
    const departmentId = String(req.query?.departmentId || '').trim();
    const requestType = String(req.query?.requestType || req.query?.escalationReason || 'all').trim();

    const [payrollRows, leaveRows, overtimeRows, explanationRows, departments] = await Promise.all([
      getPayrollApprovalRows(),
      getLeaveApprovalRows(),
      getOvertimeApprovalRows(),
      getExplanationApprovalRows(),
      db.query(
        `SELECT id, department_name FROM department ORDER BY department_name`,
        { type: QueryTypes.SELECT }
      )
    ]);

    const payrollItems = payrollRows.map((row) => ({
      id: row.id,
      type: 'payroll',
      request_type: 'payroll',
      code: `BL-${String(row.month_year || '').replace('-', '')}-${row.employee_code}`,
      title: 'Bảng lương',
      employee_id: row.employee_id,
      employeeId: row.employee_id,
      employee_code: row.employee_code,
      employeeCode: row.employee_code,
      employee_name: row.full_name,
      employeeName: row.full_name,
      department_id: row.department_id,
      departmentId: row.department_id,
      department_name: row.department_name,
      departmentName: row.department_name,
      position_name: row.position_name,
      positionName: row.position_name,
      month_year: row.month_year,
      timeLabel: row.month_year,
      net_salary: row.net_salary,
      amount: Number(row.net_salary || 0),
      base_salary_snapshot: row.base_salary_snapshot,
      baseSalarySnapshot: Number(row.base_salary_snapshot || 0),
      total_work_days: row.total_work_days,
      totalWorkDays: Number(row.total_work_days || 0),
      total_allowance: row.total_allowance,
      totalAllowance: Number(row.total_allowance || 0),
      allowance: Number(row.total_allowance || 0),
      total_deduction: row.total_deduction,
      totalDeduction: Number(row.total_deduction || 0),
      deduction: Number(row.total_deduction || 0),
      meta_label: `Kỳ lương ${row.month_year}`,
      meta_sub: `Thực nhận ${Number(row.net_salary || 0).toLocaleString('vi-VN')} đ`,
      created_at: row.created_at,
      createdAt: row.created_at,
      subtitle: `Thực nhận ${Number(row.net_salary || 0).toLocaleString('vi-VN')} đ`,
      status: row.status,
      detail: {
        baseSalarySnapshot: Number(row.base_salary_snapshot || 0),
        totalWorkDays: Number(row.total_work_days || 0),
        totalAllowance: Number(row.total_allowance || 0),
        totalDeduction: Number(row.total_deduction || 0),
        netSalary: Number(row.net_salary || 0),
        incomeAfterInsurance: Number(row.net_salary || 0)
      }
    }));

    const leaveItems = leaveRows.map((row) => ({
      id: row.id,
      type: 'leave',
      request_type: 'leave',
      code: `LD-${String(row.id).padStart(5, '0')}`,
      title: 'Đơn phép',
      employee_id: row.employee_id,
      employeeId: row.employee_id,
      employee_code: row.employee_code,
      employeeCode: row.employee_code,
      employee_name: row.full_name,
      employeeName: row.full_name,
      department_id: row.department_id,
      departmentId: row.department_id,
      department_name: row.department_name,
      departmentName: row.department_name,
      position_name: row.position_name,
      positionName: row.position_name,
      leave_type: row.leave_type,
      leaveType: row.leave_type,
      leaveTypeLabel: LEAVE_TYPE_LABELS[row.leave_type] || 'Đơn phép',
      directManagerName: row.direct_manager_name,
      startDateLabel: formatDateTimeVi(row.start_datetime),
      endDateLabel: formatDateTimeVi(row.end_datetime),
      range_label: `${formatDateTimeVi(row.start_datetime)} - ${formatDateTimeVi(row.end_datetime)}`,
      reason: row.reason || '',
      attachment: row.attachment || '',
      timeLabel: `${formatDateTimeVi(row.start_datetime)} - ${formatDateTimeVi(row.end_datetime)}`,
      meta_label: `${formatDateTimeVi(row.start_datetime)} - ${formatDateTimeVi(row.end_datetime)}`,
      meta_sub: row.reason || 'Không có lý do',
      subtitle: row.reason || 'Không có lý do',
      created_at: row.created_at,
      createdAt: row.created_at,
      durationDays: getLeaveDurationDays(row.start_datetime, row.end_datetime),
      escalationReasonLabel: 'Đơn phép',
      status: row.status,
      detail: {
        reason: row.reason || '',
        attachment: row.attachment || ''
      }
    }));

    const overtimeItems = overtimeRows.map((row) => ({
      id: row.id,
      type: 'overtime',
      request_type: 'overtime',
      code: `OT-${String(row.id).padStart(5, '0')}`,
      title: 'Đơn tăng ca',
      employee_id: row.employee_id,
      employeeId: row.employee_id,
      employee_code: row.employee_code,
      employeeCode: row.employee_code,
      employee_name: row.full_name,
      employeeName: row.full_name,
      department_id: row.department_id,
      departmentId: row.department_id,
      department_name: row.department_name,
      departmentName: row.department_name,
      position_name: row.position_name,
      positionName: row.position_name,
      directManagerName: row.direct_manager_name,
      otDateLabel: formatDateVi(row.ot_date),
      startTimeLabel: normalizeTimeText(row.start_time),
      endTimeLabel: normalizeTimeText(row.end_time),
      timeRangeLabel: `${normalizeTimeText(row.start_time)} - ${normalizeTimeText(row.end_time)}`,
      range_label: `${formatDateVi(row.ot_date)} ${normalizeTimeText(row.start_time)} - ${normalizeTimeText(row.end_time)}`,
      reason: row.reason || '',
      timeLabel: `${formatDateVi(row.ot_date)} ${normalizeTimeText(row.start_time)} - ${normalizeTimeText(row.end_time)}`,
      meta_label: `${formatDateVi(row.ot_date)} ${normalizeTimeText(row.start_time)} - ${normalizeTimeText(row.end_time)}`,
      meta_sub: row.reason || 'Không có lý do',
      subtitle: row.reason || 'Không có lý do',
      created_at: row.created_at,
      createdAt: row.created_at,
      durationLabel: formatOvertimeDurationLabel(row.start_time, row.end_time),
      escalationReasonLabel: 'Đơn tăng ca',
      status: row.status,
      detail: {
        reason: row.reason || ''
      }
    }));

    const explanationItems = explanationRows.map((row) => ({
      id: row.id,
      type: 'explanation',
      request_type: 'explanation',
      code: `GT-${String(row.id).slice(0, 8).toUpperCase()}`,
      title: 'Đơn giải trình',
      employee_id: row.employee_id,
      employeeId: row.employee_id,
      employee_code: row.employee_code,
      employeeCode: row.employee_code,
      employee_name: row.full_name,
      employeeName: row.full_name,
      department_id: row.department_id,
      departmentId: row.department_id,
      department_name: row.department_name,
      departmentName: row.department_name,
      position_name: row.position_name,
      positionName: row.position_name,
      directManagerName: row.direct_manager_name,
      explanation_type: row.explanation_type,
      explanationType: row.explanation_type,
      explanationTypeLabel: EXPLANATION_TYPE_LABELS[row.explanation_type] || 'Đơn giải trình',
      attendanceDateLabel: formatDateVi(row.attendance_date),
      checkInLabel: normalizeTimeText(row.proposed_check_in),
      checkOutLabel: normalizeTimeText(row.proposed_check_out),
      timeRangeLabel: `${normalizeTimeText(row.proposed_check_in) || '--:--'} - ${normalizeTimeText(row.proposed_check_out) || '--:--'}`,
      range_label: `${formatDateVi(row.attendance_date)} ${normalizeTimeText(row.proposed_check_in) || '--:--'} - ${normalizeTimeText(row.proposed_check_out) || '--:--'}`,
      reason: row.reason || '',
      attachment: row.attachment_url || '',
      timeLabel: `${formatDateVi(row.attendance_date)} ${normalizeTimeText(row.proposed_check_in) || '--:--'} - ${normalizeTimeText(row.proposed_check_out) || '--:--'}`,
      meta_label: `${formatDateVi(row.attendance_date)} ${normalizeTimeText(row.proposed_check_in) || '--:--'} - ${normalizeTimeText(row.proposed_check_out) || '--:--'}`,
      meta_sub: row.reason || 'Không có lý do',
      subtitle: row.reason || 'Không có lý do',
      created_at: row.created_at,
      createdAt: row.created_at,
      escalationReasonLabel: 'Đơn giải trình',
      status: row.status,
      detail: {
        reason: row.reason || '',
        attachment: row.attachment_url || ''
      }
    }));

    const allItems = [...payrollItems, ...leaveItems, ...overtimeItems, ...explanationItems];
    const filteredItems = allItems.filter((item) => {
      if (tab === 'payroll' && item.type !== 'payroll') return false;
      if (tab === 'leave' && item.type === 'payroll') return false;
      if (departmentId && String(item.department_id || '') !== departmentId) return false;
      if (q) {
        const haystack = [
          item.code,
          item.employee_code,
          item.employee_name,
          item.department_name,
          item.position_name,
          item.reason,
          item.month_year,
          item.range_label,
          item.meta_label,
          item.meta_sub
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (tab === 'leave' && requestType !== 'all' && item.type !== requestType) {
        return false;
      }
      return true;
    });

    res.json({
      success: true,
      data: {
        items: filteredItems,
        stats: {
          payrollPendingCount: payrollItems.length,
          leavePendingCount: leaveItems.length + overtimeItems.length + explanationItems.length
        },
        options: {
          departments: departments || [],
          requestTypes: [
            { value: 'all', label: 'Tất cả đơn' },
            { value: 'leave', label: 'Đơn phép' },
            { value: 'overtime', label: 'Đơn tăng ca' },
            { value: 'explanation', label: 'Đơn giải trình' }
          ]
        }
      }
    });
  } catch (error) {
    console.error('getDirectorApprovalsOverview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDirectorApprovalStatus = async (req, res) => {
  const tx = await db.transaction();
  try {
    const { type, id } = req.params;
    const action = String(req.body?.action || '').toLowerCase();
    if (!['approve', 'reject'].includes(action)) {
      await tx.rollback();
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });
    }

    await processDirectorApproval({ transaction: tx, type, id, action });
    await tx.commit();
    return res.json({ success: true, message: action === 'approve' ? 'Đã duyệt yêu cầu.' : 'Đã từ chối yêu cầu.' });
  } catch (error) {
    if (tx && !tx.finished) await tx.rollback();
    console.error('updateDirectorApprovalStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkApproveDirectorApprovals = async (req, res) => {
  const tx = await db.transaction();
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      await tx.rollback();
      return res.status(400).json({ success: false, message: 'Chưa có mục nào được chọn.' });
    }

    let processed = 0;
    for (const item of items) {
      if (!item?.id || !item?.type) continue;
      await processDirectorApproval({ transaction: tx, type: item.type, id: item.id, action: 'approve' });
      processed += 1;
    }

    await tx.commit();
    return res.json({ success: true, message: `Đã duyệt ${processed} mục.` });
  } catch (error) {
    if (tx && !tx.finished) await tx.rollback();
    console.error('bulkApproveDirectorApprovals error:', error);
    res.status(500).json({ success: false, message: error.message });
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
  checkDepartmentManager,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getBranches,
  getBranchById,
  getBranchManagerCandidates,
  createBranch,
  updateBranch,
  deleteBranch,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getContracts,
  getContractFormOptions,
  createContract,
  updateContract,
  getFormOptions,
  getDashboardOverview,
  getDirectorApprovalsOverview,
  updateDirectorApprovalStatus,
  bulkApproveDirectorApprovals
};

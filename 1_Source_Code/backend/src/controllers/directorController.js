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
    // 👉 ĐÃ THÊM: c.base_salary, c.allowances
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
        p.position_name
      FROM contract c
      JOIN employee e ON c.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
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
        allowances: c.allowances || [] // 👉 Gửi xuống FE để form Edit đọc
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Lỗi API getContracts:', error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi tải hợp đồng' });
  }
};


// 1. Lấy danh sách Nhân viên và Chức vụ cho Combobox
const getContractFormOptions = async (req, res) => {
  try {
    // Lấy nhân viên kèm ID chức vụ hiện tại
    const employees = await db.query(`
      SELECT id, full_name, employee_code, position_id 
      FROM employee 
      WHERE status = 'active' 
      ORDER BY full_name ASC
    `, { type: db.QueryTypes.SELECT });
    
    // Lấy danh sách chức vụ kèm mức lương sàn
    const positions = await db.query(`
      SELECT id, position_name, base_salary_min 
      FROM position 
      ORDER BY position_name ASC
    `, { type: db.QueryTypes.SELECT });

    res.status(200).json({ employees, positions });
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

    // 3. Tổng yêu cầu đang pending (Nghỉ phép + Tăng ca)
    const [[{ total_req }]] = await db.query(`
      SELECT (
        (SELECT COUNT(*)::int FROM leave_request WHERE status = 'pending') +
        (SELECT COUNT(*)::int FROM overtime_request WHERE status = 'pending')
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
      SELECT lr.id, e.full_name as name, 'leave' as type, lr.created_at FROM leave_request lr JOIN employee e ON lr.employee_id = e.id WHERE lr.status = 'pending'
      UNION ALL
      SELECT ot.id, e.full_name as name, 'overtime' as type, ot.created_at FROM overtime_request ot JOIN employee e ON ot.employee_id = e.id WHERE ot.status = 'pending'
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
  getDashboardOverview
};
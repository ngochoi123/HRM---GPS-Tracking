const db = require('../config/database');


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
    
    const query = `
      INSERT INTO position (position_code, position_name, department_id, level, base_salary_min)
      VALUES (:position_code, :position_name, :department_id, :level, :base_salary_min)
    `;

    await db.query(query, {
      replacements: {
        position_code, 
        position_name, 
        department_id: department_id || null, 
        level, 
        base_salary_min: base_salary_min || 0
      },
      type: db.QueryTypes.INSERT
    });

    res.status(201).json({ success: true, message: 'Thêm chức vụ thành công!' });
  } catch (error) {
    console.error('Lỗi API createPosition:', error);
    if (error.original && error.original.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã chức vụ này đã tồn tại!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi thêm chức vụ' });
  }
};

// Cập nhật chức vụ
const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { position_code, position_name, department_id, level, base_salary_min } = req.body;

    const query = `
      UPDATE position 
      SET position_code = :position_code,
          position_name = :position_name,
          department_id = :department_id,
          level = :level,
          base_salary_min = :base_salary_min
      WHERE id = :id
    `;

    await db.query(query, {
      replacements: {
        id, position_code, position_name, 
        department_id: department_id || null, 
        level, 
        base_salary_min: base_salary_min || 0
      },
      type: db.QueryTypes.UPDATE
    });

    res.status(200).json({ success: true, message: 'Cập nhật chức vụ thành công!' });
  } catch (error) {
    console.error('Lỗi API updatePosition:', error);
    if (error.original && error.original.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã chức vụ này đã bị trùng với chức vụ khác!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật chức vụ' });
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
// NHỚ EXPORT ĐẦY ĐỦ RA NHÉ
module.exports = {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getContracts,
  getContractFormOptions, 
  createContract,       
  updateContract          
};

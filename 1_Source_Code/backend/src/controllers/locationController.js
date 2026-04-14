const db = require('../config/database');

/** Phát tới mọi client (web/mobile) để tải lại cấu hình vùng chấm công realtime */
function emitAdminLocationsUpdated(req) {
  try {
    const io = req.app.get('socketio');
    if (io) io.emit('admin_locations_updated');
  } catch (e) {
    console.warn('[locationController] admin_locations_updated:', e?.message || e);
  }
}

/** Chuẩn hóa allowed_ips từ body (JSON string hoặc mảng) → mảng chuỗi cho PostgreSQL TEXT[] */
function parseAllowedIpsBody(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      return Array.isArray(p) ? p.map((x) => String(x).trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ==========================================================
// 1. LẤY DANH SÁCH CHI NHÁNH (Đã sửa lại cú pháp JOIN)
// ==========================================================
const getLocations = async (req, res) => {
  try {
    const query = `
  SELECT 
    b.id AS id, 
    b.branch_code, 
    b.branch_name, 
    b.address, 
    b.is_active, 
    b.allowed_ips,
    w.id AS work_location_id, 
    w.location_name,
    w.location_type AS type, 
    w.latitude, 
    w.longitude, 
    w.radius_meters
  FROM branch b
  LEFT JOIN work_location w ON w.branch_id = b.id
  ORDER BY b.id ASC;
`;
    const locations = await db.query(query, { type: db.QueryTypes.SELECT });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error("Lỗi getLocations:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

const createLocation = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const {
      branch_id,
      location_name,
      location_type,
      latitude,
      longitude,
      radius_meters,
      allowed_ips: allowedIpsRaw,
    } = req.body;

    const allowedIpsArr = parseAllowedIpsBody(allowedIpsRaw);

    // 1. Validate dữ liệu GPS
    if (!location_name || latitude === undefined || longitude === undefined || radius_meters === undefined) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu cấu hình GPS bắt buộc!" });
    }

    // 2. KHÓA CHẶT: Bắt buộc phải có branch_id (KHÔNG BAO GIỜ TỰ TẠO CHI NHÁNH)
    if (!branch_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Bắt buộc phải chọn một chi nhánh quản lý để gắn khu vực chấm công!" });
    }

    // 3. Cập nhật danh sách IP cho chi nhánh cũ (nếu có)
    if (allowedIpsRaw !== undefined) {
      await db.query(`UPDATE branch SET allowed_ips = $1::text[] WHERE id = $2`, {
        bind: [allowedIpsArr || [], branch_id],
        transaction,
      });
    }

    // 4. Luôn luôn tạo Work Location mới gắn vào branch_id
    const workLocQuery = `
      INSERT INTO work_location (branch_id, location_name, location_type, latitude, longitude, radius_meters)
      VALUES (:branchId, :locName, :locType, :lat, :lng, :radius)
      RETURNING id
    `;
    const [newWorkLocRows] = await db.query(workLocQuery, { 
      replacements: { 
        branchId: branch_id, 
        locName: location_name, 
        locType: location_type || 'branch', 
        lat: latitude, 
        lng: longitude, 
        radius: radius_meters 
      }, 
      transaction 
    });

    await transaction.commit();
    emitAdminLocationsUpdated(req);
    
    return res.status(201).json({
      success: true,
      message: "Thêm khu vực chấm công thành công!",
      data: { branch_id, work_location_id: newWorkLocRows[0].id }
    });

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("LỖI SQL KHI TẠO:", error);
    return res.status(500).json({ success: false, message: "Lỗi lưu dữ liệu: " + error.message });
  }
};
const updateLocationSettings = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const branchId = req.params.id; // Đây là branch_id mới mà client gửi lên trên URL
    const {
      branch_id, // Lấy branch_id từ body
      branch_name,
      is_active,
      location_name,
      location_type,
      latitude,
      longitude,
      radius_meters,
      work_location_id,
      allowed_ips: allowedIpsRaw,
    } = req.body;

    const allowedIpsArr = parseAllowedIpsBody(allowedIpsRaw);
    const targetBranchId = branch_id || branchId;

    // 1. Cập nhật Branch (tên, trạng thái, allowed_ips) dành cho chi nhánh đích
    if (branch_name !== undefined || is_active !== undefined || allowedIpsRaw !== undefined) {
      await db.query(
        `
        UPDATE branch
        SET branch_name = COALESCE($1, branch_name),
            is_active = COALESCE($2, is_active),
            allowed_ips = CASE WHEN $3::boolean THEN $4::text[] ELSE allowed_ips END
        WHERE id = $5
        `,
        {
          bind: [
            branch_name !== undefined ? branch_name : null,
            is_active !== undefined ? is_active : null,
            allowedIpsRaw !== undefined,
            allowedIpsRaw !== undefined ? allowedIpsArr : [],
            targetBranchId,
          ],
          transaction,
        }
      );
    }

    // 2. Cập nhật Work Location: Set branch_id mới và bỏ check OLD branch_id trong WHERE
    if (work_location_id) {
      await db.query(`
        UPDATE work_location 
        SET location_name = COALESCE(:locName, location_name),
            location_type = COALESCE(:locType, location_type),
            latitude = COALESCE(:lat, latitude),
            longitude = COALESCE(:lng, longitude),
            radius_meters = COALESCE(:radius, radius_meters),
            branch_id = COALESCE(:newBranchId, branch_id)
        WHERE id = :workLocId
      `, { 
        replacements: { 
          locName: location_name !== undefined ? location_name : null, 
          locType: location_type !== undefined ? location_type : null, 
          lat: latitude !== undefined ? latitude : null, 
          lng: longitude !== undefined ? longitude : null, 
          radius: radius_meters !== undefined ? radius_meters : null, 
          newBranchId: targetBranchId,
          workLocId: work_location_id
        }, 
        transaction 
      });
    }

    await transaction.commit();
    emitAdminLocationsUpdated(req);
    res.status(200).json({ success: true, message: "Cập nhật khu vực thành công!" });

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("LỖI SQL KHI CẬP NHẬT:", error);
    res.status(500).json({ success: false, message: "Lỗi lưu dữ liệu: " + error.message });
  }
};
const deleteWorkLocation = async (req, res) => {
  const workLocId = req.params.id; // LẤY CHÍNH XÁC ID CỦA KHU VỰC

  if (!workLocId) {
    return res.status(400).json({ success: false, message: "Thiếu ID khu vực cần xóa!" });
  }

  try {
    // Chỉ xóa đúng 1 dòng trong bảng work_location
    await db.query(`DELETE FROM work_location WHERE id = :workLocId`, {
      replacements: { workLocId }
    });

    emitAdminLocationsUpdated(req);
    res.status(200).json({ success: true, message: "Đã xóa khu vực chấm công!" });
  } catch (error) {
    console.error("LỖI SQL KHI XÓA:", error);
    res.status(500).json({ success: false, message: "Lỗi khi xóa: " + error.message });
  }
};
const getBranches = async (req, res) => {
    try {
      const branches = await db.query(
        `SELECT id, branch_name as name FROM branch WHERE is_active = true ORDER BY id ASC`,
        { type: db.QueryTypes.SELECT }
      );
      res.status(200).json({ success: true, data: branches });
    } catch (error) {
      console.error("Lỗi getBranches:", error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  };

  // 2. Lấy danh sách phòng ban theo branch_id
const getDepartmentsByBranch = async (req, res) => {
    try {
      const { branchId } = req.params;
      const departments = await db.query(
        `SELECT id, department_name as name FROM department WHERE branch_id = :branchId AND is_active = true ORDER BY department_name ASC`,
        { replacements: { branchId }, type: db.QueryTypes.SELECT }
      );
      res.status(200).json({ success: true, data: departments });
    } catch (error) {
      console.error("Lỗi getDepartments:", error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  };

  // 3. Lấy danh sách nhân viên theo department_id (JOIN qua bảng position)
const getEmployeesByDepartment = async (req, res) => {
    try {
      const { departmentId } = req.params;
      const employees = await db.query(
        `SELECT e.id, CONCAT(e.full_name, ' (', e.employee_code, ')') as name 
         FROM employee e 
         JOIN position p ON e.position_id = p.id 
         WHERE p.department_id = :departmentId AND e.status = 'active'
         ORDER BY e.full_name ASC`,
        { replacements: { departmentId }, type: db.QueryTypes.SELECT }
      );
      res.status(200).json({ success: true, data: employees });
    } catch (error) {
      console.error("Lỗi getEmployees:", error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  };

  // 4. Lấy danh sách địa điểm làm việc theo branch_id
const getWorkLocationsByBranch = async (req, res) => {
    try {
      const { branchId } = req.params;
      const locations = await db.query(
        `SELECT id, location_name as name FROM work_location WHERE branch_id = :branchId AND is_active = true ORDER BY location_name ASC`,
        { replacements: { branchId }, type: db.QueryTypes.SELECT }
      );
      res.status(200).json({ success: true, data: locations });
    } catch (error) {
      console.error("Lỗi getWorkLocations:", error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  };

  // 5. Tạo mới phân công (Xử lý constraint check_single_target)
const createLocationAssignment = async (req, res) => {
    try {
      const { assign_type, target_id, work_location_id, assigned_date, is_temporary, end_date } = req.body;

      // Xử lý logic 3 cột target (đảm bảo đúng 1 cột có giá trị, 2 cột null)
      let branch_id = null;
      let department_id = null;
      let employee_id = null;

      if (assign_type === 'branch') branch_id = target_id;
      else if (assign_type === 'department') department_id = target_id;
      else if (assign_type === 'employee') employee_id = target_id;
      else return res.status(400).json({ success: false, message: 'Loại phân công không hợp lệ' });

      const query = `
        INSERT INTO location_assignment 
        (employee_id, work_location_id, assigned_date, is_temporary, branch_id, department_id, end_date)
        VALUES (:employee_id, :work_location_id, :assigned_date, :is_temporary, :branch_id, :department_id, :end_date)
        RETURNING id
      `;

      await db.query(query, {
        replacements: {
          employee_id,
          work_location_id,
          assigned_date,
          is_temporary: is_temporary || false,
          branch_id,
          department_id,
          end_date: is_temporary ? end_date : null
        },
        type: db.QueryTypes.INSERT
      });

      res.status(201).json({ success: true, message: 'Phân công thành công' });
    } catch (error) {
      console.error("Lỗi createLocationAssignment:", error);
      res.status(500).json({ success: false, message: 'Lỗi server khi lưu phân công' });
    }
  }


module.exports = { getLocations, createLocation, updateLocationSettings, deleteWorkLocation, getBranches, getDepartmentsByBranch, getEmployeesByDepartment, getWorkLocationsByBranch, createLocationAssignment };
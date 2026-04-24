const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const axios = require('axios');

/** Đồng bộ với .data: mặc định UI là 'Toàn công ty'; DB có thể còn 'Tất cả nhân viên'. */
function isCompanyWideTarget(target) {
  return getTargetScope(target) === 'company';
}

const TARGET_COMPANY = 'Toàn công ty';
const TARGET_COMPANY_LEGACY = 'Tất cả nhân viên';
const TARGET_DEPARTMENT = 'Phòng ban';
const TARGET_EMPLOYEE = 'Cá nhân';

const STATUS_DRAFT = 'Nháp';
const STATUS_SENT = 'Đã gửi';
const STATUS_EDITED = 'Đã chỉnh sửa';

function normalizeText(value) {
  return String(value || '').normalize('NFC').trim().toLowerCase();
}

function getTargetScope(target) {
  const normalized = normalizeText(target);
  if (
    !normalized ||
    normalized === normalizeText(TARGET_COMPANY) ||
    normalized === normalizeText(TARGET_COMPANY_LEGACY)
  ) {
    return 'company';
  }
  if (normalized === normalizeText(TARGET_DEPARTMENT)) return 'department';
  if (normalized === normalizeText(TARGET_EMPLOYEE)) return 'employee';
  return 'company';
}

function getPersistedTarget(target) {
  const scope = getTargetScope(target);
  if (scope === 'department') return TARGET_DEPARTMENT;
  if (scope === 'employee') return TARGET_EMPLOYEE;
  return TARGET_COMPANY;
}

async function getRequesterEmployeeId(userAccountId) {
  if (!userAccountId) return null;
  const rows = await sequelize.query(
    `
    SELECT employee_id
    FROM user_account
    WHERE id = :userAccountId
    LIMIT 1
    `,
    {
      replacements: { userAccountId },
      type: QueryTypes.SELECT,
    }
  );
  return rows?.[0]?.employee_id || null;
}

async function getNotificationAccessContext(req) {
  const role = String(req.user?.role || '').toUpperCase();
  const departmentId = req.user?.department_id || null;
  const requesterEmployeeId = await getRequesterEmployeeId(req.user?.id);
  return { role, departmentId, requesterEmployeeId };
}

function appendManagerHistoryScope(baseQuery, replacements, access) {
  if (access.role !== 'MANAGER') {
    return baseQuery;
  }

  replacements.requesterEmployeeId = access.requesterEmployeeId;
  replacements.managerDepartmentId = access.departmentId;

  return `
    ${baseQuery}
    WHERE n.sender_id = :requesterEmployeeId
      AND (
        n.target IN ('Toàn công ty', 'Tất cả nhân viên')
        OR
        n.target_department_id = :managerDepartmentId
        OR (
          n.target_employee_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM employee te
            JOIN position tp ON tp.id = te.position_id
            WHERE te.id = n.target_employee_id
              AND tp.department_id = :managerDepartmentId
          )
        )
      )
  `;
}

async function ensureNotificationAccess({ req, notificationId, transaction = null }) {
  const access = await getNotificationAccessContext(req);
  const replacements = { id: notificationId };

  let query = `
    SELECT n.*
    FROM notification n
  `;

  if (access.role === 'MANAGER') {
    if (!access.requesterEmployeeId || !access.departmentId) {
      return null;
    }

    replacements.requesterEmployeeId = access.requesterEmployeeId;
    replacements.managerDepartmentId = access.departmentId;

    query += `
      WHERE n.id = :id
        AND n.sender_id = :requesterEmployeeId
        AND (
          n.target IN ('Toàn công ty', 'Tất cả nhân viên')
          OR
          n.target_department_id = :managerDepartmentId
          OR (
            n.target_employee_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM employee te
              JOIN position tp ON tp.id = te.position_id
              WHERE te.id = n.target_employee_id
                AND tp.department_id = :managerDepartmentId
            )
          )
        )
    `;
  } else {
    query += ` WHERE n.id = :id `;
  }

  const rows = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
    transaction,
  });

  return rows?.[0] || null;
}

async function sendExpoPushIfPossible(notificationId, title, desc) {
  try {
    const fetchTokensQuery = `
      SELECT u.expo_push_token
      FROM user_account u
      JOIN notification_recipient nr ON nr.employee_id = u.employee_id
      WHERE nr.notification_id = :notiId AND u.expo_push_token IS NOT NULL
    `;

    const tokens = await sequelize.query(fetchTokensQuery, {
      replacements: { notiId: notificationId },
      type: QueryTypes.SELECT,
    });

    if (!tokens || tokens.length === 0) return;

    const pushMessages = tokens.map((t) => ({
      to: t.expo_push_token,
      title: title || 'Thông báo mới',
      body: desc || 'Bạn có một thông báo mới từ công ty.',
      sound: 'default',
    }));

    await axios.post('https://exp.host/--/api/v2/push/send', pushMessages, {
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    if (
      err?.original?.code === '42703' ||
      String(err?.message || '').includes('expo_push_token')
    ) {
      console.warn(
        'Skip Expo push: user_account.expo_push_token chưa tồn tại trong schema hiện tại.'
      );
      return;
    }
    console.error('Expo Push Error:', err?.response?.data || err?.message || err);
  }
}

const notificationController = {
  // --- Admin: danh sách ---
  getAllNotifications: async (req, res) => {
    try {
      const access = await getNotificationAccessContext(req);
      const replacements = {};

      if (access.role === 'MANAGER' && (!access.requesterEmployeeId || !access.departmentId)) {
        return res.json([]);
      }

      let query = `
        SELECT n.*
        FROM notification n
      `;

      query = appendManagerHistoryScope(query, replacements, access);
      query += ` ORDER BY n.created_at DESC`;

      const notifications = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });
      res.json(notifications);
    } catch (err) {
      console.error('❌ Lỗi lấy thông báo:', err);
      res.status(500).json({ message: 'Lỗi lấy danh sách thông báo' });
    }
  },

  // --- Admin: tạo mới ---
  createNotification: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const access = await getNotificationAccessContext(req);
      const {
        title,
        content,
        notification_type,
        target,
        department_id,
        employee_id,
        desc,
        sender_id,
        status,
      } = req.body;

      if (access.role === 'MANAGER' && (!access.requesterEmployeeId || !access.departmentId)) {
        await t.rollback();
        return res.status(403).json({ message: 'Không xác định được phạm vi thông báo của quản lý' });
      }

      const finalStatus = status === STATUS_DRAFT ? STATUS_DRAFT : STATUS_SENT;

      if (!title || !String(title).trim()) {
        await t.rollback();
        return res.status(400).json({ message: 'Thiếu tiêu đề thông báo' });
      }

      const targDept = department_id
        ? parseInt(String(department_id), 10)
        : null;

      let safeDeptId =
        Number.isFinite(targDept) && targDept > 0 ? targDept : null;

      let safeEmpId = employee_id || null;

      const tgtNorm = getPersistedTarget(target);

      if (access.role === 'MANAGER') {
        if (safeDeptId !== null && Number(safeDeptId) !== Number(access.departmentId)) {
          await t.rollback();
          return res.status(403).json({ message: 'Quản lý chỉ được gửi thông báo cho phòng ban của mình' });
        }
      }

      if (getTargetScope(tgtNorm) === 'company') {
        safeDeptId = null;
        safeEmpId = null;
      } else if (getTargetScope(tgtNorm) === 'department') {
        safeEmpId = null;
        if (access.role === 'MANAGER') {
          safeDeptId = access.departmentId;
        }
      } else if (getTargetScope(tgtNorm) === 'employee' && access.role === 'MANAGER') {
        safeDeptId = access.departmentId;
        const targetEmployeeRows = await sequelize.query(
          `
          SELECT e.id
          FROM employee e
          JOIN position p ON e.position_id = p.id
          WHERE e.id = :employeeId
            AND p.department_id = :departmentId
          LIMIT 1
          `,
          {
            replacements: {
              employeeId: safeEmpId,
              departmentId: access.departmentId,
            },
            type: QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (!targetEmployeeRows.length) {
          await t.rollback();
          return res.status(403).json({ message: 'Nhân viên nhận thông báo không thuộc phòng ban bạn quản lý' });
        }
      }

      const [newNotiRows] = await sequelize.query(
        `INSERT INTO notification 
        (title, content, notification_type, target, "desc", status, sender_id, target_department_id, target_employee_id, created_at) 
        VALUES (:title, :content, :type, :target, :desc, :notiStatus, :sender, :tdept, :temp, NOW()) 
        RETURNING id`,
        {
          replacements: {
            title,
            content,
            type: notification_type || 'info',
            target: tgtNorm,
            desc: desc || '',
            notiStatus: finalStatus,
            sender:
              access.role === 'MANAGER'
                ? access.requesterEmployeeId
                : (sender_id || access.requesterEmployeeId || null),
            tdept: safeDeptId,
            temp: safeEmpId,
          },
          transaction: t,
        }
      );

      const notificationId = newNotiRows?.[0]?.id;
if (!notificationId) {
  throw new Error('Không lấy được ID thông báo vừa tạo.');
}

if (finalStatus !== STATUS_DRAFT) {
  if (isCompanyWideTarget(tgtNorm)) {
    await sequelize.query(
      `INSERT INTO notification_recipient (notification_id, employee_id)
       SELECT :notiId, id FROM employee WHERE status = 'active'`,
      { replacements: { notiId: notificationId }, transaction: t }
    );
  } else if (getTargetScope(tgtNorm) === 'department' && safeDeptId) {
    await sequelize.query(
      `INSERT INTO notification_recipient (notification_id, employee_id)
       SELECT :notiId, e.id FROM employee e 
       JOIN "position" p ON e.position_id = p.id 
       WHERE p.department_id = :deptId AND e.status = 'active'`,
      {
        replacements: { notiId: notificationId, deptId: safeDeptId },
        transaction: t,
      }
    );
  } else if (getTargetScope(tgtNorm) === 'employee' && safeEmpId) {
    await sequelize.query(
      `INSERT INTO notification_recipient (notification_id, employee_id) VALUES (:notiId, :empId)`,
      {
        replacements: { notiId: notificationId, empId: safeEmpId },
        transaction: t,
      }
    );
  }
}

await t.commit();

// === FIRE PUSH NOTIFICATION (BACKGROUND) ===
if (finalStatus !== STATUS_DRAFT) {
  sendExpoPushIfPossible(notificationId, title, desc);
}

res.status(201).json({ message: 'Gửi thông báo thành công', id: notificationId });

} catch (err) {
  await t.rollback();
  console.error('❌ Lỗi tạo thông báo:', err);
  res.status(500).json({
    message: 'Lỗi hệ thống khi lưu dữ liệu',
    error: err.message,
  });
}
},

// --- Admin: cập nhật ---
updateNotification: async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const allowedNotification = await ensureNotificationAccess({
      req,
      notificationId: req.params.id,
      transaction: t,
    });

    if (!allowedNotification) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    const access = await getNotificationAccessContext(req);
    const { id } = req.params;
    const {
      title,
      content,
      notification_type,
      target,
      department_id,
      employee_id,
      desc,
      sender_id,
      status,
    } = req.body;

    if (!title || !String(title).trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'Thiếu tiêu đề thông báo' });
    }

    const resolvedStatus =
      status === STATUS_DRAFT ? STATUS_DRAFT : status || STATUS_EDITED;

    const uDept = department_id
      ? parseInt(String(department_id), 10)
      : null;

    let uSafeDept =
      Number.isFinite(uDept) && uDept > 0 ? uDept : null;

    let u_safeEmp = employee_id || null;

    const uTgt = getPersistedTarget(target);

    if (access.role === 'MANAGER') {
      if (uSafeDept !== null && Number(uSafeDept) !== Number(access.departmentId)) {
        await t.rollback();
        return res.status(403).json({ message: 'Quản lý chỉ được gửi thông báo cho phòng ban của mình' });
      }
    }

    if (isCompanyWideTarget(uTgt)) {
      uSafeDept = null;
      u_safeEmp = null;
    } else if (getTargetScope(uTgt) === 'department') {
      u_safeEmp = null;
      if (access.role === 'MANAGER') {
        uSafeDept = access.departmentId;
      }
    } else if (getTargetScope(uTgt) === 'employee' && access.role === 'MANAGER') {
      uSafeDept = access.departmentId;
      const targetEmployeeRows = await sequelize.query(
        `
        SELECT e.id
        FROM employee e
        JOIN position p ON e.position_id = p.id
        WHERE e.id = :employeeId
          AND p.department_id = :departmentId
        LIMIT 1
        `,
        {
          replacements: {
            employeeId: u_safeEmp,
            departmentId: access.departmentId,
          },
          type: QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (!targetEmployeeRows.length) {
        await t.rollback();
        return res.status(403).json({ message: 'Nhân viên nhận thông báo không thuộc phòng ban bạn quản lý' });
      }
    }

    await sequelize.query(
      `UPDATE notification
       SET title = :title,
           content = :content,
           notification_type = :type,
           target = :target,
           "desc" = :desc,
           status = :status,
           sender_id = :sender,
           target_department_id = :tdept,
           target_employee_id = :temp
       WHERE id = :id`,
      {
        replacements: {
          id,
          title,
          content,
          type: notification_type || 'info',
          target: uTgt, // 🔥 fix bug (trước bạn dùng tgtNorm sai scope)
          desc: desc || '',
          status: resolvedStatus,
          sender:
            access.role === 'MANAGER'
              ? access.requesterEmployeeId
              : (sender_id || access.requesterEmployeeId || null),
          tdept: uSafeDept,
          temp: u_safeEmp,
        },
        transaction: t,
      }
    );

    await sequelize.query(
      `DELETE FROM notification_recipient WHERE notification_id = :id`,
      { replacements: { id }, transaction: t }
    );

    if (resolvedStatus !== STATUS_DRAFT) {
      if (isCompanyWideTarget(uTgt)) {
        await sequelize.query(
          `INSERT INTO notification_recipient (notification_id, employee_id)
           SELECT :notiId, id FROM employee WHERE status = 'active'`,
          { replacements: { notiId: id }, transaction: t }
        );
      } else if (getTargetScope(uTgt) === 'department' && uSafeDept) {
        await sequelize.query(
          `INSERT INTO notification_recipient (notification_id, employee_id)
           SELECT :notiId, e.id
           FROM employee e
           JOIN "position" p ON e.position_id = p.id
           WHERE p.department_id = :deptId
             AND e.status = 'active'`,
          { replacements: { notiId: id, deptId: uSafeDept }, transaction: t }
        );
      } else if (getTargetScope(uTgt) === 'employee' && u_safeEmp) {
        await sequelize.query(
          `INSERT INTO notification_recipient (notification_id, employee_id)
           VALUES (:notiId, :empId)`,
          { replacements: { notiId: id, empId: u_safeEmp }, transaction: t }
        );
      }
    }

    await t.commit();
    res.json({ message: 'Cập nhật thông báo thành công' });

  } catch (err) {
    await t.rollback();
    console.error('❌ Lỗi cập nhật thông báo:', err);
    res.status(500).json({
      message: 'Lỗi hệ thống khi cập nhật',
      error: err.message,
    });
  }
},

// --- Admin: chi tiết ---
getNotificationById: async (req, res) => {
  try {
    const notification = await ensureNotificationAccess({
      req,
      notificationId: req.params.id,
    });

    if (!notification)
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });

    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
},

// --- Admin: chi tiết đầy đủ ---
getNotificationAdminDetail: async (req, res) => {
  try {
    const { id } = req.params;
    const allowedNotification = await ensureNotificationAccess({ req, notificationId: id });

    if (!allowedNotification)
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });

    const rows = await sequelize.query(
      `SELECT n.*,
        s.full_name AS sender_full_name,
        s.employee_code AS sender_employee_code,
        s.avatar_url AS sender_avatar_url,
        s.work_email AS sender_work_email,
        te.full_name AS target_emp_full_name,
        te.employee_code AS target_emp_code,
        td.id AS target_dept_row_id,
        td.department_name AS target_dept_name
      FROM notification n
      LEFT JOIN employee s ON n.sender_id = s.id
      LEFT JOIN employee te ON n.target_employee_id = te.id
      LEFT JOIN department td ON n.target_department_id = td.id
      WHERE n.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    const row = rows[0];

    if (!row)
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });

    const countRows = await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM notification_recipient WHERE notification_id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const recipient_count = countRows[0]?.total ?? 0;

    const RECIPIENT_LIMIT = 200;
    
    const recipients = await sequelize.query(
      `SELECT e.full_name, e.employee_code, d.department_name, d.id AS department_id
      FROM notification_recipient nr
      JOIN employee e ON nr.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department d ON p.department_id = d.id
      WHERE nr.notification_id = :id
      ORDER BY e.full_name
      LIMIT :lim`,
      {
        replacements: { id, lim: RECIPIENT_LIMIT },
        type: QueryTypes.SELECT,
      }
    );
    
    const deptRows = await sequelize.query(
      `SELECT DISTINCT d.id, d.department_name
      FROM notification_recipient nr
      JOIN employee e ON nr.employee_id = e.id
      JOIN position p ON e.position_id = p.id
      JOIN department d ON p.department_id = d.id
      WHERE nr.notification_id = :id AND d.department_name IS NOT NULL
      ORDER BY d.department_name`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    
    const department_names = deptRows.map((d) => d.department_name);
    
    const {
      sender_full_name,
      sender_employee_code,
      sender_avatar_url,
      sender_work_email,
      target_emp_full_name,
      target_emp_code,
      target_dept_row_id,
      target_dept_name,
      ...notification
    } = row;
    
    const sender = sender_full_name
      ? {
          full_name: sender_full_name,
          employee_code: sender_employee_code,
          avatar_url: sender_avatar_url,
          work_email: sender_work_email,
        }
      : null;
    
    const target_scope = {
      employee: target_emp_full_name
        ? {
            full_name: target_emp_full_name,
            employee_code: target_emp_code,
          }
        : null,
      department:
        target_dept_name != null
          ? {
              id: target_dept_row_id,
              department_name: target_dept_name,
            }
          : null,
    };
    
    let department_names_out = department_names;
    
    if (
      department_names_out.length === 0 &&
      target_scope.department?.department_name
    ) {
      department_names_out = [target_scope.department.department_name];
    }
    
    res.json({
      notification,
      sender,
      target_scope,
      recipients,
      recipient_count,
      recipients_truncated: recipient_count > recipients.length,
      department_names: department_names_out,
    });
    
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi lấy chi tiết thông báo' });
    }
    },
    
    // --- Admin: xóa ---
    deleteNotification: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { id } = req.params;
        const allowedNotification = await ensureNotificationAccess({
          req,
          notificationId: id,
          transaction: t,
        });

        if (!allowedNotification) {
          await t.rollback();
          return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }
    
        await sequelize.query(
          `DELETE FROM notification_recipient WHERE notification_id = :id`,
          { replacements: { id }, transaction: t }
        );
    
        await sequelize.query(
          `DELETE FROM notification WHERE id = :id`,
          {
            replacements: { id },
            transaction: t,
          }
        );
    
        await t.commit();
    
        res.json({ message: 'Đã xóa thông báo' });
    
      } catch (err) {
        await t.rollback();
        console.error('❌ Lỗi xóa:', err);
        res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
      }
    },
    
    // --- Nhân viên: chuông ---
    getMyBellNotifications: async (req, res) => {
      try {
        const { userId } = req.params;
    
        const query = `
          SELECT n.id, n.title, n."desc", n.content, n.target, n.status, n.notification_type, n.created_at, n.sender_id, nr.is_read
          FROM notification n
          JOIN notification_recipient nr ON n.id = nr.notification_id
          WHERE nr.employee_id = :userId
          ORDER BY n.created_at DESC
        `;
    
        const results = await sequelize.query(query, {
          replacements: { userId },
          type: QueryTypes.SELECT,
        });
    
        res.status(200).json(results);
    
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy chuông thông báo' });
      }
    },
    
    // --- Đánh dấu đã đọc ---
    markAsRead: async (req, res) => {
      try {
        const { notiId } = req.params;
        const { userId } = req.body;
    
        const query = `
          UPDATE notification_recipient 
          SET is_read = true, read_at = NOW() 
          WHERE notification_id = :notiId AND employee_id = :userId
        `;
    
        await sequelize.query(query, {
          replacements: { notiId, userId },
        });
    
        res.status(200).json({ message: 'Đã cập nhật trạng thái đọc' });
    
      } catch (error) {
        console.error('❌ Lỗi update đọc:', error);
        res.status(500).json({
          message: 'Lỗi cập nhật trạng thái',
          error: error.message,
        });
      }
    },
    
    // --- Đánh dấu tất cả đã đọc ---
    markAllAsRead: async (req, res) => {
      try {
        const { userId } = req.params;
    
        await sequelize.query(
          `
          UPDATE notification_recipient 
          SET is_read = true, read_at = NOW() 
          WHERE employee_id = :userId AND is_read = false
          `,
          { replacements: { userId } }
        );
    
        res.status(200).json({ message: 'Đã đọc tất cả thông báo' });
    
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi cập nhật' });
      }
    },
    };
    
    module.exports = notificationController;




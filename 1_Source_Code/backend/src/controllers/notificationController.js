const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

/** Đồng bộ với .data: mặc định UI là 'Toàn công ty'; DB cũ có thể còn 'Tất cả nhân viên'. */
function isCompanyWideTarget(target) {
  const t = String(target || '').trim();
  return t === 'Toàn công ty' || t === 'Tất cả nhân viên';
}

const notificationController = {
  // --- Admin: danh sách ---
  getAllNotifications: async (req, res) => {
    try {
      const notifications = await sequelize.query(
        `SELECT * FROM notification ORDER BY created_at DESC`,
        { type: QueryTypes.SELECT }
      );
      res.json(notifications);
    } catch (err) {
      console.error('🔥 Lỗi lấy thông báo:', err);
      res.status(500).json({ message: 'Lỗi lấy danh sách thông báo' });
    }
  },

  // --- Admin: tạo mới (nháp / gửi + recipient) ---
  createNotification: async (req, res) => {
    const t = await sequelize.transaction();
    try {
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

      const finalStatus = status === 'Nháp' ? 'Nháp' : 'Đã gửi';

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
      const tgtNorm = target || 'Toàn công ty';
      if (tgtNorm === 'Toàn công ty') {
        safeDeptId = null;
        safeEmpId = null;
      } else if (tgtNorm === 'Phòng ban') {
        safeEmpId = null;
      }

      const [newNotiRows] = await sequelize.query(
        `INSERT INTO notification (title, content, notification_type, target, "desc", status, sender_id, target_department_id, target_employee_id, created_at) 
         VALUES (:title, :content, :type, :target, :desc, :notiStatus, :sender, :tdept, :temp, NOW()) RETURNING id`,
        {
          replacements: {
            title,
            content,
            type: notification_type || 'info',
            target: target || 'Toàn công ty',
            desc: desc || '',
            notiStatus: finalStatus,
            sender: sender_id || null,
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

      if (finalStatus !== 'Nháp') {
        if (isCompanyWideTarget(tgtNorm)) {
          await sequelize.query(
            `INSERT INTO notification_recipient (notification_id, employee_id)
             SELECT :notiId, id FROM employee WHERE status = 'active'`,
            { replacements: { notiId: notificationId }, transaction: t }
          );
        } else if (tgtNorm === 'Phòng ban' && safeDeptId) {
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
        } else if (tgtNorm === 'Cá nhân' && safeEmpId) {
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
      res.status(201).json({ message: 'Gửi thông báo thành công', id: notificationId });
    } catch (err) {
      await t.rollback();
      console.error('🔥 Lỗi tạo thông báo:', err);
      res
        .status(500)
        .json({ message: 'Lỗi hệ thống khi lưu dữ liệu', error: err.message });
    }
  },

  // --- Admin: cập nhật ---
  updateNotification: async (req, res) => {
    const t = await sequelize.transaction();
    try {
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
        status === 'Nháp' ? 'Nháp' : status || 'Đã chỉnh sửa';

      const uDept = department_id
        ? parseInt(String(department_id), 10)
        : null;
      let uSafeDept =
        Number.isFinite(uDept) && uDept > 0 ? uDept : null;
      let u_safeEmp = employee_id || null;
      const uTgt = target || 'Toàn công ty';
      if (isCompanyWideTarget(uTgt)) {
        uSafeDept = null;
        u_safeEmp = null;
      } else if (uTgt === 'Phòng ban') {
        u_safeEmp = null;
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
            target: target || 'Toàn công ty',
            desc: desc || '',
            status: resolvedStatus,
            sender: sender_id || null,
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

      if (resolvedStatus !== 'Nháp') {
        if (isCompanyWideTarget(uTgt)) {
          await sequelize.query(
            `INSERT INTO notification_recipient (notification_id, employee_id)
            SELECT :notiId, id FROM employee WHERE status = 'active'`,
            { replacements: { notiId: id }, transaction: t }
          );
        } else if (uTgt === 'Phòng ban' && uSafeDept) {
          await sequelize.query(
            `INSERT INTO notification_recipient (notification_id, employee_id)
             SELECT :notiId, e.id
             FROM employee e
             JOIN "position" p ON e.position_id = p.id
             WHERE p.department_id = :deptId
               AND e.status = 'active'`,
            { replacements: { notiId: id, deptId: uSafeDept }, transaction: t }
          );
        } else if (uTgt === 'Cá nhân' && u_safeEmp) {
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
      console.error('🔥 Lỗi cập nhật thông báo:', err);
      res
        .status(500)
        .json({ message: 'Lỗi hệ thống khi cập nhật', error: err.message });
    }
  },

  // --- Admin: chi tiết ---
  getNotificationById: async (req, res) => {
    try {
      const [notification] = await sequelize.query(
        `SELECT * FROM notification WHERE id = :id`,
        { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
      );
      if (!notification)
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      res.json(notification);
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // --- Admin: chi tiết đầy đủ (người gửi từ employee, người nhận từ notification_recipient) ---
  getNotificationAdminDetail: async (req, res) => {
    try {
      const { id } = req.params;
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
      await sequelize.query(
        `DELETE FROM notification_recipient WHERE notification_id = :id`,
        { replacements: { id }, transaction: t }
      );
      await sequelize.query(`DELETE FROM notification WHERE id = :id`, {
        replacements: { id },
        transaction: t,
      });
      await t.commit();
      res.json({ message: 'Đã xoá thông báo' });
    } catch (err) {
      await t.rollback();
      res.status(500).json({ message: 'Lỗi khi xoá' });
    }
  },

  // --- Nhân viên: chuông ---
  getMyBellNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      const query = `
        SELECT n.id, n.title, n."desc", n.content, n.target, n.status, n.notification_type, n.created_at, nr.is_read
        FROM notification n
        JOIN notification_recipient nr ON n.id = nr.notification_id
        WHERE nr.employee_id = :userId
        ORDER BY n.created_at DESC
      `;
      const [results] = await sequelize.query(query, {
        replacements: { userId },
      });
      res.status(200).json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi lấy chuông thông báo' });
    }
  },

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
      res.status(200).json({ message: 'Đã cập nhật trạng thái đọc thành công' });
    } catch (error) {
      console.error('=== LỖI UPDATE ĐÃ ĐỌC ===', error);
      res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const { userId } = req.params;
      await sequelize.query(
        `
        UPDATE notification_recipient SET is_read = true, read_at = NOW() WHERE employee_id = :userId AND is_read = false
      `,
        { replacements: { userId } }
      );
      res.status(200).json({ message: 'Đã đọc tất cả' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi' });
    }
  },
};

module.exports = notificationController;

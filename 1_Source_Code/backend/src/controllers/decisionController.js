const db = require('../config/database');
const { sendDecisionEmail, generateDecisionPdfBuffer } = require('../services/emailService');

const getDecisionById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        d.id,
        d.decision_number,
        d.decision_type,
        d.form,
        d.amount,
        d.reason,
        d.issue_date,
        d.attachment_url,
        d.created_at,
        e.id AS employee_id,
        e.full_name AS employee_name,
        dep.department_name,
        EXISTS (
          SELECT 1
          FROM notification n
          INNER JOIN notification_recipient nr ON nr.notification_id = n.id
          WHERE nr.employee_id = d.employee_id
            AND (
              n."desc" ILIKE '%' || d.decision_number || '%'
              OR n.title ILIKE '%' || d.decision_number || '%'
            )
        ) AS notify_push_sent
      FROM hr_decision d
      INNER JOIN employee e ON d.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department dep ON p.department_id = dep.id
      WHERE d.id = :id
    `;

    const rows = await db.query(query, {
      replacements: { id },
      type: db.QueryTypes.SELECT,
    });

    if (!rows || !rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quyết định' });
    }

    const row = rows[0];
    res.status(200).json({
      success: true,
      data: {
        ...row,
        notify_push_sent: Boolean(row.notify_push_sent),
        notify_email_sent: false,
      },
    });
  } catch (error) {
    console.error('Lỗi getDecisionById:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết quyết định' });
  }
};

const updateDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision_type, form, amount, reason, issue_date } = req.body;

    const [existing] = await db.query(`SELECT id FROM hr_decision WHERE id = :id`, {
      replacements: { id },
      type: db.QueryTypes.SELECT,
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quyết định' });
    }

    const sets = [];
    const replacements = { id };

    if (decision_type != null && decision_type !== '') {
      sets.push('decision_type = :decision_type');
      replacements.decision_type = decision_type;
    }
    if (form != null && form !== '') {
      sets.push('form = :form');
      replacements.form = form;
    }
    if (reason != null && reason !== '') {
      sets.push('reason = :reason');
      replacements.reason = reason;
    }
    if (issue_date != null && issue_date !== '') {
      sets.push('issue_date = :issue_date');
      replacements.issue_date = issue_date;
    }
    if (amount !== undefined && amount !== null && amount !== '') {
      sets.push('amount = :amount');
      replacements.amount = Number(amount) || 0;
    }
    if (req.file) {
      sets.push('attachment_url = :attachment_url');
      replacements.attachment_url = `/uploads/${req.file.filename}`;
    }

    if (!sets.length) {
      return res.status(400).json({ success: false, message: 'Không có trường hợp lệ để cập nhật' });
    }

    await db.query(`UPDATE hr_decision SET ${sets.join(', ')} WHERE id = :id`, {
      replacements,
      type: db.QueryTypes.UPDATE,
    });

    const updatedRows = await db.query(
      `
      SELECT 
        d.id,
        d.decision_number,
        d.decision_type,
        d.form,
        d.amount,
        d.reason,
        d.issue_date,
        d.attachment_url,
        d.created_at,
        e.id AS employee_id,
        e.full_name AS employee_name,
        dep.department_name,
        EXISTS (
          SELECT 1
          FROM notification n
          INNER JOIN notification_recipient nr ON nr.notification_id = n.id
          WHERE nr.employee_id = d.employee_id
            AND (
              n."desc" ILIKE '%' || d.decision_number || '%'
              OR n.title ILIKE '%' || d.decision_number || '%'
            )
        ) AS notify_push_sent
      FROM hr_decision d
      INNER JOIN employee e ON d.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department dep ON p.department_id = dep.id
      WHERE d.id = :id
    `,
      { replacements: { id }, type: db.QueryTypes.SELECT }
    );

    const updated = updatedRows[0];
    res.status(200).json({
      success: true,
      message: 'Cập nhật quyết định thành công',
      data: {
        ...updated,
        notify_push_sent: Boolean(updated.notify_push_sent),
        notify_email_sent: false,
      },
    });
  } catch (error) {
    console.error('Lỗi updateDecision:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật quyết định' });
  }
};

const getDecisionDashboard = async (req, res) => {
  try {
    const { month, year, search } = req.query;
    
    // Ép kiểu về số nguyên để so sánh trong SQL
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    // 1. LẤY THỐNG KÊ
    const statsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN decision_type = 'reward' THEN amount ELSE 0 END), 0) AS total_reward,
        COUNT(CASE WHEN decision_type = 'reward' THEN 1 END) AS reward_count,
        COALESCE(SUM(CASE WHEN decision_type = 'discipline' THEN amount ELSE 0 END), 0) AS total_discipline,
        COUNT(CASE WHEN decision_type = 'discipline' THEN 1 END) AS discipline_count
      FROM hr_decision
      WHERE EXTRACT(MONTH FROM issue_date) = :month 
        AND EXTRACT(YEAR FROM issue_date) = :year
    `;

    // 2. LẤY DANH SÁCH (Thêm điều kiện lọc tháng/năm vào SQL)
    let listQuery = `
      SELECT 
        d.id, d.decision_number, d.decision_type, d.form, d.amount, d.reason, d.issue_date,
        e.full_name AS employee_name,
        dep.department_name
      FROM hr_decision d
      JOIN employee e ON d.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department dep ON p.department_id = dep.id
      WHERE EXTRACT(MONTH FROM d.issue_date) = :month 
        AND EXTRACT(YEAR FROM d.issue_date) = :year
    `;
    
    const replacements = { month: targetMonth, year: targetYear };

    if (search) {
      listQuery += ` AND (d.decision_number ILIKE :search OR e.full_name ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    listQuery += ` ORDER BY d.issue_date DESC`;

    const [stats] = await db.query(statsQuery, { replacements, type: db.QueryTypes.SELECT });
    const decisions = await db.query(listQuery, { replacements, type: db.QueryTypes.SELECT });

    res.status(200).json({
      success: true,
      data: {
        stats: stats || { total_reward: 0, reward_count: 0, total_discipline: 0, discipline_count: 0 },
        decisions
      }
    });
  } catch (error) {
    console.error('Lỗi getDecisionDashboard:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu quyết định' });
  }
};

const createDecision = async (req, res) => {
  const t = await db.transaction();

  try {
    const { 
      employee_id, decision_type, form, amount, reason, issue_date, status,
      notify_push, notify_email 
    } = req.body;

    const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!employee_id || !decision_type || !form || !reason || !issue_date) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các trường bắt buộc' });
    }

    const yearStr = new Date().getFullYear().toString().slice(2);
    const countQuery = `SELECT COUNT(*) FROM hr_decision WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    const [countResult] = await db.query(countQuery, { type: db.QueryTypes.SELECT });
    const seq = String(parseInt(countResult.count) + 1).padStart(3, '0');
    const decision_number = `QĐ-${yearStr}-${seq}`;
    
    // Tạm hardcode ID người tạo
    const issuer_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    // 1. Insert vào bảng quyết định
    const insertQuery = `
      INSERT INTO hr_decision 
        (employee_id, issuer_id, decision_number, decision_type, form, amount, reason, issue_date, attachment_url)
      VALUES 
        (:employee_id, :issuer_id, :decision_number, :decision_type, :form, :amount, :reason, :issue_date, :attachment_url)
      RETURNING *;
    `;

    const [newRecord] = await db.query(insertQuery, {
      replacements: {
        employee_id, issuer_id, decision_number, decision_type, form, 
        amount: amount ? Number(amount) : 0, reason, issue_date, attachment_url
      },
      type: db.QueryTypes.INSERT,
      transaction: t
    });

    // 2. Lấy thông tin nhân viên
    const empResult = await db.query(
      `SELECT full_name, work_email, personal_email FROM employee WHERE id = :id`, 
      { replacements: { id: employee_id }, type: db.QueryTypes.SELECT }
    );
    const empName = empResult[0]?.full_name || 'Nhân viên';
    const empEmail = empResult[0]?.personal_email || empResult[0]?.work_email;

    // 3. Xử lý Push Notification
    if (String(notify_push) === 'true' && status !== 'draft') {
      const amountNum = Number(amount) || 0;
      const amountText = amountNum.toLocaleString('vi-VN');
      const notiTitle = decision_type === 'reward' ? `🎉 Quyết định Khen thưởng: ${decision_number}` : `⚠️ Quyết định Kỷ luật: ${decision_number}`;
      const notiContent =
        decision_type === 'reward'
          ? `
            <p><strong style="color:#166534">Chúc mừng bạn!</strong> Phòng Nhân sự đã ban hành quyết định khen thưởng.</p>
            <div style="margin:10px 0;padding:10px 12px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;">
              <p style="margin:0;font-weight:700;color:#166534;">Số tiền thưởng: ${amountText} VNĐ</p>
            </div>
            <ul>
              <li><strong>Hình thức:</strong> ${form}</li>
              <li><strong>Lý do:</strong> ${reason}</li>
            </ul>
          `
          : `
            <p><strong style="color:#b91c1c">Thông báo kỷ luật</strong> từ Phòng Nhân sự.</p>
            <div style="margin:10px 0;padding:10px 12px;border:1px solid #fecaca;background:#fef2f2;border-radius:10px;">
              <p style="margin:0;font-weight:700;color:#b91c1c;">Số tiền bị khấu trừ: ${amountText} VNĐ</p>
            </div>
            <ul>
              <li><strong>Hình thức:</strong> ${form}</li>
              <li><strong>Lý do:</strong> ${reason}</li>
            </ul>
          `;

      const notiInsert = await db.query(`
        INSERT INTO notification (title, content, notification_type, target, "desc", status, sender_id, target_employee_id, created_at)
        VALUES (:title, :content, :type, 'Cá nhân', :desc, 'Đã gửi', :senderId, :empId, NOW())
        RETURNING id;
      `, {
        replacements: {
          title: notiTitle, content: notiContent, 
          type: decision_type === 'reward' ? 'info' : 'warning',
          desc: `Quyết định số ${decision_number}`,
          senderId: issuer_id,
          empId: employee_id
        },
        type: db.QueryTypes.INSERT,
        transaction: t
      });

      await db.query(`INSERT INTO notification_recipient (notification_id, employee_id) VALUES (:notiId, :empId)`, {
        replacements: { notiId: notiInsert[0][0].id, empId: employee_id },
        type: db.QueryTypes.INSERT,
        transaction: t
      });
    }

    // 4. CHỐT DB (Đảm bảo an toàn trước khi gửi Mail)
    await t.commit();

    const decisionPayload = {
      decision_number,
      decision_type,
      form,
      amount: amount ? Number(amount) : 0,
      reason,
      issue_date,
    };

    // 5. Tạo PDF + gửi email sau commit — chạy nền, không chặn phản hồi API
    if (String(notify_email) === 'true' && status !== 'draft' && empEmail) {
      void (async () => {
        try {
          const pdfBuffer = await generateDecisionPdfBuffer(empName, decisionPayload);
          await sendDecisionEmail(empEmail, empName, decisionPayload, pdfBuffer);
        } catch (err) {
          console.error('Lỗi tạo PDF / gửi email quyết định (dữ liệu đã lưu):', err);
        }
      })();
    }

    res.status(201).json({ success: true, message: 'Ban hành quyết định thành công', data: newRecord[0] });

  } catch (error) {
    if (!t.finished) { await t.rollback(); } // Rollback an toàn
    console.error('Lỗi createDecision:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo quyết định' });
  }
};

module.exports = { getDecisionDashboard, getDecisionById, createDecision, updateDecision };
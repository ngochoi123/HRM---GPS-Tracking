const { Ollama } = require('ollama');
const { Op, QueryTypes } = require('sequelize');
const { Employee, AIAlert, UserAccount, sequelize, Position, Department, Attendance, HRDecision } = require('../models');
const { haversineDistanceMeters } = require('../utils/geoUtils');


const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000;
const ollama = new Ollama({ host: 'http://localhost:11434' });

exports.testLocalAI = async (req, res) => {
  try {
    const response = await ollama.chat({
      model: 'qwen2.5:3b',
      messages: [
        { role: 'system', content: 'Bạn là một trợ lý nhân sự thông minh.' },
        { role: 'user', content: 'Xin chào, bạn có thể giúp gì cho hệ thống quản lý nhân sự của tôi?' }
      ],
    });

    return res.status(200).json({ success: true, message: 'Kết nối AI thành công', data: response.message.content });
  } catch (error) {
    console.error('❌ Lỗi kết nối Ollama:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Không thể kết nối đến Ollama. Hãy đảm bảo Ollama đang chạy và model "qwen2" đã được pull.', 
      error: error.message,
      suggestion: 'Thử chạy lệnh: ollama run qwen2'
    });
  }
};

// Helper: Tính tổng ngày làm việc (trừ T7 + CN) từ startDate đến HÔM QUA
// Không bao gồm ngày hôm nay (vì chưa kết thúc ca)
function getPastWorkingDays(startDate, today) {
  let count = 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  while (cursor <= yesterday) {
    const dow = cursor.getDay(); // 0=CN, 6=T7
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

exports.analyzeTurnoverRisk = async (req, res) => {
  try {
    const currentUser = req.user; 
    if (!currentUser) return res.status(401).json({ message: 'Chưa xác thực người dùng' });

    const whereClause = { status: 'active' };

    // ═══════════════════════════════════════════════════════════════
    // RÀNG BUỘC PHÂN QUYỀN (RBAC) — GIỮ NGUYÊN
    // ═══════════════════════════════════════════════════════════════
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({
          where: { [Op.or]: [ { id: currentUser.id }, { employee_id: currentUser.id } ] }
        });
        if (ua) managerEmployeeId = ua.employee_id;
        else managerEmployeeId = currentUser.id;
      }
      whereClause.direct_manager_id = managerEmployeeId;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const employees = await Employee.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'join_date'],
      include: [
        {
          model: Position, as: 'position', attributes: ['position_name'],
          include: [{ model: Department, as: 'department', attributes: ['department_name'] }]
        }
      ]
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có nhân viên nào thuộc quyền quản lý của bạn.' });
    }

    const empIds = employees.map(e => e.id);
    const empMap = {}; // { id: { full_name, ... stats } }
    for (const emp of employees) {
      const joinDate = emp.join_date ? new Date(emp.join_date) : null;
      const seniorityMonths = joinDate
        ? Math.floor((Date.now() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
        : null;

      empMap[emp.id] = { 
        full_name: emp.full_name,
        position: emp.position?.position_name || 'Chưa rõ',
        department: emp.position?.department?.department_name || 'Chưa rõ',
        seniority_months: seniorityMonths,
        presentCount: 0, 
        totalWorkHours: 0,
        otHours: 0,
        approvedLeaveCount: 0, 
        lateCount: 0, 
        earlyLeaveCount: 0, 
        disciplineCount: 0, 
        rewardCount: 0, 
        gpsFraudCount: 0 
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 1: PRE-AGGREGATION — Loại bỏ N+1 Query
    // ═══════════════════════════════════════════════════════════════

    // 1a. Lấy bản ghi chấm công (total_work_hours) — GROUP BY employee_id
    //     Chỉ lấy ngày HOÀN CHỈNH (< hôm nay) để tránh sai khi NV chưa checkout.
    const attendanceRows = await sequelize.query(
      `SELECT employee_id, attendance_date, total_work_hours
       FROM attendance
       WHERE employee_id IN (:empIds)
         AND attendance_date >= :startDate
         AND attendance_date < CURRENT_DATE
         AND check_in_time IS NOT NULL`,
      { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT }
    );

    // Tính hệ số công (giống PayrollController) rồi cộng dồn theo employee_id
    const STANDARD_DAY_HOURS = 8;
    for (const row of attendanceRows) {
      const stat = empMap[row.employee_id];
      if (!stat) continue;
      const rawHours = parseFloat(row.total_work_hours || 0);
      stat.totalWorkHours += rawHours;
      
      // Tính OT (giờ vượt mức 8h)
      if (rawHours > STANDARD_DAY_HOURS) {
        stat.otHours += (rawHours - STANDARD_DAY_HOURS);
      }

      const workHours = Math.min(Math.max(rawHours, 0), STANDARD_DAY_HOURS);
      const cong = Math.min(workHours / STANDARD_DAY_HOURS, 1);
      stat.presentCount += cong;
    }
    // Làm tròn
    for (const id of empIds) {
      empMap[id].presentCount = Math.round(empMap[id].presentCount * 100) / 100;
      empMap[id].totalWorkHours = Math.round(empMap[id].totalWorkHours * 100) / 100;
      empMap[id].otHours = Math.round(empMap[id].otHours * 100) / 100;
    }

    // 1b. Đếm đi trễ + về sớm — GROUP BY employee_id, status
    const lateEarlyRows = await sequelize.query(
      `SELECT employee_id, status, COUNT(*)::int AS count
       FROM attendance
       WHERE employee_id IN (:empIds)
         AND status IN ('late', 'early_leave')
         AND attendance_date >= :startDate
       GROUP BY employee_id, status`,
      { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT }
    );
    for (const row of lateEarlyRows) {
      const stat = empMap[row.employee_id];
      if (!stat) continue;
      if (row.status === 'late') stat.lateCount = row.count;
      if (row.status === 'early_leave') stat.earlyLeaveCount = row.count;
    }

    // 1c. Số ngày nghỉ CÓ PHÉP (approved) — GROUP BY employee_id
    //     Dùng generate_series để đếm từng ngày, lọc T7/CN
    const leaveRows = await sequelize.query(
      `SELECT lr.employee_id, COUNT(DISTINCT d::date)::int AS leave_days
       FROM leave_request lr,
            generate_series(
              GREATEST(lr.start_datetime::date, :startDate::date),
              LEAST(lr.end_datetime::date, (CURRENT_DATE - INTERVAL '1 day')::date),
              '1 day'
            ) AS d
       WHERE lr.employee_id IN (:empIds)
         AND lr.status = 'approved'
         AND lr.start_datetime::date <= (CURRENT_DATE - INTERVAL '1 day')::date
         AND lr.end_datetime::date >= :startDate::date
         AND EXTRACT(DOW FROM d) NOT IN (0, 6)
       GROUP BY lr.employee_id`,
      { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT }
    );
    for (const row of leaveRows) {
      const stat = empMap[row.employee_id];
      if (stat) stat.approvedLeaveCount = row.leave_days;
    }

    // 1d. Khen thưởng / kỷ luật — GROUP BY employee_id, decision_type
    const decisionRows = await sequelize.query(
      `SELECT employee_id, decision_type, COUNT(*)::int AS count
       FROM hr_decision
       WHERE employee_id IN (:empIds)
         AND decision_type IN ('discipline', 'reward')
         AND issue_date >= :startDate
       GROUP BY employee_id, decision_type`,
      { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT }
    );
    for (const row of decisionRows) {
      const stat = empMap[row.employee_id];
      if (!stat) continue;
      if (row.decision_type === 'discipline') stat.disciplineCount = row.count;
      if (row.decision_type === 'reward') stat.rewardCount = row.count;
    }

    // 1e. Phát hiện gian lận GPS — So sánh toạ độ check-in với work_location được phân công
    //     JOIN attendance → work_location (qua attendance.work_location_id)
    //     Dùng Haversine SQL để tính khoảng cách, đếm số lần vượt radius
    const gpsFraudRows = await sequelize.query(
      `SELECT
         a.employee_id,
         COUNT(*)::int AS fraud_count
       FROM attendance a
       JOIN work_location wl ON wl.id = a.work_location_id
       WHERE a.employee_id IN (:empIds)
         AND a.attendance_date >= :startDate
         AND a.attendance_date < CURRENT_DATE
         AND a.check_in_latitude IS NOT NULL
         AND a.check_in_longitude IS NOT NULL
         AND wl.latitude IS NOT NULL
         AND wl.longitude IS NOT NULL
         AND wl.radius_meters IS NOT NULL
         AND (
           6371000 * acos(
             LEAST(1.0, GREATEST(-1.0,
               cos(radians(wl.latitude)) * cos(radians(a.check_in_latitude))
               * cos(radians(a.check_in_longitude) - radians(wl.longitude))
               + sin(radians(wl.latitude)) * sin(radians(a.check_in_latitude))
             ))
           ) > wl.radius_meters
         )
       GROUP BY a.employee_id`,
      { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT }
    );
    for (const row of gpsFraudRows) {
      const stat = empMap[row.employee_id];
      if (stat) stat.gpsFraudCount = row.fraud_count;
    }

    // 1f. Tính pastWorkingDays (chung cho tất cả) + absentCount cho từng người
    const pastWorkingDays = getPastWorkingDays(thirtyDaysAgo, new Date());

    const employeeStats = empIds.map(id => {
      const s = empMap[id];
      const absentCount = Math.max(0, pastWorkingDays - s.presentCount - s.approvedLeaveCount);
      // 📊 DEBUG LOG
      console.log(`📊 [AI] ${s.full_name}: WorkDays=${pastWorkingDays} | Present=${s.presentCount} | TotalHrs=${s.totalWorkHours} | OT=${s.otHours} | Absent=${absentCount} | GPS_Fraud=${s.gpsFraudCount}`);
      return { id, ...s, pastWorkingDays, absentCount };
    });

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 1.1: KIỂM TRA THAY ĐỔI DỮ LIỆU — Tránh phân tích lại nếu stats giữ nguyên
    // ═══════════════════════════════════════════════════════════════
    const existingAlerts = await AIAlert.findAll({
      where: { employee_id: empIds, alert_type: 'TURNOVER_RISK' }
    });

    const alertMap = {};
    existingAlerts.forEach(a => { alertMap[a.employee_id] = a; });

    const employeesToProcess = employeeStats.filter(s => {
      const existing = alertMap[s.id];
      if (!existing) return true;

      try {
        const msgObj = JSON.parse(existing.message);
        const lastStats = msgObj.last_stats;
        if (!lastStats) return true;

        const isChanged = 
          s.presentCount !== lastStats.presentCount ||
          s.absentCount !== lastStats.absentCount ||
          s.lateCount !== lastStats.lateCount ||
          s.earlyLeaveCount !== lastStats.earlyLeaveCount ||
          s.approvedLeaveCount !== lastStats.approvedLeaveCount ||
          s.disciplineCount !== lastStats.disciplineCount ||
          s.rewardCount !== lastStats.rewardCount ||
          s.gpsFraudCount !== lastStats.gpsFraudCount;

        return isChanged;
      } catch (e) {
        return true;
      }
    });

    if (employeesToProcess.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Dữ liệu nhân sự không có thay đổi mới so với lần phân tích gần nhất. Không cần xử lý lại.',
        data: [] 
      });
    }
    

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 2: BATCH PROCESSING — Gộp prompt cho Ollama
    // ═══════════════════════════════════════════════════════════════
    const BATCH_SIZE = 3; // Giảm xuống 3 để output JSON mở rộng vừa context window qwen2.5:3b
    const results = [];

    for (let i = 0; i < employeesToProcess.length; i += BATCH_SIZE) {
      const batch = employeesToProcess.slice(i, i + BATCH_SIZE);

      // Xây dựng danh sách nhân viên cho prompt
      const employeeListText = batch.map((s, idx) => {
        const attendanceRate = s.pastWorkingDays > 0 ? Math.round((s.presentCount / s.pastWorkingDays) * 100) : 0;
        return `
Nhân viên ${idx + 1} (employee_id: "${s.id}"):
  - Tên: ${s.full_name}
  - Chức vụ: ${s.position} | Phòng ban: ${s.department}
  - Thâm niên: ${s.seniority_months != null ? s.seniority_months + ' tháng' : 'Chưa rõ'}
  - Tổng ngày làm việc chuẩn (trừ T7, CN): ${s.pastWorkingDays} ngày
  - Ngày công thực tế: ${s.presentCount} ngày (Tỷ lệ chuyên cần: ${attendanceRate}%)
  - Tổng giờ làm thực tế: ${s.totalWorkHours} giờ | Giờ tăng ca (OT): ${s.otHours} giờ
  - Ngày nghỉ có phép (đã duyệt): ${s.approvedLeaveCount} ngày
  - Nghỉ KHÔNG lý do: ${s.absentCount} ngày
  - Đi trễ: ${s.lateCount} lần | Về sớm: ${s.earlyLeaveCount} lần
  - Kỷ luật: ${s.disciplineCount} lần | Khen thưởng: ${s.rewardCount} lần
  - Gian lận GPS (chấm công ngoài vùng cho phép): ${s.gpsFraudCount} lần`;
      }).join('\n');

      const batchPrompt = `
Phân tích rủi ro nghỉ việc CHUYÊN SÂU cho ${batch.length} nhân viên trong 30 ngày qua:
${employeeListText}

Quy tắc đánh giá risk_level (HIGH/MEDIUM/LOW):
- Nghỉ không lý do >= 3 ngày → "HIGH"
- Gian lận GPS >= 2 lần → "HIGH" (gian lận nghiêm trọng)
- Đi trễ + về sớm >= 5 lần hoặc có kỷ luật → >= "MEDIUM"
- Có khen thưởng, chuyên cần tốt, OT cao → có thể "LOW"
- Nhân viên mới (< 6 tháng) nghỉ nhiều → nguy cơ cao hơn bình thường

Trả về MỘT MẢNG JSON gồm ${batch.length} phần tử, cấu trúc:
[
  {
    "employee_id": "uuid của nhân viên",
    "risk_level": "HIGH" hoặc "MEDIUM" hoặc "LOW",
    "risk_score": <số nguyên từ 0 đến 100, 100 = nguy cơ cao nhất>,
    "summary": "Tóm tắt 2-3 câu: tình trạng tổng quan và dấu hiệu đáng lo ngại nhất.",
    "analysis": {
      "key_concerns": ["Liệt kê 2-4 vấn đề chính đáng lo ngại"],
      "positive_signals": ["Liệt kê 1-2 điểm tích cực nếu có, hoặc mảng rỗng"],
      "behavior_pattern": "Mô tả xu hướng hành vi: VD 'Giảm dần động lực', 'Bất mãn gia tăng', 'Ổn định'"
    },
    "retention_strategy": [
      {
        "action": "Hành động cụ thể cần thực hiện",
        "priority": "URGENT" hoặc "HIGH" hoặc "MEDIUM" hoặc "LOW",
        "timeline": "Trong 3 ngày" hoặc "Trong 1 tuần" hoặc "Trong 2 tuần" hoặc "Trong 1 tháng"
      }
    ],
    "suggested_action": {
      "type": "reward" hoặc "discipline" hoặc "monitor" hoặc "meeting",
      "reason": "Lý do ngắn gọn cho đề xuất này"
    },
    "recommendations": ["Đề xuất hành động 1", "Đề xuất hành động 2", "Đề xuất hành động 3"]
  }
]
CHỈ trả về mảng JSON. KHÔNG kèm text giải thích bên ngoài.`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

        const response = await ollama.chat({
          model: 'qwen2.5:3b',
          messages: [
            { role: 'system', content: `Bạn là Giám đốc Nhân sự (CHRO) với 15 năm kinh nghiệm quản trị nhân sự tại doanh nghiệp Việt Nam.
Nhiệm vụ: Phân tích chuyên sâu rủi ro nhân sự, đưa ra đánh giá chi tiết và chiến lược giữ chân nhân viên cụ thể.
Phong cách: Chuyên nghiệp, dựa trên dữ liệu, nhưng cũng thể hiện sự thấu hiểu con người.
Luôn trả lời bằng định dạng JSON Array thuần. KHÔNG bọc trong object.` },
            { role: 'user', content: batchPrompt }
          ],
          format: 'json',
          keep_alive: '10m',
          options: { num_ctx: 8192, temperature: 0.3 }
        });

        clearTimeout(timeoutId);

        // ═══════════════════════════════════════════════════════════════
        // BƯỚC 3: PARSE JSON + LƯU DATABASE HÀNG LOẠT
        // ═══════════════════════════════════════════════════════════════
        let aiResults;
        const rawContent = response.message.content;

        try {
          const parsed = JSON.parse(rawContent);
          // Ollama format:'json' có thể trả object wrapper thay vì array thuần
          if (Array.isArray(parsed)) {
            aiResults = parsed;
          } else if (parsed.results && Array.isArray(parsed.results)) {
            aiResults = parsed.results;
          } else if (parsed.employees && Array.isArray(parsed.employees)) {
            aiResults = parsed.employees;
          } else if (parsed.data && Array.isArray(parsed.data)) {
            aiResults = parsed.data;
          } else {
            // Nếu AI trả về object đơn lẻ (batch=1), bọc thành mảng
            aiResults = [parsed];
          }
        } catch (jsonErr) {
          console.error(`❌ [AI Batch ${i / BATCH_SIZE + 1}] JSON parse thất bại:`, jsonErr.message);
          console.error(`   Raw response: ${rawContent.substring(0, 300)}...`);
          // Fallback: tạo kết quả mặc định cho batch này
          aiResults = batch.map(s => ({
            employee_id: s.id,
            risk_level: s.absentCount >= 3 ? 'HIGH' : s.absentCount >= 1 ? 'MEDIUM' : 'LOW',
            summary: 'Không thể phân tích AI — sử dụng đánh giá dựa trên quy tắc.',
            recommendations: ['Cần kiểm tra lại dữ liệu chấm công.']
          }));
        }

        // Xoá alert cũ của tất cả NV trong batch + bulkCreate alert mới
        const batchEmpIds = batch.map(s => s.id);
        await AIAlert.destroy({ where: { employee_id: batchEmpIds, alert_type: 'TURNOVER_RISK' } });

        const alertsToCreate = [];
        for (const ai of aiResults) {
          // Validate employee_id có thuộc batch không
          const matchedStat = batch.find(s => s.id === ai.employee_id);
          if (!matchedStat) {
            console.warn(`⚠ [AI] employee_id "${ai.employee_id}" không tìm thấy trong batch, bỏ qua.`);
            continue;
          }

          const riskLevel = ['HIGH', 'MEDIUM', 'LOW'].includes(ai.risk_level) ? ai.risk_level : 'MEDIUM';
          alertsToCreate.push({
            employee_id: ai.employee_id,
            alert_type: 'TURNOVER_RISK',
            risk_level: riskLevel,
            message: JSON.stringify({ 
              summary: ai.summary || '', 
              recommendations: ai.recommendations || [],
              last_stats: {
                presentCount: matchedStat.presentCount,
                totalWorkHours: matchedStat.totalWorkHours,
                otHours: matchedStat.otHours,
                absentCount: matchedStat.absentCount,
                lateCount: matchedStat.lateCount,
                earlyLeaveCount: matchedStat.earlyLeaveCount,
                approvedLeaveCount: matchedStat.approvedLeaveCount,
                disciplineCount: matchedStat.disciplineCount,
                rewardCount: matchedStat.rewardCount,
                gpsFraudCount: matchedStat.gpsFraudCount
              }
            }),
            status: 'PENDING'
          });
        }

        if (alertsToCreate.length > 0) {
          const newAlerts = await AIAlert.bulkCreate(alertsToCreate);
          for (const alert of newAlerts) {
            const stat = empMap[alert.employee_id];
            results.push({ employee: stat?.full_name || alert.employee_id, alert });
          }
        }

        console.log(`✅ [AI Batch ${Math.floor(i / BATCH_SIZE) + 1}] Đã xử lý ${batch.length} nhân viên, tạo ${alertsToCreate.length} alert.`);

      } catch (batchErr) {
        console.error(`❌ [AI Batch ${Math.floor(i / BATCH_SIZE) + 1}] Lỗi:`, batchErr.message);
        if (batchErr.name === 'AbortError') {
          console.error('   -> Lý do: Timeout (Quá 5 phút)');
        }
        
        // Batch bị lỗi → tạo fallback alert dựa trên rule
        const batchEmpIds = batch.map(s => s.id);
        await AIAlert.destroy({ where: { employee_id: batchEmpIds, alert_type: 'TURNOVER_RISK' } });

        const fallbackAlerts = batch.map(s => ({
          employee_id: s.id,
          alert_type: 'TURNOVER_RISK',
          risk_level: s.absentCount >= 3 ? 'HIGH' : s.absentCount >= 1 ? 'MEDIUM' : 'LOW',
          message: JSON.stringify({ 
            summary: 'AI tạm thời không khả dụng — đánh giá theo quy tắc tự động.', 
            recommendations: ['Kiểm tra kết nối Ollama.'],
            last_stats: {
              presentCount: s.presentCount,
              totalWorkHours: s.totalWorkHours,
              otHours: s.otHours,
              absentCount: s.absentCount,
              lateCount: s.lateCount,
              earlyLeaveCount: s.earlyLeaveCount,
              approvedLeaveCount: s.approvedLeaveCount,
              disciplineCount: s.disciplineCount,
              rewardCount: s.rewardCount,
              gpsFraudCount: s.gpsFraudCount
            }
          }),
          status: 'PENDING'
        }));
        const created = await AIAlert.bulkCreate(fallbackAlerts);
        for (const alert of created) {
          const stat = empMap[alert.employee_id];
          results.push({ employee: stat?.full_name || alert.employee_id, alert });
        }
      }
    }

    return res.status(200).json({ success: true, data: results });

  } catch (error) {
    console.error('Lỗi khi phân tích rủi ro:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getAIAlerts = async (req, res) => {
  try {
    const currentUser = req.user;
    let employeeWhere = {};
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({
          where: { [Op.or]: [ { id: currentUser.id }, { employee_id: currentUser.id } ] }
        });
        if (ua) managerEmployeeId = ua.employee_id;
        else managerEmployeeId = currentUser.id;
      }
      employeeWhere.direct_manager_id = managerEmployeeId;
    }

    const alerts = await AIAlert.findAll({
      include: [{ 
        model: Employee, 
        as: 'employee', 
        attributes: ['id', 'full_name', 'position_id'], 
        where: employeeWhere ,
        include: [{ model: Position, as: 'position', attributes: ['position_name'] }]
      }],
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cảnh báo AI:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /ai/recommendations — Chuyển đổi AIAlert thành Đề xuất K/T & KL
// ═══════════════════════════════════════════════════════════════
exports.getRecommendations = async (req, res) => {
  try {
    const currentUser = req.user;
    let employeeWhere = {};

    // RBAC
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({
          where: { [Op.or]: [{ id: currentUser.id }, { employee_id: currentUser.id }] }
        });
        managerEmployeeId = ua ? ua.employee_id : currentUser.id;
      }
      employeeWhere.direct_manager_id = managerEmployeeId;
    }

    const alerts = await AIAlert.findAll({
      where: { alert_type: 'TURNOVER_RISK' },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'full_name', 'position_id'],
        where: employeeWhere,
        include: [{ model: Position, as: 'position', attributes: ['position_name'] }]
      }],
      order: [['updated_at', 'DESC']]
    });

    const recommendations = [];

    for (const alert of alerts) {
      const emp = alert.employee;
      if (!emp) continue;

      let msgObj = {};
      try { msgObj = JSON.parse(alert.message || '{}'); } catch (_) {}

      const stats = msgObj.last_stats || {};
      const summary = msgObj.summary || '';
      const aiRecommendations = msgObj.recommendations || [];

      const today = new Date().toISOString().slice(0, 10);

      // ─── Đề xuất KỶ LUẬT khi rủi ro HIGH hoặc MEDIUM ───
      if (alert.risk_level === 'HIGH' || alert.risk_level === 'MEDIUM') {
        const reasons = [];
        if (stats.absentCount >= 3) reasons.push(`Nghỉ không lý do ${stats.absentCount} ngày`);
        else if (stats.absentCount >= 1) reasons.push(`Nghỉ không lý do ${stats.absentCount} ngày`);
        if (stats.lateCount >= 3) reasons.push(`Đi trễ ${stats.lateCount} lần`);
        if (stats.earlyLeaveCount >= 3) reasons.push(`Về sớm ${stats.earlyLeaveCount} lần`);
        if (stats.gpsFraudCount >= 1) reasons.push(`Gian lận GPS ${stats.gpsFraudCount} lần`);
        if (stats.disciplineCount >= 1) reasons.push(`Đã có ${stats.disciplineCount} lần kỷ luật trước`);

        const reason = reasons.length > 0
          ? reasons.join('; ') + '. ' + summary
          : summary || 'Rủi ro nghỉ việc cao theo phân tích AI.';

        recommendations.push({
          id: `disc-${alert.id}`,
          alert_id: alert.id,
          employee_id: emp.id,
          employee_name: emp.full_name,
          position_name: emp.position?.position_name || '',
          recommendation_type: 'discipline',
          risk_level: alert.risk_level,
          reason,
          ai_recommendations: aiRecommendations,
          proposed_by: 'Hệ thống AI',
          stats,
          // Dữ liệu điền sẵn cho DecisionForm
          prefill: {
            employee_id: emp.id,
            decision_type: 'discipline',
            form: stats.gpsFraudCount >= 2 || stats.absentCount >= 5 ? 'warning' : 'money',
            issue_date: today,
            reason: `${reason} (Đề xuất bởi: Hệ thống AI)`
          }
        });
      }

      // ─── Đề xuất KHEN THƯỞNG khi rủi ro LOW + chuyên cần tốt ───
      if (
        alert.risk_level === 'LOW' &&
        (stats.absentCount || 0) === 0 &&
        (stats.lateCount || 0) === 0 &&
        (stats.gpsFraudCount || 0) === 0 &&
        (stats.otHours >= 10 || stats.presentCount >= 20) // Tiêu chí mới: OT > 10h hoặc đi làm > 20 ngày
      ) {
        let rewardReason = "";
        if (stats.otHours >= 10) {
          rewardReason = `Cống hiến xuất sắc với ${stats.otHours} giờ tăng ca trong 30 ngày qua.`;
        } else {
          rewardReason = `Duy trì kỷ luật chuyên cần tuyệt đối với ${stats.presentCount} ngày công trọn vẹn.`;
        }

        const reason = `${rewardReason} (Chỉ số: Không đi trễ, không nghỉ không phép). ${summary}`.trim();

        recommendations.push({
          id: `rew-${alert.id}`,
          alert_id: alert.id,
          employee_id: emp.id,
          employee_name: emp.full_name,
          position_name: emp.position?.position_name || '',
          recommendation_type: 'reward',
          risk_level: 'LOW',
          reason,
          ai_recommendations: aiRecommendations,
          proposed_by: 'Hệ thống AI',
          stats,
          prefill: {
            employee_id: emp.id,
            decision_type: 'reward',
            form: 'money',
            issue_date: today,
            reason: `${reason} (Đề xuất bởi: Hệ thống AI)`
          }
        });
      }
    }

    return res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đề xuất:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
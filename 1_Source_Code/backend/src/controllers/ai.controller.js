const { Ollama } = require('ollama');
const { Op, QueryTypes } = require('sequelize');
const { Employee, AIAlert, UserAccount, sequelize, Position, Department, Attendance, HRDecision } = require('../models');
const { haversineDistanceMeters } = require('../utils/geoUtils');


const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000;
const ollama = new Ollama({ host: 'http://localhost:11434' });

exports.testLocalAI = async (req, res) => {
  try {
    const response = await ollama.chat({
      model: 'qwen2.5:7b',
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
  const limit = new Date(today);
  limit.setHours(23, 59, 59, 999);

  while (cursor <= limit) {
    const dow = cursor.getDay(); // 0=CN
    if (dow !== 0) count++;
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

    // Phân tích theo tháng hiện tại (kông có ngày tương lai)
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Ngày 1 của tháng hiện tại
    const startDateStr = monthStart.toISOString().slice(0, 10);
    const monthLabel = `${today.getMonth() + 1}/${today.getFullYear()}`;
    console.log(`\n📅 [AI] Phân tích tháng: ${monthLabel} (từ ${startDateStr} đến ngày ${today.getDate() - 1}/${today.getMonth() + 1})`);

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
         AND attendance_date <= CURRENT_DATE
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
              LEAST(lr.end_datetime::date, CURRENT_DATE),
              '1 day'
            ) AS d
       WHERE lr.employee_id IN (:empIds)
         AND lr.status = 'approved'
         AND lr.start_datetime::date <= CURRENT_DATE
         AND lr.end_datetime::date >= :startDate::date
         AND EXTRACT(DOW FROM d) <> 0
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
         AND a.attendance_date <= CURRENT_DATE
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

    // 1f. Tính pastWorkingDays (chủ tính các ngày đã diễn ra trong tháng, tới hôm qua)
    const pastWorkingDays = getPastWorkingDays(monthStart, today);

    const employeeStats = empIds.map(id => {
      const s = empMap[id];
      const absentCount = Math.max(0, Math.round((pastWorkingDays - s.presentCount - s.approvedLeaveCount) * 100) / 100);
      // 📊 DEBUG LOG
      console.log(`📊 [AI] ${s.full_name}: WorkDays=${pastWorkingDays} | Present=${s.presentCount} | TotalHrs=${s.totalWorkHours} | OT=${s.otHours} | Absent=${absentCount} | GPS_Fraud=${s.gpsFraudCount}`);
      return { id, ...s, pastWorkingDays, absentCount };
    });

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 1.1: KIỂM TRA THAY ĐỔI DỮ LIỆU (Tạm thời bỏ qua theo yêu cầu để xử lý lại toàn bộ)
    // ═══════════════════════════════════════════════════════════════
    /*
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
    */
    
    // Gán trực tiếp để xử lý lại toàn bộ dữ liệu
    const employeesToProcess = employeeStats;
    

    // ═══════════════════════════════════════════════════════════════
    // BƯỚC 2: BATCH PROCESSING — Gộp prompt cho Ollama
    // ═══════════════════════════════════════════════════════════════
    const BATCH_SIZE = 1; // 1:1 — Mỗi nhân viên 1 lượt AI để đảm bảo không rớt dữ liệu và insight sâu nhất.
    const totalBatches = Math.ceil(employeesToProcess.length / BATCH_SIZE);
    console.log(`⏳ [AI] Bắt đầu phân tích ${employeesToProcess.length} nhân viên, tổng ${totalBatches} batch...\n`);
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
  - Tổng ngày làm việc chuẩn (trừ CN): ${s.pastWorkingDays} ngày
  - Ngày công thực tế: ${s.presentCount} ngày (Tỷ lệ chuyên cần: ${attendanceRate}%)
  - Tổng giờ làm thực tế: ${s.totalWorkHours} giờ | Giờ tăng ca (OT): ${s.otHours} giờ
  - Ngày nghỉ có phép (đã duyệt): ${s.approvedLeaveCount} ngày
  - Nghỉ KHÔNG lý do: ${s.absentCount} ngày
  - Đi trễ (sau 7h00): ${s.lateCount} lần | Về sớm (trước 17h00): ${s.earlyLeaveCount} lần
  - Kỷ luật: ${s.disciplineCount} lần | Khen thưởng: ${s.rewardCount} lần
  - Gian lận GPS (chấm công ngoài vùng cho phép): ${s.gpsFraudCount} lần`;
      }).join('\n');

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const empName = batch.map(s => s.full_name).join(', ');
      console.log(`⏳ [AI Batch ${batchNum}/${totalBatches}] Đang gửi Ollama: ${empName}...`);

const batchPrompt = `
Phân tích rủi ro nghỉ việc CHUYÊN SÂU cho ${batch.length} nhân viên trong tháng ${monthLabel} dựa trên các số liệu sau:
(Lưu ý: Tháng ${monthLabel} hiện tại có ${pastWorkingDays} ngày làm việc đã diễn ra, không kể ngày hôm nay và chủ nhật)
${employeeListText}

Quy tắc đánh giá risk_level (HIGH/MEDIUM/LOW):
- Nghỉ không lý do >= 5 ngày → "HIGH" (bắt buộc)
- Nghỉ không lý do >= 3 ngày → ít nhất "MEDIUM"
- Gian lận GPS >= 2 lần → "HIGH" (gian lận nghiêm trọng)
- Đi trễ + về sớm >= 5 lần (cộng tổng) → "HIGH" (mất kỷ luật)
- Đi trễ + về sớm >= 3 lần (cộng tổng) → ít nhất "MEDIUM"
- Có kỷ luật → ít nhất "MEDIUM"
- Có khen thưởng, chuyên cần tốt (đi trễ 0 lần, nghỉ phép hợp lệ), OT cao → "LOW"
- Nhân viên mới (< 6 tháng) nghỉ nhiều hoặc đi trễ liên tục → nguy cơ cao hơn bình thường

YÊU CẦU ĐẶC BIỆT VỀ SỐ LIỆU VÀ XU HƯỚNG:
- BẮT BUỘC đưa các con số cụ thể vào lý do cảnh báo (VD: "Nghỉ không phép 4 ngày", "Đi trễ 5 lần", "Đã bị kỷ luật 2 lần").
- Đánh giá rõ xu hướng hành vi (VD: "Xu hướng đi trễ lặp lại nhiều lần cho thấy sự giảm sút về kỷ luật", "Liên tục vắng mặt không lý do báo hiệu rủi ro bỏ việc").

Trả về MỘT MẢNG JSON đúng thứ tự, gồm ${batch.length} phần tử (mỗi phần tử ứng với 1 nhân viên theo thứ tự trên):
[
  {
    "employee_id": "<UUID của nhân viên>",
    "risk_level": "HIGH" | "MEDIUM" | "LOW",
    "risk_score": <0-100>,
    "summary": "3-4 câu. PHẢI có số liệu cụ thể. VD: Trong 21 ngày làm việc, nhân viên chỉ có mặt 3 ngày (14%), nghỉ không lý do tới 18 ngày. Không có hồ sơ đi trễ hay gian lận GPS nhưng tỷ lệ vắng mặt cực cao cho thấy nguy cơ đã bỏ việc trên thực tế.",
    "analysis": {
      "key_concerns": [
        "Vấn đề 1 KÈM SỐ LIỆU và phân tích nguyên nhân khả năng",
        "Vấn đề 2 KÈM SỐ LIỆU và hệ quả nếu không xử lý",
        "Vấn đề 3 (nếu có)"
      ],
      "positive_signals": ["Điểm tích cực KÈM SỐ LIỆU, hoặc [] nếu không có"],
      "behavior_pattern": "Mô tả xu hướng hành vi chi tiết: nguyên nhân khả năng + dự đoán diễn biến nếu không can thiệp"
    },
    "retention_strategy": [
      {
        "action": "Hành động cụ thể, ai thực hiện, cách thực hiện",
        "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW",
        "timeline": "Trong 3 ngày" | "Trong 1 tuần" | "Trong 2 tuần"
      },
      {
        "action": "Hành động thứ 2",
        "priority": "MEDIUM",
        "timeline": "Trong 1 tuần"
      }
    ],
    "suggested_action": {
      "type": "reward" | "discipline" | "monitor" | "meeting",
      "reason": "Lý do cụ thể dựa trên số liệu"
    },
    "recommendations": [
      "Đề xuất chi tiết 1 (ai làm, làm gì, khi nào)",
      "Đề xuất chi tiết 2",
      "Đề xuất chi tiết 3"
    ]
  }
]
CHỈ trả về mảng JSON. KHÔNG kèm text giải thích bên ngoài.`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

        const response = await ollama.chat({
          model: 'qwen2.5:7b',
          messages: [
            { role: 'system', content: `Bạn là Trưởng phòng Nhân sự (HR Manager) với 15 năm kinh nghiệm tại doanh nghiệp Việt Nam.
Nhiệm vụ của bạn: Đọc số liệu chấm công và hành vi làm việc, sau đó đưa ra ĐÁNH GIÁ CHUYÊN SÂU, CÓ CHIỀU SÂU PHÂN TÍCH về từng nhân viên.
Yêu cầu bắt buộc:
1. BẮT BUỘC trả lời hoàn toàn bằng tiếng Việt.
2. LUÔN dùng số liệu cụ thể để lập luận (VD: "có mặt 8/21 ngày = 38%").
3. TUYỆT ĐỐI KHÔNG dùng Thâm niên để làm lý do tăng risk_level. Thâm niên chỉ là thông tin nền.
4. ĐÁNH GIÁ RỤI RO PHẢI DỰA 100% vào: số ngày vắng mặt, số lần đi trễ (sau 7h00), về sớm (trước 17h00), kỷ luật và khen thưởng.
5. ƯU TIÊN xu hướng chấm công: đi trễ/về sớm lặp lại là báo hiệu giảm động lực; vắng nhiều là cảnh báo rủi ro bỏ việc.
6. ĐỀ XUẤT NGUYÊN NHÂN KHẢ NĂNG cho hành vi (VD: "đang tìm việc khác", "vấn đề sức khỏe hoặc gia đình").
7. Trả lời HOÀN TOÀN bằng JSON Array. KHÔNG có text ngoài JSON.` },
            { role: 'user', content: batchPrompt }
          ],
          format: 'json',
          keep_alive: '10m',
          options: { num_ctx: 6144, temperature: 0.4, top_p: 0.9 }
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
          // Fallback: tạo kết quả mặc định cho batch này dựa trên rule
          aiResults = batch.map(s => {
            const totalBad = (s.lateCount || 0) + (s.earlyLeaveCount || 0);
            let riskLevel = 'LOW';
            if (s.absentCount >= 5 || s.gpsFraudCount >= 2 || totalBad >= 5) riskLevel = 'HIGH';
            else if (s.absentCount >= 3 || totalBad >= 3 || s.disciplineCount >= 1) riskLevel = 'MEDIUM';
            return {
              employee_id: s.id,
              risk_level: riskLevel,
              summary: 'Không thể phân tích AI — sử dụng đánh giá dựa trên quy tắc.',
              recommendations: ['Cần kiểm tra lại dữ liệu chấm công.']
            };
          });
        }

        // Xoá alert cũ của tất cả NV trong batch + bulkCreate alert mới
        const batchEmpIds = batch.map(s => s.id);
        await AIAlert.destroy({ where: { employee_id: batchEmpIds, alert_type: 'TURNOVER_RISK' } });

        const alertsToCreate = [];
        for (let aiIdx = 0; aiIdx < aiResults.length; aiIdx++) {
          const ai = aiResults[aiIdx];

          // --- Tìm nhân viên tương ứng ---
          // Ưu tiên 1: Match chính xác theo employee_id
          let matchedStat = batch.find(s => s.id === ai.employee_id);

          // Ưu tiên 2: Fallback theo thứ tự index (qwen2.5:3b hay trả "undefined" hoặc sai UUID)
          if (!matchedStat) {
            if (aiIdx < batch.length) {
              matchedStat = batch[aiIdx];
              console.warn(`⚠ [AI] employee_id "${ai.employee_id}" không khớp — fallback sang index ${aiIdx}: ${matchedStat.full_name}`);
            } else {
              console.warn(`⚠ [AI] employee_id "${ai.employee_id}" không tìm thấy trong batch, bỏ qua.`);
              continue;
            }
          }

          const riskLevel = ['HIGH', 'MEDIUM', 'LOW'].includes(ai.risk_level) ? ai.risk_level : 'MEDIUM';
          alertsToCreate.push({
            employee_id: matchedStat.id,
            alert_type: 'TURNOVER_RISK',
            risk_level: riskLevel,
            message: JSON.stringify({
              // ── Tóm tắt & đề xuất từ AI ──
              summary: ai.summary || '',
              recommendations: ai.recommendations || [],
              // ── Thông tin phân tích phong phú từ AI (lưu đầy đủ để frontend hiển thị) ──
              risk_score: ai.risk_score ?? null,
              analysis: ai.analysis || null,
              retention_strategy: ai.retention_strategy || [],
              suggested_action: ai.suggested_action || null,
              // ── Snapshot dữ liệu thực tế tại thời điểm phân tích ──
              last_stats: {
                pastWorkingDays: matchedStat.pastWorkingDays,
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

        console.log(`✅ [AI Batch ${batchNum}/${totalBatches}] ${empName}: Đã tạo ${alertsToCreate.length} alert (risk: ${alertsToCreate[0]?.risk_level || 'N/A'}).`);

      } catch (batchErr) {
        console.error(`❌ [AI Batch ${batchNum}/${totalBatches}] Lỗi khi phân tích ${empName}:`, batchErr.message);
        if (batchErr.name === 'AbortError') {
          console.error('   -> Lý do: Timeout (Quá 5 phút)');
        }
        
        // Batch bị lỗi → tạo fallback alert dựa trên rule
        const batchEmpIds = batch.map(s => s.id);
        await AIAlert.destroy({ where: { employee_id: batchEmpIds, alert_type: 'TURNOVER_RISK' } });

        const fallbackAlerts = batch.map(s => {
          const totalBad = (s.lateCount || 0) + (s.earlyLeaveCount || 0);
          let riskLevel = 'LOW';
          if (s.absentCount >= 5 || s.gpsFraudCount >= 2 || totalBad >= 5) riskLevel = 'HIGH';
          else if (s.absentCount >= 3 || totalBad >= 3 || s.disciplineCount >= 1) riskLevel = 'MEDIUM';

          const reasons = [];
          if (s.absentCount >= 1) reasons.push(`Nghỉ không lý do ${s.absentCount} ngày`);
          if (totalBad >= 1) reasons.push(`Đi trễ/về sớm ${totalBad} lần`);
          if (s.gpsFraudCount >= 1) reasons.push(`Gian lận GPS ${s.gpsFraudCount} lần`);

          return {
            employee_id: s.id,
            alert_type: 'TURNOVER_RISK',
            risk_level: riskLevel,
            message: JSON.stringify({
              summary: reasons.length > 0
                ? `AI tạm thời không khả dụng. Phân tích theo quy tắc: ${reasons.join('; ')}.`
                : 'AI tạm thời không khả dụng — đánh giá theo quy tắc tự động.',
              recommendations: ['Kiểm tra kết nối Ollama.'],
              last_stats: {
                pastWorkingDays: s.pastWorkingDays,
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
          };
        });
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

// ═══════════════════════════════════════════════════════════════
// SSE ENDPOINT — GET /ai/analyze-stream
// Stream realtime batch progress to frontend via Server-Sent Events
// ═══════════════════════════════════════════════════════════════
exports.analyzeStream = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (type, data) => {
    try { res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`); } catch (_) {}
  };

  try {
    const currentUser = req.user;
    if (!currentUser) { send('error', { message: 'Chưa xác thực' }); return res.end(); }

    const whereClause = { status: 'active' };
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({ where: { [Op.or]: [{ id: currentUser.id }, { employee_id: currentUser.id }] } });
        managerEmployeeId = ua ? ua.employee_id : currentUser.id;
      }
      whereClause.direct_manager_id = managerEmployeeId;
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDateStr = monthStart.toISOString().slice(0, 10);
    const monthLabel = `${today.getMonth() + 1}/${today.getFullYear()}`;

    const employees = await Employee.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'join_date'],
      include: [{ model: Position, as: 'position', attributes: ['position_name'], include: [{ model: Department, as: 'department', attributes: ['department_name'] }] }]
    });

    if (!employees || employees.length === 0) {
      send('error', { message: 'Không có nhân viên nào.' });
      return res.end();
    }

    const empIds = employees.map(e => e.id);
    const empMap = {};
    for (const emp of employees) {
      const joinDate = emp.join_date ? new Date(emp.join_date) : null;
      const seniorityMonths = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) : null;
      empMap[emp.id] = { full_name: emp.full_name, position: emp.position?.position_name || 'Chưa rõ', department: emp.position?.department?.department_name || 'Chưa rõ', seniority_months: seniorityMonths, presentCount: 0, totalWorkHours: 0, otHours: 0, approvedLeaveCount: 0, lateCount: 0, earlyLeaveCount: 0, disciplineCount: 0, rewardCount: 0, gpsFraudCount: 0 };
    }

    const STANDARD_DAY_HOURS_SSE = 8;
    const attRowsSSE = await sequelize.query(`SELECT employee_id, total_work_hours FROM attendance WHERE employee_id IN (:empIds) AND attendance_date >= :startDate AND attendance_date <= CURRENT_DATE AND check_in_time IS NOT NULL`, { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT });
    for (const row of attRowsSSE) {
      const s = empMap[row.employee_id]; if (!s) continue;
      const h = parseFloat(row.total_work_hours || 0);
      s.totalWorkHours += h;
      if (h > STANDARD_DAY_HOURS_SSE) s.otHours += (h - STANDARD_DAY_HOURS_SSE);
      s.presentCount += Math.min(Math.min(Math.max(h, 0), STANDARD_DAY_HOURS_SSE) / STANDARD_DAY_HOURS_SSE, 1);
    }
    for (const id of empIds) { empMap[id].presentCount = Math.round(empMap[id].presentCount * 100) / 100; empMap[id].totalWorkHours = Math.round(empMap[id].totalWorkHours * 100) / 100; empMap[id].otHours = Math.round(empMap[id].otHours * 100) / 100; }

    const lateRowsSSE = await sequelize.query(`SELECT employee_id, status, COUNT(*)::int AS count FROM attendance WHERE employee_id IN (:empIds) AND status IN ('late','early_leave') AND attendance_date >= :startDate GROUP BY employee_id, status`, { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT });
    for (const row of lateRowsSSE) { const s = empMap[row.employee_id]; if (!s) continue; if (row.status === 'late') s.lateCount = row.count; if (row.status === 'early_leave') s.earlyLeaveCount = row.count; }

    const leaveRowsSSE = await sequelize.query(`SELECT lr.employee_id, COUNT(DISTINCT d::date)::int AS leave_days FROM leave_request lr, generate_series(GREATEST(lr.start_datetime::date,:startDate::date),LEAST(lr.end_datetime::date,CURRENT_DATE),'1 day') AS d WHERE lr.employee_id IN (:empIds) AND lr.status='approved' AND EXTRACT(DOW FROM d) <> 0 GROUP BY lr.employee_id`, { replacements: { empIds, startDate: startDateStr }, type: QueryTypes.SELECT });
    for (const row of leaveRowsSSE) { const s = empMap[row.employee_id]; if (s) s.approvedLeaveCount = row.leave_days; }

    const pastWorkingDaysSSE = getPastWorkingDays(monthStart, today);
    const toProcess = empIds.map(id => {
      const s = empMap[id];
      const absentCount = Math.max(0, Math.round((pastWorkingDaysSSE - s.presentCount - s.approvedLeaveCount) * 100) / 100);
      return { id, ...s, pastWorkingDays: pastWorkingDaysSSE, absentCount };
    });

    send('start', { total: toProcess.length, month: monthLabel, pastWorkingDays: pastWorkingDaysSSE });

    for (let i = 0; i < toProcess.length; i++) {
      const emp = toProcess[i];
      const batchNum = i + 1;
      send('batch_start', { batchNum, totalBatches: toProcess.length, name: emp.full_name, absentCount: emp.absentCount, presentCount: emp.presentCount });

      try {
        const rate = pastWorkingDaysSSE > 0 ? Math.round((emp.presentCount / pastWorkingDaysSSE) * 100) : 0;
        const prompt = `Phân tích rủi ro nghỉ việc tháng ${monthLabel} (${pastWorkingDaysSSE} ngày làm việc đã qua):\nNhân viên: ${emp.full_name} | ${emp.position} | ${emp.department} | Thâm niên: ${emp.seniority_months ?? '?'}th (chỉ tham khảo)\nCó mặt: ${emp.presentCount}/${pastWorkingDaysSSE} ngày (${rate}%) | OT: ${emp.otHours}h | Nghỉ phép: ${emp.approvedLeaveCount} | Vắng KP: ${emp.absentCount} | Trễ (sau 7h00): ${emp.lateCount} | Sớm (trước 17h00): ${emp.earlyLeaveCount} | Kỷ luật: ${emp.disciplineCount} | Khen: ${emp.rewardCount} | GPS Fraud: ${emp.gpsFraudCount}\nQuy tắc: Vắng>=5→HIGH; Vắng>=3→MEDIUM; GPS>=2→HIGH; Trễ+Sớm>=5→HIGH; >=3→MEDIUM; KL→MEDIUM; Tốt+OT+Khen→LOW.\nTUYỆT ĐỐI KHÔNG dùng thâm niên để tăng risk_level. BẮT BUỘC dùng số liệu. Tiếng Việt hoàn toàn.\nJSON Object: {"employee_id":"${emp.id}","risk_level":"HIGH|MEDIUM|LOW","risk_score":0-100,"summary":"3-4 câu+số liệu","analysis":{"key_concerns":["..."],"positive_signals":["..."],"behavior_pattern":"..."},"retention_strategy":[{"action":"...","priority":"URGENT|HIGH|MEDIUM","timeline":"3 ngày|1 tuần"}],"suggested_action":{"type":"reward|discipline|monitor|meeting","reason":"..."},"recommendations":["...","..."]}`;

        const aiResp = await ollama.chat({ model: 'qwen2.5:7b', messages: [{ role: 'system', content: 'HR Manager, phân tích nhân sự chuyên sâu. BẮT BUỘC dùng tiếng Việt. TUYỆT ĐỐI KHÔNG dùng Thâm niên để tăng risk_level. ĐÁNH GIÁ DỰA 100% vào: vắng mặt, đi trễ (sau 7h00), về sớm (trước 17h00), kỷ luật, khen thưởng. Chỉ trả JSON Object.' }, { role: 'user', content: prompt }], format: 'json', keep_alive: '10m', options: { num_ctx: 4096, temperature: 0.4 } });

        let aiResult;
        try { const p = JSON.parse(aiResp.message.content); aiResult = Array.isArray(p) ? p[0] : p; }
        catch { aiResult = { employee_id: emp.id, risk_level: 'MEDIUM', summary: 'Lỗi parse JSON AI.' }; }

        const riskLevel = ['HIGH', 'MEDIUM', 'LOW'].includes(aiResult.risk_level) ? aiResult.risk_level : 'MEDIUM';
        await AIAlert.destroy({ where: { employee_id: emp.id, alert_type: 'TURNOVER_RISK' } });
        await AIAlert.create({ employee_id: emp.id, alert_type: 'TURNOVER_RISK', risk_level: riskLevel, message: JSON.stringify({ summary: aiResult.summary || '', recommendations: aiResult.recommendations || [], risk_score: aiResult.risk_score ?? null, analysis: aiResult.analysis || null, retention_strategy: aiResult.retention_strategy || [], suggested_action: aiResult.suggested_action || null, last_stats: { pastWorkingDays: emp.pastWorkingDays, presentCount: emp.presentCount, totalWorkHours: emp.totalWorkHours, otHours: emp.otHours, absentCount: emp.absentCount, lateCount: emp.lateCount, earlyLeaveCount: emp.earlyLeaveCount, approvedLeaveCount: emp.approvedLeaveCount, disciplineCount: emp.disciplineCount, rewardCount: emp.rewardCount, gpsFraudCount: emp.gpsFraudCount } }), status: 'PENDING' });

        send('batch_done', { batchNum, totalBatches: toProcess.length, name: emp.full_name, risk: riskLevel, risk_score: aiResult.risk_score ?? null });
      } catch (batchErr) {
        send('batch_error', { batchNum, totalBatches: toProcess.length, name: emp.full_name, message: batchErr.message });
      }
    }

    send('complete', { total: toProcess.length });
    res.end();
  } catch (error) {
    send('error', { message: error.message });
    res.end();
  }
};

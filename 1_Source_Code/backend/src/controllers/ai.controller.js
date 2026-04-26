const { Ollama } = require('ollama');
const { Op, QueryTypes } = require('sequelize');
const { Employee, AIAlert, UserAccount, sequelize, Position, Attendance, HRDecision } = require('../models');
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

exports.testLocalAI = async (req, res) => {
  try {
    const response = await ollama.chat({
      model: 'qwen2',
      messages: [
        { role: 'system', content: 'Bạn là một trợ lý nhân sự thông minh.' },
        { role: 'user', content: 'Xin chào, bạn có thể giúp gì cho hệ thống quản lý nhân sự của tôi?' }
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Kết nối AI thành công',
      data: response.message.content
    });
  } catch (error) {
    console.error('Lỗi khi gọi Local AI:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối đến Ollama',
      error: error.message
    });
  }
};

exports.analyzeTurnoverRisk = async (req, res) => {
  try {
    const currentUser = req.user; 
    if (!currentUser) return res.status(401).json({ message: 'Chưa xác thực người dùng' });

    const whereClause = { status: 'active' };

    // RÀNG BUỘC PHÂN QUYỀN (RBAC)
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({
          where: {
            [Op.or]: [ { id: currentUser.id }, { employee_id: currentUser.id } ]
          }
        });
        if (ua) managerEmployeeId = ua.employee_id;
        else managerEmployeeId = currentUser.id;
      }
      whereClause.direct_manager_id = managerEmployeeId;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employees = await Employee.findAll({
      where: whereClause,
      attributes: ['id', 'full_name']
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có nhân viên nào thuộc quyền quản lý của bạn.' });
    }

    const results = [];

    for (const emp of employees) {
      // SỬ DỤNG RAW QUERY (SQL THUẦN) ĐỂ TRÁNH LỖI MODEL UNDEFINED
      const [lateData] = await sequelize.query(
        `SELECT COUNT(*) as count FROM attendance WHERE employee_id = :empId AND status = 'late' AND attendance_date >= :date`,
        { replacements: { empId: emp.id, date: thirtyDaysAgo }, type: QueryTypes.SELECT }
      );
      const lateCount = parseInt(lateData?.count || 0, 10);

      const [earlyData] = await sequelize.query(
        `SELECT COUNT(*) as count FROM attendance WHERE employee_id = :empId AND status = 'early_leave' AND attendance_date >= :date`,
        { replacements: { empId: emp.id, date: thirtyDaysAgo }, type: QueryTypes.SELECT }
      );
      const earlyLeaveCount = parseInt(earlyData?.count || 0, 10);

      const [disciplineData] = await sequelize.query(
        `SELECT COUNT(*) as count FROM hr_decision WHERE employee_id = :empId AND decision_type = 'discipline' AND issue_date >= :date`,
        { replacements: { empId: emp.id, date: thirtyDaysAgo }, type: QueryTypes.SELECT }
      );
      const disciplineCount = parseInt(disciplineData?.count || 0, 10);

      const [rewardData] = await sequelize.query(
        `SELECT COUNT(*) as count FROM hr_decision WHERE employee_id = :empId AND decision_type = 'reward' AND issue_date >= :date`,
        { replacements: { empId: emp.id, date: thirtyDaysAgo }, type: QueryTypes.SELECT }
      );
      const rewardCount = parseInt(rewardData?.count || 0, 10);

      // NÂNG CẤP PROMPT ĐỂ CÁ NHÂN HÓA LỜI KHUYÊN
      const promptContext = `
        Đóng vai một Giám đốc Nhân sự dày dặn kinh nghiệm. Hãy phân tích rủi ro nghỉ việc của nhân viên sau trong 30 ngày qua:
        - Tên: ${emp.full_name}
        - Đi trễ: ${lateCount} lần | Về sớm: ${earlyLeaveCount} lần
        - Kỷ luật: ${disciplineCount} lần | Khen thưởng: ${rewardCount} lần
        
        Đánh giá risk_level (HIGH/MEDIUM/LOW).
        Yêu cầu trả về kết quả CHỈ bằng định dạng JSON chuẩn như sau:
        {
          "risk_level": "HIGH" hoặc "MEDIUM" hoặc "LOW",
          "summary": "1 câu giải thích lý do đánh giá.",
          "recommendations": [
            "Đề xuất hành động 1 (Cá nhân hóa theo số liệu của người này)",
            "Đề xuất hành động 2"
          ]
        }
      `;

      const response = await ollama.chat({
        model: 'qwen2', 
        messages: [
          { role: 'system', content: 'Bạn là chuyên gia phân tích nhân sự. Luôn trả lời bằng định dạng JSON.' },
          { role: 'user', content: promptContext }
        ],
        format: 'json'
      });

      try {
        const aiResult = JSON.parse(response.message.content);

        await AIAlert.destroy({ where: { employee_id: emp.id, alert_type: 'TURNOVER_RISK' } });

        const newAlert = await AIAlert.create({
          employee_id: emp.id,
          alert_type: 'TURNOVER_RISK',
          risk_level: aiResult.risk_level,
          // Lưu chuỗi JSON chứa cả lý do và mảng đề xuất vào cột message
          message: JSON.stringify({
            summary: aiResult.summary,
            recommendations: aiResult.recommendations || []
          }),
          status: 'PENDING'
        });

        results.push({ employee: emp.full_name, alert: newAlert });
      } catch (parseErr) {
        console.error(`Lỗi Parse JSON AI cho ${emp.full_name}:`, parseErr);
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

    // Phân quyền (RBAC): Lọc nhân viên theo quyền Quản lý
    let employeeWhere = {};
    if (currentUser.role === 'MANAGER' || currentUser.role_code === 'MANAGER') {
      let managerEmployeeId = currentUser.employee_id;
      if (!managerEmployeeId) {
        const ua = await UserAccount.findOne({
          where: {
            [Op.or]: [
              { id: currentUser.id },
              { employee_id: currentUser.id }
            ]
          }
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
        include: [{
          model: Position,
          as: 'position', 
          attributes: ['position_name'] 
        }]
      }],
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cảnh báo AI:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
const db = require('../config/database');

// Lấy thống kê và danh sách quyết định
const getDecisionDashboard = async (req, res) => {
  try {
    const { month, year, search } = req.query;
    
    // Lấy tháng/năm hiện tại nếu không truyền vào
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // 1. LẤY THỐNG KÊ (4 ô vuông trên cùng)
    const statsQuery = `
      SELECT 
        SUM(CASE WHEN decision_type = 'reward' THEN amount ELSE 0 END) AS total_reward,
        COUNT(CASE WHEN decision_type = 'reward' THEN 1 END) AS reward_count,
        SUM(CASE WHEN decision_type = 'discipline' THEN amount ELSE 0 END) AS total_discipline,
        COUNT(CASE WHEN decision_type = 'discipline' THEN 1 END) AS discipline_count
      FROM hr_decision
      WHERE EXTRACT(MONTH FROM issue_date) = :month 
        AND EXTRACT(YEAR FROM issue_date) = :year
    `;
    const [stats] = await db.query(statsQuery, {
      replacements: { month: targetMonth, year: targetYear },
      type: db.QueryTypes.SELECT
    });

    // 2. LẤY DANH SÁCH CHI TIẾT KÈM PHÂN TRANG / TÌM KIẾM
    let listQuery = `
      SELECT 
        d.id, d.decision_number, d.decision_type, d.form, d.amount, d.reason, d.issue_date,
        e.full_name AS employee_name,
        dep.department_name
      FROM hr_decision d
      JOIN employee e ON d.employee_id = e.id
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN department dep ON p.department_id = dep.id
      WHERE 1=1
    `;
    
    const replacements = {};

    if (search) {
      listQuery += ` AND (d.decision_number ILIKE :search OR e.full_name ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    listQuery += ` ORDER BY d.issue_date DESC, d.created_at DESC`;

    const decisions = await db.query(listQuery, {
      replacements,
      type: db.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total_reward: stats.total_reward || 0,
          reward_count: stats.reward_count || 0,
          total_discipline: stats.total_discipline || 0,
          discipline_count: stats.discipline_count || 0
        },
        decisions
      }
    });

  } catch (error) {
    console.error('Lỗi getDecisionDashboard:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu quyết định' });
  }
};

// Hàm tạo quyết định (Giữ chỗ cho phần sau Leader gửi)
const createDecision = async (req, res) => {
  // Logic insert bảng hr_decision sẽ nằm ở đây
  res.status(201).json({ message: "Chờ form thêm mới của Leader" });
};

module.exports = { getDecisionDashboard, createDecision };
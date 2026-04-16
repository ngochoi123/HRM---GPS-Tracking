const db = require('../config/database');

const contractController = {
  // 1. Lấy con số tổng quan theo tháng/năm
  getContractOverview: async (req, res) => {
    try {
      const { month, year } = req.query;
      
      // Mặc định là tháng hiện tại nếu không có params
      const refMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const refYear = year ? parseInt(year) : new Date().getFullYear();
      
      const startDate = `${refYear}-${String(refMonth).padStart(2, '0')}-01`;
      const endDate = `(DATE '${startDate}' + INTERVAL '1 month' - INTERVAL '1 day')`;

      const query = `
        SELECT
          -- Tổng số HĐ có hiệu lực trong khoảng thời gian này
          COUNT(*) FILTER (
            WHERE start_date <= ${endDate} 
            AND (end_date >= DATE '${startDate}' OR end_date IS NULL)
          ) AS total_active,
          -- Số HĐ hết hạn đúng trong tháng này
          COUNT(*) FILTER (
            WHERE EXTRACT(MONTH FROM end_date) = :refMonth 
            AND EXTRACT(YEAR FROM end_date) = :refYear
          ) AS expiring_soon,
          -- Số HĐ thử việc có hiệu lực trong tháng này
          COUNT(*) FILTER (
            WHERE contract_type = 'probation'
            AND start_date <= ${endDate}
            AND (end_date >= DATE '${startDate}' OR end_date IS NULL)
          ) AS probation_count
        FROM contract;
      `;
      
      const employeeCountQuery = `SELECT COUNT(*) as count FROM employee WHERE status = 'active'`;

      const overviewResult = await db.query(query, { 
        replacements: { refMonth, refYear },
        type: db.QueryTypes.SELECT 
      });
      const empCountResult = await db.query(employeeCountQuery, { type: db.QueryTypes.SELECT });

      const totalActive = parseInt(overviewResult[0]?.total_active || 0);
      const activeEmployees = parseInt(empCountResult[0]?.count || 1);
      const renewalRate = parseFloat(((totalActive / activeEmployees) * 100).toFixed(1));

      res.status(200).json({
        totalActive,
        expiringSoon: parseInt(overviewResult[0]?.expiring_soon || 0),
        probationCount: parseInt(overviewResult[0]?.probation_count || 0),
        renewalRate: renewalRate > 100 ? 100 : renewalRate
      });
    } catch (error) {
      console.error('Lỗi getContractOverview:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 2. Thống kê theo loại hợp đồng (Tính tại thời điểm cuối tháng được chọn)
  getContractTypeBreakdown: async (req, res) => {
    try {
      const { month, year } = req.query;
      const refMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const refYear = year ? parseInt(year) : new Date().getFullYear();
      const startDate = `${refYear}-${String(refMonth).padStart(2, '0')}-01`;
      const endDate = `(DATE '${startDate}' + INTERVAL '1 month' - INTERVAL '1 day')`;

      const query = `
        SELECT
          contract_type as label_raw,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) as percentage
        FROM contract
        WHERE start_date <= ${endDate}
          AND (end_date >= DATE '${startDate}' OR end_date IS NULL)
        GROUP BY contract_type
        ORDER BY count DESC;
      `;
      
      const result = await db.query(query, { type: db.QueryTypes.SELECT });

      const mapLabel = {
        'indefinite': 'Vô thời hạn',
        'fixed_1y': 'Xác định TH (1 năm)',
        'fixed_3y': 'Xác định TH (3 năm)',
        'probation': 'Thử việc'
      };

      const breakdown = result.map(item => ({
        label: mapLabel[item.label_raw] || item.label_raw,
        count: parseInt(item.count),
        percentage: parseFloat(item.percentage || 0),
        color: item.label_raw === 'indefinite' ? 'bg-cyan-500' :
               item.label_raw === 'fixed_3y' ? 'bg-purple-500' :
               item.label_raw === 'fixed_1y' ? 'bg-indigo-500' : 'bg-amber-400'
      }));

      res.status(200).json(breakdown);
    } catch (error) {
      console.error('Lỗi getContractTypeBreakdown:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 3. Danh sách hợp đồng hết hạn trong tháng được chọn
  getExpiringContracts: async (req, res) => {
    try {
      const { month, year } = req.query;
      
      let dateFilter = '';
      if (month && year) {
        dateFilter = `EXTRACT(MONTH FROM c.end_date) = :month AND EXTRACT(YEAR FROM c.end_date) = :year`;
      } else {
        dateFilter = `c.end_date <= CURRENT_DATE + INTERVAL '30 days' AND c.end_date >= CURRENT_DATE`;
      }

      const query = `
        SELECT
          c.id,
          c.employee_id,
          e.employee_code,
          e.full_name as name,
          e.avatar_url as avatarImg,
          p.position_name,
          d.department_name,
          c.contract_type,
          c.base_salary,
          c.allowances,
          TO_CHAR(c.end_date, 'DD/MM/YYYY') as end_date,
          (c.end_date - CURRENT_DATE) as days_left
        FROM contract c
        JOIN employee e ON c.employee_id = e.id
        LEFT JOIN position p ON e.position_id = p.id
        LEFT JOIN department d ON p.department_id = d.id
        WHERE ${dateFilter}
          AND c.is_active = true
        ORDER BY c.end_date ASC;
      `;

      const result = await db.query(query, { 
        replacements: { month: parseInt(month), year: parseInt(year) },
        type: db.QueryTypes.SELECT 
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi getExpiringContracts:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 4. Gia hạn hợp đồng (Tuân thủ: Đóng cũ - Tạo mới trong Transaction)
  renewContract: async (req, res) => {
    const t = await db.transaction();
    try {
      const { id: oldContractId } = req.params;
      const { 
        contract_number, 
        employee_id, 
        contract_type, 
        start_date, 
        end_date, 
        base_salary, 
        allowances 
      } = req.body;

      if (!end_date || !contract_number) {
        return res.status(400).json({ message: 'Thông tin gia hạn thiếu (Ngày hết hạn hoặc Số HĐ).' });
      }

      // 1. Đóng hợp đồng cũ
      await db.query(`
        UPDATE contract 
        SET is_active = false, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = :oldContractId
      `, {
        replacements: { oldContractId },
        transaction: t
      });

      // 2. Tạo hợp đồng mới
      const insertQuery = `
        INSERT INTO contract (
          contract_number, employee_id, contract_type, 
          start_date, end_date, base_salary, allowances, 
          is_active, created_at, updated_at
        ) VALUES (
          :contract_number, :employee_id, :contract_type, 
          :start_date, :end_date, :base_salary, :allowances, 
          true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id;
      `;

      await db.query(insertQuery, {
        replacements: {
          contract_number,
          employee_id,
          contract_type,
          start_date,
          end_date,
          base_salary: base_salary || 0,
          allowances: JSON.stringify(allowances || {})
        },
        type: db.QueryTypes.INSERT,
        transaction: t
      });

      await t.commit();
      res.status(200).json({ success: true, message: 'Gia hạn hợp đồng thành công (Đã tạo HĐ mới).' });
    } catch (error) {
      if (t) await t.rollback();
      console.error('Lỗi renewContract:', error);
      res.status(500).json({ message: 'Lỗi server khi gia hạn hợp đồng.' });
    }
  }
};

module.exports = contractController;

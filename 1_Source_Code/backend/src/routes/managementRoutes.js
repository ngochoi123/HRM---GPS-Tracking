const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');

// Tự động tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'QD-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const managementController = require('../controllers/managementController');
const employeeController = require('../controllers/EmployeeController');
const decisionController = require('../controllers/decisionController');
const contractController = require('../controllers/contractController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

// --- CÁC ROUTE CỦA BẠN ---
router.get('/form-options', managementController.getFormOptions);
router.get('/employees', managementController.getEmployees);
router.get('/employees/:id', managementController.getEmployeeById);
router.put('/employees/:id', employeeController.updateEmployee);
router.post('/employees', employeeController.createEmployee);
router.delete('/employees/:id', managementController.deleteEmployee);
router.get('/dashboard/present', managementController.getPresentEmployees);
router.get('/dashboard/absent', managementController.getAbsentEmployees);
router.get('/stats/changes-summary', managementController.getChangesSummary);
router.get('/stats/changes-list', managementController.getChangesList);
router.get('/stats/tenure', managementController.getTenureStats);
router.get('/stats/requests/:id', managementController.getRequestsStats);
router.get('/stats/attendance', managementController.getAttendanceStats);
router.get('/attendance-stats', managementController.getAttendanceStats);

// --- ROUTE QUYẾT ĐỊNH (CÓ UPLOAD FILE) ---
router.get('/decisions/dashboard', decisionController.getDecisionDashboard);
router.get('/decisions/:id', decisionController.getDecisionById);
router.post('/decisions', upload.single('attachment'), decisionController.createDecision);
router.put('/decisions/:id', upload.single('attachment'), decisionController.updateDecision);

// Phê duyệt đơn
router.get('/approval-requests/:id', managementController.getApprovalRequests);
router.put('/approval/:type/:id', managementController.updateApprovalStatus);
router.get('/approval-history/:id', managementController.getApprovalHistory);

// --- ROUTE PAYROLL STATISTICS ---
router.get('/payroll/statistics/overview', managementController.getPayrollOverview);
router.get('/payroll/statistics/departments', managementController.getDepartmentPayrollBreakdown);
router.get('/payroll/statistics/departments/:departmentId/employees', managementController.getEmployeesByDepartmentPayroll);
router.put('/payroll/statistics/quick-approve', managementController.quickApprovePayroll);

// --- ROUTE CONTRACT STATISTICS ---
router.get('/contracts/overview', contractController.getContractOverview);
router.get('/contracts/breakdown', contractController.getContractTypeBreakdown);
router.get('/contracts/expiring', contractController.getExpiringContracts);
router.post('/contracts/renew/:id', contractController.renewContract);
router.post('/contracts/bulk-renew', contractController.bulkRenewContract);

module.exports = router;

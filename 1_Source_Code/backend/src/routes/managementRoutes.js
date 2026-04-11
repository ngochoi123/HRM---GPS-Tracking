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
const decisionController = require('../controllers/decisionController');

// --- CÁC ROUTE CỦA BẠN ---
router.get('/form-options', managementController.getFormOptions);
router.get('/employees', managementController.getEmployees);
router.get('/employees/:id', managementController.getEmployeeById);
router.put('/employees/:id', managementController.updateEmployee);
router.post('/employees', managementController.createEmployee);
router.delete('/employees/:id', managementController.deleteEmployee);
router.get('/dashboard/present', managementController.getPresentEmployees);
router.get('/dashboard/absent', managementController.getAbsentEmployees);
router.get('/stats/changes-summary', managementController.getChangesSummary);
router.get('/stats/changes-list', managementController.getChangesList);
router.get('/stats/tenure', managementController.getTenureStats);
// --- ROUTE QUYẾT ĐỊNH (CÓ UPLOAD FILE) ---
// GET /decisions/dashboard phải khai báo trước GET /decisions/:id
router.get('/decisions/dashboard', decisionController.getDecisionDashboard);
router.get('/decisions/:id', decisionController.getDecisionById);
router.post('/decisions', upload.single('attachment'), decisionController.createDecision);
router.put('/decisions/:id', upload.single('attachment'), decisionController.updateDecision);

module.exports = router;
const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/PayrollController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/calculate', payrollController.calculatePayroll);
router.patch('/attendance', payrollController.correctAttendance);
router.post('/submit-to-director', payrollController.submitPayrollToDirector);

module.exports = router;

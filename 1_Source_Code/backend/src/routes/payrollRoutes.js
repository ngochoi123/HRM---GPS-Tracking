const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/PayrollController');
router.get('/calculate', payrollController.calculatePayroll);
router.patch('/attendance', payrollController.correctAttendance);
module.exports = router;
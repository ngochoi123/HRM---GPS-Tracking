const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/PayrollController');
router.get('/calculate', payrollController.calculatePayroll);
module.exports = router;
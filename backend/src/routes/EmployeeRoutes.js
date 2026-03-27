const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/EmployeeController');

// API lấy thông tin dashboard nhân viên
// (Giữ alias để tránh lỗi phân biệt hoa/thường)
router.get('/Dashboard/:id', employeeController.getDashboard);
router.get('/dashboard/:id', employeeController.getDashboard);

router.get('/profile/:id', employeeController.getProfile);
router.get('/contract/:id', employeeController.getContract);
router.post('/change-password', employeeController.changePassword);


// Chấm công (Attendance + GPS)
router.get('/attendance/summary/:id', employeeController.getAttendanceSummary);
router.post('/attendance/checkin/:id', employeeController.checkIn);
router.post('/attendance/checkout/:id', employeeController.checkOut);
router.get('/attendance/manager-zone/:id', employeeController.getManagerZoneAttendance);

module.exports = router;
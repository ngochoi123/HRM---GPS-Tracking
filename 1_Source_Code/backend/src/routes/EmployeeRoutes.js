/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/EmployeeController');
const multer = require('multer');
const authenticateToken = require('../middlewares/authMiddleware');

// cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // thư mục lưu file
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });


// API lấy thông tin dashboard nhân viên
// (Giữ alias để tránh lỗi phân biệt hoa/thường)
router.get('/Dashboard/:id', employeeController.getDashboard);
router.get('/dashboard/:id', employeeController.getDashboard);
//Thông tin cá nhân
router.get('/profile/:id', employeeController.getProfile);
router.get('/contract/:id', employeeController.getContract);
router.post('/change-password', employeeController.changePassword);

//Đơn từ
router.post('/leave-request', authenticateToken, upload.single('attachment'), employeeController.createRequest);
// Dùng authenticateToken để đảm bảo data isolation: mỗi NHÂN VIÊN chỉ thấy đơn của chính mình (req.user.id từ JWT)
router.get('/leave-request/my', authenticateToken, employeeController.getMyRequests);
router.get('/overtime-request/my', authenticateToken, employeeController.getMyOvertimeRequests);
router.post('/overtime-request', authenticateToken, employeeController.createOvertimeRequest);

router.get('/approvers/:id', employeeController.getApprovers);

router.post('/attendance-explanation-request', authenticateToken, upload.single('file'), employeeController.createExplanationRequest);

router.get('/attendance-explanation-request/my', authenticateToken, employeeController.getMyExplanationRequests);




// Chấm công (Attendance + GPS)
router.get('/attendance/summary/:id', employeeController.getAttendanceSummary);
router.get('/attendance/history/:id', employeeController.getAttendanceHistory);
router.post('/attendance/checkin/:id', employeeController.checkIn);
router.post('/attendance/checkout/:id', employeeController.checkOut);
router.get('/attendance/manager-zone/:id', employeeController.getManagerZoneAttendance);

module.exports = router;
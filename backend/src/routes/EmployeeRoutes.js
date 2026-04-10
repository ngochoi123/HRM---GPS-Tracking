const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/EmployeeController');
const multer = require('multer');

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
router.post('/leave-request',upload.single('attachment'),employeeController.createRequest);
router.get('/leave-request/:id', employeeController.getMyRequests);
router.get('/overtime-request/:id', employeeController.getMyOvertimeRequests);
router.post('/overtime-request', employeeController.createOvertimeRequest);

router.get('/approvers/:id', employeeController.getApprovers);


// Chấm công (Attendance + GPS)
router.get('/attendance/summary/:id', employeeController.getAttendanceSummary);
router.get('/attendance/history/:id', employeeController.getAttendanceHistory);
router.post('/attendance/checkin/:id', employeeController.checkIn);
router.post('/attendance/checkout/:id', employeeController.checkOut);
router.get('/attendance/manager-zone/:id', employeeController.getManagerZoneAttendance);

module.exports = router;
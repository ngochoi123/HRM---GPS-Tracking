/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

const express = require('express');
const router = express.Router();

// ==========================================
// IMPORT CONTROLLERS
// (Import phân tách rõ ràng từng hàm để code gọn hơn)
// ==========================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tự động tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer chung (cho các file khác nếu có)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ADMIN-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Cấu hình Multer riêng cho Avatar
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/avatars/');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const uploadAvatar = multer({ storage: avatarStorage });

const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  getEmployeesWithoutAccount, 
  adminForceResetPassword,
  syncManagerAssignments
} = require('../controllers/AdminController');

const { 
  getLocations, 
  createLocation, 
  updateLocationSettings, 
  deleteWorkLocation,
  getEmployeesByDepartment,
  getWorkLocationsByBranch,
  createLocationAssignment,
  getPositionsByDepartment,
  checkDepartmentManager,
  getBranches,
  getDepartmentsByBranch
} = require('../controllers/locationController');

const authenticateToken = require('../middlewares/authMiddleware');

// Áp dụng Auth Middleware cho toàn bộ route admin
router.use(authenticateToken);

// ==========================================
// QUẢN LÝ USER / NHÂN VIÊN
// Gốc: /api/admin/...
// ==========================================
router.get('/users', getAllUsers); 
router.post('/users', uploadAvatar.single('avatar'), createUser); 
router.put('/users/:id', uploadAvatar.single('avatar'), updateUser);
router.get('/employees-no-account', getEmployeesWithoutAccount);
router.post('/force-reset-password', adminForceResetPassword);
router.post('/sync-managers', syncManagerAssignments); // Đồng bộ direct_manager_id toàn hệ thống

// ==========================================
// QUẢN LÝ ĐỊA ĐIỂM CHẤM CÔNG (LOCATIONS)
// Gốc: /api/admin/locations
// ==========================================
router.get('/locations', getLocations);
router.post('/locations', createLocation); 
router.put('/locations/:id/settings', updateLocationSettings); 
router.delete('/locations/:id/work-location', deleteWorkLocation);

// ==========================================
// QUẢN LÝ PHÂN CẤP (HIERARCHY) CHO LOCATION
// Gốc: /api/admin/hierarchy
// ==========================================

// Lấy danh sách chi nhánh
router.get('/hierarchy/branches', getBranches);
// Lấy danh sách phòng ban theo chi nhánh
router.get('/hierarchy/departments/:branchId', getDepartmentsByBranch);
// Lấy danh sách nhân viên theo phòng ban
router.get('/hierarchy/employees/:departmentId', getEmployeesByDepartment);
// Lấy danh sách địa điểm làm việc theo chi nhánh
router.get('/hierarchy/work-locations/:branchId', getWorkLocationsByBranch);
// Tạo phân công (Branch/Department/Employee)
router.post('/hierarchy/assignments', createLocationAssignment);

// --- CÁC ROUTE PHỤ TRỢ CHO CASCADING DROPDOWN ---
router.get('/hierarchy/positions/:departmentId', getPositionsByDepartment);
router.get('/hierarchy/departments/:id/manager-check', checkDepartmentManager);

module.exports = router;
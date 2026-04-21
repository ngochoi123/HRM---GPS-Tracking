const express = require('express');
const router = express.Router();

// ==========================================
// IMPORT CONTROLLERS
// (Import phân tách rõ ràng từng hàm để code gọn hơn)
// ==========================================
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
router.post('/users', createUser); 
router.put('/users/:id', updateUser);
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
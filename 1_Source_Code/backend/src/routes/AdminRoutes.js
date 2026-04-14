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
  adminForceResetPassword 
} = require('../controllers/AdminController');

const { 
  getLocations, 
  createLocation, 
  updateLocationSettings, 
  deleteWorkLocation,
  getBranches,
  getDepartmentsByBranch,
  getEmployeesByDepartment,
  getWorkLocationsByBranch,
  createLocationAssignment
} = require('../controllers/locationController');

// ==========================================
// QUẢN LÝ USER / NHÂN VIÊN
// Gốc: /api/admin/...
// ==========================================
router.get('/users', getAllUsers); 
router.post('/users', createUser); 
router.put('/users/:id', updateUser);
router.get('/employees-no-account', getEmployeesWithoutAccount);
router.post('/force-reset-password', adminForceResetPassword);

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
module.exports = router;
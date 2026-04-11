const express = require('express');
const router = express.Router();

<<<<<<< HEAD
// Import các Controllers
const { getAllUsers, createUser, updateUser } = require('../controllers/AdminController');
const adminController = require('../controllers/AdminController');
const locationController = require('../controllers/locationController');

// ==========================================
// QUẢN LÝ USER / NHÂN VIÊN
=======
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
  deleteWorkLocation 
} = require('../controllers/locationController');

// ==========================================
// QUẢN LÝ USER / NHÂN VIÊN
// Gốc: /api/admin/...
>>>>>>> develop
// ==========================================
router.get('/users', getAllUsers); 
router.post('/users', createUser); 
router.put('/users/:id', updateUser);
<<<<<<< HEAD
router.get('/employees-no-account', adminController.getEmployeesWithoutAccount);
router.post('/force-reset-password', adminController.adminForceResetPassword); // Thêm route mới cho reset mật khẩu
// ==========================================
// QUẢN LÝ ĐỊA ĐIỂM CHẤM CÔNG (LOCATIONS)
// Gộp hết vào đây để chung gốc /api/admin/locations
// ==========================================
router.get('/locations', locationController.getLocations);
router.post('/locations', locationController.createLocation); 
router.put('/locations/:id/settings', locationController.updateLocationSettings); // Dùng :id cho đồng bộ
router.delete('/locations/:id/work-location', locationController.deleteWorkLocation);
=======
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
>>>>>>> develop

module.exports = router;
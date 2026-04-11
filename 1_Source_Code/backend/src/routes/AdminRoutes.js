const express = require('express');
const router = express.Router();

// Import các Controllers
const { getAllUsers, createUser, updateUser } = require('../controllers/AdminController');
const adminController = require('../controllers/AdminController');
const locationController = require('../controllers/locationController');

// ==========================================
// QUẢN LÝ USER / NHÂN VIÊN
// ==========================================
router.get('/users', getAllUsers); 
router.post('/users', createUser); 
router.put('/users/:id', updateUser);
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

module.exports = router;
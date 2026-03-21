const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser } = require('../controllers/adminController');
const adminController = require('../controllers/adminController');
// Phải chắc chắn là dùng router.post (vì Frontend đang dùng axios.post)
router.get('/users', getAllUsers); 
router.post('/users', createUser); // <-- CHÍNH LÀ DÒNG NÀY ĐANG THIẾU
router.put('/users/:id', updateUser);
router.get('/employees-no-account', adminController.getEmployeesWithoutAccount);
module.exports = router;
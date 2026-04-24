const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middlewares/authMiddleware');

// ==========================================
// QUẢN LÝ THÔNG BÁO (ADMIN)
// ==========================================
router.get('/', authenticateToken, notificationController.getAllNotifications);
router.post('/', authenticateToken, notificationController.createNotification);

// ==========================================
// CHUÔNG THÔNG BÁO (NHÂN VIÊN) — đặt trước /:id
// ==========================================
router.get('/my-bell/:userId', authenticateToken, notificationController.getMyBellNotifications);
router.put('/read-all/:userId', authenticateToken, notificationController.markAllAsRead);
router.put('/read/:notiId', authenticateToken, notificationController.markAsRead);

// ==========================================
// CRUD theo id (sau các route tĩnh)
// ==========================================
router.get('/:id/detail', authenticateToken, notificationController.getNotificationAdminDetail);
router.put('/:id', authenticateToken, notificationController.updateNotification);
router.get('/:id', authenticateToken, notificationController.getNotificationById);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;

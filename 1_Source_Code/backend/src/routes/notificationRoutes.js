const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');

// ==========================================
// QUẢN LÝ THÔNG BÁO (ADMIN)
// ==========================================
router.get('/', notificationController.getAllNotifications);
router.post('/', notificationController.createNotification);

// ==========================================
// CHUÔNG THÔNG BÁO (NHÂN VIÊN) — đặt trước /:id
// ==========================================
router.get('/my-bell/:userId', notificationController.getMyBellNotifications);
router.put('/read-all/:userId', notificationController.markAllAsRead);
router.put('/read/:notiId', notificationController.markAsRead);

// ==========================================
// CRUD theo id (sau các route tĩnh)
// ==========================================
router.get('/:id/detail', notificationController.getNotificationAdminDetail);
router.put('/:id', notificationController.updateNotification);
router.get('/:id', notificationController.getNotificationById);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

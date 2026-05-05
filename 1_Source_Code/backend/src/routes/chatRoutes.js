const express = require('express');
const router = express.Router();

const { chat, getChatHistory } = require('../controllers/chatbot.controller');
const authenticateToken = require('../middlewares/authMiddleware');

// POST /api/chat — Gửi tin nhắn cho HR Chatbot
router.post('/', authenticateToken, chat);

// GET /api/chat/history — Lấy lịch sử chat của nhân viên đăng nhập
router.get('/history', authenticateToken, getChatHistory);

module.exports = router;

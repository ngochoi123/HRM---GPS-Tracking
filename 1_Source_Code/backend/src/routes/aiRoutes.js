const express = require('express');
const router = express.Router();

// Import Controller
const { testLocalAI, analyzeTurnoverRisk, getAIAlerts } = require('../controllers/ai.controller');
const authenticateToken = require('../middlewares/authMiddleware'); 

// Routes
router.get('/test', testLocalAI);
router.post('/analyze-turnover', authenticateToken, analyzeTurnoverRisk); 
router.get('/alerts', authenticateToken, getAIAlerts);

module.exports = router;
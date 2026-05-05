const express = require('express');
const router = express.Router();

// Import Controller
const { testLocalAI, analyzeTurnoverRisk, analyzeStream, getAIAlerts, getRecommendations } = require('../controllers/ai.controller');
const authenticateToken = require('../middlewares/authMiddleware'); 

// Routes
router.get('/test', testLocalAI);
router.post('/analyze-turnover', authenticateToken, analyzeTurnoverRisk); 
router.get('/analyze-stream', authenticateToken, analyzeStream); // SSE endpoint
router.get('/alerts', authenticateToken, getAIAlerts);
router.get('/recommendations', authenticateToken, getRecommendations);

module.exports = router;
const express = require('express');
const router = express.Router();
const managementController = require('../controllers/managementController');

router.get('/employees', managementController.getEmployees);

module.exports = router;
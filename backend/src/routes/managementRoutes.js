const express = require('express');
const router = express.Router();
const managementController = require('../controllers/managementController');
const decisionController = require('../controllers/decisionController');
router.get('/form-options', managementController.getFormOptions);
router.get('/employees', managementController.getEmployees);
router.get('/employees/:id', managementController.getEmployeeById);
router.put('/employees/:id', managementController.updateEmployee);
router.post('/employees', managementController.createEmployee);
router.delete('/employees/:id', managementController.deleteEmployee);
router.get('/dashboard/present', managementController.getPresentEmployees);
router.get('/dashboard/absent', managementController.getAbsentEmployees);

router.get('/decisions/dashboard', decisionController.getDecisionDashboard);
router.post('/decisions', decisionController.createDecision);

module.exports = router;
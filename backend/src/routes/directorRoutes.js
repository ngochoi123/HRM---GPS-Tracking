const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/directorController");

// ===== DASHBOARD =====
router.get("/summary", ctrl.getSummary);
router.get("/departments/stats", ctrl.getDepartmentsStats);
router.get("/managers", ctrl.getManagers);
router.get("/requests", ctrl.getRequests);
router.get("/salary", ctrl.getSalary);

// ===== DEPARTMENT =====
router.get("/departments", ctrl.getDepartments);
router.get("/departments/:id", ctrl.getDepartmentById);
router.get("/departments/:id/employees", ctrl.getEmployeesByDepartment);
router.post("/departments", ctrl.createDepartment);
router.put("/departments/:id", ctrl.updateDepartment);
router.delete("/departments/:id", ctrl.deleteDepartment);

router.get("/form-options", ctrl.getFormOptions);

// ===== BRANCH =====
router.get("/branches", ctrl.getBranches);            // Lấy danh sách chi nhánh
router.get("/branches/:id/manager-candidates", ctrl.getBranchManagerCandidates);
router.get("/branches/:id", ctrl.getBranchById);     // Lấy chi nhánh theo ID
router.post("/branch", ctrl.createBranch);           // Tạo chi nhánh mới
router.put("/branches/:id", ctrl.updateBranch);      // Cập nhật chi nhánh
router.delete("/branches/:id", ctrl.deleteBranch);   // Xoá chi nhánh

// ===== CHỨC VỤ =====
router.get('/positions', ctrl.getPositions);
router.post('/positions', ctrl.createPosition);
router.put('/positions/:id', ctrl.updatePosition);
router.delete('/positions/:id', ctrl.deletePosition);


// ===== HỢP ĐỒNG LAO ĐỘNG =====
router.get('/contracts', ctrl.getContracts);
router.get('/contract-form-options', ctrl.getContractFormOptions);
router.put('/contracts/:id', ctrl.updateContract);
router.post('/contracts', ctrl.createContract);
module.exports = router;
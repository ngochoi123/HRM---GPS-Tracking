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

// ===== BRANCH =====
router.get("/branches", ctrl.getBranches);            // Lấy danh sách chi nhánh
router.get("/branches/:id/manager-candidates", ctrl.getBranchManagerCandidates);
router.get("/branches/:id", ctrl.getBranchById);     // Lấy chi nhánh theo ID
router.post("/branch", ctrl.createBranch);           // Tạo chi nhánh mới
router.put("/branches/:id", ctrl.updateBranch);      // Cập nhật chi nhánh
router.delete("/branches/:id", ctrl.deleteBranch);   // Xoá chi nhánh

module.exports = router;
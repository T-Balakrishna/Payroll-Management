const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');

// Create a new permission record
router.post('/create', permissionController.createPermission);

// Get list of permissions with filtration by companyId and departmentId
router.get('/list', permissionController.getPermissionList);

// Get remaining permission hours for a specific employee and month
router.get('/remaining/:employeeNumber/:month', permissionController.getRemainingForMonth);

// Reduce permission hours for a specific employee and month
router.put('/reduce/:employeeNumber/:month', permissionController.reducePermissionHours);

module.exports = router;
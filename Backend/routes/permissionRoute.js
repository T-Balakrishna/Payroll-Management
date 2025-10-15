const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');

router.get('/takensummary/:companyId', permissionController.getPermissionTakenSummary);

module.exports = router;
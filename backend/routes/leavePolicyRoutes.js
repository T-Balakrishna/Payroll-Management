const express = require('express');
const router = express.Router();
const leavePolicyController = require('../controllers/leavePolicyController');

// Routes for leave policies
// Frontend should call: /api/leavePolicies
router.get('/', leavePolicyController.getAllLeavePolicies);
router.get('/:id', leavePolicyController.getLeavePolicyById);
router.post('/', leavePolicyController.createLeavePolicy);
router.put('/:id', leavePolicyController.updateLeavePolicy);
router.delete('/:id', leavePolicyController.deleteLeavePolicy);

module.exports = router;
import express from 'express';
const router = express.Router();
import * as leavePolicyController from '../controllers/leavePolicyController.js';
// Routes for leave policies
// Frontend should call: /api/leavePolicies
router.get('/', leavePolicyController.getAllLeavePolicies);
router.get('/:id', leavePolicyController.getLeavePolicyById);
router.post('/', leavePolicyController.createLeavePolicy);
router.put('/:id', leavePolicyController.updateLeavePolicy);
router.delete('/:id', leavePolicyController.deleteLeavePolicy);

export default router;
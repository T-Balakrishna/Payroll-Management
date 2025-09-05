const express = require('express');
const router = express.Router();
const {
  createLeavePolicy,
  getAllLeavePolicies,
  getLeavePolicyById,
  updateLeavePolicy,
  deleteLeavePolicy
} = require('../controllers/leavePolicyController');

router.post('/', createLeavePolicy);
router.get('/', getAllLeavePolicies);
router.get('/:id', getLeavePolicyById);
router.put('/:id', updateLeavePolicy);
router.delete('/:id', deleteLeavePolicy);

module.exports = router;

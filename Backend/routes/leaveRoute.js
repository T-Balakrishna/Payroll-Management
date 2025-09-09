const express = require('express');
const router = express.Router();

const {
    createLeaveEntry,
    getAllLeaveEntries,
    getLeaveEntryById,
    updateLeaveEntry,
    updateLeaveStatus
} = require('../controllers/leaveController');

router.post('/', createLeaveEntry);
router.get('/', getAllLeaveEntries);
router.get('/:id', getLeaveEntryById);
router.put('/:id', updateLeaveEntry);
router.put("/:id/status", updateLeaveStatus);
module.exports = router;

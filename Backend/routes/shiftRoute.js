const express = require('express');
const router = express.Router();

const {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift
} = require('../controllers/shiftController');

router.post('/', createShift);
router.get('/', getAllShifts);
router.get('/:id', getShiftById);
router.put('/:id', updateShift);
router.delete('/:id', deleteShift);

module.exports = router;

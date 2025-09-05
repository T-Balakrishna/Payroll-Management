const express = require('express');
const router = express.Router();

const {
    createCaste,
    getAllCastes,
    getCasteById,
    updateCaste,
    deleteCaste
} = require('../controllers/casteController');

router.post('/', createCaste);
router.get('/', getAllCastes);
router.get('/:id', getCasteById);
router.put('/:id', updateCaste);
router.delete('/:id', deleteCaste);

module.exports = router;

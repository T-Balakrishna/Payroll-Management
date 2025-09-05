const express = require('express');
const router = express.Router();

const {
    createCaste,
    getAllCastes,
    getCasteById,
    updateCaste,
    deleteCaste
} = require('../controllers/casteController');

// CRUD Routes
router.post('/', createCaste);       // Create
router.get('/', getAllCastes);       // Read All (active)
router.get('/:id', getCasteById);    // Read One by ID (active)
router.put('/:id', updateCaste);     // Update
router.delete('/:id', deleteCaste);  // Soft Delete (set status inactive)

module.exports = router;

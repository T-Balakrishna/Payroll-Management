const express = require('express');
const router = express.Router();

const {
    createDesignation,
    getAllDesignations,
    getDesignationById,
    updateDesignation,
    deleteDesignation
} = require('../controllers/designationController');

// CRUD Routes
router.post('/', createDesignation);       // Create
router.get('/', getAllDesignations);       // Read All (active)
router.get('/:id', getDesignationById);    // Read One by ID (active)
router.put('/:id', updateDesignation);     // Update
router.delete('/:id', deleteDesignation);  // Soft Delete (set status inactive)

module.exports = router;

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
router.post('/', createDesignation);       
router.get('/', getAllDesignations);       
router.get('/:id', getDesignationById);    
router.put('/:id', updateDesignation);     
router.delete('/:id', deleteDesignation);  

module.exports = router;

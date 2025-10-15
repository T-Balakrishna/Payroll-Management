const express = require('express');
const router = express.Router();

const {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    getDepartmentCount
} = require('../controllers/departmentController');

// CRUD Routes
router.post('/', createDepartment);       // Create
router.get('/', getAllDepartments);       // Read All (active)
router.get('/:id', getDepartmentById);    // Read One by ID (active)
router.put('/:id', updateDepartment);     // Update
router.delete('/:id', deleteDepartment);  // Soft Delete (set status inactive)
router.get('/count/:companyId',getDepartmentCount); // Get count of active departments by company


module.exports = router;

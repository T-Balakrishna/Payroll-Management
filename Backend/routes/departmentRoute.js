const express = require('express');
const router = express.Router();

const {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');

// CRUD Routes
router.post('/', createDepartment);       // Create
router.get('/', getAllDepartments);       // Read All (active)
router.get('/:id', getDepartmentById);    // Read One by ID (active)
router.put('/:id', updateDepartment);     // Update
router.delete('/:id', deleteDepartment);  // Soft Delete (set status inactive)

module.exports = router;

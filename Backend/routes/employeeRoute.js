const express = require('express');
const router = express.Router();

const {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} = require('../controllers/employeeController');

// CRUD Routes
router.post('/', createEmployee);        // Create
router.get('/', getAllEmployees);        // Read All
router.get('/:id', getEmployeeById);     // Read One
router.put('/:id', updateEmployee);      // Update
router.delete('/:id', deleteEmployee);   // Delete

module.exports = router;

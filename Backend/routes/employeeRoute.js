const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// CRUD Routes
router.post('/', employeeController.createEmployee);
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.get('/getName/:userNumber', employeeController.getEmployeeName);
router.get('/fromUser/:userNumber', employeeController.getEmployeeFromUser);
router.put('/:employeeNumber', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

router.get("/full/:employeeNumber", employeeController.getEmployeeFullByNumber);

// Extra Route → Employees by Department
router.post('/byDepartments', employeeController.getEmployeesByDepartment);

module.exports = router;

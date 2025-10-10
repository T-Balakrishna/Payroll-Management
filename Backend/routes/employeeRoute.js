const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");   // ✅ add this
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
router.post('/byDepartments', employeeController.getEmployeesByDepartment);
router.get("/by-biometric/:biometricNumber", employeeController.getEmployeeByBiometric);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/employees"); // Save in backend/uploads/employees
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique name
  },
});
const upload = multer({ storage });

router.post("/:id/photo", upload.single("photo"), employeeController.uploadPhoto);


module.exports = router;

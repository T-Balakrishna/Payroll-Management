const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Create User
router.post('/', userController.createUser);

// Get All Users
router.get('/', userController.getAllUsers);

// Get User by Email
router.get('/:email', userController.getUserByMail);

// Update User by Email
router.put('/:email', userController.updateUserByMail);

// Delete User by Email
router.delete('/:email', userController.deleteUserByMail);

// GET last empNumber by department
router.get("/lastEmpNumber/:deptId", userController.getLastEmployeeByDept);


module.exports = router;

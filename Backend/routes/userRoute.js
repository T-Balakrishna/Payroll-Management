const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// CRUD Routes
router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.get('/byNumber/:userNumber', userController.getUserByNumber);
router.put('/:userNumber', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post("/lastEmpNumber/:departmentId", userController.getLastEmpNumber);
router.get("/getCompany/:userNumber",userController.getCompanyId);
module.exports = router;

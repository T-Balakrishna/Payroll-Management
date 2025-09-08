const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Auth Routes
router.post('/login', authController.loginUser);
router.post('/google-login', authController.googleLogin);

module.exports = router;

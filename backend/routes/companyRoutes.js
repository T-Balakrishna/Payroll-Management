const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// Routes for companies
// Frontend should call: /api/companies   (camelCase plural)
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;
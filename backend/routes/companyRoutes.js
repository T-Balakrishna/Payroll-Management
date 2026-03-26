import express from 'express';
const router = express.Router();
import * as companyController from '../controllers/companyController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for companies
// Frontend should call: /api/companies   (camelCase plural)
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.companies, ttlSeconds: 300 }), companyController.getAllCompanies);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.companies, ttlSeconds: 300 }), companyController.getCompanyById);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

export default router;

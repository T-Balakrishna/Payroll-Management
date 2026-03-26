import express from 'express';
import * as reportGeneratorController from '../controllers/reportGeneratorController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';

const router = express.Router();

router.get('/catalog', cacheJsonResponse({ prefix: CACHE_PREFIXES.reportCatalog, ttlSeconds: 900 }), reportGeneratorController.getAvailableReports);
router.get('/preview', reportGeneratorController.previewReport);
router.get('/download', reportGeneratorController.downloadReport);

export default router;

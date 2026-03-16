import express from 'express';
import * as reportGeneratorController from '../controllers/reportGeneratorController.js';

const router = express.Router();

router.get('/catalog', reportGeneratorController.getAvailableReports);
router.get('/preview', reportGeneratorController.previewReport);
router.get('/download', reportGeneratorController.downloadReport);

export default router;

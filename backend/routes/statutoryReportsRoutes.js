// routes/statutoryReports.js
const express = require('express');
const router = express.Router();
const statutoryReportsController = require('../controllers/statutoryReportsController');

// ==========================================
// PF REPORT ROUTES
// ==========================================
router.get('/pf', statutoryReportsController.getPFReport);
router.get('/pf/download/pdf', statutoryReportsController.downloadPFReportPDF);

// ==========================================
// ESI REPORT ROUTES
// ==========================================
router.get('/esi', statutoryReportsController.getESIReport);

// ==========================================
// TAX DEDUCTION REPORT ROUTES
// ==========================================
router.get('/tax', statutoryReportsController.getTaxReport);

// ==========================================
// PROFESSIONAL TAX REPORT ROUTES
// ==========================================
router.get('/professional-tax', statutoryReportsController.getProfessionalTaxReport);

// ==========================================
// LOAN/ADVANCE REPORT ROUTES
// ==========================================
router.get('/loan', statutoryReportsController.getLoanReport);

// ==========================================
// COMBINED EXCEL DOWNLOAD
// ==========================================
router.get('/download/excel', statutoryReportsController.downloadStatutoryReportsExcel);

module.exports = router;

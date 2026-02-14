import express from 'express';
const router = express.Router();
import * as designationController from '../controllers/designationController.js';
// Routes for designations
// Frontend should call: /api/designations   (camelCase plural)
router.get('/', designationController.getAllDesignations);
router.get('/:id', designationController.getDesignationById);
router.post('/', designationController.createDesignation);
router.put('/:id', designationController.updateDesignation);
router.delete('/:id', designationController.deleteDesignation);

export default router;
import express from 'express';
const router = express.Router();
import * as permissionController from '../controllers/permissionController.js';
// Routes for permissions
// Frontend should call: /api/permissions
router.get('/', permissionController.getAllPermissions);
router.get('/:id', permissionController.getPermissionById);
router.post('/', permissionController.createPermission);
router.put('/:id', permissionController.updatePermission);
router.delete('/:id', permissionController.deletePermission);

export default router;
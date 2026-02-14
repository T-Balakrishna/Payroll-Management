import express from 'express';
const router = express.Router();
import * as busController from '../controllers/busController.js';
// Routes for buses
// Frontend should call: /api/buses   (camelCase plural)
router.get('/', busController.getAllBuses);
router.get('/:id', busController.getBusById);
router.post('/', busController.createBus);
router.put('/:id', busController.updateBus);
router.delete('/:id', busController.deleteBus);

export default router;
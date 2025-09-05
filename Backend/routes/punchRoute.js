const express = require('express');
const router = express.Router();
const {
  createPunch,
  getAllPunches,
  getPunchById,
  updatePunch,
  deletePunch
} = require('../controllers/punchController');

router.post('/', createPunch);
router.get('/', getAllPunches);
router.get('/:id', getPunchById);
router.put('/:id', updatePunch);
router.delete('/:id', deletePunch);

module.exports = router;

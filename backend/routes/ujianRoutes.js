const express = require('express');
const router = express.Router();
const ujianController = require('../controllers/ujianController');

router.get('/:id_sesi', ujianController.getSesiUjian);
router.post('/auto-save', ujianController.autoSaveJawaban);
router.post('/log-pelanggaran', ujianController.catatPelanggaran);
router.post('/kunci-sesi', ujianController.kunciSesiPaksa);
router.post('/submit', ujianController.submitUjian);

module.exports = router;
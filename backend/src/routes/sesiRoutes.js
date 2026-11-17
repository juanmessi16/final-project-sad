/**
 * src/routes/sesiRoutes.js
 * Rute sesi ujian mahasiswa (get sesi aktif, autosave jawaban, submit ujian).
 */

const express = require('express');
const router = express.Router();
const sesiController = require('../controllers/sesiController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get(
  '/:id_sesi',
  verifyToken,
  requireRole('Mahasiswa', 'Dosen'),
  sesiController.getSesiAktif
);

router.put(
  '/:id_sesi/autosave',
  verifyToken,
  requireRole('Mahasiswa'),
  sesiController.autosaveJawaban
);

router.post(
  '/:id_sesi/submit',
  verifyToken,
  requireRole('Mahasiswa'),
  sesiController.submitUjian
);

module.exports = router;

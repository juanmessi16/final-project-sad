/**
 * src/routes/ujianRoutes.js
 * Rute ujian untuk Mahasiswa (daftar ujian, mulai/pulihkan ujian).
 */

const express = require('express');
const router = express.Router();
const ujianController = require('../controllers/ujianController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Daftar ujian mahasiswa
router.get(
  '/mahasiswa',
  verifyToken,
  requireRole('Mahasiswa', 'Dosen'),
  ujianController.getDaftarUjianMahasiswa
);

// Memulai atau memulihkan sesi ujian
router.post(
  '/:id_ujian/mulai',
  verifyToken,
  requireRole('Mahasiswa', 'Dosen'),
  ujianController.mulaiAtauPulihkanUjian
);

module.exports = router;

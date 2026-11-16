/**
 * src/routes/hasilRoutes.js
 * Rute riwayat hasil ujian dan resi bukti ujian untuk Mahasiswa.
 */

const express = require('express');
const router = express.Router();
const hasilController = require('../controllers/hasilController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get(
  '/riwayat',
  verifyToken,
  requireRole('Mahasiswa'),
  hasilController.getRiwayatHasilMahasiswa
);

router.get(
  '/resi/:id_bukti',
  verifyToken,
  requireRole('Mahasiswa', 'Dosen'),
  hasilController.getResiBukti
);

module.exports = router;

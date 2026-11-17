/**
 * src/routes/antiCurangRoutes.js
 * Rute pelaporan dan pencatatan pelanggaran anti-curang tanpa kamera (TC-14 s.d. TC-21, TC-52).
 */

const express = require('express');
const router = express.Router();
const antiCurangController = require('../controllers/antiCurangController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { immutableLogGuard } = require('../middlewares/securityMiddleware');

// TC-19: Hanya mengizinkan INSERT/POST pelanggaran baru
router.post(
  '/:id_sesi/pelanggaran',
  verifyToken,
  requireRole('Mahasiswa'),
  antiCurangController.catatPelanggaran
);

// TC-52: Blokir eksplisit PUT, PATCH, DELETE pada log pelanggaran
router.all('/:id_sesi/pelanggaran*', verifyToken, immutableLogGuard);

module.exports = router;

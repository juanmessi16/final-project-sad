/**
 * src/routes/antiCurangRoutes.js
 * Rute pelaporan dan pencatatan pelanggaran anti-curang tanpa kamera.
 */

const express = require('express');
const router = express.Router();
const antiCurangController = require('../controllers/antiCurangController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.post(
  '/:id_sesi/pelanggaran',
  verifyToken,
  requireRole('Mahasiswa'),
  antiCurangController.catatPelanggaran
);

module.exports = router;

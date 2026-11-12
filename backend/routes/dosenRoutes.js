const express = require('express');
const router = express.Router();
const DosenController = require('../controllers/dosenController');
const { authenticateToken, isDosen } = require('../middleware/authMiddleware');

// Seluruh rute dosen dilindungi autentikasi JWT dan otorisasi role Dosen
router.use(authenticateToken, isDosen);

// 1. Pengelolaan Bank Soal
router.get('/bank-soal', DosenController.getBankSoal);
router.post('/bank-soal', DosenController.createBankSoal);

// 2. Pengelolaan Soal
router.post('/soal', DosenController.createSoal);
router.put('/soal/:id', DosenController.updateSoal);
router.delete('/soal/:id', DosenController.deleteSoal);

// 3. Pengaturan Ujian
router.get('/ujian', DosenController.getUjian);
router.post('/ujian', DosenController.createUjian);
router.put('/ujian/:id', DosenController.updateUjian);

// 4. Pengelolaan Peserta Ujian
router.post('/ujian/:id/peserta', DosenController.addPeserta);
router.delete('/ujian/:id/peserta/:mahasiswaId', DosenController.removePeserta);

// 5. Tinjau Log Pelanggaran & Tetapkan Keputusan
router.get('/ujian/:id/pelanggaran', DosenController.getPelanggaran);
router.post('/ujian/:id/keputusan', DosenController.tetapkanKeputusan);
router.put('/sesi/:id_sesi/keputusan', DosenController.tetapkanKeputusan);

module.exports = router;

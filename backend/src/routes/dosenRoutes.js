/**
 * src/routes/dosenRoutes.js
 * Seluruh endpoint manajemen Dosen (Bank Soal, Soal, Ujian, Peserta, Log, Penilaian Esai, Sanksi).
 */

const express = require('express');
const router = express.Router();
const dosenController = require('../controllers/dosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua rute dosen diproteksi RBAC role Dosen
router.use(verifyToken, requireRole('Dosen'));

// 1. Bank Soal
router.get('/bank-soal', dosenController.getBankSoal);
router.post('/bank-soal', dosenController.createBankSoal);
router.delete('/bank-soal/:id_bank_soal', dosenController.deleteBankSoal);

// 2. Soal
router.get('/bank-soal/:id_bank_soal/soal', dosenController.getSoalByBank);
router.post('/soal', dosenController.createSoal);
router.delete('/soal/:id_soal', dosenController.deleteSoal);

// 3. Ujian
router.get('/ujian', dosenController.getUjianByDosen);
router.post('/ujian', dosenController.createUjian);
router.put('/ujian/:id_ujian/publikasi', dosenController.togglePublikasiHasil);

// 4. Hubungan Ujian & Soal (ujian_soal)
router.post('/ujian/:id_ujian/soal', dosenController.assignSoalToUjian);
router.delete('/ujian/:id_ujian/soal/:id_soal', dosenController.removeSoalFromUjian);

// 5. Peserta Ujian (peserta_ujian)
router.get('/ujian/:id_ujian/peserta', dosenController.getPesertaUjian);
router.post('/ujian/:id_ujian/peserta', dosenController.addPesertaUjianBulk);
router.delete('/ujian/:id_ujian/peserta/:id_mahasiswa', dosenController.removePesertaUjian);

// 6. Log Pelanggaran & Sanksi
router.get('/ujian/:id_ujian/log-pelanggaran', dosenController.getLogPelanggaranByUjian);
router.put('/sesi/:id_sesi/keputusan-sanksi', dosenController.tetapkanKeputusanSanksi);

// 7. Penilaian Esai
router.get('/sesi/:id_sesi/jawaban', dosenController.getJawabanSesiMahasiswa);
router.post('/sesi/:id_sesi/nilai-esai', dosenController.inputNilaiEsai);

module.exports = router;

/**
 * src/routes/dosenRoutes.js
 * Seluruh endpoint manajemen Dosen (Bank Soal, Soal, Ujian, Peserta, Tambah Waktu, Log, Penilaian Esai, Sanksi).
 */

const express = require('express');
const router = express.Router();
const dosenController = require('../controllers/dosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { immutableLogGuard } = require('../middlewares/securityMiddleware');

// TC-49: Semua rute dosen diproteksi RBAC role Dosen (mengembalikan 403 Forbidden jika diakses Mahasiswa)
router.use(verifyToken, requireRole('Dosen'));

// 1. Bank Soal
router.get('/bank-soal', dosenController.getBankSoal);
router.post('/bank-soal', dosenController.createBankSoal);
router.delete('/bank-soal/:id_bank_soal', dosenController.deleteBankSoal);

// 2. Soal (TC-29, TC-30, TC-37, TC-38)
router.get('/bank-soal/:id_bank_soal/soal', dosenController.getSoalByBank);
router.post('/soal', dosenController.createSoal);
router.put('/soal/:id_soal', dosenController.updateSoal);
router.delete('/soal/:id_soal', dosenController.deleteSoal);

// 3. Ujian & Pengaturan (TC-09, TC-10, TC-31, TC-32, TC-33, TC-41)
router.get('/ujian', dosenController.getUjianByDosen);
router.post('/ujian', dosenController.createUjian);
router.put('/ujian/:id_ujian', dosenController.updateUjian);
router.put('/ujian/:id_ujian/publikasi', dosenController.togglePublikasiHasil);

// 4. Hubungan Ujian & Soal (ujian_soal)
router.post('/ujian/:id_ujian/soal', dosenController.assignSoalToUjian);
router.delete('/ujian/:id_ujian/soal/:id_soal', dosenController.removeSoalFromUjian);

// 5. Peserta Ujian & Tambah Waktu (TC-34, TC-42)
router.get('/ujian/:id_ujian/peserta', dosenController.getPesertaUjian);
router.post('/ujian/:id_ujian/peserta', dosenController.addPesertaUjianBulk);
router.delete('/ujian/:id_ujian/peserta/:id_mahasiswa', dosenController.removePesertaUjian);
router.post('/sesi/:id_sesi/tambah-waktu', dosenController.tambahWaktuPeserta);
router.post('/ujian/:id_ujian/tambah-waktu', dosenController.tambahWaktuPeserta);

// 6. Log Pelanggaran Imutabel & Keputusan Sanksi (TC-35, TC-36, TC-52)
router.get('/log-pelanggaran', dosenController.getLogPelanggaranByUjian);
router.get('/ujian/:id_ujian/log-pelanggaran', dosenController.getLogPelanggaranByUjian);
router.all('/log-pelanggaran*', immutableLogGuard);
router.all('/ujian/:id_ujian/log-pelanggaran*', immutableLogGuard);
router.put('/sesi/:id_sesi/keputusan-sanksi', dosenController.tetapkanKeputusanSanksi);

// 7. Penilaian Esai (TC-40)
router.get('/sesi/:id_sesi/jawaban', dosenController.getJawabanSesiMahasiswa);
router.post('/sesi/:id_sesi/nilai-esai', dosenController.inputNilaiEsai);

module.exports = router;

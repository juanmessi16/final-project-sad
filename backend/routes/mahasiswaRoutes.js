const express = require('express');
const router = express.Router();
const MahasiswaController = require('../controllers/mahasiswaController');
const { authenticateToken, isMahasiswa } = require('../middleware/authMiddleware');

// Seluruh rute mahasiswa dilindungi autentikasi JWT dan otorisasi role Mahasiswa
router.use(authenticateToken, isMahasiswa);

// 1. Daftar Ujian Mahasiswa
router.get('/ujian', MahasiswaController.getUjian);

// 2. Verifikasi PIN Ujian (Use Case 1.2.2)
router.post('/ujian/:id/verifikasi-pin', MahasiswaController.verifikasiPin);

// 3. Mulai Sesi Ujian (Use Case 1.2.3 & 1.2.11)
router.post('/ujian/:id/mulai', MahasiswaController.mulaiUjian);

// 4. Ambil Soal Sesi (Urutan Acak Tanpa Kunci Jawaban)
router.get('/sesi/:id/soal', MahasiswaController.getSoalSesi);

// 5. Auto-Save Jawaban (Use Case 1.2.12, FR-07)
router.post('/sesi/:id/jawaban', MahasiswaController.simpanJawaban);

// 6. Pencatatan Pelanggaran Anti-Curang (Use Case 1.2.14, 1.2.15, 1.2.17, 1.2.18)
router.post('/sesi/:id/pelanggaran', MahasiswaController.catatPelanggaran);

// 7. Pengumpulan Ujian / Submit (Use Case 1.2.4 & 1.2.16 & 1.2.19)
router.post('/sesi/:id/submit', MahasiswaController.submitUjian);

// 8. Riwayat Hasil Ujian & Tanda Terima Bukti (Use Case 1.2.5 & 1.2.19)
router.get('/hasil-ujian', MahasiswaController.getHasilUjian);

module.exports = router;

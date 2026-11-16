-- =============================================================================
-- Seed Data: xunklab_db
-- Data Awal Realistis Sesuai SRS & UML System Analysis & Design
-- Fakultas Ilmu Komputer, Universitas Klabat
-- =============================================================================

USE `xunklab_db`;

-- Nonaktifkan foreign key checks sementara untuk idempotensi pembersihan data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `bukti_ujian_hasil`;
TRUNCATE TABLE `log_pelanggaran`;
TRUNCATE TABLE `jawaban_mahasiswa`;
TRUNCATE TABLE `sesi_ujian_mahasiswa`;
TRUNCATE TABLE `peserta_ujian`;
TRUNCATE TABLE `ujian_soal`;
TRUNCATE TABLE `soal`;
TRUNCATE TABLE `bank_soal`;
TRUNCATE TABLE `ujian`;
TRUNCATE TABLE `mahasiswa`;
TRUNCATE TABLE `dosen`;
TRUNCATE TABLE `pengguna`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Pengguna & Dosen
-- Password default dosen: 'dosen123'
-- Hash: $2a$10$C3ylDqR1FV8Nqyu7GSoSxuMGTfG.iOnNe1jrdiQgBh6E0BsB5NqDe
-- -----------------------------------------------------------------------------
INSERT INTO `pengguna` (`id_pengguna`, `username`, `password`, `role`, `status_akun`) VALUES
('USR_DOS_01', 'dosen', '$2a$10$C3ylDqR1FV8Nqyu7GSoSxuMGTfG.iOnNe1jrdiQgBh6E0BsB5NqDe', 'Dosen', 'Aktif');

INSERT INTO `dosen` (`id_dosen`, `id_pengguna`, `nama_dosen`, `mata_kuliah`) VALUES
('DOS_01', 'USR_DOS_01', 'George M. W. Tangka, S.Kom., MBA', 'Sistem Analisis & Desain');

-- -----------------------------------------------------------------------------
-- 2. Pengguna & Mahasiswa
-- Password default mahasiswa: '123'
-- Hash: $2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi
-- -----------------------------------------------------------------------------
INSERT INTO `pengguna` (`id_pengguna`, `username`, `password`, `role`, `status_akun`) VALUES
('USR_MHS_01', '105022410021', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Aktif'),
('USR_MHS_02', '105022510107', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Aktif'),
('USR_MHS_03', '105022410095', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Aktif'),
('USR_MHS_04', '105022410007', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Aktif'),
('USR_MHS_05', '105022510475', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Aktif'),
('USR_MHS_LOCK', 'terkunci', '$2a$10$B26B56h.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi', 'Mahasiswa', 'Terkunci');

INSERT INTO `mahasiswa` (`id_mahasiswa`, `id_pengguna`, `nim`, `nama`) VALUES
('MHS_01', 'USR_MHS_01', '105022410021', 'Tulengkey, Juan Messi Septhian'),
('MHS_02', 'USR_MHS_02', '105022510107', 'Tuwaidan, Jeniffer Diana'),
('MHS_03', 'USR_MHS_03', '105022410095', 'Sumual, Valentino'),
('MHS_04', 'USR_MHS_04', '105022410007', 'Sahetapy, Wilman Valentino'),
('MHS_05', 'USR_MHS_05', '105022510475', 'Laluyan, Matthew Arnold M'),
('MHS_LOCK', 'USR_MHS_LOCK', '105022499999', 'Mahasiswa Terkunci (Akun Demo Sanksi)');

-- -----------------------------------------------------------------------------
-- 3. Bank Soal
-- -----------------------------------------------------------------------------
INSERT INTO `bank_soal` (`id_bank_soal`, `id_dosen`, `nama_mata_kuliah`) VALUES
('BS_01', 'DOS_01', 'Sistem Analisis & Desain (SAD)');

-- -----------------------------------------------------------------------------
-- 4. Soal-Soal (Mencakup 4 Tipe: Pilihan Ganda, Benar/Salah, Isian Singkat, Esai)
-- -----------------------------------------------------------------------------
INSERT INTO `soal` (`id_soal`, `id_bank_soal`, `tipe_soal`, `pertanyaan`, `opsi_jawaban`, `kunci_jawaban`, `bobot`) VALUES
(
  'SOAL_01',
  'BS_01',
  'Pilihan Ganda',
  'Apa tujuan utama dari diagram Use Case dalam analisis dan perancangan perangkat lunak?',
  '["Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem", "Menentukan skema fisik tabel basis data dan tipe data kolom", "Mengatur alokasi memori runtime pada server aplikasi", "Menampilkan topologi kabel jaringan dan router fisik"]',
  'Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem',
  15
),
(
  'SOAL_02',
  'BS_01',
  'Pilihan Ganda',
  'Dalam Unified Modeling Language (UML), hubungan <<include>> antar use case mengindikasikan bahwa:',
  '["Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya", "Use case dasar hanya mengeksekusi jika terjadi kondisi pengecualian (exception)", "Use case bersifat opsional bergantung preferensi dinamis pengguna", "Use case tersebut merupakan turunan konkret dari use case abstrak"]',
  'Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya',
  15
),
(
  'SOAL_03',
  'BS_01',
  'Benar/Salah',
  'Pendeteksian perpindahan tab atau jendela browser pada antarmuka ujian web dapat dilakukan secara andal tanpa kamera menggunakan event Page Visibility API (document.visibilityState) dan Window Blur listener.',
  '["Benar", "Salah"]',
  'Benar',
  10
),
(
  'SOAL_04',
  'BS_01',
  'Benar/Salah',
  'Pada aturan bisnis xUnklab (BR-01), seorang mahasiswa diizinkan untuk membuka sesi ujian aktif secara bersamaan di dua perangkat berbeda untuk mempercepat pengerjaan.',
  '["Benar", "Salah"]',
  'Salah',
  10
),
(
  'SOAL_05',
  'BS_01',
  'Isian Singkat',
  'Sebutkan istilah diagram UML yang menggambarkan interaksi antar objek secara dinamis yang disusun berdasarkan urutan waktu (kronologis)!',
  NULL,
  'Sequence Diagram',
  20
),
(
  'SOAL_06',
  'BS_01',
  'Esai',
  'Jelaskan bagaimana mekanisme perlindungan anti-curang tanpa kamera (meliputi pencegahan copy-paste, pendeteksian fullscreen, dan penghitungan pelanggaran bertingkat) dapat menjamin integritas evaluasi akademik mahasiswa!',
  NULL,
  NULL,
  30
);

-- -----------------------------------------------------------------------------
-- 5. Ujian
-- PIN: 'SAD2026', durasi: 90 menit, acak_aktif: 1, toleransi: 3 pelanggaran
-- Rentang jadwal diset dinamis: aktif sejak sekarang hingga 7 hari mendatang
-- -----------------------------------------------------------------------------
INSERT INTO `ujian` (
  `id_ujian`,
  `id_dosen`,
  `nama_ujian`,
  `tanggal_waktu_mulai`,
  `tanggal_waktu_selesai`,
  `durasi`,
  `pin_ujian`,
  `maks_percobaan`,
  `acak_aktif`,
  `batas_toleransi_pelanggaran`,
  `hasil_dipublikasikan`
) VALUES (
  'UJN_01',
  'DOS_01',
  'UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027',
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  90,
  'SAD2026',
  1,
  1,
  3,
  0
);

-- -----------------------------------------------------------------------------
-- 6. Relasi Ujian - Soal (ujian_soal)
-- -----------------------------------------------------------------------------
INSERT INTO `ujian_soal` (`id_ujian`, `id_soal`) VALUES
('UJN_01', 'SOAL_01'),
('UJN_01', 'SOAL_02'),
('UJN_01', 'SOAL_03'),
('UJN_01', 'SOAL_04'),
('UJN_01', 'SOAL_05'),
('UJN_01', 'SOAL_06');

-- -----------------------------------------------------------------------------
-- 7. Relasi Peserta Ujian (peserta_ujian)
-- -----------------------------------------------------------------------------
INSERT INTO `peserta_ujian` (`id_ujian`, `id_mahasiswa`) VALUES
('UJN_01', 'MHS_01'),
('UJN_01', 'MHS_02'),
('UJN_01', 'MHS_03'),
('UJN_01', 'MHS_04'),
('UJN_01', 'MHS_05');

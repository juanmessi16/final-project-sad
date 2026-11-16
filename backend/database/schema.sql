-- =============================================================================
-- Database Schema: xunklab_db
-- Sistem Ujian Berbasis Web dengan Fitur Anti-Curang Tanpa Kamera (xUnklab)
-- Fakultas Ilmu Komputer, Universitas Klabat
-- Standar MySQL 8.0, InnoDB, utf8mb4
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `xunklab_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `xunklab_db`;

-- Drop triggers if exists
DROP TRIGGER IF EXISTS `trg_no_update_log_pelanggaran`;
DROP TRIGGER IF EXISTS `trg_no_delete_log_pelanggaran`;

-- Drop tables in reverse foreign-key order
DROP TABLE IF EXISTS `bukti_ujian_hasil`;
DROP TABLE IF EXISTS `log_pelanggaran`;
DROP TABLE IF EXISTS `jawaban_mahasiswa`;
DROP TABLE IF EXISTS `sesi_ujian_mahasiswa`;
DROP TABLE IF EXISTS `peserta_ujian`;
DROP TABLE IF EXISTS `ujian_soal`;
DROP TABLE IF EXISTS `ujian`;
DROP TABLE IF EXISTS `soal`;
DROP TABLE IF EXISTS `bank_soal`;
DROP TABLE IF EXISTS `mahasiswa`;
DROP TABLE IF EXISTS `dosen`;
DROP TABLE IF EXISTS `pengguna`;

-- -----------------------------------------------------------------------------
-- 1. Tabel pengguna
-- -----------------------------------------------------------------------------
CREATE TABLE `pengguna` (
  `id_pengguna` VARCHAR(20) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('Mahasiswa', 'Dosen') NOT NULL,
  `status_akun` ENUM('Aktif', 'Nonaktif', 'Terkunci') NOT NULL DEFAULT 'Aktif',
  `active_session_id` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pengguna`),
  UNIQUE KEY `uq_pengguna_username` (`username`),
  KEY `idx_pengguna_role_status` (`role`, `status_akun`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Tabel dosen
-- -----------------------------------------------------------------------------
CREATE TABLE `dosen` (
  `id_dosen` VARCHAR(20) NOT NULL,
  `id_pengguna` VARCHAR(20) NOT NULL,
  `nama_dosen` VARCHAR(100) NOT NULL,
  `mata_kuliah` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_dosen`),
  UNIQUE KEY `uq_dosen_id_pengguna` (`id_pengguna`),
  CONSTRAINT `fk_dosen_pengguna`
    FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Tabel mahasiswa
-- -----------------------------------------------------------------------------
CREATE TABLE `mahasiswa` (
  `id_mahasiswa` VARCHAR(20) NOT NULL,
  `id_pengguna` VARCHAR(20) NOT NULL,
  `nim` VARCHAR(20) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_mahasiswa`),
  UNIQUE KEY `uq_mahasiswa_id_pengguna` (`id_pengguna`),
  UNIQUE KEY `uq_mahasiswa_nim` (`nim`),
  CONSTRAINT `fk_mahasiswa_pengguna`
    FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Tabel bank_soal
-- -----------------------------------------------------------------------------
CREATE TABLE `bank_soal` (
  `id_bank_soal` VARCHAR(20) NOT NULL,
  `id_dosen` VARCHAR(20) NOT NULL,
  `nama_mata_kuliah` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_bank_soal`),
  KEY `idx_bank_soal_dosen` (`id_dosen`),
  CONSTRAINT `fk_bank_soal_dosen`
    FOREIGN KEY (`id_dosen`) REFERENCES `dosen` (`id_dosen`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Tabel soal
-- -----------------------------------------------------------------------------
CREATE TABLE `soal` (
  `id_soal` VARCHAR(20) NOT NULL,
  `id_bank_soal` VARCHAR(20) NOT NULL,
  `tipe_soal` ENUM('Pilihan Ganda', 'Benar/Salah', 'Isian Singkat', 'Esai') NOT NULL,
  `pertanyaan` TEXT NOT NULL,
  `opsi_jawaban` JSON NULL,
  `kunci_jawaban` VARCHAR(255) NULL,
  `bobot` FLOAT NOT NULL DEFAULT 10,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_soal`),
  KEY `idx_soal_bank` (`id_bank_soal`),
  KEY `idx_soal_tipe` (`tipe_soal`),
  CONSTRAINT `fk_soal_bank`
    FOREIGN KEY (`id_bank_soal`) REFERENCES `bank_soal` (`id_bank_soal`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Tabel ujian
-- -----------------------------------------------------------------------------
CREATE TABLE `ujian` (
  `id_ujian` VARCHAR(20) NOT NULL,
  `id_dosen` VARCHAR(20) NOT NULL,
  `nama_ujian` VARCHAR(100) NOT NULL,
  `tanggal_waktu_mulai` DATETIME NOT NULL,
  `tanggal_waktu_selesai` DATETIME NOT NULL,
  `durasi` INT NOT NULL COMMENT 'Durasi pengerjaan dalam menit',
  `pin_ujian` VARCHAR(10) NOT NULL,
  `maks_percobaan` INT NOT NULL DEFAULT 1,
  `acak_aktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `batas_toleransi_pelanggaran` INT NOT NULL DEFAULT 3,
  `hasil_dipublikasikan` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ujian`),
  KEY `idx_ujian_dosen` (`id_dosen`),
  KEY `idx_ujian_waktu` (`tanggal_waktu_mulai`, `tanggal_waktu_selesai`),
  CONSTRAINT `fk_ujian_dosen`
    FOREIGN KEY (`id_dosen`) REFERENCES `dosen` (`id_dosen`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Tabel ujian_soal (N:M Ujian & Soal)
-- -----------------------------------------------------------------------------
CREATE TABLE `ujian_soal` (
  `id_ujian` VARCHAR(20) NOT NULL,
  `id_soal` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_ujian`, `id_soal`),
  KEY `idx_us_soal` (`id_soal`),
  CONSTRAINT `fk_us_ujian`
    FOREIGN KEY (`id_ujian`) REFERENCES `ujian` (`id_ujian`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_us_soal`
    FOREIGN KEY (`id_soal`) REFERENCES `soal` (`id_soal`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Tabel peserta_ujian (N:M Ujian & Mahasiswa)
-- -----------------------------------------------------------------------------
CREATE TABLE `peserta_ujian` (
  `id_ujian` VARCHAR(20) NOT NULL,
  `id_mahasiswa` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_ujian`, `id_mahasiswa`),
  KEY `idx_pu_mahasiswa` (`id_mahasiswa`),
  CONSTRAINT `fk_pu_ujian`
    FOREIGN KEY (`id_ujian`) REFERENCES `ujian` (`id_ujian`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pu_mahasiswa`
    FOREIGN KEY (`id_mahasiswa`) REFERENCES `mahasiswa` (`id_mahasiswa`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Tabel sesi_ujian_mahasiswa
-- -----------------------------------------------------------------------------
CREATE TABLE `sesi_ujian_mahasiswa` (
  `id_sesi` VARCHAR(20) NOT NULL,
  `id_ujian` VARCHAR(20) NOT NULL,
  `id_mahasiswa` VARCHAR(20) NOT NULL,
  `percobaan_ke` INT NOT NULL DEFAULT 1,
  `waktu_mulai` DATETIME NOT NULL,
  `sisa_waktu` INT NOT NULL COMMENT 'Sisa waktu dalam detik',
  `jumlah_peringatan` INT NOT NULL DEFAULT 0,
  `status_ujian` ENUM('Berlangsung', 'Selesai', 'Dikunci Paksa', 'Disubmit Otomatis') NOT NULL DEFAULT 'Berlangsung',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sesi`),
  UNIQUE KEY `uq_ujian_mhs_percobaan` (`id_ujian`, `id_mahasiswa`, `percobaan_ke`),
  KEY `idx_sesi_ujian` (`id_ujian`),
  KEY `idx_sesi_mahasiswa` (`id_mahasiswa`),
  KEY `idx_sesi_status` (`status_ujian`),
  CONSTRAINT `fk_sesi_ujian`
    FOREIGN KEY (`id_ujian`) REFERENCES `ujian` (`id_ujian`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sesi_mahasiswa`
    FOREIGN KEY (`id_mahasiswa`) REFERENCES `mahasiswa` (`id_mahasiswa`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Tabel jawaban_mahasiswa
-- -----------------------------------------------------------------------------
CREATE TABLE `jawaban_mahasiswa` (
  `id_jawaban` VARCHAR(20) NOT NULL,
  `id_sesi` VARCHAR(20) NOT NULL,
  `id_soal` VARCHAR(20) NOT NULL,
  `jawaban_dipilih` TEXT NULL,
  `urutan_soal` INT NOT NULL,
  `urutan_opsi` JSON NULL,
  `waktu_disimpan` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `nilai_soal` FLOAT NULL,
  PRIMARY KEY (`id_jawaban`),
  UNIQUE KEY `uq_sesi_soal` (`id_sesi`, `id_soal`),
  KEY `idx_jawaban_soal` (`id_soal`),
  CONSTRAINT `fk_jawaban_sesi`
    FOREIGN KEY (`id_sesi`) REFERENCES `sesi_ujian_mahasiswa` (`id_sesi`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jawaban_soal`
    FOREIGN KEY (`id_soal`) REFERENCES `soal` (`id_soal`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Tabel log_pelanggaran
-- -----------------------------------------------------------------------------
CREATE TABLE `log_pelanggaran` (
  `id_log` VARCHAR(20) NOT NULL,
  `id_sesi` VARCHAR(20) NOT NULL,
  `jenis_pelanggaran` ENUM('Pindah Tab', 'Copy-Paste', 'Keluar Layar Penuh', 'Sesi Dikunci Paksa') NOT NULL,
  `waktu_kejadian` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jumlah_pelanggaran` INT NOT NULL,
  PRIMARY KEY (`id_log`),
  KEY `idx_log_sesi` (`id_sesi`),
  CONSTRAINT `fk_log_sesi`
    FOREIGN KEY (`id_sesi`) REFERENCES `sesi_ujian_mahasiswa` (`id_sesi`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Triggers Proteksi Log Pelanggaran (NFR-15: Append-Only Immutable Log)
-- -----------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER `trg_no_update_log_pelanggaran`
BEFORE UPDATE ON `log_pelanggaran`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Log pelanggaran bersifat permanen dan tidak dapat diubah atau dihapus';
END$$

CREATE TRIGGER `trg_no_delete_log_pelanggaran`
BEFORE DELETE ON `log_pelanggaran`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Log pelanggaran bersifat permanen dan tidak dapat diubah atau dihapus';
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 12. Tabel bukti_ujian_hasil (Resi / Tanda Terima Resmi)
-- -----------------------------------------------------------------------------
CREATE TABLE `bukti_ujian_hasil` (
  `id_bukti` VARCHAR(20) NOT NULL,
  `id_sesi` VARCHAR(20) NOT NULL,
  `waktu_pengiriman` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status_pengiriman` ENUM('Berhasil', 'Otomatis', 'Dikunci Paksa') NOT NULL,
  `total_nilai` FLOAT NULL COMMENT 'NULL jika belum dinilai atau ada soal esai pending',
  `status_keputusan` ENUM('Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi') NOT NULL DEFAULT 'Tidak Ada',
  PRIMARY KEY (`id_bukti`),
  UNIQUE KEY `uq_bukti_sesi` (`id_sesi`),
  CONSTRAINT `fk_bukti_sesi`
    FOREIGN KEY (`id_sesi`) REFERENCES `sesi_ujian_mahasiswa` (`id_sesi`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

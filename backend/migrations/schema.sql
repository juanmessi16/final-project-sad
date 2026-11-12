-- =======================================================
-- xUnklab Database Schema - 12 Tabel Relasional
-- Standar Sesuai SRS & UML (ERD & Kamus Data)
-- Engine: InnoDB, Charset: utf8mb4
-- =======================================================

CREATE DATABASE IF NOT EXISTS xunklab_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE xunklab_db;

-- 1. TABEL PENGGUNA
CREATE TABLE IF NOT EXISTS pengguna (
  id_pengguna VARCHAR(50) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL COMMENT 'Bcrypt Password Hash',
  role ENUM('Mahasiswa', 'Dosen') NOT NULL,
  status_akun ENUM('Aktif', 'Nonaktif', 'Terkunci') NOT NULL DEFAULT 'Aktif',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pengguna),
  UNIQUE KEY uk_pengguna_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL DOSEN (Relasi 1:1 ke pengguna)
CREATE TABLE IF NOT EXISTS dosen (
  id_dosen VARCHAR(50) NOT NULL,
  id_pengguna VARCHAR(50) NOT NULL,
  nama_dosen VARCHAR(100) NOT NULL,
  mata_kuliah VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_dosen),
  UNIQUE KEY uk_dosen_pengguna (id_pengguna),
  CONSTRAINT fk_dosen_pengguna FOREIGN KEY (id_pengguna) 
    REFERENCES pengguna(id_pengguna) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL MAHASISWA (Relasi 1:1 ke pengguna)
CREATE TABLE IF NOT EXISTS mahasiswa (
  id_mahasiswa VARCHAR(50) NOT NULL,
  id_pengguna VARCHAR(50) NOT NULL,
  nim VARCHAR(30) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_mahasiswa),
  UNIQUE KEY uk_mhs_pengguna (id_pengguna),
  UNIQUE KEY uk_mhs_nim (nim),
  CONSTRAINT fk_mhs_pengguna FOREIGN KEY (id_pengguna) 
    REFERENCES pengguna(id_pengguna) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL BANK_SOAL (Dosen 1:N Bank Soal)
CREATE TABLE IF NOT EXISTS bank_soal (
  id_bank_soal VARCHAR(50) NOT NULL,
  id_dosen VARCHAR(50) NOT NULL,
  nama_mata_kuliah VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bank_soal),
  KEY idx_bank_soal_dosen (id_dosen),
  CONSTRAINT fk_bank_soal_dosen FOREIGN KEY (id_dosen) 
    REFERENCES dosen(id_dosen) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL SOAL (Bank Soal 1:N Soal)
CREATE TABLE IF NOT EXISTS soal (
  id_soal VARCHAR(50) NOT NULL,
  id_bank_soal VARCHAR(50) NOT NULL,
  pertanyaan TEXT NOT NULL,
  opsi_jawaban JSON NOT NULL COMMENT 'Array JSON opsi jawaban',
  kunci_jawaban VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_soal),
  KEY idx_soal_bank (id_bank_soal),
  CONSTRAINT fk_soal_bank FOREIGN KEY (id_bank_soal) 
    REFERENCES bank_soal(id_bank_soal) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL UJIAN (Dosen 1:N Ujian)
CREATE TABLE IF NOT EXISTS ujian (
  id_ujian VARCHAR(50) NOT NULL,
  id_dosen VARCHAR(50) NOT NULL,
  nama_ujian VARCHAR(100) NOT NULL,
  tanggal_waktu_mulai DATETIME NOT NULL,
  tanggal_waktu_selesai DATETIME NOT NULL,
  durasi INT NOT NULL COMMENT 'Durasi pengerjaan dalam satuan menit',
  pin_ujian VARCHAR(50) NOT NULL,
  batas_toleransi_pelanggaran INT NOT NULL DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_ujian),
  KEY idx_ujian_dosen (id_dosen),
  CONSTRAINT fk_ujian_dosen FOREIGN KEY (id_dosen) 
    REFERENCES dosen(id_dosen) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL UJIAN_SOAL (Relasi M:N Ujian dan Soal)
CREATE TABLE IF NOT EXISTS ujian_soal (
  id_ujian VARCHAR(50) NOT NULL,
  id_soal VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_ujian, id_soal),
  KEY idx_us_soal (id_soal),
  CONSTRAINT fk_us_ujian FOREIGN KEY (id_ujian) 
    REFERENCES ujian(id_ujian) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_us_soal FOREIGN KEY (id_soal) 
    REFERENCES soal(id_soal) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL PESERTA_UJIAN (Relasi M:N Ujian dan Mahasiswa)
CREATE TABLE IF NOT EXISTS peserta_ujian (
  id_ujian VARCHAR(50) NOT NULL,
  id_mahasiswa VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_ujian, id_mahasiswa),
  KEY idx_pu_mahasiswa (id_mahasiswa),
  CONSTRAINT fk_pu_ujian FOREIGN KEY (id_ujian) 
    REFERENCES ujian(id_ujian) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pu_mahasiswa FOREIGN KEY (id_mahasiswa) 
    REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL SESI_UJIAN_MAHASISWA (Satu Sesi per Mahasiswa per Ujian)
CREATE TABLE IF NOT EXISTS sesi_ujian_mahasiswa (
  id_sesi VARCHAR(50) NOT NULL,
  id_ujian VARCHAR(50) NOT NULL,
  id_mahasiswa VARCHAR(50) NOT NULL,
  waktu_mulai DATETIME NOT NULL,
  sisa_waktu INT NOT NULL COMMENT 'Sisa waktu dalam satuan detik',
  jumlah_peringatan INT NOT NULL DEFAULT 0,
  status_ujian ENUM('Berlangsung', 'Selesai', 'Dikunci Paksa', 'Disubmit Otomatis') NOT NULL DEFAULT 'Berlangsung',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesi),
  UNIQUE KEY uk_sesi_ujian_mhs (id_ujian, id_mahasiswa),
  KEY idx_sesi_ujian (id_ujian),
  KEY idx_sesi_mahasiswa (id_mahasiswa),
  CONSTRAINT fk_sesi_ujian FOREIGN KEY (id_ujian) 
    REFERENCES ujian(id_ujian) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sesi_mahasiswa FOREIGN KEY (id_mahasiswa) 
    REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL JAWABAN_MAHASISWA (Auto-Save, 1:N dari Sesi)
CREATE TABLE IF NOT EXISTS jawaban_mahasiswa (
  id_jawaban VARCHAR(50) NOT NULL,
  id_sesi VARCHAR(50) NOT NULL,
  id_soal VARCHAR(50) NOT NULL,
  jawaban_dipilih VARCHAR(255) NULL,
  urutan_soal INT NOT NULL,
  opsi_acak JSON NULL COMMENT 'Urutan opsi jawaban yang diacak untuk sesi ini',
  waktu_disimpan DATETIME NOT NULL,
  PRIMARY KEY (id_jawaban),
  UNIQUE KEY uk_jawaban_sesi_soal (id_sesi, id_soal),
  KEY idx_jawaban_soal (id_soal),
  CONSTRAINT fk_jawaban_sesi FOREIGN KEY (id_sesi) 
    REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jawaban_soal FOREIGN KEY (id_soal) 
    REFERENCES soal(id_soal) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL LOG_PELANGGARAN (Anti-Cheating Log, 1:N dari Sesi)
CREATE TABLE IF NOT EXISTS log_pelanggaran (
  id_log VARCHAR(50) NOT NULL,
  id_sesi VARCHAR(50) NOT NULL,
  jenis_pelanggaran ENUM('Pindah Tab', 'Copy-Paste', 'Sesi Dikunci Paksa') NOT NULL,
  waktu_kejadian DATETIME NOT NULL,
  jumlah_pelanggaran INT NOT NULL,
  PRIMARY KEY (id_log),
  KEY idx_log_sesi (id_sesi),
  CONSTRAINT fk_log_sesi FOREIGN KEY (id_sesi) 
    REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL BUKTI_UJIAN_HASIL (Resi / Tanda Terima Resmi, 1:0..1 dari Sesi)
CREATE TABLE IF NOT EXISTS bukti_ujian_hasil (
  id_bukti VARCHAR(50) NOT NULL,
  id_sesi VARCHAR(50) NOT NULL,
  waktu_pengiriman DATETIME NOT NULL,
  status_pengiriman VARCHAR(50) NOT NULL COMMENT 'Selesai, Disubmit Otomatis, Dikunci Paksa',
  total_nilai FLOAT NULL COMMENT 'NULL jika belum dinilai, atau float 0-100',
  status_keputusan ENUM('Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi') NOT NULL DEFAULT 'Tidak Ada',
  PRIMARY KEY (id_bukti),
  UNIQUE KEY uk_bukti_sesi (id_sesi),
  CONSTRAINT fk_bukti_sesi FOREIGN KEY (id_sesi) 
    REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

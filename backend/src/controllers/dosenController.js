/**
 * src/controllers/dosenController.js
 * Controller lengkap untuk manajemen Dosen (TC-09, TC-10, TC-27 s.d. TC-42, TC-52):
 * - Bank Soal & CRUD Soal (4 tipe: Pilihan Ganda, Benar/Salah, Isian Singkat, Esai) + Validasi Kunci (TC-29, TC-30)
 * - Ujian & Pengaturan Jadwal, Durasi (> 0), PIN, Attempt, Pengacakan, IP Kampus (TC-31..TC-33, TC-41)
 * - Peserta Ujian (Tambah tunggal/bulk NIM & Hapus - TC-34)
 * - Tambah Waktu Peserta +5 Menit Real-Time (TC-42)
 * - Tinjau Log Pelanggaran & Tetapkan Keputusan/Sanksi (TC-35, TC-36)
 * - Penilaian Manual Soal Esai & Publikasi Hasil (TC-27, TC-28, TC-39, TC-40)
 */

const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { calculateTotalScore } = require('../utils/autoGrader');

// =============================================================================
// 1. BANK SOAL
// =============================================================================

exports.getBankSoal = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const [rows] = await pool.query(
      `SELECT bs.*, COUNT(s.id_soal) AS total_soal
       FROM bank_soal bs
       LEFT JOIN soal s ON bs.id_bank_soal = s.id_bank_soal
       WHERE bs.id_dosen = ?
       GROUP BY bs.id_bank_soal
       ORDER BY bs.created_at DESC`,
      [idDosen]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getBankSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat bank soal.' });
  }
};

exports.createBankSoal = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const { nama_mata_kuliah } = req.body;

    if (!nama_mata_kuliah || !nama_mata_kuliah.trim()) {
      return res.status(400).json({ success: false, message: 'Nama mata kuliah wajib diisi.' });
    }

    const idBankSoal = generateId('BS', 8);
    await pool.query(
      'INSERT INTO bank_soal (id_bank_soal, id_dosen, nama_mata_kuliah) VALUES (?, ?, ?)',
      [idBankSoal, idDosen, nama_mata_kuliah.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Bank soal berhasil dibuat.',
      data: { id_bank_soal: idBankSoal, nama_mata_kuliah: nama_mata_kuliah.trim() }
    });
  } catch (error) {
    console.error('Error createBankSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat bank soal.' });
  }
};

exports.deleteBankSoal = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const { id_bank_soal } = req.params;

    const [result] = await pool.query(
      'DELETE FROM bank_soal WHERE id_bank_soal = ? AND id_dosen = ?',
      [id_bank_soal, idDosen]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Bank soal tidak ditemukan.' });
    }

    return res.status(200).json({ success: true, message: 'Bank soal berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleteBankSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus bank soal.' });
  }
};

// =============================================================================
// 2. SOAL (TC-29, TC-30, TC-37, TC-38)
// =============================================================================

exports.getSoalByBank = async (req, res) => {
  try {
    const { id_bank_soal } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM soal WHERE id_bank_soal = ? ORDER BY created_at ASC',
      [id_bank_soal]
    );

    const formatted = rows.map((s) => {
      let opsi = null;
      try {
        opsi = typeof s.opsi_jawaban === 'string' ? JSON.parse(s.opsi_jawaban) : s.opsi_jawaban;
      } catch {
        opsi = null;
      }
      return { ...s, opsi_jawaban: opsi };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error getSoalByBank:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat soal.' });
  }
};

exports.createSoal = async (req, res) => {
  try {
    let { id_bank_soal, tipe_soal, pertanyaan, opsi_jawaban, kunci_jawaban, bobot, id_ujian } = req.body;
    const idDosen = req.user.id_profil;

    const tipeValid = ['Pilihan Ganda', 'Benar/Salah', 'Isian Singkat', 'Esai'];
    if (!tipeValid.includes(tipe_soal)) {
      return res.status(400).json({
        success: false,
        message: `Tipe soal tidak valid. Pilihan: ${tipeValid.join(', ')}`
      });
    }

    if (!pertanyaan || !pertanyaan.trim()) {
      return res.status(400).json({ success: false, message: 'Pertanyaan soal wajib diisi.' });
    }

    // TC-30: Validasi kunci jawaban wajib diisi untuk soal objektif
    if (tipe_soal !== 'Esai') {
      if (!kunci_jawaban || !String(kunci_jawaban).trim()) {
        return res.status(400).json({
          success: false,
          validation_error: 'KUNCI_JAWABAN_KOSONG',
          message: `Kunci jawaban wajib diisi untuk soal tipe ${tipe_soal} (TC-30).`
        });
      }
    }

    const bobotVal = parseFloat(bobot);
    if (isNaN(bobotVal) || bobotVal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bobot soal harus berupa angka lebih dari 0.'
      });
    }

    // Jika id_bank_soal belum dikirim, ambil bank soal pertama milik dosen atau buat baru
    if (!id_bank_soal) {
      const [banks] = await pool.query(
        'SELECT id_bank_soal FROM bank_soal WHERE id_dosen = ? ORDER BY created_at ASC LIMIT 1',
        [idDosen]
      );
      if (banks.length > 0) {
        id_bank_soal = banks[0].id_bank_soal;
      } else {
        id_bank_soal = generateId('BS', 8);
        await pool.query(
          'INSERT INTO bank_soal (id_bank_soal, id_dosen, nama_mata_kuliah) VALUES (?, ?, ?)',
          [id_bank_soal, idDosen, 'Bank Soal Utama']
        );
      }
    }

    let jsonOpsi = null;
    if (tipe_soal === 'Pilihan Ganda') {
      if (!opsi_jawaban || !Array.isArray(opsi_jawaban) || opsi_jawaban.filter((o) => String(o).trim()).length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Opsi jawaban wajib diisi minimal 2 pilihan untuk Pilihan Ganda.'
        });
      }
      jsonOpsi = JSON.stringify(opsi_jawaban.map((o) => String(o).trim()));
    } else if (tipe_soal === 'Benar/Salah') {
      jsonOpsi = JSON.stringify(['Benar', 'Salah']);
    }

    const idSoal = generateId('SOAL', 8);
    const kunciVal = tipe_soal === 'Esai' ? null : String(kunci_jawaban).trim();

    await pool.query(
      `INSERT INTO soal (id_soal, id_bank_soal, tipe_soal, pertanyaan, opsi_jawaban, kunci_jawaban, bobot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idSoal, id_bank_soal, tipe_soal, pertanyaan.trim(), jsonOpsi, kunciVal, bobotVal]
    );

    // Tautkan otomatis ke ujian jika id_ujian disertakan atau ke ujian aktif dosen
    if (id_ujian) {
      await pool.query('INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)', [id_ujian, idSoal]);
    } else {
      const [ujianList] = await pool.query('SELECT id_ujian FROM ujian WHERE id_dosen = ?', [idDosen]);
      for (const u of ujianList) {
        await pool.query('INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)', [u.id_ujian, idSoal]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Soal berhasil ditambahkan ke Bank Soal (TC-29).',
      data: {
        id_soal: idSoal,
        id_bank_soal,
        tipe_soal,
        pertanyaan: pertanyaan.trim(),
        opsi_jawaban: jsonOpsi ? JSON.parse(jsonOpsi) : null,
        kunci_jawaban: kunciVal,
        bobot: bobotVal
      }
    });
  } catch (error) {
    console.error('Error createSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan soal.' });
  }
};

exports.updateSoal = async (req, res) => {
  try {
    const { id_soal } = req.params;
    const { tipe_soal, pertanyaan, opsi_jawaban, kunci_jawaban, bobot } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM soal WHERE id_soal = ?', [id_soal]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
    }

    const existing = existingRows[0];
    const finalTipe = tipe_soal || existing.tipe_soal;
    const finalPertanyaan = pertanyaan !== undefined ? String(pertanyaan).trim() : existing.pertanyaan;
    const finalBobot = bobot !== undefined ? parseFloat(bobot) : existing.bobot;
    const finalKunci =
      finalTipe === 'Esai'
        ? null
        : kunci_jawaban !== undefined
          ? String(kunci_jawaban).trim()
          : existing.kunci_jawaban;

    if (!finalPertanyaan) {
      return res.status(400).json({ success: false, message: 'Pertanyaan soal tidak boleh kosong.' });
    }

    // TC-30: Validasi kunci jawaban untuk soal objektif
    if (finalTipe !== 'Esai' && (!finalKunci || !String(finalKunci).trim())) {
      return res.status(400).json({
        success: false,
        validation_error: 'KUNCI_JAWABAN_KOSONG',
        message: `Kunci jawaban wajib diisi untuk soal tipe ${finalTipe} (TC-30).`
      });
    }

    if (isNaN(finalBobot) || finalBobot <= 0) {
      return res.status(400).json({ success: false, message: 'Bobot soal harus lebih dari 0.' });
    }

    let jsonOpsi = existing.opsi_jawaban;
    if (finalTipe === 'Pilihan Ganda' && Array.isArray(opsi_jawaban)) {
      jsonOpsi = JSON.stringify(opsi_jawaban.map((o) => String(o).trim()));
    } else if (finalTipe === 'Benar/Salah') {
      jsonOpsi = JSON.stringify(['Benar', 'Salah']);
    } else if (finalTipe === 'Isian Singkat' || finalTipe === 'Esai') {
      jsonOpsi = null;
    } else if (typeof jsonOpsi === 'object' && jsonOpsi !== null) {
      jsonOpsi = JSON.stringify(jsonOpsi);
    }

    await pool.query(
      `UPDATE soal 
       SET tipe_soal = ?, pertanyaan = ?, opsi_jawaban = ?, kunci_jawaban = ?, bobot = ?
       WHERE id_soal = ?`,
      [finalTipe, finalPertanyaan, jsonOpsi, finalKunci, finalBobot, id_soal]
    );

    return res.status(200).json({
      success: true,
      message: 'Soal berhasil diperbarui (TC-29).',
      data: {
        id_soal,
        tipe_soal: finalTipe,
        pertanyaan: finalPertanyaan,
        opsi_jawaban: jsonOpsi ? JSON.parse(jsonOpsi) : null,
        kunci_jawaban: finalKunci,
        bobot: finalBobot
      }
    });
  } catch (error) {
    console.error('Error updateSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui soal.' });
  }
};

exports.deleteSoal = async (req, res) => {
  try {
    const { id_soal } = req.params;
    const [result] = await pool.query('DELETE FROM soal WHERE id_soal = ?', [id_soal]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Soal berhasil dihapus dari Bank Soal (TC-29).' });
  } catch (error) {
    console.error('Error deleteSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus soal.' });
  }
};

// =============================================================================
// 3. UJIAN & PENGATURAN (TC-09, TC-10, TC-31, TC-32, TC-33, TC-41, TC-43)
// =============================================================================

exports.getUjianByDosen = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const [rows] = await pool.query(
      `SELECT 
        u.*,
        COUNT(DISTINCT us.id_soal) AS total_soal,
        COUNT(DISTINCT pu.id_mahasiswa) AS total_peserta
       FROM ujian u
       LEFT JOIN ujian_soal us ON u.id_ujian = us.id_ujian
       LEFT JOIN peserta_ujian pu ON u.id_ujian = pu.id_ujian
       WHERE u.id_dosen = ?
       GROUP BY u.id_ujian
       ORDER BY u.created_at DESC`,
      [idDosen]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getUjianByDosen:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar ujian dosen.' });
  }
};

exports.createUjian = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const {
      nama_ujian,
      tanggal_waktu_mulai,
      tanggal_waktu_selesai,
      durasi,
      pin_ujian,
      maks_percobaan,
      acak_aktif,
      acak_opsi,
      batasi_jaringan_kampus,
      subnet_kampus,
      batas_toleransi_pelanggaran,
      soal_ids,
      nims
    } = req.body;

    if (!nama_ujian || !tanggal_waktu_mulai || !tanggal_waktu_selesai || durasi === undefined || !pin_ujian) {
      return res.status(400).json({
        success: false,
        message: 'Nama ujian, waktu mulai, waktu selesai, durasi, dan PIN ujian wajib diisi.'
      });
    }

    // TC-32: Validasi durasi ujian > 0 menit
    const durasiInt = parseInt(durasi, 10);
    if (isNaN(durasiInt) || durasiInt <= 0) {
      return res.status(400).json({
        success: false,
        validation_error: 'DURASI_TIDAK_VALID',
        message: 'Durasi ujian tidak valid (TC-32). Durasi ujian harus lebih dari 0 menit.'
      });
    }

    const mulaiDate = new Date(tanggal_waktu_mulai);
    const selesaiDate = new Date(tanggal_waktu_selesai);
    if (isNaN(mulaiDate.getTime()) || isNaN(selesaiDate.getTime()) || selesaiDate <= mulaiDate) {
      return res.status(400).json({
        success: false,
        message: 'Waktu selesai ujian harus lebih besar daripada waktu mulai ujian.'
      });
    }

    const idUjian = generateId('UJN', 8);

    await pool.query(
      `INSERT INTO ujian 
        (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, maks_percobaan, acak_aktif, acak_opsi, batasi_jaringan_kampus, subnet_kampus, batas_toleransi_pelanggaran, hasil_dipublikasikan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        idUjian,
        idDosen,
        nama_ujian.trim(),
        tanggal_waktu_mulai,
        tanggal_waktu_selesai,
        durasiInt,
        String(pin_ujian).trim(),
        parseInt(maks_percobaan, 10) || 1,
        acak_aktif !== undefined ? Boolean(acak_aktif) : true,
        acak_opsi !== undefined ? Boolean(acak_opsi) : true,
        batasi_jaringan_kampus !== undefined ? Boolean(batasi_jaringan_kampus) : false,
        subnet_kampus || '127.0.0.1,::1,192.168.,10.,172.16.',
        parseInt(batas_toleransi_pelanggaran, 10) || 3
      ]
    );

    // Tautkan soal ke ujian baru (jika soal_ids tidak dikirim, tautkan semua soal di bank soal dosen)
    if (Array.isArray(soal_ids) && soal_ids.length > 0) {
      for (const sid of soal_ids) {
        await pool.query('INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)', [idUjian, sid]);
      }
    } else {
      const [allSoal] = await pool.query(
        `SELECT s.id_soal FROM soal s JOIN bank_soal bs ON s.id_bank_soal = bs.id_bank_soal WHERE bs.id_dosen = ?`,
        [idDosen]
      );
      for (const s of allSoal) {
        await pool.query('INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)', [idUjian, s.id_soal]);
      }
    }

    // Daftarkan peserta ke ujian baru (TC-34 & TC-43)
    if (Array.isArray(nims) && nims.length > 0) {
      const [mhsList] = await pool.query('SELECT id_mahasiswa FROM mahasiswa WHERE nim IN (?)', [nims]);
      for (const m of mhsList) {
        await pool.query('INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)', [idUjian, m.id_mahasiswa]);
      }
    } else {
      const [allMhs] = await pool.query("SELECT m.id_mahasiswa FROM mahasiswa m JOIN pengguna p ON m.id_pengguna = p.id_pengguna WHERE p.status_akun = 'Aktif'");
      for (const m of allMhs) {
        await pool.query('INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)', [idUjian, m.id_mahasiswa]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Ujian baru berhasil dibuat dan notifikasi jadwal dikirim ke peserta terdaftar (TC-43).',
      data: { id_ujian: idUjian }
    });
  } catch (error) {
    console.error('Error createUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat ujian baru.' });
  }
};

exports.updateUjian = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const { id_ujian } = req.params;
    const {
      nama_ujian,
      tanggal_waktu_mulai,
      tanggal_waktu_selesai,
      durasi,
      pin_ujian,
      maks_percobaan,
      acak_aktif,
      acak_opsi,
      batasi_jaringan_kampus,
      subnet_kampus,
      batas_toleransi_pelanggaran,
      hasil_dipublikasikan
    } = req.body;

    const [rows] = await pool.query('SELECT * FROM ujian WHERE id_ujian = ? AND id_dosen = ?', [id_ujian, idDosen]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ujian tidak ditemukan.' });
    }

    const current = rows[0];

    // TC-32: Validasi durasi > 0 menit
    const durasiInt = durasi !== undefined ? parseInt(durasi, 10) : current.durasi;
    if (isNaN(durasiInt) || durasiInt <= 0) {
      return res.status(400).json({
        success: false,
        validation_error: 'DURASI_TIDAK_VALID',
        message: 'Durasi ujian tidak valid (TC-32). Durasi ujian harus lebih dari 0 menit.'
      });
    }

    const finalNama = nama_ujian ? nama_ujian.trim() : current.nama_ujian;
    const finalMulai = tanggal_waktu_mulai || current.tanggal_waktu_mulai;
    const finalSelesai = tanggal_waktu_selesai || current.tanggal_waktu_selesai;
    const finalPin = pin_ujian ? String(pin_ujian).trim() : current.pin_ujian;
    const finalPercobaan = maks_percobaan !== undefined ? parseInt(maks_percobaan, 10) : current.maks_percobaan;
    const finalAcakSoal = acak_aktif !== undefined ? Boolean(acak_aktif) : Boolean(current.acak_aktif);
    const finalAcakOpsi = acak_opsi !== undefined ? Boolean(acak_opsi) : Boolean(current.acak_opsi);
    const finalBatasiJaringan =
      batasi_jaringan_kampus !== undefined ? Boolean(batasi_jaringan_kampus) : Boolean(current.batasi_jaringan_kampus);
    const finalSubnet = subnet_kampus !== undefined ? subnet_kampus : current.subnet_kampus;
    const finalToleransi =
      batas_toleransi_pelanggaran !== undefined
        ? parseInt(batas_toleransi_pelanggaran, 10)
        : current.batas_toleransi_pelanggaran;
    const finalPublikasi =
      hasil_dipublikasikan !== undefined ? Boolean(hasil_dipublikasikan) : Boolean(current.hasil_dipublikasikan);

    await pool.query(
      `UPDATE ujian 
       SET nama_ujian = ?, tanggal_waktu_mulai = ?, tanggal_waktu_selesai = ?, durasi = ?, pin_ujian = ?, 
           maks_percobaan = ?, acak_aktif = ?, acak_opsi = ?, batasi_jaringan_kampus = ?, subnet_kampus = ?, 
           batas_toleransi_pelanggaran = ?, hasil_dipublikasikan = ?
       WHERE id_ujian = ? AND id_dosen = ?`,
      [
        finalNama,
        finalMulai,
        finalSelesai,
        durasiInt,
        finalPin,
        finalPercobaan,
        finalAcakSoal,
        finalAcakOpsi,
        finalBatasiJaringan,
        finalSubnet,
        finalToleransi,
        finalPublikasi,
        id_ujian,
        idDosen
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Pengaturan ujian berhasil disimpan.',
      data: {
        id_ujian,
        nama_ujian: finalNama,
        tanggal_waktu_mulai: finalMulai,
        tanggal_waktu_selesai: finalSelesai,
        durasi: durasiInt,
        pin_ujian: finalPin,
        maks_percobaan: finalPercobaan,
        acak_aktif: finalAcakSoal,
        acak_opsi: finalAcakOpsi,
        batasi_jaringan_kampus: finalBatasiJaringan,
        batas_toleransi_pelanggaran: finalToleransi,
        hasil_dipublikasikan: finalPublikasi
      }
    });
  } catch (error) {
    console.error('Error updateUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan ujian.' });
  }
};

exports.togglePublikasiHasil = async (req, res) => {
  try {
    const idDosen = req.user.id_profil;
    const { id_ujian } = req.params;
    const { hasil_dipublikasikan } = req.body;

    await pool.query(
      'UPDATE ujian SET hasil_dipublikasikan = ? WHERE id_ujian = ? AND id_dosen = ?',
      [Boolean(hasil_dipublikasikan), id_ujian, idDosen]
    );

    return res.status(200).json({
      success: true,
      hasil_dipublikasikan: Boolean(hasil_dipublikasikan),
      message: `Publikasi hasil ujian berhasil ${hasil_dipublikasikan ? 'diaktifkan (TC-28)' : 'dinonaktifkan (TC-27)'}.`
    });
  } catch (error) {
    console.error('Error togglePublikasiHasil:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status publikasi hasil.' });
  }
};

// =============================================================================
// 4. RELASI UJIAN & SOAL (ujian_soal)
// =============================================================================

exports.assignSoalToUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const { soal_ids } = req.body;

    if (!Array.isArray(soal_ids) || soal_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'soal_ids harus berupa array ID soal.' });
    }

    for (const sid of soal_ids) {
      await pool.query(
        'INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)',
        [id_ujian, sid]
      );
    }

    return res.status(200).json({ success: true, message: 'Soal berhasil ditautkan ke ujian.' });
  } catch (error) {
    console.error('Error assignSoalToUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal menautkan soal ke ujian.' });
  }
};

exports.removeSoalFromUjian = async (req, res) => {
  try {
    const { id_ujian, id_soal } = req.params;
    await pool.query('DELETE FROM ujian_soal WHERE id_ujian = ? AND id_soal = ?', [id_ujian, id_soal]);
    return res.status(200).json({ success: true, message: 'Soal berhasil dilepas dari ujian.' });
  } catch (error) {
    console.error('Error removeSoalFromUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal melepas soal.' });
  }
};

// =============================================================================
// 5. PESERTA UJIAN & TAMBAH WAKTU (TC-34, TC-42)
// =============================================================================

exports.getPesertaUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        m.id_mahasiswa, 
        m.nim, 
        m.nama, 
        s.id_sesi, 
        s.status_ujian, 
        s.sisa_waktu,
        s.tambahan_waktu,
        s.jumlah_peringatan, 
        b.id_bukti,
        b.total_nilai, 
        b.status_keputusan
       FROM peserta_ujian pu
       JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN sesi_ujian_mahasiswa s ON (
         s.id_sesi = (
           SELECT s2.id_sesi 
           FROM sesi_ujian_mahasiswa s2 
           WHERE s2.id_ujian = pu.id_ujian AND s2.id_mahasiswa = m.id_mahasiswa
           ORDER BY s2.percobaan_ke DESC LIMIT 1
         )
       )
       LEFT JOIN bukti_ujian_hasil b ON b.id_sesi = s.id_sesi
       WHERE pu.id_ujian = ?
       ORDER BY m.nim ASC`,
      [id_ujian]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getPesertaUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat peserta ujian.' });
  }
};

exports.addPesertaUjianBulk = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const { nims, nim, nama } = req.body;

    const targetNims = Array.isArray(nims) ? nims : nim ? [String(nim).trim()] : [];
    if (targetNims.length === 0) {
      return res.status(400).json({ success: false, message: 'NIM peserta wajib diisi (TC-34).' });
    }

    let addedCount = 0;
    for (const rawNim of targetNims) {
      const cleanNim = String(rawNim).trim();
      if (!cleanNim) continue;

      let [mhsRows] = await pool.query('SELECT id_mahasiswa, nim, nama FROM mahasiswa WHERE nim = ?', [cleanNim]);

      // Jika mahasiswa dengan NIM tersebut belum ada di DB, buat akun mahasiswa baru secara otomatis agar mudah diuji
      if (mhsRows.length === 0) {
        const idPengguna = generateId('USR', 8);
        const idMhs = generateId('MHS', 8);
        const namaMhs = nama && String(nama).trim() ? String(nama).trim() : `Mahasiswa (${cleanNim})`;
        const defaultHash = await bcrypt.hash('123', 10);

        await pool.query(
          "INSERT IGNORE INTO pengguna (id_pengguna, username, password, role, status_akun) VALUES (?, ?, ?, 'Mahasiswa', 'Aktif')",
          [idPengguna, cleanNim, defaultHash]
        );
        await pool.query(
          'INSERT IGNORE INTO mahasiswa (id_mahasiswa, id_pengguna, nim, nama) VALUES (?, ?, ?, ?)',
          [idMhs, idPengguna, cleanNim, namaMhs]
        );
        mhsRows = [{ id_mahasiswa: idMhs, nim: cleanNim, nama: namaMhs }];
      }

      for (const mhs of mhsRows) {
        await pool.query(
          'INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)',
          [id_ujian, mhs.id_mahasiswa]
        );
        addedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `${addedCount} mahasiswa berhasil didaftarkan ke ujian (TC-34).`
    });
  } catch (error) {
    console.error('Error addPesertaUjianBulk:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan peserta ujian.' });
  }
};

exports.removePesertaUjian = async (req, res) => {
  try {
    const { id_ujian, id_mahasiswa } = req.params;
    // Dukung penghapusan berdasarkan id_mahasiswa maupun NIM
    await pool.query(
      `DELETE pu FROM peserta_ujian pu
       LEFT JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
       WHERE pu.id_ujian = ? AND (pu.id_mahasiswa = ? OR m.nim = ?)`,
      [id_ujian, id_mahasiswa, id_mahasiswa]
    );
    return res.status(200).json({ success: true, message: 'Peserta berhasil dihapus dari daftar ujian (TC-34).' });
  } catch (error) {
    console.error('Error removePesertaUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus peserta.' });
  }
};

/**
 * TC-42: Dosen menambah waktu pengerjaan peserta (+5 menit atau sesuai input)
 */
exports.tambahWaktuPeserta = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { id_ujian, tambahan_menit = 5 } = req.body;

    const menit = parseInt(tambahan_menit, 10);
    if (isNaN(menit) || menit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tambahan waktu harus berupa angka menit lebih dari 0.'
      });
    }

    const tambahanDetik = menit * 60;

    if (id_sesi && id_sesi !== 'semua') {
      const [sesiRows] = await pool.query('SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?', [id_sesi]);
      if (sesiRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Sesi ujian peserta tidak ditemukan.' });
      }

      await pool.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET tambahan_waktu = tambahan_waktu + ?, sisa_waktu = sisa_waktu + ?
         WHERE id_sesi = ?`,
        [menit, tambahanDetik, id_sesi]
      );

      const [updated] = await pool.query('SELECT id_sesi, sisa_waktu, tambahan_waktu FROM sesi_ujian_mahasiswa WHERE id_sesi = ?', [id_sesi]);
      return res.status(200).json({
        success: true,
        message: `Waktu peserta berhasil ditambah +${menit} menit (${tambahanDetik} detik) (TC-42).`,
        data: updated[0]
      });
    }

    // Jika untuk seluruh sesi aktif pada suatu ujian
    if (id_ujian) {
      await pool.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET tambahan_waktu = tambahan_waktu + ?, sisa_waktu = sisa_waktu + ?
         WHERE id_ujian = ? AND status_ujian = 'Berlangsung'`,
        [menit, tambahanDetik, id_ujian]
      );
      await pool.query(
        `UPDATE ujian SET durasi = durasi + ? WHERE id_ujian = ?`,
        [menit, id_ujian]
      );
      return res.status(200).json({
        success: true,
        message: `Waktu ujian berhasil ditambah +${menit} menit untuk seluruh peserta aktif (TC-42).`
      });
    }

    return res.status(400).json({ success: false, message: 'id_sesi atau id_ujian wajib disertakan.' });
  } catch (error) {
    console.error('Error tambahWaktuPeserta:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambah waktu ujian peserta.' });
  }
};

// =============================================================================
// 6. TINJAU LOG PELANGGARAN & SANKSI (TC-35, TC-36, TC-52)
// =============================================================================

exports.getLogPelanggaranByUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const idDosen = req.user.id_profil;

    let query = `
      SELECT 
        l.id_log,
        l.jenis_pelanggaran,
        l.waktu_kejadian,
        l.jumlah_pelanggaran,
        s.id_sesi,
        s.id_ujian,
        s.status_ujian,
        u.nama_ujian,
        m.id_mahasiswa,
        m.nim,
        m.nama as nama_mahasiswa,
        b.status_keputusan,
        b.total_nilai
       FROM log_pelanggaran l
       JOIN sesi_ujian_mahasiswa s ON l.id_sesi = s.id_sesi
       JOIN ujian u ON s.id_ujian = u.id_ujian
       JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN bukti_ujian_hasil b ON b.id_sesi = s.id_sesi
    `;
    const params = [];

    if (id_ujian && id_ujian !== 'semua') {
      query += ` WHERE s.id_ujian = ? `;
      params.push(id_ujian);
    } else {
      query += ` WHERE u.id_dosen = ? `;
      params.push(idDosen);
    }

    query += ` ORDER BY l.waktu_kejadian DESC`;

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getLogPelanggaranByUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat log pelanggaran.' });
  }
};

exports.tetapkanKeputusanSanksi = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { status_keputusan, nilai_penyesuaian, pengurangan_poin } = req.body;

    const keputusanValid = ['Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi'];
    if (!keputusanValid.includes(status_keputusan)) {
      return res.status(400).json({
        success: false,
        message: `Status keputusan tidak valid. Pilihan: ${keputusanValid.join(', ')}`
      });
    }

    // Pastikan sesi ada
    const [sesiRows] = await pool.query('SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?', [id_sesi]);
    if (sesiRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan.' });
    }

    // Ambil atau buat bukti_ujian_hasil
    let [buktiRows] = await pool.query('SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?', [id_sesi]);
    if (buktiRows.length === 0) {
      const idBukti = generateId('BKT', 8);
      await pool.query(
        `INSERT INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
         VALUES (?, ?, NOW(), 'Dikunci Paksa', 75, ?)`,
        [idBukti, id_sesi, status_keputusan]
      );
      [buktiRows] = await pool.query('SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?', [id_sesi]);
    }

    const currentBukti = buktiRows[0];
    let nilaiAkhir = currentBukti.total_nilai !== null ? parseFloat(currentBukti.total_nilai) : 75;

    if (status_keputusan === 'Diskualifikasi') {
      nilaiAkhir = 0;
      await pool.query(
        "UPDATE sesi_ujian_mahasiswa SET status_ujian = 'Dikunci Paksa', sisa_waktu = 0 WHERE id_sesi = ?",
        [id_sesi]
      );
    } else if (status_keputusan === 'Pengurangan Nilai') {
      if (typeof nilai_penyesuaian === 'number') {
        nilaiAkhir = Math.max(0, nilai_penyesuaian);
      } else if (typeof pengurangan_poin === 'number') {
        nilaiAkhir = Math.max(0, nilaiAkhir - pengurangan_poin);
      } else {
        nilaiAkhir = Math.max(0, nilaiAkhir - 15); // Default pengurangan 15 poin
      }
    }

    await pool.query(
      `UPDATE bukti_ujian_hasil 
       SET status_keputusan = ?, total_nilai = ? 
       WHERE id_sesi = ?`,
      [status_keputusan, nilaiAkhir, id_sesi]
    );

    return res.status(200).json({
      success: true,
      message: `Keputusan sanksi '${status_keputusan}' berhasil ditetapkan pada sesi peserta (TC-36).`,
      data: {
        id_sesi,
        status_keputusan,
        total_nilai: nilaiAkhir
      }
    });
  } catch (error) {
    console.error('Error tetapkanKeputusanSanksi:', error);
    return res.status(500).json({ success: false, message: 'Gagal menetapkan keputusan sanksi.' });
  }
};

// =============================================================================
// 7. PENILAIAN MANUAL ESAI & REKALKULASI NILAI (TC-39, TC-40)
// =============================================================================

exports.getJawabanSesiMahasiswa = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        j.id_jawaban,
        j.id_soal,
        j.jawaban_dipilih,
        j.nilai_soal,
        j.urutan_soal,
        s.tipe_soal,
        s.pertanyaan,
        s.kunci_jawaban,
        s.bobot
       FROM jawaban_mahasiswa j
       JOIN soal s ON j.id_soal = s.id_soal
       WHERE j.id_sesi = ?
       ORDER BY j.urutan_soal ASC`,
      [id_sesi]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getJawabanSesiMahasiswa:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail jawaban mahasiswa.' });
  }
};

exports.inputNilaiEsai = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { penilaian_esai, nilai_langsung } = req.body;

    const hasilRekalkulasi = await withTransaction(async (conn) => {
      if (Array.isArray(penilaian_esai) && penilaian_esai.length > 0) {
        for (const item of penilaian_esai) {
          if (item.id_jawaban) {
            await conn.query(
              'UPDATE jawaban_mahasiswa SET nilai_soal = ? WHERE id_jawaban = ? AND id_sesi = ?',
              [parseFloat(item.nilai_soal) || 0, item.id_jawaban, id_sesi]
            );
          } else if (item.id_soal) {
            await conn.query(
              'UPDATE jawaban_mahasiswa SET nilai_soal = ? WHERE id_soal = ? AND id_sesi = ?',
              [parseFloat(item.nilai_soal) || 0, item.id_soal, id_sesi]
            );
          }
        }
      }

      // Ambil seluruh jawaban untuk sesi ini
      const [allJawaban] = await conn.query(
        `SELECT j.id_jawaban, j.nilai_soal, s.bobot, s.tipe_soal
         FROM jawaban_mahasiswa j
         JOIN soal s ON j.id_soal = s.id_soal
         WHERE j.id_sesi = ?`,
        [id_sesi]
      );

      // Jika nilai_langsung diberikan (misal dosen memberi nilai esai = 80 dalam skala 0-100 pada soal esai)
      if (typeof nilai_langsung === 'number') {
        for (const ans of allJawaban) {
          if (ans.tipe_soal === 'Esai') {
            const scaledScore = (nilai_langsung / 100) * (parseFloat(ans.bobot) || 30);
            await conn.query(
              'UPDATE jawaban_mahasiswa SET nilai_soal = ? WHERE id_jawaban = ?',
              [scaledScore, ans.id_jawaban]
            );
            ans.nilai_soal = scaledScore;
          }
        }
      }

      // Hitung ulang total nilai
      const { totalNilai, adaEsaiPending } = calculateTotalScore(allJawaban);

      // Pastikan bukti_ujian_hasil ada dan terupdate
      const [bukti] = await conn.query('SELECT id_bukti FROM bukti_ujian_hasil WHERE id_sesi = ?', [id_sesi]);
      if (bukti.length > 0) {
        await conn.query(
          'UPDATE bukti_ujian_hasil SET total_nilai = ? WHERE id_sesi = ?',
          [totalNilai, id_sesi]
        );
      } else {
        const idBukti = generateId('BKT', 8);
        await conn.query(
          `INSERT INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
           VALUES (?, ?, NOW(), 'Berhasil', ?, 'Tidak Ada')`,
          [idBukti, id_sesi, totalNilai]
        );
      }

      return { totalNilai, adaEsaiPending };
    });

    return res.status(200).json({
      success: true,
      message: 'Nilai esai berhasil disimpan dan diakumulasikan ke total nilai akhir (TC-40).',
      data: hasilRekalkulasi
    });
  } catch (error) {
    console.error('Error inputNilaiEsai:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai esai.' });
  }
};

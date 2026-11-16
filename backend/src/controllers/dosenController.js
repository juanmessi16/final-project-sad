/**
 * src/controllers/dosenController.js
 * Controller lengkap untuk manajemen Dosen:
 * - Bank Soal & Soal (4 tipe: Pilihan Ganda, Benar/Salah, Isian Singkat, Esai)
 * - Ujian & Pengaturan Anti-Curang
 * - Peserta Ujian (Tambah tunggal/bulk NIM & Hapus)
 * - Tinjau Log Pelanggaran & Tetapkan Keputusan/Sanksi (BR-08, FR-22)
 * - Penilaian Manual Soal Esai & Rekalkulasi Nilai
 */

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
// 2. SOAL
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
    const { id_bank_soal, tipe_soal, pertanyaan, opsi_jawaban, kunci_jawaban, bobot } = req.body;

    const tipeValid = ['Pilihan Ganda', 'Benar/Salah', 'Isian Singkat', 'Esai'];
    if (!tipeValid.includes(tipe_soal)) {
      return res.status(400).json({
        success: false,
        message: `Tipe soal tidak valid. Pilihan: ${tipeValid.join(', ')}`
      });
    }

    if (!pertanyaan || !pertanyaan.trim()) {
      return res.status(400).json({ success: false, message: 'Pertanyaan wajib diisi.' });
    }

    let jsonOpsi = null;
    if (tipe_soal === 'Pilihan Ganda' || tipe_soal === 'Benar/Salah') {
      if (!opsi_jawaban || !Array.isArray(opsi_jawaban) || opsi_jawaban.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Opsi jawaban berupa array string wajib diisi untuk Pilihan Ganda / Benar-Salah.'
        });
      }
      jsonOpsi = JSON.stringify(opsi_jawaban);
    }

    const idSoal = generateId('SOAL', 8);
    const bobotVal = parseFloat(bobot) || 10;
    const kunciVal = tipe_soal === 'Esai' ? null : (kunci_jawaban ? kunci_jawaban.trim() : null);

    await pool.query(
      `INSERT INTO soal (id_soal, id_bank_soal, tipe_soal, pertanyaan, opsi_jawaban, kunci_jawaban, bobot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idSoal, id_bank_soal, tipe_soal, pertanyaan.trim(), jsonOpsi, kunciVal, bobotVal]
    );

    return res.status(201).json({
      success: true,
      message: 'Soal berhasil ditambahkan.',
      data: { id_soal: idSoal }
    });
  } catch (error) {
    console.error('Error createSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan soal.' });
  }
};

exports.deleteSoal = async (req, res) => {
  try {
    const { id_soal } = req.params;
    const [result] = await pool.query('DELETE FROM soal WHERE id_soal = ?', [id_soal]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Soal berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleteSoal:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus soal.' });
  }
};

// =============================================================================
// 3. UJIAN
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
      batas_toleransi_pelanggaran
    } = req.body;

    if (!nama_ujian || !tanggal_waktu_mulai || !tanggal_waktu_selesai || !durasi || !pin_ujian) {
      return res.status(400).json({
        success: false,
        message: 'Nama ujian, waktu mulai, waktu selesai, durasi, dan PIN ujian wajib diisi.'
      });
    }

    const idUjian = generateId('UJN', 8);

    await pool.query(
      `INSERT INTO ujian 
        (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, maks_percobaan, acak_aktif, batas_toleransi_pelanggaran, hasil_dipublikasikan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        idUjian,
        idDosen,
        nama_ujian.trim(),
        tanggal_waktu_mulai,
        tanggal_waktu_selesai,
        parseInt(durasi, 10),
        pin_ujian.trim(),
        parseInt(maks_percobaan, 10) || 1,
        acak_aktif !== undefined ? Boolean(acak_aktif) : true,
        parseInt(batas_toleransi_pelanggaran, 10) || 3
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Ujian baru berhasil dibuat.',
      data: { id_ujian: idUjian }
    });
  } catch (error) {
    console.error('Error createUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat ujian baru.' });
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
      message: `Publikasi hasil ujian berhasil ${hasil_dipublikasikan ? 'diaktifkan' : 'dinonaktifkan'}.`
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
    const { soal_ids } = req.body; // array of id_soal

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
// 5. PESERTA UJIAN (peserta_ujian)
// =============================================================================

exports.getPesertaUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const [rows] = await pool.query(
      `SELECT m.id_mahasiswa, m.nim, m.nama, s.id_sesi, s.status_ujian, s.jumlah_peringatan, b.total_nilai, b.status_keputusan
       FROM peserta_ujian pu
       JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
       LEFT JOIN sesi_ujian_mahasiswa s ON (s.id_ujian = pu.id_ujian AND s.id_mahasiswa = m.id_mahasiswa)
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
    const { nims } = req.body; // array string NIM mahasiswa

    if (!Array.isArray(nims) || nims.length === 0) {
      return res.status(400).json({ success: false, message: 'nims harus berupa array NIM.' });
    }

    const [mahasiswaList] = await pool.query(
      'SELECT id_mahasiswa, nim FROM mahasiswa WHERE nim IN (?)',
      [nims]
    );

    if (mahasiswaList.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada NIM yang cocok dengan data mahasiswa.' });
    }

    for (const mhs of mahasiswaList) {
      await pool.query(
        'INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)',
        [id_ujian, mhs.id_mahasiswa]
      );
    }

    return res.status(200).json({
      success: true,
      message: `${mahasiswaList.length} mahasiswa berhasil didaftarkan ke ujian.`
    });
  } catch (error) {
    console.error('Error addPesertaUjianBulk:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan peserta ujian.' });
  }
};

exports.removePesertaUjian = async (req, res) => {
  try {
    const { id_ujian, id_mahasiswa } = req.params;
    await pool.query(
      'DELETE FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?',
      [id_ujian, id_mahasiswa]
    );
    return res.status(200).json({ success: true, message: 'Peserta berhasil dihapus dari ujian.' });
  } catch (error) {
    console.error('Error removePesertaUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus peserta.' });
  }
};

// =============================================================================
// 6. TINJAU LOG PELANGGARAN & SANKSI (FR-20, FR-22, BR-08)
// =============================================================================

exports.getLogPelanggaranByUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        l.id_log,
        l.jenis_pelanggaran,
        l.waktu_kejadian,
        l.jumlah_pelanggaran,
        s.id_sesi,
        s.status_ujian,
        m.nim,
        m.nama as nama_mahasiswa
       FROM log_pelanggaran l
       JOIN sesi_ujian_mahasiswa s ON l.id_sesi = s.id_sesi
       JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
       WHERE s.id_ujian = ?
       ORDER BY l.waktu_kejadian DESC`,
      [id_ujian]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getLogPelanggaranByUjian:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat log pelanggaran.' });
  }
};

exports.tetapkanKeputusanSanksi = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { status_keputusan, nilai_penyesuaian } = req.body;

    const keputusanValid = ['Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi'];
    if (!keputusanValid.includes(status_keputusan)) {
      return res.status(400).json({
        success: false,
        message: `Status keputusan tidak valid. Pilihan: ${keputusanValid.join(', ')}`
      });
    }

    // Ambil bukti_ujian_hasil
    const [buktiRows] = await pool.query('SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?', [id_sesi]);
    if (buktiRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bukti ujian untuk sesi ini belum diterbitkan.' });
    }

    const currentBukti = buktiRows[0];
    let nilaiAkhir = currentBukti.total_nilai;

    if (status_keputusan === 'Diskualifikasi') {
      nilaiAkhir = 0;
    } else if (status_keputusan === 'Pengurangan Nilai' && typeof nilai_penyesuaian === 'number') {
      nilaiAkhir = Math.max(0, nilai_penyesuaian);
    }

    await pool.query(
      `UPDATE bukti_ujian_hasil 
       SET status_keputusan = ?, total_nilai = ? 
       WHERE id_sesi = ?`,
      [status_keputusan, nilaiAkhir, id_sesi]
    );

    return res.status(200).json({
      success: true,
      message: 'Keputusan sanksi pelanggaran berhasil ditetapkan.',
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
// 7. PENILAIAN MANUAL ESAI (FR-21)
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
    const { penilaian_esai } = req.body; // array { id_jawaban, nilai_soal }

    if (!Array.isArray(penilaian_esai) || penilaian_esai.length === 0) {
      return res.status(400).json({ success: false, message: 'penilaian_esai harus berupa array.' });
    }

    const hasilRekalkulasi = await withTransaction(async (conn) => {
      // 1. Update nilai_soal untuk masing-masing esai
      for (const item of penilaian_esai) {
        await conn.query(
          'UPDATE jawaban_mahasiswa SET nilai_soal = ? WHERE id_jawaban = ? AND id_sesi = ?',
          [parseFloat(item.nilai_soal) || 0, item.id_jawaban, id_sesi]
        );
      }

      // 2. Ambil seluruh jawaban untuk sesi ini
      const [allJawaban] = await conn.query(
        `SELECT j.nilai_soal, s.bobot, s.tipe_soal
         FROM jawaban_mahasiswa j
         JOIN soal s ON j.id_soal = s.id_soal
         WHERE j.id_sesi = ?`,
        [id_sesi]
      );

      // 3. Hitung ulang total nilai
      const { totalNilai, adaEsaiPending } = calculateTotalScore(allJawaban);

      // 4. Update bukti_ujian_hasil
      await conn.query(
        'UPDATE bukti_ujian_hasil SET total_nilai = ? WHERE id_sesi = ?',
        [totalNilai, id_sesi]
      );

      return { totalNilai, adaEsaiPending };
    });

    return res.status(200).json({
      success: true,
      message: 'Nilai esai berhasil disimpan dan total nilai berhasil direkalkulasi.',
      data: hasilRekalkulasi
    });
  } catch (error) {
    console.error('Error inputNilaiEsai:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai esai.' });
  }
};

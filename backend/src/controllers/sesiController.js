/**
 * src/controllers/sesiController.js
 * Controller untuk autosave jawaban, detail sesi aktif, dan submit ujian
 * (FR-07, FR-11, FR-17, FR-18, BR-05, BR-06, BR-07, NFR-02, NFR-13, NFR-14).
 */

const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { gradeSingleAnswer, calculateTotalScore } = require('../utils/autoGrader');

/**
 * Detail sesi aktif mahasiswa
 */
exports.getSesiAktif = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const idMahasiswa = req.user.id_profil;

    const [sesiRows] = await pool.query(
      `SELECT s.*, u.nama_ujian, u.durasi, u.batas_toleransi_pelanggaran
       FROM sesi_ujian_mahasiswa s
       JOIN ujian u ON s.id_ujian = u.id_ujian
       WHERE s.id_sesi = ? AND s.id_mahasiswa = ?`,
      [id_sesi, idMahasiswa]
    );

    if (sesiRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesi ujian tidak ditemukan.'
      });
    }

    const sesi = sesiRows[0];

    // Ambil daftar soal
    const [soalRows] = await pool.query(
      `SELECT 
        s.id_soal,
        s.tipe_soal,
        s.pertanyaan,
        s.bobot,
        j.urutan_soal,
        j.urutan_opsi,
        j.jawaban_dipilih
       FROM jawaban_mahasiswa j
       JOIN soal s ON j.id_soal = s.id_soal
       WHERE j.id_sesi = ?
       ORDER BY j.urutan_soal ASC`,
      [id_sesi]
    );

    const questions = soalRows.map((q) => {
      let opsi = [];
      try {
        opsi = typeof q.urutan_opsi === 'string' ? JSON.parse(q.urutan_opsi) : q.urutan_opsi;
      } catch {
        opsi = [];
      }
      return {
        id_soal: q.id_soal,
        tipe_soal: q.tipe_soal,
        pertanyaan: q.pertanyaan,
        bobot: q.bobot,
        urutan_soal: q.urutan_soal,
        opsi_jawaban: opsi,
        jawaban_dipilih: q.jawaban_dipilih
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        sesi: {
          id_sesi: sesi.id_sesi,
          id_ujian: sesi.id_ujian,
          nama_ujian: sesi.nama_ujian,
          durasi: sesi.durasi,
          sisa_waktu: sesi.sisa_waktu,
          jumlah_peringatan: sesi.jumlah_peringatan,
          batas_toleransi_pelanggaran: sesi.batas_toleransi_pelanggaran,
          status_ujian: sesi.status_ujian
        },
        soal: questions
      }
    });
  } catch (error) {
    console.error('Error getSesiAktif:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat sesi aktif.'
    });
  }
};

/**
 * Autosave Jawaban Mahasiswa (FR-07, BR-05, NFR-02, NFR-13)
 */
exports.autosaveJawaban = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { id_soal, jawaban_dipilih, sisa_waktu } = req.body;
    const idMahasiswa = req.user.id_profil;

    if (!id_soal) {
      return res.status(400).json({
        success: false,
        message: 'id_soal wajib disertakan dalam autosave.'
      });
    }

    // 1. Cek validitas sesi
    const [sesiRows] = await pool.query(
      `SELECT s.*, u.durasi 
       FROM sesi_ujian_mahasiswa s
       JOIN ujian u ON s.id_ujian = u.id_ujian
       WHERE s.id_sesi = ? AND s.id_mahasiswa = ?`,
      [id_sesi, idMahasiswa]
    );

    if (sesiRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesi ujian tidak valid.'
      });
    }

    const sesi = sesiRows[0];
    if (sesi.status_ujian !== 'Berlangsung') {
      return res.status(400).json({
        success: false,
        message: `Sesi ujian telah berstatus '${sesi.status_ujian}'. Jawaban tidak dapat disimpan lagi.`
      });
    }

    // 2. Hitung validitas sisa waktu dari server clock
    const now = new Date();
    const waktuMulaiSesi = new Date(sesi.waktu_mulai);
    const totalDurasiDetik = sesi.durasi * 60;
    const detikBerjalan = Math.floor((now.getTime() - waktuMulaiSesi.getTime()) / 1000);
    const sisaWaktuServer = Math.max(0, totalDurasiDetik - detikBerjalan);

    if (sisaWaktuServer <= 0) {
      await pool.query(
        `UPDATE sesi_ujian_mahasiswa SET status_ujian = 'Disubmit Otomatis', sisa_waktu = 0 WHERE id_sesi = ?`,
        [id_sesi]
      );
      return res.status(400).json({
        success: false,
        message: 'Waktu ujian telah habis. Jawaban disubmit otomatis.'
      });
    }

    // Tentukan sisa waktu yang disimpan (prioritaskan server time atau request jika lebih kecil)
    const sisaWaktuToSave = typeof sisa_waktu === 'number'
      ? Math.min(sisaWaktuServer, Math.max(0, sisa_waktu))
      : sisaWaktuServer;

    // 3. Simpan jawaban dan perbarui sisa waktu secara atomik
    await pool.query(
      `UPDATE jawaban_mahasiswa 
       SET jawaban_dipilih = ?, waktu_disimpan = NOW()
       WHERE id_sesi = ? AND id_soal = ?`,
      [jawaban_dipilih !== undefined ? jawaban_dipilih : null, id_sesi, id_soal]
    );

    await pool.query(
      `UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?`,
      [sisaWaktuToSave, id_sesi]
    );

    return res.status(200).json({
      success: true,
      message: 'Jawaban berhasil disimpan otomatis.',
      data: {
        id_soal,
        waktu_disimpan: new Date().toISOString(),
        sisa_waktu: sisaWaktuToSave
      }
    });
  } catch (error) {
    console.error('Error autosaveJawaban:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan autosave jawaban.'
    });
  }
};

/**
 * Submit Ujian (Manual atau Otomatis Waktu Habis)
 * (FR-11, FR-17, FR-18, BR-06, BR-07, NFR-14)
 */
exports.submitUjian = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { otomatis } = req.body;
    const idMahasiswa = req.user.id_profil;

    const [sesiRows] = await pool.query(
      `SELECT s.*, u.nama_ujian, m.nama as nama_mahasiswa, m.nim
       FROM sesi_ujian_mahasiswa s
       JOIN ujian u ON s.id_ujian = u.id_ujian
       JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
       WHERE s.id_sesi = ? AND s.id_mahasiswa = ?`,
      [id_sesi, idMahasiswa]
    );

    if (sesiRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesi ujian tidak ditemukan.'
      });
    }

    const sesi = sesiRows[0];

    // Jika sudah selesai sebelumnya, kembalikan resi yang sudah ada
    if (sesi.status_ujian !== 'Berlangsung') {
      const [buktiExisting] = await pool.query(
        'SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?',
        [id_sesi]
      );
      return res.status(200).json({
        success: true,
        message: `Ujian sudah diselesaikan sebelumnya (${sesi.status_ujian}).`,
        resi: buktiExisting[0] || null
      });
    }

    // Jalankan submit dalam transaksi atomik
    const hasilSubmit = await withTransaction(async (conn) => {
      const statusFinal = otomatis ? 'Disubmit Otomatis' : 'Selesai';
      const statusPengiriman = otomatis ? 'Otomatis' : 'Berhasil';

      // 1. Ubah status sesi
      await conn.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET status_ujian = ?, sisa_waktu = 0 
         WHERE id_sesi = ?`,
        [statusFinal, id_sesi]
      );

      // 2. Ambil seluruh jawaban mahasiswa beserta kunci jawaban soal
      const [jawabanList] = await conn.query(
        `SELECT j.id_jawaban, j.id_soal, j.jawaban_dipilih, s.tipe_soal, s.kunci_jawaban, s.bobot
         FROM jawaban_mahasiswa j
         JOIN soal s ON j.id_soal = s.id_soal
         WHERE j.id_sesi = ?`,
        [id_sesi]
      );

      // 3. Jalankan penilaian otomatis
      const gradePayload = [];
      for (const item of jawabanList) {
        const nilai = gradeSingleAnswer(
          {
            tipe_soal: item.tipe_soal,
            kunci_jawaban: item.kunci_jawaban,
            bobot: item.bobot
          },
          item.jawaban_dipilih
        );

        // Update nilai_soal
        await conn.query(
          `UPDATE jawaban_mahasiswa SET nilai_soal = ? WHERE id_jawaban = ?`,
          [nilai, item.id_jawaban]
        );

        gradePayload.push({
          bobot: item.bobot,
          tipe_soal: item.tipe_soal,
          nilai_soal: nilai
        });
      }

      // 4. Hitung total nilai akhir
      const { totalNilai, adaEsaiPending } = calculateTotalScore(gradePayload);

      // 5. Buat Resi Bukti Ujian Resmi (bukti_ujian_hasil)
      const idBukti = generateId('BKT', 8);
      await conn.query(
        `INSERT INTO bukti_ujian_hasil 
          (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
         VALUES (?, ?, NOW(), ?, ?, 'Tidak Ada')`,
        [idBukti, id_sesi, statusPengiriman, totalNilai]
      );

      return {
        idBukti,
        statusPengiriman,
        totalNilai,
        adaEsaiPending,
        waktuPengiriman: new Date().toISOString()
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Ujian berhasil diserahkan.',
      resi: {
        id_bukti: hasilSubmit.idBukti,
        id_sesi,
        nama_mahasiswa: sesi.nama_mahasiswa,
        nim: sesi.nim,
        nama_ujian: sesi.nama_ujian,
        status_pengiriman: hasilSubmit.statusPengiriman,
        waktu_pengiriman: hasilSubmit.waktuPengiriman,
        ada_soal_esai_pending: hasilSubmit.adaEsaiPending
      }
    });
  } catch (error) {
    console.error('Error submitUjian:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyerahkan ujian.'
    });
  }
};

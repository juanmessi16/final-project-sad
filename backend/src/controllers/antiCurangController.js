/**
 * src/controllers/antiCurangController.js
 * Controller deteksi anti-curang tanpa kamera dan penguncian paksa sesi ujian
 * (FR-03, FR-04, FR-08, FR-09, FR-19, FR-20, BR-03, NFR-14, NFR-15).
 */

const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { gradeSingleAnswer, calculateTotalScore } = require('../utils/autoGrader');

/**
 * Mencatat pelanggaran ujian mahasiswa (Pindah Tab, Copy-Paste, Keluar Layar Penuh)
 */
exports.catatPelanggaran = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { jenis_pelanggaran } = req.body;
    const idMahasiswa = req.user.id_profil;

    const jenisValid = ['Pindah Tab', 'Copy-Paste', 'Keluar Layar Penuh'];
    if (!jenisValid.includes(jenis_pelanggaran)) {
      return res.status(400).json({
        success: false,
        message: `Jenis pelanggaran tidak valid. Pilihan: ${jenisValid.join(', ')}`
      });
    }

    // Ambil data sesi dan toleransi ujian
    const [sesiRows] = await pool.query(
      `SELECT s.*, u.batas_toleransi_pelanggaran, u.nama_ujian, m.nama as nama_mahasiswa, m.nim
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

    // Jika sesi sudah tidak berlangsung (misal sudah dikunci atau selesai), tolak aksi
    if (sesi.status_ujian !== 'Berlangsung') {
      return res.status(200).json({
        success: false,
        locked: true,
        status_ujian: sesi.status_ujian,
        message: `Sesi ujian telah berstatus '${sesi.status_ujian}'.`
      });
    }

    // Jalankan pencatatan dan evaluasi batas toleransi dalam transaksi atomik
    const hasil = await withTransaction(async (conn) => {
      const akumulasi = sesi.jumlah_peringatan + 1;
      const idLog = generateId('LOG', 8);

      // 1. Tambah akumulasi peringatan pada sesi
      await conn.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET jumlah_peringatan = ? 
         WHERE id_sesi = ?`,
        [akumulasi, id_sesi]
      );

      // 2. Simpan record log pelanggaran (Immutable / Trigger protected)
      await conn.query(
        `INSERT INTO log_pelanggaran 
          (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
         VALUES (?, ?, ?, NOW(), ?)`,
        [idLog, id_sesi, jenis_pelanggaran, akumulasi]
      );

      // 3. Evaluasi apakah melampaui batas toleransi
      const isLocked = akumulasi >= sesi.batas_toleransi_pelanggaran;

      if (isLocked) {
        // Kunci sesi paksa
        await conn.query(
          `UPDATE sesi_ujian_mahasiswa 
           SET status_ujian = 'Dikunci Paksa', sisa_waktu = 0 
           WHERE id_sesi = ?`,
          [id_sesi]
        );

        // Catat log penguncian paksa
        const idLogLock = generateId('LOG', 8);
        await conn.query(
          `INSERT INTO log_pelanggaran 
            (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
           VALUES (?, ?, 'Sesi Dikunci Paksa', NOW(), ?)`,
          [idLogLock, id_sesi, akumulasi]
        );

        // Nilai otomatis seluruh soal objektif yang sempat dijawab
        const [jawabanList] = await conn.query(
          `SELECT j.id_jawaban, j.id_soal, j.jawaban_dipilih, s.tipe_soal, s.kunci_jawaban, s.bobot
           FROM jawaban_mahasiswa j
           JOIN soal s ON j.id_soal = s.id_soal
           WHERE j.id_sesi = ?`,
          [id_sesi]
        );

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

        const { totalNilai } = calculateTotalScore(gradePayload);

        // Buat resi pengiriman berstatus 'Dikunci Paksa'
        const idBukti = generateId('BKT', 8);
        await conn.query(
          `INSERT INTO bukti_ujian_hasil 
            (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
           VALUES (?, ?, NOW(), 'Dikunci Paksa', ?, 'Tidak Ada')
           ON DUPLICATE KEY UPDATE status_pengiriman = 'Dikunci Paksa'`,
          [idBukti, id_sesi, totalNilai]
        );
      }

      return {
        akumulasi,
        batas_toleransi: sesi.batas_toleransi_pelanggaran,
        isLocked
      };
    });

    return res.status(200).json({
      success: true,
      message: hasil.isLocked
        ? `Sesi ujian telah DIKUNCI PAKSA karena melanggar batas toleransi (${hasil.batas_toleransi}x).`
        : `Peringatan ${hasil.akumulasi}/${hasil.batas_toleransi}: ${jenis_pelanggaran} terdeteksi!`,
      locked: hasil.isLocked,
      jumlah_peringatan: hasil.akumulasi,
      batas_toleransi: hasil.batas_toleransi
    });
  } catch (error) {
    console.error('Error catatPelanggaran:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mencatat log pelanggaran.'
    });
  }
};

/**
 * src/controllers/sesiController.js
 * Controller untuk autosave jawaban, detail sesi aktif, sinkronisasi waktu, dan submit ujian
 * Mencakup TC-11 s.d. TC-13, TC-22 s.d. TC-26, TC-39, TC-42, TC-45, TC-51.
 */

const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { gradeSingleAnswer, calculateTotalScore } = require('../utils/autoGrader');

/**
 * Detail sesi aktif mahasiswa + sinkronisasi sisa waktu server (TC-13, TC-42, TC-51)
 */
exports.getSesiAktif = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const idMahasiswa = req.user.id_profil;

    const [sesiRows] = await pool.query(
      `SELECT s.*, u.nama_ujian, u.durasi, u.batas_toleransi_pelanggaran, u.acak_aktif, u.acak_opsi
       FROM sesi_ujian_mahasiswa s
       JOIN ujian u ON s.id_ujian = u.id_ujian
       WHERE s.id_sesi = ? AND (s.id_mahasiswa = ? OR ? = 'Dosen')`,
      [id_sesi, idMahasiswa, req.user.role]
    );

    if (sesiRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesi ujian tidak ditemukan.'
      });
    }

    const sesi = sesiRows[0];

    // Hitung sisa waktu server aktual termasuk tambahan waktu dari dosen (TC-42)
    let sisaWaktuAktual = sesi.sisa_waktu;
    if (sesi.status_ujian === 'Berlangsung') {
      const now = new Date();
      const waktuMulaiSesi = new Date(sesi.waktu_mulai);
      const tambahanMenit = parseInt(sesi.tambahan_waktu, 10) || 0;
      const totalDurasiDetik = (sesi.durasi + tambahanMenit) * 60;
      const detikBerjalan = Math.floor((now.getTime() - waktuMulaiSesi.getTime()) / 1000);
      sisaWaktuAktual = Math.max(0, totalDurasiDetik - detikBerjalan);

      await pool.query(
        'UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?',
        [sisaWaktuAktual, id_sesi]
      );
    }

    // Ambil daftar soal sesuai urutan sesi
    const [soalRows] = await pool.query(
      `SELECT 
        s.id_soal,
        s.tipe_soal,
        s.pertanyaan,
        s.bobot,
        j.id_jawaban,
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
        id_jawaban: q.id_jawaban,
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
          tambahan_waktu: parseInt(sesi.tambahan_waktu, 10) || 0,
          sisa_waktu: sisaWaktuAktual,
          jumlah_peringatan: sesi.jumlah_peringatan,
          batas_toleransi_pelanggaran: sesi.batas_toleransi_pelanggaran,
          acak_aktif: Boolean(sesi.acak_aktif),
          acak_opsi: Boolean(sesi.acak_opsi),
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
 * Autosave Jawaban Mahasiswa — mendukung satu soal maupun batch seluruh jawaban
 * (TC-11: interval 30 detik, TC-12: pindah nomor soal, TC-42: sinkronisasi tambah waktu, TC-45: <= 2 detik)
 */
exports.autosaveJawaban = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id_sesi } = req.params;
    const { id_soal, jawaban_dipilih, jawaban_batch } = req.body;
    const idMahasiswa = req.user.id_profil;

    if (!id_soal && (!Array.isArray(jawaban_batch) || jawaban_batch.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'id_soal atau jawaban_batch wajib disertakan dalam autosave.'
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
        status_ujian: sesi.status_ujian,
        message: `Sesi ujian telah berstatus '${sesi.status_ujian}'. Jawaban tidak dapat disimpan lagi.`
      });
    }

    // 2. Hitung sisa waktu aktual dari jam server + tambahan waktu dosen (TC-42)
    const now = new Date();
    const waktuMulaiSesi = new Date(sesi.waktu_mulai);
    const tambahanMenit = parseInt(sesi.tambahan_waktu, 10) || 0;
    const totalDurasiDetik = (sesi.durasi + tambahanMenit) * 60;
    const detikBerjalan = Math.floor((now.getTime() - waktuMulaiSesi.getTime()) / 1000);
    const sisaWaktuServer = Math.max(0, totalDurasiDetik - detikBerjalan);

    // 3. Simpan perubahan jawaban (single dan/atau batch)
    if (Array.isArray(jawaban_batch) && jawaban_batch.length > 0) {
      for (const item of jawaban_batch) {
        if (item && item.id_soal) {
          await pool.query(
            `UPDATE jawaban_mahasiswa 
             SET jawaban_dipilih = ?, waktu_disimpan = NOW()
             WHERE id_sesi = ? AND id_soal = ?`,
            [item.jawaban_dipilih !== undefined ? item.jawaban_dipilih : null, id_sesi, item.id_soal]
          );
        }
      }
    } else if (id_soal) {
      await pool.query(
        `UPDATE jawaban_mahasiswa 
         SET jawaban_dipilih = ?, waktu_disimpan = NOW()
         WHERE id_sesi = ? AND id_soal = ?`,
        [jawaban_dipilih !== undefined ? jawaban_dipilih : null, id_sesi, id_soal]
      );
    }

    await pool.query(
      `UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?`,
      [sisaWaktuServer, id_sesi]
    );

    const responseTimeMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Jawaban berhasil disimpan otomatis.',
      response_time_ms: responseTimeMs,
      data: {
        id_soal: id_soal || null,
        waktu_disimpan: new Date().toISOString(),
        sisa_waktu: sisaWaktuServer,
        tambahan_waktu: tambahanMenit
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
 * Submit Ujian (Manual, Retry Offline, atau Otomatis Waktu Habis 00:00)
 * Mencakup TC-22, TC-24, TC-25, TC-26, TC-39
 */
exports.submitUjian = async (req, res) => {
  try {
    const { id_sesi } = req.params;
    const { otomatis, jawaban_terakhir } = req.body;
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
      const b = buktiExisting[0];
      return res.status(200).json({
        success: true,
        message: `Ujian sudah diselesaikan sebelumnya (${sesi.status_ujian}).`,
        resi: b
          ? {
              id_bukti: b.id_bukti,
              id_sesi,
              nama_mahasiswa: sesi.nama_mahasiswa,
              nim: sesi.nim,
              nama_ujian: sesi.nama_ujian,
              status_pengiriman: b.status_pengiriman,
              waktu_pengiriman: b.waktu_pengiriman,
              total_nilai: b.total_nilai
            }
          : null
      });
    }

    // Jalankan submit dalam transaksi atomik
    const hasilSubmit = await withTransaction(async (conn) => {
      const statusFinal = otomatis ? 'Disubmit Otomatis' : 'Selesai';
      const statusPengiriman = otomatis ? 'Otomatis' : 'Berhasil';

      // Sinkronkan jawaban_terakhir dari klien (misal dari offline retry queue / TC-24 / TC-26)
      if (Array.isArray(jawaban_terakhir) && jawaban_terakhir.length > 0) {
        for (const item of jawaban_terakhir) {
          if (item && item.id_soal && item.jawaban_dipilih !== undefined) {
            await conn.query(
              `UPDATE jawaban_mahasiswa 
               SET jawaban_dipilih = ?, waktu_disimpan = NOW()
               WHERE id_sesi = ? AND id_soal = ?`,
              [item.jawaban_dipilih, id_sesi, item.id_soal]
            );
          }
        }
      }

      // 1. Ubah status sesi & bersihkan active_device_token
      await conn.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET status_ujian = ?, sisa_waktu = 0, active_device_token = NULL 
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

      // 3. TC-39: Jalankan penilaian otomatis untuk soal objektif
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

      // 4. Hitung total nilai akhir
      const { totalNilai, adaEsaiPending } = calculateTotalScore(gradePayload);

      // 5. TC-25: Buat Resi Bukti Ujian Resmi (bukti_ujian_hasil)
      const idBukti = generateId('BKT', 8);
      await conn.query(
        `INSERT INTO bukti_ujian_hasil 
          (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
         VALUES (?, ?, NOW(), ?, ?, 'Tidak Ada')
         ON DUPLICATE KEY UPDATE status_pengiriman = VALUES(status_pengiriman), total_nilai = VALUES(total_nilai)`,
        [idBukti, id_sesi, statusPengiriman, totalNilai]
      );

      return {
        idBukti,
        statusFinal,
        statusPengiriman,
        totalNilai,
        adaEsaiPending,
        waktuPengiriman: new Date().toISOString()
      };
    });

    return res.status(200).json({
      success: true,
      message: otomatis
        ? 'Waktu habis (00:00). Jawaban terakhir Anda berhasil dikirim secara otomatis (TC-26).'
        : 'Ujian berhasil diserahkan (TC-22).',
      resi: {
        id_bukti: hasilSubmit.idBukti,
        id_sesi,
        nama_mahasiswa: sesi.nama_mahasiswa,
        nim: sesi.nim,
        nama_ujian: sesi.nama_ujian,
        status_ujian: hasilSubmit.statusFinal,
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

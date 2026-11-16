/**
 * src/controllers/ujianController.js
 * Controller Ujian untuk Mahasiswa dan Dosen (FR-02, FR-06, BR-02, BR-04, NFR-07, NFR-11).
 */

const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { shuffleArray } = require('../utils/randomizer');

/**
 * [Mahasiswa] Mendapatkan daftar ujian yang dapat diikuti
 */
exports.getDaftarUjianMahasiswa = async (req, res) => {
  try {
    const idMahasiswa = req.user.id_profil;

    // Ambil seluruh ujian yang terdaftar untuk mahasiswa ini, beserta info status sesi jika ada
    const [exams] = await pool.query(
      `SELECT 
        u.id_ujian,
        u.nama_ujian,
        u.tanggal_waktu_mulai,
        u.tanggal_waktu_selesai,
        u.durasi,
        u.maks_percobaan,
        u.batas_toleransi_pelanggaran,
        u.hasil_dipublikasikan,
        d.nama_dosen,
        d.mata_kuliah,
        s.id_sesi,
        s.status_ujian,
        s.waktu_mulai,
        s.sisa_waktu,
        s.jumlah_peringatan,
        b.total_nilai,
        b.status_keputusan
       FROM peserta_ujian pu
       JOIN ujian u ON pu.id_ujian = u.id_ujian
       JOIN dosen d ON u.id_dosen = d.id_dosen
       LEFT JOIN sesi_ujian_mahasiswa s ON (s.id_ujian = u.id_ujian AND s.id_mahasiswa = ?)
       LEFT JOIN bukti_ujian_hasil b ON b.id_sesi = s.id_sesi
       WHERE pu.id_mahasiswa = ?
       ORDER BY u.tanggal_waktu_mulai DESC`,
      [idMahasiswa, idMahasiswa]
    );

    // Filter output agar aman (tidak pernah mengekspos pin_ujian)
    const formatted = exams.map((item) => {
      const now = new Date();
      const mulai = new Date(item.tanggal_waktu_mulai);
      const selesai = new Date(item.tanggal_waktu_selesai);

      let statusKetersediaan = 'Tersedia';
      if (now < mulai) {
        statusKetersediaan = 'Akan Datang';
      } else if (now > selesai) {
        statusKetersediaan = 'Kedaluwarsa';
      }

      if (item.status_ujian) {
        statusKetersediaan = item.status_ujian;
      }

      return {
        id_ujian: item.id_ujian,
        nama_ujian: item.nama_ujian,
        mata_kuliah: item.mata_kuliah,
        nama_dosen: item.nama_dosen,
        tanggal_waktu_mulai: item.tanggal_waktu_mulai,
        tanggal_waktu_selesai: item.tanggal_waktu_selesai,
        durasi: item.durasi,
        maks_percobaan: item.maks_percobaan,
        batas_toleransi_pelanggaran: item.batas_toleransi_pelanggaran,
        status_ketersediaan: statusKetersediaan,
        sesi_aktif: item.id_sesi
          ? {
              id_sesi: item.id_sesi,
              status_ujian: item.status_ujian,
              waktu_mulai: item.waktu_mulai,
              sisa_waktu: item.sisa_waktu,
              jumlah_peringatan: item.jumlah_peringatan,
              nilai: item.hasil_dipublikasikan ? item.total_nilai : null
            }
          : null
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error getDaftarUjianMahasiswa:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar ujian.'
    });
  }
};

/**
 * [Mahasiswa] Verifikasi PIN & Memulai atau Memulihkan Sesi Ujian (FR-02, FR-06, BR-02, BR-04, NFR-11)
 */
exports.mulaiAtauPulihkanUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const { pin_ujian } = req.body;
    const idMahasiswa = req.user.id_profil;

    if (!idMahasiswa) {
      return res.status(403).json({
        success: false,
        message: 'Hanya mahasiswa terdaftar yang dapat mengikuti ujian.'
      });
    }

    // 1. Ambil data ujian
    const [ujianRows] = await pool.query(
      `SELECT * FROM ujian WHERE id_ujian = ?`,
      [id_ujian]
    );

    if (ujianRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan.'
      });
    }

    const ujian = ujianRows[0];

    // 2. Cek apakah mahasiswa terdaftar sebagai peserta ujian
    const [pesertaRows] = await pool.query(
      `SELECT * FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?`,
      [id_ujian, idMahasiswa]
    );

    if (pesertaRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak terdaftar sebagai peserta pada ujian ini.'
      });
    }

    // 3. Cek rentang waktu ujian berdasarkan jam server
    const now = new Date();
    const waktuMulai = new Date(ujian.tanggal_waktu_mulai);
    const waktuSelesai = new Date(ujian.tanggal_waktu_selesai);

    if (now < waktuMulai) {
      return res.status(400).json({
        success: false,
        message: 'Ujian belum dimulai. Silakan tunggu jadwal resmi.'
      });
    }

    if (now > waktuSelesai) {
      return res.status(400).json({
        success: false,
        message: 'Jadwal ujian ini telah berakhir.'
      });
    }

    // 4. Cek apakah mahasiswa SUDAH memiliki sesi berstatus 'Berlangsung' (Pemulihan Sesi / NFR-11)
    const [sesiAktifRows] = await pool.query(
      `SELECT * FROM sesi_ujian_mahasiswa 
       WHERE id_ujian = ? AND id_mahasiswa = ? AND status_ujian = 'Berlangsung'
       ORDER BY percobaan_ke DESC LIMIT 1`,
      [id_ujian, idMahasiswa]
    );

    if (sesiAktifRows.length > 0) {
      const sesiAktif = sesiAktifRows[0];

      // Hitung sisa waktu server aktual
      const waktuMulaiSesi = new Date(sesiAktif.waktu_mulai);
      const totalDurasiDetik = ujian.durasi * 60;
      const detikBerjalan = Math.floor((now.getTime() - waktuMulaiSesi.getTime()) / 1000);
      const sisaWaktuAktual = Math.max(0, totalDurasiDetik - detikBerjalan);

      // Jika waktu server habis, ubah status otomatis
      if (sisaWaktuAktual <= 0) {
        await pool.query(
          `UPDATE sesi_ujian_mahasiswa 
           SET status_ujian = 'Disubmit Otomatis', sisa_waktu = 0 
           WHERE id_sesi = ?`,
          [sesiAktif.id_sesi]
        );
        return res.status(400).json({
          success: false,
          message: 'Waktu ujian telah habis.'
        });
      }

      // Perbarui sisa_waktu di DB
      await pool.query(
        `UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?`,
        [sisaWaktuAktual, sesiAktif.id_sesi]
      );

      // Ambil soal dan jawaban yang tersimpan sesuai urutan yang telah disimpan di sesi ini
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
        [sesiAktif.id_sesi]
      );

      const formattedQuestions = soalRows.map((q) => {
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
        message: 'Sesi ujian berhasil dipulihkan.',
        is_recovered: true,
        sesi: {
          id_sesi: sesiAktif.id_sesi,
          id_ujian: ujian.id_ujian,
          nama_ujian: ujian.nama_ujian,
          durasi: ujian.durasi,
          sisa_waktu: sisaWaktuAktual,
          jumlah_peringatan: sesiAktif.jumlah_peringatan,
          batas_toleransi_pelanggaran: ujian.batas_toleransi_pelanggaran,
          status_ujian: sesiAktif.status_ujian
        },
        soal: formattedQuestions
      });
    }

    // 5. Validasi PIN Ujian jika memulai sesi baru
    if (!pin_ujian || pin_ujian.trim() !== ujian.pin_ujian) {
      return res.status(401).json({
        success: false,
        message: 'PIN ujian yang Anda masukkan salah atau belum diisi.'
      });
    }

    // 6. Cek batas percobaan yang sudah dilakukan
    const [riwayatSesi] = await pool.query(
      `SELECT COUNT(*) as total_percobaan 
       FROM sesi_ujian_mahasiswa 
       WHERE id_ujian = ? AND id_mahasiswa = ?`,
      [id_ujian, idMahasiswa]
    );

    const totalPercobaan = riwayatSesi[0].total_percobaan;
    if (totalPercobaan >= ujian.maks_percobaan) {
      return res.status(400).json({
        success: false,
        message: `Batas maksimal percobaan (${ujian.maks_percobaan} kali) untuk ujian ini telah tercapai.`
      });
    }

    // 7. Buat Sesi Ujian Baru dalam 1 Transaksi Atomik
    const hasilSesiBaru = await withTransaction(async (conn) => {
      const idSesi = generateId('SES', 8);
      const percobaanKe = totalPercobaan + 1;
      const totalDetik = ujian.durasi * 60;

      // Ambil soal yang terhubung ke ujian ini
      const [daftarSoalDB] = await conn.query(
        `SELECT s.id_soal, s.tipe_soal, s.pertanyaan, s.opsi_jawaban, s.bobot
         FROM ujian_soal us
         JOIN soal s ON us.id_soal = s.id_soal
         WHERE us.id_ujian = ?`,
        [id_ujian]
      );

      if (daftarSoalDB.length === 0) {
        throw new Error('Ujian belum memiliki soal yang ditautkan oleh Dosen.');
      }

      // Acak urutan soal jika acak_aktif = TRUE
      let listSoal = daftarSoalDB;
      if (ujian.acak_aktif) {
        listSoal = shuffleArray(daftarSoalDB);
      }

      // Insert sesi_ujian_mahasiswa
      await conn.query(
        `INSERT INTO sesi_ujian_mahasiswa 
          (id_sesi, id_ujian, id_mahasiswa, percobaan_ke, waktu_mulai, sisa_waktu, jumlah_peringatan, status_ujian)
         VALUES (?, ?, ?, ?, NOW(), ?, 0, 'Berlangsung')`,
        [idSesi, id_ujian, idMahasiswa, percobaanKe, totalDetik]
      );

      // Pra-inisialisasi baris jawaban_mahasiswa dengan urutan soal & urutan opsi
      const preparedQuestions = [];
      for (let i = 0; i < listSoal.length; i++) {
        const itemSoal = listSoal[i];
        const idJawaban = generateId('JAW', 8);
        const urutan = i + 1;

        let opsiFinal = null;
        if (itemSoal.opsi_jawaban) {
          let parsedOpsi = [];
          try {
            parsedOpsi = typeof itemSoal.opsi_jawaban === 'string'
              ? JSON.parse(itemSoal.opsi_jawaban)
              : itemSoal.opsi_jawaban;
          } catch {
            parsedOpsi = [];
          }

          if (ujian.acak_aktif && Array.isArray(parsedOpsi)) {
            opsiFinal = shuffleArray(parsedOpsi);
          } else {
            opsiFinal = parsedOpsi;
          }
        }

        const jsonOpsi = opsiFinal ? JSON.stringify(opsiFinal) : null;

        await conn.query(
          `INSERT INTO jawaban_mahasiswa 
            (id_jawaban, id_sesi, id_soal, jawaban_dipilih, urutan_soal, urutan_opsi, waktu_disimpan)
           VALUES (?, ?, ?, NULL, ?, ?, NOW())`,
          [idJawaban, idSesi, itemSoal.id_soal, urutan, jsonOpsi]
        );

        preparedQuestions.push({
          id_soal: itemSoal.id_soal,
          tipe_soal: itemSoal.tipe_soal,
          pertanyaan: itemSoal.pertanyaan,
          bobot: itemSoal.bobot,
          urutan_soal: urutan,
          opsi_jawaban: opsiFinal,
          jawaban_dipilih: null
        });
      }

      return {
        idSesi,
        durasi: ujian.durasi,
        sisa_waktu: totalDetik,
        batas_toleransi_pelanggaran: ujian.batas_toleransi_pelanggaran,
        questions: preparedQuestions
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Sesi ujian berhasil dibuat dan dimulai.',
      is_recovered: false,
      sesi: {
        id_sesi: hasilSesiBaru.idSesi,
        id_ujian: ujian.id_ujian,
        nama_ujian: ujian.nama_ujian,
        durasi: hasilSesiBaru.durasi,
        sisa_waktu: hasilSesiBaru.sisa_waktu,
        jumlah_peringatan: 0,
        batas_toleransi_pelanggaran: hasilSesiBaru.batas_toleransi_pelanggaran,
        status_ujian: 'Berlangsung'
      },
      soal: hasilSesiBaru.questions
    });
  } catch (error) {
    console.error('Error mulaiAtauPulihkanUjian:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal memulai sesi ujian.'
    });
  }
};

/**
 * src/controllers/ujianController.js
 * Controller Ujian untuk Mahasiswa dan Dosen
 * Mencakup TC-05 s.d. TC-10, TC-31, TC-33, TC-34, TC-41, TC-42, TC-43, TC-50, TC-51.
 */

const { pool, withTransaction } = require('../config/db');
const { generateId } = require('../utils/idGenerator');
const { shuffleArray } = require('../utils/randomizer');
const { getClientIp, isCampusNetworkIp } = require('../middlewares/securityMiddleware');

/**
 * [Mahasiswa] Mendapatkan daftar ujian yang dapat diikuti + notifikasi jadwal (TC-43, TC-50)
 */
exports.getDaftarUjianMahasiswa = async (req, res) => {
  try {
    let idMahasiswa = req.user.id_profil;
    if (req.user && req.user.role === 'Dosen') {
      idMahasiswa = 'MHS_01'; // Mode peninjauan / pengujian oleh dosen
    }

    // Ambil seluruh ujian yang terdaftar untuk mahasiswa ini, beserta info status sesi terbaru jika ada
    const [exams] = await pool.query(
      `SELECT 
        u.id_ujian,
        u.nama_ujian,
        u.tanggal_waktu_mulai,
        u.tanggal_waktu_selesai,
        u.durasi,
        u.maks_percobaan,
        u.acak_aktif,
        u.acak_opsi,
        u.batasi_jaringan_kampus,
        u.batas_toleransi_pelanggaran,
        u.hasil_dipublikasikan,
        u.created_at,
        d.nama_dosen,
        d.mata_kuliah,
        s.id_sesi,
        s.status_ujian,
        s.waktu_mulai,
        s.sisa_waktu,
        s.tambahan_waktu,
        s.jumlah_peringatan,
        s.percobaan_ke,
        b.id_bukti,
        b.total_nilai,
        b.status_keputusan,
        b.waktu_pengiriman
       FROM peserta_ujian pu
       JOIN ujian u ON pu.id_ujian = u.id_ujian
       JOIN dosen d ON u.id_dosen = d.id_dosen
       LEFT JOIN sesi_ujian_mahasiswa s ON (
         s.id_sesi = (
           SELECT s2.id_sesi 
           FROM sesi_ujian_mahasiswa s2 
           WHERE s2.id_ujian = u.id_ujian AND s2.id_mahasiswa = ?
           ORDER BY s2.percobaan_ke DESC LIMIT 1
         )
       )
       LEFT JOIN bukti_ujian_hasil b ON b.id_sesi = s.id_sesi
       WHERE pu.id_mahasiswa = ?
       ORDER BY u.tanggal_waktu_mulai ASC`,
      [idMahasiswa, idMahasiswa]
    );

    const now = new Date();
    const notifications = [];

    // TC-50: Pastikan TIDAK PERNAH menyertakan field pin / pin_ujian pada respons mahasiswa
    const formatted = exams.map((item) => {
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

      // TC-43: Buat notifikasi jadwal ujian untuk mahasiswa terdaftar
      if (statusKetersediaan === 'Tersedia' || statusKetersediaan === 'Akan Datang' || statusKetersediaan === 'Berlangsung') {
        notifications.push({
          id_notifikasi: `NOTIF_${item.id_ujian}`,
          id_ujian: item.id_ujian,
          judul: statusKetersediaan === 'Akan Datang' ? 'Jadwal Ujian Baru Terdaftar' : 'Ujian Siap Dikerjakan',
          pesan: `Anda terdaftar pada ujian "${item.nama_ujian}" (${item.mata_kuliah}) berdurasi ${item.durasi} menit.`,
          tanggal_waktu_mulai: item.tanggal_waktu_mulai,
          status: statusKetersediaan
        });
      }

      // TC-27 & TC-28: Nilai hanya tampil jika hasil_dipublikasikan = true dan total_nilai !== null
      const tampilanNilai =
        item.hasil_dipublikasikan && item.total_nilai !== null && item.total_nilai !== undefined
          ? item.total_nilai
          : 'Belum dinilai';

      return {
        id_ujian: item.id_ujian,
        nama_ujian: item.nama_ujian,
        mata_kuliah: item.mata_kuliah,
        nama_dosen: item.nama_dosen,
        tanggal_waktu_mulai: item.tanggal_waktu_mulai,
        tanggal_waktu_selesai: item.tanggal_waktu_selesai,
        durasi: item.durasi,
        maks_percobaan: item.maks_percobaan,
        acak_aktif: Boolean(item.acak_aktif),
        acak_opsi: Boolean(item.acak_opsi !== undefined ? item.acak_opsi : item.acak_aktif),
        batasi_jaringan_kampus: Boolean(item.batasi_jaringan_kampus),
        batas_toleransi_pelanggaran: item.batas_toleransi_pelanggaran,
        hasil_dipublikasikan: Boolean(item.hasil_dipublikasikan),
        status_ketersediaan: statusKetersediaan,
        sesi_aktif: item.id_sesi
          ? {
              id_sesi: item.id_sesi,
              id_bukti: item.id_bukti || null,
              status_ujian: item.status_ujian,
              waktu_mulai: item.waktu_mulai,
              sisa_waktu: item.sisa_waktu,
              tambahan_waktu: item.tambahan_waktu || 0,
              jumlah_peringatan: item.jumlah_peringatan,
              percobaan_ke: item.percobaan_ke || 1,
              waktu_pengiriman: item.waktu_pengiriman || null,
              status_keputusan: item.status_keputusan || 'Tidak Ada',
              nilai: tampilanNilai
            }
          : null
      };
    });

    return res.status(200).json({
      success: true,
      server_time: now.toISOString(),
      notifikasi: notifications,
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
 * [Mahasiswa] Verifikasi PIN & Memulai atau Memulihkan Sesi Ujian
 * Mencakup TC-05, TC-06, TC-07, TC-08, TC-09, TC-10, TC-31, TC-33, TC-34, TC-41, TC-42, TC-51
 */
exports.mulaiAtauPulihkanUjian = async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const { pin_ujian, device_id, force_recover } = req.body;
    let idMahasiswa = req.user.id_profil;
    if (req.user && req.user.role === 'Dosen') {
      idMahasiswa = 'MHS_01'; // Mode peninjauan / pengujian oleh dosen
    }

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

    // 2. TC-34: Cek apakah mahasiswa terdaftar sebagai peserta ujian
    const [pesertaRows] = await pool.query(
      `SELECT * FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?`,
      [id_ujian, idMahasiswa]
    );

    if (pesertaRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak (TC-34): Anda tidak terdaftar sebagai peserta pada ujian ini.'
      });
    }

    // 3. TC-41: Cek Pembatasan Jaringan Kampus (IP Whitelisting)
    if (ujian.batasi_jaringan_kampus) {
      const clientIp = getClientIp(req);
      const allowed = isCampusNetworkIp(clientIp, ujian.subnet_kampus);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          ip_blocked: true,
          client_ip: clientIp,
          message: `Akses ditolak (TC-41): Ujian ini dibatasi hanya untuk jaringan kampus (IP Whitelist). IP Anda (${clientIp}) terdeteksi berasal dari jaringan luar.`
        });
      }
    }

    // 4. TC-08 & TC-31: Cek rentang waktu ujian berdasarkan jam server
    const now = new Date();
    const waktuMulai = new Date(ujian.tanggal_waktu_mulai);
    const waktuSelesai = new Date(ujian.tanggal_waktu_selesai);

    if (now < waktuMulai) {
      return res.status(400).json({
        success: false,
        schedule_error: 'BELUM_DIMULAI',
        message: `Ujian belum dimulai (TC-08). Jadwal ujian baru dibuka pada ${waktuMulai.toLocaleString('id-ID')}.`
      });
    }

    if (now > waktuSelesai) {
      return res.status(400).json({
        success: false,
        schedule_error: 'SUDAH_BERAKHIR',
        message: `Jadwal ujian ini telah berakhir (TC-31) pada ${waktuSelesai.toLocaleString('id-ID')}.`
      });
    }

    const clientDeviceToken = device_id ? String(device_id).trim() : (req.user.session_id || 'DEFAULT_DEVICE');

    // 5. Cek apakah mahasiswa SUDAH memiliki sesi berstatus 'Berlangsung' (TC-05 & TC-51)
    const [sesiAktifRows] = await pool.query(
      `SELECT * FROM sesi_ujian_mahasiswa 
       WHERE id_ujian = ? AND id_mahasiswa = ? AND status_ujian = 'Berlangsung'
       ORDER BY percobaan_ke DESC LIMIT 1`,
      [id_ujian, idMahasiswa]
    );

    if (sesiAktifRows.length > 0) {
      const sesiAktif = sesiAktifRows[0];

      // TC-05: Cek Single Active Device — tolak jika perangkat kedua mencoba membuka sesi yang sedang aktif
      if (
        sesiAktif.active_device_token &&
        device_id &&
        sesiAktif.active_device_token !== clientDeviceToken &&
        !force_recover
      ) {
        return res.status(409).json({
          success: false,
          multi_device_blocked: true,
          message: 'Akses ditolak (TC-05): Sesi ujian Anda sedang aktif di perangkat atau browser lain. Satu akun tidak diizinkan membuka ujian yang sama dari dua perangkat sekaligus.'
        });
      }

      // Hitung sisa waktu server aktual termasuk tambahan_waktu dari dosen (TC-42 & TC-51)
      const waktuMulaiSesi = new Date(sesiAktif.waktu_mulai);
      const tambahanMenit = parseInt(sesiAktif.tambahan_waktu, 10) || 0;
      const totalDurasiDetik = (ujian.durasi + tambahanMenit) * 60;
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
          message: 'Waktu pengerjaan ujian Anda telah habis.'
        });
      }

      // Perbarui sisa_waktu dan active_device_token di DB
      await pool.query(
        `UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ?, active_device_token = ? WHERE id_sesi = ?`,
        [sisaWaktuAktual, clientDeviceToken, sesiAktif.id_sesi]
      );

      // Ambil soal dan jawaban yang tersimpan sesuai urutan sesi ini (TC-09 & TC-51)
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
        message: 'Sesi ujian berhasil dipulihkan beserta jawaban tersimpan dan sisa waktu akurat (TC-51).',
        is_recovered: true,
        sesi: {
          id_sesi: sesiAktif.id_sesi,
          id_ujian: ujian.id_ujian,
          nama_ujian: ujian.nama_ujian,
          durasi: ujian.durasi,
          tambahan_waktu: tambahanMenit,
          sisa_waktu: sisaWaktuAktual,
          jumlah_peringatan: sesiAktif.jumlah_peringatan,
          batas_toleransi_pelanggaran: ujian.batas_toleransi_pelanggaran,
          acak_aktif: Boolean(ujian.acak_aktif),
          acak_opsi: Boolean(ujian.acak_opsi !== undefined ? ujian.acak_opsi : ujian.acak_aktif),
          status_ujian: sesiAktif.status_ujian,
          percobaan_ke: sesiAktif.percobaan_ke
        },
        soal: formattedQuestions
      });
    }

    // 6. TC-06 & TC-07: Validasi PIN Ujian
    if (!pin_ujian || String(pin_ujian).trim() !== String(ujian.pin_ujian).trim()) {
      return res.status(401).json({
        success: false,
        invalid_pin: true,
        message: 'PIN ujian yang Anda masukkan salah. Silakan masukkan PIN 6 digit yang valid dari pengawas.'
      });
    }

    // 7. TC-33: Cek batas percobaan (Attempt Limit)
    const [riwayatSesi] = await pool.query(
      `SELECT COUNT(*) as total_percobaan 
       FROM sesi_ujian_mahasiswa 
       WHERE id_ujian = ? AND id_mahasiswa = ?`,
      [id_ujian, idMahasiswa]
    );

    const totalPercobaan = riwayatSesi[0].total_percobaan;
    if (totalPercobaan >= ujian.maks_percobaan) {
      return res.status(403).json({
        success: false,
        attempt_limit_reached: true,
        message: `Akses ditolak (TC-33): Batas maksimal percobaan (${ujian.maks_percobaan} kali) untuk ujian ini telah tercapai. Anda sudah mengirimkan jawaban sebelumnya.`
      });
    }

    // 8. Buat Sesi Ujian Baru dalam 1 Transaksi Atomik (TC-09, TC-10, TC-46)
    const hasilSesiBaru = await withTransaction(async (conn) => {
      const idSesi = generateId('SES', 8);
      const percobaanKe = totalPercobaan + 1;
      const totalDetik = ujian.durasi * 60;

      // Ambil soal yang terhubung ke ujian ini dengan urutan deterministik awal
      const [daftarSoalDB] = await conn.query(
        `SELECT s.id_soal, s.tipe_soal, s.pertanyaan, s.opsi_jawaban, s.bobot
         FROM ujian_soal us
         JOIN soal s ON us.id_soal = s.id_soal
         WHERE us.id_ujian = ?
         ORDER BY s.id_soal ASC`,
        [id_ujian]
      );

      if (daftarSoalDB.length === 0) {
        throw new Error('Ujian belum memiliki soal yang ditautkan oleh Dosen.');
      }

      // TC-09 vs TC-10: Acak urutan soal hanya jika acak_aktif = TRUE
      let listSoal = [...daftarSoalDB];
      if (ujian.acak_aktif) {
        listSoal = shuffleArray(daftarSoalDB);
      }

      const shouldShuffleOptions = ujian.acak_opsi !== undefined ? Boolean(ujian.acak_opsi) : Boolean(ujian.acak_aktif);

      // Insert sesi_ujian_mahasiswa
      await conn.query(
        `INSERT INTO sesi_ujian_mahasiswa 
          (id_sesi, id_ujian, id_mahasiswa, percobaan_ke, waktu_mulai, sisa_waktu, tambahan_waktu, active_device_token, jumlah_peringatan, status_ujian)
         VALUES (?, ?, ?, ?, NOW(), ?, 0, ?, 0, 'Berlangsung')`,
        [idSesi, id_ujian, idMahasiswa, percobaanKe, totalDetik, clientDeviceToken]
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

          // TC-09 vs TC-10: Acak opsi jika diaktifkan (khusus Pilihan Ganda)
          if (shouldShuffleOptions && itemSoal.tipe_soal === 'Pilihan Ganda' && Array.isArray(parsedOpsi)) {
            opsiFinal = shuffleArray(parsedOpsi);
          } else {
            opsiFinal = parsedOpsi;
          }
        } else if (itemSoal.tipe_soal === 'Benar/Salah') {
          opsiFinal = ['Benar', 'Salah'];
        }

        const jsonOpsi = opsiFinal ? JSON.stringify(opsiFinal) : null;

        await conn.query(
          `INSERT INTO jawaban_mahasiswa 
            (id_jawaban, id_sesi, id_soal, jawaban_dipilih, urutan_soal, urutan_opsi, waktu_disimpan)
           VALUES (?, ?, ?, NULL, ?, ?, NOW())`,
          [idJawaban, idSesi, itemSoal.id_soal, urutan, jsonOpsi]
        );

        preparedQuestions.push({
          id_jawaban: idJawaban,
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
        percobaanKe,
        durasi: ujian.durasi,
        sisa_waktu: totalDetik,
        batas_toleransi_pelanggaran: ujian.batas_toleransi_pelanggaran,
        questions: preparedQuestions
      };
    });

    return res.status(201).json({
      success: true,
      message: 'PIN valid. Sesi ujian berhasil dimulai.',
      is_recovered: false,
      sesi: {
        id_sesi: hasilSesiBaru.idSesi,
        id_ujian: ujian.id_ujian,
        nama_ujian: ujian.nama_ujian,
        durasi: hasilSesiBaru.durasi,
        tambahan_waktu: 0,
        sisa_waktu: hasilSesiBaru.sisa_waktu,
        jumlah_peringatan: 0,
        batas_toleransi_pelanggaran: hasilSesiBaru.batas_toleransi_pelanggaran,
        acak_aktif: Boolean(ujian.acak_aktif),
        acak_opsi: Boolean(ujian.acak_opsi !== undefined ? ujian.acak_opsi : ujian.acak_aktif),
        status_ujian: 'Berlangsung',
        percobaan_ke: hasilSesiBaru.percobaanKe
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

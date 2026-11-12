const {
  UjianModel,
  SesiUjianModel,
  JawabanModel,
  LogPelanggaranModel,
  BuktiUjianModel
} = require('../models');

const MahasiswaController = {
  // GET /api/mahasiswa/ujian
  getUjian: async (req, res) => {
    try {
      const id_mahasiswa = req.user.profile?.id_mahasiswa;
      if (!id_mahasiswa) {
        return res.status(400).json({ success: false, message: 'Profil mahasiswa tidak teridentifikasi.' });
      }

      const daftarUjian = await UjianModel.getForMahasiswa(id_mahasiswa);
      return res.status(200).json({ success: true, data: daftarUjian });
    } catch (error) {
      console.error('[MahasiswaController.getUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar ujian.' });
    }
  },

  // POST /api/mahasiswa/ujian/:id/verifikasi-pin
  verifikasiPin: async (req, res) => {
    try {
      const id_ujian = req.params.id;
      const { pin_ujian } = req.body;

      if (!pin_ujian) {
        return res.status(400).json({ success: false, message: 'PIN ujian wajib dimasukkan.' });
      }

      const result = await UjianModel.verifyPin(id_ujian, pin_ujian.trim());
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.status(200).json({ success: true, message: 'Verifikasi PIN berhasil. Anda diizinkan masuk ke sesi ujian.' });
    } catch (error) {
      console.error('[MahasiswaController.verifikasiPin Error]:', error);
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat verifikasi PIN.' });
    }
  },

  // POST /api/mahasiswa/ujian/:id/mulai
  mulaiUjian: async (req, res) => {
    try {
      const id_ujian = req.params.id;
      const id_mahasiswa = req.user.profile?.id_mahasiswa;
      const { pin_ujian } = req.body;

      // Verifikasi PIN terlebih dahulu jika dikirim
      if (pin_ujian) {
        const pinCheck = await UjianModel.verifyPin(id_ujian, pin_ujian.trim());
        if (!pinCheck.valid) {
          return res.status(400).json({ success: false, message: pinCheck.message });
        }
      }

      // Ambil atau inisialisasi sesi dengan pengacakan konsisten
      const { session, isNew } = await SesiUjianModel.startOrGetSession(id_ujian, id_mahasiswa);

      if (['Selesai', 'Dikunci Paksa', 'Disubmit Otomatis'].includes(session.status_ujian)) {
        return res.status(400).json({
          success: false,
          message: `Sesi ujian telah berakhir dengan status '${session.status_ujian}'.`,
          session
        });
      }

      return res.status(200).json({
        success: true,
        message: isNew ? 'Sesi ujian baru berhasil dimulai.' : 'Melanjutkan sesi ujian yang sedang berjalan.',
        session
      });
    } catch (error) {
      console.error('[MahasiswaController.mulaiUjian Error]:', error);
      return res.status(500).json({ success: false, message: error.message || 'Gagal memulai sesi ujian.' });
    }
  },

  // GET /api/mahasiswa/sesi/:id/soal
  getSoalSesi: async (req, res) => {
    try {
      const id_sesi = req.params.id;
      const id_mahasiswa = req.user.profile?.id_mahasiswa;

      const session = await SesiUjianModel.findById(id_sesi);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan.' });
      }

      // Pastikan sesi milik mahasiswa yang bersangkutan
      if (session.id_mahasiswa !== id_mahasiswa) {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Sesi bukan milik Anda.' });
      }

      // Ambil daftar soal teracak tanpa kunci jawaban
      const questions = await SesiUjianModel.getQuestionsForStudent(id_sesi);

      return res.status(200).json({
        success: true,
        session: {
          id_sesi: session.id_sesi,
          id_ujian: session.id_ujian,
          nama_ujian: session.nama_ujian,
          durasi: session.durasi,
          sisa_waktu: session.sisa_waktu,
          jumlah_peringatan: session.jumlah_peringatan,
          batas_toleransi_pelanggaran: session.batas_toleransi_pelanggaran,
          status_ujian: session.status_ujian
        },
        soal: questions
      });
    } catch (error) {
      console.error('[MahasiswaController.getSoalSesi Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil soal ujian.' });
    }
  },

  // POST /api/mahasiswa/sesi/:id/jawaban (Auto-Save, FR-07)
  simpanJawaban: async (req, res) => {
    try {
      const id_sesi = req.params.id;
      const { id_soal, jawaban_dipilih, sisa_waktu } = req.body;

      if (!id_soal) {
        return res.status(400).json({ success: false, message: 'id_soal wajib disertakan.' });
      }

      // Auto-save jawaban
      await JawabanModel.autoSaveJawaban(id_sesi, id_soal, jawaban_dipilih);

      // Perbarui sisa waktu jika disertakan
      if (sisa_waktu !== undefined) {
        await SesiUjianModel.updateSisaWaktu(id_sesi, parseInt(sisa_waktu, 10));
      }

      return res.status(200).json({
        success: true,
        message: 'Jawaban berhasil disimpan otomatis (auto-save).'
      });
    } catch (error) {
      console.error('[MahasiswaController.simpanJawaban Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan jawaban.' });
    }
  },

  // POST /api/mahasiswa/sesi/:id/pelanggaran (Anti-cheat, FR-08, FR-09, FR-19)
  catatPelanggaran: async (req, res) => {
    try {
      const id_sesi = req.params.id;
      const { jenis_pelanggaran } = req.body;

      const validJenis = ['Pindah Tab', 'Copy-Paste', 'Sesi Dikunci Paksa'];
      const jenis = validJenis.includes(jenis_pelanggaran) ? jenis_pelanggaran : 'Pindah Tab';

      const result = await LogPelanggaranModel.recordPelanggaran(id_sesi, jenis);

      return res.status(200).json({
        success: true,
        message: result.dikunci_paksa
          ? 'Pelanggaran mencapai ambang batas! Sesi Anda dikunci secara paksa.'
          : 'Pelanggaran dicatat oleh sistem.',
        data: result
      });
    } catch (error) {
      console.error('[MahasiswaController.catatPelanggaran Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mencatat log pelanggaran.' });
    }
  },

  // POST /api/mahasiswa/sesi/:id/submit (FR-11, FR-17, FR-18)
  submitUjian: async (req, res) => {
    try {
      const id_sesi = req.params.id;
      const id_mahasiswa = req.user.profile?.id_mahasiswa;
      const { status_ujian = 'Selesai', answers } = req.body;

      const session = await SesiUjianModel.findById(id_sesi);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan.' });
      }

      if (session.id_mahasiswa !== id_mahasiswa) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const bukti = await BuktiUjianModel.submitUjianAndGenerateBukti(id_sesi, status_ujian, answers);

      return res.status(200).json({
        success: true,
        message: 'Ujian berhasil dikumpulkan. Tanda terima bukti ujian resmi telah diterbitkan.',
        data: bukti
      });
    } catch (error) {
      console.error('[MahasiswaController.submitUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengumpulkan jawaban ujian.' });
    }
  },

  // GET /api/mahasiswa/hasil-ujian (FR-23, Use Case 1.2.5)
  getHasilUjian: async (req, res) => {
    try {
      const id_mahasiswa = req.user.profile?.id_mahasiswa;
      const results = await BuktiUjianModel.getByMahasiswaId(id_mahasiswa);
      return res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error('[MahasiswaController.getHasilUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat hasil ujian.' });
    }
  }
};

module.exports = MahasiswaController;

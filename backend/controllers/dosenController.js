const {
  BankSoalModel,
  SoalModel,
  UjianModel,
  LogPelanggaranModel,
  BuktiUjianModel,
  MahasiswaModel
} = require('../models');

const DosenController = {
  // GET /api/dosen/bank-soal
  getBankSoal: async (req, res) => {
    try {
      const id_dosen = req.user.profile?.id_dosen;
      if (!id_dosen) {
        return res.status(400).json({ success: false, message: 'Profil dosen tidak teridentifikasi.' });
      }

      const bankSoal = await BankSoalModel.getByDosenId(id_dosen);
      // Ambil seluruh soal untuk masing-masing bank
      const results = await Promise.all(
        bankSoal.map(async (b) => {
          const soalList = await SoalModel.getByBankId(b.id_bank_soal);
          return {
            ...b,
            daftar_soal: soalList
          };
        })
      );

      return res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error('[DosenController.getBankSoal Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil bank soal.' });
    }
  },

  // POST /api/dosen/bank-soal
  createBankSoal: async (req, res) => {
    try {
      const id_dosen = req.user.profile?.id_dosen;
      const { nama_mata_kuliah } = req.body;

      if (!nama_mata_kuliah) {
        return res.status(400).json({ success: false, message: 'Nama mata kuliah wajib diisi.' });
      }

      const id_bank_soal = `BS_${Date.now()}`;
      const newBank = await BankSoalModel.create(id_bank_soal, id_dosen, nama_mata_kuliah);

      return res.status(201).json({ success: true, message: 'Bank soal berhasil dibuat.', data: newBank });
    } catch (error) {
      console.error('[DosenController.createBankSoal Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat bank soal.' });
    }
  },

  // POST /api/dosen/soal
  createSoal: async (req, res) => {
    try {
      const { id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban } = req.body;

      if (!id_bank_soal || !pertanyaan || !opsi_jawaban || !kunci_jawaban) {
        return res.status(400).json({
          success: false,
          message: 'Kolom id_bank_soal, pertanyaan, opsi_jawaban, dan kunci_jawaban wajib diisi.'
        });
      }

      const id_soal = `SOAL_${Date.now()}_${Math.floor(Math.random() * 100)}`;
      const newSoal = await SoalModel.create(id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban);

      return res.status(201).json({ success: true, message: 'Soal berhasil ditambahkan.', data: newSoal });
    } catch (error) {
      console.error('[DosenController.createSoal Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat butir soal.' });
    }
  },

  // PUT /api/dosen/soal/:id
  updateSoal: async (req, res) => {
    try {
      const id_soal = req.params.id;
      const { pertanyaan, opsi_jawaban, kunci_jawaban } = req.body;

      const existing = await SoalModel.findById(id_soal);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
      }

      const updated = await SoalModel.update(
        id_soal,
        pertanyaan || existing.pertanyaan,
        opsi_jawaban || existing.opsi_jawaban,
        kunci_jawaban || existing.kunci_jawaban
      );

      return res.status(200).json({ success: true, message: 'Soal berhasil diperbarui.', data: updated });
    } catch (error) {
      console.error('[DosenController.updateSoal Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui soal.' });
    }
  },

  // DELETE /api/dosen/soal/:id
  deleteSoal: async (req, res) => {
    try {
      const id_soal = req.params.id;
      const success = await SoalModel.delete(id_soal);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, message: 'Soal berhasil dihapus.' });
    } catch (error) {
      console.error('[DosenController.deleteSoal Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus soal.' });
    }
  },

  // GET /api/dosen/ujian
  getUjian: async (req, res) => {
    try {
      const id_dosen = req.user.profile?.id_dosen;
      const ujianList = await UjianModel.getByDosenId(id_dosen);
      return res.status(200).json({ success: true, data: ujianList });
    } catch (error) {
      console.error('[DosenController.getUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar ujian.' });
    }
  },

  // POST /api/dosen/ujian
  createUjian: async (req, res) => {
    try {
      const id_dosen = req.user.profile?.id_dosen;
      const {
        nama_ujian,
        tanggal_waktu_mulai,
        tanggal_waktu_selesai,
        durasi,
        pin_ujian,
        batas_toleransi_pelanggaran,
        soal_ids = [],
        peserta_ids = []
      } = req.body;

      if (!nama_ujian || !durasi || !pin_ujian) {
        return res.status(400).json({
          success: false,
          message: 'Nama ujian, durasi, dan PIN ujian wajib diisi.'
        });
      }

      const now = new Date();
      const start = tanggal_waktu_mulai || now.toISOString().slice(0, 19).replace('T', ' ');
      const end = tanggal_waktu_selesai || new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      // Jika peserta_ids tidak ditentukan, daftarkan seluruh mahasiswa aktif secara default
      let targetPesertaIds = peserta_ids;
      if (!targetPesertaIds || targetPesertaIds.length === 0) {
        const allStudents = await MahasiswaModel.getAll();
        targetPesertaIds = allStudents.map(m => m.id_mahasiswa);
      }

      const id_ujian = `UJN_${Date.now()}`;
      await UjianModel.createUjianWithTransaction(
        {
          id_ujian,
          id_dosen,
          nama_ujian,
          tanggal_waktu_mulai: start,
          tanggal_waktu_selesai: end,
          durasi: parseInt(durasi, 10),
          pin_ujian,
          batas_toleransi_pelanggaran: parseInt(batas_toleransi_pelanggaran, 10) || 3
        },
        soal_ids,
        targetPesertaIds
      );

      const created = await UjianModel.findById(id_ujian);
      return res.status(201).json({
        success: true,
        message: 'Ujian berhasil dibuat dan diaktifkan.',
        data: created
      });
    } catch (error) {
      console.error('[DosenController.createUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat ujian baru.' });
    }
  },

  // PUT /api/dosen/ujian/:id
  updateUjian: async (req, res) => {
    try {
      const id_ujian = req.params.id;
      const updated = await UjianModel.updateUjian(id_ujian, req.body);
      return res.status(200).json({ success: true, message: 'Pengaturan ujian berhasil diperbarui.', data: updated });
    } catch (error) {
      console.error('[DosenController.updateUjian Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui ujian.' });
    }
  },

  // POST /api/dosen/ujian/:id/peserta
  addPeserta: async (req, res) => {
    try {
      const id_ujian = req.params.id;
      const { id_mahasiswa, nim } = req.body;

      let targetIdMahasiswa = id_mahasiswa;
      if (!targetIdMahasiswa && nim) {
        const student = await MahasiswaModel.findByNim(nim);
        if (!student) {
          return res.status(404).json({ success: false, message: 'Mahasiswa dengan NIM tersebut tidak ditemukan.' });
        }
        targetIdMahasiswa = student.id_mahasiswa;
      }

      if (!targetIdMahasiswa) {
        return res.status(400).json({ success: false, message: 'id_mahasiswa atau NIM wajib disertakan.' });
      }

      await UjianModel.addPeserta(id_ujian, targetIdMahasiswa);
      return res.status(200).json({ success: true, message: 'Peserta berhasil ditambahkan ke ujian.' });
    } catch (error) {
      console.error('[DosenController.addPeserta Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal menambahkan peserta ujian.' });
    }
  },

  // DELETE /api/dosen/ujian/:id/peserta/:mahasiswaId
  removePeserta: async (req, res) => {
    try {
      const { id, mahasiswaId } = req.params;
      const success = await UjianModel.removePeserta(id, mahasiswaId);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan pada ujian ini.' });
      }
      return res.status(200).json({ success: true, message: 'Peserta berhasil dihapus dari ujian.' });
    } catch (error) {
      console.error('[DosenController.removePeserta Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus peserta ujian.' });
    }
  },

  // GET /api/dosen/ujian/:id/pelanggaran
  getPelanggaran: async (req, res) => {
    try {
      const id_ujian = req.params.id;
      const logs = await LogPelanggaranModel.getLogsByUjianId(id_ujian);
      const peserta = await UjianModel.getPesertaList(id_ujian);
      return res.status(200).json({
        success: true,
        data: {
          pelanggaran: logs,
          peserta: peserta
        }
      });
    } catch (error) {
      console.error('[DosenController.getPelanggaran Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil log pelanggaran.' });
    }
  },

  // POST /api/dosen/ujian/:id/keputusan atau PUT /api/dosen/sesi/:id_sesi/keputusan
  tetapkanKeputusan: async (req, res) => {
    try {
      const { id_sesi, status_keputusan } = req.body;
      if (!id_sesi || !status_keputusan) {
        return res.status(400).json({
          success: false,
          message: 'id_sesi dan status_keputusan wajib disertakan.'
        });
      }

      const validDecisions = ['Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi'];
      if (!validDecisions.includes(status_keputusan)) {
        return res.status(400).json({
          success: false,
          message: `Keputusan tidak valid. Pilihan: ${validDecisions.join(', ')}`
        });
      }

      const updatedBukti = await BuktiUjianModel.updateStatusKeputusan(id_sesi, status_keputusan);
      return res.status(200).json({
        success: true,
        message: 'Keputusan dosen atas pelanggaran berhasil ditetapkan.',
        data: updatedBukti
      });
    } catch (error) {
      console.error('[DosenController.tetapkanKeputusan Error]:', error);
      return res.status(500).json({ success: false, message: 'Gagal menetapkan keputusan pelanggaran.' });
    }
  }
};

module.exports = DosenController;

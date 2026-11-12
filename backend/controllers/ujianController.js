const {
  SesiUjianModel,
  JawabanModel,
  LogPelanggaranModel,
  BuktiUjianModel
} = require('../models');

// Controller kompatibilitas rute legacy /api/ujian
exports.getSesiUjian = async (req, res) => {
  try {
    const id_sesi = req.params.id_sesi;
    const session = await SesiUjianModel.findById(id_sesi);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan' });
    }

    const questions = await SesiUjianModel.getQuestionsForStudent(id_sesi);
    return res.status(200).json({
      id_sesi: session.id_sesi,
      nama_ujian: session.nama_ujian,
      batas_toleransi_pelanggaran: session.batas_toleransi_pelanggaran,
      sisa_waktu: session.sisa_waktu,
      jumlah_peringatan: session.jumlah_peringatan,
      status_ujian: session.status_ujian,
      soal: questions
    });
  } catch (error) {
    console.error('[ujianController.getSesiUjian Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.autoSaveJawaban = async (req, res) => {
  try {
    const { id_sesi, id_soal, jawaban, jawaban_dipilih, sisa_waktu } = req.body;
    const answer = jawaban_dipilih !== undefined ? jawaban_dipilih : jawaban;

    if (id_sesi && id_soal) {
      await JawabanModel.autoSaveJawaban(id_sesi, id_soal, answer);
    }
    if (id_sesi && sisa_waktu !== undefined) {
      await SesiUjianModel.updateSisaWaktu(id_sesi, parseInt(sisa_waktu, 10));
    }

    return res.status(200).json({ success: true, message: 'Saved' });
  } catch (error) {
    console.error('[ujianController.autoSaveJawaban Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.catatPelanggaran = async (req, res) => {
  try {
    const { id_sesi, jenis_pelanggaran } = req.body;
    const result = await LogPelanggaranModel.recordPelanggaran(id_sesi, jenis_pelanggaran || 'Pindah Tab');
    return res.status(200).json({ success: true, message: 'Log dicatat', data: result });
  } catch (error) {
    console.error('[ujianController.catatPelanggaran Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.kunciSesiPaksa = async (req, res) => {
  try {
    const { id_sesi } = req.body;
    await SesiUjianModel.updateStatus(id_sesi, 'Dikunci Paksa');
    const bukti = await BuktiUjianModel.submitUjianAndGenerateBukti(id_sesi, 'Dikunci Paksa');
    return res.status(200).json({ success: true, message: 'Sesi dikunci paksa', data: bukti });
  } catch (error) {
    console.error('[ujianController.kunciSesiPaksa Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitUjian = async (req, res) => {
  try {
    const { id_sesi, jawaban, status_ujian = 'Selesai' } = req.body;
    const bukti = await BuktiUjianModel.submitUjianAndGenerateBukti(id_sesi, status_ujian, jawaban);
    return res.status(200).json({
      success: true,
      message: 'Ujian berhasil disubmit',
      status: status_ujian,
      data: bukti
    });
  } catch (error) {
    console.error('[ujianController.submitUjian Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

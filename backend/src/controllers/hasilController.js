/**
 * src/controllers/hasilController.js
 * Controller riwayat hasil ujian dan resi bukti ujian untuk Mahasiswa (FR-12, FR-23, BR-08).
 */

const { pool } = require('../config/db');

/**
 * Mendapatkan riwayat hasil ujian mahasiswa
 */
exports.getRiwayatHasilMahasiswa = async (req, res) => {
  try {
    const idMahasiswa = req.user.id_profil;

    const [rows] = await pool.query(
      `SELECT 
        b.id_bukti,
        b.waktu_pengiriman,
        b.status_pengiriman,
        b.total_nilai,
        b.status_keputusan,
        s.id_sesi,
        s.status_ujian,
        s.jumlah_peringatan,
        u.id_ujian,
        u.nama_ujian,
        u.hasil_dipublikasikan,
        d.nama_dosen,
        d.mata_kuliah
       FROM bukti_ujian_hasil b
       JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi
       JOIN ujian u ON s.id_ujian = u.id_ujian
       JOIN dosen d ON u.id_dosen = d.id_dosen
       WHERE s.id_mahasiswa = ?
       ORDER BY b.waktu_pengiriman DESC`,
      [idMahasiswa]
    );

    const formatted = rows.map((item) => {
      let tampilanNilai = 'Belum dinilai';

      // Nilai hanya tampil jika dosen mengaktifkan publikasi dan total_nilai sudah terisi (FR-23)
      if (item.hasil_dipublikasikan && item.total_nilai !== null) {
        tampilanNilai = item.total_nilai;
      }

      return {
        id_bukti: item.id_bukti,
        id_sesi: item.id_sesi,
        id_ujian: item.id_ujian,
        nama_ujian: item.nama_ujian,
        mata_kuliah: item.mata_kuliah,
        nama_dosen: item.nama_dosen,
        waktu_pengiriman: item.waktu_pengiriman,
        status_pengiriman: item.status_pengiriman,
        status_ujian: item.status_ujian,
        jumlah_peringatan: item.jumlah_peringatan,
        nilai: tampilanNilai,
        status_keputusan: item.status_keputusan,
        hasil_dipublikasikan: Boolean(item.hasil_dipublikasikan)
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error getRiwayatHasilMahasiswa:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat hasil ujian.'
    });
  }
};

/**
 * Mengambil detail tanda terima (resi) bukti ujian
 */
exports.getResiBukti = async (req, res) => {
  try {
    const { id_bukti } = req.params;
    const idMahasiswa = req.user.id_profil;

    const [rows] = await pool.query(
      `SELECT 
        b.id_bukti,
        b.waktu_pengiriman,
        b.status_pengiriman,
        b.total_nilai,
        b.status_keputusan,
        s.id_sesi,
        s.waktu_mulai,
        s.jumlah_peringatan,
        u.nama_ujian,
        u.durasi,
        u.hasil_dipublikasikan,
        m.nama as nama_mahasiswa,
        m.nim,
        d.nama_dosen,
        d.mata_kuliah
       FROM bukti_ujian_hasil b
       JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi
       JOIN ujian u ON s.id_ujian = u.id_ujian
       JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
       JOIN dosen d ON u.id_dosen = d.id_dosen
       WHERE b.id_bukti = ? AND (s.id_mahasiswa = ? OR ? = 'Dosen')`,
      [id_bukti, idMahasiswa, req.user.role]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resi bukti ujian tidak ditemukan atau Anda tidak memiliki akses.'
      });
    }

    const resi = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        id_bukti: resi.id_bukti,
        id_sesi: resi.id_sesi,
        nama_mahasiswa: resi.nama_mahasiswa,
        nim: resi.nim,
        nama_ujian: resi.nama_ujian,
        mata_kuliah: resi.mata_kuliah,
        nama_dosen: resi.nama_dosen,
        durasi: resi.durasi,
        waktu_mulai: resi.waktu_mulai,
        waktu_pengiriman: resi.waktu_pengiriman,
        status_pengiriman: resi.status_pengiriman,
        jumlah_pelanggaran: resi.jumlah_peringatan,
        status_keputusan: resi.status_keputusan,
        nilai: resi.hasil_dipublikasikan && resi.total_nilai !== null ? resi.total_nilai : 'Belum dinilai'
      }
    });
  } catch (error) {
    console.error('Error getResiBukti:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat tanda terima ujian.'
    });
  }
};

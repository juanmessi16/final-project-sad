const { pool } = require('../config/database');
const JawabanModel = require('./jawabanModel');

const BuktiUjianModel = {
  // Submit Ujian & Terbitkan Bukti (FR-11, FR-17, FR-18, Use Case 1.2.4 & 1.2.16 & 1.2.19)
  submitUjianAndGenerateBukti: async (id_sesi, status_pengiriman = 'Selesai', answersMap = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Simpan jawaban final jika disertakan
      if (answersMap && Object.keys(answersMap).length > 0) {
        await JawabanModel.saveMultipleAnswers(id_sesi, answersMap, connection);
      }

      // 2. Update status sesi ujian
      await connection.query(
        `UPDATE sesi_ujian_mahasiswa SET status_ujian = ?, sisa_waktu = 0 WHERE id_sesi = ?;`,
        [status_pengiriman, id_sesi]
      );

      // 3. Kalkulasi nilai otomatis (FR-26)
      const { total_soal, total_benar, total_nilai } = await JawabanModel.calculateScore(id_sesi, connection);

      // 4. Buat / update entri bukti ujian hasil
      const id_bukti = `BKT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await connection.query(
        `INSERT INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
         VALUES (?, ?, NOW(), ?, ?, 'Tidak Ada')
         ON DUPLICATE KEY UPDATE 
           waktu_pengiriman = NOW(),
           status_pengiriman = VALUES(status_pengiriman),
           total_nilai = VALUES(total_nilai);`,
        [id_bukti, id_sesi, status_pengiriman, total_nilai]
      );

      await connection.commit();

      // 5. Ambil data bukti lengkap untuk respon
      const completeBukti = await BuktiUjianModel.findBySesiId(id_sesi);
      return completeBukti;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  findBySesiId: async (id_sesi) => {
    const query = `
      SELECT 
        b.id_bukti,
        b.id_sesi,
        b.waktu_pengiriman,
        b.status_pengiriman,
        b.total_nilai,
        b.status_keputusan,
        u.id_ujian,
        u.nama_ujian,
        m.id_mahasiswa,
        m.nim,
        m.nama AS nama_mahasiswa
      FROM bukti_ujian_hasil b
      JOIN sesi_ujian_mahasiswa sum ON b.id_sesi = sum.id_sesi
      JOIN ujian u ON sum.id_ujian = u.id_ujian
      JOIN mahasiswa m ON sum.id_mahasiswa = m.id_mahasiswa
      WHERE b.id_sesi = ? LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_sesi]);
    return rows[0] || null;
  },

  getByMahasiswaId: async (id_mahasiswa) => {
    const query = `
      SELECT 
        b.id_bukti,
        b.id_sesi,
        b.waktu_pengiriman,
        b.status_pengiriman,
        b.total_nilai,
        b.status_keputusan,
        u.id_ujian,
        u.nama_ujian,
        d.nama_dosen,
        m.nim,
        m.nama AS nama_mahasiswa
      FROM bukti_ujian_hasil b
      JOIN sesi_ujian_mahasiswa sum ON b.id_sesi = sum.id_sesi
      JOIN ujian u ON sum.id_ujian = u.id_ujian
      JOIN dosen d ON u.id_dosen = d.id_dosen
      JOIN mahasiswa m ON sum.id_mahasiswa = m.id_mahasiswa
      WHERE sum.id_mahasiswa = ?
      ORDER BY b.waktu_pengiriman DESC;
    `;
    const [rows] = await pool.query(query, [id_mahasiswa]);
    return rows;
  },

  // Tetapkan Keputusan Pelanggaran oleh Dosen (FR-22, Use Case 1.2.10)
  updateStatusKeputusan: async (id_sesi, status_keputusan) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [buktiRows] = await connection.query(
        `SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ? LIMIT 1 FOR UPDATE;`,
        [id_sesi]
      );

      if (buktiRows.length === 0) {
        throw new Error('Bukti ujian tidak ditemukan untuk sesi ini.');
      }

      const bukti = buktiRows[0];
      let newTotalNilai = bukti.total_nilai;

      if (status_keputusan === 'Diskualifikasi') {
        newTotalNilai = 0.0;
      } else if (status_keputusan === 'Pengurangan Nilai') {
        newTotalNilai = Math.max(0.0, (bukti.total_nilai || 100.0) - 20.0);
      }

      await connection.query(
        `UPDATE bukti_ujian_hasil 
         SET status_keputusan = ?, total_nilai = ?
         WHERE id_sesi = ?;`,
        [status_keputusan, newTotalNilai, id_sesi]
      );

      await connection.commit();
      return BuktiUjianModel.findBySesiId(id_sesi);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = BuktiUjianModel;

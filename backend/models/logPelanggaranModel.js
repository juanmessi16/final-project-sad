const { pool } = require('../config/database');
const JawabanModel = require('./jawabanModel');

const LogPelanggaranModel = {
  // Catat Pelanggaran & Pemicu Otomatis Sanksi (FR-08, FR-09, FR-19)
  recordPelanggaran: async (id_sesi, jenis_pelanggaran) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Ambil data sesi dan ujian terkait
      const [sessionRows] = await connection.query(
        `SELECT s.id_sesi, s.id_ujian, s.id_mahasiswa, s.jumlah_peringatan, s.status_ujian, u.batas_toleransi_pelanggaran
         FROM sesi_ujian_mahasiswa s
         JOIN ujian u ON s.id_ujian = u.id_ujian
         WHERE s.id_sesi = ? LIMIT 1 FOR UPDATE;`,
        [id_sesi]
      );

      if (sessionRows.length === 0) {
        throw new Error('Sesi ujian tidak ditemukan.');
      }

      const sesi = sessionRows[0];
      const newWarningCount = sesi.jumlah_peringatan + 1;
      const batas = sesi.batas_toleransi_pelanggaran || 3;
      const isLocked = newWarningCount >= batas;

      // 2. Simpan entri log pelanggaran
      const id_log = `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await connection.query(
        `INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
         VALUES (?, ?, ?, NOW(), ?);`,
        [id_log, id_sesi, jenis_pelanggaran, newWarningCount]
      );

      // 3. Update jumlah peringatan di sesi
      await connection.query(
        `UPDATE sesi_ujian_mahasiswa 
         SET jumlah_peringatan = ?
         WHERE id_sesi = ?;`,
        [newWarningCount, id_sesi]
      );

      // 4. Jika melampaui batas toleransi -> KUNCI SESI PAKSA (Use Case 1.2.18)
      if (isLocked && sesi.status_ujian !== 'Dikunci Paksa') {
        await connection.query(
          `UPDATE sesi_ujian_mahasiswa 
           SET status_ujian = 'Dikunci Paksa' 
           WHERE id_sesi = ?;`,
          [id_sesi]
        );

        // Catat log 'Sesi Dikunci Paksa'
        const id_log_kunci = `LOG_LOCK_${Date.now()}`;
        await connection.query(
          `INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
           VALUES (?, ?, 'Sesi Dikunci Paksa', NOW(), ?);`,
          [id_log_kunci, id_sesi, newWarningCount]
        );

        // Terbitkan bukti tanda terima otomatis berstatus Dikunci Paksa
        const { total_nilai } = await JawabanModel.calculateScore(id_sesi, connection);
        const id_bukti = `BKT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        await connection.query(
          `INSERT INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
           VALUES (?, ?, NOW(), 'Dikunci Paksa', ?, 'Peringatan')
           ON DUPLICATE KEY UPDATE status_pengiriman = 'Dikunci Paksa', total_nilai = VALUES(total_nilai), status_keputusan = 'Peringatan';`,
          [id_bukti, id_sesi, total_nilai]
        );
      }

      await connection.commit();

      return {
        id_sesi,
        jenis_pelanggaran,
        jumlah_peringatan: newWarningCount,
        batas_toleransi: batas,
        status_ujian: isLocked ? 'Dikunci Paksa' : sesi.status_ujian,
        dikunci_paksa: isLocked
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getLogsByUjianId: async (id_ujian) => {
    const query = `
      SELECT 
        lp.id_log,
        lp.id_sesi,
        lp.jenis_pelanggaran,
        lp.waktu_kejadian,
        lp.jumlah_pelanggaran,
        m.id_mahasiswa,
        m.nim,
        m.nama AS nama_mahasiswa,
        sum.status_ujian,
        b.status_keputusan
      FROM log_pelanggaran lp
      JOIN sesi_ujian_mahasiswa sum ON lp.id_sesi = sum.id_sesi
      JOIN mahasiswa m ON sum.id_mahasiswa = m.id_mahasiswa
      LEFT JOIN bukti_ujian_hasil b ON sum.id_sesi = b.id_sesi
      WHERE sum.id_ujian = ?
      ORDER BY lp.waktu_kejadian DESC;
    `;
    const [rows] = await pool.query(query, [id_ujian]);
    return rows;
  },

  getLogsBySesiId: async (id_sesi) => {
    const query = `
      SELECT * FROM log_pelanggaran 
      WHERE id_sesi = ? 
      ORDER BY waktu_kejadian ASC;
    `;
    const [rows] = await pool.query(query, [id_sesi]);
    return rows;
  }
};

module.exports = LogPelanggaranModel;

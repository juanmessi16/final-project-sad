const { pool } = require('../config/database');

const UjianModel = {
  findById: async (id_ujian) => {
    const [rows] = await pool.query(
      `SELECT u.*, d.nama_dosen, d.mata_kuliah 
       FROM ujian u
       JOIN dosen d ON u.id_dosen = d.id_dosen
       WHERE u.id_ujian = ? LIMIT 1;`,
      [id_ujian]
    );
    return rows[0] || null;
  },

  getByDosenId: async (id_dosen) => {
    const query = `
      SELECT 
        u.*,
        COUNT(DISTINCT us.id_soal) AS total_soal,
        COUNT(DISTINCT pu.id_mahasiswa) AS total_peserta,
        COUNT(DISTINCT CASE WHEN sum.status_ujian = 'Selesai' THEN sum.id_sesi END) AS peserta_selesai
      FROM ujian u
      LEFT JOIN ujian_soal us ON u.id_ujian = us.id_ujian
      LEFT JOIN peserta_ujian pu ON u.id_ujian = pu.id_ujian
      LEFT JOIN sesi_ujian_mahasiswa sum ON u.id_ujian = sum.id_ujian
      WHERE u.id_dosen = ?
      GROUP BY u.id_ujian
      ORDER BY u.created_at DESC;
    `;
    const [rows] = await pool.query(query, [id_dosen]);
    return rows;
  },

  getForMahasiswa: async (id_mahasiswa) => {
    const query = `
      SELECT 
        u.id_ujian,
        u.nama_ujian,
        u.tanggal_waktu_mulai,
        u.tanggal_waktu_selesai,
        u.durasi,
        u.batas_toleransi_pelanggaran,
        d.nama_dosen,
        d.mata_kuliah,
        sum.id_sesi,
        sum.status_ujian,
        sum.sisa_waktu,
        sum.jumlah_peringatan,
        b.id_bukti,
        b.total_nilai,
        b.status_keputusan,
        COUNT(DISTINCT us.id_soal) AS total_soal
      FROM peserta_ujian pu
      JOIN ujian u ON pu.id_ujian = u.id_ujian
      JOIN dosen d ON u.id_dosen = d.id_dosen
      LEFT JOIN ujian_soal us ON u.id_ujian = us.id_ujian
      LEFT JOIN sesi_ujian_mahasiswa sum ON u.id_ujian = sum.id_ujian AND sum.id_mahasiswa = pu.id_mahasiswa
      LEFT JOIN bukti_ujian_hasil b ON sum.id_sesi = b.id_sesi
      WHERE pu.id_mahasiswa = ?
      GROUP BY u.id_ujian, sum.id_sesi, b.id_bukti
      ORDER BY u.tanggal_waktu_mulai DESC;
    `;
    const [rows] = await pool.query(query, [id_mahasiswa]);
    return rows;
  },

  createUjianWithTransaction: async (examData, soalIds = [], pesertaIds = []) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert ujian
      await connection.query(
        `INSERT INTO ujian (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          examData.id_ujian,
          examData.id_dosen,
          examData.nama_ujian,
          examData.tanggal_waktu_mulai,
          examData.tanggal_waktu_selesai,
          examData.durasi,
          examData.pin_ujian,
          examData.batas_toleransi_pelanggaran || 3
        ]
      );

      // 2. Hubungkan soal (ujian_soal)
      if (soalIds && soalIds.length > 0) {
        for (const sid of soalIds) {
          await connection.query(
            `INSERT INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?);`,
            [examData.id_ujian, sid]
          );
        }
      }

      // 3. Hubungkan peserta (peserta_ujian)
      if (pesertaIds && pesertaIds.length > 0) {
        for (const mid of pesertaIds) {
          await connection.query(
            `INSERT INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?);`,
            [examData.id_ujian, mid]
          );
        }
      }

      await connection.commit();
      return examData.id_ujian;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateUjian: async (id_ujian, data) => {
    const fields = [];
    const values = [];

    if (data.nama_ujian !== undefined) {
      fields.push('nama_ujian = ?');
      values.push(data.nama_ujian);
    }
    if (data.tanggal_waktu_mulai !== undefined) {
      fields.push('tanggal_waktu_mulai = ?');
      values.push(data.tanggal_waktu_mulai);
    }
    if (data.tanggal_waktu_selesai !== undefined) {
      fields.push('tanggal_waktu_selesai = ?');
      values.push(data.tanggal_waktu_selesai);
    }
    if (data.durasi !== undefined) {
      fields.push('durasi = ?');
      values.push(data.durasi);
    }
    if (data.pin_ujian !== undefined) {
      fields.push('pin_ujian = ?');
      values.push(data.pin_ujian);
    }
    if (data.batas_toleransi_pelanggaran !== undefined) {
      fields.push('batas_toleransi_pelanggaran = ?');
      values.push(data.batas_toleransi_pelanggaran);
    }

    if (fields.length === 0) return true;

    values.push(id_ujian);
    const query = `UPDATE ujian SET ${fields.join(', ')} WHERE id_ujian = ?;`;
    await pool.query(query, values);
    return UjianModel.findById(id_ujian);
  },

  verifyPin: async (id_ujian, pinInput) => {
    const [rows] = await pool.query(
      `SELECT id_ujian, pin_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai 
       FROM ujian WHERE id_ujian = ? LIMIT 1;`,
      [id_ujian]
    );

    if (rows.length === 0) {
      return { valid: false, message: 'Ujian tidak ditemukan.' };
    }

    const exam = rows[0];
    const now = new Date();
    const start = new Date(exam.tanggal_waktu_mulai);
    const end = new Date(exam.tanggal_waktu_selesai);

    if (now < start) {
      return { valid: false, message: 'Ujian belum dimulai sesuai jadwal.' };
    }
    if (now > end) {
      return { valid: false, message: 'Jadwal ujian telah berakhir.' };
    }
    if (exam.pin_ujian !== pinInput) {
      return { valid: false, message: 'PIN ujian salah. Periksa kembali PIN dari Dosen.' };
    }

    return { valid: true, message: 'PIN valid.' };
  },

  addPeserta: async (id_ujian, id_mahasiswa) => {
    await pool.query(
      `INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?);`,
      [id_ujian, id_mahasiswa]
    );
    return true;
  },

  removePeserta: async (id_ujian, id_mahasiswa) => {
    const [result] = await pool.query(
      `DELETE FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?;`,
      [id_ujian, id_mahasiswa]
    );
    return result.affectedRows > 0;
  },

  getPesertaList: async (id_ujian) => {
    const query = `
      SELECT 
        m.id_mahasiswa,
        m.nim,
        m.nama,
        sum.id_sesi,
        sum.status_ujian,
        sum.jumlah_peringatan,
        b.total_nilai,
        b.status_keputusan
      FROM peserta_ujian pu
      JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
      LEFT JOIN sesi_ujian_mahasiswa sum ON pu.id_ujian = sum.id_ujian AND pu.id_mahasiswa = sum.id_mahasiswa
      LEFT JOIN bukti_ujian_hasil b ON sum.id_sesi = b.id_sesi
      WHERE pu.id_ujian = ?
      ORDER BY m.nim ASC;
    `;
    const [rows] = await pool.query(query, [id_ujian]);
    return rows;
  }
};

module.exports = UjianModel;

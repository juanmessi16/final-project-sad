const { pool } = require('../config/database');

const JawabanModel = {
  // Auto-Save Jawaban Mahasiswa (FR-07, NFR-13)
  autoSaveJawaban: async (id_sesi, id_soal, jawaban_dipilih) => {
    const query = `
      UPDATE jawaban_mahasiswa 
      SET jawaban_dipilih = ?, waktu_disimpan = NOW()
      WHERE id_sesi = ? AND id_soal = ?;
    `;
    const [result] = await pool.query(query, [jawaban_dipilih, id_sesi, id_soal]);
    return result.affectedRows > 0;
  },

  // Simpan kumpulan jawaban secara atomic
  saveMultipleAnswers: async (id_sesi, answersMap, connection = pool) => {
    for (const [id_soal, jawaban] of Object.entries(answersMap)) {
      await connection.query(
        `UPDATE jawaban_mahasiswa 
         SET jawaban_dipilih = ?, waktu_disimpan = NOW()
         WHERE id_sesi = ? AND id_soal = ?;`,
        [jawaban, id_sesi, id_soal]
      );
    }
    return true;
  },

  // Penilaian otomatis (FR-26) berdasarkan kunci jawaban
  calculateScore: async (id_sesi, connection = pool) => {
    const query = `
      SELECT 
        jm.id_soal,
        jm.jawaban_dipilih,
        s.kunci_jawaban
      FROM jawaban_mahasiswa jm
      JOIN soal s ON jm.id_soal = s.id_soal
      WHERE jm.id_sesi = ?;
    `;
    const [rows] = await connection.query(query, [id_sesi]);

    const total = rows.length;
    let benar = 0;

    for (const r of rows) {
      if (r.jawaban_dipilih && r.jawaban_dipilih.trim() === r.kunci_jawaban.trim()) {
        benar += 1;
      }
    }

    const total_nilai = total > 0 ? Math.round((benar / total) * 100 * 100) / 100 : 0.0;
    return {
      total_soal: total,
      total_benar: benar,
      total_nilai
    };
  },

  getAnswersBySesi: async (id_sesi) => {
    const [rows] = await pool.query(
      `SELECT * FROM jawaban_mahasiswa WHERE id_sesi = ? ORDER BY urutan_soal ASC;`,
      [id_sesi]
    );
    return rows;
  }
};

module.exports = JawabanModel;

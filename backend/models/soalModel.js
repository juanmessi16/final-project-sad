const { pool } = require('../config/database');

const SoalModel = {
  getByBankId: async (id_bank_soal) => {
    const [rows] = await pool.query(
      `SELECT * FROM soal WHERE id_bank_soal = ? ORDER BY created_at ASC;`,
      [id_bank_soal]
    );
    return rows.map(r => ({
      ...r,
      opsi_jawaban: typeof r.opsi_jawaban === 'string' ? JSON.parse(r.opsi_jawaban) : r.opsi_jawaban
    }));
  },

  findById: async (id_soal) => {
    const [rows] = await pool.query(
      `SELECT * FROM soal WHERE id_soal = ? LIMIT 1;`,
      [id_soal]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      opsi_jawaban: typeof rows[0].opsi_jawaban === 'string' ? JSON.parse(rows[0].opsi_jawaban) : rows[0].opsi_jawaban
    };
  },

  create: async (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban) => {
    const opsiJson = typeof opsi_jawaban === 'string' ? opsi_jawaban : JSON.stringify(opsi_jawaban);
    await pool.query(
      `INSERT INTO soal (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
       VALUES (?, ?, ?, ?, ?);`,
      [id_soal, id_bank_soal, pertanyaan, opsiJson, kunci_jawaban]
    );
    return SoalModel.findById(id_soal);
  },

  update: async (id_soal, pertanyaan, opsi_jawaban, kunci_jawaban) => {
    const opsiJson = typeof opsi_jawaban === 'string' ? opsi_jawaban : JSON.stringify(opsi_jawaban);
    await pool.query(
      `UPDATE soal 
       SET pertanyaan = ?, opsi_jawaban = ?, kunci_jawaban = ?
       WHERE id_soal = ?;`,
      [pertanyaan, opsiJson, kunci_jawaban, id_soal]
    );
    return SoalModel.findById(id_soal);
  },

  delete: async (id_soal) => {
    const [result] = await pool.query(`DELETE FROM soal WHERE id_soal = ?;`, [id_soal]);
    return result.affectedRows > 0;
  }
};

module.exports = SoalModel;

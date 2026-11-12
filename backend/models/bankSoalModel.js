const { pool } = require('../config/database');

const BankSoalModel = {
  getByDosenId: async (id_dosen) => {
    const query = `
      SELECT 
        bs.id_bank_soal,
        bs.id_dosen,
        bs.nama_mata_kuliah,
        bs.created_at,
        COUNT(s.id_soal) AS total_soal
      FROM bank_soal bs
      LEFT JOIN soal s ON bs.id_bank_soal = s.id_bank_soal
      WHERE bs.id_dosen = ?
      GROUP BY bs.id_bank_soal
      ORDER BY bs.created_at DESC;
    `;
    const [rows] = await pool.query(query, [id_dosen]);
    return rows;
  },

  findById: async (id_bank_soal) => {
    const [rows] = await pool.query(
      `SELECT * FROM bank_soal WHERE id_bank_soal = ? LIMIT 1;`,
      [id_bank_soal]
    );
    return rows[0] || null;
  },

  create: async (id_bank_soal, id_dosen, nama_mata_kuliah) => {
    await pool.query(
      `INSERT INTO bank_soal (id_bank_soal, id_dosen, nama_mata_kuliah) VALUES (?, ?, ?);`,
      [id_bank_soal, id_dosen, nama_mata_kuliah]
    );
    return BankSoalModel.findById(id_bank_soal);
  }
};

module.exports = BankSoalModel;

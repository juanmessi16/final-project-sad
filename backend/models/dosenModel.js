const { pool } = require('../config/database');

const DosenModel = {
  findById: async (id_dosen) => {
    const [rows] = await pool.query(
      `SELECT d.*, p.username, p.status_akun 
       FROM dosen d 
       JOIN pengguna p ON d.id_pengguna = p.id_pengguna 
       WHERE d.id_dosen = ? LIMIT 1;`,
      [id_dosen]
    );
    return rows[0] || null;
  },

  findByPenggunaId: async (id_pengguna) => {
    const [rows] = await pool.query(
      `SELECT * FROM dosen WHERE id_pengguna = ? LIMIT 1;`,
      [id_pengguna]
    );
    return rows[0] || null;
  },

  getAll: async () => {
    const [rows] = await pool.query(
      `SELECT d.*, p.username, p.status_akun 
       FROM dosen d 
       JOIN pengguna p ON d.id_pengguna = p.id_pengguna;`
    );
    return rows;
  }
};

module.exports = DosenModel;

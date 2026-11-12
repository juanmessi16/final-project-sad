const { pool } = require('../config/database');

const MahasiswaModel = {
  findById: async (id_mahasiswa) => {
    const [rows] = await pool.query(
      `SELECT m.*, p.username, p.status_akun 
       FROM mahasiswa m 
       JOIN pengguna p ON m.id_pengguna = p.id_pengguna 
       WHERE m.id_mahasiswa = ? LIMIT 1;`,
      [id_mahasiswa]
    );
    return rows[0] || null;
  },

  findByPenggunaId: async (id_pengguna) => {
    const [rows] = await pool.query(
      `SELECT * FROM mahasiswa WHERE id_pengguna = ? LIMIT 1;`,
      [id_pengguna]
    );
    return rows[0] || null;
  },

  findByNim: async (nim) => {
    const [rows] = await pool.query(
      `SELECT * FROM mahasiswa WHERE nim = ? LIMIT 1;`,
      [nim]
    );
    return rows[0] || null;
  },

  getAll: async () => {
    const [rows] = await pool.query(
      `SELECT m.*, p.username, p.status_akun 
       FROM mahasiswa m 
       JOIN pengguna p ON m.id_pengguna = p.id_pengguna;`
    );
    return rows;
  }
};

module.exports = MahasiswaModel;

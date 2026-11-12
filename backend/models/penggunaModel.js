const { pool } = require('../config/database');

const PenggunaModel = {
  // Cari pengguna berdasarkan username atau NIM
  findByUsernameOrNim: async (identifier) => {
    const query = `
      SELECT 
        p.id_pengguna,
        p.username,
        p.password,
        p.role,
        p.status_akun,
        d.id_dosen,
        d.nama_dosen,
        d.mata_kuliah,
        m.id_mahasiswa,
        m.nim,
        m.nama AS nama_mahasiswa
      FROM pengguna p
      LEFT JOIN dosen d ON p.id_pengguna = d.id_pengguna
      LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
      WHERE p.username = ? OR m.nim = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [identifier, identifier]);
    return rows[0] || null;
  },

  findById: async (id_pengguna) => {
    const query = `
      SELECT 
        p.id_pengguna,
        p.username,
        p.role,
        p.status_akun,
        d.id_dosen,
        d.nama_dosen,
        d.mata_kuliah,
        m.id_mahasiswa,
        m.nim,
        m.nama AS nama_mahasiswa
      FROM pengguna p
      LEFT JOIN dosen d ON p.id_pengguna = d.id_pengguna
      LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
      WHERE p.id_pengguna = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_pengguna]);
    return rows[0] || null;
  }
};

module.exports = PenggunaModel;

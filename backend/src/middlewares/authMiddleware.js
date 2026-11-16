/**
 * src/middlewares/authMiddleware.js
 * Middleware autentikasi JWT, validasi akun aktif, single-session check (BR-01),
 * dan Role-Based Access Control (RBAC Mahasiswa vs Dosen).
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Memverifikasi token JWT dan integritas sesi pengguna
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'xunklab_super_secret_jwt_key_filkom_unklab_2026';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Sesi token telah kedaluwarsa. Silakan login kembali.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid.'
      });
    }

    // Ambil data akun pengguna dari database
    const [rows] = await pool.query(
      `SELECT id_pengguna, username, role, status_akun, active_session_id 
       FROM pengguna 
       WHERE id_pengguna = ?`,
      [decoded.id_pengguna]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan dalam sistem.'
      });
    }

    const user = rows[0];

    // Cek status akun (NFR-04)
    if (user.status_akun !== 'Aktif') {
      return res.status(403).json({
        success: false,
        message: `Akun Anda berstatus '${user.status_akun}'. Akses ditangguhkan.`
      });
    }

    // Single-Session Validation (BR-01): cegah login ganda
    if (decoded.session_id && user.active_session_id && user.active_session_id !== decoded.session_id) {
      return res.status(401).json({
        success: false,
        message: 'Sesi Anda telah berakhir karena akun ini login di perangkat lain.'
      });
    }

    // Ambil profil spesifik sesuai role
    let profile = null;
    if (user.role === 'Dosen') {
      const [dosenRows] = await pool.query(
        'SELECT id_dosen, nama_dosen, mata_kuliah FROM dosen WHERE id_pengguna = ?',
        [user.id_pengguna]
      );
      profile = dosenRows[0] || null;
    } else if (user.role === 'Mahasiswa') {
      const [mhsRows] = await pool.query(
        'SELECT id_mahasiswa, nim, nama FROM mahasiswa WHERE id_pengguna = ?',
        [user.id_pengguna]
      );
      profile = mhsRows[0] || null;
    }

    req.user = {
      id_pengguna: user.id_pengguna,
      username: user.username,
      role: user.role,
      status_akun: user.status_akun,
      id_profil: profile ? (profile.id_dosen || profile.id_mahasiswa) : null,
      profil: profile,
      session_id: decoded.session_id
    };

    next();
  } catch (error) {
    console.error('Error pada authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi autentikasi.'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles - daftar role yang diizinkan ('Dosen', 'Mahasiswa')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses terlarang. Diperlukan hak akses: ${roles.join(' atau ')}.`
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};

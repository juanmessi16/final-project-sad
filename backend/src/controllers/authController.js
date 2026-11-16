/**
 * src/controllers/authController.js
 * Controller autentikasi pengguna (FR-01, BR-01, NFR-04, NFR-06).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/NIM/NIP dan password wajib diisi.'
      });
    }

    // Cari pengguna
    const [users] = await pool.query(
      `SELECT id_pengguna, username, password, role, status_akun 
       FROM pengguna 
       WHERE username = ?`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak cocok.'
      });
    }

    const user = users[0];

    // Cek password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak cocok.'
      });
    }

    // Cek status akun
    if (user.status_akun === 'Nonaktif' || user.status_akun === 'Terkunci') {
      return res.status(403).json({
        success: false,
        message: `Akun Anda berstatus '${user.status_akun}'. Silakan hubungi Dosen atau Administrator.`
      });
    }

    // Generate unique session id untuk single-session enforcement (BR-01)
    const sessionId = crypto.randomUUID();

    // Perbarui active_session_id di database
    await pool.query(
      'UPDATE pengguna SET active_session_id = ? WHERE id_pengguna = ?',
      [sessionId, user.id_pengguna]
    );

    // Ambil data profil dosen atau mahasiswa
    let profile = null;
    if (user.role === 'Dosen') {
      const [dosenRows] = await pool.query(
        'SELECT id_dosen, nama_dosen, mata_kuliah FROM dosen WHERE id_pengguna = ?',
        [user.id_pengguna]
      );
      profile = dosenRows[0] || null;
    } else {
      const [mhsRows] = await pool.query(
        'SELECT id_mahasiswa, nim, nama FROM mahasiswa WHERE id_pengguna = ?',
        [user.id_pengguna]
      );
      profile = mhsRows[0] || null;
    }

    // Generate JWT token berlaku 3 jam (NFR-06)
    const secret = process.env.JWT_SECRET || 'xunklab_super_secret_jwt_key_filkom_unklab_2026';
    const token = jwt.sign(
      {
        id_pengguna: user.id_pengguna,
        role: user.role,
        id_profil: profile ? (profile.id_dosen || profile.id_mahasiswa) : null,
        session_id: sessionId
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id_pengguna: user.id_pengguna,
        username: user.username,
        role: user.role,
        status_akun: user.status_akun,
        profile
      }
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal server saat login.'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user && req.user.id_pengguna) {
      await pool.query(
        'UPDATE pengguna SET active_session_id = NULL WHERE id_pengguna = ?',
        [req.user.id_pengguna]
      );
    }
    return res.status(200).json({
      success: true,
      message: 'Logout berhasil. Sesi dinonaktifkan.'
    });
  } catch (error) {
    console.error('Error saat logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan logout.'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat profil pengguna.'
    });
  }
};

/**
 * src/controllers/authController.js
 * Controller autentikasi pengguna (TC-01 s.d. TC-05, TC-47, TC-49).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');

exports.login = async (req, res) => {
  try {
    const { username, password, expected_role, device_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/NIM/NIP dan password wajib diisi.'
      });
    }

    const identifier = username.trim();

    // Cari pengguna berdasarkan username, NIM mahasiswa, atau NIP dosen
    const [users] = await pool.query(
      `SELECT DISTINCT p.id_pengguna, p.username, p.password, p.role, p.status_akun, p.active_session_id
       FROM pengguna p
       LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
       LEFT JOIN dosen d ON p.id_pengguna = d.id_pengguna
       WHERE p.username = ? OR m.nim = ? OR d.nip = ?
       LIMIT 1`,
      [identifier, identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan. Periksa kembali Username/NIM/NIP Anda.'
      });
    }

    const user = users[0];

    // TC-04: Cek status akun Terkunci atau Nonaktif terlebih dahulu
    if (user.status_akun === 'Nonaktif' || user.status_akun === 'Terkunci') {
      return res.status(403).json({
        success: false,
        status_akun: user.status_akun,
        message: `Akun Anda berstatus '${user.status_akun}' dan tidak dapat masuk ke sistem. Silakan hubungi Dosen atau Administrator.`
      });
    }

    // TC-03 & TC-47: Verifikasi password terhadap hash bcrypt di database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password yang Anda masukkan salah. Silakan coba lagi.'
      });
    }

    // Validasi kesesuaian portal login jika expected_role dikirimkan
    if (expected_role) {
      const normalizedExpected = expected_role.toLowerCase();
      const normalizedActual = user.role.toLowerCase();
      if (
        (normalizedExpected === 'student' || normalizedExpected === 'mahasiswa') &&
        normalizedActual !== 'mahasiswa'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Akun Dosen tidak dapat masuk melalui Portal Mahasiswa. Silakan gunakan Portal Dosen.'
        });
      }
      if (
        (normalizedExpected === 'lecturer' || normalizedExpected === 'dosen') &&
        normalizedActual !== 'dosen'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Akun Mahasiswa tidak memiliki hak akses ke Portal Dosen (403 Forbidden).'
        });
      }
    }

    // Ambil data profil dosen atau mahasiswa
    let profile = null;
    if (user.role === 'Dosen') {
      const [dosenRows] = await pool.query(
        'SELECT id_dosen, nip, nama_dosen, mata_kuliah FROM dosen WHERE id_pengguna = ?',
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

    // Generate unique session id untuk single-session enforcement (TC-05)
    const sessionId = device_id ? String(device_id).trim() : crypto.randomUUID();

    // Perbarui active_session_id di database
    await pool.query(
      'UPDATE pengguna SET active_session_id = ? WHERE id_pengguna = ?',
      [sessionId, user.id_pengguna]
    );

    // TC-49: Generate JWT token berlaku maksimal 3 jam (NFR-06)
    const secret = process.env.JWT_SECRET || 'xunklab_super_secret_jwt_key_filkom_unklab_2026';
    const token = jwt.sign(
      {
        id_pengguna: user.id_pengguna,
        role: user.role,
        id_profil: profile ? (profile.id_dosen || profile.id_mahasiswa) : null,
        session_id: sessionId
      },
      secret,
      { expiresIn: '3h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      expires_in: 3 * 60 * 60, // 10800 detik (3 jam)
      user: {
        id_pengguna: user.id_pengguna,
        username: user.username,
        role: user.role,
        status_akun: user.status_akun,
        nama: profile ? (profile.nama || profile.nama_dosen) : user.username,
        detail: profile,
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

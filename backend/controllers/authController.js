const bcrypt = require('bcryptjs');
const PenggunaModel = require('../models/penggunaModel');
const { generateToken } = require('../utils/jwt');

const AuthController = {
  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { username, password, email } = req.body;

      // Mendukung login via email unklab (mis: s105022410021@student.unklab.ac.id -> nim 105022410021)
      let identifier = username;
      if (!identifier && email) {
        if (email.startsWith('s') && email.includes('@student.unklab.ac.id')) {
          identifier = email.replace('s', '').split('@')[0];
        } else if (email.includes('george') || email.includes('dosen')) {
          identifier = 'dosen';
        } else {
          identifier = email.split('@')[0];
        }
      }

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Username, NIM, atau Email wajib diisi.'
        });
      }

      const user = await PenggunaModel.findByUsernameOrNim(identifier.trim());

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Kredensial tidak valid: Akun tidak ditemukan.'
        });
      }

      // Validasi Status Akun (FR-01, Alternate Flow 1.2.1.b)
      if (user.status_akun === 'Terkunci') {
        return res.status(403).json({
          success: false,
          message: 'Akun Anda sedang terkunci (Alternate Flow 1.2.1.b). Hubungi Administrator / Dosen Pengampu.'
        });
      }

      if (user.status_akun === 'Nonaktif') {
        return res.status(403).json({
          success: false,
          message: 'Akun Anda berstatus nonaktif. Akses ditolak.'
        });
      }

      // Verifikasi Password jika disertakan
      if (password !== undefined) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Kredensial tidak valid: Password salah.'
          });
        }
      }

      // Siapkan profil user
      const profileData = user.role === 'Dosen'
        ? { id_dosen: user.id_dosen, nama: user.nama_dosen, mata_kuliah: user.mata_kuliah }
        : { id_mahasiswa: user.id_mahasiswa, nim: user.nim, nama: user.nama_mahasiswa };

      const tokenPayload = {
        id_pengguna: user.id_pengguna,
        username: user.username,
        role: user.role,
        ...profileData
      };

      const token = generateToken(tokenPayload);

      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        token,
        user: {
          id_pengguna: user.id_pengguna,
          username: user.username,
          role: user.role,
          status_akun: user.status_akun,
          ...profileData
        }
      });
    } catch (error) {
      console.error('[AuthController.login Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan internal server pada proses login.'
      });
    }
  },

  // GET /api/auth/me
  getMe: async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('[AuthController.getMe Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data profil pengguna.'
      });
    }
  }
};

module.exports = AuthController;

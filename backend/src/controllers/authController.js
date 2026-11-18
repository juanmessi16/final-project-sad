/**
 * src/controllers/authController.js
 * Controller autentikasi pengguna (TC-01 s.d. TC-05, TC-47, TC-49).
 * Mengimplementasikan Strict Single-Device Login Lock (TC-05 / BR-01) terpusat di Backend Server.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const sessionStore = require('../utils/sessionStore');

const DEMO_USERS = [
  {
    id_pengguna: 'USR_MHS_01',
    username: '105022410021',
    nim: '105022410021',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Aktif',
    nama: 'Tulengkey, Juan Messi Septhian',
    detail: { id_mahasiswa: 'MHS_01', nim: '105022410021', nama: 'Tulengkey, Juan Messi Septhian' }
  },
  {
    id_pengguna: 'USR_MHS_02',
    username: '105022510107',
    nim: '105022510107',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Aktif',
    nama: 'Tuwaidan, Jeniffer Diana',
    detail: { id_mahasiswa: 'MHS_02', nim: '105022510107', nama: 'Tuwaidan, Jeniffer Diana' }
  },
  {
    id_pengguna: 'USR_MHS_03',
    username: '105022410095',
    nim: '105022410095',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Aktif',
    nama: 'Sumual, Valentino',
    detail: { id_mahasiswa: 'MHS_03', nim: '105022410095', nama: 'Sumual, Valentino' }
  },
  {
    id_pengguna: 'USR_MHS_04',
    username: '105022410007',
    nim: '105022410007',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Aktif',
    nama: 'Sahetapy, Wilman Valentino',
    detail: { id_mahasiswa: 'MHS_04', nim: '105022410007', nama: 'Sahetapy, Wilman Valentino' }
  },
  {
    id_pengguna: 'USR_MHS_05',
    username: '105022510475',
    nim: '105022510475',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Aktif',
    nama: 'Laluyan, Matthew Arnold M',
    detail: { id_mahasiswa: 'MHS_05', nim: '105022510475', nama: 'Laluyan, Matthew Arnold M' }
  },
  {
    id_pengguna: 'USR_LOCKED',
    username: 'terkunci',
    nim: 'terkunci',
    password: '123',
    role: 'Mahasiswa',
    status_akun: 'Terkunci',
    nama: 'Mahasiswa Terkunci',
    detail: { id_mahasiswa: 'MHS_LOCKED', nim: 'terkunci', nama: 'Mahasiswa Terkunci' }
  },
  {
    id_pengguna: 'USR_DSN_01',
    username: 'george',
    nip: '198501012010011001',
    password: '123',
    role: 'Dosen',
    status_akun: 'Aktif',
    nama: 'George M. W. Tangka, S.Kom., MBA',
    detail: {
      id_dosen: 'DSN_01',
      nip: '198501012010011001',
      nama_dosen: 'George M. W. Tangka, S.Kom., MBA',
      mata_kuliah: 'Sistem Analisis & Desain'
    }
  }
];

function extractSessionKey(user, profile, identifier) {
  return String(
    profile?.nim ||
      profile?.nip ||
      user?.username ||
      identifier
  ).trim();
}

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
    const cleanDeviceId = String(device_id || req.headers['x-device-id'] || crypto.randomUUID()).trim();

    let user = null;
    let profile = null;
    let usingDb = false;

    try {
      const [users] = await pool.query(
        `SELECT DISTINCT p.id_pengguna, p.username, p.password, p.role, p.status_akun, p.active_session_id
         FROM pengguna p
         LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
         LEFT JOIN dosen d ON p.id_pengguna = d.id_pengguna
         WHERE p.username = ? OR m.nim = ? OR d.nip = ?
         LIMIT 1`,
        [identifier, identifier, identifier]
      );

      if (users.length > 0) {
        usingDb = true;
        user = users[0];

        if (user.status_akun === 'Nonaktif' || user.status_akun === 'Terkunci') {
          return res.status(403).json({
            success: false,
            status_akun: user.status_akun,
            message: `Akun Anda berstatus '${user.status_akun}' dan tidak dapat masuk ke sistem. Silakan hubungi Dosen atau Administrator.`
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            message: 'Password yang Anda masukkan salah. Silakan coba lagi.'
          });
        }

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
      }
    } catch (dbErr) {
      // Jika MySQL tidak aktif, gunakan fallback direktori pengguna lokal di Backend
      usingDb = false;
    }

    if (!user) {
      const demo = DEMO_USERS.find(
        (u) =>
          u.username.toLowerCase() === identifier.toLowerCase() ||
          (u.nim && u.nim.toLowerCase() === identifier.toLowerCase()) ||
          (u.nip && u.nip.toLowerCase() === identifier.toLowerCase())
      );

      if (!demo) {
        return res.status(401).json({
          success: false,
          message: 'Akun tidak ditemukan. Periksa kembali Username/NIM/NIP Anda.'
        });
      }

      if (demo.status_akun === 'Nonaktif' || demo.status_akun === 'Terkunci') {
        return res.status(403).json({
          success: false,
          status_akun: demo.status_akun,
          message: `Akun Anda berstatus '${demo.status_akun}' dan tidak dapat masuk ke sistem. Silakan hubungi Dosen atau Administrator.`
        });
      }

      if (demo.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Password yang Anda masukkan salah. Silakan coba lagi.'
        });
      }

      user = demo;
      profile = demo.detail;
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

    // TC-05 / BR-01: STRICT SINGLE-DEVICE LOGIN LOCK
    // Periksa apakah akun sedang aktif di perangkat/browser lain (heartbeat aktif dalam 60 detik terakhir)
    const sessionKey = extractSessionKey(user, profile, identifier);
    const existingSession =
      sessionStore.getActiveUserSession(sessionKey) ||
      sessionStore.getActiveUserSession(user.username) ||
      sessionStore.getActiveUserSession(identifier);

    if (existingSession && existingSession.device_id && existingSession.device_id !== cleanDeviceId) {
      return res.status(409).json({
        success: false,
        multi_device_blocked: true,
        code: 'MULTI_DEVICE_LOGIN_BLOCKED',
        message:
          'Akses Ditolak (TC-05): Akun ini sedang aktif digunakan pada perangkat/browser lain. Silakan logout terlebih dahulu dari perangkat pertama.'
      });
    }

    if (usingDb) {
      try {
        await pool.query('UPDATE pengguna SET active_session_id = ? WHERE id_pengguna = ?', [
          cleanDeviceId,
          user.id_pengguna
        ]);
      } catch {
        // Abaikan jika kolom tidak tersedia
      }
    }

    // TC-49: Generate JWT token berlaku maksimal 3 jam (NFR-06)
    const secret = process.env.JWT_SECRET || 'xunklab_super_secret_jwt_key_filkom_unklab_2026';
    const token = jwt.sign(
      {
        id_pengguna: user.id_pengguna,
        username: user.username,
        role: user.role,
        id_profil: profile ? profile.id_dosen || profile.id_mahasiswa : null,
        session_id: cleanDeviceId
      },
      secret,
      { expiresIn: '3h' }
    );

    // Kunci sesi pengguna pada central store Backend
    sessionStore.setActiveUserSession(sessionKey, {
      nim: sessionKey,
      user_id: user.id_pengguna,
      username: user.username,
      role: user.role,
      nama: profile ? profile.nama || profile.nama_dosen : user.username,
      device_id: cleanDeviceId,
      session_token: token,
      active_exam_id: null
    });

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      device_id: cleanDeviceId,
      expires_in: 3 * 60 * 60,
      user: {
        id_pengguna: user.id_pengguna,
        username: user.username,
        role: user.role,
        status_akun: user.status_akun,
        nama: profile ? profile.nama || profile.nama_dosen : user.username,
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

exports.heartbeat = async (req, res) => {
  try {
    const { username, nim, device_id, active_exam_id } = req.body || {};
    const identifier = String(nim || username || req.user?.username || '').trim();
    const cleanDeviceId = String(device_id || req.headers['x-device-id'] || '').trim();

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier pengguna wajib disertakan.' });
    }

    const touched = sessionStore.touchHeartbeat(identifier, cleanDeviceId, active_exam_id);
    if (touched && touched.conflict) {
      return res.status(409).json({
        success: false,
        multi_device_blocked: true,
        message: 'Sesi Anda telah diambil alih atau tidak valid di perangkat ini.'
      });
    }

    return res.status(200).json({
      success: true,
      active: Boolean(touched),
      server_time: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui heartbeat sesi.' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { username, nim, device_id } = req.body || {};
    const identifier = String(nim || username || req.user?.username || '').trim();
    const cleanDeviceId = String(device_id || req.headers['x-device-id'] || '').trim();

    if (identifier) {
      sessionStore.clearUserSession(identifier, cleanDeviceId || undefined);
    }

    if (req.user && req.user.id_pengguna) {
      try {
        await pool.query('UPDATE pengguna SET active_session_id = NULL WHERE id_pengguna = ?', [
          req.user.id_pengguna
        ]);
      } catch {
        // Abaikan jika MySQL offline
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Logout berhasil. Kunci sesi perangkat telah dilepaskan.'
    });
  } catch (error) {
    console.error('Error saat logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan logout.'
    });
  }
};

exports.resetUserSession = async (req, res) => {
  try {
    const { nim, username } = req.body || {};
    const identifier = String(nim || username || '').trim();
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'NIM atau username wajib disertakan.' });
    }

    sessionStore.forceResetUserSession(identifier);

    try {
      await pool.query(
        `UPDATE pengguna p
         LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
         SET p.active_session_id = NULL
         WHERE p.username = ? OR m.nim = ?`,
        [identifier, identifier]
      );
    } catch {
      // Abaikan jika MySQL offline
    }

    return res.status(200).json({
      success: true,
      message: `Kunci sesi perangkat untuk akun ${identifier} berhasil direset.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mereset sesi perangkat.' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      sessions: sessionStore.listActiveSessions()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar sesi aktif.' });
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

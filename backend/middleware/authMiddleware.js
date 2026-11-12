const { verifyToken } = require('../utils/jwt');
const { pool } = require('../config/database');

// Middleware untuk memverifikasi token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token autentikasi tidak ditemukan.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login kembali.'
    });
  }

  try {
    // Ambil data pengguna terbaru dari database
    const [users] = await pool.query(
      `SELECT id_pengguna, username, role, status_akun FROM pengguna WHERE id_pengguna = ? LIMIT 1;`,
      [decoded.id_pengguna]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan dalam sistem.'
      });
    }

    const user = users[0];

    // Cek status akun (NFR-06 & Alternate flow Login 1.2.1.b)
    if (user.status_akun === 'Terkunci') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang terkunci. Hubungi Unit ICT / Dosen pengampu.'
      });
    }

    if (user.status_akun === 'Nonaktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda nonaktif.'
      });
    }

    // Ambil detail profil berdasarkan peran
    let profile = null;
    if (user.role === 'Dosen') {
      const [dosenRows] = await pool.query(
        `SELECT id_dosen, nama_dosen, mata_kuliah FROM dosen WHERE id_pengguna = ? LIMIT 1;`,
        [user.id_pengguna]
      );
      profile = dosenRows[0] || null;
    } else if (user.role === 'Mahasiswa') {
      const [mhsRows] = await pool.query(
        `SELECT id_mahasiswa, nim, nama FROM mahasiswa WHERE id_pengguna = ? LIMIT 1;`,
        [user.id_pengguna]
      );
      profile = mhsRows[0] || null;
    }

    req.user = {
      ...user,
      profile
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi sesi autentikasi.'
    });
  }
};

// Middleware otorisasi peran Dosen
const isDosen = (req, res, next) => {
  if (req.user && req.user.role === 'Dosen') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Akses terbatas: Hanya Dosen yang berwenang mengakses sumber daya ini.'
  });
};

// Middleware otorisasi peran Mahasiswa
const isMahasiswa = (req, res, next) => {
  if (req.user && req.user.role === 'Mahasiswa') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Akses terbatas: Hanya Mahasiswa yang berwenang mengakses sumber daya ini.'
  });
};

module.exports = {
  authenticateToken,
  isDosen,
  isMahasiswa
};

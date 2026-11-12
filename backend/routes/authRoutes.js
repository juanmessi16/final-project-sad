const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route: Login (Mahasiswa / Dosen)
router.post('/login', AuthController.login);

// Protected route: Cek profil pengguna saat ini
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;

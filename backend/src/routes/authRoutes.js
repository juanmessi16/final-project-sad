/**
 * src/routes/authRoutes.js
 * Rute autentikasi xUnklab (Login, Heartbeat, Logout, Reset Sesi Perangkat, Profil).
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/heartbeat', authController.heartbeat);
router.post('/logout', authController.logout);
router.post('/reset-session', authController.resetUserSession);
router.get('/active-sessions', authController.getActiveSessions);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

/**
 * server.js
 * Entrypoint server Express REST API untuk Sistem Ujian xUnklab.
 * Mengintegrasikan HTTPS Redirect (TC-48), CORS, Helmet, JWT Auth, Database Connection Pool, dan rute modular.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { testConnection } = require('./src/config/db');
const { enforceHttps, immutableLogGuard } = require('./src/middlewares/securityMiddleware');

// Import modular routes
const authRoutes = require('./src/routes/authRoutes');
const ujianRoutes = require('./src/routes/ujianRoutes');
const sesiRoutes = require('./src/routes/sesiRoutes');
const antiCurangRoutes = require('./src/routes/antiCurangRoutes');
const hasilRoutes = require('./src/routes/hasilRoutes');
const dosenRoutes = require('./src/routes/dosenRoutes');

const app = express();

// Trust proxy agar X-Forwarded-Proto dan X-Forwarded-For terbaca akurat
app.set('trust proxy', true);

// TC-48: Paksa redirect HTTP ke HTTPS jika header/konfigurasi diaktifkan
app.use(enforceHttps);

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Simulated-IP', 'X-Enforce-HTTPS', 'X-Device-ID']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  return res.status(200).json({
    status: 'OK',
    server_time: new Date().toISOString(),
    database_connected: dbConnected,
    environment: process.env.NODE_ENV || 'development'
  });
});

// TC-52: Proteksi langsung rute log_pelanggaran dari modifikasi
app.all('/api/log-pelanggaran*', immutableLogGuard);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ujian', ujianRoutes);
app.use('/api/sesi', sesiRoutes);
app.use('/api/sesi', antiCurangRoutes); // Mengakomodasi endpoint POST /api/sesi/:id_sesi/pelanggaran
app.use('/api/hasil', hasilRoutes);
app.use('/api/dosen', dosenRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'xUnklab Exam System API',
    version: '2.0.0',
    institution: 'Fakultas Ilmu Komputer, Universitas Klabat',
    documentation: '/api/health'
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(` Server REST API xUnklab berjalan pada port: ${PORT}`);
    console.log(` Waktu Server: ${new Date().toLocaleString('id-ID')}`);
    console.log(` Menguji koneksi database MySQL...`);

    const connected = await testConnection();
    if (connected) {
      console.log(` [BERHASIL] Koneksi ke database MySQL '${process.env.DB_NAME || 'xunklab_db'}' stabil.`);
    } else {
      console.warn(` [PERINGATAN] Koneksi ke MySQL gagal!`);
      console.warn(` Pastikan MySQL berjalan (XAMPP / MySQL Service) dan database '${process.env.DB_NAME || 'xunklab_db'}' telah diimpor.`);
    }
    console.log(`=======================================================`);
  });
}

module.exports = app;

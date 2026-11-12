const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const dosenRoutes = require('./routes/dosenRoutes');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const ujianRoutes = require('./routes/ujianRoutes');

const app = express();

// Middleware dasar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging sederhana untuk request
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({
      status: 'OK',
      system: 'xUnklab Backend API',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      system: 'xUnklab Backend API',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Pendaftaran Rute API Sesuai SRS & UML
app.use('/api/auth', authRoutes);
app.use('/api/dosen', dosenRoutes);
app.use('/api/mahasiswa', mahasiswaRoutes);
app.use('/api/ujian', ujianRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server.'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  xUnklab Backend API running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Koneksi database gagal:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

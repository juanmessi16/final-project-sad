const express = require('express');
const cors = require('cors');
const ujianRoutes = require('./routes/ujianRoutes');
const db = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/ujian', ujianRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await db.authenticate();
    console.log(`Server SiLab berjalan di port ${PORT}`);
  } catch (error) {
    console.error('Koneksi database gagal:', error);
  }
});
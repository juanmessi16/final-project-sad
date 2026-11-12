const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xunklab_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Connection Pool mysql2
const pool = mysql.createPool(dbConfig);

// Helper function untuk menguji koneksi database
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Terhubung ke MySQL database '${dbConfig.database}' di ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database Error] Gagal terhubung ke MySQL:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  dbConfig
};

/**
 * src/config/db.js
 * Konfigurasi Connection Pool MySQL 8 menggunakan driver mysql2/promise.
 * Mendukung 100+ peserta simultan bebas race-condition (TC-46) dan auto-sync kolom skema.
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xunklab_db',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+08:00', // WITA (Universitas Klabat / Manado)
  dateStrings: true
});

let schemaChecked = false;

/**
 * Memastikan kolom-kolom baru (TC-05, TC-06, TC-10, TC-41, TC-42) tersedia meskipun DB lama belum dimigrasi ulang
 */
async function ensureSchemaUpgrades(connection) {
  if (schemaChecked) return;
  schemaChecked = true;

  const alterStatements = [
    "ALTER TABLE `dosen` ADD COLUMN `nip` VARCHAR(30) NULL DEFAULT '198501012010011001' AFTER `id_pengguna`",
    "ALTER TABLE `ujian` ADD COLUMN `acak_opsi` BOOLEAN NOT NULL DEFAULT TRUE AFTER `acak_aktif`",
    "ALTER TABLE `ujian` ADD COLUMN `batasi_jaringan_kampus` BOOLEAN NOT NULL DEFAULT FALSE AFTER `acak_opsi`",
    "ALTER TABLE `ujian` ADD COLUMN `subnet_kampus` VARCHAR(255) NOT NULL DEFAULT '127.0.0.1,::1,192.168.,10.,172.16.' AFTER `batasi_jaringan_kampus`",
    "ALTER TABLE `sesi_ujian_mahasiswa` ADD COLUMN `tambahan_waktu` INT NOT NULL DEFAULT 0 AFTER `sisa_waktu`",
    "ALTER TABLE `sesi_ujian_mahasiswa` ADD COLUMN `active_device_token` VARCHAR(100) NULL AFTER `tambahan_waktu`",
    "UPDATE `ujian` SET `pin_ujian` = '483920' WHERE `id_ujian` = 'UJN_01' AND `pin_ujian` = 'SAD2026'"
  ];

  for (const sql of alterStatements) {
    try {
      await connection.query(sql);
    } catch {
      // Abaikan jika kolom sudah ada
    }
  }
}

/**
 * Uji konektivitas ke server MySQL
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    await ensureSchemaUpgrades(connection);
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper eksekusi transaksi atomik (TC-46: bebas race-condition)
 * @param {Function} callback - fungsi asynchronous menerima argumen connection
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  withTransaction
};

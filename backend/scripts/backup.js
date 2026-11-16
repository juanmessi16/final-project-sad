/**
 * scripts/backup.js
 * Skrip backup otomatis basis data MySQL xUnklab (NFR-16).
 * Memanfaatkan utilitas mysqldump untuk menghasilkan dump SQL terkompresi/terjadwal.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'xunklab_db';

const backupDir = path.resolve(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `${DB_NAME}_backup_${timestamp}.sql`);

const pwdFlag = DB_PASSWORD ? `-p"${DB_PASSWORD}"` : '';
const cmd = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${pwdFlag} ${DB_NAME} > "${backupFile}"`;

console.log(`[BACKUP] Memulai proses backup database '${DB_NAME}'...`);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`[ERROR] Gagal melakukan backup database:`, error.message);
    if (stderr) console.error(stderr);
    process.exit(1);
  }
  console.log(`[SUKSES] Backup database berhasil disimpan di:`);
  console.log(` -> ${backupFile}`);
});

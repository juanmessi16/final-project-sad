const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const runMigrations = async (options = { fresh: false }) => {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'xunklab_db';

  console.log(`[Migration] Menghubungkan ke MySQL ${host}:${port}...`);
  const rootConn = await mysql.createConnection({ host, port, user, password });

  try {
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[Migration] Database '${database}' siap.`);
  } finally {
    await rootConn.end();
  }

  const db = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });

  try {
    if (options.fresh) {
      console.log(`[Migration] Membersihkan tabel lama (--fresh)...`);
      await db.query(`SET FOREIGN_KEY_CHECKS = 0;`);
      const tables = [
        'bukti_ujian_hasil',
        'log_pelanggaran',
        'jawaban_mahasiswa',
        'sesi_ujian_mahasiswa',
        'peserta_ujian',
        'ujian_soal',
        'ujian',
        'soal',
        'bank_soal',
        'mahasiswa',
        'dosen',
        'pengguna'
      ];
      for (const t of tables) {
        await db.query(`DROP TABLE IF EXISTS \`${t}\`;`);
      }
      await db.query(`SET FOREIGN_KEY_CHECKS = 1;`);
      console.log(`[Migration] Seluruh tabel lama berhasil dihapus.`);
    }

    console.log(`[Migration] Membaca skema SQL dari schema.sql...`);
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Eksekusi skema
    await db.query(sql);
    console.log(`[Migration] Berhasil! 12 tabel utama sistem xUnklab berhasil dimigrasi:`);
    const [rows] = await db.query(`SHOW TABLES;`);
    rows.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${Object.values(r)[0]}`);
    });
    return true;
  } catch (err) {
    console.error(`[Migration Error] Gagal menjalankan migrasi:`, err);
    throw err;
  } finally {
    await db.end();
  }
};

if (require.main === module) {
  const isFresh = process.argv.includes('--fresh');
  runMigrations({ fresh: isFresh })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };

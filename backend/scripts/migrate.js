/**
 * scripts/migrate.js
 * Skrip migrasi dan seeding otomatis langsung melalui driver Node.js.
 * Sangat memudahkan pengguna tanpa perlu command line 'mysql' terdaftar di PATH Windows/XAMPP.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'xunklab_db';

  console.log(`=======================================================`);
  console.log(` MIGRASI BASIS DATA xUnklab (MySQL 8)`);
  console.log(` Target Host : ${host}:${port}`);
  console.log(` Target DB   : ${database}`);
  console.log(`=======================================================\n`);

  let connection;
  try {
    // 1. Hubungkan ke server MySQL/TiDB
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: 'test',
      multipleStatements: true,
      ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
    });

    console.log(`1. Memeriksa keberadaan database '${database}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.changeUser({ database });
    console.log(`   [OK] Database '${database}' siap digunakan.\n`);

    // 2. Baca dan jalankan schema.sql
    console.log(`2. Mengeksekusi 'database/schema.sql' (12 Tabel & Triggers)...`);
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    let schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Sinkronkan nama database jika berbeda dari default
    schemaSQL = schemaSQL.replace(/USE `xunklab_db`;/g, `USE \`${database}\`;`);
    schemaSQL = schemaSQL.replace(/CREATE DATABASE IF NOT EXISTS `xunklab_db`/g, `CREATE DATABASE IF NOT EXISTS \`${database}\``);

    // Hapus DELIMITER delimiter bawaan CLI agar kompatibel dengan query mysql2
    schemaSQL = schemaSQL.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '').replace(/\$\$/g, ';');

    try {
      await connection.query(schemaSQL);
      console.log(`   [OK] Seluruh 12 tabel, foreign key, index, dan trigger berhasil dibuat.\n`);
    } catch (schemaErr) {
      // TiDB Cloud dan beberapa serverless MySQL tidak mendukung syntax TRIGGER
      if (schemaErr.message && (schemaErr.message.includes('TRIGGER') || schemaErr.message.includes('syntax to use line'))) {
        console.log(`   [INFO] Engine basis data tidak mendukung TRIGGER (kompatibel TiDB Cloud). Menjalankan skema tabel...`);
        let noTriggerSQL = schemaSQL
          .replace(/DROP TRIGGER IF EXISTS [^;]+;/gi, '')
          .replace(/CREATE TRIGGER[\s\S]*?END;/gi, '');
        await connection.query(noTriggerSQL);
        console.log(`   [OK] Seluruh 12 tabel, relasi foreign key, dan index berhasil dibuat.\n`);
      } else {
        throw schemaErr;
      }
    }

    // 3. Baca dan jalankan seed.sql
    console.log(`3. Mengeksekusi 'database/seed.sql' (Data Akun & Soal Ujian)...`);
    const seedPath = path.resolve(__dirname, '../database/seed.sql');
    let seedSQL = fs.readFileSync(seedPath, 'utf8');
    seedSQL = seedSQL.replace(/USE `xunklab_db`;/g, `USE \`${database}\`;`);

    await connection.query(seedSQL);
    console.log(`   [OK] Data seeding dosen, mahasiswa, bank soal, dan ujian berhasil diisi.\n`);

    console.log(`=======================================================`);
    console.log(` [SUKSES 100%] MIGRASI & SEEDING DATABASE SELESAI!`);
    console.log(` Anda sekarang dapat menjalankan server dengan: npm start`);
    console.log(`=======================================================`);
  } catch (error) {
    console.error(`\n[GAGAL] Terjadi kesalahan saat migrasi:`, error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`\n-> Pastikan service MySQL/XAMPP sudah dinyalakan pada port ${port}!`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

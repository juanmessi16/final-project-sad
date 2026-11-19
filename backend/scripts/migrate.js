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
    // 1. Hubungkan ke server MySQL tanpa memilih database terlebih dahulu
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log(`1. Memeriksa keberadaan database '${database}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.changeUser({ database });
    console.log(`   [OK] Database '${database}' siap digunakan.\n`);

    // 2. Baca dan jalankan schema.sql
    console.log(`2. Mengeksekusi 'database/schema.sql' (12 Tabel & Triggers)...`);
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    let schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Hapus DELIMITER delimiter bawaan CLI agar kompatibel dengan query mysql2
    schemaSQL = schemaSQL.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '').replace(/\$\$/g, ';');

    await connection.query(schemaSQL);
    console.log(`   [OK] Seluruh 12 tabel, foreign key, index, dan trigger berhasil dibuat.\n`);

    // 3. Baca dan jalankan seed.sql
    console.log(`3. Mengeksekusi 'database/seed.sql' (Data Akun & Soal Ujian)...`);
    const seedPath = path.resolve(__dirname, '../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

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

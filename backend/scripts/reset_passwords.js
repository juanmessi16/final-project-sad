const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function resetPasswords() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'xunklab_db';

  console.log('Generating valid bcrypt hashes...');
  const salt = bcrypt.genSaltSync(10);
  const hashDosen = bcrypt.hashSync('dosen123', salt);
  const hashMhs = bcrypt.hashSync('mhs123', salt);

  console.log('Verifying dosen123:', bcrypt.compareSync('dosen123', hashDosen));
  console.log('Verifying mhs123:', bcrypt.compareSync('mhs123', hashMhs));

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database
  });

  console.log('Updating database passwords in table `pengguna`...');
  await connection.query('UPDATE `pengguna` SET `password` = ? WHERE `role` = "Dosen"', [hashDosen]);
  await connection.query('UPDATE `pengguna` SET `password` = ? WHERE `role` = "Mahasiswa"', [hashMhs]);

  const [rows] = await connection.query('SELECT username, role, status_akun FROM `pengguna`');
  console.log('Updated users in database:');
  console.table(rows);

  await connection.end();

  // Juga update seed.sql agar konsisten
  const seedPath = path.resolve(__dirname, '../database/seed.sql');
  let seedSQL = fs.readFileSync(seedPath, 'utf8');

  // Ganti hash dosen
  seedSQL = seedSQL.replace(
    /\('USR_DOS_01', 'dosen', '[^']+', 'Dosen', 'Aktif'\);/,
    `('USR_DOS_01', 'dosen', '${hashDosen}', 'Dosen', 'Aktif');`
  );

  // Ganti hash mahasiswa
  seedSQL = seedSQL.replace(
    /\$2a\$10\$B26B56h\.5EMXsfYpHhQEVOPBJcaA8nq3WojHUcnluCNrN4XlMtUoi/g,
    hashMhs
  );

  fs.writeFileSync(seedPath, seedSQL, 'utf8');
  console.log('seed.sql updated with valid hashes.');
}

resetPasswords().catch(console.error);

const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seedDatabase = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('[Seeder] Memulai seeding data xUnklab...');
    await connection.beginTransaction();

    // 1. Hash Password dengan bcrypt
    const passwordHash123 = await bcrypt.hash('123', 10);
    const passwordHashDosen = await bcrypt.hash('dosen123', 10);

    // 2. Data Pengguna
    const penggunaList = [
      { id: 'USR_DOSEN_01', username: 'dosen', pass: passwordHashDosen, role: 'Dosen', status: 'Aktif' },
      { id: 'USR_MHS_01', username: '105022410021', pass: passwordHash123, role: 'Mahasiswa', status: 'Aktif' },
      { id: 'USR_MHS_02', username: '105022510107', pass: passwordHash123, role: 'Mahasiswa', status: 'Aktif' },
      { id: 'USR_MHS_03', username: '105022410095', pass: passwordHash123, role: 'Mahasiswa', status: 'Aktif' },
      { id: 'USR_MHS_04', username: '105022410007', pass: passwordHash123, role: 'Mahasiswa', status: 'Aktif' },
      { id: 'USR_MHS_05', username: '105022510475', pass: passwordHash123, role: 'Mahasiswa', status: 'Aktif' },
      { id: 'USR_MHS_LOCK', username: 'terkunci', pass: passwordHash123, role: 'Mahasiswa', status: 'Terkunci' }
    ];

    for (const p of penggunaList) {
      await connection.query(
        `INSERT INTO pengguna (id_pengguna, username, password, role, status_akun)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), status_akun = VALUES(status_akun);`,
        [p.id, p.username, p.pass, p.role, p.status]
      );
    }
    console.log(`[Seeder] ${penggunaList.length} akun pengguna berhasil dibuat.`);

    // 3. Profil Dosen
    await connection.query(
      `INSERT INTO dosen (id_dosen, id_pengguna, nama_dosen, mata_kuliah)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nama_dosen = VALUES(nama_dosen), mata_kuliah = VALUES(mata_kuliah);`,
      ['DOS_01', 'USR_DOSEN_01', 'George M. W. Tangka, S.Kom., MBA', 'Sistem Analisis & Desain']
    );
    console.log('[Seeder] Profil dosen berhasil dibuat.');

    // 4. Profil Mahasiswa
    const mhsList = [
      { id: 'MHS_01', user_id: 'USR_MHS_01', nim: '105022410021', nama: 'Tulengkey, Juan Messi Septhian' },
      { id: 'MHS_02', user_id: 'USR_MHS_02', nim: '105022510107', nama: 'Tuwaidan, Jeniffer Diana' },
      { id: 'MHS_03', user_id: 'USR_MHS_03', nim: '105022410095', nama: 'Sumual, Valentino' },
      { id: 'MHS_04', user_id: 'USR_MHS_04', nim: '105022410007', nama: 'Sahetapy, Wilman Valentino' },
      { id: 'MHS_05', user_id: 'USR_MHS_05', nim: '105022510475', nama: 'Laluyan, Matthew Arnold M' },
      { id: 'MHS_LOCK', user_id: 'USR_MHS_LOCK', nim: '105022499999', nama: 'Mahasiswa Terkunci (Demo)' }
    ];

    for (const m of mhsList) {
      await connection.query(
        `INSERT INTO mahasiswa (id_mahasiswa, id_pengguna, nim, nama)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nim = VALUES(nim), nama = VALUES(nama);`,
        [m.id, m.user_id, m.nim, m.nama]
      );
    }
    console.log(`[Seeder] ${mhsList.length} profil mahasiswa berhasil dibuat.`);

    // 5. Bank Soal
    await connection.query(
      `INSERT INTO bank_soal (id_bank_soal, id_dosen, nama_mata_kuliah)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nama_mata_kuliah = VALUES(nama_mata_kuliah);`,
      ['BS_01', 'DOS_01', 'Sistem Analisis & Desain']
    );
    console.log('[Seeder] Bank soal berhasil dibuat.');

    // 6. Soal-Soal
    const soalList = [
      {
        id: 'SOAL_01',
        bank_id: 'BS_01',
        pertanyaan: 'Apa tujuan utama dari diagram Use Case dalam perancangan perangkat lunak?',
        opsi: [
          'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem',
          'Menentukan struktur tabel database secara mendalam',
          'Mengatur alokasi memori runtime pada server',
          'Menampilkan arsitektur hardware jaringan'
        ],
        kunci: 'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem'
      },
      {
        id: 'SOAL_02',
        bank_id: 'BS_01',
        pertanyaan: 'Dalam UML, hubungan <<include>> antara use case menunjukkan bahwa:',
        opsi: [
          'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya',
          'Use case hanya dijalankan jika terjadi kesalahan eksepsional',
          'Use case bersifat opsional bergantung pada keputusan pengguna',
          'Use case adalah subclass dari use case lainnya'
        ],
        kunci: 'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya'
      },
      {
        id: 'SOAL_03',
        bank_id: 'BS_01',
        pertanyaan: 'Fitur anti-curang yang mendeteksi saat mahasiswa berpindah tab browser memanfaatkan event:',
        opsi: [
          'Window Focus / Visibility Change listener',
          'Keydown space bar listener',
          'Mouse click left listener',
          'Page reload cache'
        ],
        kunci: 'Window Focus / Visibility Change listener'
      },
      {
        id: 'SOAL_04',
        bank_id: 'BS_01',
        pertanyaan: 'Kapan sistem memicu aksi Kunci Sesi Ujian Paksa?',
        opsi: [
          'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan',
          'Segera setelah mahasiswa pertama kali membuka tab baru',
          'Saat mahasiswa menekan tombol submit secara manual',
          'Ketika dosen belum memasukkan PIN ujian'
        ],
        kunci: 'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan'
      },
      {
        id: 'SOAL_05',
        bank_id: 'BS_01',
        pertanyaan: 'Di dalam Entity Relationship Diagram (ERD), relasi antara Ujian dan Mahasiswa dimediasi oleh tabel:',
        opsi: [
          'peserta_ujian',
          'bank_soal',
          'log_pelanggaran',
          'bukti_ujian_hasil'
        ],
        kunci: 'peserta_ujian'
      }
    ];

    for (const s of soalList) {
      await connection.query(
        `INSERT INTO soal (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE pertanyaan = VALUES(pertanyaan), opsi_jawaban = VALUES(opsi_jawaban), kunci_jawaban = VALUES(kunci_jawaban);`,
        [s.id, s.bank_id, s.pertanyaan, JSON.stringify(s.opsi), s.kunci]
      );
    }
    console.log(`[Seeder] ${soalList.length} butir soal berhasil dibuat.`);

    // 7. Contoh Ujian
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const endDate = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await connection.query(
      `INSERT INTO ujian (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nama_ujian = VALUES(nama_ujian), durasi = VALUES(durasi), pin_ujian = VALUES(pin_ujian);`,
      ['UJN_SAD_01', 'DOS_01', 'Ujian Tengah Semester - Sistem Analisis & Desain', startDate, endDate, 60, 'SAD2026', 3]
    );
    console.log('[Seeder] Contoh Ujian UTS SAD (PIN: SAD2026) berhasil dibuat.');

    // 8. Relasi Ujian - Soal
    for (const s of soalList) {
      await connection.query(
        `INSERT IGNORE INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?);`,
        ['UJN_SAD_01', s.id]
      );
    }
    console.log('[Seeder] 5 soal berhasil ditautkan ke ujian UTS SAD.');

    // 9. Relasi Peserta Ujian
    for (const m of mhsList) {
      await connection.query(
        `INSERT IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?);`,
        ['UJN_SAD_01', m.id]
      );
    }
    console.log('[Seeder] Seluruh mahasiswa berhasil didaftarkan sebagai peserta ujian.');

    await connection.commit();
    console.log('[Seeder] Seeding database xUnklab selesai dengan sukses!');
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('[Seeder Error] Terjadi kesalahan saat seeding:', error);
    throw error;
  } finally {
    connection.release();
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase };

const { pool } = require('../config/database');

// Fisher-Yates Shuffle Helper
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SesiUjianModel = {
  findById: async (id_sesi) => {
    const query = `
      SELECT 
        s.*,
        u.nama_ujian,
        u.durasi,
        u.batas_toleransi_pelanggaran,
        m.nim,
        m.nama AS nama_mahasiswa
      FROM sesi_ujian_mahasiswa s
      JOIN ujian u ON s.id_ujian = u.id_ujian
      JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
      WHERE s.id_sesi = ? LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_sesi]);
    return rows[0] || null;
  },

  findByUjianAndMahasiswa: async (id_ujian, id_mahasiswa) => {
    const query = `
      SELECT 
        s.*,
        u.nama_ujian,
        u.durasi,
        u.batas_toleransi_pelanggaran
      FROM sesi_ujian_mahasiswa s
      JOIN ujian u ON s.id_ujian = u.id_ujian
      WHERE s.id_ujian = ? AND s.id_mahasiswa = ?
      LIMIT 1;
    `;
    const [rows] = await pool.query(query, [id_ujian, id_mahasiswa]);
    return rows[0] || null;
  },

  // Memulai atau mengambil sesi ujian (dengan transaksi dan pengacakan konsisten)
  startOrGetSession: async (id_ujian, id_mahasiswa) => {
    // 1. Cek apakah sesi sudah pernah dibuat
    const existing = await SesiUjianModel.findByUjianAndMahasiswa(id_ujian, id_mahasiswa);
    if (existing) {
      return { session: existing, isNew: false };
    }

    // 2. Buat sesi baru dalam transaksi
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Ambil data ujian
      const [examRows] = await connection.query(
        `SELECT * FROM ujian WHERE id_ujian = ? LIMIT 1;`,
        [id_ujian]
      );
      if (examRows.length === 0) {
        throw new Error('Ujian tidak ditemukan.');
      }
      const exam = examRows[0];

      // Ambil soal yang ditautkan ke ujian ini
      const [soalRows] = await connection.query(
        `SELECT s.* FROM ujian_soal us
         JOIN soal s ON us.id_soal = s.id_soal
         WHERE us.id_ujian = ?;`,
        [id_ujian]
      );

      if (soalRows.length === 0) {
        throw new Error('Ujian belum memiliki soal.');
      }

      const id_sesi = `SESI_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const waktu_mulai = new Date();
      const sisa_waktu = exam.durasi * 60; // detik

      // Simpan entri sesi ujian
      await connection.query(
        `INSERT INTO sesi_ujian_mahasiswa (id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu, jumlah_peringatan, status_ujian)
         VALUES (?, ?, ?, ?, ?, 0, 'Berlangsung');`,
        [id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu]
      );

      // Acak urutan soal (FR-06)
      const randomizedSoal = shuffleArray(soalRows);

      // Simpan urutan soal dan opsi acak ke tabel jawaban_mahasiswa
      let urutan = 1;
      for (const s of randomizedSoal) {
        const id_jawaban = `JAW_${Date.now()}_${urutan}_${Math.floor(Math.random() * 1000)}`;
        const originalOptions = typeof s.opsi_jawaban === 'string' ? JSON.parse(s.opsi_jawaban) : s.opsi_jawaban;
        // Acak opsi jawaban per soal
        const shuffledOptions = shuffleArray(originalOptions);

        await connection.query(
          `INSERT INTO jawaban_mahasiswa (id_jawaban, id_sesi, id_soal, jawaban_dipilih, urutan_soal, opsi_acak, waktu_disimpan)
           VALUES (?, ?, ?, NULL, ?, ?, NOW());`,
          [id_jawaban, id_sesi, s.id_soal, urutan, JSON.stringify(shuffledOptions)]
        );
        urutan++;
      }

      await connection.commit();

      const newSession = await SesiUjianModel.findById(id_sesi);
      return { session: newSession, isNew: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Mengambil soal untuk mahasiswa (KEAMANAN: Tanpa kunci_jawaban!)
  getQuestionsForStudent: async (id_sesi) => {
    const query = `
      SELECT 
        jm.id_jawaban,
        jm.urutan_soal,
        jm.jawaban_dipilih,
        jm.opsi_acak,
        jm.waktu_disimpan,
        s.id_soal,
        s.pertanyaan
      FROM jawaban_mahasiswa jm
      JOIN soal s ON jm.id_soal = s.id_soal
      WHERE jm.id_sesi = ?
      ORDER BY jm.urutan_soal ASC;
    `;
    const [rows] = await pool.query(query, [id_sesi]);
    return rows.map(r => ({
      id_soal: r.id_soal,
      id_jawaban: r.id_jawaban,
      urutan_soal: r.urutan_soal,
      pertanyaan: r.pertanyaan,
      opsi_jawaban: typeof r.opsi_acak === 'string' ? JSON.parse(r.opsi_acak) : r.opsi_acak,
      jawaban_dipilih: r.jawaban_dipilih,
      waktu_disimpan: r.waktu_disimpan
    }));
  },

  // Update status sesi
  updateStatus: async (id_sesi, status_ujian) => {
    await pool.query(
      `UPDATE sesi_ujian_mahasiswa SET status_ujian = ? WHERE id_sesi = ?;`,
      [status_ujian, id_sesi]
    );
    return true;
  },

  // Update sisa waktu ujian
  updateSisaWaktu: async (id_sesi, sisa_waktu) => {
    await pool.query(
      `UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?;`,
      [sisa_waktu, id_sesi]
    );
    return true;
  }
};

module.exports = SesiUjianModel;

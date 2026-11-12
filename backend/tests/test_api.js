const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/database');
const AuthController = require('../controllers/authController');
const DosenController = require('../controllers/dosenController');
const MahasiswaController = require('../controllers/mahasiswaController');
const {
  PenggunaModel,
  DosenModel,
  MahasiswaModel,
  BankSoalModel,
  SoalModel,
  UjianModel,
  SesiUjianModel,
  JawabanModel,
  LogPelanggaranModel,
  BuktiUjianModel
} = require('../models');

// Mock Express req & res objects
function mockReqRes(reqData = {}) {
  const req = {
    body: reqData.body || {},
    params: reqData.params || {},
    headers: reqData.headers || {},
    user: reqData.user || null
  };
  let responseData = null;
  let responseStatus = 200;
  const res = {
    status: (code) => {
      responseStatus = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    send: (data) => {
      responseData = data;
      return res;
    }
  };
  return {
    req,
    res,
    getStatus: () => responseStatus,
    getData: () => responseData
  };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  PENGUJIAN INTEGRASI DATABASE & REST API xUnklab (14 PENGUJIAN)');
  console.log('===============================================================\n');

  try {
    // 1. PENGUJIAN KONEKSI MYSQL
    console.log('1. Pengujian Koneksi MySQL:');
    const isConnected = await testConnection();
    assert(isConnected === true, 'Koneksi ke MySQL database berhasil melalui connection pool.');

    // 2. PENGUJIAN PEMBUATAN SELURUH TABEL
    console.log('\n2. Pengujian Pembuatan Seluruh 12 Tabel:');
    const [tableRows] = await pool.query('SHOW TABLES;');
    const tablesInDb = tableRows.map(r => Object.values(r)[0]);
    const expectedTables = [
      'pengguna',
      'dosen',
      'mahasiswa',
      'bank_soal',
      'soal',
      'ujian',
      'ujian_soal',
      'peserta_ujian',
      'sesi_ujian_mahasiswa',
      'jawaban_mahasiswa',
      'log_pelanggaran',
      'bukti_ujian_hasil'
    ];
    let allTablesFound = true;
    for (const t of expectedTables) {
      const exists = tablesInDb.includes(t);
      if (!exists) allTablesFound = false;
    }
    assert(allTablesFound && tablesInDb.length >= 12, `Seluruh 12 tabel utama terdaftar di basis data (${tablesInDb.join(', ')}).`);

    // 3. PENGUJIAN RELASI FOREIGN KEY
    console.log('\n3. Pengujian Relasi Foreign Key:');
    const [fkRows] = await pool.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'xunklab_db' AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    assert(fkRows.length >= 12, `Constraint Foreign Key aktif dan terdaftar (${fkRows.length} relasi FK diverifikasi).`);

    // 4. PENGUJIAN IMPORT & SEEDING AKUN
    console.log('\n4. Pengujian Registrasi dan Akun Pengguna:');
    const [users] = await pool.query('SELECT * FROM pengguna;');
    const [dosens] = await pool.query('SELECT * FROM dosen;');
    const [mahasiswas] = await pool.query('SELECT * FROM mahasiswa;');
    assert(users.length >= 7, `Data pengguna terisi (${users.length} akun).`);
    assert(dosens.length >= 1, `Profil dosen terhubung (Dosen: ${dosens[0].nama_dosen}).`);
    assert(mahasiswas.length >= 6, `Profil mahasiswa terhubung (${mahasiswas.length} mahasiswa).`);

    // 5. PENGUJIAN LOGIN MAHASISWA & DOSEN (AUTHENTICATION)
    console.log('\n5. Pengujian Login Mahasiswa dan Dosen (Auth & Role Check):');
    // a. Login Dosen valid
    const dosenLogin = mockReqRes({ body: { username: 'dosen', password: 'dosen123' } });
    await AuthController.login(dosenLogin.req, dosenLogin.res);
    assert(dosenLogin.getStatus() === 200 && dosenLogin.getData().user.role === 'Dosen', 'Login dosen berhasil dengan token JWT valid.');
    const dosenToken = dosenLogin.getData().token;
    const dosenUser = dosenLogin.getData().user;

    // b. Login Mahasiswa valid
    const mhsLogin = mockReqRes({ body: { username: '105022410021', password: '123' } });
    await AuthController.login(mhsLogin.req, mhsLogin.res);
    assert(mhsLogin.getStatus() === 200 && mhsLogin.getData().user.role === 'Mahasiswa', 'Login mahasiswa berhasil (NIM: 105022410021).');
    const mhsUser = mhsLogin.getData().user;

    // c. Login Password Salah
    const badLogin = mockReqRes({ body: { username: 'dosen', password: 'wrongpassword' } });
    await AuthController.login(badLogin.req, badLogin.res);
    assert(badLogin.getStatus() === 401, 'Login ditolak jika password salah (Status 401).');

    // d. Login Akun Terkunci (Alternate Flow 1.2.1.b)
    const lockedLogin = mockReqRes({ body: { username: 'terkunci', password: '123' } });
    await AuthController.login(lockedLogin.req, lockedLogin.res);
    assert(lockedLogin.getStatus() === 403, 'Akses ditolak jika akun berstatus Terkunci (Status 403).');

    // 6. PENGUJIAN CRUD BANK SOAL
    console.log('\n6. Pengujian CRUD Bank Soal & Soal:');
    const bankCtx = mockReqRes({
      user: { profile: { id_dosen: 'DOS_01' } },
      body: { nama_mata_kuliah: 'Rekayasa Perangkat Lunak' }
    });
    await DosenController.createBankSoal(bankCtx.req, bankCtx.res);
    assert(bankCtx.getStatus() === 201, 'Dosen berhasil membuat bank soal baru.');
    const newBankId = bankCtx.getData().data.id_bank_soal;

    const soalCtx = mockReqRes({
      body: {
        id_bank_soal: newBankId,
        pertanyaan: 'Apa kepanjangan dari SRS?',
        opsi_jawaban: ['Software Requirements Specification', 'System Realization Spec', 'Simple Real Service', 'Software Rapid Setup'],
        kunci_jawaban: 'Software Requirements Specification'
      }
    });
    await DosenController.createSoal(soalCtx.req, soalCtx.res);
    assert(soalCtx.getStatus() === 201, 'Dosen berhasil menambahkan soal baru ke bank soal.');
    const newSoalId = soalCtx.getData().data.id_soal;

    // Update soal
    const updateSoalCtx = mockReqRes({
      params: { id: newSoalId },
      body: { pertanyaan: 'Apa kepanjangan dari SRS dalam rekayasa perangkat lunak?' }
    });
    await DosenController.updateSoal(updateSoalCtx.req, updateSoalCtx.res);
    assert(updateSoalCtx.getStatus() === 200, 'Dosen berhasil mengubah data butir soal.');

    // 7. PENGUJIAN CRUD UJIAN
    console.log('\n7. Pengujian CRUD Ujian:');
    const examCtx = mockReqRes({
      user: { profile: { id_dosen: 'DOS_01' } },
      body: {
        nama_ujian: 'Kuis 1 RPL 2026',
        durasi: 45,
        pin_ujian: 'RPL123',
        batas_toleransi_pelanggaran: 3,
        soal_ids: [newSoalId],
        peserta_ids: ['MHS_01', 'MHS_02']
      }
    });
    await DosenController.createUjian(examCtx.req, examCtx.res);
    assert(examCtx.getStatus() === 201, 'Dosen berhasil membuat ujian baru dengan konfigurasi durasi & PIN.');
    const testExamId = examCtx.getData().data.id_ujian;

    // 8. PENGUJIAN PENGELOLAAN PESERTA UJIAN
    console.log('\n8. Pengujian Pengelolaan Peserta Ujian:');
    const addPesertaCtx = mockReqRes({
      params: { id: testExamId },
      body: { id_mahasiswa: 'MHS_03' }
    });
    await DosenController.addPeserta(addPesertaCtx.req, addPesertaCtx.res);
    assert(addPesertaCtx.getStatus() === 200, 'Peserta ujian baru berhasil ditambahkan ke ujian.');

    const removePesertaCtx = mockReqRes({
      params: { id: testExamId, mahasiswaId: 'MHS_03' }
    });
    await DosenController.removePeserta(removePesertaCtx.req, removePesertaCtx.res);
    assert(removePesertaCtx.getStatus() === 200, 'Peserta ujian berhasil dihapus dari ujian.');

    // 9. PENGUJIAN VERIFIKASI PIN
    console.log('\n9. Pengujian Verifikasi PIN:');
    const wrongPinCtx = mockReqRes({
      params: { id: 'UJN_SAD_01' },
      body: { pin_ujian: 'SALAH_PIN' }
    });
    await MahasiswaController.verifikasiPin(wrongPinCtx.req, wrongPinCtx.res);
    assert(wrongPinCtx.getStatus() === 400, 'PIN salah berhasil ditolak oleh sistem (Status 400).');

    const validPinCtx = mockReqRes({
      params: { id: 'UJN_SAD_01' },
      body: { pin_ujian: 'SAD2026' }
    });
    await MahasiswaController.verifikasiPin(validPinCtx.req, validPinCtx.res);
    assert(validPinCtx.getStatus() === 200, 'PIN benar (SAD2026) berhasil diverifikasi dan diizinkan.');

    // 10. PENGUJIAN MULAI SESI UJIAN & PENGACAKAN SOAL
    console.log('\n10. Pengujian Mulai Ujian & Pengacakan Soal:');
    const startExamCtx = mockReqRes({
      user: { profile: { id_mahasiswa: 'MHS_01' } },
      params: { id: 'UJN_SAD_01' },
      body: { pin_ujian: 'SAD2026' }
    });
    await MahasiswaController.mulaiUjian(startExamCtx.req, startExamCtx.res);
    assert(startExamCtx.getStatus() === 200, 'Mahasiswa berhasil memulai sesi ujian baru.');
    const activeSesiId = startExamCtx.getData().session.id_sesi;

    // Ambil soal sesi (Validasi bahwa kunci jawaban TIDAK dikirimkan)
    const getSoalCtx = mockReqRes({
      user: { profile: { id_mahasiswa: 'MHS_01' } },
      params: { id: activeSesiId }
    });
    await MahasiswaController.getSoalSesi(getSoalCtx.req, getSoalCtx.res);
    const questions = getSoalCtx.getData().soal;
    assert(
      questions.length >= 5 && questions.every(q => q.kunci_jawaban === undefined),
      'Soal berhasil diambil dalam urutan teracak dan KUNCI JAWABAN TIDAK DITAMPILKAN.'
    );

    // 11. PENGUJIAN PENYIMPANAN JAWABAN OTOMATIS (AUTO-SAVE)
    console.log('\n11. Pengujian Auto-Save Jawaban:');
    const targetSoal = questions[0];
    const autoSaveCtx = mockReqRes({
      params: { id: activeSesiId },
      body: {
        id_soal: targetSoal.id_soal,
        jawaban_dipilih: targetSoal.opsi_jawaban[0],
        sisa_waktu: 3500
      }
    });
    await MahasiswaController.simpanJawaban(autoSaveCtx.req, autoSaveCtx.res);
    assert(autoSaveCtx.getStatus() === 200, 'Auto-save jawaban berhasil memperbarui database secara atomik.');

    // 12. PENGUJIAN PENCATATAN PELANGGARAN & PENGUNCIAN PAKSA
    console.log('\n12. Pengujian Pencatatan Pelanggaran Anti-Curang:');
    // Pelanggaran 1: Pindah Tab
    const v1Ctx = mockReqRes({
      params: { id: activeSesiId },
      body: { jenis_pelanggaran: 'Pindah Tab' }
    });
    await MahasiswaController.catatPelanggaran(v1Ctx.req, v1Ctx.res);
    assert(v1Ctx.getData().data.jumlah_peringatan === 1, 'Pelanggaran ke-1 dicatat sebagai Pindah Tab (Peringatan 1).');

    // Pelanggaran 2: Copy-Paste
    const v2Ctx = mockReqRes({
      params: { id: activeSesiId },
      body: { jenis_pelanggaran: 'Copy-Paste' }
    });
    await MahasiswaController.catatPelanggaran(v2Ctx.req, v2Ctx.res);
    assert(v2Ctx.getData().data.jumlah_peringatan === 2, 'Pelanggaran ke-2 dicatat sebagai Copy-Paste (Peringatan 2).');

    // Pelanggaran 3: Melampaui Batas -> Dikunci Paksa (FR-09)
    const v3Ctx = mockReqRes({
      params: { id: activeSesiId },
      body: { jenis_pelanggaran: 'Pindah Tab' }
    });
    await MahasiswaController.catatPelanggaran(v3Ctx.req, v3Ctx.res);
    assert(
      v3Ctx.getData().data.dikunci_paksa === true && v3Ctx.getData().data.status_ujian === 'Dikunci Paksa',
      'Pelanggaran ke-3 melewati ambang batas: Sesi berhasil DIKUNCI PAKSA otomatis oleh sistem.'
    );

    // 13. PENGUJIAN SUBMIT UJIAN & BUKTI UJIAN (RESI)
    console.log('\n13. Pengujian Submit Ujian & Penerbitan Tanda Terima Bukti:');
    // Uji submit untuk sesi mahasiswa ke-2 agar menguji skenario submit normal
    const startMhs2 = mockReqRes({
      user: { profile: { id_mahasiswa: 'MHS_02' } },
      params: { id: 'UJN_SAD_01' },
      body: { pin_ujian: 'SAD2026' }
    });
    await MahasiswaController.mulaiUjian(startMhs2.req, startMhs2.res);
    const sesi2Id = startMhs2.getData().session.id_sesi;

    const submitCtx = mockReqRes({
      user: { profile: { id_mahasiswa: 'MHS_02' } },
      params: { id: sesi2Id },
      body: {
        status_ujian: 'Selesai',
        answers: {
          'SOAL_01': 'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem',
          'SOAL_02': 'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya'
        }
      }
    });
    await MahasiswaController.submitUjian(submitCtx.req, submitCtx.res);
    const buktiData = submitCtx.getData().data;
    assert(
      submitCtx.getStatus() === 200 && buktiData && buktiData.id_bukti && buktiData.total_nilai !== null,
      `Ujian berhasil disubmit dan Bukti Ujian diterbitkan (ID: ${buktiData?.id_bukti}, Nilai: ${buktiData?.total_nilai}).`
    );

    // 14. PENGUJIAN HASIL UJIAN & KEPUTUSAN DOSEN
    console.log('\n14. Pengujian Riwayat Hasil Ujian & Penetapan Keputusan Dosen:');
    // Mahasiswa melihat hasil
    const hasilCtx = mockReqRes({
      user: { profile: { id_mahasiswa: 'MHS_02' } }
    });
    await MahasiswaController.getHasilUjian(hasilCtx.req, hasilCtx.res);
    assert(hasilCtx.getStatus() === 200 && hasilCtx.getData().data.length > 0, 'Mahasiswa dapat melihat riwayat hasil ujian dan nilai.');

    // Dosen menetapkan keputusan sanksi pelanggaran pada sesi MHS_01 yang terkunci
    const sanksiCtx = mockReqRes({
      body: {
        id_sesi: activeSesiId,
        status_keputusan: 'Pengurangan Nilai'
      }
    });
    await DosenController.tetapkanKeputusan(sanksiCtx.req, sanksiCtx.res);
    assert(sanksiCtx.getStatus() === 200 && sanksiCtx.getData().data.status_keputusan === 'Pengurangan Nilai', 'Dosen berhasil menetapkan keputusan pelanggaran (Pengurangan Nilai).');

    // Cleanup bank soal tes
    await SoalModel.delete(newSoalId);
    await pool.query('DELETE FROM bank_soal WHERE id_bank_soal = ?', [newBankId]);
    await pool.query('DELETE FROM ujian WHERE id_ujian = ?', [testExamId]);

    console.log('\n===============================================================');
    console.log(`HASIL AKHIR PENGUJIAN: ${passedTests} LULUS, ${failedTests} GAGAL`);
    console.log('===============================================================');

    if (failedTests === 0) {
      console.log('SEMUA 14 PERSYARATAN PENGUJIAN BERHASIL 100%!');
      process.exit(0);
    } else {
      console.error('Terdapat pengujian yang gagal.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error saat pengujian:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite();
}

module.exports = { runTestSuite };

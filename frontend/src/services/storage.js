/**
 * storage.js - Data Service & Storage Manager untuk SiLab Exam System Frontend
 * Mengelola data persisten di localStorage sesuai dengan skema UML:
 * - Pengguna & Mahasiswa & Dosen
 * - Bank Soal & Soal
 * - Ujian & Peserta Ujian & Ujian Soal
 * - Sesi Ujian Mahasiswa & Jawaban Mahasiswa
 * - Log Pelanggaran Anti-Curang
 * - Bukti Ujian & Hasil Penilaian
 */

const STORAGE_KEY = 'silab_exam_system_db';

const INITIAL_DATA = {
  pengguna: [
    { id_pengguna: 'USR_DOSEN_01', username: 'dosen', password: 'dosen123', role: 'Dosen', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_01', username: '105022410021', password: '123', role: 'Mahasiswa', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_02', username: '105022510107', password: '123', role: 'Mahasiswa', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_03', username: '105022410095', password: '123', role: 'Mahasiswa', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_04', username: '105022410007', password: '123', role: 'Mahasiswa', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_05', username: '105022510475', password: '123', role: 'Mahasiswa', status_akun: 'Aktif' },
    { id_pengguna: 'USR_MHS_LOCK', username: 'terkunci', password: '123', role: 'Mahasiswa', status_akun: 'Terkunci' }
  ],
  dosen: [
    { id_dosen: 'DOS_01', id_pengguna: 'USR_DOSEN_01', nama_dosen: 'George M. W. Tangka, S.Kom., MBA', mata_kuliah: 'Sistem Analisis & Desain' }
  ],
  mahasiswa: [
    { id_mahasiswa: 'MHS_01', id_pengguna: 'USR_MHS_01', nim: '105022410021', nama: 'Tulengkey, Juan Messi Septhian' },
    { id_mahasiswa: 'MHS_02', id_pengguna: 'USR_MHS_02', nim: '105022510107', nama: 'Tuwaidan, Jeniffer Diana' },
    { id_mahasiswa: 'MHS_03', id_pengguna: 'USR_MHS_03', nim: '105022410095', nama: 'Sumual, Valentino' },
    { id_mahasiswa: 'MHS_04', id_pengguna: 'USR_MHS_04', nim: '105022410007', nama: 'Sahetapy, Wilman Valentino' },
    { id_mahasiswa: 'MHS_05', id_pengguna: 'USR_MHS_05', nim: '105022510475', nama: 'Laluyan, Matthew Arnold M' },
    { id_mahasiswa: 'MHS_LOCK', id_pengguna: 'USR_MHS_LOCK', nim: '105022499999', nama: 'Mahasiswa Terkunci (Demo)' }
  ],
  bank_soal: [
    { id_bank_soal: 'BS_01', id_dosen: 'DOS_01', nama_mata_kuliah: 'Sistem Analisis & Desain' }
  ],
  soal: [
    {
      id_soal: 'SOAL_01',
      id_bank_soal: 'BS_01',
      pertanyaan: 'Apa tujuan utama dari diagram Use Case dalam perancangan perangkat lunak?',
      opsi_jawaban: [
        'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem',
        'Menentukan struktur tabel database secara mendalam',
        'Mengatur alokasi memori runtime pada server',
        'Menampilkan arsitektur hardware jaringan'
      ],
      kunci_jawaban: 'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem'
    },
    {
      id_soal: 'SOAL_02',
      id_bank_soal: 'BS_01',
      pertanyaan: 'Dalam UML, hubungan <<include>> antara use case menunjukkan bahwa:',
      opsi_jawaban: [
        'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya',
        'Use case hanya dijalankan jika terjadi kesalahan eksepsional',
        'Use case bersifat opsional bergantung pada keputusan pengguna',
        'Use case adalah subclass dari use case lainnya'
      ],
      kunci_jawaban: 'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya'
    },
    {
      id_soal: 'SOAL_03',
      id_bank_soal: 'BS_01',
      pertanyaan: 'Fitur anti-curang yang mendeteksi saat mahasiswa berpindah tab browser memanfaatkan event:',
      opsi_jawaban: [
        'Window Focus / Visibility Change listener',
        'Keydown space bar listener',
        'Mouse click left listener',
        'Page reload cache'
      ],
      kunci_jawaban: 'Window Focus / Visibility Change listener'
    },
    {
      id_soal: 'SOAL_04',
      id_bank_soal: 'BS_01',
      pertanyaan: 'Kapan sistem memicu aksi Kunci Sesi Ujian Paksa?',
      opsi_jawaban: [
        'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan',
        'Segera setelah mahasiswa pertama kali membuka tab baru',
        'Saat mahasiswa menekan tombol submit secara manual',
        'Ketika dosen belum memasukkan PIN ujian'
      ],
      kunci_jawaban: 'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan'
    },
    {
      id_soal: 'SOAL_05',
      id_bank_soal: 'BS_01',
      pertanyaan: 'Di dalam Entity Relationship Diagram (ERD), relasi antara Ujian dan Mahasiswa dimediasi oleh tabel:',
      opsi_jawaban: [
        'peserta_ujian',
        'bank_soal',
        'log_pelanggaran',
        'bukti_ujian_hasil'
      ],
      kunci_jawaban: 'peserta_ujian'
    }
  ],
  ujian: [
    {
      id_ujian: 'UJN_01',
      id_dosen: 'DOS_01',
      nama_ujian: 'UTS Sistem Analisis & Desain (SAD)',
      tanggal_waktu_mulai: '2026-10-20 08:00:00',
      tanggal_waktu_selesai: '2026-11-10 23:59:00',
      durasi: 60, // menit
      pin_ujian: '123456',
      batas_toleransi_pelanggaran: 3
    }
  ],
  ujian_soal: [
    { id_ujian: 'UJN_01', id_soal: 'SOAL_01' },
    { id_ujian: 'UJN_01', id_soal: 'SOAL_02' },
    { id_ujian: 'UJN_01', id_soal: 'SOAL_03' },
    { id_ujian: 'UJN_01', id_soal: 'SOAL_04' },
    { id_ujian: 'UJN_01', id_soal: 'SOAL_05' }
  ],
  peserta_ujian: [
    { id_ujian: 'UJN_01', id_mahasiswa: 'MHS_01' },
    { id_ujian: 'UJN_01', id_mahasiswa: 'MHS_02' },
    { id_ujian: 'UJN_01', id_mahasiswa: 'MHS_03' },
    { id_ujian: 'UJN_01', id_mahasiswa: 'MHS_04' },
    { id_ujian: 'UJN_01', id_mahasiswa: 'MHS_05' }
  ],
  sesi_ujian_mahasiswa: [],
  jawaban_mahasiswa: [],
  log_pelanggaran: [],
  bukti_ujian_hasil: []
};

// Inisialisasi atau ambil database dari localStorage
export const getDB = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    return JSON.parse(data);
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
};

export const saveDB = (db) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

// ================== SERVICE METHODS ==================

// 1. Melakukan Login (Use Case 1.2.1)
export const loginUser = (usernameInput, password) => {
  const db = getDB();
  const raw = usernameInput.toLowerCase().trim();
  
  // Deteksi jika input berupa email UNKLAB
  let targetUsername = raw;
  if (raw.includes('@')) {
    if (raw.includes('george.tangka') || raw.includes('dosen')) {
      targetUsername = 'dosen';
    } else if (raw.includes('locked') || raw.includes('terkunci')) {
      targetUsername = 'terkunci';
    } else {
      const digits = raw.replace(/\D/g, '');
      if (digits) targetUsername = digits;
    }
  }

  const user = db.pengguna.find(p => p.username.toLowerCase() === targetUsername || p.username.toLowerCase() === raw);
  if (!user || user.password !== password) {
    return { success: false, message: 'Invalid login, please try again' };
  }
  if (user.status_akun !== 'Aktif') {
    return { success: false, message: `Akses ditolak: Akun Anda sedang berstatus '${user.status_akun}'.` };
  }

  let profile = null;
  if (user.role === 'Mahasiswa') {
    profile = db.mahasiswa.find(m => m.id_pengguna === user.id_pengguna);
  } else {
    profile = db.dosen.find(d => d.id_pengguna === user.id_pengguna);
  }

  return {
    success: true,
    user: {
      ...user,
      profile
    }
  };
};

// Login via Akun UNKLAB Email (Google OAuth simulation)
export const loginByEmail = (email) => {
  const db = getDB();
  const raw = email.toLowerCase().trim();
  
  let targetUsername = raw;
  if (raw.includes('george.tangka') || raw.includes('dosen')) {
    targetUsername = 'dosen';
  } else if (raw.includes('locked') || raw.includes('terkunci')) {
    targetUsername = 'terkunci';
  } else {
    const digits = raw.replace(/\D/g, '');
    if (digits) targetUsername = digits;
  }

  const user = db.pengguna.find(p => p.username.toLowerCase() === targetUsername || p.username.toLowerCase() === raw);
  if (!user) {
    return { success: false, message: 'Akun Google UNKLAB tidak terdaftar dalam sistem xUnklab.' };
  }
  if (user.status_akun !== 'Aktif') {
    return { success: false, message: `Akses ditolak: Akun Anda sedang berstatus '${user.status_akun}'.` };
  }

  let profile = null;
  if (user.role === 'Mahasiswa') {
    profile = db.mahasiswa.find(m => m.id_pengguna === user.id_pengguna);
  } else {
    profile = db.dosen.find(d => d.id_pengguna === user.id_pengguna);
  }

  return {
    success: true,
    user: {
      ...user,
      profile
    }
  };
};

// 2. Verifikasi PIN Ujian (Use Case 1.2.2)
export const verifyPin = (id_ujian, pinInput, id_mahasiswa) => {
  const db = getDB();
  const ujian = db.ujian.find(u => u.id_ujian === id_ujian);
  if (!ujian) return { success: false, message: 'Ujian tidak ditemukan.' };

  const now = new Date();
  const start = new Date(ujian.tanggal_waktu_mulai.replace(' ', 'T'));
  const end = new Date(ujian.tanggal_waktu_selesai.replace(' ', 'T'));

  if (now < start) {
    return { success: false, message: 'Sesi ujian belum dibuka oleh dosen.' };
  }
  if (now > end) {
    return { success: false, message: 'Sesi ujian sudah melewati batas waktu.' };
  }

  if (ujian.pin_ujian !== pinInput) {
    return { success: false, message: 'PIN Ujian salah! Silakan coba lagi.' };
  }

  // Ambil atau buat sesi ujian mahasiswa
  let sesi = db.sesi_ujian_mahasiswa.find(s => s.id_ujian === id_ujian && s.id_mahasiswa === id_mahasiswa);
  if (!sesi) {
    sesi = {
      id_sesi: `SESI_${Date.now()}`,
      id_ujian,
      id_mahasiswa,
      waktu_mulai: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sisa_waktu: ujian.durasi * 60,
      jumlah_peringatan: 0,
      status_ujian: 'Berlangsung'
    };
    db.sesi_ujian_mahasiswa.push(sesi);
    saveDB(db);
  }

  return { success: true, sesi };
};

// 3. Ambil data ujian & soal teracak (Use Case 1.2.11)
export const getExamSessionData = (id_sesi) => {
  const db = getDB();
  const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_sesi === id_sesi);
  if (!sesi) return null;

  const ujian = db.ujian.find(u => u.id_ujian === sesi.id_ujian);
  const soalIds = db.ujian_soal.filter(us => us.id_ujian === ujian.id_ujian).map(us => us.id_soal);
  const rawSoal = db.soal.filter(s => soalIds.includes(s.id_soal));

  // Acak urutan soal dan opsi per use case 1.2.11
  const shuffledSoal = rawSoal.map(s => {
    const shuffledOpsi = [...s.opsi_jawaban].sort(() => Math.random() - 0.5);
    return {
      ...s,
      opsi_jawaban: shuffledOpsi
    };
  }).sort(() => Math.random() - 0.5);

  // Ambil jawaban tersimpan
  const savedAnswers = {};
  db.jawaban_mahasiswa.filter(j => j.id_sesi === id_sesi).forEach(j => {
    savedAnswers[j.id_soal] = j.jawaban_dipilih;
  });

  return {
    sesi,
    ujian,
    soal: shuffledSoal,
    jawaban_tersimpan: savedAnswers
  };
};

// 4. Auto-save Jawaban (Use Case 1.2.12)
export const autoSaveAnswer = (id_sesi, id_soal, jawaban_dipilih, sisa_waktu) => {
  const db = getDB();
  const waktu_str = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Update sisa waktu sesi
  const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_sesi === id_sesi);
  if (sesi && sisa_waktu !== undefined) {
    sesi.sisa_waktu = sisa_waktu;
  }

  const existing = db.jawaban_mahasiswa.find(j => j.id_sesi === id_sesi && j.id_soal === id_soal);
  if (existing) {
    existing.jawaban_dipilih = jawaban_dipilih;
    existing.waktu_disimpan = waktu_str;
  } else {
    db.jawaban_mahasiswa.push({
      id_jawaban: `JAW_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      id_sesi,
      id_soal,
      jawaban_dipilih,
      urutan_soal: 1,
      waktu_disimpan: waktu_str
    });
  }
  saveDB(db);
  return { success: true, saved_at: waktu_str };
};

// 5. Catat Pelanggaran & Deteksi Ambang Batas (Use Case 1.2.14, 1.2.15, 1.2.17, 1.2.18)
export const recordViolation = (id_sesi, jenis_pelanggaran) => {
  const db = getDB();
  const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_sesi === id_sesi);
  if (!sesi || sesi.status_ujian !== 'Berlangsung') return null;

  const ujian = db.ujian.find(u => u.id_ujian === sesi.id_ujian);
  const waktu_str = new Date().toISOString().replace('T', ' ').substring(0, 19);

  sesi.jumlah_peringatan += 1;
  const log_id = `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  db.log_pelanggaran.push({
    id_log: log_id,
    id_sesi,
    jenis_pelanggaran,
    waktu_kejadian: waktu_str,
    jumlah_pelanggaran: sesi.jumlah_peringatan
  });

  const batas = ujian.batas_toleransi_pelanggaran || 3;
  const kunci_paksa = sesi.jumlah_peringatan >= batas;

  if (kunci_paksa) {
    sesi.status_ujian = 'Dikunci Paksa';
    db.log_pelanggaran.push({
      id_log: `LOCK_${Date.now()}`,
      id_sesi,
      jenis_pelanggaran: 'Sesi Dikunci Paksa',
      waktu_kejadian: waktu_str,
      jumlah_pelanggaran: sesi.jumlah_peringatan
    });

    // Buat bukti tanda terima dengan status Dikunci Paksa
    const bukti_id = `BKT_${Date.now()}`;
    db.bukti_ujian_hasil.push({
      id_bukti: bukti_id,
      id_sesi,
      waktu_pengiriman: waktu_str,
      status_pengiriman: 'Dikunci Paksa',
      total_nilai: 0.0,
      status_keputusan: 'Peringatan'
    });
  }

  saveDB(db);
  return {
    jumlah_peringatan: sesi.jumlah_peringatan,
    batas_toleransi: batas,
    kunci_paksa
  };
};

// 6. Submit Ujian Final (Use Case 1.2.4 & 1.2.16 & 1.2.19)
export const submitExamFinal = (id_sesi, answers, status_pengiriman = 'Selesai') => {
  const db = getDB();
  const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_sesi === id_sesi);
  if (!sesi) return null;

  sesi.status_ujian = status_pengiriman;
  const waktu_str = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Kalkulasi Skor Otomatis Berdasarkan Kunci Jawaban
  const soalIds = db.ujian_soal.filter(us => us.id_ujian === sesi.id_ujian).map(us => us.id_soal);
  const examSoal = db.soal.filter(s => soalIds.includes(s.id_soal));
  let benar = 0;
  examSoal.forEach(s => {
    if (answers[s.id_soal] === s.kunci_jawaban) {
      benar += 1;
    }
  });
  const total = examSoal.length;
  const nilai = total > 0 ? Math.round((benar / total) * 100 * 100) / 100 : 0.0;

  // Hapus bukti lama jika ada lalu buat baru
  db.bukti_ujian_hasil = db.bukti_ujian_hasil.filter(b => b.id_sesi !== id_sesi);
  const bukti_id = `BKT_${Date.now()}`;
  const bukti = {
    id_bukti: bukti_id,
    id_sesi,
    waktu_pengiriman: waktu_str,
    status_pengiriman,
    total_nilai: nilai,
    status_keputusan: 'Tidak Ada'
  };
  db.bukti_ujian_hasil.push(bukti);
  saveDB(db);

  return bukti;
};

// 7. Ambil Riwayat Hasil Ujian Mahasiswa (Use Case 1.2.5)
export const getMahasiswaResults = (id_mahasiswa) => {
  const db = getDB();
  const studentSessions = db.sesi_ujian_mahasiswa.filter(s => s.id_mahasiswa === id_mahasiswa);
  const sessionIds = studentSessions.map(s => s.id_sesi);

  const results = db.bukti_ujian_hasil
    .filter(b => sessionIds.includes(b.id_sesi))
    .map(b => {
      const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_sesi === b.id_sesi);
      const ujian = db.ujian.find(u => u.id_ujian === sesi.id_ujian);
      return {
        ...b,
        nama_ujian: ujian ? ujian.nama_ujian : 'Ujian',
        id_ujian: ujian ? ujian.id_ujian : '-'
      };
    });

  return results;
};

// 8. Kelola Bank Soal Dosen (Use Case 1.2.6)
export const addSoalToBank = (id_dosen, pertanyaan, opsi_jawaban, kunci_jawaban) => {
  const db = getDB();
  const bank = db.bank_soal.find(b => b.id_dosen === id_dosen);
  if (!bank) return false;

  const id_soal = `SOAL_${Date.now()}_${Math.floor(Math.random() * 100)}`;
  db.soal.push({
    id_soal,
    id_bank_soal: bank.id_bank_soal,
    pertanyaan,
    opsi_jawaban,
    kunci_jawaban
  });
  saveDB(db);
  return id_soal;
};

export const deleteSoalFromBank = (id_soal) => {
  const db = getDB();
  db.soal = db.soal.filter(s => s.id_soal !== id_soal);
  db.ujian_soal = db.ujian_soal.filter(us => us.id_soal !== id_soal);
  saveDB(db);
  return true;
};

// 9. Atur Ujian Baru Dosen (Use Case 1.2.7)
export const createUjianDosen = (id_dosen, nama_ujian, durasi, pin_ujian, batas_toleransi, selectedSoalIds) => {
  const db = getDB();
  const id_ujian = `UJN_${Date.now()}`;
  const now = new Date();
  const start = now.toISOString().replace('T', ' ').substring(0, 19);
  const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  db.ujian.push({
    id_ujian,
    id_dosen,
    nama_ujian,
    tanggal_waktu_mulai: start,
    tanggal_waktu_selesai: end,
    durasi: parseInt(durasi),
    pin_ujian,
    batas_toleransi_pelanggaran: parseInt(batas_toleransi)
  });

  // Hubungkan soal
  selectedSoalIds.forEach(sid => {
    db.ujian_soal.push({ id_ujian, id_soal: sid });
  });

  // Daftarkan semua mahasiswa aktif ke ujian ini
  db.mahasiswa.forEach(m => {
    db.peserta_ujian.push({ id_ujian, id_mahasiswa: m.id_mahasiswa });
  });

  saveDB(db);
  return id_ujian;
};

// 10. Kelola Peserta Ujian Dosen (Use Case 1.2.8)
export const removePesertaFromUjian = (id_ujian, id_mahasiswa) => {
  const db = getDB();
  db.peserta_ujian = db.peserta_ujian.filter(p => !(p.id_ujian === id_ujian && p.id_mahasiswa === id_mahasiswa));
  saveDB(db);
  return true;
};

// 11. Tetapkan Keputusan Pelanggaran Dosen (Use Case 1.2.10)
export const applyViolationSanction = (id_sesi, keputusan) => {
  const db = getDB();
  const bukti = db.bukti_ujian_hasil.find(b => b.id_sesi === id_sesi);
  if (!bukti) return false;

  bukti.status_keputusan = keputusan;
  if (keputusan === 'Diskualifikasi') {
    bukti.total_nilai = 0.0;
  } else if (keputusan === 'Pengurangan Nilai') {
    bukti.total_nilai = Math.max(0.0, (bukti.total_nilai || 100.0) - 20.0);
  }
  saveDB(db);
  return bukti;
};

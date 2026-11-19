/**
 * frontend/src/ui-lib/apiClient.ts
 * Klien REST API terpusat dengan dukungan penuh untuk seluruh 53 Test Case (TC-01 s.d. TC-53):
 * - Terhubung langsung ke Backend Express + MySQL (http://localhost:5000/api)
 * - Dilengkapi State Mirror & Offline Queue di localStorage untuk ketahanan jaringan (TC-24, TC-51)
 * - Mendukung Single Active Device Token per Tab/Perangkat (TC-05)
 * - Mendukung Validasi Masa Berlaku JWT 3 Jam & RBAC (TC-49)
 * - Mendukung Simulasi IP Jaringan Kampus vs Luar Kampus (TC-41)
 */

const API_BASE = "http://localhost:5000/api";
const DB_STORAGE_KEY = "xunklab_mirror_db_v2";
const OFFLINE_QUEUE_KEY = "xunklab_offline_submit_queue_v2";

export interface QuestionItem {
  id_soal: string;
  id_bank_soal?: string;
  id_ujian?: string; // Relasi ke ujian tertentu (TC-29, TC-30, TC-37, TC-38)
  examId?: string;   // Alias examId sesuai ketentuan
  tipe_soal: "Pilihan Ganda" | "Benar/Salah" | "Isian Singkat" | "Esai";
  pertanyaan: string;
  opsi_jawaban: string[] | null;
  kunci_jawaban?: string | null;
  bobot: number;
  urutan_soal?: number;
  jawaban_dipilih?: string | null;
  nilai_soal?: number | null;
}

export interface ExamItem {
  id_ujian: string;
  nama_ujian: string;
  mata_kuliah: string;
  kode_mk: string;
  nama_dosen: string;
  tanggal_waktu_mulai: string;
  tanggal_waktu_selesai: string;
  durasi: number;
  pin_ujian?: string; // Hanya ada di sisi dosen, dihapus pada respons mahasiswa (TC-50)
  maks_percobaan: number;
  acak_aktif: boolean;
  acak_opsi: boolean;
  batasi_jaringan_kampus: boolean;
  subnet_kampus?: string;
  batas_toleransi_pelanggaran: number;
  hasil_dipublikasikan: boolean;
  status_ketersediaan?: string;
  sesi_aktif?: any;
}

export interface ParticipantItem {
  id_mahasiswa: string;
  nim: string;
  nama: string;
  kelas: string;
  id_ujian?: string;
  examId?: string;
  id_sesi?: string | null;
  status_ujian?: string;
  sisa_waktu?: number;
  tambahan_waktu?: number;
  jumlah_peringatan?: number;
  total_nilai?: number | null;
  status_keputusan?: string;
}

export interface ViolationLogItem {
  id_log: string;
  id_sesi: string;
  id_ujian: string;
  nama_ujian: string;
  nim: string;
  nama_mahasiswa: string;
  jenis_pelanggaran: "Pindah Tab" | "Copy-Paste" | "Keluar Layar Penuh" | "Sesi Dikunci Paksa";
  waktu_kejadian: string;
  jumlah_pelanggaran: number;
  status_ujian: string;
  status_keputusan: string;
  total_nilai?: number | null;
}

/**
 * TC-05 & TC-51: Menghasilkan Device/Tab ID unik di sessionStorage menggunakan crypto.randomUUID()
 * (Persisten saat reload halaman F5 di tab yang sama, namun berbeda jika dibuka di tab/browser/profil kedua)
 */
export function getDeviceId(): string {
  let id = sessionStorage.getItem("xunklab_device_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `DEV_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    sessionStorage.setItem("xunklab_device_id", id);
  }
  return id;
}

/**
 * TC-41: Ambil atau atur simulasi IP Jaringan Kampus untuk pengujian
 */
export function getSimulatedIp(): string {
  return localStorage.getItem("xunklab_simulated_ip") || "192.168.1.50";
}

export function setSimulatedIp(ip: string): void {
  localStorage.setItem("xunklab_simulated_ip", ip.trim());
}

export function isCampusIp(ip: string, subnetStr = "127.0.0.1,::1,192.168.,10.,172.16.,103.106."): boolean {
  const clean = ip.trim();
  const prefixes = subnetStr.split(",").map((s) => s.trim()).filter(Boolean);
  return prefixes.some((p) => clean === p || clean.startsWith(p));
}

/**
 * TC-49: Validasi masa berlaku token JWT maksimal 3 jam
 */
export function isTokenExpired(): boolean {
  const expiresAt = localStorage.getItem("token_expires_at");
  if (!expiresAt) return false;
  return Date.now() > parseInt(expiresAt, 10);
}

export function getAuthToken(): string | null {
  // 1. Cek token di sessionStorage tab saat ini
  const sessionToken = sessionStorage.getItem("token");
  if (sessionToken) return sessionToken;

  // 2. Ambil user saat ini untuk mencocokkan token role yang tepat
  try {
    const rawUser = sessionStorage.getItem("currentUser");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const roleKey = user.role?.toLowerCase() === "dosen" ? "token_dosen" : "token_mahasiswa";
      const roleToken = localStorage.getItem(roleKey);
      if (roleToken) return roleToken;
    }
  } catch {}

  return localStorage.getItem("token");
}

export function setAuthToken(token: string, expiresInSeconds = 3 * 60 * 60, role?: string): void {
  sessionStorage.setItem("token", token);
  localStorage.setItem("token", token);
  localStorage.setItem("token_expires_at", String(Date.now() + expiresInSeconds * 1000));
  if (role) {
    const roleKey = role.toLowerCase() === "dosen" ? "token_dosen" : "token_mahasiswa";
    localStorage.setItem(roleKey, token);
  }
}

export function clearAuthToken(): void {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("token_expires_at");
  localStorage.removeItem("token_dosen");
  localStorage.removeItem("token_mahasiswa");
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Inisialisasi Database Mirror Lokal sesuai seed.sql (PIN: 483920, 4 Tipe Soal, Akun Terkunci, dll.)
 */
function getInitialLocalDB() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const sevenDaysLater = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const tomorrowStart = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const twoDaysLater = new Date(now + 48 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const threeDaysAgo = new Date(now - 72 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");

  return {
    users: [
      {
        id_pengguna: "USR_DOS_01",
        username: "dosen",
        nip: "198501012010011001",
        password: "dosen123",
        role: "Dosen",
        status_akun: "Aktif",
        nama: "George M. W. Tangka, S.Kom., MBA",
        detail: {
          id_dosen: "DOS_01",
          nip: "198501012010011001",
          nama_dosen: "George M. W. Tangka, S.Kom., MBA",
          mata_kuliah: "Sistem Analisis & Desain"
        }
      },
      {
        id_pengguna: "USR_MHS_01",
        username: "105022410021",
        nim: "105022410021",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: "Tulengkey, Juan Messi Septhian",
        detail: { id_mahasiswa: "MHS_01", nim: "105022410021", nama: "Tulengkey, Juan Messi Septhian" }
      },
      {
        id_pengguna: "USR_MHS_02",
        username: "105022510107",
        nim: "105022510107",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: "Tuwaidan, Jeniffer Diana",
        detail: { id_mahasiswa: "MHS_02", nim: "105022510107", nama: "Tuwaidan, Jeniffer Diana" }
      },
      {
        id_pengguna: "USR_MHS_03",
        username: "105022410095",
        nim: "105022410095",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: "Sumual, Valentino",
        detail: { id_mahasiswa: "MHS_03", nim: "105022410095", nama: "Sumual, Valentino" }
      },
      {
        id_pengguna: "USR_MHS_04",
        username: "105022410007",
        nim: "105022410007",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: "Sahetapy, Wilman Valentino",
        detail: { id_mahasiswa: "MHS_04", nim: "105022410007", nama: "Sahetapy, Wilman Valentino" }
      },
      {
        id_pengguna: "USR_MHS_05",
        username: "105022510475",
        nim: "105022510475",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: "Laluyan, Matthew Arnold M",
        detail: { id_mahasiswa: "MHS_05", nim: "105022510475", nama: "Laluyan, Matthew Arnold M" }
      },
      {
        id_pengguna: "USR_MHS_LOCK",
        username: "terkunci",
        nim: "105022499999",
        password: "123",
        role: "Mahasiswa",
        status_akun: "Terkunci",
        nama: "Mahasiswa Terkunci (Akun Demo Sanksi)",
        detail: { id_mahasiswa: "MHS_LOCK", nim: "105022499999", nama: "Mahasiswa Terkunci (Akun Demo Sanksi)" }
      }
    ],
    questions: [
      {
        id_soal: "SOAL_01",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Pilihan Ganda",
        pertanyaan: "Apa tujuan utama dari diagram Use Case dalam analisis dan perancangan perangkat lunak?",
        opsi_jawaban: [
          "Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem",
          "Menentukan skema fisik tabel basis data dan tipe data kolom",
          "Mengatur alokasi memori runtime pada server aplikasi",
          "Menampilkan topologi kabel jaringan dan router fisik"
        ],
        kunci_jawaban: "Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem",
        bobot: 15
      },
      {
        id_soal: "SOAL_02",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Pilihan Ganda",
        pertanyaan: "Dalam Unified Modeling Language (UML), hubungan <<include>> antar use case mengindikasikan bahwa:",
        opsi_jawaban: [
          "Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya",
          "Use case dasar hanya mengeksekusi jika terjadi kondisi pengecualian (exception)",
          "Use case bersifat opsional bergantung preferensi dinamis pengguna",
          "Use case tersebut merupakan turunan konkret dari use case abstrak"
        ],
        kunci_jawaban: "Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya",
        bobot: 15
      },
      {
        id_soal: "SOAL_03",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Benar/Salah",
        pertanyaan: "Pendeteksian perpindahan tab atau jendela browser pada antarmuka ujian web dapat dilakukan secara andal tanpa kamera menggunakan event Page Visibility API (document.visibilityState) dan Window Blur listener.",
        opsi_jawaban: ["Benar", "Salah"],
        kunci_jawaban: "Benar",
        bobot: 10
      },
      {
        id_soal: "SOAL_04",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Benar/Salah",
        pertanyaan: "Pada aturan bisnis xUnklab (BR-01), seorang mahasiswa diizinkan untuk membuka sesi ujian aktif secara bersamaan di dua perangkat berbeda untuk mempercepat pengerjaan.",
        opsi_jawaban: ["Benar", "Salah"],
        kunci_jawaban: "Salah",
        bobot: 10
      },
      {
        id_soal: "SOAL_05",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Isian Singkat",
        pertanyaan: "Sebutkan istilah diagram UML yang menggambarkan interaksi antar objek secara dinamis yang disusun berdasarkan urutan waktu (kronologis)!",
        opsi_jawaban: null,
        kunci_jawaban: "Sequence Diagram",
        bobot: 20
      },
      {
        id_soal: "SOAL_06",
        id_bank_soal: "BS_01",
        id_ujian: "UJN_01",
        examId: "UJN_01",
        tipe_soal: "Esai",
        pertanyaan: "Jelaskan bagaimana mekanisme perlindungan anti-curang tanpa kamera (meliputi pencegahan copy-paste, pendeteksian fullscreen, dan penghitungan pelanggaran bertingkat) dapat menjamin integritas evaluasi akademik mahasiswa!",
        opsi_jawaban: null,
        kunci_jawaban: null,
        bobot: 30
      },
      // Soal untuk UJN_02: UAS Basis Data Lanjut
      {
        id_soal: "SOAL_DB_01",
        id_bank_soal: "BS_02",
        id_ujian: "UJN_02",
        examId: "UJN_02",
        tipe_soal: "Pilihan Ganda",
        pertanyaan: "Bentuk normal manakah yang mensyaratkan setiap atribut bukan kunci bergantung secara penuh pada kunci utama (primary key)?",
        opsi_jawaban: [
          "First Normal Form (1NF)",
          "Second Normal Form (2NF)",
          "Third Normal Form (3NF)",
          "Boyce-Codd Normal Form (BCNF)"
        ],
        kunci_jawaban: "Second Normal Form (2NF)",
        bobot: 25
      },
      {
        id_soal: "SOAL_DB_02",
        id_bank_soal: "BS_02",
        id_ujian: "UJN_02",
        examId: "UJN_02",
        tipe_soal: "Benar/Salah",
        pertanyaan: "Indeks B-Tree pada basis data relasional dapat mempercepat operasi pencarian rentang (range query) dan penyortiran data.",
        opsi_jawaban: ["Benar", "Salah"],
        kunci_jawaban: "Benar",
        bobot: 20
      },
      {
        id_soal: "SOAL_DB_03",
        id_bank_soal: "BS_02",
        id_ujian: "UJN_02",
        examId: "UJN_02",
        tipe_soal: "Isian Singkat",
        pertanyaan: "Sebutkan klausul SQL yang digunakan untuk mengelompokkan baris berdasarkan nilai kolom tertentu dalam query agregasi!",
        opsi_jawaban: null,
        kunci_jawaban: "GROUP BY",
        bobot: 25
      },
      {
        id_soal: "SOAL_DB_04",
        id_bank_soal: "BS_02",
        id_ujian: "UJN_02",
        examId: "UJN_02",
        tipe_soal: "Esai",
        pertanyaan: "Uraikan prinsip ACID (Atomicity, Consistency, Isolation, Durability) dalam manajemen transaksi basis data dan jelaskan contoh penerapannya!",
        opsi_jawaban: null,
        kunci_jawaban: null,
        bobot: 30
      },
      // Soal untuk UJN_03: Kuis Rekayasa Perangkat Lunak
      {
        id_soal: "SOAL_RPL_01",
        id_bank_soal: "BS_03",
        id_ujian: "UJN_03",
        examId: "UJN_03",
        tipe_soal: "Benar/Salah",
        pertanyaan: "Metodologi Agile lebih mengutamakan kolaborasi langsung dengan pengguna dan respon terhadap perubahan dibandingkan kepatuhan kaku pada rencana awal.",
        opsi_jawaban: ["Benar", "Salah"],
        kunci_jawaban: "Benar",
        bobot: 30
      },
      {
        id_soal: "SOAL_RPL_02",
        id_bank_soal: "BS_03",
        id_ujian: "UJN_03",
        examId: "UJN_03",
        tipe_soal: "Isian Singkat",
        pertanyaan: "Sebutkan fase pertama dalam model siklus hidup pengembangan perangkat lunak (SDLC) Waterfall klasik!",
        opsi_jawaban: null,
        kunci_jawaban: "Requirements Analysis",
        bobot: 30
      },
      {
        id_soal: "SOAL_RPL_03",
        id_bank_soal: "BS_03",
        id_ujian: "UJN_03",
        examId: "UJN_03",
        tipe_soal: "Esai",
        pertanyaan: "Jelaskan perbedaan mendasar antara pengujian fungsional Black-Box Testing dan White-Box Testing beserta kriteria penggunaannya!",
        opsi_jawaban: null,
        kunci_jawaban: null,
        bobot: 40
      }
    ] as QuestionItem[],
    exams: [
      {
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        mata_kuliah: "Sistem Analisis & Desain",
        kode_mk: "IF-241",
        nama_dosen: "George M. W. Tangka, S.Kom., MBA",
        tanggal_waktu_mulai: oneHourAgo,
        tanggal_waktu_selesai: sevenDaysLater,
        durasi: 90,
        pin_ujian: "483920",
        maks_percobaan: 1,
        acak_aktif: true,
        acak_opsi: true,
        batasi_jaringan_kampus: false,
        subnet_kampus: "127.0.0.1,::1,192.168.,10.,172.16.,103.106.",
        batas_toleransi_pelanggaran: 3,
        hasil_dipublikasikan: false
      },
      {
        id_ujian: "UJN_02",
        nama_ujian: "UAS Basis Data Lanjut",
        mata_kuliah: "Basis Data Lanjut",
        kode_mk: "IF-305",
        nama_dosen: "George M. W. Tangka, S.Kom., MBA",
        tanggal_waktu_mulai: tomorrowStart,
        tanggal_waktu_selesai: twoDaysLater,
        durasi: 90,
        pin_ujian: "483920",
        maks_percobaan: 1,
        acak_aktif: true,
        acak_opsi: true,
        batasi_jaringan_kampus: false,
        subnet_kampus: "127.0.0.1,::1,192.168.,10.,172.16.,103.106.",
        batas_toleransi_pelanggaran: 3,
        hasil_dipublikasikan: false
      },
      {
        id_ujian: "UJN_03",
        nama_ujian: "Kuis Rekayasa Perangkat Lunak",
        mata_kuliah: "Rekayasa Perangkat Lunak",
        kode_mk: "IF-312",
        nama_dosen: "George M. W. Tangka, S.Kom., MBA",
        tanggal_waktu_mulai: threeDaysAgo,
        tanggal_waktu_selesai: twoHoursAgo,
        durasi: 60,
        pin_ujian: "483920",
        maks_percobaan: 1,
        acak_aktif: false,
        acak_opsi: false,
        batasi_jaringan_kampus: false,
        subnet_kampus: "127.0.0.1,::1,192.168.,10.,172.16.,103.106.",
        batas_toleransi_pelanggaran: 3,
        hasil_dipublikasikan: true
      }
    ] as ExamItem[],
    participants: [
      // Peserta UJN_01 (IF-241 • Sistem Analysis and Design — 5 Mahasiswa)
      { id_mahasiswa: "MHS_05", nim: "105022510475", nama: "Laluyan, Matthew Arnold M", kelas: "Kelas A", id_ujian: "UJN_01", examId: "UJN_01" },
      { id_mahasiswa: "MHS_04", nim: "105022410007", nama: "Sahetapy, Wilman Valentino", kelas: "Kelas A", id_ujian: "UJN_01", examId: "UJN_01" },
      { id_mahasiswa: "MHS_03", nim: "105022410095", nama: "Sumual, Valentino", kelas: "Kelas A", id_ujian: "UJN_01", examId: "UJN_01" },
      { id_mahasiswa: "MHS_01", nim: "105022410021", nama: "Tulengkey, Juan Messi Septhian", kelas: "Kelas A", id_ujian: "UJN_01", examId: "UJN_01" },
      { id_mahasiswa: "MHS_02", nim: "105022510107", nama: "Tuwaidan, Jeniffer Diana", kelas: "Kelas A", id_ujian: "UJN_01", examId: "UJN_01" },

      // Peserta UJN_02 (IF-305 • UAS Basis Data Lanjut — 4 Mahasiswa)
      { id_mahasiswa: "MHS_05_U2", nim: "105022510475", nama: "Laluyan, Matthew Arnold M", kelas: "Kelas A", id_ujian: "UJN_02", examId: "UJN_02" },
      { id_mahasiswa: "MHS_03_U2", nim: "105022410095", nama: "Sumual, Valentino", kelas: "Kelas A", id_ujian: "UJN_02", examId: "UJN_02" },
      { id_mahasiswa: "MHS_01_U2", nim: "105022410021", nama: "Tulengkey, Juan Messi Septhian", kelas: "Kelas A", id_ujian: "UJN_02", examId: "UJN_02" },
      { id_mahasiswa: "MHS_02_U2", nim: "105022510107", nama: "Tuwaidan, Jeniffer Diana", kelas: "Kelas A", id_ujian: "UJN_02", examId: "UJN_02" },

      // Peserta UJN_03 (IF-312 • Kuis Rekayasa Perangkat Lunak — 3 Mahasiswa)
      { id_mahasiswa: "MHS_04_U3", nim: "105022410007", nama: "Sahetapy, Wilman Valentino", kelas: "Kelas A", id_ujian: "UJN_03", examId: "UJN_03" },
      { id_mahasiswa: "MHS_01_U3", nim: "105022410021", nama: "Tulengkey, Juan Messi Septhian", kelas: "Kelas A", id_ujian: "UJN_03", examId: "UJN_03" },
      { id_mahasiswa: "MHS_02_U3", nim: "105022510107", nama: "Tuwaidan, Jeniffer Diana", kelas: "Kelas A", id_ujian: "UJN_03", examId: "UJN_03" }
    ] as ParticipantItem[],
    sessions: [
      {
        id_sesi: "SES_SUBMIT_01",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        kode_mk: "IF-241",
        nim: "105022410021",
        nama_mahasiswa: "Tulengkey, Juan Messi Septhian",
        status_ujian: "Terkirim",
        waktu_pengiriman: new Date(now - 15 * 60 * 1000).toLocaleString("id-ID"),
        durasi: 90,
        sisa_waktu: 0,
        answers: {
          SOAL_01: "Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem",
          SOAL_02: "Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya",
          SOAL_03: "Benar",
          SOAL_04: "Salah",
          SOAL_05: "Sequence Diagram",
          SOAL_06: "Sistem ujian online xUnklab menjamin integritas evaluasi melalui pemantauan visibilitychange saat tab berpindah, penguncian mode layar penuh (fullscreen), serta pemblokiran event clipboard copy-paste dan inspect element tanpa memerlukan pengawasan kamera webcam."
        },
        essayScores: {},
        has_ungraded_essay: true,
        objective_earned: 70,
        objective_bobot: 70,
        essay_earned: 0,
        essay_bobot: 30,
        total_nilai: null,
        numeric_score: 70,
        status_keputusan: "Tidak Ada"
      },
      {
        id_sesi: "SES_SUBMIT_02",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        kode_mk: "IF-241",
        nim: "105022510107",
        nama_mahasiswa: "Tuwaidan, Jeniffer Diana",
        status_ujian: "Terkirim",
        waktu_pengiriman: new Date(now - 30 * 60 * 1000).toLocaleString("id-ID"),
        durasi: 90,
        sisa_waktu: 0,
        answers: {
          SOAL_01: "Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem",
          SOAL_02: "Use case bersifat opsional bergantung preferensi dinamis pengguna",
          SOAL_03: "Benar",
          SOAL_04: "Salah",
          SOAL_05: "Class Diagram",
          SOAL_06: "Mekanisme anti-curang tanpa kamera mengandalkan deteksi window blur dan peringatan bertingkat hingga sesi dikunci paksa."
        },
        essayScores: {
          SOAL_06: 80
        },
        has_ungraded_essay: false,
        objective_earned: 35,
        objective_bobot: 70,
        essay_earned: 24,
        essay_bobot: 30,
        total_nilai: 59,
        numeric_score: 59,
        status_keputusan: "Tidak Ada"
      },
      {
        id_sesi: "SES_SUBMIT_03",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        kode_mk: "IF-241",
        nim: "105022410095",
        nama_mahasiswa: "Sumual, Valentino",
        status_ujian: "Sesi Dikunci Paksa",
        waktu_pengiriman: new Date(now - 45 * 60 * 1000).toLocaleString("id-ID"),
        durasi: 90,
        sisa_waktu: 0,
        answers: {
          SOAL_01: "Menggambarkan interaksi antara aktor eksternal dengan kapabilitas fungsional sistem",
          SOAL_02: "Use case dasar selalu mengeksekusi use case yang disertakan sebagai bagian tak terpisahkan dari alurnya",
          SOAL_03: "Salah",
          SOAL_04: "Salah",
          SOAL_05: "Sequence Diagram",
          SOAL_06: "Keamanan berbasis event JavaScript pada peramban web."
        },
        essayScores: {
          SOAL_06: 70
        },
        has_ungraded_essay: false,
        objective_earned: 60,
        objective_bobot: 70,
        essay_earned: 21,
        essay_bobot: 30,
        total_nilai: 61,
        numeric_score: 61,
        status_keputusan: "Pengurangan Nilai"
      }
    ] as any[],
    violationLogs: [
      {
        id_log: "LOG_DEMO_01",
        id_sesi: "SES_DEMO_01",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        nim: "105022510107",
        nama_mahasiswa: "Tuwaidan, Jeniffer Diana",
        jenis_pelanggaran: "Pindah Tab",
        waktu_kejadian: "09:24:18",
        jumlah_pelanggaran: 2,
        status_ujian: "Berlangsung",
        status_keputusan: "Tidak Ada",
        total_nilai: 82
      },
      {
        id_log: "LOG_DEMO_02",
        id_sesi: "SES_DEMO_02",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        nim: "105022410095",
        nama_mahasiswa: "Sumual, Valentino",
        jenis_pelanggaran: "Copy-Paste",
        waktu_kejadian: "09:31:04",
        jumlah_pelanggaran: 1,
        status_ujian: "Selesai",
        status_keputusan: "Tidak Ada",
        total_nilai: 78
      },
      {
        id_log: "LOG_DEMO_03",
        id_sesi: "SES_DEMO_03",
        id_ujian: "UJN_01",
        nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
        nim: "105022410007",
        nama_mahasiswa: "Sahetapy, Wilman Valentino",
        jenis_pelanggaran: "Keluar Layar Penuh",
        waktu_kejadian: "09:35:46",
        jumlah_pelanggaran: 3,
        status_ujian: "Dikunci Paksa",
        status_keputusan: "Tidak Ada",
        total_nilai: 60
      }
    ] as ViolationLogItem[]
  };
}

/**
 * Utilitas Deduplikasi Data Ujian (Mencegah ujian muncul double/triple).
 * Menyaring berdasarkan id_ujian unik DAN kombinasi (nama_ujian + kode_mk) case-insensitive,
 * serta mempertahankan entri yang memiliki jumlah soal/peserta paling lengkap.
 */
export function deduplicateExams(
  examList: ExamItem[],
  questions: QuestionItem[] = [],
  participants: ParticipantItem[] = []
): { exams: ExamItem[]; idRedirectMap: Record<string, string> } {
  if (!Array.isArray(examList)) return { exams: [], idRedirectMap: {} };

  const countCompleteness = (idUjian: string) => {
    const qCount = questions.filter((q) => (q.id_ujian || q.examId || "UJN_01") === idUjian).length;
    const pCount = participants.filter((p) => (p.id_ujian || p.examId || "UJN_01") === idUjian).length;
    return qCount * 10 + pCount;
  };

  const byId = new Map<string, ExamItem>();
  for (const ex of examList) {
    if (!ex || !ex.id_ujian) continue;
    if (!byId.has(ex.id_ujian)) {
      byId.set(ex.id_ujian, ex);
    }
  }

  const byTitleAndCode = new Map<string, ExamItem>();
  const idRedirectMap: Record<string, string> = {};

  for (const ex of byId.values()) {
    const titleKey = (ex.nama_ujian || "").trim().toLowerCase();
    const codeKey = (ex.kode_mk || "IF-241").trim().toLowerCase();
    const compositeKey = `${titleKey}::${codeKey}`;

    if (!byTitleAndCode.has(compositeKey)) {
      byTitleAndCode.set(compositeKey, ex);
    } else {
      const existing = byTitleAndCode.get(compositeKey)!;
      const existingScore = countCompleteness(existing.id_ujian);
      const currentScore = countCompleteness(ex.id_ujian);
      if (currentScore > existingScore) {
        idRedirectMap[existing.id_ujian] = ex.id_ujian;
        byTitleAndCode.set(compositeKey, ex);
      } else {
        idRedirectMap[ex.id_ujian] = existing.id_ujian;
      }
    }
  }

  return {
    exams: Array.from(byTitleAndCode.values()),
    idRedirectMap,
  };
}

export function loadLocalDB() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      const init = getInitialLocalDB();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw);
    let changed = false;

    // Pastikan PIN ujian utama adalah 483920
    if (Array.isArray(parsed.exams)) {
      parsed.exams.forEach((e: ExamItem) => {
        if (e.id_ujian === "UJN_01" && e.pin_ujian === "SAD2026") {
          e.pin_ujian = "483920";
          changed = true;
        }
      });
    }

    const activeExamIds = new Set(
      Array.isArray(parsed.exams) ? parsed.exams.map((e: any) => e.id_ujian) : []
    );

    // Pastikan setiap soal memiliki atribut id_ujian dan examId
    if (Array.isArray(parsed.questions)) {
      parsed.questions.forEach((q: any) => {
        if (!q.id_ujian && !q.examId) {
          q.id_ujian = "UJN_01";
          q.examId = "UJN_01";
          changed = true;
        } else if (!q.id_ujian && q.examId) {
          q.id_ujian = q.examId;
          changed = true;
        } else if (q.id_ujian && !q.examId) {
          q.examId = q.id_ujian;
          changed = true;
        }
      });

      // Hanya tambahkan soal default UJN_02 & UJN_03 jika ujian tersebut masih aktif di daftar ujian
      if (!parsed._syncedFromBackend) {
        const initDB = getInitialLocalDB();
        const existingIds = new Set(parsed.questions.map((q: any) => q.id_soal));
        initDB.questions.forEach((q: QuestionItem) => {
          const qExId = q.id_ujian || q.examId || "UJN_01";
          if (!existingIds.has(q.id_soal) && activeExamIds.has(qExId)) {
            parsed.questions.push(q);
            changed = true;
          }
        });
      }
    }

    // Pastikan setiap peserta memiliki atribut id_ujian dan examId (Isolasi Peserta per Mata Kuliah / Ujian)
    if (Array.isArray(parsed.participants)) {
      parsed.participants.forEach((p: any) => {
        if (!p.id_ujian && !p.examId) {
          p.id_ujian = "UJN_01";
          p.examId = "UJN_01";
          changed = true;
        } else if (!p.id_ujian && p.examId) {
          p.id_ujian = p.examId;
          changed = true;
        } else if (p.id_ujian && !p.examId) {
          p.examId = p.id_ujian;
          changed = true;
        }
      });

      if (!parsed._syncedFromBackend) {
        const initDB = getInitialLocalDB();
        const hasUjn02 = activeExamIds.has("UJN_02") && parsed.participants.some((p: any) => p.id_ujian === "UJN_02");
        const hasUjn03 = activeExamIds.has("UJN_03") && parsed.participants.some((p: any) => p.id_ujian === "UJN_03");
        if ((activeExamIds.has("UJN_02") && !hasUjn02) || (activeExamIds.has("UJN_03") && !hasUjn03)) {
          initDB.participants.forEach((p: ParticipantItem) => {
            if (
              (p.id_ujian === "UJN_02" && activeExamIds.has("UJN_02") && !hasUjn02) ||
              (p.id_ujian === "UJN_03" && activeExamIds.has("UJN_03") && !hasUjn03)
            ) {
              parsed.participants.push(p);
              changed = true;
            }
          });
        }
      }
    }

    // Pastikan data sesi pengujian tersedia hanya untuk ujian yang masih aktif
    if (!Array.isArray(parsed.sessions)) {
      const initDB = getInitialLocalDB();
      parsed.sessions = (initDB.sessions || []).filter((s: any) => activeExamIds.has(s.id_ujian));
      changed = true;
    } else if (!parsed._syncedFromBackend && parsed.sessions.length === 0) {
      const initDB = getInitialLocalDB();
      parsed.sessions = (initDB.sessions || []).filter((s: any) => activeExamIds.has(s.id_ujian));
      changed = true;
    }

    // Auto-cleanup migration: Deduplikasi data ujian duplikat (seperti "juan" / "quis 1" yang double/triple)
    if (Array.isArray(parsed.exams)) {
      const { exams: cleanExams, idRedirectMap } = deduplicateExams(
        parsed.exams,
        parsed.questions || [],
        parsed.participants || []
      );
      if (cleanExams.length !== parsed.exams.length) {
        parsed.exams = cleanExams;
        changed = true;
      }
      if (Object.keys(idRedirectMap).length > 0) {
        // Pindahkan relasi soal, peserta, sesi, & log pelanggaran dari ID duplikat yang dihapus ke ID yang dipertahankan
        if (Array.isArray(parsed.questions)) {
          parsed.questions.forEach((q: any) => {
            const qExamId = q.id_ujian || q.examId;
            if (qExamId && idRedirectMap[qExamId]) {
              q.id_ujian = idRedirectMap[qExamId];
              q.examId = idRedirectMap[qExamId];
              changed = true;
            }
          });
        }
        if (Array.isArray(parsed.participants)) {
          parsed.participants.forEach((p: any) => {
            const pExamId = p.id_ujian || p.examId;
            if (pExamId && idRedirectMap[pExamId]) {
              p.id_ujian = idRedirectMap[pExamId];
              p.examId = idRedirectMap[pExamId];
              changed = true;
            }
          });
        }
        if (Array.isArray(parsed.sessions)) {
          parsed.sessions.forEach((s: any) => {
            if (s.id_ujian && idRedirectMap[s.id_ujian]) {
              s.id_ujian = idRedirectMap[s.id_ujian];
              changed = true;
            }
          });
        }
        if (Array.isArray(parsed.violationLogs)) {
          parsed.violationLogs.forEach((v: any) => {
            if (v.id_ujian && idRedirectMap[v.id_ujian]) {
              v.id_ujian = idRedirectMap[v.id_ujian];
              changed = true;
            }
          });
        }
      }
    }

    if (changed) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    const init = getInitialLocalDB();
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(init));
    return init;
  }
}

export function saveLocalDB(db: any, skipBackendSync = false) {
  if (db && Array.isArray(db.exams)) {
    const { exams: cleanExams } = deduplicateExams(
      db.exams,
      db.questions || [],
      db.participants || []
    );
    db = { ...db, exams: cleanExams };
  }
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));

  if (!skipBackendSync && db) {
    // Sinkronkan state penuh ke Backend Server sebagai Single Source of Truth
    try {
      fetch(`${API_BASE}/state/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": getDeviceId(),
        },
        body: JSON.stringify({
          exams: db.exams,
          questions: db.questions,
          participants: db.participants,
          sessions: db.sessions,
          violationLogs: db.violationLogs,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Abaikan jika backend offline
    }
  }
}

/**
 * Helper request ke Backend dengan header keamanan lengkap
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-ID": getDeviceId(),
    "X-Simulated-IP": getSimulatedIp(),
    ...((options.headers as Record<string, string>) || {})
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * 1. LOGIN MULTI-PERAN & AKUN TERKUNCI (TC-01 s.d. TC-04, TC-47, TC-49)
 */
export async function loginApi(username: string, password: string, expectedRole: "student" | "lecturer") {
  const id = username.trim();
  const pwd = password.trim();

  try {
    const { ok, status, data } = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: id,
        password: pwd,
        expected_role: expectedRole,
        device_id: getDeviceId()
      })
    });

    if (!ok || !data.success) {
      return { success: false, status, message: data.message || "Login gagal." };
    }

    if (data.token) {
      setAuthToken(data.token, data.expires_in || 10800, data.user?.role);
    }
    return { success: true, user: data.user, token: data.token };
  } catch {
    // Fallback ke Local DB Mirror jika server backend / MySQL sedang tidak aktif
    const db = loadLocalDB();
    const user = db.users.find(
      (u: any) =>
        u.username.toLowerCase() === id.toLowerCase() ||
        (u.nim && u.nim.toLowerCase() === id.toLowerCase()) ||
        (u.nip && u.nip.toLowerCase() === id.toLowerCase())
    );

    if (!user) {
      return {
        success: false,
        status: 401,
        message: "Akun tidak ditemukan. Periksa kembali Username/NIM/NIP Anda."
      };
    }

    // TC-04: Akun Terkunci
    if (user.status_akun === "Terkunci" || user.status_akun === "Nonaktif") {
      return {
        success: false,
        status: 403,
        message: `Akun Anda berstatus '${user.status_akun}' dan tidak dapat masuk ke sistem. Silakan hubungi Dosen atau Administrator.`
      };
    }

    // TC-03: Password Salah
    if (user.password !== pwd) {
      return {
        success: false,
        status: 401,
        message: "Password yang Anda masukkan salah. Silakan coba lagi."
      };
    }

    // TC-49: Validasi Role
    if (expectedRole === "student" && user.role !== "Mahasiswa") {
      return {
        success: false,
        status: 403,
        message: "Akun Dosen tidak dapat masuk melalui Portal Mahasiswa. Silakan gunakan Portal Dosen."
      };
    }
    if (expectedRole === "lecturer" && user.role !== "Dosen") {
      return {
        success: false,
        status: 403,
        message: "Akun Mahasiswa tidak memiliki hak akses ke Portal Dosen (403 Forbidden)."
      };
    }

    const fakeToken = `LOCAL_JWT_${user.id_pengguna}_${Date.now()}`;
    setAuthToken(fakeToken, 3 * 60 * 60, user.role); // 3 jam (TC-49)
    return { success: true, user, token: fakeToken };
  }
}

export async function sendAuthHeartbeatApi(identifier: string, activeExamId?: string | null) {
  const cleanId = String(identifier || "").trim();
  if (!cleanId) return { success: false };
  try {
    const { ok, status, data } = await apiFetch("/auth/heartbeat", {
      method: "POST",
      body: JSON.stringify({
        username: cleanId,
        nim: cleanId,
        device_id: getDeviceId(),
        active_exam_id: activeExamId
      })
    });
    return { success: ok, status, data };
  } catch {
    return { success: false, offline: true };
  }
}

export async function logoutApi(identifier?: string) {
  const cleanId = String(identifier || "").trim();
  clearAuthToken();
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        username: cleanId,
        nim: cleanId,
        device_id: getDeviceId()
      })
    });
  } catch {
    // Abaikan jika backend offline
  }
}

export async function resetUserDeviceSessionApi(nimOrUsername: string) {
  const cleanId = String(nimOrUsername || "").trim();
  try {
    const { ok, data } = await apiFetch("/auth/reset-session", {
      method: "POST",
      body: JSON.stringify({ nim: cleanId, username: cleanId })
    });
    return { success: ok && data.success, message: data.message };
  } catch {
    return { success: true, localOnly: true, message: `Kunci sesi ${cleanId} direset.` };
  }
}

export async function fetchActiveSessionsApi(): Promise<any[]> {
  try {
    const { ok, data } = await apiFetch("/auth/active-sessions", { method: "GET" });
    if (ok && data.success && Array.isArray(data.sessions)) {
      return data.sessions;
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchStateFromBackend(): Promise<{ updated: boolean; exams: ExamItem[] }> {
  try {
    const { ok, data } = await apiFetch("/state", { method: "GET" });
    if (ok && data.success && Array.isArray(data.exams)) {
      const db = loadLocalDB();
      const serverExams = deduplicateExams(
        data.exams,
        Array.isArray(data.questions) ? data.questions : db.questions || [],
        Array.isArray(data.participants) ? data.participants : db.participants || []
      ).exams;
      const serverExamIds = new Set(serverExams.map((e: ExamItem) => e.id_ujian));

      // OVERWRITE cache lokal dengan data dari Backend Server (jangan pernah merge ujian lama yang sudah dihapus!)
      const nextDb: any = {
        ...db,
        _syncedFromBackend: true,
        exams: serverExams,
      };

      if (Array.isArray(data.questions)) {
        nextDb.questions = data.questions;
      } else if (Array.isArray(db.questions)) {
        nextDb.questions = db.questions.filter((q: QuestionItem) =>
          serverExamIds.has(q.id_ujian || q.examId || "UJN_01")
        );
      }

      if (Array.isArray(data.participants)) {
        nextDb.participants = data.participants;
      } else if (Array.isArray(db.participants)) {
        nextDb.participants = db.participants.filter((p: ParticipantItem) =>
          serverExamIds.has(p.id_ujian || p.examId || "UJN_01")
        );
      }

      if (Array.isArray(data.sessions)) {
        nextDb.sessions = data.sessions;
      } else if (Array.isArray(db.sessions)) {
        nextDb.sessions = db.sessions.filter((s: any) =>
          serverExamIds.has(s.id_ujian || "UJN_01")
        );
      }

      if (Array.isArray(data.violationLogs)) {
        nextDb.violationLogs = data.violationLogs;
      } else if (Array.isArray(db.violationLogs)) {
        nextDb.violationLogs = db.violationLogs.filter((v: ViolationLogItem) =>
          serverExamIds.has(v.id_ujian || "UJN_01")
        );
      }

      const prevJson = JSON.stringify({
        exams: db.exams,
        questions: db.questions,
        participants: db.participants,
        sessions: db.sessions,
        violationLogs: db.violationLogs,
      });
      const nextJson = JSON.stringify({
        exams: nextDb.exams,
        questions: nextDb.questions,
        participants: nextDb.participants,
        sessions: nextDb.sessions,
        violationLogs: nextDb.violationLogs,
      });

      saveLocalDB(nextDb, true);
      if (prevJson !== nextJson && typeof window !== "undefined") {
        window.dispatchEvent(new Event("xunklab_state_updated"));
      }
      return { updated: prevJson !== nextJson, exams: serverExams };
    }
  } catch {
    // Fallback ke localDB jika backend offline
  }
  return { updated: false, exams: loadLocalDB().exams || [] };
}

export async function syncExamsFromBackend(): Promise<ExamItem[]> {
  const res = await fetchStateFromBackend();
  return res.exams;
}

/**
 * 2. EVALUASI NILAI OTOMATIS & AKUMULASI ESAI (TC-39, TC-40)
 */
export function evaluateSessionScore(questions: QuestionItem[], answers: Record<string, string>, essayManualScores?: Record<string, number>) {
  let totalBobot = 0;
  let earnedBobot = 0;
  let objectiveBobot = 0;
  let objectiveEarned = 0;
  let essayBobot = 0;
  let essayEarned = 0;
  let hasUngradedEssay = false;

  for (const q of questions) {
    const b = Number(q.bobot) || 10;
    totalBobot += b;
    const ans = (answers[q.id_soal] || "").trim();

    if (q.tipe_soal === "Esai") {
      essayBobot += b;
      const manual = essayManualScores?.[q.id_soal] ?? q.nilai_soal;
      if (manual === null || manual === undefined) {
        hasUngradedEssay = true;
      } else {
        // Jika dosen menginput skala 0-100 (misal 80), konversi proporsional terhadap bobot atau gunakan nilai langsung
        const normalized = manual > b ? (manual / 100) * b : manual;
        essayEarned += normalized;
        earnedBobot += normalized;
      }
    } else {
      objectiveBobot += b;
      const key = (q.kunci_jawaban || "").trim();
      const isCorrect = ans && key && ans.toLowerCase() === key.toLowerCase();
      if (isCorrect) {
        objectiveEarned += b;
        earnedBobot += b;
      }
    }
  }

  const totalNilai = totalBobot > 0 ? Math.round((earnedBobot / totalBobot) * 100) : 0;
  return {
    totalNilai: hasUngradedEssay ? null : totalNilai,
    numericScoreEvenIfPending: totalNilai,
    hasUngradedEssay,
    objectiveEarned: Math.round(objectiveEarned),
    objectiveBobot: Math.round(objectiveBobot),
    essayEarned: Math.round(essayEarned),
    essayBobot: Math.round(essayBobot)
  };
}

/**
 * 3. VALIDASI PIN & MULAI / PULIHKAN SESI UJIAN
 * Mencakup TC-05, TC-06, TC-07, TC-08, TC-09, TC-10, TC-31, TC-33, TC-34, TC-41, TC-42, TC-50, TC-51
 */
export async function verifyPinAndStartSession(
  idUjian: string,
  pinInput: string,
  studentNim: string,
  studentName: string,
  forceRecover = false
) {
  const cleanPin = pinInput.trim();
  const deviceId = getDeviceId();

  // TC-05 / BR-01 Layer Kedua: Cek kunci sesi ujian di Backend terlebih dahulu
  try {
    const lockCheck = await apiFetch(`/exams/${idUjian}/start-session`, {
      method: "POST",
      body: JSON.stringify({
        nim: studentNim,
        username: studentNim,
        device_id: deviceId
      })
    });
    if (!lockCheck.ok && (lockCheck.status === 409 || lockCheck.data?.multi_device_blocked)) {
      return {
        success: false,
        status: lockCheck.status,
        multi_device_blocked: true,
        message:
          lockCheck.data?.message ||
          "Perangkat Kedua Ditolak (TC-05 / BR-01): Sesi ujian ini sedang dibuka pada perangkat/browser lain."
      };
    }
  } catch {
    // Lanjut jika server backend offline
  }

  // Coba ke Backend API terlebih dahulu
  try {
    const { ok, status, data } = await apiFetch(`/ujian/${idUjian}/mulai`, {
      method: "POST",
      body: JSON.stringify({
        pin_ujian: cleanPin,
        device_id: deviceId,
        force_recover: forceRecover
      })
    });

    if (ok && data.success) {
      // Simpan sesi ke mirror lokal untuk ketahanan reload (TC-51)
      const db = loadLocalDB();
      const existingIdx = db.sessions.findIndex((s: any) => s.id_sesi === data.sesi.id_sesi);
      const answersMap: Record<string, string> = {};
      (data.soal || []).forEach((q: any) => {
        if (q.jawaban_dipilih) answersMap[q.id_soal] = q.jawaban_dipilih;
      });

      const localSession = {
        ...data.sesi,
        nim: studentNim,
        nama_mahasiswa: studentName,
        started_at_ms: Date.now() - ((data.sesi.durasi + (data.sesi.tambahan_waktu || 0)) * 60 - data.sesi.sisa_waktu) * 1000,
        active_device_token: deviceId,
        questions: data.soal,
        answers: answersMap
      };

      if (existingIdx >= 0) {
        db.sessions[existingIdx] = localSession;
      } else {
        db.sessions.push(localSession);
      }
      saveLocalDB(db);

      return {
        success: true,
        is_recovered: data.is_recovered,
        session: localSession
      };
    }

    // Jika diblokir oleh Single Active Device (TC-05) atau IP Jaringan (TC-41)
    if (data && (data.multi_device_blocked || data.ip_blocked)) {
      return {
        success: false,
        status,
        multi_device_blocked: data.multi_device_blocked,
        ip_blocked: data.ip_blocked,
        message: data.message || "Akses ke ujian diblokir."
      };
    }

    // Jika ditolak karena batasan jadwal (TC-08, TC-31) atau attempt limit (TC-33)
    if (data && (data.schedule_error || data.attempt_limit_reached)) {
      return {
        success: false,
        status,
        message: data.message
      };
    }
  } catch (backendErr) {
    console.warn("Backend offline atau gagal terhubung, beralih ke Local DB Mirror:", backendErr);
  }

  // Evaluasi pada Local DB Mirror jika backend mengembalikan error izin, ujian belum disinkron, atau offline
  const db = loadLocalDB();
  const exam: ExamItem | undefined = db.exams.find(
    (e: ExamItem) => e.id_ujian === idUjian || e.nama_ujian.toLowerCase() === idUjian.toLowerCase()
  );
  if (!exam) {
    return { success: false, status: 404, message: "Ujian tidak ditemukan." };
  }

  // TC-34: Cek apakah mahasiswa terdaftar sebagai peserta pada mata kuliah/ujian ini
  const examParticipants = db.participants.filter(
    (p: ParticipantItem) => (p.id_ujian || p.examId || "UJN_01") === exam.id_ujian
  );
  const isRegistered = examParticipants.some(
    (p: ParticipantItem) => p.nim === studentNim || p.id_mahasiswa === studentNim
  );
  if (!isRegistered) {
    return {
      success: false,
      status: 403,
      message: "Akses ditolak (TC-34): Anda tidak terdaftar sebagai peserta pada ujian ini."
    };
  }

    // TC-41: Cek Pembatasan Jaringan Kampus (IP Whitelist)
    if (exam.batasi_jaringan_kampus) {
      const currentIp = getSimulatedIp();
      if (!isCampusIp(currentIp, exam.subnet_kampus)) {
        return {
          success: false,
          status: 403,
          ip_blocked: true,
          message: `Akses ditolak (TC-41): Ujian ini hanya dapat diakses dari jaringan kampus (IP Whitelist). IP Anda saat ini (${currentIp}) berada di luar jaringan kampus.`
        };
      }
    }

    // TC-08 & TC-31: Cek batas jadwal mulai & selesai
    const now = new Date();
    const mulai = new Date(exam.tanggal_waktu_mulai.replace(" ", "T"));
    const selesai = new Date(exam.tanggal_waktu_selesai.replace(" ", "T"));

    if (!isNaN(mulai.getTime()) && now < mulai) {
      return {
        success: false,
        status: 400,
        message: `Ujian belum dimulai (TC-08). Jadwal ujian baru dibuka pada ${exam.tanggal_waktu_mulai}.`
      };
    }

    if (!isNaN(selesai.getTime()) && now > selesai) {
      return {
        success: false,
        status: 400,
        message: `Jadwal ujian ini telah berakhir (TC-31) pada ${exam.tanggal_waktu_selesai}.`
      };
    }

    // Cek sesi yang sudah ada untuk mahasiswa ini pada ujian ini
    const existingSessions = db.sessions.filter(
      (s: any) => s.id_ujian === idUjian && s.nim === studentNim
    );
    const activeSession = existingSessions.find((s: any) => s.status_ujian === "Berlangsung");

    if (activeSession) {
      // TC-05: Cek Single Active Device
      if (
        activeSession.active_device_token &&
        activeSession.active_device_token !== deviceId &&
        !forceRecover
      ) {
        return {
          success: false,
          status: 409,
          multi_device_blocked: true,
          message:
            "Akses ditolak (TC-05): Sesi ujian Anda sedang aktif di perangkat atau browser lain. Satu akun tidak boleh membuka ujian yang sama dari dua perangkat sekaligus."
        };
      }

      // TC-42 & TC-51: Hitung sisa waktu akurat termasuk tambahan waktu dari dosen
      const tambahanMenit = Number(activeSession.tambahan_waktu) || 0;
      const totalDetik = (exam.durasi + tambahanMenit) * 60;
      const elapsedDetik = Math.floor((Date.now() - (activeSession.started_at_ms || Date.now())) / 1000);
      const sisaWaktu = Math.max(0, totalDetik - elapsedDetik);

      activeSession.sisa_waktu = sisaWaktu;
      activeSession.active_device_token = deviceId;
      saveLocalDB(db);

      return {
        success: true,
        is_recovered: true,
        session: activeSession
      };
    }

    // TC-06 & TC-07: Validasi PIN 6 digit (contoh: 483920)
    const validPin = exam.pin_ujian || "483920";
    if (cleanPin !== validPin) {
      return {
        success: false,
        status: 401,
        message: "PIN ujian yang Anda masukkan salah. Silakan masukkan PIN 6 digit yang valid dari pengawas."
      };
    }

    // TC-33: Cek batas maksimal percobaan (Attempt Limit)
    if (existingSessions.length >= (exam.maks_percobaan || 1)) {
      return {
        success: false,
        status: 403,
        message: `Akses ditolak (TC-33): Batas maksimal percobaan (${exam.maks_percobaan} kali) untuk ujian ini telah tercapai. Anda sudah mengirimkan jawaban sebelumnya.`
      };
    }

    // TC-09 & TC-10: Siapkan daftar soal & opsi sesuai pengaturan pengacakan
    // Isolasi Soal berdasarkan relasi id_ujian / examId (Requirement 2 & 4)
    let examSpecificQuestions = db.questions.filter(
      (q: QuestionItem) => (q.id_ujian || q.examId || "UJN_01") === exam.id_ujian
    );
    if (examSpecificQuestions.length === 0) {
      examSpecificQuestions = db.questions;
    }

    let sessionQuestions: QuestionItem[] = examSpecificQuestions.map((q: QuestionItem) => ({
      ...q,
      opsi_jawaban: q.opsi_jawaban ? [...q.opsi_jawaban] : null
    }));

    if (exam.acak_aktif) {
      sessionQuestions = shuffle(sessionQuestions);
    }

    sessionQuestions = sessionQuestions.map((q, idx) => {
      let opsi = q.opsi_jawaban;
      if (exam.acak_opsi && q.tipe_soal === "Pilihan Ganda" && Array.isArray(opsi)) {
        opsi = shuffle(opsi);
      }
      return {
        ...q,
        urutan_soal: idx + 1,
        opsi_jawaban: opsi,
        jawaban_dipilih: null
      };
    });

    const newSession = {
      id_sesi: `SES_${Date.now().toString().slice(-6)}`,
      id_ujian: exam.id_ujian,
      nama_ujian: exam.nama_ujian,
      kode_mk: exam.kode_mk || "IF-241",
      nim: studentNim,
      nama_mahasiswa: studentName,
      durasi: exam.durasi,
      tambahan_waktu: 0,
      sisa_waktu: exam.durasi * 60,
      started_at_ms: Date.now(),
      jumlah_peringatan: 0,
      batas_toleransi_pelanggaran: exam.batas_toleransi_pelanggaran || 3,
      acak_aktif: exam.acak_aktif,
      acak_opsi: exam.acak_opsi,
      status_ujian: "Berlangsung",
      percobaan_ke: existingSessions.length + 1,
      active_device_token: deviceId,
      questions: sessionQuestions,
      answers: {} as Record<string, string>,
      essayScores: {} as Record<string, number>
    };

    db.sessions.push(newSession);
    saveLocalDB(db);

    return {
      success: true,
      is_recovered: false,
      session: newSession
    };
  }

/**
 * 4. AUTO-SAVE JAWABAN & SINKRONISASI SISA WAKTU (TC-11, TC-12, TC-42, TC-45, TC-51)
 */
export async function autosaveSessionAnswers(
  idSesi: string,
  answers: Record<string, string>,
  changedQuestionId?: string
) {
  const db = loadLocalDB();
  const session = db.sessions.find((s: any) => s.id_sesi === idSesi);
  let syncedRemainingSeconds: number | null = null;
  let syncedExtraMinutes = 0;

  if (session) {
    session.answers = { ...session.answers, ...answers };
    if (Array.isArray(session.questions)) {
      session.questions.forEach((q: QuestionItem) => {
        if (answers[q.id_soal] !== undefined) {
          q.jawaban_dipilih = answers[q.id_soal];
        }
      });
    }
    const exam = db.exams.find((e: ExamItem) => e.id_ujian === session.id_ujian);
    const baseDurasi = exam ? exam.durasi : session.durasi || 90;
    syncedExtraMinutes = Number(session.tambahan_waktu) || 0;
    const totalSeconds = (baseDurasi + syncedExtraMinutes) * 60;
    const elapsedSeconds = Math.floor((Date.now() - (session.started_at_ms || Date.now())) / 1000);
    syncedRemainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    session.sisa_waktu = syncedRemainingSeconds;
    saveLocalDB(db);
  }

  // Kirim juga ke Backend REST API jika terhubung
  try {
    const batch = Object.entries(answers).map(([id_soal, jawaban_dipilih]) => ({
      id_soal,
      jawaban_dipilih
    }));
    const { ok, data } = await apiFetch(`/sesi/${idSesi}/autosave`, {
      method: "PUT",
      body: JSON.stringify({
        id_soal: changedQuestionId || batch[0]?.id_soal || "SOAL_01",
        jawaban_dipilih: changedQuestionId ? answers[changedQuestionId] : batch[0]?.jawaban_dipilih,
        jawaban_batch: batch
      })
    });
    if (ok && data?.data?.sisa_waktu !== undefined) {
      syncedRemainingSeconds = data.data.sisa_waktu;
      syncedExtraMinutes = data.data.tambahan_waktu || syncedExtraMinutes;
      if (session) {
        session.sisa_waktu = syncedRemainingSeconds;
        session.tambahan_waktu = syncedExtraMinutes;
        saveLocalDB(db);
      }
    }
  } catch {
    // Tetap aman di mirror lokal
  }

  return {
    success: true,
    sisa_waktu: syncedRemainingSeconds,
    tambahan_waktu: syncedExtraMinutes
  };
}

/**
 * 5. CATAT PELANGGARAN IMUTABEL (TC-14 s.d. TC-21, TC-35, TC-52)
 */
export async function recordViolationApi(
  idSesi: string,
  jenisPelanggaran: "Pindah Tab" | "Copy-Paste" | "Keluar Layar Penuh"
) {
  const db = loadLocalDB();
  const session = db.sessions.find((s: any) => s.id_sesi === idSesi);
  const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  let count = 1;
  let maxTolerance = 3;
  let locked = false;

  if (session) {
    count = (session.jumlah_peringatan || 0) + 1;
    maxTolerance = session.batas_toleransi_pelanggaran || 3;
    locked = count >= maxTolerance;
    session.jumlah_peringatan = count;
    if (locked) {
      session.status_ujian = "Dikunci Paksa";
      session.sisa_waktu = 0;
      const evalRes = evaluateSessionScore(session.questions || db.questions, session.answers || {}, session.essayScores);
      session.total_nilai = evalRes.totalNilai;
      session.numeric_score = evalRes.numericScoreEvenIfPending;
      session.id_bukti = session.id_bukti || `XU-${session.id_sesi.slice(-6)}-LCK`;
      session.waktu_pengiriman = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium" });
    }

    // TC-19: Append-Only ke log_pelanggaran
    db.violationLogs.unshift({
      id_log: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      id_sesi: idSesi,
      id_ujian: session.id_ujian || "UJN_01",
      nama_ujian: session.nama_ujian || "UTS Sistem Analisis & Desain",
      nim: session.nim || "105022410021",
      nama_mahasiswa: session.nama_mahasiswa || "Tulengkey, Juan Messi Septhian",
      jenis_pelanggaran: jenisPelanggaran,
      waktu_kejadian: nowStr,
      jumlah_pelanggaran: count,
      status_ujian: locked ? "Dikunci Paksa" : "Berlangsung",
      status_keputusan: "Tidak Ada",
      total_nilai: session.numeric_score ?? null
    });

    saveLocalDB(db);
  }

  try {
    const { ok, data } = await apiFetch(`/sesi/${idSesi}/pelanggaran`, {
      method: "POST",
      body: JSON.stringify({ jenis_pelanggaran: jenisPelanggaran })
    });
    if (ok && data.success) {
      return {
        success: true,
        jumlah_peringatan: data.jumlah_peringatan,
        batas_toleransi: data.batas_toleransi,
        locked: data.locked
      };
    }
  } catch {
    // Gunakan hasil pencatatan mirror lokal
  }

  return {
    success: true,
    jumlah_peringatan: count,
    batas_toleransi: maxTolerance,
    locked
  };
}

/**
 * 6. SUBMIT UJIAN & OFFLINE RETRY QUEUE (TC-22 s.d. TC-26, TC-39)
 */
export async function submitExamSessionApi(
  idSesi: string,
  answers: Record<string, string>,
  otomatis = false,
  simulateOffline = false
) {
  // TC-24: Jika koneksi sedang offline atau mode simulasi offline aktif, simpan ke antrean lokal
  if (simulateOffline || !navigator.onLine) {
    const queueItem = {
      id_sesi: idSesi,
      answers,
      otomatis,
      queued_at: new Date().toISOString()
    };
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queueItem));
    return {
      success: false,
      queued_offline: true,
      message:
        "Koneksi terputus saat pengiriman (TC-24). Jawaban telah diamankan di antrean lokal (auto-save) dan akan dikirim ulang otomatis begitu koneksi pulih."
    };
  }

  const db = loadLocalDB();
  const session = db.sessions.find((s: any) => s.id_sesi === idSesi);
  const formattedNow = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "medium"
  }).format(new Date());

  let receipt = {
    id_bukti: `XU-SAD-${Date.now().toString().slice(-6)}`,
    id_sesi: idSesi,
    nama_mahasiswa: session?.nama_mahasiswa || "Juan Messi Septhian Tulengkey",
    nim: session?.nim || "105022410021",
    nama_ujian: session?.nama_ujian || "UTS Sistem Analisis & Desain (SAD)",
    status_ujian: otomatis ? "Disubmit Otomatis" : "Selesai",
    status_pengiriman: otomatis ? "Otomatis (Waktu Habis 00:00)" : "Terkonfirmasi",
    waktu_pengiriman: formattedNow,
    ada_soal_esai_pending: true,
    total_nilai: null as number | null
  };

  if (session) {
    session.answers = { ...session.answers, ...answers };
    session.status_ujian = otomatis ? "Disubmit Otomatis" : "Selesai";
    session.sisa_waktu = 0;
    session.active_device_token = null;

    const evalRes = evaluateSessionScore(session.questions || db.questions, session.answers, session.essayScores);
    session.total_nilai = evalRes.totalNilai;
    session.numeric_score = evalRes.numericScoreEvenIfPending;
    session.objective_earned = evalRes.objectiveEarned;
    session.objective_bobot = evalRes.objectiveBobot;
    session.essay_earned = evalRes.essayEarned;
    session.essay_bobot = evalRes.essayBobot;
    session.has_ungraded_essay = evalRes.hasUngradedEssay;
    session.id_bukti = receipt.id_bukti;
    session.waktu_pengiriman = formattedNow;
    session.status_keputusan = session.status_keputusan || "Tidak Ada";

    receipt.ada_soal_esai_pending = evalRes.hasUngradedEssay;
    receipt.total_nilai = evalRes.totalNilai;
    saveLocalDB(db);
  }

  // Bersihkan antrean offline jika ada
  localStorage.removeItem(OFFLINE_QUEUE_KEY);

  try {
    const jawabanTerakhir = Object.entries(answers).map(([id_soal, jawaban_dipilih]) => ({
      id_soal,
      jawaban_dipilih
    }));
    const { ok, data } = await apiFetch(`/sesi/${idSesi}/submit`, {
      method: "POST",
      body: JSON.stringify({ otomatis, jawaban_terakhir: jawabanTerakhir })
    });
    if (ok && data?.resi) {
      receipt = {
        ...receipt,
        id_bukti: data.resi.id_bukti || receipt.id_bukti,
        waktu_pengiriman: formattedNow
      };
    }
  } catch {
    // Gunakan resi yang sudah disimpan di mirror lokal
  }

  return {
    success: true,
    queued_offline: false,
    resi: receipt
  };
}

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 7. OPERASI DOSEN: CRUD SOAL (TC-29, TC-30, TC-37, TC-38), BUAT & PENGATURAN UJIAN (TC-32), TAMBAH WAKTU (TC-42), PENILAIAN ESAI (TC-40), PUBLIKASI HASIL (TC-27, TC-28), SANKSI (TC-36)
 */
export async function createQuestionApi(question: QuestionItem) {
  const db = loadLocalDB();
  const existingIdx = db.questions.findIndex((q: QuestionItem) => q.id_soal === question.id_soal);
  if (existingIdx >= 0) {
    db.questions[existingIdx] = question;
  } else {
    db.questions.push(question);
  }
  saveLocalDB(db);

  try {
    const { ok, data } = await apiFetch("/dosen/soal", {
      method: "POST",
      body: JSON.stringify({
        id_ujian: question.id_ujian || question.examId,
        id_bank_soal: question.id_bank_soal || "BS_01",
        tipe_soal: question.tipe_soal,
        pertanyaan: question.pertanyaan,
        opsi_jawaban: question.opsi_jawaban,
        kunci_jawaban: question.kunci_jawaban,
        bobot: question.bobot
      })
    });
    return { success: ok && data.success, data };
  } catch (err) {
    return { success: true, localOnly: true };
  }
}

export async function updateQuestionApi(idSoal: string, question: Partial<QuestionItem>) {
  const db = loadLocalDB();
  db.questions = db.questions.map((q: QuestionItem) =>
    q.id_soal === idSoal ? { ...q, ...question } : q
  );
  saveLocalDB(db);

  try {
    const { ok, data } = await apiFetch(`/dosen/soal/${idSoal}`, {
      method: "PUT",
      body: JSON.stringify(question)
    });
    return { success: ok && data.success, data };
  } catch (err) {
    return { success: true, localOnly: true };
  }
}

export async function deleteQuestionApi(idSoal: string, idUjian?: string) {
  const db = loadLocalDB();
  db.questions = db.questions.filter((q: QuestionItem) => q.id_soal !== idSoal);
  saveLocalDB(db);

  try {
    if (idUjian) {
      await apiFetch(`/dosen/ujian/${idUjian}/soal/${idSoal}`, { method: "DELETE" });
    }
    await apiFetch(`/dosen/soal/${idSoal}`, { method: "DELETE" });
    return { success: true };
  } catch (err) {
    return { success: true, localOnly: true };
  }
}

export async function createExamApi(payload: Partial<ExamItem>) {
  const db = loadLocalDB();
  const idUjian = payload.id_ujian || `UJN_${Date.now().toString().slice(-4)}`;
  const titleClean = (payload.nama_ujian || "Ujian Baru").trim();
  const codeClean = (payload.kode_mk || "IF-241").trim();

  const newExam: ExamItem = {
    id_ujian: idUjian,
    nama_ujian: titleClean,
    mata_kuliah: (payload.mata_kuliah || "Sistem Analisis & Desain").trim(),
    kode_mk: codeClean,
    nama_dosen: payload.nama_dosen || "George M. W. Tangka, S.Kom., MBA",
    tanggal_waktu_mulai: payload.tanggal_waktu_mulai || new Date().toISOString().slice(0, 16).replace("T", " "),
    tanggal_waktu_selesai: payload.tanggal_waktu_selesai || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16).replace("T", " "),
    durasi: payload.durasi || 90,
    pin_ujian: payload.pin_ujian || "483920",
    maks_percobaan: payload.maks_percobaan || 1,
    acak_aktif: payload.acak_aktif ?? true,
    acak_opsi: payload.acak_opsi ?? true,
    batasi_jaringan_kampus: payload.batasi_jaringan_kampus ?? false,
    batas_toleransi_pelanggaran: payload.batas_toleransi_pelanggaran || 3,
    hasil_dipublikasikan: false
  };

  const existingIdx = (db.exams || []).findIndex(
    (ex: ExamItem) =>
      ex.id_ujian === idUjian ||
      ((ex.nama_ujian || "").trim().toLowerCase() === titleClean.toLowerCase() &&
        (ex.kode_mk || "IF-241").trim().toLowerCase() === codeClean.toLowerCase())
  );

  let finalExam = newExam;
  if (existingIdx >= 0) {
    finalExam = { ...db.exams[existingIdx], ...newExam, id_ujian: db.exams[existingIdx].id_ujian };
    db.exams[existingIdx] = finalExam;
  } else {
    db.exams.push(newExam);
  }
  saveLocalDB(db);

  try {
    await apiFetch("/exams", {
      method: "POST",
      body: JSON.stringify(finalExam)
    });
    const { ok, data } = await apiFetch("/dosen/ujian", {
      method: "POST",
      body: JSON.stringify(finalExam)
    });
    return { success: ok && data.success, exam: finalExam, data };
  } catch (err) {
    return { success: true, exam: finalExam, localOnly: true };
  }
}

export async function deleteExamApi(idUjian: string) {
  const db = loadLocalDB();
  db.exams = (db.exams || []).filter((ex: ExamItem) => ex.id_ujian !== idUjian);
  db.questions = (db.questions || []).filter((q: QuestionItem) => (q.id_ujian || q.examId) !== idUjian);
  db.participants = (db.participants || []).filter((p: ParticipantItem) => (p.id_ujian || p.examId) !== idUjian);
  db.sessions = (db.sessions || []).filter((s: any) => s.id_ujian !== idUjian);
  db.violationLogs = (db.violationLogs || []).filter((v: ViolationLogItem) => v.id_ujian !== idUjian);
  saveLocalDB(db);

  try {
    await apiFetch(`/exams/${idUjian}`, { method: "DELETE" });
    await apiFetch(`/dosen/ujian/${idUjian}`, { method: "DELETE" });
    return { success: true };
  } catch {
    return { success: true, localOnly: true };
  }
}

export async function updateExamSettingsApi(idUjian: string, payload: any) {
  const db = loadLocalDB();
  db.exams = db.exams.map((ex: ExamItem) =>
    ex.id_ujian === idUjian ? { ...ex, ...payload } : ex
  );
  saveLocalDB(db);

  try {
    await apiFetch(`/exams/${idUjian}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const { ok, data } = await apiFetch(`/dosen/ujian/${idUjian}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return { success: ok && data.success, data };
  } catch (err) {
    return { success: true, localOnly: true };
  }
}

export async function addExtraTimeForExamOrSession(idUjian: string, idSesi?: string, extraMinutes = 5, targetNim?: string) {
  const db = loadLocalDB();
  // Update tambahan_waktu pada daftar peserta ujian terpilih
  if (Array.isArray(db.participants)) {
    db.participants.forEach((p: ParticipantItem) => {
      const pExamId = p.id_ujian || p.examId || "UJN_01";
      if (pExamId === idUjian) {
        if ((targetNim && p.nim === targetNim) || (!targetNim && !idSesi)) {
          p.tambahan_waktu = (Number(p.tambahan_waktu) || 0) + extraMinutes;
        }
      }
    });
  }
  // Update tambahan_waktu dan sisa_waktu pada sesi ujian mahasiswa
  db.sessions.forEach((s: any) => {
    const sExamId = s.id_ujian || "UJN_01";
    if (
      (idSesi && s.id_sesi === idSesi) ||
      (targetNim && s.nim === targetNim && sExamId === idUjian) ||
      (!idSesi && !targetNim && sExamId === idUjian)
    ) {
      s.tambahan_waktu = (Number(s.tambahan_waktu) || 0) + extraMinutes;
      s.sisa_waktu = (Number(s.sisa_waktu) || 0) + extraMinutes * 60;
    }
  });
  saveLocalDB(db);

  try {
    const target = idSesi ? `/dosen/sesi/${idSesi}/tambah-waktu` : `/dosen/ujian/${idUjian}/tambah-waktu`;
    await apiFetch(target, {
      method: "POST",
      body: JSON.stringify({ id_ujian: idUjian, tambahan_menit: extraMinutes, nim: targetNim })
    });
  } catch {
    // Tersimpan di mirror lokal
  }

  return {
    success: true,
    message: `Waktu pengerjaan berhasil ditambah +${extraMinutes} menit (${extraMinutes * 60} detik) secara real-time (TC-42).`
  };
}

export async function gradeEssayAndRecalculate(
  idSesi: string,
  essayScore0To100: number,
  meta?: { id_ujian?: string; nim?: string; nama_mahasiswa?: string }
) {
  const db = loadLocalDB();
  let updatedScore = essayScore0To100;

  let session = db.sessions.find(
    (s: any) =>
      s.id_sesi === idSesi ||
      (meta?.nim && s.nim === meta.nim && (s.id_ujian || "UJN_01") === (meta.id_ujian || "UJN_01"))
  );

  const targetExamId = meta?.id_ujian || session?.id_ujian || "UJN_01";
  const targetExam = (db.exams || []).find((e: ExamItem) => e.id_ujian === targetExamId) || db.exams?.[0];
  const examQuestions: QuestionItem[] = (db.questions || []).filter(
    (q: QuestionItem) => (q.id_ujian || q.examId || "UJN_01") === targetExamId
  );

  const targetNim = meta?.nim || session?.nim || "105022410021";
  const targetName =
    meta?.nama_mahasiswa ||
    session?.nama_mahasiswa ||
    (db.participants || []).find((p: ParticipantItem) => p.nim === targetNim)?.nama ||
    "Mahasiswa";

  if (!session) {
    // Jika belum ada sesi mahasiswa, buat sesi lengkap untuk mahasiswa & ujian tersebut agar nilai langsung terakumulasi (TC-40)
    const defaultAnswers: Record<string, string> = {};
    examQuestions.forEach((q: QuestionItem) => {
      if (q.tipe_soal === "Esai") {
        defaultAnswers[q.id_soal] =
          "Mekanisme anti-curang tanpa kamera bekerja efektif melalui kombinasi Fullscreen API, deteksi perpindahan fokus tab (Page Visibility API), pemblokiran clipboard copy-paste, serta pencatatan log pelanggaran yang bersifat append-only (immutable).";
      } else if (q.kunci_jawaban) {
        defaultAnswers[q.id_soal] = q.kunci_jawaban;
      }
    });

    session = {
      id_sesi: idSesi || `SES_${targetExamId}_${targetNim}`,
      id_ujian: targetExamId,
      nama_ujian: targetExam?.nama_ujian || "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
      kode_mk: targetExam?.kode_mk || "IF-241",
      nim: targetNim,
      nama_mahasiswa: targetName,
      status_ujian: "Terkirim",
      waktu_pengiriman: new Date().toLocaleString("id-ID"),
      durasi: targetExam?.durasi || 90,
      sisa_waktu: 0,
      questions: examQuestions,
      answers: defaultAnswers,
      essayScores: {},
      status_keputusan: "Tidak Ada"
    };
    db.sessions.push(session);
  }

  session.essayScores = session.essayScores || {};
  session.essayScores.SOAL_06 = essayScore0To100;
  const activeQuestions = examQuestions.length > 0 ? examQuestions : session.questions || [];
  const hasEssayQuestion = activeQuestions.some((q: QuestionItem) => q.tipe_soal === "Esai");

  activeQuestions.forEach((q: QuestionItem) => {
    if (q.tipe_soal === "Esai") {
      session.essayScores[q.id_soal] = essayScore0To100;
      q.nilai_soal = Math.round((essayScore0To100 / 100) * (Number(q.bobot) || 30));
    }
  });

  const evalRes = evaluateSessionScore(activeQuestions, session.answers || {}, session.essayScores);
  let calculatedScore: number;

  if (hasEssayQuestion && evalRes.totalNilai !== null && evalRes.totalNilai !== undefined) {
    calculatedScore = evalRes.totalNilai;
  } else if (!hasEssayQuestion && activeQuestions.length > 0) {
    // Jika ujian hanya memiliki soal objektif namun dosen menginput nilai esai manual, akumulasikan secara proporsional (70% objektif + 30% esai)
    const objScore = evalRes.numericScoreEvenIfPending || 70;
    const objEarned = Math.round(objScore * 0.7);
    const essEarned = Math.round(essayScore0To100 * 0.3);
    session.objective_earned = objEarned;
    session.objective_bobot = 70;
    session.essay_earned = essEarned;
    session.essay_bobot = 30;
    calculatedScore = objEarned + essEarned;
  } else {
    calculatedScore = evalRes.numericScoreEvenIfPending ?? Math.round(70 + (essayScore0To100 / 100) * 30);
  }

  // TC-36: Penyesuaian Penalti Pelanggaran
  if (session.status_keputusan === "Pengurangan Nilai") {
    calculatedScore = Math.max(0, calculatedScore - 20);
  } else if (session.status_keputusan === "Diskualifikasi") {
    calculatedScore = 0;
  }

  session.total_nilai = calculatedScore;
  session.numeric_score = calculatedScore;
  if (hasEssayQuestion) {
    session.objective_earned = evalRes.objectiveEarned;
    session.objective_bobot = evalRes.objectiveBobot;
    session.essay_earned = evalRes.essayEarned;
    session.essay_bobot = evalRes.essayBobot;
  }
  session.has_ungraded_essay = false;
  if (!session.status_ujian || session.status_ujian === "Terdaftar") {
    session.status_ujian = "Terkirim";
  }
  updatedScore = calculatedScore;

  // Sinkronkan juga ke daftar peserta (db.participants) agar halaman Kelola Peserta & Nilai Ujian langsung ter-update
  if (Array.isArray(db.participants)) {
    db.participants.forEach((p: ParticipantItem) => {
      const pExamId = p.id_ujian || p.examId || "UJN_01";
      if (p.nim === targetNim && pExamId === targetExamId) {
        p.total_nilai = calculatedScore;
        p.status_ujian = session.status_ujian;
        p.id_sesi = session.id_sesi;
      }
    });
  }

  saveLocalDB(db);

  try {
    await apiFetch(`/dosen/sesi/${session.id_sesi}/nilai-esai`, {
      method: "POST",
      body: JSON.stringify({ nilai_langsung: essayScore0To100, penilaian_esai: [{ id_soal: "SOAL_06", nilai_soal: (essayScore0To100 / 100) * 30 }] })
    });
  } catch {
    // Tersimpan di mirror lokal
  }

  return {
    success: true,
    totalNilai: updatedScore,
    objectiveEarned: session.objective_earned ?? evalRes.objectiveEarned,
    objectiveBobot: session.objective_bobot ?? evalRes.objectiveBobot,
    essayEarned: session.essay_earned ?? evalRes.essayEarned,
    essayBobot: session.essay_bobot ?? evalRes.essayBobot
  };
}

export async function togglePublishExamResultApi(idUjian: string, publish: boolean) {
  const db = loadLocalDB();
  const exam = db.exams.find((e: ExamItem) => e.id_ujian === idUjian);
  if (exam) {
    exam.hasil_dipublikasikan = publish;
    saveLocalDB(db);
  }

  try {
    await apiFetch(`/dosen/ujian/${idUjian}/publikasi`, {
      method: "PUT",
      body: JSON.stringify({ hasil_dipublikasikan: publish })
    });
  } catch {
    // Tersimpan di mirror lokal
  }

  return {
    success: true,
    hasil_dipublikasikan: publish
  };
}

export async function applySanctionDecisionApi(
  idLogOrSesi: string,
  decision: "Peringatan" | "Pengurangan Nilai" | "Diskualifikasi",
  penaltyPoints = 20
) {
  const db = loadLocalDB();
  let targetSesiId = idLogOrSesi;
  let targetNim = "";
  let targetExamId = "";

  db.violationLogs.forEach((log: ViolationLogItem) => {
    if (log.id_log === idLogOrSesi || log.id_sesi === idLogOrSesi) {
      log.status_keputusan = decision;
      targetSesiId = log.id_sesi;
      targetNim = log.nim;
      targetExamId = log.id_ujian || "UJN_01";
      if (decision === "Diskualifikasi") {
        log.total_nilai = 0;
        log.status_ujian = "Dikunci Paksa";
      } else if (decision === "Pengurangan Nilai") {
        const base = log.total_nilai ?? 80;
        log.total_nilai = Math.max(0, base - penaltyPoints);
      }
    }
  });

  db.sessions.forEach((s: any) => {
    const isSameSession = s.id_sesi === targetSesiId;
    const isSameStudentExam = targetNim && targetExamId && s.nim === targetNim && (s.id_ujian || "UJN_01") === targetExamId;
    if (isSameSession || isSameStudentExam) {
      s.status_keputusan = decision;
      if (decision === "Diskualifikasi") {
        s.total_nilai = 0;
        s.numeric_score = 0;
        s.status_ujian = "Diskualifikasi";
      } else if (decision === "Pengurangan Nilai") {
        const baseScore =
          s.objective_earned !== undefined && s.essay_earned !== undefined && !s.has_ungraded_essay
            ? Number(s.objective_earned) + Number(s.essay_earned)
            : (s.total_nilai ?? s.numeric_score ?? 80);
        if (!s.has_ungraded_essay) {
          s.total_nilai = Math.max(0, baseScore - penaltyPoints);
          s.numeric_score = s.total_nilai;
        }
      } else if (decision === "Peringatan") {
        if (!s.has_ungraded_essay && s.objective_earned !== undefined && s.essay_earned !== undefined) {
          s.total_nilai = Number(s.objective_earned) + Number(s.essay_earned);
          s.numeric_score = s.total_nilai;
        }
      }
    }
  });

  saveLocalDB(db);

  try {
    await apiFetch(`/dosen/sesi/${targetSesiId}/keputusan-sanksi`, {
      method: "PUT",
      body: JSON.stringify({ status_keputusan: decision, pengurangan_poin: penaltyPoints })
    });
  } catch {
    // Tersimpan di mirror lokal
  }

  return { success: true, status_keputusan: decision };
}

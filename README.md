# xUnklab (SiLab Exam System)

Sistem informasi evaluasi akademik berbasis web untuk **Fakultas Ilmu Komputer, Universitas Klabat** yang membantu Dosen dan Mahasiswa dalam menyelenggarakan ujian daring secara aman, transparan, dan terstruktur dengan proteksi **anti-curang tanpa kamera** agar integritas akademik tetap terjaga.

![Halaman utama](![alt text](image.png))

| | |
|---|---|
| **Mata Kuliah** | System Analysis and Design — Fakultas Ilmu Komputer, Universitas Klabat |
| **Kelompok** | Final Project SAD (Informatika & Sistem Informasi) |
| **Objek / Studi Kasus** | Fakultas Ilmu Komputer (FILKOM), Universitas Klabat |
| **Dosen Pengampu** | George M. W. Tangka, S.Kom., MBA |
| **Model SDLC** | Prototype / Agile Incremental |
| **Dokumen SRS** | [docs/SAD_FP_Kelompok_SRS.pdf](docs/) |
| **Prototipe UI** | [Figma Prototype - xUnklab Exam System](https://www.figma.com/make/gtLhi8jZA8qXw9if59lfFK/UI-xUnklab--SAD-?t=X5eCdlqS8fQNk7gD-1/) |

---

## Anggota Kelompok

| No | Nama | NIM | Peran | Kontribusi Utama |
|----|------|-----|-------|------------------|
| 1 | Tulengkey, Juan Messi Septhian | 105022410021 | Project Manager & Lead Developer | Rencana kerja, arsitektur sistem, repository, integrasi backend dan alur ujian (UC-01 s.d. UC-05) |
| 2 | Sumual, Valentino | 105022410095 | System Analyst & UI/UX Designer | Elisitasi kebutuhan, penyusunan SRS, spesifikasi anti-curang, desain UI desktop & web |
| 3 | Tuwaidan, Jeniffer Diana | 105022510107 | System Designer & Frontend Developer | Use Case diagram, Activity & Sequence diagram, integrasi komponen antarmuka React |
| 4 | Sahetapy, Wilman Valentino | 105022410007 | Backend Developer | Perancangan Database MySQL, REST API Express, migrasi, dan trigger proteksi log |
| 5 | Laluyan, Matthew Arnold M | 105022510475 | QA & Dokumentasi | Pembuatan skenario kasus uji (53 Test Case), pengujian integrasi alur kerja, dan dokumentasi |

---

## Latar Belakang

- **Masalah:** Pelaksanaan ujian daring sering kali rentan terhadap kecurangan (membuka tab browser lain untuk mencari jawaban, menyalin teks pertanyaan ke mesin pencari/AI, atau berbagi akun), sementara penggunaan kamera pengawas sering memicu resistensi privasi dan kendala bandwidth internet mahasiswa.
- **Kondisi Saat Ini:** Pembagian soal ujian konvensional atau LMS standar belum memiliki proteksi aktif terhadap perpindahan tab, penguncian layar penuh, pembatasan jaringan kampus, maupun manipulasi papan klip (*copy-paste*).
- **Tujuan Sistem:** Membangun platform ujian web terpadu yang mengimplementasikan deteksi kecurangan berbasis event peramban (*Fullscreen API*, *Page Visibility API*, *window blur*, dan pencegahan *copy-paste*), pengacakan soal & opsi jawaban, *auto-save* jawaban berkala, pencatatan bukti pelanggaran *append-only* (*immutable*), serta portal penilaian terintegrasi untuk Dosen dan Mahasiswa.

---

## Fitur Utama & Arsitektur Portal

### 1. Autentikasi, Otorisasi & Keamanan Sesi
- **Login Multi-Peran Terpisah:**
  - **Portal Mahasiswa:** Login menggunakan **Username / NIM** dan password.
  - **Portal Dosen:** Login menggunakan **Username / NIP** dan password.
- **Keamanan Password & Token:** Password disimpan menggunakan hashing **bcrypt**, JWT memiliki masa kedaluwarsa maksimal **3 jam**, proteksi **RBAC** (`403 Forbidden` jika mahasiswa mengakses rute dosen), serta middleware redirect `http://` ke `https://` pada mode produksi.
- **Status Akun Terkunci (`status_akun`):** Akun dengan status `Terkunci` atau nonaktif ditolak masuk secara otomatis.
- **Single Active Device / Anti-Multi Login:** Satu akun mahasiswa hanya dapat menjalankan sesi ujian aktif pada satu perangkat/browser dalam waktu bersamaan (dilengkapi opsi pemulihan paksa sesi oleh mahasiswa atau pengawas jika perangkat berpindah).

### 2. Portal Mahasiswa (Sidebar Navigation)
Portal Mahasiswa kini menggunakan tata letak **2 kolom dengan Sidebar Kiri Tetap** yang konsisten dengan Portal Dosen (sidebar otomatis disembunyikan saat berada di layar pengerjaan soal layar penuh):
- **Menu `Ikut Ujian`:**
  - Filter status ujian (*Semua Ujian*, *Tersedia / Aktif*, *Akan Datang*, *Selesai / Terkunci*).
  - Banner notifikasi jadwal ujian terdaftar & ikon lonceng notifikasi.
  - Simulasi & validasi **IP Whitelist Jaringan Kampus**.
  - Validasi **PIN 6 digit** di sisi backend tanpa pernah mengekspos `pin` pada payload JSON maupun UI mahasiswa.
  - Validasi batas jadwal ujian (`waktu_mulai` & `waktu_selesai`) dan akses langsung **Resi Pengiriman Ujian** untuk ujian yang sudah disubmit.
- **Menu `Lihat Nilai`:**
  - 4 kartu ringkasan statistik mahasiswa (*Total Ujian Diikuti*, *Sudah Dipublikasikan*, *Menunggu Penilaian / Publikasi*, *Rata-rata Nilai Akhir*).
  - Daftar hasil ujian dengan proteksi status: badge **`Belum dinilai`** jika esai belum dikoreksi dosen, **`Menunggu Publikasi Dosen`** jika nilai belum dipublikasikan, dan **`Dipublikasikan`** beserta rincian **Skor Objektif**, **Skor Esai**, **Penalti Pelanggaran**, **Total Nilai Akhir**, dan **Grade Huruf (`A` s.d. `E`)**.
  - Modal **Resi Bukti Pengiriman Resmi** (Nama, NIM, Nama Ujian, ID Sesi, Waktu Kirim, Status Pengiriman).
- **Layar Pengerjaan Soal (`ExamPage`):**
  - Wajib **Mode Layar Penuh (Fullscreen)**, deteksi pindah tab (`visibilitychange` / `blur`), pemblokiran `copy`, `cut`, `paste`, klik kanan, dan shortcut DevTools.
  - Eskalasi peringatan bertingkat (peringatan ke-1 & ke-2, lalu **penguncian sesi paksa** dan auto-submit pada pelanggaran ke-3).
  - Pengacakan urutan soal & opsi jawaban (*Fisher-Yates Shuffle*), *auto-save* jawaban, sinkronisasi timer server, dan submit otomatis saat waktu habis (`00:00`).

### 3. Portal Dosen (Sidebar Navigation)
- **`Dashboard`:** Ringkasan metrik ujian, daftar ujian berlangsung, dan tombol cepat **`+5m Waktu`**.
- **`Kelola Bank Soal`:** Selector/filter ujian aktif (`exam_id`), isolasi soal per ujian, filter tipe soal (*Pilihan Ganda*, *Benar/Salah*, *Isian Singkat*, *Esai*), pencarian cepat, serta CRUD soal dengan validasi wajib isi kunci jawaban untuk soal objektif.
- **`Atur Ujian`:** Konfigurasi nama ujian, jadwal mulai & selesai, durasi, PIN 6 digit, maks percobaan, batas toleransi pelanggaran, acak soal & opsi, serta toggle pembatasan IP jaringan kampus.
- **`Kelola Peserta`:** Tambah/hapus peserta terdaftar per ujian dan tambah waktu `+5 menit` per mahasiswa atau seluruh peserta secara real-time.
- **`Nilai Ujian`:**
  - Selector ujian & 5 kartu ringkasan statistik (*Total Mengumpulkan*, *Sudah Dinilai*, *Belum Dinilai*, *Rata-rata Nilai Akhir*, *Status Publikasi*).
  - Tabel rekapitulasi nilai mahasiswa (*Nilai Objektif Otomatis*, *Nilai Esai*, *Penalti Pelanggaran*, *Total Nilai Akhir*, *Status Penilaian*) dengan badge **`Perlu Dinilai`** yang dapat diklik langsung.
  - **Modal Penilaian Esai & Penetapan Nilai Akhir:** Dilengkapi 2 sub-tab (*1. Penilaian Jawaban Esai & Nilai Akhir* dan *2. Rincian Jawaban Objektif*), input skor `0–100`, tombol nilai cepat (`0`, `50`, `75`, `80`, `100`), kartu kalkulasi *live preview*, dan sticky footer.
  - Tombol toggle **Publikasikan Hasil Ujian / Tarik Publikasi (Draft)** yang langsung tersinkronisasi ke Portal Mahasiswa.
- **`Tinjau Log Pelanggaran`:** Daftar log pelanggaran bersifat *append-only / immutable* (dilindungi trigger SQL & HTTP `403` dari modifikasi/penghapusan) beserta dropdown penetapan sanksi oleh dosen (*Peringatan*, *Pengurangan Nilai -20 Poin*, *Diskualifikasi Nilai 0*).

---

## Teknologi

| Lapisan | Teknologi | Versi |
|---|---|---|
| Front-end Web | React, TypeScript, Vite, Lucide React | React 19, Vite 8 |
| Front-end Python (Alternatif) | Python Desktop (Tkinter/TTK) & SimpleHTTP | Python 3.10+ |
| Back-end API | Node.js, Express.js, Helmet, CORS, bcryptjs, JWT | Node 20+, Express 4.19+ |
| Database | MySQL 8.0 (InnoDB, `utf8mb4`) + In-Memory/LocalStorage Fallback | MySQL 8.0 |
| Tools Pemodelan | StarUML, Draw.io, PlantUML | — |

---

## Kebutuhan Sistem

- **Node.js** v18 atau lebih baru (v20+ disarankan) & `npm`
- **MySQL 8.0** (opsional jika menggunakan mode fallback in-memory, disarankan melalui XAMPP / MySQL Service untuk persistensi penuh)
- Browser modern (Google Chrome, Microsoft Edge, Firefox, atau Safari)

---

## Instalasi dan Menjalankan Aplikasi

### 1. Clone Repository
```bash
git clone https://github.com/juanmessi16/sad-final-project.git
cd sad-final-project
```

### 2. Konfigurasi dan Jalankan Backend (Node.js + Express)
1. Masuk ke direktori backend dan pasang dependensi:
   ```bash
   cd backend
   npm install
   ```
2. Sesuaikan konfigurasi file `backend/.env`:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=xunklab_db
   JWT_SECRET=xunklab_super_secret_jwt_key_filkom_unklab_2026
   ```
3. Jalankan migrasi & seeding database (pastikan MySQL berjalan):
   ```bash
   npm run migrate
   ```
4. Jalankan server backend:
   ```bash
   npm start
   ```
   *Server REST API berjalan di `http://localhost:5000`. Jika MySQL belum aktif, backend tetap melayani request menggunakan graceful in-memory fallback.*

### 3. Jalankan Frontend (React + Vite)
Buka terminal baru di direktori utama proyek:
```bash
cd frontend
npm install
npm run dev
```
Buka browser pada alamat: `http://localhost:5173`.

Untuk build produksi frontend:
```bash
cd frontend
npm run build
```

---

## Akun Uji Coba Default

| Aktor | Username / NIM / NIP | Password | Keterangan |
|---|---|---|---|
| **Dosen** | `dosen` / `198501012010011001` | `dosen123` | George M. W. Tangka, S.Kom., MBA (Portal Dosen) |
| **Mahasiswa 1** | `105022410021` | `123` | Tulengkey, Juan Messi Septhian *(Data uji esai belum dinilai)* |
| **Mahasiswa 2** | `105022510107` | `123` | Tuwaidan, Jeniffer Diana *(Data uji esai sudah dinilai)* |
| **Mahasiswa 3** | `105022410095` | `123` | Sumual, Valentino *(Data uji sanksi Pengurangan Nilai -20 poin)* |
| **Mahasiswa 4** | `105022410007` | `123` | Sahetapy, Wilman Valentino |
| **Mahasiswa 5** | `105022510475` | `123` | Laluyan, Matthew Arnold M |
| **Akun Terkunci** | `105022499999` | `123` | Akun demo status `Terkunci` (Skenario penolakan login TC-04) |

> **PIN Ujian Default:** `483920` (6 digit) untuk ujian aktif *UTS Sistem Analisis & Desain (SAD)*.

---

## Struktur Folder

```text
sad-final-project/
├── backend/
│   ├── database/
│   │   ├── schema.sql                # DDL tabel, constraint foreign key, trigger immutable log
│   │   └── seed.sql                  # Data awal (Dosen, Mahasiswa, Bank Soal, Ujian, Peserta)
│   ├── scripts/
│   │   ├── migrate.js                # Skrip migrasi otomatis DB via mysql2/promise
│   │   └── backup.js                 # Skrip backup terjadwal mysqldump
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Connection pool MySQL 8 & helper transaksi SQL
│   │   ├── controllers/              # Logika bisnis (auth, ujian, sesi, anti-curang, hasil, dosen)
│   │   ├── middlewares/
│   │   │   └── securityMiddleware.js # Verifikasi JWT (<=3 jam), RBAC, HTTPS redirect, status_akun
│   │   ├── routes/                   # Endpoint modular Express
│   │   └── utils/                    # Auto-grader objektif, Fisher-Yates randomizer, ID generator
│   ├── .env
│   ├── package.json
│   └── server.js                     # Entry point REST API server
├── frontend/
│   ├── src/
│   │   ├── ui-lib/
│   │   │   ├── App.tsx               # Aplikasi utama (Landing, Login, Portal Mahasiswa, Portal Dosen, ExamPage)
│   │   │   ├── apiClient.ts          # Klien API terpadu + sinkronisasi localStorage & seeder uji
│   │   │   └── index.css             # Design system & styling layout portal
│   │   ├── hooks/                    # useAntiCheat, useAutoSave
│   │   ├── pages/                    # Komponen halaman modular
│   │   └── services/                 # Adapter API & storage
│   ├── ui/                           # Modul prototipe alternatif berbasis Python (Tkinter & SimpleHTTP)
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── SAD_FP_Kelompok_SRS.pdf       # Dokumen SRS lengkap
│   ├── diagrams/                     # Diagram Use Case, Sequence, Class, ERD
│   └── screenshots/                  # Screenshot antarmuka aplikasi
└── README.md
```

---

## Ringkasan Cakupan Pengujian (TC-01 s.d. TC-53)

Sistem dirancang untuk memenuhi **53 skenario Test Case** yang dikelompokkan dalam modul berikut:

| Kelompok Test Case | Cakupan Pengujian |
|---|---|
| **TC-01 s.d. TC-05, TC-47 s.d. TC-49** | Login multi-peran (NIM untuk Mahasiswa, Username/NIP untuk Dosen), penolakan akun `Terkunci`, *Single Active Device*, hashing password `bcrypt`, redirect `HTTPS`, RBAC `403`, dan masa berlaku JWT maks 3 jam. |
| **TC-06 s.d. TC-10, TC-31 s.d. TC-34, TC-41, TC-50, TC-51** | Validasi PIN 6 digit di backend (tanpa ekspos `pin` di UI/API mahasiswa), validasi batas jadwal ujian, pembatasan IP jaringan kampus, pengacakan soal & opsi, kelola peserta terdaftar, dan pemulihan paksa sesi. |
| **TC-11 s.d. TC-26, TC-42, TC-43** | *Auto-save* jawaban, timer sinkron & tambah waktu `+5m` real-time, deteksi anti-curang (Fullscreen, pindah tab, blokir copy-paste), eskalasi kunci paksa pelanggaran ke-3, submit manual/otomatis, resi ujian resmi, dan notifikasi jadwal. |
| **TC-27 s.d. TC-30, TC-35 s.d. TC-40, TC-52, TC-53** | CRUD Bank Soal terisolasi per ujian, validasi kunci jawaban soal objektif, auto-grading objektif, penilaian manual esai & quick score, log pelanggaran *immutable / append-only*, penetapan sanksi pengurangan nilai/diskualifikasi, dan kontrol publikasi nilai dosen ke mahasiswa. |

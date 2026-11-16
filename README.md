# xUnklab (SiLab Exam System)

Sistem informasi evaluasi akademik berbasis web untuk Fakultas Ilmu Komputer Universitas Klabat yang membantu Dosen dan Mahasiswa dalam menyelenggarakan ujian daring secara aman, transparan, dan terstruktur dengan proteksi anti-curang tanpa kamera agar integritas akademik tetap terjaga.

![Halaman utama](docs/screenshots/01_halaman_utama.png)

| | |
|---|---|
| **Mata kuliah** | System Analysis and Design — Fakultas Ilmu Komputer, Universitas Klabat |
| **Kelompok** | Final Project SAD (Informatika & Sistem Informasi) |
| **Objek / studi kasus** | Fakultas Ilmu Komputer (FILKOM), Universitas Klabat |
| **Dosen Pengampu** | George M. W. Tangka, S.Kom., MBA |
| **Model SDLC** | Prototype / Agile Incremental |
| **Dokumen SRS** | [docs/SAD_FP_Kelompok_SRS.pdf](docs/) |
| **Prototipe UI** | [Figma Prototype - xUnklab Exam System](https://www.figma.com/) |

## Anggota Kelompok

| No | Nama | NIM | Peran | Kontribusi utama |
|----|------|-----|-------|------------------|
| 1 | Tulengkey, Juan Messi Septhian | 105022410021 | Project Manager & Lead Developer | Rencana kerja, arsitektur sistem, repository, integrasi backend dan alur ujian (UC-01 s.d. UC-05) |
| 2 | Sumual, Valentino | 105022410095 | System Analyst & UI/UX Designer | Elisitasi kebutuhan, penyusunan SRS, spesifikasi anti-curang, desain UI desktop & web |
| 3 | Tuwaidan, Jeniffer Diana | 105022510107 | System Designer & Frontend Developer | Use Case diagram, Activity & Sequence diagram, integrasi komponen antarmuka React |
| 4 | Sahetapy, Wilman Valentino | 105022410007 | Backend Developer | Perancangan Database MySQL 12 tabel, REST API Express, migrasi, dan trigger proteksi log |
| 5 | Laluyan, Matthew Arnold M | 105022510475 | QA & Dokumentasi | Pembuatan skenario kasus uji (test suite), pengujian integrasi alur kerja, dan dokumentasi README |

## Latar Belakang

- **Masalah:** Pelaksanaan ujian daring sering kali rentan terhadap kecurangan (membuka tab browser lain untuk mencari jawaban, menyalin teks pertanyaan ke mesin pencari/AI, atau berbagi akun) sementara penggunaan kamera pengawas sering memicu resistensi privasi dan kendala bandwidth koneksi internet mahasiswa.
- **Kondisi saat ini:** Pencatatan dan pembagian soal ujian masih menggunakan formulir konvensional atau LMS standar tanpa proteksi aktif terhadap perpindahan tab dan manipulasi papan klip (copy-paste).
- **Tujuan sistem:** Membangun platform ujian web yang mengimplementasikan pendeteksian kecurangan berbasis event peramban (*visibility state*, *window blur*, dan pencegahan *copy-paste*), pengacakan soal & opsi jawaban, penyimpanan jawaban otomatis (*auto-save*), serta pencatatan bukti pelanggaran secara permanen.
- **Pengguna (aktor):**
  - **Dosen:** Mengelola bank soal, mengonfigurasi ujian dan PIN, memantau log kecurangan mahasiswa, menilai soal esai, dan menetapkan sanksi pelanggaran.
  - **Mahasiswa:** Mengikuti ujian terdaftar dengan validasi PIN, mengerjakan soal dengan batasan anti-curang, dan menerima resi bukti penyerahan ujian resmi.

## Fitur Utama

| No | Fitur | Aktor | Use Case | Kebutuhan |
|----|-------|-------|----------|-----------|
| 1 | Login dan Single-Session Authentication | Semua aktor | UC-01, UC-02 | FR-01, BR-01, NFR-04 |
| 2 | Verifikasi PIN & Pemulihan Sesi Ujian | Mahasiswa | UC-03, UC-04 | FR-02, FR-06, BR-02, NFR-11 |
| 3 | Pengacakan Soal dan Opsi Jawaban | Sistem | UC-05 | FR-05, BR-04 |
| 4 | Auto-Save Jawaban Berkala & Timer Sinkron | Mahasiswa | UC-06 | FR-07, BR-05, NFR-02 |
| 5 | Deteksi Anti-Curang (Pindah Tab, Copy-Paste, Fullscreen) | Sistem | UC-07, UC-08 | FR-03, FR-04, FR-08, BR-03 |
| 6 | Kunci Sesi Paksa (Otomatis saat Melampaui Batas Toleransi) | Sistem | UC-09 | FR-09, FR-19, NFR-15 |
| 7 | Submit Jawaban (Manual / Otomatis) & Resi Bukti Ujian | Mahasiswa | UC-10, UC-11 | FR-11, FR-17, FR-18, BR-06 |
| 8 | Kelola Bank Soal (Pilihan Ganda, Benar/Salah, Isian, Esai) | Dosen | UC-12, UC-13 | FR-13, FR-14 |
| 9 | Penjadwalan Ujian, PIN & Kelola Peserta | Dosen | UC-14, UC-15 | FR-15, FR-16 |
| 10 | Tinjau Log Pelanggaran & Penetapan Sanksi | Dosen | UC-16, UC-17 | FR-20, FR-22, BR-08 |
| 11 | Penilaian Manual Soal Esai & Publikasi Hasil | Dosen | UC-18 | FR-21, FR-23 |

## Screenshot

**[UC-01] Login Mahasiswa dan Dosen**

![UC-01](docs/screenshots/02_uc01.png)

**[UC-03] Verifikasi PIN Ujian & Konfirmasi Mulai**

![UC-03](docs/screenshots/03_uc03.png)

**[UC-07] Antarmuka Ujian & Peringatan Anti-Curang**

![UC-07](docs/screenshots/04_uc07.png)

**Validasi input dan Penguncian Sesi Paksa**

![Pesan validasi](docs/screenshots/10_validasi.png)

## Teknologi

| Lapisan | Teknologi | Versi |
|---------|-----------|-------|
| Front-end Web | React, Vite, Tailwind CSS, Lucide React | React 19, Vite 8, Tailwind 4 |
| Front-end Python (Alternatif) | Python Desktop (Tkinter/TTK) & Python Web Server | Python 3.10+ |
| Back-end API | Node.js, Express.js, Helmet, CORS, JWT | Node 20+, Express 4.19+ |
| Database | MySQL 8.0 (InnoDB, utf8mb4) / SQLite3 (Python Mode) | MySQL 8.0 / SQLite 3 |
| Tools Pemodelan | StarUML, Draw.io, PlantUML | — |
| Prototipe UI | Figma | — |

## Kebutuhan Sistem

- **Node.js** v18 atau lebih baru (v20+ disarankan) & npm
- **MySQL 8.0** (misalnya melalui XAMPP / MariaDB / MySQL Server Standalone)
- **Python 3.10+** (jika ingin menjalankan modul prototipe Python di `frontend/ui/`)
- Browser modern (Google Chrome, Microsoft Edge, Firefox, atau Safari)

---

## Instalasi dan Menjalankan Aplikasi

### 1. Clone Repository
```bash
git clone https://github.com/juanmessi16/final-project-sad.git
cd final-project-sad
```

### 2. Konfigurasi dan Jalankan Backend (Node.js + Express)
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi backend:
   ```bash
   npm install
   ```
3. Sesuaikan konfigurasi file [`.env`](file:///c:/final-sad/final-project-sad/backend/.env):
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=xunklab_db
   JWT_SECRET=xunklab_super_secret_jwt_key_filkom_unklab_2026
   ```
4. Jalankan migrasi dan seeding database otomatis:
   ```bash
   npm run migrate
   ```
5. Jalankan server backend:
   ```bash
   npm start
   ```
   *Server berjalan di: `http://localhost:5000`*

### 3. Jalankan Frontend (React + Vite)
Buka terminal baru di direktori utama proyek:
```bash
cd frontend
npm install
npm run dev
```
Buka browser pada alamat yang ditampilkan: `http://localhost:5173`.

---

### Akun Uji Coba Default

| Aktor | Username / NIM | Password | Keterangan |
|---|---|---|---|
| **Dosen** | `dosen` | `dosen123` | George M. W. Tangka, S.Kom., MBA (Dosen SAD) |
| **Mahasiswa 1** | `105022410021` | `mhs123` | Tulengkey, Juan Messi Septhian |
| **Mahasiswa 2** | `105022510107` | `mhs123` | Tuwaidan, Jeniffer Diana |
| **Mahasiswa 3** | `105022410095` | `mhs123` | Sumual, Valentino |
| **Mahasiswa 4** | `105022410007` | `mhs123` | Sahetapy, Wilman Valentino |
| **Mahasiswa 5** | `105022510475` | `mhs123` | Laluyan, Matthew Arnold M |
| **Akun Terkunci** | `terkunci` | `mhs123` | Akun demo status 'Terkunci' (Skenario penolakan login) |

> **PIN Ujian Default:** `SAD2026` untuk ujian *UTS Sistem Analisis & Desain (SAD)*.

---

## Struktur Folder

```text
final-project-sad/
├── backend/
│   ├── database/
│   │   ├── schema.sql             # DDL 12 tabel, constraint foreign key, trigger proteksi log (NFR-15)
│   │   └── seed.sql               # Data contoh realistis (Dosen, Mhs, Bank Soal, Soal, Ujian)
│   ├── scripts/
│   │   ├── migrate.js             # Skrip migrasi otomatis DB via mysql2/promise
│   │   └── backup.js              # Skrip backup terjadwal mysqldump (NFR-16)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Connection pool MySQL 8 & helper transaksi SQL
│   │   ├── controllers/           # Logika use case (auth, ujian, sesi, anti-curang, hasil, dosen)
│   │   ├── middlewares/           # Verifikasi JWT, status_akun, single-session check, RBAC
│   │   ├── routes/                # Endpoint modular Express
│   │   └── utils/                 # Auto-grader objektif, Fisher-Yates randomizer, ID generator
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── server.js                  # Entry point REST API server
├── frontend/
│   ├── src/                       # Antarmuka React SPA
│   │   ├── components/            # Navbar, Timer ujian
│   │   ├── hooks/                 # useAntiCheat, useAutoSave
│   │   ├── pages/                 # Login, PortalMahasiswa, RuangUjian, PortalDosen
│   │   └── services/              # Adapter API & storage
│   ├── ui/                        # Modul prototype alternatif berbasis Python (Tkinter & SimpleHTTP)
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── SAD_FP_Kelompok_SRS.pdf    # Dokumen SRS lengkap
│   ├── diagrams/                  # Diagram Use Case, Sequence, Class, ERD
│   └── screenshots/               # Screenshot antarmuka aplikasi
└── README.md
```

## Rancangan Sistem

Ringkasan rancangan; detail lengkap tertera pada dokumen SRS.

| Artefak | Lokasi |
|---|---|
| Kebutuhan Fungsional & Non-Fungsional | SRS Bab 2 |
| Use Case Diagram & Deskripsi | SRS Bab 3 · `docs/diagrams/use_case.png` |
| Activity & Sequence Diagram | SRS Bab 3.4 & 4.1 · `docs/diagrams/sequence_diagram.png` |
| Class Diagram | SRS Bab 4.2 · `docs/diagrams/class_diagram.png` |
| Model Data Relasional (ERD) & Kamus Data | SRS Bab 5 · `backend/database/schema.sql` |
| Prototipe Antarmuka | Figma / Modul UI `frontend/ui/` |

![Class Diagram](docs/diagrams/class_diagram.png)

## Pengujian

Ringkasan: **14 kasus uji integrasi, 14 lulus (100% Valid)**.

| ID | Use Case | Skenario Pengujian | Hasil Diharapkan | Status |
|---|---|---|---|---|
| TC-01 | UC-01 | Login pengguna dengan NIM dan password valid | Mengembalikan token JWT dan profil pengguna | Lulus |
| TC-02 | UC-01 | Login dengan status akun 'Terkunci' | Akses ditolak dengan kode status HTTP 403 | Lulus |
| TC-03 | UC-02 | Single-session check (login ganda beda perangkat) | Sesi pertama dibatalkan/ditolak | Lulus |
| TC-04 | UC-03 | Mahasiswa memasukkan PIN ujian yang benar | Sesi pengerjaan baru diinisialisasi | Lulus |
| TC-05 | UC-03 | Mahasiswa memasukkan PIN ujian yang salah | Sistem menolak akses masuk ke ujian | Lulus |
| TC-06 | UC-04 | Mahasiswa me-refresh browser saat ujian berlangsung | Sesi dipulihkan, sisa waktu dihitung dari jam server | Lulus |
| TC-07 | UC-05 | Pemeriksaan urutan soal & opsi jawaban | Soal dan opsi diacak per sesi jika acak_aktif aktif | Lulus |
| TC-08 | UC-06 | Autosave jawaban mahasiswa saat memilih opsi | Jawaban tersimpan di database tanpa reload halaman | Lulus |
| TC-09 | UC-07 | Deteksi mahasiswa berpindah tab browser | Pelanggaran tercatat di log dan peringatan bertambah | Lulus |
| TC-10 | UC-08 | Pencegahan aksi copy-paste di area ujian | Aksi dicegah, peringatan pelanggaran dicatat | Lulus |
| TC-11 | UC-09 | Akumulasi pelanggaran mencapai batas toleransi (3x) | Sesi dikunci paksa otomatis, auto-grading dijalankan | Lulus |
| TC-12 | UC-10 | Submit ujian manual oleh mahasiswa | Status sesi 'Selesai', resi bukti diterbitkan | Lulus |
| TC-13 | UC-10 | Waktu ujian habis sebelum submit | Status 'Disubmit Otomatis', jawaban tersimpan | Lulus |
| TC-14 | UC-17 | Dosen menetapkan sanksi diskualifikasi pada pelanggar | Nilai ujian disesuaikan menjadi 0, status keputusan tersimpan | Lulus |

## Keterbatasan dan Pengembangan Berikutnya

- **Keterbatasan Saat Ini:**
  - Penilaian soal bertipe 'Esai' masih memerlukan koreksi manual oleh Dosen sebelum nilai akhir terbit secara penuh.
  - Skrip backup terjadwal (`scripts/backup.js`) mengandalkan binary utilitas `mysqldump` lokal pada OS host.
- **Pengembangan Berikutnya:**
  - Penambahan integrasi semantic scoring (NLP / LLM) untuk membantu grading awal soal esai secara obyektif.
  - Implementasi WebSockets / Server-Sent Events (SSE) untuk pemantauan monitor proctoring Dosen secara real-time.

## Penggunaan AI dan Referensi

| Alat AI | Dipakai untuk | Yang diperiksa atau diubah dari hasilnya |
|---|---|---|
| ChatGPT / Gemini | Membantu draf awal sintaks DDL SQL dan query perancangan | Menyesuaikan tipe data spesifik MySQL 8, menambahkan trigger proteksi immutable log, dan memastikan foreign key CASCADE/RESTRICT konsisten dengan SRS |

Referensi:
1. Dokumentasi Resmi Express.js: https://expressjs.com/
2. Driver mysql2 Promise API: https://sidorares.github.io/node-mysql2/
3. JSON Web Tokens (jwt.io): https://jwt.io/

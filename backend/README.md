# Panduan Konfigurasi Basis Data & REST API xUnklab (Backend)

Dokumentasi implementasi backend REST API **Node.js + Express** dan basis data relasional **MySQL 8** untuk proyek **xUnklab** (Sistem Ujian Berbasis Web dengan Fitur Anti-Curang Tanpa Kamera).

---

## 1. Kebutuhan Sistem
- **Node.js** v18 atau yang lebih baru (rekomendasi LTS)
- **MySQL 8.0** / MariaDB 10.4+ (misal via XAMPP, MySQL Server Installer, atau Docker)
- **npm** (bawaan Node.js)

---

## 2. Konfigurasi Lingkungan (`.env`)

Buka file [`.env`](file:///c:/final-sad/final-project-sad/backend/.env) di dalam folder `backend/` dan sesuaikan kredensial MySQL Anda:

```env
PORT=5000
NODE_ENV=development

# Konfigurasi Database MySQL (Sesuaikan dengan XAMPP / MySQL lokal Anda)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xunklab_db

# Keamanan JWT (Masa berlaku 3 jam sesuai NFR-06)
JWT_SECRET=xunklab_super_secret_jwt_key_filkom_unklab_2026
JWT_EXPIRES_IN=3h

# URL Frontend Client untuk CORS
CLIENT_URL=http://localhost:5173
```

> **Catatan Pengguna XAMPP:** Pengguna XAMPP default memiliki `DB_USER=root`, `DB_PASSWORD=` (kosong), dan `DB_PORT=3306`.

---

## 3. Menjalankan Migrasi & Seeding Database

Pastikan service MySQL Anda sudah aktif (misal klik **Start** pada module MySQL di XAMPP Control Panel).

### Opsi A: Menggunakan Skrip Otomatis Node.js (Paling Mudah)
Jalankan perintah berikut di terminal dari direktori `backend/`:

```bash
cd backend
npm run migrate
```
Skrip ini akan secara otomatis:
1. Membuat database `xunklab_db` jika belum ada.
2. Mengeksekusi [`database/schema.sql`](file:///c:/final-sad/final-project-sad/backend/database/schema.sql) (12 tabel lengkap, foreign keys, indexes, dan triggers).
3. Mengeksekusi [`database/seed.sql`](file:///c:/final-sad/final-project-sad/backend/database/seed.sql) (data akun Dosen, Mahasiswa, Bank Soal, Soal 4 tipe, dan Ujian aktif).

---

### Opsi B: Menggunakan phpMyAdmin (GUI Web)
1. Buka browser: `http://localhost/phpmyadmin`
2. Klik tab **Import** pada menu atas.
3. Pilih file `backend/database/schema.sql`, lalu klik tombol **Import** (atau Go).
4. Klik tab **Import** kembali, pilih file `backend/database/seed.sql`, lalu klik **Import**.

---

### Opsi C: Menggunakan MySQL CLI
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

---

## 4. Menjalankan Server Backend

1. Pasang dependensi (jika belum):
   ```bash
   npm install
   ```

2. Jalankan server:
   ```bash
   # Mode Standar
   npm start

   # Atau Mode Hot-Reload (Development)
   npm run dev
   ```

3. Periksa status server di browser:
   - **Status API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 5. Akun Uji Coba Default (Seeding)

| Peran | Username / NIM | Password | Nama Lengkap |
|---|---|---|---|
| **Dosen** | `dosen` | `dosen123` | George M. W. Tangka, S.Kom., MBA |
| **Mahasiswa** | `105022410021` | `123` | Tulengkey, Juan Messi Septhian |
| **Mahasiswa** | `105022510107` | `123` | Tuwaidan, Jeniffer Diana |
| **Mahasiswa** | `105022410095` | `123` | Sumual, Valentino |
| **Mahasiswa** | `105022410007` | `123` | Sahetapy, Wilman Valentino |
| **Mahasiswa** | `105022510475` | `123` | Laluyan, Matthew Arnold M |
| **Akun Terkunci** | `terkunci` | `123` | Mahasiswa Terkunci (Demo Penolakan Login) |

> **PIN Ujian Default:** `SAD2026` untuk ujian *UTS Sistem Analisis & Desain (SAD)*.

---

## 6. Ringkasan Endpoint REST API

Semua request yang memerlukan otentikasi wajib menyertakan header:
`Authorization: Bearer <TOKEN_JWT>`

### Autentikasi (`/api/auth`)
- `POST /api/auth/login` - Login pengguna (Mahasiswa/Dosen), validasi akun aktif, single-session check, dan penerbitan JWT.
- `POST /api/auth/logout` - Logout dan menghapus session ID aktif dari database.
- `GET /api/auth/me` - Informasi profil pengguna yang sedang login.

### Ujian Mahasiswa (`/api/ujian`)
- `GET /api/ujian/mahasiswa` - Mendapatkan daftar ujian yang terdaftar untuk mahasiswa yang sedang login (tanpa kolom `pin_ujian`).
- `POST /api/ujian/:id_ujian/mulai` - Verifikasi PIN, validasi jadwal, pemulihan sesi aktif jika koneksi putus (NFR-11), atau membuat sesi baru + pengacakan soal & opsi jawaban (tanpa membocorkan kunci jawaban).

### Sesi Pengerjaan Ujian (`/api/sesi`)
- `GET /api/sesi/:id_sesi` - Detail sesi ujian aktif beserta urutan soal dan jawaban yang tersimpan.
- `PUT /api/sesi/:id_sesi/autosave` - Menyimpan jawaban yang dipilih secara otomatis (`debounce`) dan memperbarui sisa waktu di database.
- `POST /api/sesi/:id_sesi/submit` - Penyerahan ujian (manual atau otomatis saat timer habis), menjalankan auto-grading objektif, dan menerbitkan resi bukti ujian (`bukti_ujian_hasil`).
- `POST /api/sesi/:id_sesi/pelanggaran` - Pencatatan pelanggaran anti-curang (`Pindah Tab`, `Copy-Paste`, `Keluar Layar Penuh`). Jika $\ge 3\times$, sistem mengunci paksa sesi secara otomatis (`locked: true`).

### Riwayat Hasil & Resi (`/api/hasil`)
- `GET /api/hasil/riwayat` - Riwayat ujian yang telah diselesaikan mahasiswa (nilai hanya tampil jika dosen mengaktifkan publikasi).
- `GET /api/hasil/resi/:id_bukti` - Mengambil detail tanda terima resmi (resi) pengumpulan ujian.

### Manajemen Dosen (`/api/dosen`)
- `GET /api/dosen/bank-soal` & `POST /api/dosen/bank-soal` - Kelola Bank Soal.
- `GET /api/dosen/bank-soal/:id_bank_soal/soal` & `POST /api/dosen/soal` - Kelola Soal (Pilihan Ganda, Benar/Salah, Isian Singkat, Esai).
- `GET /api/dosen/ujian` & `POST /api/dosen/ujian` - Kelola Ujian & Pengaturan Anti-Curang.
- `PUT /api/dosen/ujian/:id_ujian/publikasi` - Mengaktifkan/menonaktifkan publikasi hasil ujian ke mahasiswa.
- `POST /api/dosen/ujian/:id_ujian/soal` - Menautkan soal ke ujian (`ujian_soal`).
- `GET /api/dosen/ujian/:id_ujian/peserta` & `POST /api/dosen/ujian/:id_ujian/peserta` - Kelola peserta ujian (`peserta_ujian`).
- `GET /api/dosen/ujian/:id_ujian/log-pelanggaran` - Tinjau riwayat waktu dan jenis pelanggaran mahasiswa.
- `PUT /api/dosen/sesi/:id_sesi/keputusan-sanksi` - Menetapkan sanksi (`Peringatan`, `Pengurangan Nilai`, `Diskualifikasi`).
- `GET /api/dosen/sesi/:id_sesi/jawaban` & `POST /api/dosen/sesi/:id_sesi/nilai-esai` - Penilaian manual jawaban esai dan rekalkulasi otomatis total nilai akhir.

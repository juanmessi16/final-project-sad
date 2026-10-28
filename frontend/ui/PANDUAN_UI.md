# Panduan Penggunaan Antarmuka UI Python (SiLab Exam System)
**Sistem Ujian Berbasis Web dengan Fitur Anti-Curang**
Fakultas Ilmu Komputer, Universitas Klabat

---

## 📌 Ringkasan File UI Python yang Dibuat

Sesuai dengan dokumen UML (Use Case, Activity Diagram, Sequence Diagram, Class Diagram, dan Data Model ERD):

| File | Deskripsi & Fungsi |
|---|---|
| [`ui.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/ui.py) | **Antarmuka Utama Desktop (Tkinter/TTK)**. Menyediakan GUI lengkap untuk Mahasiswa & Dosen, pendeteksi perpindahan window/tab, blokir copy-paste, countdown timer, auto-save, dan kunci sesi paksa. |
| [`web_ui.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/web_ui.py) | **Antarmuka Web Python Murni (HTTP Server)**. Menjalankan web server lokal tanpa dependency tambahan (`http://localhost:8000`) dengan fitur anti-curang berbasis browser web sesuai judul dokumen. |
| [`main.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/main.py) | **Launcher Terpadu**. Menu interaktif untuk memilih menjalankan Desktop GUI atau Web Browser UI. |
| [`models.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/models.py) | **Class Domain OOP**. Implementasi langsung dari *Bab 4 Class Diagram* (`Pengguna`, `Dosen`, `Mahasiswa`, `SistemAntiCurang`, `BankSoal`, `Soal`, `Ujian`, `SesiUjianMahasiswa`, `LogPelanggaran`, `BuktiUjianDanHasil`). |
| [`database.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/database.py) | **Database Layer (SQLite)**. Dibuat persis menurut *Bab 5 Data Model (Tabel 5 - 16)* lengkap dengan seeding akun penguji awal. |
| [`test_workflow.py`](file:///c:/Users/Juan%20Tulengkey/OneDrive/Dokumen/Juan%20folder/KULIAH/SAD%20Class/silab_exam_system/test_workflow.py) | **Unit Test Otomatis**. Memvalidasi seluruh use case dan alur data UML. |

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Desktop GUI (Tkinter)
```bash
python ui.py
```
*(atau jalankan `python main.py --desktop`)*

### Opsi 2: Menjalankan Web UI di Browser
```bash
python web_ui.py
```
Lalu buka browser Anda di: **`http://localhost:8000`**

### Opsi 3: Menggunakan Menu Launcher
```bash
python main.py
```

---

## 🔑 Akun Demo Siap Pakai

### 1. Akun Mahasiswa
* **NIM**: `105022410021` (Tulengkey, Juan Messi Septhian)
* **Password**: `123`
*(Tersedia juga NIM mahasiswa lain dari kelompok: `105022510107`, `105022410095`, `105022410007`, `105022510475`)*

### 2. Akun Dosen
* **Username**: `dosen` (George M. W. Tangka, S.Kom., MBA)
* **Password**: `dosen123`

### 3. Akun Terkunci (Untuk Uji Coba Alternate Flow 1.2.1.b)
* **Username**: `terkunci`
* **Password**: `123`

---

## 📋 Pemetaan Fitur UI dengan UML

1. **Login & Otentikasi (Use Case 1.2.1)**:
   - Validasi peran (Mahasiswa / Dosen).
   - Validasi status akun (Aktif / Terkunci / Nonaktif).
2. **Verifikasi PIN Ujian (Use Case 1.2.2)**:
   - Input PIN unik (`123456` pada sesi default).
   - Validasi tanggal jadwal ujian & batas retry kesalahan input PIN.
3. **Mengerjakan Ujian & Fitur Anti-Curang (Use Case 1.2.3, 1.2.11 - 1.2.18)**:
   - **Tampilkan Soal & Opsi Acak (1.2.11)**: Urutan soal dan opsi jawaban diacak setiap sesi baru dibuka.
   - **Tampilkan Timer (1.2.13)**: Hitung mundur durasi real-time.
   - **Simpan Jawaban Otomatis / Auto-Save (1.2.12)**: Setiap kali opsi diklik, langsung tersimpan diam-diam ke server/database.
   - **Deteksi Perpindahan Tab (1.2.14)**: Mendeteksi saat fokus jendela hilang (Alt-Tab / beralih program / tab browser disembunyikan).
   - **Blokir Copy-Paste (1.2.15)**: Menolak aksi copy, cut, paste, maupun right-click context menu.
   - **Peringatan Visual (1.2.17)**: Menampilkan banner merah mencolok saat terjadi pelanggaran beserta hitungan akumulasi.
   - **Kunci Sesi Ujian Paksa (1.2.18)**: Jika pelanggaran $\ge$ batas toleransi (3 kali), ujian otomatis dikunci paksa, jawaban terakhir disimpan, dan dicatat ke log pelanggaran.
   - **Submit Otomatis saat Waktu Habis (1.2.16)**: Begitu timer 00:00, jawaban langsung terkirim otomatis.
4. **Kirim Jawaban & Bukti Ujian (Use Case 1.2.4 & 1.2.19)**:
   - Menampilkan konfirmasi pengiriman manual dan mencetak kartu/tanda terima tanda bukti ujian.
5. **Lihat Hasil Ujian (Use Case 1.2.5)**:
   - Menampilkan status penilaian, skor akhir, dan status keputusan dosen.
6. **Fitur Dosen (Use Case 1.2.6 - 1.2.10)**:
   - **Kelola Bank Soal (1.2.6)**: Buat, tambah, dan hapus soal.
   - **Atur Ujian (1.2.7)**: Jadwalkan ujian, atur PIN, durasi, batas toleransi anti-curang, dan pilih soal dari bank soal.
   - **Kelola Peserta Ujian (1.2.8)**: Lihat dan hapus/atur peserta yang berhak mengikuti ujian.
   - **Tinjau Log Pelanggaran & Tetapkan Keputusan (1.2.9 & 1.2.10)**: Tinjau histori waktu dan jenis pelanggaran mahasiswa, lalu jatuhkan sanksi (Peringatan, Pengurangan Nilai, atau Diskualifikasi).

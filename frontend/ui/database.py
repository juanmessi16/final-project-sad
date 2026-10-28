"""
database.py - Database layer untuk Sistem Ujian Berbasis Web (SiLab)
Sesuai dengan Data Model (ERD dan Kamus Data Tabel 5 - Tabel 16) dari dokumen UML.
Menggunakan SQLite (Python Standard Library).
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "silab_exam.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Tabel 5: pengguna
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pengguna (
        id_pengguna VARCHAR(20) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(225) NOT NULL,
        role TEXT CHECK(role IN ('Mahasiswa', 'Dosen')) NOT NULL,
        status_akun TEXT CHECK(status_akun IN ('Aktif', 'Nonaktif', 'Terkunci')) DEFAULT 'Aktif' NOT NULL
    )
    """)

    # Tabel 6: dosen
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dosen (
        id_dosen VARCHAR(20) PRIMARY KEY,
        id_pengguna VARCHAR(20) NOT NULL,
        nama_dosen VARCHAR(100) NOT NULL,
        mata_kuliah VARCHAR(100) NOT NULL,
        FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
    )
    """)

    # Tabel 7: mahasiswa
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mahasiswa (
        id_mahasiswa VARCHAR(20) PRIMARY KEY,
        id_pengguna VARCHAR(20) UNIQUE NOT NULL,
        nim VARCHAR(20) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
    )
    """)

    # Tabel 8: bank_soal
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bank_soal (
        id_bank_soal VARCHAR(20) PRIMARY KEY,
        id_dosen VARCHAR(20) NOT NULL,
        nama_mata_kuliah VARCHAR(100) NOT NULL,
        FOREIGN KEY (id_dosen) REFERENCES dosen(id_dosen) ON DELETE CASCADE
    )
    """)

    # Tabel 9: soal
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS soal (
        id_soal VARCHAR(20) PRIMARY KEY,
        id_bank_soal VARCHAR(20) NOT NULL,
        pertanyaan TEXT NOT NULL,
        opsi_jawaban TEXT NOT NULL, -- JSON formatted list of strings
        kunci_jawaban VARCHAR(225) NOT NULL,
        FOREIGN KEY (id_bank_soal) REFERENCES bank_soal(id_bank_soal) ON DELETE CASCADE
    )
    """)

    # Tabel 10: ujian
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ujian (
        id_ujian VARCHAR(20) PRIMARY KEY,
        id_dosen VARCHAR(20) NOT NULL,
        nama_ujian VARCHAR(100) NOT NULL,
        tanggal_waktu_mulai TEXT NOT NULL,
        tanggal_waktu_selesai TEXT NOT NULL,
        durasi INTEGER NOT NULL, -- dalam menit
        pin_ujian VARCHAR(20) NOT NULL,
        batas_toleransi_pelanggaran INTEGER DEFAULT 3 NOT NULL,
        FOREIGN KEY (id_dosen) REFERENCES dosen(id_dosen) ON DELETE CASCADE
    )
    """)

    # Tabel 11: ujian_soal
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ujian_soal (
        id_ujian VARCHAR(20) NOT NULL,
        id_soal VARCHAR(20) NOT NULL,
        PRIMARY KEY (id_ujian, id_soal),
        FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian) ON DELETE CASCADE,
        FOREIGN KEY (id_soal) REFERENCES soal(id_soal) ON DELETE CASCADE
    )
    """)

    # Tabel 12: peserta_ujian
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS peserta_ujian (
        id_ujian VARCHAR(20) NOT NULL,
        id_mahasiswa VARCHAR(20) NOT NULL,
        PRIMARY KEY (id_ujian, id_mahasiswa),
        FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian) ON DELETE CASCADE,
        FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE
    )
    """)

    # Tabel 13: sesi_ujian_mahasiswa
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sesi_ujian_mahasiswa (
        id_sesi VARCHAR(20) PRIMARY KEY,
        id_ujian VARCHAR(20) NOT NULL,
        id_mahasiswa VARCHAR(20) NOT NULL,
        waktu_mulai TEXT NOT NULL,
        sisa_waktu INTEGER NOT NULL, -- dalam detik
        jumlah_peringatan INTEGER DEFAULT 0 NOT NULL,
        status_ujian TEXT CHECK(status_ujian IN ('Berlangsung', 'Selesai', 'Dikunci Paksa', 'Disubmit Otomatis')) DEFAULT 'Berlangsung' NOT NULL,
        FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian) ON DELETE CASCADE,
        FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa) ON DELETE CASCADE
    )
    """)

    # Tabel 14: jawaban_mahasiswa
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jawaban_mahasiswa (
        id_jawaban VARCHAR(20) PRIMARY KEY,
        id_sesi VARCHAR(20) NOT NULL,
        id_soal VARCHAR(20) NOT NULL,
        jawaban_dipilih VARCHAR(225),
        urutan_soal INTEGER NOT NULL,
        waktu_disimpan TEXT NOT NULL,
        FOREIGN KEY (id_sesi) REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE,
        FOREIGN KEY (id_soal) REFERENCES soal(id_soal) ON DELETE CASCADE
    )
    """)

    # Tabel 15: log_pelanggaran
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS log_pelanggaran (
        id_log VARCHAR(20) PRIMARY KEY,
        id_sesi VARCHAR(20) NOT NULL,
        jenis_pelanggaran TEXT CHECK(jenis_pelanggaran IN ('Pindah Tab', 'Copy-Paste', 'Sesi Dikunci Paksa')) NOT NULL,
        waktu_kejadian TEXT NOT NULL,
        jumlah_pelanggaran INTEGER NOT NULL,
        FOREIGN KEY (id_sesi) REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE
    )
    """)

    # Tabel 16: bukti_ujian_hasil
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bukti_ujian_hasil (
        id_bukti VARCHAR(20) PRIMARY KEY,
        id_sesi VARCHAR(20) UNIQUE NOT NULL,
        waktu_pengiriman TEXT NOT NULL,
        status_pengiriman VARCHAR(20) NOT NULL,
        total_nilai REAL, -- Boleh NULL sebelum dinilai
        status_keputusan TEXT CHECK(status_keputusan IN ('Tidak Ada', 'Peringatan', 'Pengurangan Nilai', 'Diskualifikasi')) DEFAULT 'Tidak Ada' NOT NULL,
        FOREIGN KEY (id_sesi) REFERENCES sesi_ujian_mahasiswa(id_sesi) ON DELETE CASCADE
    )
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn):
    cursor = conn.cursor()

    # Cek jika data sudah ada
    cursor.execute("SELECT COUNT(*) FROM pengguna")
    if cursor.fetchone()[0] > 0:
        return

    now = datetime.now()
    mulai = (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    selesai = (now + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")

    # 1. Pengguna Dosen
    cursor.execute("""
    INSERT INTO pengguna (id_pengguna, username, password, role, status_akun)
    VALUES ('USR_DOSEN_01', 'dosen', 'dosen123', 'Dosen', 'Aktif')
    """)
    cursor.execute("""
    INSERT INTO dosen (id_dosen, id_pengguna, nama_dosen, mata_kuliah)
    VALUES ('DOS_01', 'USR_DOSEN_01', 'George M. W. Tangka, S.Kom., MBA', 'Sistem Analisis & Desain')
    """)

    # 2. Pengguna Mahasiswa (berdasarkan cover UML dokumen)
    mhs_list = [
        ('USR_MHS_01', '105022410021', '123', 'MHS_01', 'Tulengkey, Juan Messi Septhian'),
        ('USR_MHS_02', '105022510107', '123', 'MHS_02', 'Tuwaidan, Jeniffer Diana'),
        ('USR_MHS_03', '105022410095', '123', 'MHS_03', 'Sumual, Valentino'),
        ('USR_MHS_04', '105022410007', '123', 'MHS_04', 'Sahetapy, Wilman Valentino'),
        ('USR_MHS_05', '105022510475', '123', 'MHS_05', 'Laluyan, Matthew Arnold M')
    ]

    for uid, nim, pwd, mid, nama in mhs_list:
        cursor.execute("""
        INSERT INTO pengguna (id_pengguna, username, password, role, status_akun)
        VALUES (?, ?, ?, 'Mahasiswa', 'Aktif')
        """, (uid, nim, pwd))
        cursor.execute("""
        INSERT INTO mahasiswa (id_mahasiswa, id_pengguna, nim, nama)
        VALUES (?, ?, ?, ?)
        """, (mid, uid, nim, nama))

    # Akun terkunci untuk testing alternate flow
    cursor.execute("""
    INSERT INTO pengguna (id_pengguna, username, password, role, status_akun)
    VALUES ('USR_MHS_LOCK', 'terkunci', '123', 'Mahasiswa', 'Terkunci')
    """)
    cursor.execute("""
    INSERT INTO mahasiswa (id_mahasiswa, id_pengguna, nim, nama)
    VALUES ('MHS_LOCK', 'USR_MHS_LOCK', '105022499999', 'Mahasiswa Terkunci')
    """)

    # 3. Bank Soal
    cursor.execute("""
    INSERT INTO bank_soal (id_bank_soal, id_dosen, nama_mata_kuliah)
    VALUES ('BS_01', 'DOS_01', 'Sistem Analisis & Desain')
    """)

    # 4. Soal-Soal
    daftar_soal = [
        (
            'SOAL_01', 'BS_01',
            'Apa tujuan utama dari diagram Use Case dalam perancangan perangkat lunak?',
            json.dumps([
                'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem',
                'Menentukan struktur tabel database secara mendalam',
                'Mengatur alokasi memori runtime pada server',
                'Menampilkan arsitektur hardware jaringan'
            ]),
            'Menggambarkan interaksi antara aktor eksternal dengan fungsi sistem'
        ),
        (
            'SOAL_02', 'BS_01',
            'Dalam UML, hubungan <<include>> antara use case menunjukkan bahwa:',
            json.dumps([
                'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya',
                'Use case hanya dijalankan jika terjadi kesalahan eksepsional',
                'Use case bersifat opsional bergantung pada keputusan pengguna',
                'Use case adalah subclass dari use case lainnya'
            ]),
            'Use case dasar selalu memanggil use case yang di-include sebagai bagian prosesnya'
        ),
        (
            'SOAL_03', 'BS_01',
            'Fitur anti-curang yang mendeteksi saat mahasiswa berpindah tab browser memanfaatkan event:',
            json.dumps([
                'Window Focus / Visibility Change listener',
                'Keydown space bar listener',
                'Mouse click left listener',
                'Page reload cache'
            ]),
            'Window Focus / Visibility Change listener'
        ),
        (
            'SOAL_04', 'BS_01',
            'Kapan sistem memicu aksi Kunci Sesi Ujian Paksa?',
            json.dumps([
                'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan',
                'Segera setelah mahasiswa pertama kali membuka tab baru',
                'Saat mahasiswa menekan tombol submit secara manual',
                'Ketika dosen belum memasukkan PIN ujian'
            ]),
            'Ketika jumlah pelanggaran mahasiswa melampaui batas toleransi yang ditentukan'
        ),
        (
            'SOAL_05', 'BS_01',
            'Di dalam Entity Relationship Diagram (ERD), relasi antara Ujian dan Mahasiswa dimediasi oleh tabel:',
            json.dumps([
                'peserta_ujian',
                'bank_soal',
                'log_pelanggaran',
                'bukti_ujian_hasil'
            ]),
            'peserta_ujian'
        )
    ]

    for s_id, bs_id, tanya, opsi, kunci in daftar_soal:
        cursor.execute("""
        INSERT INTO soal (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
        VALUES (?, ?, ?, ?, ?)
        """, (s_id, bs_id, tanya, opsi, kunci))

    # 5. Ujian
    cursor.execute("""
    INSERT INTO ujian (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran)
    VALUES ('UJN_01', 'DOS_01', 'UTS Sistem Analisis & Desain (SAD)', ?, ?, 60, '123456', 3)
    """, (mulai, selesai))

    # 6. Hubungkan Soal ke Ujian (ujian_soal)
    for s_id, _, _, _, _ in daftar_soal:
        cursor.execute("INSERT INTO ujian_soal (id_ujian, id_soal) VALUES ('UJN_01', ?)", (s_id,))

    # 7. Hubungkan Mahasiswa ke Ujian (peserta_ujian)
    for _, _, _, mid, _ in mhs_list:
        cursor.execute("INSERT INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES ('UJN_01', ?)", (mid,))

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database SQLite SiLab Exam berhasil diinisialisasi!")

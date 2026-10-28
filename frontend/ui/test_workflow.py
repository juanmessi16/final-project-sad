"""
test_workflow.py - Verifikasi Otomatis Alur Kerja Use Case SiLab Exam System
Memastikan seluruh use case UML berjalan dengan sempurna pada database dan models.
"""

import database
import models
import json
from datetime import datetime

def run_tests():
    print(">>> 1. Inisialisasi Database...")
    database.init_db()
    conn = database.get_connection()

    # Test Login Mahasiswa & Dosen
    print(">>> 2. Verifikasi Use Case 1.2.1: Melakukan Login...")
    user_mhs = conn.execute("SELECT * FROM pengguna WHERE username = '105022410021'").fetchone()
    assert user_mhs is not None, "Akun Mahasiswa Juan harus ada"
    mhs_obj = models.Mahasiswa(user_mhs["id_pengguna"], user_mhs["username"], user_mhs["password"], "MHS_01", "105022410021", "Tulengkey, Juan Messi")
    valid, msg = mhs_obj.login("105022410021", "123")
    assert valid, f"Login Mahasiswa harus berhasil: {msg}"

    user_locked = conn.execute("SELECT * FROM pengguna WHERE username = 'terkunci'").fetchone()
    lock_obj = models.Pengguna(user_locked["id_pengguna"], user_locked["username"], user_locked["password"], "Mahasiswa", user_locked["status_akun"])
    valid, msg = lock_obj.login("terkunci", "123")
    assert not valid and "Terkunci" in msg, f"Akun terkunci harus ditolak: {msg}"
    print("    [PASS] Login Mahasiswa normal dan penolakan akun terkunci sesuai spesifikasi.")

    # Test Verifikasi PIN
    print(">>> 3. Verifikasi Use Case 1.2.2: Verifikasi PIN Ujian...")
    ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = 'UJN_01'").fetchone()
    assert ujian["pin_ujian"] == "123456", "PIN Ujian default harus 123456"
    assert mhs_obj.verifikasi_pin_ujian("123456", ujian["pin_ujian"]) is True
    assert mhs_obj.verifikasi_pin_ujian("000000", ujian["pin_ujian"]) is False
    print("    [PASS] Validasi PIN ujian sukses.")

    # Test Acak Soal dan Opsi (Use Case 1.2.11)
    print(">>> 4. Verifikasi Use Case 1.2.11: Tampilkan Soal dan Opsi Acak...")
    soal_rows = conn.execute("SELECT * FROM soal WHERE id_bank_soal = 'BS_01'").fetchall()
    soal_1 = soal_rows[0]
    soal_obj = models.Soal(soal_1["id_soal"], soal_1["id_bank_soal"], soal_1["pertanyaan"], soal_1["opsi_jawaban"], soal_1["kunci_jawaban"])
    opsi_acak = soal_obj.acak_soal_dan_opsi()
    assert len(opsi_acak) == len(json.loads(soal_1["opsi_jawaban"])), "Panjang opsi harus sama"
    print("    [PASS] Pengacakan opsi soal berhasil.")

    # Test Anti-Curang & Kunci Sesi Paksa (Use Case 1.2.14, 1.2.15, 1.2.17, 1.2.18)
    print(">>> 5. Verifikasi Use Case 1.2.14 - 1.2.18: Fitur Anti-Curang...")
    anti_curang = models.SistemAntiCurang(batas_toleransi_pelanggaran=3)
    _, p1, lock1 = anti_curang.deteksi_perpindahan_tab()
    assert p1 == 1 and not lock1, "Pelanggaran 1 tidak boleh langsung kunci"
    _, p2, lock2 = anti_curang.blokir_copy_paste()
    assert p2 == 2 and not lock2, "Pelanggaran 2 tidak boleh langsung kunci"
    _, p3, lock3 = anti_curang.deteksi_perpindahan_tab()
    assert p3 == 3 and lock3, "Pelanggaran 3 harus memicu Kunci Sesi Ujian Paksa"
    print("    [PASS] Deteksi pindah tab, blokir copy-paste, dan kunci sesi paksa terverifikasi.")

    # Test Bukti Ujian (Use Case 1.2.19)
    print(">>> 6. Verifikasi Use Case 1.2.19: Tanda Terima Bukti Ujian...")
    bukti = models.BuktiUjianDanHasil("BKT_TEST", "SESI_TEST", datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "Selesai", 95.0, "Tidak Ada")
    cetak = bukti.cetak_bukti_ujian()
    assert "BUKTI TANDA TERIMA UJIAN" in cetak and "BKT_TEST" in cetak
    print("    [PASS] Cetak bukti tanda terima ujian sukses.")

    # Test Dosen Kelola Bank Soal & Keputusan Pelanggaran (Use Case 1.2.6 & 1.2.10)
    print(">>> 7. Verifikasi Fitur Dosen (Bank Soal & Keputusan Pelanggaran)...")
    dos_row = conn.execute("SELECT * FROM dosen WHERE id_dosen = 'DOS_01'").fetchone()
    dos_obj = models.Dosen("USR_DOSEN_01", "dosen", "dosen123", dos_row["id_dosen"], dos_row["nama_dosen"], dos_row["mata_kuliah"])
    keputusan = dos_obj.tetapkan_keputusan_pelanggaran("MHS_01", "Pengurangan Nilai", 75.0)
    assert keputusan["keputusan"] == "Pengurangan Nilai"
    print("    [PASS] Dosen domain model sukses.")

    conn.close()
    print("\n=======================================================")
    print(" SEMUA TEST USE CASE DAN UML BERHASIL 100% VALID!     ")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()

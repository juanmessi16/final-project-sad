"""
models.py - Object-Oriented Domain Models untuk SiLab Exam System
Implementasi Class Diagram dari Dokumen UML (Bab 4 Class Diagram).
"""

import random
import json
from datetime import datetime

class Pengguna:
    def __init__(self, id_pengguna, username, password, role, status_akun="Aktif"):
        self.id_pengguna = id_pengguna
        self.username = username
        self.password = password
        self.role = role
        self.status_akun = status_akun

    def login(self, input_username, input_password):
        """Memvalidasi kredensial login dan status akun"""
        if self.username == input_username and self.password == input_password:
            if self.status_akun == "Aktif":
                return True, "Login berhasil"
            else:
                return False, f"Akun tidak dapat masuk: Akun berstatus {self.status_akun}"
        return False, "Username/NIM atau password salah"


class Dosen(Pengguna):
    def __init__(self, id_pengguna, username, password, id_dosen, nama_dosen, mata_kuliah, status_akun="Aktif"):
        super().__init__(id_pengguna, username, password, "Dosen", status_akun)
        self.id_dosen = id_dosen
        self.nama_dosen = nama_dosen
        self.mata_kuliah = mata_kuliah

    def kelola_bank_soal(self):
        return f"Mengelola bank soal untuk mata kuliah {self.mata_kuliah}"

    def atur_ujian(self):
        return "Mengonfigurasi parameter sesi ujian baru"

    def kelola_peserta_ujian(self):
        return "Mengelola daftar peserta ujian"

    def tinjau_log_pelanggaran(self):
        return "Membuka daftar log pelanggaran mahasiswa"

    def tetapkan_keputusan_pelanggaran(self, id_mahasiswa, keputusan, nilai_baru=None):
        """
        Menetapkan tindakan terhadap mahasiswa yang terbukti melanggar:
        Pilihan: Peringatan, Pengurangan Nilai, Diskualifikasi
        """
        return {
            "id_mahasiswa": id_mahasiswa,
            "keputusan": keputusan,
            "nilai_baru": nilai_baru,
            "status": "Tersimpan"
        }


class Mahasiswa(Pengguna):
    def __init__(self, id_pengguna, username, password, id_mahasiswa, nim, nama, status_akun="Aktif"):
        super().__init__(id_pengguna, username, password, "Mahasiswa", status_akun)
        self.id_mahasiswa = id_mahasiswa
        self.nim = nim
        self.nama = nama

    def verifikasi_pin_ujian(self, pin_input, pin_asli):
        return pin_input == pin_asli

    def kerjakan_ujian(self, id_ujian):
        return f"Mahasiswa {self.nama} mulai mengerjakan ujian {id_ujian}"

    def kirim_jawaban(self, id_sesi):
        return f"Jawaban untuk sesi {id_sesi} telah dikirim"

    def lihat_hasil_ujian(self):
        return f"Menampilkan riwayat ujian dan hasil untuk {self.nama}"


class Soal:
    def __init__(self, id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban):
        self.id_soal = id_soal
        self.id_bank_soal = id_bank_soal
        self.pertanyaan = pertanyaan
        if isinstance(opsi_jawaban, str):
            try:
                self.opsi_jawaban = json.loads(opsi_jawaban)
            except Exception:
                self.opsi_jawaban = [opsi_jawaban]
        else:
            self.opsi_jawaban = list(opsi_jawaban)
        self.kunci_jawaban = kunci_jawaban

    def acak_soal_dan_opsi(self):
        """Mengacak urutan opsi jawaban soal"""
        opsi_acak = list(self.opsi_jawaban)
        random.shuffle(opsi_acak)
        return opsi_acak


class BankSoal:
    def __init__(self, id_bank_soal, id_dosen, nama_mata_kuliah):
        self.id_bank_soal = id_bank_soal
        self.id_dosen = id_dosen
        self.nama_mata_kuliah = nama_mata_kuliah
        self.daftar_soal = []

    def buat_soal(self, id_soal, pertanyaan, opsi_jawaban, kunci_jawaban):
        soal = Soal(id_soal, self.id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
        return soal

    def tambah_soal(self, soal):
        self.daftar_soal.append(soal)

    def hapus_soal(self, id_soal):
        self.daftar_soal = [s for s in self.daftar_soal if s.id_soal != id_soal]


class Ujian:
    def __init__(self, id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran=3):
        self.id_ujian = id_ujian
        self.id_dosen = id_dosen
        self.nama_ujian = nama_ujian
        self.tanggal_waktu_mulai = tanggal_waktu_mulai
        self.tanggal_waktu_selesai = tanggal_waktu_selesai
        self.durasi = durasi # dalam menit
        self.pin_ujian = pin_ujian
        self.batas_toleransi_pelanggaran = batas_toleransi_pelanggaran
        self.daftar_peserta = []
        self.daftar_soal = []

    def tambah_peserta(self, id_mahasiswa):
        if id_mahasiswa not in self.daftar_peserta:
            self.daftar_peserta.append(id_mahasiswa)

    def hapus_peserta(self, id_mahasiswa):
        if id_mahasiswa in self.daftar_peserta:
            self.daftar_peserta.remove(id_mahasiswa)

    def tampilkan_timer(self, waktu_mulai):
        now = datetime.now()
        elapsed = (now - waktu_mulai).total_seconds()
        total_seconds = self.durasi * 60
        sisa = max(0, int(total_seconds - elapsed))
        return sisa

    def submit_otomatis(self, id_sesi):
        return f"Sesi {id_sesi} disubmit otomatis karena waktu ujian telah habis."


class SistemAntiCurang:
    def __init__(self, batas_toleransi_pelanggaran=3):
        self.batas_toleransi_pelanggaran = batas_toleransi_pelanggaran
        self.jumlah_peringatan = 0

    def deteksi_perpindahan_tab(self):
        """Dipicu saat window kehilangan fokus atau tab berpindah"""
        self.jumlah_peringatan += 1
        harus_kunci = self.jumlah_peringatan >= self.batas_toleransi_pelanggaran
        return "Pindah Tab", self.jumlah_peringatan, harus_kunci

    def blokir_copy_paste(self):
        """Dipicu saat aksi copy, cut, atau paste dicegah"""
        self.jumlah_peringatan += 1
        harus_kunci = self.jumlah_peringatan >= self.batas_toleransi_pelanggaran
        return "Copy-Paste", self.jumlah_peringatan, harus_kunci

    def tampilkan_peringatan_visual(self, jenis_pelanggaran):
        return (
            f"PERINGATAN PELANGGARAN!\n"
            f"Terdeteksi aktivitas: {jenis_pelanggaran}.\n"
            f"Jumlah pelanggaran: {self.jumlah_peringatan} / {self.batas_toleransi_pelanggaran}\n"
            f"Peringatan: Jika melewati batas toleransi, sesi ujian akan dikunci paksa!"
        )


class SesiUjianMahasiswa:
    def __init__(self, id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu, status_ujian="Berlangsung", jumlah_peringatan=0):
        self.id_sesi = id_sesi
        self.id_ujian = id_ujian
        self.id_mahasiswa = id_mahasiswa
        self.waktu_mulai = waktu_mulai
        self.sisa_waktu = sisa_waktu
        self.status_ujian = status_ujian
        self.jumlah_peringatan = jumlah_peringatan
        self.jawaban_tersimpan = {} # id_soal -> jawaban

    def simpan_jawaban_otomatis(self, id_soal, jawaban_dipilih):
        self.jawaban_tersimpan[id_soal] = {
            "jawaban": jawaban_dipilih,
            "waktu_disimpan": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return True

    def kunci_sesi_paksa(self):
        self.status_ujian = "Dikunci Paksa"
        return "Sesi ujian mahasiswa telah dikunci secara paksa oleh sistem."


class LogPelanggaran:
    def __init__(self, id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran):
        self.id_log = id_log
        self.id_sesi = id_sesi
        self.jenis_pelanggaran = jenis_pelanggaran
        self.waktu_kejadian = waktu_kejadian
        self.jumlah_pelanggaran = jumlah_pelanggaran


class BuktiUjianDanHasil:
    def __init__(self, id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai=None, status_keputusan="Tidak Ada"):
        self.id_bukti = id_bukti
        self.id_sesi = id_sesi
        self.waktu_pengiriman = waktu_pengiriman
        self.status_pengiriman = status_pengiriman
        self.total_nilai = total_nilai
        self.status_keputusan = status_keputusan

    def cetak_bukti_ujian(self):
        nilai_str = f"{self.total_nilai:.2f}" if self.total_nilai is not None else "Belum Dinilai"
        return (
            "==============================================\n"
            "       BUKTI TANDA TERIMA UJIAN (SiLab)       \n"
            "==============================================\n"
            f"ID Bukti         : {self.id_bukti}\n"
            f"ID Sesi          : {self.id_sesi}\n"
            f"Waktu Pengiriman : {self.waktu_pengiriman}\n"
            f"Status Pengiriman: {self.status_pengiriman}\n"
            f"Total Nilai      : {nilai_str}\n"
            f"Status Keputusan : {self.status_keputusan}\n"
            "==============================================\n"
        )

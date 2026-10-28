"""
ui.py - Antarmuka Pengguna (UI) Desktop Berbasis Python (Tkinter/TTK)
Sistem Ujian Berbasis Web dengan Fitur Anti-Curang (SiLab Exam System)
Fakultas Ilmu Komputer, Universitas Klabat

Sesuai dengan:
- Bab 1: Use Case Diagram & Deskripsi Workflow
- Bab 2: Activity Diagram
- Bab 3: Sequence Diagram
- Bab 4: Class Diagram
- Bab 5: Data Model (ERD & Data Dictionary)
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import random
from datetime import datetime, timedelta
import database
import models

class SiLabApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("SiLab - Sistem Ujian dengan Fitur Anti-Curang | FIK UNKLAB")
        self.geometry("1100x720")
        self.minsize(950, 600)
        self.configure(bg="#F1F5F9")

        # Inisialisasi Database
        database.init_db()

        # State Aplikasi
        self.current_user = None       # Pengguna saat ini
        self.active_session = None     # models.SesiUjianMahasiswa
        self.anti_cheat = None         # models.SistemAntiCurang
        self.exam_timer_id = None      # ID timer tkinter
        self.current_exam_questions = [] # Daftar soal teracak
        self.current_question_index = 0
        self.student_answers = {}      # id_soal -> jawaban

        # Styling ttk
        self.setup_styles()

        # Container Frame utama untuk pergantian layar
        self.main_container = tk.Frame(self, bg="#F1F5F9")
        self.main_container.pack(fill=tk.BOTH, expand=True)

        # Mulai dari Halaman Login
        self.show_login_frame()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Color Palette
        # Primary: #1E40AF (Blue 800), Accent: #3B82F6, Danger: #DC2626, Success: #16A34A
        style.configure(".", font=("Segoe UI", 10))
        style.configure("TLabel", background="#FFFFFF", foreground="#1E293B")
        style.configure("TFrame", background="#F8FAFC")
        
        style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), foreground="#1E3A8A", background="#FFFFFF")
        style.configure("SubHeader.TLabel", font=("Segoe UI", 11), foreground="#64748B", background="#FFFFFF")
        
        style.configure("Card.TFrame", background="#FFFFFF", relief="flat")
        
        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"), background="#2563EB", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Primary.TButton", background=[("active", "#1D4ED8"), ("disabled", "#94A3B8")])

        style.configure("Danger.TButton", font=("Segoe UI", 10, "bold"), background="#DC2626", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Danger.TButton", background=[("active", "#B91C1C")])

        style.configure("Success.TButton", font=("Segoe UI", 10, "bold"), background="#16A34A", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Success.TButton", background=[("active", "#15803D")])

        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), background="#E2E8F0", foreground="#0F172A")
        style.configure("Treeview", font=("Segoe UI", 9), rowheight=26)

    def clear_container(self):
        # Bersihkan timer jika ada
        if self.exam_timer_id:
            self.after_cancel(self.exam_timer_id)
            self.exam_timer_id = None

        # Lepas binding global anti-curang jika pindah layar
        self.unbind("<FocusOut>")
        self.unbind("<Control-c>")
        self.unbind("<Control-v>")
        self.unbind("<Control-x>")

        for widget in self.main_container.winfo_children():
            widget.destroy()

    # =========================================================================
    # 1. USE CASE: MELAKUKAN LOGIN (Use Case 1.2.1 & Sequence 3.1)
    # 2 OPSI: LOGIN MAHASISWA & LOGIN DOSEN
    # =========================================================================
    def show_login_frame(self):
        self.clear_container()

        center_box = tk.Frame(self.main_container, bg="#FFFFFF", padx=35, pady=30, bd=1, relief="solid")
        center_box.place(relx=0.5, rely=0.5, anchor="center", width=500)

        # Header Logo & Title
        title_lbl = tk.Label(center_box, text="SiLab Exam System", font=("Segoe UI", 20, "bold"), fg="#1E3A8A", bg="#FFFFFF")
        title_lbl.pack(pady=(0, 2))
        
        sub_lbl = tk.Label(center_box, text="Sistem Ujian dengan Fitur Anti-Curang\nFakultas Ilmu Komputer - Universitas Klabat", 
                           font=("Segoe UI", 9), fg="#64748B", bg="#FFFFFF", justify="center")
        sub_lbl.pack(pady=(0, 16))

        # 2 Opsi Tab Pilihan: Login Mahasiswa & Login Dosen
        role_var = tk.StringVar(value="Mahasiswa")

        role_frame = tk.Frame(center_box, bg="#F1F5F9", padx=4, pady=4)
        role_frame.pack(fill=tk.X, pady=(0, 15))

        btn_mhs_opt = tk.Button(role_frame, text="👨‍🎓 Login Mahasiswa", font=("Segoe UI", 10, "bold"),
                                bg="#2563EB", fg="#FFFFFF", relief="flat", padx=10, pady=6)
        btn_mhs_opt.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)

        btn_dos_opt = tk.Button(role_frame, text="👨‍🏫 Login Dosen", font=("Segoe UI", 10, "bold"),
                                bg="#E2E8F0", fg="#475569", relief="flat", padx=10, pady=6)
        btn_dos_opt.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=2)

        # Form Login
        form_frame = tk.Frame(center_box, bg="#FFFFFF")
        form_frame.pack(fill=tk.X, pady=5)

        user_label = tk.Label(form_frame, text="Nomor Induk Mahasiswa (NIM):", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#334155")
        user_label.pack(anchor="w", pady=(5, 2))
        username_entry = ttk.Entry(form_frame, font=("Segoe UI", 11))
        username_entry.pack(fill=tk.X, pady=(0, 10))
        username_entry.insert(0, "105022410021") # Default Mahasiswa sample

        tk.Label(form_frame, text="Password:", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", fg="#334155").pack(anchor="w", pady=(5, 2))
        password_entry = ttk.Entry(form_frame, font=("Segoe UI", 11), show="•")
        password_entry.pack(fill=tk.X, pady=(0, 15))
        password_entry.insert(0, "123")

        # Pesan status kesalahan jika ada
        error_lbl = tk.Label(center_box, text="", font=("Segoe UI", 9), fg="#DC2626", bg="#FFFFFF", wraplength=420)
        error_lbl.pack(pady=(0, 10))

        def select_role(role):
            role_var.set(role)
            error_lbl.config(text="")
            if role == "Mahasiswa":
                btn_mhs_opt.config(bg="#2563EB", fg="#FFFFFF")
                btn_dos_opt.config(bg="#E2E8F0", fg="#475569")
                user_label.config(text="Nomor Induk Mahasiswa (NIM):")
                username_entry.delete(0, tk.END)
                username_entry.insert(0, "105022410021")
                password_entry.delete(0, tk.END)
                password_entry.insert(0, "123")
                login_btn.config(text="Login")
            else:
                btn_mhs_opt.config(bg="#E2E8F0", fg="#475569")
                btn_dos_opt.config(bg="#16A34A", fg="#FFFFFF")
                user_label.config(text="Username Dosen / NIP:")
                username_entry.delete(0, tk.END)
                username_entry.insert(0, "dosen")
                password_entry.delete(0, tk.END)
                password_entry.insert(0, "dosen123")
                login_btn.config(text="Login")

        btn_mhs_opt.config(command=lambda: select_role("Mahasiswa"))
        btn_dos_opt.config(command=lambda: select_role("Dosen"))

        def handle_login(event=None):
            username = username_entry.get().strip()
            password = password_entry.get().strip()
            chosen_role = role_var.get()

            if not username or not password:
                error_lbl.config(text="Mohon isi kredensial akun dan password.")
                return

            conn = database.get_connection()
            user_row = conn.execute(
                "SELECT * FROM pengguna WHERE username = ?", (username,)
            ).fetchone()

            if not user_row or user_row["password"] != password:
                error_lbl.config(text="Kredensial tidak valid: Username atau password salah.")
                conn.close()
                return

            # Cek kesesuaian peran
            if user_row["role"] != chosen_role:
                error_lbl.config(text=f"Akun ini terdaftar sebagai {user_row['role']}. Gunakan opsi Login {user_row['role']}.")
                conn.close()
                return

            # Cek status akun sesuai Alternate Flow (Aktif, Nonaktif, Terkunci)
            if user_row["status_akun"] != "Aktif":
                error_lbl.config(text=f"Akses ditolak: Akun Anda sedang berstatus '{user_row['status_akun']}'.")
                conn.close()
                return

            # Buat Object Pengguna sesuai Role
            role = user_row["role"]
            if role == "Mahasiswa":
                mhs_row = conn.execute("SELECT * FROM mahasiswa WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
                self.current_user = models.Mahasiswa(
                    id_pengguna=user_row["id_pengguna"],
                    username=user_row["username"],
                    password=user_row["password"],
                    id_mahasiswa=mhs_row["id_mahasiswa"],
                    nim=mhs_row["nim"],
                    nama=mhs_row["nama"],
                    status_akun=user_row["status_akun"]
                )
                conn.close()
                self.show_mahasiswa_dashboard()
            else: # Dosen
                dos_row = conn.execute("SELECT * FROM dosen WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
                self.current_user = models.Dosen(
                    id_pengguna=user_row["id_pengguna"],
                    username=user_row["username"],
                    password=user_row["password"],
                    id_dosen=dos_row["id_dosen"],
                    nama_dosen=dos_row["nama_dosen"],
                    mata_kuliah=dos_row["mata_kuliah"],
                    status_akun=user_row["status_akun"]
                )
                conn.close()
                self.show_dosen_dashboard()

        login_btn = ttk.Button(center_box, text="Login", style="Primary.TButton", command=handle_login)
        login_btn.pack(fill=tk.X, pady=(5, 15))
        self.bind("<Return>", handle_login)

        # Quick Test Hints
        hint_frame = tk.LabelFrame(center_box, text="Pilihan Akun Demo (Klik untuk Isi Cepat):", font=("Segoe UI", 8), bg="#FFFFFF", fg="#64748B", padx=5, pady=5)
        hint_frame.pack(fill=tk.X)

        def set_acc(role, u, p):
            select_role(role)
            username_entry.delete(0, tk.END)
            username_entry.insert(0, u)
            password_entry.delete(0, tk.END)
            password_entry.insert(0, p)
            error_lbl.config(text="")

        btn_box = tk.Frame(hint_frame, bg="#FFFFFF")
        btn_box.pack(fill=tk.X)
        tk.Button(btn_box, text="👨‍🎓 Mahasiswa (Juan)", font=("Segoe UI", 8), command=lambda: set_acc("Mahasiswa", "105022410021", "123")).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_box, text="👨‍🏫 Dosen (George Tangka)", font=("Segoe UI", 8), command=lambda: set_acc("Dosen", "dosen", "dosen123")).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_box, text="🔒 Terkunci", font=("Segoe UI", 8), command=lambda: set_acc("Mahasiswa", "terkunci", "123")).pack(side=tk.LEFT, padx=2)

    # =========================================================================
    # 2. DASHBOARD MAHASISWA & VERIFIKASI PIN (Use Case 1.2.2 & 1.2.5)
    # =========================================================================
    def show_mahasiswa_dashboard(self):
        self.clear_container()
        self.unbind("<Return>")

        # Top Navigation Bar
        nav_bar = tk.Frame(self.main_container, bg="#1E3A8A", height=60, padx=20)
        nav_bar.pack(fill=tk.X)

        title_lbl = tk.Label(nav_bar, text="SiLab Exam | Portal Mahasiswa", font=("Segoe UI", 14, "bold"), fg="#FFFFFF", bg="#1E3A8A")
        title_lbl.pack(side=tk.LEFT, pady=15)

        user_info = tk.Label(nav_bar, text=f"{self.current_user.nama} (NIM: {self.current_user.nim})", 
                             font=("Segoe UI", 10), fg="#93C5FD", bg="#1E3A8A")
        user_info.pack(side=tk.RIGHT, padx=15)

        logout_btn = tk.Button(nav_bar, text="Keluar (Logout)", font=("Segoe UI", 9, "bold"), bg="#EF4444", fg="#FFFFFF", 
                               relief="flat", padx=10, pady=4, command=self.show_login_frame)
        logout_btn.pack(side=tk.RIGHT)

        # Tab Notebook
        notebook = ttk.Notebook(self.main_container)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=15)

        # Tab 1: Daftar Ujian Aktif
        tab_ujian = ttk.Frame(notebook)
        notebook.add(tab_ujian, text="  📝 Daftar Ujian Tersedia  ")
        self.build_mahasiswa_ujian_tab(tab_ujian)

        # Tab 2: Lihat Hasil Ujian
        tab_hasil = ttk.Frame(notebook)
        notebook.add(tab_hasil, text="  📊 Lihat Hasil Ujian & Tanda Terima  ")
        self.build_mahasiswa_hasil_tab(tab_hasil)

    def build_mahasiswa_ujian_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=10)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Daftar Ujian yang Anda Ikuti", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")
        tk.Label(top_frame, text="Pilih ujian lalu masukkan PIN yang diberikan dosen untuk memulai pengerjaan.", 
                 font=("Segoe UI", 9), bg="#F8FAFC", fg="#64748B").pack(anchor="w")

        # Treeview Daftar Ujian
        columns = ("id_ujian", "nama_ujian", "dosen", "durasi", "jadwal_mulai", "jadwal_selesai", "status")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=8)
        tree.heading("id_ujian", text="ID Ujian")
        tree.heading("nama_ujian", text="Nama Ujian")
        tree.heading("dosen", text="Dosen Pengampu")
        tree.heading("durasi", text="Durasi (Menit)")
        tree.heading("jadwal_mulai", text="Waktu Mulai")
        tree.heading("jadwal_selesai", text="Batas Selesai")
        tree.heading("status", text="Status Sesi")

        tree.column("id_ujian", width=80, anchor="center")
        tree.column("nama_ujian", width=250)
        tree.column("dosen", width=180)
        tree.column("durasi", width=100, anchor="center")
        tree.column("jadwal_mulai", width=140, anchor="center")
        tree.column("jadwal_selesai", width=140, anchor="center")
        tree.column("status", width=120, anchor="center")

        tree.pack(fill=tk.BOTH, expand=True, pady=10)

        def refresh_list():
            for row in tree.get_children():
                tree.delete(row)

            conn = database.get_connection()
            query = """
            SELECT u.id_ujian, u.nama_ujian, d.nama_dosen, u.durasi, u.tanggal_waktu_mulai, u.tanggal_waktu_selesai,
                   s.status_ujian, s.id_sesi
            FROM ujian u
            JOIN dosen d ON u.id_dosen = d.id_dosen
            JOIN peserta_ujian pu ON u.id_ujian = pu.id_ujian
            LEFT JOIN sesi_ujian_mahasiswa s ON u.id_ujian = s.id_ujian AND s.id_mahasiswa = ?
            WHERE pu.id_mahasiswa = ?
            """
            rows = conn.execute(query, (self.current_user.id_mahasiswa, self.current_user.id_mahasiswa)).fetchall()
            for r in rows:
                status_text = r["status_ujian"] if r["status_ujian"] else "Belum Mengikuti"
                tree.insert("", tk.END, values=(
                    r["id_ujian"], r["nama_ujian"], r["nama_dosen"], r["durasi"],
                    r["tanggal_waktu_mulai"], r["tanggal_waktu_selesai"], status_text
                ), tags=(r["id_ujian"],))
            conn.close()

        refresh_list()

        # Action Buttons
        btn_frame = tk.Frame(parent, bg="#F8FAFC", pady=10)
        btn_frame.pack(fill=tk.X)

        def on_mulai_ujian():
            selected = tree.selection()
            if not selected:
                messagebox.showwarning("Peringatan", "Silakan pilih salah satu ujian dari tabel terlebih dahulu.")
                return

            item = tree.item(selected[0])
            id_ujian = item["values"][0]
            status_sesi = item["values"][6]

            if status_sesi in ["Selesai", "Disubmit Otomatis", "Dikunci Paksa"]:
                messagebox.showinfo("Informasi", f"Anda telah menyelesaikan ujian ini dengan status '{status_sesi}'.")
                return

            # Tampilkan Pop-up Dialog Verifikasi PIN Ujian (Use Case 1.2.2 & Sequence 3.2)
            self.show_pin_verification_dialog(id_ujian)

        ttk.Button(btn_frame, text="🔑 Verifikasi PIN & Masuk Ruang Ujian", style="Primary.TButton", command=on_mulai_ujian).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="🔄 Segarkan Data", command=refresh_list).pack(side=tk.LEFT, padx=10)

    # -------------------------------------------------------------------------
    # VERIFIKASI PIN UJIAN (Use Case 1.2.2)
    # -------------------------------------------------------------------------
    def show_pin_verification_dialog(self, id_ujian):
        pin_win = tk.Toplevel(self)
        pin_win.title("Verifikasi PIN Ujian")
        pin_win.geometry("400x260")
        pin_win.resizable(False, False)
        pin_win.grab_set()

        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()
        conn.close()

        tk.Label(pin_win, text="Masukkan PIN Sesi Ujian", font=("Segoe UI", 12, "bold"), fg="#1E3A8A").pack(pady=(15, 5))
        tk.Label(pin_win, text=f"Ujian: {ujian['nama_ujian']}", font=("Segoe UI", 10)).pack()
        tk.Label(pin_win, text="PIN diberikan oleh Dosen pengawas sebelum ujian dimulai.", font=("Segoe UI", 8), fg="#64748B").pack(pady=(0, 10))

        pin_entry = ttk.Entry(pin_win, font=("Segoe UI", 13, "bold"), justify="center")
        pin_entry.pack(pady=5, ipadx=10, ipady=3)
        pin_entry.focus()

        err_lbl = tk.Label(pin_win, text="", font=("Segoe UI", 8), fg="#DC2626")
        err_lbl.pack(pady=2)

        # Counter retry percobaan input PIN
        attempts = {"count": 0}

        def submit_pin():
            input_pin = pin_entry.get().strip()
            attempts["count"] += 1

            now = datetime.now()
            tgl_mulai = datetime.strptime(ujian["tanggal_waktu_mulai"], "%Y-%m-%d %H:%M:%S")
            tgl_selesai = datetime.strptime(ujian["tanggal_waktu_selesai"], "%Y-%m-%d %H:%M:%S")

            # Validasi Jadwal Ujian (Alternate flow 1.2.2.b)
            if now < tgl_mulai:
                err_lbl.config(text="Sesi ujian belum dibuka oleh dosen.")
                return
            if now > tgl_selesai:
                err_lbl.config(text="Sesi ujian sudah melewati batas waktu.")
                return

            # Validasi PIN
            if input_pin != ujian["pin_ujian"]:
                sisa_coba = max(0, 3 - attempts["count"])
                if sisa_coba > 0:
                    err_lbl.config(text=f"PIN salah! Percobaan tersisa: {sisa_coba}")
                else:
                    messagebox.showerror("Gagal", "Anda telah salah memasukkan PIN sebanyak 3 kali.")
                    pin_win.destroy()
                return

            # PIN Valid! Masuk ke Ruang Ujian
            pin_win.destroy()
            self.start_exam_session(id_ujian)

        ttk.Button(pin_win, text="Verifikasi & Masuk", style="Primary.TButton", command=submit_pin).pack(pady=10)
        pin_win.bind("<Return>", lambda e: submit_pin())

    # =========================================================================
    # 3. RUANG UJIAN MAHASISWA & ANTI-CURANG (Use Case 1.2.3, 1.2.11 - 1.2.18)
    # =========================================================================
    def start_exam_session(self, id_ujian):
        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()

        # Cek apakah sesi sudah ada atau buat sesi baru
        existing_sesi = conn.execute(
            "SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?",
            (id_ujian, self.current_user.id_mahasiswa)
        ).fetchone()

        if existing_sesi:
            id_sesi = existing_sesi["id_sesi"]
            sisa_waktu = existing_sesi["sisa_waktu"]
            waktu_mulai = existing_sesi["waktu_mulai"]
            jml_peringatan = existing_sesi["jumlah_peringatan"]
            status_ujian = existing_sesi["status_ujian"]
        else:
            id_sesi = f"SESI_{int(datetime.now().timestamp())}"
            sisa_waktu = ujian["durasi"] * 60
            waktu_mulai = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            jml_peringatan = 0
            status_ujian = "Berlangsung"

            conn.execute("""
            INSERT INTO sesi_ujian_mahasiswa (id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu, jumlah_peringatan, status_ujian)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (id_sesi, id_ujian, self.current_user.id_mahasiswa, waktu_mulai, sisa_waktu, jml_peringatan, status_ujian))
            conn.commit()

        # Ambil soal-soal ujian
        soal_rows = conn.execute("""
        SELECT s.id_soal, s.pertanyaan, s.opsi_jawaban, s.kunci_jawaban
        FROM ujian_soal us
        JOIN soal s ON us.id_soal = s.id_soal
        WHERE us.id_ujian = ?
        """, (id_ujian,)).fetchall()

        # Ambil jawaban yang sebelumnya tersimpan (jika reconnect / resume)
        saved_answers = conn.execute("""
        SELECT id_soal, jawaban_dipilih FROM jawaban_mahasiswa WHERE id_sesi = ?
        """, (id_sesi,)).fetchall()
        self.student_answers = {r["id_soal"]: r["jawaban_dipilih"] for r in saved_answers}

        conn.close()

        # Inisialisasi Model Objek
        self.active_session = models.SesiUjianMahasiswa(
            id_sesi=id_sesi,
            id_ujian=id_ujian,
            id_mahasiswa=self.current_user.id_mahasiswa,
            waktu_mulai=waktu_mulai,
            sisa_waktu=sisa_waktu,
            status_ujian=status_ujian,
            jumlah_peringatan=jml_peringatan
        )

        self.anti_cheat = models.SistemAntiCurang(
            batas_toleransi_pelanggaran=ujian["batas_toleransi_pelanggaran"]
        )
        self.anti_cheat.jumlah_peringatan = jml_peringatan

        # Acak Soal dan Opsi (Use Case 1.2.11)
        self.current_exam_questions = []
        for r in soal_rows:
            s_obj = models.Soal(r["id_soal"], None, r["pertanyaan"], r["opsi_jawaban"], r["kunci_jawaban"])
            # Acak opsi untuk mahasiswa ini
            shuffled_opsi = s_obj.acak_soal_dan_opsi()
            self.current_exam_questions.append({
                "id_soal": s_obj.id_soal,
                "pertanyaan": s_obj.pertanyaan,
                "opsi_jawaban": shuffled_opsi,
                "kunci_jawaban": s_obj.kunci_jawaban
            })
        random.shuffle(self.current_exam_questions) # Acak urutan soal

        self.current_question_index = 0
        self.show_ruang_ujian_frame(ujian)

    def show_ruang_ujian_frame(self, ujian):
        self.clear_container()

        # Header Ruang Ujian dengan Timer Real-time
        top_bar = tk.Frame(self.main_container, bg="#0F172A", height=65, padx=20)
        top_bar.pack(fill=tk.X)

        exam_title = tk.Label(top_bar, text=f"UJIAN: {ujian['nama_ujian']}", font=("Segoe UI", 13, "bold"), fg="#FFFFFF", bg="#0F172A")
        exam_title.pack(side=tk.LEFT, pady=15)

        # Anti-Cheat Warning Badge
        self.warning_badge = tk.Label(top_bar, text=f"Pelanggaran: {self.anti_cheat.jumlah_peringatan}/{self.anti_cheat.batas_toleransi_pelanggaran}", 
                                      font=("Segoe UI", 10, "bold"), fg="#FCD34D", bg="#1E293B", padx=10, pady=4)
        self.warning_badge.pack(side=tk.RIGHT, padx=15)

        # Real-time Timer Label (Use Case 1.2.13)
        self.timer_label = tk.Label(top_bar, text="Sisa Waktu: --:--", font=("Consolas", 14, "bold"), fg="#38BDF8", bg="#0F172A")
        self.timer_label.pack(side=tk.RIGHT, padx=15)

        # Visual Alert Banner (Use Case 1.2.17 Tampilkan Peringatan Visual)
        self.alert_banner = tk.Frame(self.main_container, bg="#DC2626", pady=8)
        self.alert_banner_text = tk.Label(self.alert_banner, text="", font=("Segoe UI", 10, "bold"), fg="#FFFFFF", bg="#DC2626")
        self.alert_banner_text.pack()
        # Banner tersembunyi secara default

        # Main Workspace: Soal & Navigasi
        work_frame = tk.Frame(self.main_container, bg="#F1F5F9", padx=20, pady=15)
        work_frame.pack(fill=tk.BOTH, expand=True)

        # Left Column: Kotak Soal
        soal_card = tk.Frame(work_frame, bg="#FFFFFF", bd=1, relief="solid", padx=25, pady=20)
        soal_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.soal_number_lbl = tk.Label(soal_card, text="", font=("Segoe UI", 12, "bold"), fg="#1E3A8A", bg="#FFFFFF")
        self.soal_number_lbl.pack(anchor="w", pady=(0, 10))

        self.soal_text_lbl = tk.Label(soal_card, text="", font=("Segoe UI", 11), fg="#0F172A", bg="#FFFFFF", wraplength=600, justify="left")
        self.soal_text_lbl.pack(anchor="w", pady=(0, 20))

        # Radio button pilihan opsi
        self.selected_option_var = tk.StringVar(value="")
        self.options_frame = tk.Frame(soal_card, bg="#FFFFFF")
        self.options_frame.pack(fill=tk.X, pady=(0, 20))

        # Auto-Save Status Label (Use Case 1.2.12)
        self.autosave_lbl = tk.Label(soal_card, text="✓ Jawaban tersimpan otomatis", font=("Segoe UI", 8, "italic"), fg="#16A34A", bg="#FFFFFF")
        self.autosave_lbl.pack(anchor="w", pady=(10, 0))

        # Bottom Bar di Kotak Soal: Tombol Navigasi
        nav_btns = tk.Frame(soal_card, bg="#FFFFFF")
        nav_btns.pack(fill=tk.X, side=tk.BOTTOM, pady=(15, 0))

        self.prev_btn = ttk.Button(nav_btns, text="◀ Sebelumnya", command=self.prev_question)
        self.prev_btn.pack(side=tk.LEFT)

        self.next_btn = ttk.Button(nav_btns, text="Selanjutnya ▶", command=self.next_question)
        self.next_btn.pack(side=tk.LEFT, padx=10)

        # Right Column: Navigasi Nomor Soal & Tombol Submit
        nav_card = tk.Frame(work_frame, bg="#FFFFFF", bd=1, relief="solid", width=220, padx=15, pady=20)
        nav_card.pack(side=tk.RIGHT, fill=tk.Y, padx=(15, 0))
        nav_card.pack_propagate(False)

        tk.Label(nav_card, text="Nomor Soal", font=("Segoe UI", 11, "bold"), fg="#1E293B", bg="#FFFFFF").pack(anchor="w", pady=(0, 10))

        self.question_buttons_frame = tk.Frame(nav_card, bg="#FFFFFF")
        self.question_buttons_frame.pack(fill=tk.BOTH, expand=True)

        submit_btn = ttk.Button(nav_card, text="💾 Kirim Jawaban", style="Success.TButton", command=self.confirm_and_submit_exam)
        submit_btn.pack(fill=tk.X, side=tk.BOTTOM, pady=(15, 0))

        # Setup Anti-Cheat Listeners
        self.setup_anti_cheat_listeners()

        # Render Soal Pertama
        self.render_current_question()
        self.render_question_grid()

        # Jalankan Timer Ujian
        self.update_exam_timer()

    def render_question_grid(self):
        for widget in self.question_buttons_frame.winfo_children():
            widget.destroy()

        cols = 4
        for idx, q in enumerate(self.current_exam_questions):
            is_answered = q["id_soal"] in self.student_answers and self.student_answers[q["id_soal"]] != ""
            is_current = (idx == self.current_question_index)

            bg_col = "#2563EB" if is_current else ("#16A34A" if is_answered else "#E2E8F0")
            fg_col = "#FFFFFF" if (is_current or is_answered) else "#0F172A"

            btn = tk.Button(self.question_buttons_frame, text=str(idx + 1), font=("Segoe UI", 9, "bold"),
                            width=3, bg=bg_col, fg=fg_col, relief="flat",
                            command=lambda i=idx: self.go_to_question(i))
            row = idx // cols
            col = idx % cols
            btn.grid(row=row, column=col, padx=3, pady=3)

    def render_current_question(self):
        q = self.current_exam_questions[self.current_question_index]
        self.soal_number_lbl.config(text=f"Soal No. {self.current_question_index + 1} dari {len(self.current_exam_questions)}")
        self.soal_text_lbl.config(text=q["pertanyaan"])

        for widget in self.options_frame.winfo_children():
            widget.destroy()

        current_ans = self.student_answers.get(q["id_soal"], "")
        self.selected_option_var.set(current_ans)

        for opsi in q["opsi_jawaban"]:
            r_btn = tk.Radiobutton(
                self.options_frame, text=opsi, value=opsi, variable=self.selected_option_var,
                font=("Segoe UI", 10), bg="#FFFFFF", fg="#1E293B", activebackground="#EFF6FF",
                command=lambda opt=opsi: self.on_answer_changed(q["id_soal"], opt)
            )
            r_btn.pack(anchor="w", pady=4)

        # Update button states
        self.prev_btn.config(state="normal" if self.current_question_index > 0 else "disabled")
        self.next_btn.config(state="normal" if self.current_question_index < len(self.current_exam_questions) - 1 else "disabled")
        self.render_question_grid()

    def go_to_question(self, index):
        self.current_question_index = index
        self.render_current_question()

    def next_question(self):
        if self.current_question_index < len(self.current_exam_questions) - 1:
            self.current_question_index += 1
            self.render_current_question()

    def prev_question(self):
        if self.current_question_index > 0:
            self.current_question_index -= 1
            self.render_current_question()

    # -------------------------------------------------------------------------
    # AUTO-SAVE JAWABAN (Use Case 1.2.12 & Sequence 3.12)
    # -------------------------------------------------------------------------
    def on_answer_changed(self, id_soal, jawaban_dipilih):
        self.student_answers[id_soal] = jawaban_dipilih
        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Simpan ke Database
        conn = database.get_connection()
        existing = conn.execute(
            "SELECT id_jawaban FROM jawaban_mahasiswa WHERE id_sesi = ? AND id_soal = ?",
            (self.active_session.id_sesi, id_soal)
        ).fetchone()

        if existing:
            conn.execute("""
            UPDATE jawaban_mahasiswa 
            SET jawaban_dipilih = ?, waktu_disimpan = ?
            WHERE id_jawaban = ?
            """, (jawaban_dipilih, waktu_str, existing["id_jawaban"]))
        else:
            j_id = f"JAW_{int(datetime.now().timestamp())}_{random.randint(100, 999)}"
            conn.execute("""
            INSERT INTO jawaban_mahasiswa (id_jawaban, id_sesi, id_soal, jawaban_dipilih, urutan_soal, waktu_disimpan)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (j_id, self.active_session.id_sesi, id_soal, jawaban_dipilih, self.current_question_index + 1, waktu_str))
        conn.commit()
        conn.close()

        self.autosave_lbl.config(text=f"✓ Jawaban tersimpan otomatis ({waktu_str.split()[1]})")
        self.render_question_grid()

    # -------------------------------------------------------------------------
    # TIMER HITUNG MUNDUR (Use Case 1.2.13 & Sequence 3.13)
    # -------------------------------------------------------------------------
    def update_exam_timer(self):
        if self.active_session.status_ujian != "Berlangsung":
            return

        self.active_session.sisa_waktu -= 1

        # Simpan sisa waktu berkala ke database
        if self.active_session.sisa_waktu % 10 == 0:
            conn = database.get_connection()
            conn.execute("UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?",
                         (self.active_session.sisa_waktu, self.active_session.id_sesi))
            conn.commit()
            conn.close()

        if self.active_session.sisa_waktu <= 0:
            # Waktu Habis -> Trigger Submit Otomatis (Use Case 1.2.16)
            self.timer_label.config(text="Sisa Waktu: 00:00", fg="#DC2626")
            self.execute_submit_otomatis_waktu_habis()
            return

        mins = self.active_session.sisa_waktu // 60
        secs = self.active_session.sisa_waktu % 60
        self.timer_label.config(text=f"Sisa Waktu: {mins:02d}:{secs:02d}")

        if mins < 5:
            self.timer_label.config(fg="#EF4444")

        self.exam_timer_id = self.after(1000, self.update_exam_timer)

    # -------------------------------------------------------------------------
    # FITUR ANTI-CURANG (Use Case 1.2.14, 1.2.15, 1.2.17, 1.2.18)
    # -------------------------------------------------------------------------
    def setup_anti_cheat_listeners(self):
        # 1. Deteksi Perpindahan Tab / Kehilangan Fokus Window (Use Case 1.2.14 & Sequence 3.14)
        self.bind("<FocusOut>", self.on_window_focus_lost)

        # 2. Blokir Copy-Paste & Cut (Use Case 1.2.15 & Sequence 3.15)
        self.bind("<Control-c>", lambda e: self.on_blocked_copy_paste("Copy (Ctrl+C)"))
        self.bind("<Control-v>", lambda e: self.on_blocked_copy_paste("Paste (Ctrl+V)"))
        self.bind("<Control-x>", lambda e: self.on_blocked_copy_paste("Cut (Ctrl+X)"))

    def record_violation(self, jenis_pelanggaran):
        if self.active_session.status_ujian != "Berlangsung":
            return

        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.anti_cheat.jumlah_peringatan += 1
        log_id = f"LOG_{int(datetime.now().timestamp())}_{random.randint(100, 999)}"

        conn = database.get_connection()
        # Catat ke log_pelanggaran (Tabel 15)
        conn.execute("""
        INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
        VALUES (?, ?, ?, ?, ?)
        """, (log_id, self.active_session.id_sesi, jenis_pelanggaran, waktu_str, self.anti_cheat.jumlah_peringatan))

        # Update jumlah peringatan di sesi
        conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ? WHERE id_sesi = ?",
                     (self.anti_cheat.jumlah_peringatan, self.active_session.id_sesi))
        conn.commit()
        conn.close()

        # Update badge indikator
        self.warning_badge.config(
            text=f"Pelanggaran: {self.anti_cheat.jumlah_peringatan}/{self.anti_cheat.batas_toleransi_pelanggaran}",
            fg="#EF4444"
        )

        # Tampilkan Peringatan Visual (Use Case 1.2.17)
        self.trigger_visual_warning(jenis_pelanggaran)

        # Cek apakah melewati ambang batas toleransi -> Kunci Sesi Paksa (Use Case 1.2.18)
        if self.anti_cheat.jumlah_peringatan >= self.anti_cheat.batas_toleransi_pelanggaran:
            self.execute_kunci_sesi_paksa()

    def on_window_focus_lost(self, event):
        # Dipicu saat window kehilangan fokus (Alt-Tab, klik aplikasi lain, dll)
        if self.active_session and self.active_session.status_ujian == "Berlangsung":
            self.record_violation("Pindah Tab")

    def on_blocked_copy_paste(self, action_name):
        # Dipicu saat mahasiswa mencoba copy/paste
        if self.active_session and self.active_session.status_ujian == "Berlangsung":
            self.record_violation("Copy-Paste")
            return "break" # Hentikan event clipboard bawaan

    def trigger_visual_warning(self, jenis):
        msg = f"⚠️ PERINGATAN PELANGGARAN: Terdeteksi '{jenis}'! Akumulasi: {self.anti_cheat.jumlah_peringatan}/{self.anti_cheat.batas_toleransi_pelanggaran}"
        self.alert_banner.pack(fill=tk.X, before=self.main_container.winfo_children()[1])
        self.alert_banner_text.config(text=msg)

        # Sembunyikan banner otomatis setelah 4 detik jika belum terkunci
        if self.anti_cheat.jumlah_peringatan < self.anti_cheat.batas_toleransi_pelanggaran:
            self.after(4000, lambda: self.alert_banner.pack_forget())

    # -------------------------------------------------------------------------
    # KUNCI SESI PAKSA (Use Case 1.2.18 & Sequence 3.18)
    # -------------------------------------------------------------------------
    def execute_kunci_sesi_paksa(self):
        if self.exam_timer_id:
            self.after_cancel(self.exam_timer_id)
            self.exam_timer_id = None

        self.active_session.status_ujian = "Dikunci Paksa"
        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = database.get_connection()
        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = 'Dikunci Paksa' WHERE id_sesi = ?",
                     (self.active_session.id_sesi,))

        # Catat log sesi dikunci paksa
        log_id = f"LOG_LOCK_{int(datetime.now().timestamp())}"
        conn.execute("""
        INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
        VALUES (?, ?, 'Sesi Dikunci Paksa', ?, ?)
        """, (log_id, self.active_session.id_sesi, waktu_str, self.anti_cheat.jumlah_peringatan))

        # Terbitkan Bukti Ujian dengan status Dikunci Paksa
        bukti_id = f"BKT_{int(datetime.now().timestamp())}"
        conn.execute("""
        INSERT OR REPLACE INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
        VALUES (?, ?, ?, 'Dikunci Paksa', 0.0, 'Peringatan')
        """, (bukti_id, self.active_session.id_sesi, waktu_str))
        conn.commit()
        conn.close()

        # Tampilkan Layar Terkunci
        self.show_locked_session_screen()

    def show_locked_session_screen(self):
        self.clear_container()

        lock_box = tk.Frame(self.main_container, bg="#FFFFFF", padx=30, pady=30, bd=2, relief="solid")
        lock_box.place(relx=0.5, rely=0.5, anchor="center", width=550)

        tk.Label(lock_box, text="🔒 SESI UJIAN DIKUNCI PAKSA", font=("Segoe UI", 16, "bold"), fg="#DC2626", bg="#FFFFFF").pack(pady=(0, 10))
        
        info_text = (
            "Akses ujian Anda telah dihentikan secara otomatis oleh Sistem Anti-Curang.\n"
            f"Alasan: Pelanggaran terdeteksi berulang ({self.anti_cheat.jumlah_peringatan} kali) "
            f"dan melampaui batas toleransi ({self.anti_cheat.batas_toleransi_pelanggaran} kali).\n\n"
            "Jawaban terakhir yang tersimpan telah disubmit ke database sistem.\n"
            "Catatan pelanggaran telah diteruskan kepada Dosen Pengampu untuk ditinjau."
        )
        tk.Label(lock_box, text=info_text, font=("Segoe UI", 10), fg="#334155", bg="#FFFFFF", justify="center", wraplength=480).pack(pady=(0, 20))

        ttk.Button(lock_box, text="Kembali ke Dashboard Mahasiswa", style="Primary.TButton", 
                   command=self.show_mahasiswa_dashboard).pack()

    # -------------------------------------------------------------------------
    # SUBMIT OTOMATIS SAAT WAKTU HABIS (Use Case 1.2.16 & Sequence 3.16)
    # -------------------------------------------------------------------------
    def execute_submit_otomatis_waktu_habis(self):
        messagebox.showwarning("Waktu Habis", "Waktu pengerjaan ujian telah habis! Sistem akan secara otomatis mengirimkan jawaban Anda.")
        self.finalize_exam_submission("Disubmit Otomatis")

    # -------------------------------------------------------------------------
    # KIRIM JAWABAN MANUAL (Use Case 1.2.4 & Sequence 3.4)
    # -------------------------------------------------------------------------
    def confirm_and_submit_exam(self):
        jml_terjawab = len([k for k, v in self.student_answers.items() if v])
        total_soal = len(self.current_exam_questions)

        msg = (f"Apakah Anda yakin ingin menyelesaikan dan mengirimkan jawaban ujian?\n\n"
               f"Soal terjawab: {jml_terjawab} dari {total_soal} soal.")
        if not messagebox.askyesno("Konfirmasi Kirim Jawaban", msg):
            return

        self.finalize_exam_submission("Selesai")

    def finalize_exam_submission(self, status_pengiriman):
        if self.exam_timer_id:
            self.after_cancel(self.exam_timer_id)
            self.exam_timer_id = None

        self.active_session.status_ujian = status_pengiriman
        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Hitung Nilai Awal Secara Otomatis Berdasarkan Kunci Jawaban
        total_soal = len(self.current_exam_questions)
        benar = 0
        for q in self.current_exam_questions:
            ans = self.student_answers.get(q["id_soal"], "")
            if ans == q["kunci_jawaban"]:
                benar += 1
        nilai_kalkulasi = round((benar / total_soal) * 100, 2) if total_soal > 0 else 0.0

        conn = database.get_connection()
        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = ? WHERE id_sesi = ?",
                     (status_pengiriman, self.active_session.id_sesi))

        # Terbitkan Bukti Ujian (Use Case 1.2.19 Menerima Bukti Ujian)
        bukti_id = f"BKT_{int(datetime.now().timestamp())}"
        conn.execute("""
        INSERT OR REPLACE INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
        VALUES (?, ?, ?, ?, ?, 'Tidak Ada')
        """, (bukti_id, self.active_session.id_sesi, waktu_str, status_pengiriman, nilai_kalkulasi))
        conn.commit()
        conn.close()

        # Tampilkan Bukti Ujian (Use Case 1.2.19)
        self.show_bukti_ujian_screen(bukti_id, waktu_str, status_pengiriman, nilai_kalkulasi)

    # -------------------------------------------------------------------------
    # MENERIMA BUKTI UJIAN (Use Case 1.2.19 & Sequence 3.19)
    # -------------------------------------------------------------------------
    def show_bukti_ujian_screen(self, bukti_id, waktu, status, nilai):
        self.clear_container()

        card = tk.Frame(self.main_container, bg="#FFFFFF", padx=35, pady=30, bd=1, relief="solid")
        card.place(relx=0.5, rely=0.5, anchor="center", width=560)

        tk.Label(card, text="✅ TANDA TERIMA PENGIRIMAN UJIAN", font=("Segoe UI", 15, "bold"), fg="#16A34A", bg="#FFFFFF").pack(pady=(0, 15))

        bukti_obj = models.BuktiUjianDanHasil(
            id_bukti=bukti_id,
            id_sesi=self.active_session.id_sesi,
            waktu_pengiriman=waktu,
            status_pengiriman=status,
            total_nilai=nilai
        )

        text_area = scrolledtext.ScrolledText(card, font=("Consolas", 10), width=55, height=10, relief="solid", bd=1)
        text_area.pack(pady=10)
        text_area.insert(tk.END, bukti_obj.cetak_bukti_ujian())
        text_area.config(state="disabled")

        tk.Label(card, text="Tanda terima ini tersimpan otomatis dan dapat dilihat kembali di menu 'Lihat Hasil Ujian'.",
                 font=("Segoe UI", 8), fg="#64748B", bg="#FFFFFF").pack(pady=(0, 15))

        btn_box = tk.Frame(card, bg="#FFFFFF")
        btn_box.pack(fill=tk.X)

        ttk.Button(btn_box, text="Kembali ke Dashboard Mahasiswa", style="Primary.TButton", 
                   command=self.show_mahasiswa_dashboard).pack(side=tk.LEFT, expand=True, padx=5)

    # -------------------------------------------------------------------------
    # LIHAT HASIL UJIAN MAHASISWA (Use Case 1.2.5 & Sequence 3.5)
    # -------------------------------------------------------------------------
    def build_mahasiswa_hasil_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=10)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Riwayat Ujian & Hasil Penilaian", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")
        tk.Label(top_frame, text="Lihat nilai ujian yang sudah dipublikasikan oleh dosen pengampu dan status keputusan pelanggaran.", 
                 font=("Segoe UI", 9), bg="#F8FAFC", fg="#64748B").pack(anchor="w")

        columns = ("id_ujian", "nama_ujian", "waktu_kirim", "status_pengiriman", "nilai", "status_keputusan")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=8)
        tree.heading("id_ujian", text="ID Ujian")
        tree.heading("nama_ujian", text="Nama Ujian")
        tree.heading("waktu_kirim", text="Waktu Kirim")
        tree.heading("status_pengiriman", text="Status Pengiriman")
        tree.heading("nilai", text="Nilai / Skor")
        tree.heading("status_keputusan", text="Keputusan Pelanggaran")

        tree.column("id_ujian", width=80, anchor="center")
        tree.column("nama_ujian", width=240)
        tree.column("waktu_kirim", width=150, anchor="center")
        tree.column("status_pengiriman", width=130, anchor="center")
        tree.column("nilai", width=100, anchor="center")
        tree.column("status_keputusan", width=160, anchor="center")

        tree.pack(fill=tk.BOTH, expand=True, pady=10)

        def load_hasil():
            for row in tree.get_children():
                tree.delete(row)

            conn = database.get_connection()
            query = """
            SELECT u.id_ujian, u.nama_ujian, b.waktu_pengiriman, b.status_pengiriman, b.total_nilai, b.status_keputusan, b.id_bukti
            FROM bukti_ujian_hasil b
            JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi
            JOIN ujian u ON s.id_ujian = u.id_ujian
            WHERE s.id_mahasiswa = ?
            ORDER BY b.waktu_pengiriman DESC
            """
            rows = conn.execute(query, (self.current_user.id_mahasiswa,)).fetchall()
            for r in rows:
                nilai_txt = f"{r['total_nilai']:.1f}" if r["total_nilai"] is not None else "Belum dinilai"
                tree.insert("", tk.END, values=(
                    r["id_ujian"], r["nama_ujian"], r["waktu_pengiriman"], r["status_pengiriman"],
                    nilai_txt, r["status_keputusan"]
                ), tags=(r["id_bukti"],))
            conn.close()

        load_hasil()

        btn_frame = tk.Frame(parent, bg="#F8FAFC", pady=10)
        btn_frame.pack(fill=tk.X)

        def on_view_receipt():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Pilih salah satu riwayat ujian untuk melihat tanda terima.")
                return
            b_id = tree.item(sel[0])["tags"][0]
            conn = database.get_connection()
            b_row = conn.execute("SELECT * FROM bukti_ujian_hasil WHERE id_bukti = ?", (b_id,)).fetchone()
            conn.close()

            b_obj = models.BuktiUjianDanHasil(
                b_row["id_bukti"], b_row["id_sesi"], b_row["waktu_pengiriman"],
                b_row["status_pengiriman"], b_row["total_nilai"], b_row["status_keputusan"]
            )
            messagebox.showinfo("Bukti Ujian", b_obj.cetak_bukti_ujian())

        ttk.Button(btn_frame, text="📄 Cetak / Tampilkan Bukti Ujian", style="Primary.TButton", command=on_view_receipt).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="🔄 Segarkan Data", command=load_hasil).pack(side=tk.LEFT, padx=10)

    # =========================================================================
    # 4. DASHBOARD DOSEN (Use Case 1.2.6 - 1.2.10)
    # =========================================================================
    def show_dosen_dashboard(self):
        self.clear_container()

        # Top Navigation Bar
        nav_bar = tk.Frame(self.main_container, bg="#1E3A8A", height=60, padx=20)
        nav_bar.pack(fill=tk.X)

        title_lbl = tk.Label(nav_bar, text="SiLab Exam | Portal Dosen Pengampu", font=("Segoe UI", 14, "bold"), fg="#FFFFFF", bg="#1E3A8A")
        title_lbl.pack(side=tk.LEFT, pady=15)

        user_info = tk.Label(nav_bar, text=f"{self.current_user.nama_dosen} ({self.current_user.mata_kuliah})", 
                             font=("Segoe UI", 10), fg="#93C5FD", bg="#1E3A8A")
        user_info.pack(side=tk.RIGHT, padx=15)

        logout_btn = tk.Button(nav_bar, text="Keluar (Logout)", font=("Segoe UI", 9, "bold"), bg="#EF4444", fg="#FFFFFF", 
                               relief="flat", padx=10, pady=4, command=self.show_login_frame)
        logout_btn.pack(side=tk.RIGHT)

        # Tab Notebook Dosen
        notebook = ttk.Notebook(self.main_container)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=15)

        # Tab 1: Kelola Bank Soal (Use Case 1.2.6)
        tab_bank = ttk.Frame(notebook)
        notebook.add(tab_bank, text="  📚 Kelola Bank Soal  ")
        self.build_dosen_bank_soal_tab(tab_bank)

        # Tab 2: Atur Ujian (Use Case 1.2.7)
        tab_atur = ttk.Frame(notebook)
        notebook.add(tab_atur, text="  ⚙️ Atur Ujian  ")
        self.build_dosen_atur_ujian_tab(tab_atur)

        # Tab 3: Kelola Peserta Ujian (Use Case 1.2.8)
        tab_peserta = ttk.Frame(notebook)
        notebook.add(tab_peserta, text="  👥 Kelola Peserta Ujian  ")
        self.build_dosen_peserta_tab(tab_peserta)

        # Tab 4: Tinjau Log & Keputusan Pelanggaran (Use Case 1.2.9 & 1.2.10)
        tab_log = ttk.Frame(notebook)
        notebook.add(tab_log, text="  🚨 Log Pelanggaran & Sanksi  ")
        self.build_dosen_log_tab(tab_log)

    # -------------------------------------------------------------------------
    # DOSEN: KELOLA BANK SOAL (Use Case 1.2.6 & Sequence 3.6)
    # -------------------------------------------------------------------------
    def build_dosen_bank_soal_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Bank Soal Mata Kuliah", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")

        # Split frame kiri (tabel soal) dan kanan (form tambah soal)
        content_frame = tk.Frame(parent, bg="#F8FAFC")
        content_frame.pack(fill=tk.BOTH, expand=True)

        # Kiri: Tabel Soal
        table_frame = tk.Frame(content_frame, bg="#FFFFFF", bd=1, relief="solid", padx=10, pady=10)
        table_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        columns = ("id_soal", "pertanyaan", "kunci")
        tree = ttk.Treeview(table_frame, columns=columns, show="headings", height=12)
        tree.heading("id_soal", text="ID Soal")
        tree.heading("pertanyaan", text="Pertanyaan")
        tree.heading("kunci", text="Kunci Jawaban")

        tree.column("id_soal", width=80, anchor="center")
        tree.column("pertanyaan", width=380)
        tree.column("kunci", width=180)

        tree.pack(fill=tk.BOTH, expand=True)

        def load_soal():
            for row in tree.get_children():
                tree.delete(row)

            conn = database.get_connection()
            rows = conn.execute("""
            SELECT s.id_soal, s.pertanyaan, s.kunci_jawaban
            FROM soal s
            JOIN bank_soal b ON s.id_bank_soal = b.id_bank_soal
            WHERE b.id_dosen = ?
            """, (self.current_user.id_dosen,)).fetchall()
            for r in rows:
                tree.insert("", tk.END, values=(r["id_soal"], r["pertanyaan"], r["kunci_jawaban"]))
            conn.close()

        load_soal()

        # Tombol Hapus Soal (Use Case 1.2.6 Hapus Soal)
        del_btn = ttk.Button(table_frame, text="🗑️ Hapus Soal Terpilih", style="Danger.TButton", 
                             command=lambda: delete_selected_soal())
        del_btn.pack(anchor="w", pady=(10, 0))

        def delete_selected_soal():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Pilih soal yang ingin dihapus.")
                return
            id_soal = tree.item(sel[0])["values"][0]
            if messagebox.askyesno("Konfirmasi", f"Apakah Anda yakin ingin menghapus soal {id_soal}?"):
                conn = database.get_connection()
                conn.execute("DELETE FROM soal WHERE id_soal = ?", (id_soal,))
                conn.commit()
                conn.close()
                messagebox.showinfo("Sukses", "Soal berhasil dihapus dari bank soal.")
                load_soal()

        # Kanan: Form Buat & Tambah Soal Baru (Use Case 1.2.6 Buat Soal, Tambah Soal)
        form_frame = tk.Frame(content_frame, bg="#FFFFFF", bd=1, relief="solid", width=380, padx=15, pady=10)
        form_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        form_frame.pack_propagate(False)

        tk.Label(form_frame, text="Tambah Soal Baru", font=("Segoe UI", 11, "bold"), bg="#FFFFFF", fg="#1E3A8A").pack(anchor="w", pady=(0, 10))

        tk.Label(form_frame, text="Pertanyaan:", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        pertanyaan_text = scrolledtext.ScrolledText(form_frame, font=("Segoe UI", 9), height=4)
        pertanyaan_text.pack(fill=tk.X, pady=(0, 8))

        tk.Label(form_frame, text="Opsi Jawaban A:", font=("Segoe UI", 8), bg="#FFFFFF").pack(anchor="w")
        opsi_a = ttk.Entry(form_frame)
        opsi_a.pack(fill=tk.X, pady=(0, 4))

        tk.Label(form_frame, text="Opsi Jawaban B:", font=("Segoe UI", 8), bg="#FFFFFF").pack(anchor="w")
        opsi_b = ttk.Entry(form_frame)
        opsi_b.pack(fill=tk.X, pady=(0, 4))

        tk.Label(form_frame, text="Opsi Jawaban C:", font=("Segoe UI", 8), bg="#FFFFFF").pack(anchor="w")
        opsi_c = ttk.Entry(form_frame)
        opsi_c.pack(fill=tk.X, pady=(0, 4))

        tk.Label(form_frame, text="Opsi Jawaban D:", font=("Segoe UI", 8), bg="#FFFFFF").pack(anchor="w")
        opsi_d = ttk.Entry(form_frame)
        opsi_d.pack(fill=tk.X, pady=(0, 6))

        tk.Label(form_frame, text="Kunci Jawaban yang Benar:", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        kunci_combo = ttk.Combobox(form_frame, values=["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"], state="readonly")
        kunci_combo.current(0)
        kunci_combo.pack(fill=tk.X, pady=(0, 10))

        def add_new_soal():
            tanya = pertanyaan_text.get("1.0", tk.END).strip()
            oa = opsi_a.get().strip()
            ob = opsi_b.get().strip()
            oc = opsi_c.get().strip()
            od = opsi_d.get().strip()

            if not tanya or not oa or not ob:
                messagebox.showwarning("Peringatan", "Mohon isi pertanyaan dan minimal Opsi A dan B.")
                return

            opsi_list = [oa, ob]
            if oc: opsi_list.append(oc)
            if od: opsi_list.append(od)

            kunci_map = {"Pilihan A": oa, "Pilihan B": ob, "Pilihan C": oc, "Pilihan D": od}
            kunci_val = kunci_map.get(kunci_combo.get(), oa)

            s_id = f"SOAL_{int(datetime.now().timestamp())}_{random.randint(10, 99)}"
            conn = database.get_connection()
            # Ambil bank soal dosen
            bs = conn.execute("SELECT id_bank_soal FROM bank_soal WHERE id_dosen = ?", (self.current_user.id_dosen,)).fetchone()
            if not bs:
                conn.close()
                return

            conn.execute("""
            INSERT INTO soal (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
            VALUES (?, ?, ?, ?, ?)
            """, (s_id, bs["id_bank_soal"], tanya, json.dumps(opsi_list), kunci_val))
            conn.commit()
            conn.close()

            messagebox.showinfo("Sukses", "Soal baru berhasil ditambahkan ke bank soal.")
            pertanyaan_text.delete("1.0", tk.END)
            opsi_a.delete(0, tk.END)
            opsi_b.delete(0, tk.END)
            opsi_c.delete(0, tk.END)
            opsi_d.delete(0, tk.END)
            load_soal()

        ttk.Button(form_frame, text="➕ Simpan Soal ke Bank Soal", style="Primary.TButton", command=add_new_soal).pack(fill=tk.X)

    # -------------------------------------------------------------------------
    # DOSEN: ATUR UJIAN (Use Case 1.2.7 & Sequence 3.7)
    # -------------------------------------------------------------------------
    def build_dosen_atur_ujian_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Konfigurasi Jadwal & Parameter Ujian Baru", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")

        container = tk.Frame(parent, bg="#FFFFFF", bd=1, relief="solid", padx=20, pady=15)
        container.pack(fill=tk.BOTH, expand=True)

        # Form Parameter Ujian
        f_left = tk.Frame(container, bg="#FFFFFF")
        f_left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 20))

        tk.Label(f_left, text="Nama Ujian:", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        nama_entry = ttk.Entry(f_left, font=("Segoe UI", 10))
        nama_entry.pack(fill=tk.X, pady=(0, 8))
        nama_entry.insert(0, "Ujian Akhir Semester (UAS) SAD")

        tk.Label(f_left, text="Durasi Ujian (Menit):", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        durasi_entry = ttk.Entry(f_left, font=("Segoe UI", 10))
        durasi_entry.pack(fill=tk.X, pady=(0, 8))
        durasi_entry.insert(0, "60")

        tk.Label(f_left, text="PIN Ujian (Untuk Akses Mahasiswa):", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        pin_entry = ttk.Entry(f_left, font=("Segoe UI", 10))
        pin_entry.pack(fill=tk.X, pady=(0, 8))
        pin_entry.insert(0, "654321")

        tk.Label(f_left, text="Batas Toleransi Pelanggaran (Anti-Curang):", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w")
        toleransi_entry = ttk.Entry(f_left, font=("Segoe UI", 10))
        toleransi_entry.pack(fill=tk.X, pady=(0, 15))
        toleransi_entry.insert(0, "3")

        # Seleksi Soal dari Bank Soal
        f_right = tk.Frame(container, bg="#FFFFFF")
        f_right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        tk.Label(f_right, text="Pilih Soal yang Dimasukkan ke Ujian:", font=("Segoe UI", 9, "bold"), bg="#FFFFFF").pack(anchor="w", pady=(0, 5))

        soal_listbox = tk.Listbox(f_right, selectmode=tk.MULTIPLE, font=("Segoe UI", 9), height=10)
        soal_listbox.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        soal_ids = []
        conn = database.get_connection()
        s_rows = conn.execute("""
        SELECT s.id_soal, s.pertanyaan FROM soal s
        JOIN bank_soal b ON s.id_bank_soal = b.id_bank_soal
        WHERE b.id_dosen = ?
        """, (self.current_user.id_dosen,)).fetchall()
        for idx, r in enumerate(s_rows):
            soal_ids.append(r["id_soal"])
            soal_listbox.insert(tk.END, f"[{r['id_soal']}] {r['pertanyaan'][:50]}...")
            soal_listbox.select_set(idx) # Default select all
        conn.close()

        def save_ujian():
            nama = nama_entry.get().strip()
            durasi = durasi_entry.get().strip()
            pin = pin_entry.get().strip()
            toleransi = toleransi_entry.get().strip()
            selected_indices = soal_listbox.curselection()

            if not nama or not durasi or not pin:
                messagebox.showwarning("Peringatan", "Mohon lengkapi seluruh field pengaturan ujian.")
                return

            if not selected_indices:
                messagebox.showwarning("Peringatan", "Pilih minimal 1 soal dari bank soal.")
                return

            u_id = f"UJN_{int(datetime.now().timestamp())}"
            now = datetime.now()
            mulai = now.strftime("%Y-%m-%d %H:%M:%S")
            selesai = (now + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")

            conn = database.get_connection()
            conn.execute("""
            INSERT INTO ujian (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, self.current_user.id_dosen, nama, mulai, selesai, int(durasi), pin, int(toleransi)))

            # Hubungkan soal
            for i in selected_indices:
                conn.execute("INSERT INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)", (u_id, soal_ids[i]))

            # Otomatis daftarkan seluruh mahasiswa aktif ke ujian baru ini
            all_mhs = conn.execute("SELECT id_mahasiswa FROM mahasiswa").fetchall()
            for m in all_mhs:
                conn.execute("INSERT OR IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)", (u_id, m["id_mahasiswa"]))

            conn.commit()
            conn.close()

            messagebox.showinfo("Sukses", f"Sesi Ujian '{nama}' berhasil dibuat dan dijadwalkan!\nPIN Ujian: {pin}")

        ttk.Button(f_left, text="💾 Simpan & Aktifkan Jadwal Ujian", style="Primary.TButton", command=save_ujian).pack(fill=tk.X)

    # -------------------------------------------------------------------------
    # DOSEN: KELOLA PESERTA UJIAN (Use Case 1.2.8 & Sequence 3.8)
    # -------------------------------------------------------------------------
    def build_dosen_peserta_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Kelola Daftar Mahasiswa Peserta Ujian", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")

        # Dropdown Pilih Ujian
        select_frame = tk.Frame(parent, bg="#F8FAFC", pady=5)
        select_frame.pack(fill=tk.X)

        tk.Label(select_frame, text="Pilih Ujian:", font=("Segoe UI", 10, "bold"), bg="#F8FAFC").pack(side=tk.LEFT, padx=(0, 10))

        ujian_combo = ttk.Combobox(select_frame, state="readonly", width=40)
        ujian_combo.pack(side=tk.LEFT)

        ujian_map = {}
        conn = database.get_connection()
        u_list = conn.execute("SELECT id_ujian, nama_ujian FROM ujian WHERE id_dosen = ?", (self.current_user.id_dosen,)).fetchall()
        for u in u_list:
            ujian_map[f"{u['id_ujian']} - {u['nama_ujian']}"] = u["id_ujian"]
        conn.close()

        if ujian_map:
            ujian_combo["values"] = list(ujian_map.keys())
            ujian_combo.current(0)

        # Tabel Peserta Ujian
        columns = ("id_mahasiswa", "nim", "nama")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=10)
        tree.heading("id_mahasiswa", text="ID Mahasiswa")
        tree.heading("nim", text="NIM")
        tree.heading("nama", text="Nama Mahasiswa")

        tree.column("id_mahasiswa", width=100, anchor="center")
        tree.column("nim", width=150, anchor="center")
        tree.column("nama", width=350)
        tree.pack(fill=tk.BOTH, expand=True, pady=10)

        def load_peserta(event=None):
            for row in tree.get_children():
                tree.delete(row)

            selected_str = ujian_combo.get()
            if not selected_str:
                return

            u_id = ujian_map[selected_str]
            conn = database.get_connection()
            rows = conn.execute("""
            SELECT m.id_mahasiswa, m.nim, m.nama
            FROM peserta_ujian pu
            JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
            WHERE pu.id_ujian = ?
            """, (u_id,)).fetchall()
            for r in rows:
                tree.insert("", tk.END, values=(r["id_mahasiswa"], r["nim"], r["nama"]))
            conn.close()

        ujian_combo.bind("<<ComboboxSelected>>", load_peserta)
        load_peserta()

        # Action Buttons
        btn_frame = tk.Frame(parent, bg="#F8FAFC", pady=5)
        btn_frame.pack(fill=tk.X)

        def remove_peserta():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Pilih peserta yang ingin dihapus.")
                return
            m_id = tree.item(sel[0])["values"][0]
            u_id = ujian_map[ujian_combo.get()]

            conn = database.get_connection()
            conn.execute("DELETE FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?", (u_id, m_id))
            conn.commit()
            conn.close()
            messagebox.showinfo("Sukses", "Peserta berhasil dihapus dari sesi ujian.")
            load_peserta()

        ttk.Button(btn_frame, text="🗑️ Hapus Peserta Terpilih", style="Danger.TButton", command=remove_peserta).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="🔄 Segarkan Data", command=load_peserta).pack(side=tk.LEFT, padx=10)

    # -------------------------------------------------------------------------
    # DOSEN: TINJAU LOG PELANGGARAN & TETAPKAN KEPUTUSAN (Use Case 1.2.9 & 1.2.10)
    # -------------------------------------------------------------------------
    def build_dosen_log_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="Log Pelanggaran Anti-Curang & Penetapan Keputusan", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")

        content_box = tk.Frame(parent, bg="#F8FAFC")
        content_box.pack(fill=tk.BOTH, expand=True)

        # Kiri: Tabel Log Pelanggaran
        left_box = tk.Frame(content_box, bg="#FFFFFF", bd=1, relief="solid", padx=10, pady=10)
        left_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        columns = ("id_sesi", "mahasiswa", "jenis", "waktu", "total_pelanggaran", "status_sesi")
        tree = ttk.Treeview(left_box, columns=columns, show="headings", height=12)
        tree.heading("id_sesi", text="ID Sesi")
        tree.heading("mahasiswa", text="Mahasiswa (NIM)")
        tree.heading("jenis", text="Jenis Pelanggaran")
        tree.heading("waktu", text="Waktu Kejadian")
        tree.heading("total_pelanggaran", text="Akumulasi")
        tree.heading("status_sesi", text="Status Sesi")

        tree.column("id_sesi", width=90, anchor="center")
        tree.column("mahasiswa", width=180)
        tree.column("jenis", width=130, anchor="center")
        tree.column("waktu", width=140, anchor="center")
        tree.column("total_pelanggaran", width=80, anchor="center")
        tree.column("status_sesi", width=100, anchor="center")

        tree.pack(fill=tk.BOTH, expand=True)

        def load_logs():
            for row in tree.get_children():
                tree.delete(row)

            conn = database.get_connection()
            query = """
            SELECT l.id_sesi, m.nama, m.nim, l.jenis_pelanggaran, l.waktu_kejadian, l.jumlah_pelanggaran, s.status_ujian
            FROM log_pelanggaran l
            JOIN sesi_ujian_mahasiswa s ON l.id_sesi = s.id_sesi
            JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
            JOIN ujian u ON s.id_ujian = u.id_ujian
            WHERE u.id_dosen = ?
            ORDER BY l.waktu_kejadian DESC
            """
            rows = conn.execute(query, (self.current_user.id_dosen,)).fetchall()
            for r in rows:
                tree.insert("", tk.END, values=(
                    r["id_sesi"], f"{r['nama']} ({r['nim']})", r["jenis_pelanggaran"],
                    r["waktu_kejadian"], r["jumlah_pelanggaran"], r["status_ujian"]
                ))
            conn.close()

        load_logs()

        # Kanan: Panel Tetapkan Keputusan Pelanggaran (Use Case 1.2.10 & Sequence 3.10)
        right_box = tk.Frame(content_box, bg="#FFFFFF", bd=1, relief="solid", width=340, padx=15, pady=15)
        right_box.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        right_box.pack_propagate(False)

        tk.Label(right_box, text="Tetapkan Keputusan Sanksi", font=("Segoe UI", 11, "bold"), bg="#FFFFFF", fg="#1E3A8A").pack(anchor="w", pady=(0, 10))

        tk.Label(right_box, text="Pilih entri log di tabel, lalu tentukan sanksi:", font=("Segoe UI", 8), bg="#FFFFFF", fg="#64748B").pack(anchor="w", pady=(0, 10))

        keputusan_var = tk.StringVar(value="Peringatan")
        tk.Radiobutton(right_box, text="1. Peringatan Tertulis", value="Peringatan", variable=keputusan_var, bg="#FFFFFF", font=("Segoe UI", 9)).pack(anchor="w", pady=3)
        tk.Radiobutton(right_box, text="2. Pengurangan Nilai (-20%)", value="Pengurangan Nilai", variable=keputusan_var, bg="#FFFFFF", font=("Segoe UI", 9)).pack(anchor="w", pady=3)
        tk.Radiobutton(right_box, text="3. Diskualifikasi (Nilai 0)", value="Diskualifikasi", variable=keputusan_var, bg="#FFFFFF", font=("Segoe UI", 9)).pack(anchor="w", pady=3)

        tk.Label(right_box, text="Catatan / Keterangan Sanksi:", font=("Segoe UI", 8, "bold"), bg="#FFFFFF").pack(anchor="w", pady=(15, 2))
        catatan_entry = ttk.Entry(right_box)
        catatan_entry.pack(fill=tk.X, pady=(0, 15))
        catatan_entry.insert(0, "Terbukti berpindah window/tab saat ujian berlangsung.")

        def apply_decision():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Silakan klik salah satu baris log di tabel terlebih dahulu.")
                return

            id_sesi = tree.item(sel[0])["values"][0]
            keputusan = keputusan_var.get()

            conn = database.get_connection()
            # Ambil bukti ujian terkait
            b_row = conn.execute("SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?", (id_sesi,)).fetchone()
            if not b_row:
                conn.close()
                messagebox.showinfo("Info", "Mahasiswa belum menyelesaikan/submit ujian ini.")
                return

            nilai_lama = b_row["total_nilai"] if b_row["total_nilai"] is not None else 100.0
            if keputusan == "Diskualifikasi":
                nilai_baru = 0.0
            elif keputusan == "Pengurangan Nilai":
                nilai_baru = max(0.0, nilai_lama - 20.0)
            else:
                nilai_baru = nilai_lama

            conn.execute("""
            UPDATE bukti_ujian_hasil 
            SET total_nilai = ?, status_keputusan = ?
            WHERE id_sesi = ?
            """, (nilai_baru, keputusan, id_sesi))
            conn.commit()
            conn.close()

            messagebox.showinfo("Keputusan Ditetapkan", 
                                f"Keputusan '{keputusan}' berhasil diterapkan untuk sesi {id_sesi}.\nNilai akhir diperbarui menjadi: {nilai_baru}")
            load_logs()

        ttk.Button(right_box, text="⚖️ Simpan Keputusan & Perbarui Status", style="Danger.TButton", command=apply_decision).pack(fill=tk.X, pady=10)
        ttk.Button(right_box, text="🔄 Segarkan Data Log", command=load_logs).pack(fill=tk.X)


if __name__ == "__main__":
    app = SiLabApp()
    app.mainloop()

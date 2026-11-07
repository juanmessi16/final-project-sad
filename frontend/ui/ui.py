"""
ui.py - Antarmuka Pengguna (UI) Desktop Berbasis Python (Tkinter/TTK Redesign)
Sistem Ujian Berbasis Web dengan Fitur Anti-Curang (SiLab Exam System)
Fakultas Ilmu Komputer, Universitas Klabat

Peran: System Analyst / UI-UX Designer (Valentino Sumual)
Sesuai dengan:
- Dokumentasi Requirement SRS & UML System Analysis & Design
- Modul Anti-Cheating (Visibility Listener & Copy-Paste Guard)
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
        self.title("SiLab Exam System - Fakultas Ilmu Komputer UNKLAB")
        self.geometry("1120x740")
        self.minsize(980, 640)
        self.configure(bg="#F1F5F9")

        # Inisialisasi Database
        database.init_db()

        # State Aplikasi
        self.current_user = None
        self.active_session = None
        self.anti_cheat = None
        self.exam_timer_id = None
        self.current_exam_questions = []
        self.current_question_index = 0
        self.student_answers = {}
        self.warning_modal_active = False

        self.setup_styles()

        self.main_container = tk.Frame(self, bg="#F1F5F9")
        self.main_container.pack(fill=tk.BOTH, expand=True)

        self.show_login_frame()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", font=("Segoe UI", 10))
        style.configure("TLabel", background="#FFFFFF", foreground="#1E293B")
        style.configure("TFrame", background="#F8FAFC")
        
        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"), background="#2563EB", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Primary.TButton", background=[("active", "#1D4ED8"), ("disabled", "#94A3B8")])

        style.configure("Danger.TButton", font=("Segoe UI", 10, "bold"), background="#DC2626", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Danger.TButton", background=[("active", "#B91C1C")])

        style.configure("Success.TButton", font=("Segoe UI", 10, "bold"), background="#16A34A", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Success.TButton", background=[("active", "#15803D")])

        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), background="#E2E8F0", foreground="#0F172A")
        style.configure("Treeview", font=("Segoe UI", 9), rowheight=28)

    def clear_container(self):
        if self.exam_timer_id:
            self.after_cancel(self.exam_timer_id)
            self.exam_timer_id = None

        self.unbind("<FocusOut>")
        self.unbind("<Control-c>")
        self.unbind("<Control-v>")
        self.unbind("<Control-x>")

        for widget in self.main_container.winfo_children():
            widget.destroy()

    # =========================================================================
    # 1. USE CASE: MELAKUKAN LOGIN
    # =========================================================================
    def show_login_frame(self):
        self.clear_container()

        wrapper = tk.Frame(self.main_container, bg="#F1F5F9")
        wrapper.place(relx=0.5, rely=0.5, anchor="center")

        shadow_border = tk.Frame(wrapper, bg="#CBD5E1", padx=1, pady=1)
        shadow_border.pack()

        main_card = tk.Frame(shadow_border, bg="#FFFFFF", width=940, height=590)
        main_card.pack()
        main_card.pack_propagate(False)

        # Hero Left Branding
        hero_left = tk.Frame(main_card, bg="#0F2756", width=390, padx=30, pady=32)
        hero_left.pack(side=tk.LEFT, fill=tk.BOTH)
        hero_left.pack_propagate(False)

        badge_frame = tk.Frame(hero_left, bg="#1E3A8A", padx=10, pady=4)
        badge_frame.pack(anchor="w", pady=(0, 4))
        tk.Label(badge_frame, text="🏛️  FAKULTAS ILMU KOMPUTER", font=("Segoe UI", 8, "bold"), fg="#93C5FD", bg="#1E3A8A").pack()
        tk.Label(hero_left, text="UNIVERSITAS KLABAT", font=("Segoe UI", 9, "bold"), fg="#E2E8F0", bg="#0F2756").pack(anchor="w", pady=(0, 24))

        tk.Label(hero_left, text="🛡️ SiLab Exam", font=("Segoe UI", 24, "bold"), fg="#FFFFFF", bg="#0F2756").pack(anchor="w")
        tk.Label(hero_left, text="Sistem Ujian Terintegrasi dengan\nProteksi Anti-Curang Real-Time", 
                 font=("Segoe UI", 9), fg="#93C5FD", bg="#0F2756", justify="left").pack(anchor="w", pady=(4, 24))

        features = [
            ("🛡️  Anti-Cheat Engine", "Monitor fokus browser & blokir copy-paste"),
            ("⚡  Auto-Save Jawaban", "Jawaban tersimpan aman setiap detik ke DB"),
            ("🔑  Verifikasi PIN Sesi", "Akses teratur sesuai jadwal & token pengawas")
        ]
        for ft, fd in features:
            f_box = tk.Frame(hero_left, bg="#163366", padx=12, pady=8)
            f_box.pack(fill=tk.X, pady=4)
            tk.Label(f_box, text=ft, font=("Segoe UI", 9, "bold"), fg="#FFFFFF", bg="#163366").pack(anchor="w")
            tk.Label(f_box, text=fd, font=("Segoe UI", 8), fg="#BFDBFE", bg="#163366").pack(anchor="w")

        footer_frame = tk.Frame(hero_left, bg="#0F2756")
        footer_frame.pack(side=tk.BOTTOM, fill=tk.X)
        tk.Label(footer_frame, text="● Server Status: Online", font=("Segoe UI", 8, "bold"), fg="#34D399", bg="#0F2756").pack(anchor="w")

        # Form Right
        form_right = tk.Frame(main_card, bg="#FFFFFF", padx=36, pady=28)
        form_right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        tk.Label(form_right, text="Selamat Datang! 👋", font=("Segoe UI", 18, "bold"), fg="#0F172A", bg="#FFFFFF").pack(anchor="w", pady=(0, 2))
        tk.Label(form_right, text="Silakan pilih jenis peran dan masukkan kredensial akun.", 
                 font=("Segoe UI", 9), fg="#64748B", bg="#FFFFFF").pack(anchor="w", pady=(0, 16))

        role_var = tk.StringVar(value="Mahasiswa")
        tab_container = tk.Frame(form_right, bg="#F1F5F9", padx=3, pady=3)
        tab_container.pack(fill=tk.X, pady=(0, 16))

        btn_mhs_opt = tk.Button(tab_container, text="👨‍🎓 Login Mahasiswa", font=("Segoe UI", 9, "bold"),
                                bg="#2563EB", fg="#FFFFFF", relief="flat", bd=0, padx=12, pady=7, cursor="hand2")
        btn_mhs_opt.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)

        btn_dos_opt = tk.Button(tab_container, text="👨‍🏫 Login Dosen", font=("Segoe UI", 9, "bold"),
                                bg="#F1F5F9", fg="#64748B", relief="flat", bd=0, padx=12, pady=7, cursor="hand2")
        btn_dos_opt.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=2)

        user_label = tk.Label(form_right, text="👤 Nomor Induk Mahasiswa (NIM):", font=("Segoe UI", 9, "bold"), bg="#FFFFFF", fg="#334155")
        user_label.pack(anchor="w", pady=(0, 4))
        
        user_entry = ttk.Entry(form_right, font=("Segoe UI", 10))
        user_entry.pack(fill=tk.X, pady=(0, 12))
        user_entry.insert(0, "105022410021")

        pwd_label = tk.Label(form_right, text="🔑 Password Akun:", font=("Segoe UI", 9, "bold"), bg="#FFFFFF", fg="#334155")
        pwd_label.pack(anchor="w", pady=(0, 4))

        pwd_entry = ttk.Entry(form_right, font=("Segoe UI", 10), show="•")
        pwd_entry.pack(fill=tk.X, pady=(0, 16))
        pwd_entry.insert(0, "123")

        error_card = tk.Frame(form_right, bg="#FEE2E2", highlightbackground="#FCA5A5", highlightthickness=1, padx=10, pady=6)
        error_lbl = tk.Label(error_card, text="", font=("Segoe UI", 8, "bold"), fg="#991B1B", bg="#FEE2E2", wraplength=400, justify="left")
        error_lbl.pack(anchor="w")

        def show_error(msg):
            error_lbl.config(text="⚠️ " + msg)
            error_card.pack(fill=tk.X, pady=(0, 10), before=login_btn)

        def clear_error():
            error_lbl.config(text="")
            error_card.pack_forget()

        def select_role(role):
            role_var.set(role)
            clear_error()
            if role == "Mahasiswa":
                btn_mhs_opt.config(bg="#2563EB", fg="#FFFFFF")
                btn_dos_opt.config(bg="#F1F5F9", fg="#64748B")
                user_label.config(text="👤 Nomor Induk Mahasiswa (NIM):")
                user_entry.delete(0, tk.END)
                user_entry.insert(0, "105022410021")
                pwd_entry.delete(0, tk.END)
                pwd_entry.insert(0, "123")
                login_btn.config(text="Masuk sebagai Mahasiswa ➔", bg="#2563EB")
            else:
                btn_mhs_opt.config(bg="#F1F5F9", fg="#64748B")
                btn_dos_opt.config(bg="#059669", fg="#FFFFFF")
                user_label.config(text="👤 Username Dosen / NIP:")
                user_entry.delete(0, tk.END)
                user_entry.insert(0, "dosen")
                pwd_entry.delete(0, tk.END)
                pwd_entry.insert(0, "dosen123")
                login_btn.config(text="Masuk sebagai Dosen ➔", bg="#059669")

        btn_mhs_opt.config(command=lambda: select_role("Mahasiswa"))
        btn_dos_opt.config(command=lambda: select_role("Dosen"))

        def handle_login(event=None):
            u_val = user_entry.get().strip()
            p_val = pwd_entry.get().strip()
            chosen_role = role_var.get()

            if not u_val or not p_val:
                show_error("Mohon isi username/NIM dan password Anda.")
                return

            conn = database.get_connection()
            user_row = conn.execute("SELECT * FROM pengguna WHERE username = ?", (u_val,)).fetchone()

            if not user_row or user_row["password"] != p_val:
                show_error("Kredensial tidak valid: Username atau password salah.")
                conn.close()
                return

            if user_row["role"] != chosen_role:
                show_error(f"Akun terdaftar sebagai {user_row['role']}. Gunakan tab {user_row['role']}.")
                conn.close()
                return

            if user_row["status_akun"] != "Aktif":
                show_error(f"Akses ditolak: Akun berstatus '{user_row['status_akun']}'.")
                conn.close()
                return

            if user_row["role"] == "Mahasiswa":
                mhs_row = conn.execute("SELECT * FROM mahasiswa WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
                self.current_user = models.Mahasiswa(
                    id_pengguna=user_row["id_pengguna"], username=user_row["username"], password=user_row["password"],
                    id_mahasiswa=mhs_row["id_mahasiswa"], nim=mhs_row["nim"], nama=mhs_row["nama"], status_akun=user_row["status_akun"]
                )
                conn.close()
                self.show_mahasiswa_dashboard()
            else:
                dos_row = conn.execute("SELECT * FROM dosen WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
                self.current_user = models.Dosen(
                    id_pengguna=user_row["id_pengguna"], username=user_row["username"], password=user_row["password"],
                    id_dosen=dos_row["id_dosen"], nama_dosen=dos_row["nama_dosen"], mata_kuliah=dos_row["mata_kuliah"], status_akun=user_row["status_akun"]
                )
                conn.close()
                self.show_dosen_dashboard()

        login_btn = tk.Button(form_right, text="Masuk sebagai Mahasiswa ➔", font=("Segoe UI", 10, "bold"),
                              bg="#2563EB", fg="#FFFFFF", relief="flat", bd=0, pady=10, cursor="hand2", command=handle_login)
        login_btn.pack(fill=tk.X, pady=(4, 14))
        self.bind("<Return>", handle_login)

        # Demo Test Accounts Quick Bar
        demo_frame = tk.Frame(form_right, bg="#F8FAFC", bd=1, relief="solid", padx=10, pady=8)
        demo_frame.pack(fill=tk.X)
        tk.Label(demo_frame, text="⚡ Uji Coba Cepat:", font=("Segoe UI", 8, "bold"), bg="#F8FAFC", fg="#64748B").pack(anchor="w", pady=(0, 4))
        
        btn_box = tk.Frame(demo_frame, bg="#F8FAFC")
        btn_box.pack(fill=tk.X)
        tk.Button(btn_box, text="Juan (Mhs)", font=("Segoe UI", 8), command=lambda: (select_role("Mahasiswa"), user_entry.delete(0, tk.END), user_entry.insert(0, "105022410021"))).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_box, text="George (Dosen)", font=("Segoe UI", 8), command=lambda: (select_role("Dosen"), user_entry.delete(0, tk.END), user_entry.insert(0, "dosen"))).pack(side=tk.LEFT, padx=2)

    # =========================================================================
    # 2. DASHBOARD MAHASISWA & PIN VERIFICATION
    # =========================================================================
    def show_mahasiswa_dashboard(self):
        self.clear_container()
        self.unbind("<Return>")

        nav_bar = tk.Frame(self.main_container, bg="#1E3A8A", height=60, padx=20)
        nav_bar.pack(fill=tk.X)

        tk.Label(nav_bar, text="SiLab Exam | Portal Mahasiswa", font=("Segoe UI", 14, "bold"), fg="#FFFFFF", bg="#1E3A8A").pack(side=tk.LEFT, pady=15)
        tk.Label(nav_bar, text=f"{self.current_user.nama} ({self.current_user.nim})", font=("Segoe UI", 10), fg="#93C5FD", bg="#1E3A8A").pack(side=tk.RIGHT, padx=15)
        
        tk.Button(nav_bar, text="Keluar", font=("Segoe UI", 9, "bold"), bg="#EF4444", fg="#FFFFFF", relief="flat", padx=10, pady=4, command=self.show_login_frame).pack(side=tk.RIGHT)

        notebook = ttk.Notebook(self.main_container)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=15)

        tab_ujian = ttk.Frame(notebook)
        notebook.add(tab_ujian, text="  📝 Ujian Tersedia  ")
        self.build_mahasiswa_ujian_tab(tab_ujian)

        tab_hasil = ttk.Frame(notebook)
        notebook.add(tab_hasil, text="  📊 Hasil & Tanda Terima  ")
        self.build_mahasiswa_hasil_tab(tab_hasil)

    def build_mahasiswa_ujian_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)
        tk.Label(top_frame, text="Daftar Sesi Ujian Aktif", font=("Segoe UI", 13, "bold"), bg="#F8FAFC", fg="#1E293B").pack(anchor="w")

        columns = ("id_ujian", "nama_ujian", "dosen", "durasi", "jadwal_mulai", "status")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=8)
        tree.heading("id_ujian", text="ID Ujian")
        tree.heading("nama_ujian", text="Nama Ujian")
        tree.heading("dosen", text="Dosen Pengampu")
        tree.heading("durasi", text="Durasi")
        tree.heading("jadwal_mulai", text="Mulai")
        tree.heading("status", text="Status Sesi")

        tree.column("id_ujian", width=90, anchor="center")
        tree.column("nama_ujian", width=260)
        tree.column("dosen", width=180)
        tree.column("durasi", width=90, anchor="center")
        tree.column("jadwal_mulai", width=140, anchor="center")
        tree.column("status", width=120, anchor="center")
        tree.pack(fill=tk.BOTH, expand=True, pady=10)

        def refresh_list():
            for row in tree.get_children():
                tree.delete(row)

            conn = database.get_connection()
            query = """
            SELECT u.id_ujian, u.nama_ujian, d.nama_dosen, u.durasi, u.tanggal_waktu_mulai, s.status_ujian
            FROM ujian u
            JOIN dosen d ON u.id_dosen = d.id_dosen
            JOIN peserta_ujian pu ON u.id_ujian = pu.id_ujian
            LEFT JOIN sesi_ujian_mahasiswa s ON u.id_ujian = s.id_ujian AND s.id_mahasiswa = ?
            WHERE pu.id_mahasiswa = ?
            """
            rows = conn.execute(query, (self.current_user.id_mahasiswa, self.current_user.id_mahasiswa)).fetchall()
            for r in rows:
                st = r["status_ujian"] if r["status_ujian"] else "Belum Mengikuti"
                tree.insert("", tk.END, values=(r["id_ujian"], r["nama_ujian"], r["nama_dosen"], f"{r['durasi']} Menit", r["tanggal_waktu_mulai"], st))
            conn.close()

        refresh_list()

        def on_mulai():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Pilih ujian dari tabel.")
                return
            item = tree.item(sel[0])
            u_id = item["values"][0]
            st = item["values"][5]

            if st in ["Selesai", "Disubmit Otomatis", "Dikunci Paksa"]:
                messagebox.showinfo("Informasi", f"Anda sudah menyelesaikan ujian ini dengan status '{st}'.")
                return

            self.show_pin_verification_dialog(u_id)

        btn_bar = tk.Frame(parent, bg="#F8FAFC", pady=5)
        btn_bar.pack(fill=tk.X)
        ttk.Button(btn_bar, text="🔑 Verifikasi PIN & Masuk Ruang Ujian", style="Primary.TButton", command=on_mulai).pack(side=tk.LEFT)

    def show_pin_verification_dialog(self, id_ujian):
        pin_win = tk.Toplevel(self)
        pin_win.title("Verifikasi PIN Sesi Ujian")
        pin_win.geometry("400x240")
        pin_win.resizable(False, False)
        pin_win.grab_set()

        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()
        conn.close()

        tk.Label(pin_win, text="Masukkan PIN Ujian", font=("Segoe UI", 12, "bold"), fg="#1E3A8A").pack(pady=(15, 5))
        tk.Label(pin_win, text=f"Sesi: {ujian['nama_ujian']}", font=("Segoe UI", 9)).pack()

        pin_entry = ttk.Entry(pin_win, font=("Segoe UI", 12, "bold"), justify="center")
        pin_entry.pack(pady=12, ipadx=10, ipady=3)
        pin_entry.focus()

        err_lbl = tk.Label(pin_win, text="", font=("Segoe UI", 8, "bold"), fg="#DC2626")
        err_lbl.pack(pady=2)

        def verify():
            val = pin_entry.get().strip()
            if val != ujian["pin_ujian"]:
                err_lbl.config(text="⚠️ PIN Ujian Tidak Valid! Periksa kembali PIN dari dosen.")
                return
            pin_win.destroy()
            self.start_exam_session(id_ujian)

        ttk.Button(pin_win, text="Verifikasi ▶", style="Primary.TButton", command=verify).pack(pady=10)

    # =========================================================================
    # 3. RUANG UJIAN & FITUR ANTI-CURANG
    # =========================================================================
    def start_exam_session(self, id_ujian):
        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()

        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?",
                            (id_ujian, self.current_user.id_mahasiswa)).fetchone()

        if sesi:
            id_sesi = sesi["id_sesi"]
            sisa_waktu = sesi["sisa_waktu"]
            waktu_mulai = sesi["waktu_mulai"]
            jml_warn = sesi["jumlah_peringatan"]
            st_ujian = sesi["status_ujian"]
        else:
            id_sesi = f"SESI_{int(datetime.now().timestamp())}"
            sisa_waktu = ujian["durasi"] * 60
            waktu_mulai = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            jml_warn = 0
            st_ujian = "Berlangsung"
            conn.execute("""
            INSERT INTO sesi_ujian_mahasiswa (id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu, jumlah_peringatan, status_ujian)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (id_sesi, id_ujian, self.current_user.id_mahasiswa, waktu_mulai, sisa_waktu, jml_warn, st_ujian))
            conn.commit()

        soal_rows = conn.execute("""
        SELECT s.id_soal, s.pertanyaan, s.opsi_jawaban, s.kunci_jawaban
        FROM ujian_soal us
        JOIN soal s ON us.id_soal = s.id_soal
        WHERE us.id_ujian = ?
        """, (id_ujian,)).fetchall()

        saved = conn.execute("SELECT id_soal, jawaban_dipilih FROM jawaban_mahasiswa WHERE id_sesi = ?", (id_sesi,)).fetchall()
        self.student_answers = {r["id_soal"]: r["jawaban_dipilih"] for r in saved}
        conn.close()

        self.active_session = models.SesiUjianMahasiswa(id_sesi, id_ujian, self.current_user.id_mahasiswa, waktu_mulai, sisa_waktu, st_ujian, jml_warn)
        self.anti_cheat = models.SistemAntiCurang(batas_toleransi_pelanggaran=ujian["batas_toleransi_pelanggaran"])
        self.anti_cheat.jumlah_peringatan = jml_warn

        self.current_exam_questions = []
        for r in soal_rows:
            s_obj = models.Soal(r["id_soal"], None, r["pertanyaan"], r["opsi_jawaban"], r["kunci_jawaban"])
            shuffled = s_obj.acak_soal_dan_opsi()
            self.current_exam_questions.append({"id_soal": s_obj.id_soal, "pertanyaan": s_obj.pertanyaan, "opsi_jawaban": shuffled, "kunci_jawaban": s_obj.kunci_jawaban})
        random.shuffle(self.current_exam_questions)

        self.current_question_index = 0
        self.show_ruang_ujian_frame(ujian)

    def show_ruang_ujian_frame(self, ujian):
        self.clear_container()

        top_bar = tk.Frame(self.main_container, bg="#0F172A", height=60, padx=20)
        top_bar.pack(fill=tk.X)

        tk.Label(top_bar, text=f"UJIAN: {ujian['nama_ujian']}", font=("Segoe UI", 12, "bold"), fg="#FFFFFF", bg="#0F172A").pack(side=tk.LEFT, pady=15)
        tk.Label(top_bar, text="🟢 Auto-Save Real-Time", font=("Segoe UI", 9), fg="#34D399", bg="#0F172A").pack(side=tk.LEFT, padx=20)

        self.warning_badge = tk.Label(top_bar, text=f"Peringatan: {self.anti_cheat.jumlah_peringatan}/{self.anti_cheat.batas_toleransi_pelanggaran}", 
                                      font=("Segoe UI", 10, "bold"), fg="#FCD34D", bg="#1E293B", padx=10, pady=4)
        self.warning_badge.pack(side=tk.RIGHT, padx=15)

        self.timer_label = tk.Label(top_bar, text="Sisa Waktu: --:--", font=("Consolas", 13, "bold"), fg="#38BDF8", bg="#0F172A")
        self.timer_label.pack(side=tk.RIGHT, padx=15)

        work_frame = tk.Frame(self.main_container, bg="#F1F5F9", padx=20, pady=15)
        work_frame.pack(fill=tk.BOTH, expand=True)

        soal_card = tk.Frame(work_frame, bg="#FFFFFF", bd=1, relief="solid", padx=25, pady=20)
        soal_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.soal_num_lbl = tk.Label(soal_card, text="", font=("Segoe UI", 11, "bold"), fg="#1E3A8A", bg="#FFFFFF")
        self.soal_num_lbl.pack(anchor="w", pady=(0, 10))

        self.soal_txt_lbl = tk.Label(soal_card, text="", font=("Segoe UI", 11), fg="#0F172A", bg="#FFFFFF", wraplength=580, justify="left")
        self.soal_txt_lbl.pack(anchor="w", pady=(0, 20))

        self.selected_opt_var = tk.StringVar(value="")
        self.options_frame = tk.Frame(soal_card, bg="#FFFFFF")
        self.options_frame.pack(fill=tk.X, pady=(0, 20))

        nav_btns = tk.Frame(soal_card, bg="#FFFFFF")
        nav_btns.pack(fill=tk.X, side=tk.BOTTOM)

        self.prev_btn = ttk.Button(nav_btns, text="◀ Prev", command=self.prev_question)
        self.prev_btn.pack(side=tk.LEFT)
        self.next_btn = ttk.Button(nav_btns, text="Next ▶", command=self.next_question)
        self.next_btn.pack(side=tk.LEFT, padx=10)

        grid_card = tk.Frame(work_frame, bg="#FFFFFF", bd=1, relief="solid", width=200, padx=15, pady=20)
        grid_card.pack(side=tk.RIGHT, fill=tk.Y, padx=(15, 0))
        grid_card.pack_propagate(False)

        tk.Label(grid_card, text="Nomor Soal", font=("Segoe UI", 10, "bold"), bg="#FFFFFF").pack(anchor="w", pady=(0, 10))
        self.grid_box = tk.Frame(grid_card, bg="#FFFFFF")
        self.grid_box.pack(fill=tk.BOTH, expand=True)

        ttk.Button(grid_card, text="💾 Kirim Jawaban", style="Success.TButton", command=self.confirm_submit).pack(fill=tk.X, side=tk.BOTTOM)

        self.setup_anti_cheat_listeners()
        self.render_current_question()
        self.update_exam_timer()

    def render_current_question(self):
        q = self.current_exam_questions[self.current_question_index]
        self.soal_num_lbl.config(text=f"Soal No. {self.current_question_index + 1} / {len(self.current_exam_questions)}")
        self.soal_txt_lbl.config(text=q["pertanyaan"])

        for w in self.options_frame.winfo_children():
            w.destroy()

        cur_ans = self.student_answers.get(q["id_soal"], "")
        self.selected_opt_var.set(cur_ans)

        for opt in q["opsi_jawaban"]:
            rb = tk.Radiobutton(self.options_frame, text=opt, value=opt, variable=self.selected_opt_var,
                                font=("Segoe UI", 10), bg="#FFFFFF", fg="#1E293B",
                                command=lambda o=opt: self.on_answer(q["id_soal"], o))
            rb.pack(anchor="w", pady=4)

        self.render_grid()

    def render_grid(self):
        for w in self.grid_box.winfo_children():
            w.destroy()
        cols = 3
        for idx, q in enumerate(self.current_exam_questions):
            ans = q["id_soal"] in self.student_answers and self.student_answers[q["id_soal"]] != ""
            is_cur = idx == self.current_question_index
            bg_col = "#2563EB" if is_cur else ("#16A34A" if ans else "#E2E8F0")
            fg_col = "#FFFFFF" if (is_cur or ans) else "#0F172A"

            b = tk.Button(self.grid_box, text=str(idx + 1), font=("Segoe UI", 9, "bold"), width=4,
                          bg=bg_col, fg=fg_col, relief="flat", command=lambda i=idx: self.go_to_q(i))
            b.grid(row=idx//cols, column=idx%cols, padx=3, pady=3)

    def go_to_q(self, i):
        self.current_question_index = i
        self.render_current_question()

    def next_question(self):
        if self.current_question_index < len(self.current_exam_questions) - 1:
            self.current_question_index += 1
            self.render_current_question()

    def prev_question(self):
        if self.current_question_index > 0:
            self.current_question_index -= 1
            self.render_current_question()

    def on_answer(self, id_soal, val):
        self.student_answers[id_soal] = val
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = database.get_connection()
        ex = conn.execute("SELECT id_jawaban FROM jawaban_mahasiswa WHERE id_sesi = ? AND id_soal = ?", (self.active_session.id_sesi, id_soal)).fetchone()
        if ex:
            conn.execute("UPDATE jawaban_mahasiswa SET jawaban_dipilih = ?, waktu_disimpan = ? WHERE id_jawaban = ?", (val, w_str, ex["id_jawaban"]))
        else:
            j_id = f"JAW_{int(datetime.now().timestamp())}_{random.randint(100, 999)}"
            conn.execute("INSERT INTO jawaban_mahasiswa VALUES (?, ?, ?, ?, ?, ?)", (j_id, self.active_session.id_sesi, id_soal, val, self.current_question_index + 1, w_str))
        conn.commit()
        conn.close()
        self.render_grid()

    def update_exam_timer(self):
        if self.active_session.status_ujian != "Berlangsung": return
        self.active_session.sisa_waktu -= 1

        if self.active_session.sisa_waktu <= 0:
            self.finalize_submission("Disubmit Otomatis")
            return

        m, s = self.active_session.sisa_waktu // 60, self.active_session.sisa_waktu % 60
        self.timer_label.config(text=f"Sisa Waktu: {m:02d}:{s:02d}")
        self.exam_timer_id = self.after(1000, self.update_exam_timer)

    # -------------------------------------------------------------------------
    # ANTI-CHEATING ENGINE & LOCKOUT
    # -------------------------------------------------------------------------
    def setup_anti_cheat_listeners(self):
        self.bind("<FocusOut>", lambda e: self.record_violation("Pindah Tab"))
        self.bind("<Control-c>", lambda e: self.record_violation("Copy-Paste"))
        self.bind("<Control-v>", lambda e: self.record_violation("Copy-Paste"))

    def record_violation(self, jenis):
        if self.active_session.status_ujian != "Berlangsung" or self.warning_modal_active: return

        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.anti_cheat.jumlah_peringatan += 1
        log_id = f"LOG_{int(datetime.now().timestamp())}_{random.randint(100,999)}"

        conn = database.get_connection()
        conn.execute("INSERT INTO log_pelanggaran VALUES (?, ?, ?, ?, ?)", (log_id, self.active_session.id_sesi, jenis, w_str, self.anti_cheat.jumlah_peringatan))
        conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ? WHERE id_sesi = ?", (self.anti_cheat.jumlah_peringatan, self.active_session.id_sesi))
        conn.commit()
        conn.close()

        self.warning_badge.config(text=f"Peringatan: {self.anti_cheat.jumlah_peringatan}/{self.anti_cheat.batas_toleransi_pelanggaran}", fg="#EF4444")

        if self.anti_cheat.jumlah_peringatan >= self.anti_cheat.batas_toleransi_pelanggaran:
            self.execute_lockout()
        else:
            self.show_warning_popup(jenis)

    def show_warning_popup(self, jenis):
        self.warning_modal_active = True
        w_win = tk.Toplevel(self)
        w_win.title("⚠️ Pelanggaran Terdeteksi!")
        w_win.geometry("420x260")
        w_win.configure(bg="#FFFBEB")
        w_win.grab_set()

        tk.Label(w_win, text="⚠️", font=("Segoe UI", 32), bg="#FFFBEB", fg="#F59E0B").pack(pady=(10, 0))
        tk.Label(w_win, text="Pelanggaran Sistem Terdeteksi!", font=("Segoe UI", 12, "bold"), fg="#92400E", bg="#FFFBEB").pack()
        tk.Label(w_win, text=f"Terdeteksi aksi abnormal: '{jenis}'.", font=("Segoe UI", 9), fg="#B45309", bg="#FFFBEB").pack(pady=4)
        
        badge = tk.Frame(w_win, bg="#FEE2E2", padx=10, pady=4)
        badge.pack(pady=6)
        tk.Label(badge, text=f"Peringatan {self.anti_cheat.jumlah_peringatan} / {self.anti_cheat.batas_toleransi_pelanggaran}", font=("Segoe UI", 10, "bold"), fg="#991B1B", bg="#FEE2E2").pack()

        def close():
            self.warning_modal_active = False
            w_win.destroy()

        ttk.Button(w_win, text="Saya Mengerti & Lanjutkan", style="Primary.TButton", command=close).pack(pady=10)

    def execute_lockout(self):
        self.active_session.status_ujian = "Dikunci Paksa"
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = database.get_connection()
        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = 'Dikunci Paksa' WHERE id_sesi = ?", (self.active_session.id_sesi,))
        bukti_id = f"TRX-EXAM-{random.randint(1000, 9999)}"
        conn.execute("INSERT OR REPLACE INTO bukti_ujian_hasil VALUES (?, ?, ?, 'Dikunci Paksa', 0.0, 'Peringatan')", (bukti_id, self.active_session.id_sesi, w_str))
        conn.commit()
        conn.close()

        self.clear_container()
        self.main_container.configure(bg="#7F1D1D")

        card = tk.Frame(self.main_container, bg="#FFFFFF", padx=30, pady=30, bd=2, relief="solid")
        card.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(card, text="🔒", font=("Segoe UI", 36), fg="#DC2626", bg="#FFFFFF").pack()
        tk.Label(card, text="Sesi Ujian Dikunci Paksa", font=("Segoe UI", 14, "bold"), fg="#DC2626", bg="#FFFFFF").pack(pady=6)
        tk.Label(card, text="Batas toleransi pelanggaran telah terlampaui (3/3).\nJawaban Anda telah dikirim otomatis untuk dievaluasi Dosen.", font=("Segoe UI", 9), bg="#FFFFFF", justify="center").pack(pady=10)
        ttk.Button(card, text="Kembali ke Dashboard", style="Primary.TButton", command=self.show_mahasiswa_dashboard).pack(pady=10)

    def confirm_submit(self):
        if messagebox.askyesno("Konfirmasi", "Yakin ingin menyelesaikan dan mengirim jawaban ujian?"):
            self.finalize_submission("Selesai")

    def finalize_submission(self, status):
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        total = len(self.current_exam_questions)
        benar = sum(1 for q in self.current_exam_questions if self.student_answers.get(q["id_soal"]) == q["kunci_jawaban"])
        nilai = round((benar / total) * 100, 2) if total > 0 else 0.0

        conn = database.get_connection()
        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = ? WHERE id_sesi = ?", (status, self.active_session.id_sesi))
        b_id = f"TRX-EXAM-{random.randint(1000, 9999)}"
        conn.execute("INSERT OR REPLACE INTO bukti_ujian_hasil VALUES (?, ?, ?, ?, ?, 'Tidak Ada')", (b_id, self.active_session.id_sesi, w_str, status, nilai))
        conn.commit()
        conn.close()

        self.show_receipt_screen(b_id, w_str, status, nilai)

    def show_receipt_screen(self, b_id, waktu, status, nilai):
        self.clear_container()
        card = tk.Frame(self.main_container, bg="#FFFFFF", padx=30, pady=25, bd=1, relief="solid")
        card.place(relx=0.5, rely=0.5, anchor="center", width=520)

        tk.Label(card, text="✅ Ujian Berhasil Dikirim!", font=("Segoe UI", 14, "bold"), fg="#16A34A", bg="#FFFFFF").pack(pady=(0, 10))
        b_obj = models.BuktiUjianDanHasil(b_id, self.active_session.id_sesi, waktu, status, nilai)

        txt = scrolledtext.ScrolledText(card, font=("Consolas", 9), width=50, height=10, relief="solid", bd=1)
        txt.pack(pady=10)
        txt.insert(tk.END, b_obj.cetak_bukti_ujian())
        txt.config(state="disabled")

        ttk.Button(card, text="Kembali ke Dashboard", style="Primary.TButton", command=self.show_mahasiswa_dashboard).pack(pady=5)

    def build_mahasiswa_hasil_tab(self, parent):
        columns = ("id_bukti", "nama_ujian", "waktu_kirim", "status", "nilai", "keputusan")
        tree = ttk.Treeview(parent, columns=columns, show="headings", height=8)
        tree.heading("id_bukti", text="ID Bukti")
        tree.heading("nama_ujian", text="Nama Ujian")
        tree.heading("waktu_kirim", text="Waktu Kirim")
        tree.heading("status", text="Status Kirim")
        tree.heading("nilai", text="Nilai")
        tree.heading("keputusan", text="Keputusan Sanksi")
        tree.pack(fill=tk.BOTH, expand=True, pady=10)

        conn = database.get_connection()
        query = """
        SELECT b.id_bukti, u.nama_ujian, b.waktu_pengiriman, b.status_pengiriman, b.total_nilai, b.status_keputusan
        FROM bukti_ujian_hasil b
        JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi
        JOIN ujian u ON s.id_ujian = u.id_ujian
        WHERE s.id_mahasiswa = ?
        """
        rows = conn.execute(query, (self.current_user.id_mahasiswa,)).fetchall()
        for r in rows:
            tree.insert("", tk.END, values=(r["id_bukti"], r["nama_ujian"], r["waktu_pengiriman"], r["status_pengiriman"], r["total_nilai"], r["status_keputusan"]))
        conn.close()

    # =========================================================================
    # 4. DASHBOARD DOSEN & TINJAU LOG PELANGGARAN
    # =========================================================================
    def show_dosen_dashboard(self):
        self.clear_container()

        nav_bar = tk.Frame(self.main_container, bg="#1E3A8A", height=60, padx=20)
        nav_bar.pack(fill=tk.X)

        tk.Label(nav_bar, text="SiLab Exam | Portal Dosen", font=("Segoe UI", 14, "bold"), fg="#FFFFFF", bg="#1E3A8A").pack(side=tk.LEFT, pady=15)
        tk.Label(nav_bar, text=f"{self.current_user.nama_dosen} ({self.current_user.mata_kuliah})", font=("Segoe UI", 10), fg="#93C5FD", bg="#1E3A8A").pack(side=tk.RIGHT, padx=15)
        tk.Button(nav_bar, text="Keluar", font=("Segoe UI", 9, "bold"), bg="#EF4444", fg="#FFFFFF", relief="flat", padx=10, pady=4, command=self.show_login_frame).pack(side=tk.RIGHT)

        notebook = ttk.Notebook(self.main_container)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=15)

        tab_log = ttk.Frame(notebook)
        notebook.add(tab_log, text="  🚨 Log Pelanggaran Anti-Curang & Sanksi  ")
        self.build_dosen_log_tab(tab_log)

    def build_dosen_log_tab(self, parent):
        top_frame = tk.Frame(parent, bg="#F8FAFC", pady=8)
        top_frame.pack(fill=tk.X)
        tk.Label(top_frame, text="Log Pelanggaran Ujian & Penetapan Sanksi", font=("Segoe UI", 12, "bold"), bg="#F8FAFC").pack(anchor="w")

        content_box = tk.Frame(parent, bg="#F8FAFC")
        content_box.pack(fill=tk.BOTH, expand=True)

        table_box = tk.Frame(content_box, bg="#FFFFFF", bd=1, relief="solid", padx=10, pady=10)
        table_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        columns = ("id_sesi", "mahasiswa", "jenis", "waktu", "total", "status_sesi")
        tree = ttk.Treeview(table_box, columns=columns, show="headings", height=10)
        tree.heading("id_sesi", text="ID Sesi")
        tree.heading("mahasiswa", text="Mahasiswa")
        tree.heading("jenis", text="Jenis Pelanggaran")
        tree.heading("waktu", text="Waktu")
        tree.heading("total", text="Akumulasi")
        tree.heading("status_sesi", text="Status Sesi")
        tree.pack(fill=tk.BOTH, expand=True)

        def load_logs():
            for r in tree.get_children(): tree.delete(r)
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
                tree.insert("", tk.END, values=(r["id_sesi"], f"{r['nama']} ({r['nim']})", r["jenis_pelanggaran"], r["waktu_kejadian"], r["jumlah_pelanggaran"], r["status_ujian"]))
            conn.close()

        load_logs()

        side_box = tk.Frame(content_box, bg="#FFFFFF", bd=1, relief="solid", width=320, padx=15, pady=15)
        side_box.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        side_box.pack_propagate(False)

        tk.Label(side_box, text="Tetapkan Keputusan Sanksi", font=("Segoe UI", 11, "bold"), fg="#1E3A8A", bg="#FFFFFF").pack(anchor="w", pady=(0, 10))

        keputusan_var = tk.StringVar(value="Peringatan")
        tk.Radiobutton(side_box, text="1. Peringatan Tertulis", value="Peringatan", variable=keputusan_var, bg="#FFFFFF").pack(anchor="w", pady=2)
        tk.Radiobutton(side_box, text="2. Pengurangan Nilai (-20%)", value="Pengurangan Nilai", variable=keputusan_var, bg="#FFFFFF").pack(anchor="w", pady=2)
        tk.Radiobutton(side_box, text="3. Diskualifikasi (Skor 0)", value="Diskualifikasi", variable=keputusan_var, bg="#FFFFFF").pack(anchor="w", pady=2)

        def apply_sanksi():
            sel = tree.selection()
            if not sel:
                messagebox.showwarning("Peringatan", "Pilih entri log dari tabel.")
                return
            id_sesi = tree.item(sel[0])["values"][0]
            kep = keputusan_var.get()

            conn = database.get_connection()
            b_row = conn.execute("SELECT total_nilai FROM bukti_ujian_hasil WHERE id_sesi = ?", (id_sesi,)).fetchone()
            if not b_row:
                conn.close()
                messagebox.showinfo("Info", "Mahasiswa belum submit ujian ini.")
                return

            n_lama = b_row["total_nilai"] if b_row["total_nilai"] is not None else 100.0
            n_baru = 0.0 if kep == "Diskualifikasi" else (max(0.0, n_lama - 20.0) if kep == "Pengurangan Nilai" else n_lama)

            conn.execute("UPDATE bukti_ujian_hasil SET total_nilai = ?, status_keputusan = ? WHERE id_sesi = ?", (n_baru, kep, id_sesi))
            conn.commit()
            conn.close()

            messagebox.showinfo("Sukses", f"Sanksi '{kep}' diterapkan. Nilai akhir: {n_baru}")
            load_logs()

        ttk.Button(side_box, text="⚖️ Terapkan Keputusan Sanksi", style="Danger.TButton", command=apply_sanksi).pack(fill=tk.X, pady=15)

if __name__ == "__main__":
    app = SiLabApp()
    app.mainloop()
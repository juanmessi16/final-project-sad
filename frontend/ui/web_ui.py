"""
web_ui.py - Server Antarmuka Pengguna (UI) Berbasis Web Menggunakan Python Murni (Standard Library)
Sistem Ujian Berbasis Web dengan Fitur Anti-Curang (SiLab Exam System)
Fakultas Ilmu Komputer, Universitas Klabat

Jalankan:
    python web_ui.py
Lalu buka di browser:
    http://localhost:8000
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import random
from datetime import datetime, timedelta
import database
import models

PORT = 8000

class SiLabWebHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            self.serve_html()
        elif path == "/api/init-data":
            self.api_init_data()
        elif path == "/api/ujian-detail":
            id_ujian = params.get("id_ujian", [""])[0]
            id_mahasiswa = params.get("id_mahasiswa", [""])[0]
            self.api_ujian_detail(id_ujian, id_mahasiswa)
        elif path == "/api/dosen-data":
            id_dosen = params.get("id_dosen", [""])[0]
            self.api_dosen_data(id_dosen)
        elif path == "/api/mahasiswa-hasil":
            id_mahasiswa = params.get("id_mahasiswa", [""])[0]
            self.api_mahasiswa_hasil(id_mahasiswa)
        else:
            self.send_error(404, "Halaman Tidak Ditemukan")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length).decode('utf-8')
        body = json.loads(post_data) if post_data else {}

        if path == "/api/login":
            self.handle_login(body)
        elif path == "/api/verify-pin":
            self.handle_verify_pin(body)
        elif path == "/api/auto-save":
            self.handle_auto_save(body)
        elif path == "/api/log-violation":
            self.handle_log_violation(body)
        elif path == "/api/submit-exam":
            self.handle_submit_exam(body)
        elif path == "/api/add-soal":
            self.handle_add_soal(body)
        elif path == "/api/delete-soal":
            self.handle_delete_soal(body)
        elif path == "/api/create-ujian":
            self.handle_create_ujian(body)
        elif path == "/api/delete-peserta":
            self.handle_delete_peserta(body)
        elif path == "/api/tetapkan-keputusan":
            self.handle_tetapkan_keputusan(body)
        else:
            self.send_error(404, "Endpoint Tidak Ditemukan")

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    # ================= API ENDPOINTS =================
    def handle_login(self, body):
        username = body.get("username", "").strip()
        password = body.get("password", "").strip()

        conn = database.get_connection()
        user_row = conn.execute("SELECT * FROM pengguna WHERE username = ?", (username,)).fetchone()

        if not user_row or user_row["password"] != password:
            conn.close()
            return self.send_json({"success": False, "message": "Username/NIM atau password salah."}, 401)

        if user_row["status_akun"] != "Aktif":
            conn.close()
            return self.send_json({"success": False, "message": f"Akses ditolak: Akun berstatus '{user_row['status_akun']}'."}, 403)

        role = user_row["role"]
        user_data = {
            "id_pengguna": user_row["id_pengguna"],
            "username": user_row["username"],
            "role": role,
            "status_akun": user_row["status_akun"]
        }

        if role == "Mahasiswa":
            mhs = conn.execute("SELECT * FROM mahasiswa WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
            user_data["id_mahasiswa"] = mhs["id_mahasiswa"]
            user_data["nim"] = mhs["nim"]
            user_data["nama"] = mhs["nama"]
        else:
            dos = conn.execute("SELECT * FROM dosen WHERE id_pengguna = ?", (user_row["id_pengguna"],)).fetchone()
            user_data["id_dosen"] = dos["id_dosen"]
            user_data["nama_dosen"] = dos["nama_dosen"]
            user_data["mata_kuliah"] = dos["mata_kuliah"]

        conn.close()
        self.send_json({"success": True, "user": user_data})

    def api_init_data(self):
        conn = database.get_connection()
        ujian_list = conn.execute("""
        SELECT u.*, d.nama_dosen, d.mata_kuliah 
        FROM ujian u 
        JOIN dosen d ON u.id_dosen = d.id_dosen
        """).fetchall()
        
        result = [dict(u) for u in ujian_list]
        conn.close()
        self.send_json({"ujian": result})

    def handle_verify_pin(self, body):
        id_ujian = body.get("id_ujian")
        pin_input = body.get("pin")
        id_mahasiswa = body.get("id_mahasiswa")

        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()

        if not ujian:
            conn.close()
            return self.send_json({"success": False, "message": "Ujian tidak ditemukan."}, 404)

        if ujian["pin_ujian"] != pin_input:
            conn.close()
            return self.send_json({"success": False, "message": "PIN Ujian salah! Silakan coba lagi."})

        # Cek atau buat sesi ujian mahasiswa
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?", (id_ujian, id_mahasiswa)).fetchone()
        if not sesi:
            id_sesi = f"SESI_{int(datetime.now().timestamp())}"
            sisa_waktu = ujian["durasi"] * 60
            waktu_mulai = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute("""
            INSERT INTO sesi_ujian_mahasiswa (id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu, jumlah_peringatan, status_ujian)
            VALUES (?, ?, ?, ?, ?, 0, 'Berlangsung')
            """, (id_sesi, id_ujian, id_mahasiswa, waktu_mulai, sisa_waktu))
            conn.commit()
            id_sesi_result = id_sesi
        else:
            id_sesi_result = sesi["id_sesi"]

        conn.close()
        self.send_json({"success": True, "id_sesi": id_sesi_result})

    def api_ujian_detail(self, id_ujian, id_mahasiswa):
        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?", (id_ujian, id_mahasiswa)).fetchone()

        soal_rows = conn.execute("""
        SELECT s.id_soal, s.pertanyaan, s.opsi_jawaban, s.kunci_jawaban
        FROM ujian_soal us
        JOIN soal s ON us.id_soal = s.id_soal
        WHERE us.id_ujian = ?
        """, (id_ujian,)).fetchall()

        # Ambil jawaban tersimpan
        saved_jawaban = {}
        if sesi:
            j_rows = conn.execute("SELECT id_soal, jawaban_dipilih FROM jawaban_mahasiswa WHERE id_sesi = ?", (sesi["id_sesi"],)).fetchall()
            for j in j_rows:
                saved_jawaban[j["id_soal"]] = j["jawaban_dipilih"]

        # Format soal & acak urutan & opsi (Use Case 1.2.11)
        daftar_soal = []
        for r in soal_rows:
            opsi = json.loads(r["opsi_jawaban"]) if isinstance(r["opsi_jawaban"], str) else r["opsi_jawaban"]
            random.shuffle(opsi) # Acak opsi
            daftar_soal.append({
                "id_soal": r["id_soal"],
                "pertanyaan": r["pertanyaan"],
                "opsi_jawaban": opsi
            })
        random.shuffle(daftar_soal) # Acak soal

        conn.close()
        self.send_json({
            "ujian": dict(ujian),
            "sesi": dict(sesi) if sesi else None,
            "soal": daftar_soal,
            "jawaban_tersimpan": saved_jawaban
        })

    def handle_auto_save(self, body):
        id_sesi = body.get("id_sesi")
        id_soal = body.get("id_soal")
        jawaban = body.get("jawaban")
        sisa_waktu = body.get("sisa_waktu")

        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn = database.get_connection()

        if sisa_waktu is not None:
            conn.execute("UPDATE sesi_ujian_mahasiswa SET sisa_waktu = ? WHERE id_sesi = ?", (sisa_waktu, id_sesi))

        existing = conn.execute("SELECT id_jawaban FROM jawaban_mahasiswa WHERE id_sesi = ? AND id_soal = ?", (id_sesi, id_soal)).fetchone()
        if existing:
            conn.execute("UPDATE jawaban_mahasiswa SET jawaban_dipilih = ?, waktu_disimpan = ? WHERE id_jawaban = ?",
                         (jawaban, waktu_str, existing["id_jawaban"]))
        else:
            j_id = f"JAW_{int(datetime.now().timestamp())}_{random.randint(100, 999)}"
            conn.execute("""
            INSERT INTO jawaban_mahasiswa (id_jawaban, id_sesi, id_soal, jawaban_dipilih, urutan_soal, waktu_disimpan)
            VALUES (?, ?, ?, ?, 1, ?)
            """, (j_id, id_sesi, id_soal, jawaban, waktu_str))

        conn.commit()
        conn.close()
        self.send_json({"success": True, "saved_at": waktu_str})

    def handle_log_violation(self, body):
        id_sesi = body.get("id_sesi")
        jenis = body.get("jenis_pelanggaran")

        conn = database.get_connection()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?", (id_sesi,)).fetchone()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (sesi["id_ujian"],)).fetchone()

        jml = sesi["jumlah_peringatan"] + 1
        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_id = f"LOG_{int(datetime.now().timestamp())}_{random.randint(100, 999)}"

        conn.execute("""
        INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
        VALUES (?, ?, ?, ?, ?)
        """, (log_id, id_sesi, jenis, waktu_str, jml))

        kunci_paksa = jml >= ujian["batas_toleransi_pelanggaran"]
        if kunci_paksa:
            conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ?, status_ujian = 'Dikunci Paksa' WHERE id_sesi = ?", (jml, id_sesi))
            # Catat log sesi dikunci paksa
            conn.execute("""
            INSERT INTO log_pelanggaran (id_log, id_sesi, jenis_pelanggaran, waktu_kejadian, jumlah_pelanggaran)
            VALUES (?, ?, 'Sesi Dikunci Paksa', ?, ?)
            """, (f"LOCK_{int(datetime.now().timestamp())}", id_sesi, waktu_str, jml))
            # Buat bukti ujian
            bukti_id = f"BKT_{int(datetime.now().timestamp())}"
            conn.execute("""
            INSERT OR REPLACE INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
            VALUES (?, ?, ?, 'Dikunci Paksa', 0.0, 'Peringatan')
            """, (bukti_id, id_sesi, waktu_str))
        else:
            conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ? WHERE id_sesi = ?", (jml, id_sesi))

        conn.commit()
        conn.close()

        self.send_json({
            "success": True,
            "jumlah_peringatan": jml,
            "batas_toleransi": ujian["batas_toleransi_pelanggaran"],
            "kunci_paksa": kunci_paksa
        })

    def handle_submit_exam(self, body):
        id_sesi = body.get("id_sesi")
        status_pengiriman = body.get("status_pengiriman", "Selesai")
        answers = body.get("answers", {})

        conn = database.get_connection()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?", (id_sesi,)).fetchone()
        soal_rows = conn.execute("""
        SELECT s.id_soal, s.kunci_jawaban 
        FROM ujian_soal us 
        JOIN soal s ON us.id_soal = s.id_soal 
        WHERE us.id_ujian = ?
        """, (sesi["id_ujian"],)).fetchall()

        total = len(soal_rows)
        benar = 0
        for s in soal_rows:
            if answers.get(s["id_soal"]) == s["kunci_jawaban"]:
                benar += 1
        nilai = round((benar / total) * 100, 2) if total > 0 else 0.0
        waktu_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = ? WHERE id_sesi = ?", (status_pengiriman, id_sesi))
        bukti_id = f"BKT_{int(datetime.now().timestamp())}"
        conn.execute("""
        INSERT OR REPLACE INTO bukti_ujian_hasil (id_bukti, id_sesi, waktu_pengiriman, status_pengiriman, total_nilai, status_keputusan)
        VALUES (?, ?, ?, ?, ?, 'Tidak Ada')
        """, (bukti_id, id_sesi, waktu_str, status_pengiriman, nilai))
        conn.commit()
        conn.close()

        self.send_json({
            "success": True,
            "bukti": {
                "id_bukti": bukti_id,
                "id_sesi": id_sesi,
                "waktu_pengiriman": waktu_str,
                "status_pengiriman": status_pengiriman,
                "total_nilai": nilai
            }
        })

    def api_mahasiswa_hasil(self, id_mahasiswa):
        conn = database.get_connection()
        rows = conn.execute("""
        SELECT b.*, u.nama_ujian, u.id_ujian
        FROM bukti_ujian_hasil b
        JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi
        JOIN ujian u ON s.id_ujian = u.id_ujian
        WHERE s.id_mahasiswa = ?
        ORDER BY b.waktu_pengiriman DESC
        """, (id_mahasiswa,)).fetchall()
        conn.close()
        self.send_json({"hasil": [dict(r) for r in rows]})

    def api_dosen_data(self, id_dosen):
        conn = database.get_connection()
        soal_list = conn.execute("""
        SELECT s.* FROM soal s
        JOIN bank_soal b ON s.id_bank_soal = b.id_bank_soal
        WHERE b.id_dosen = ?
        """, (id_dosen,)).fetchall()

        ujian_list = conn.execute("SELECT * FROM ujian WHERE id_dosen = ?", (id_dosen,)).fetchall()

        logs = conn.execute("""
        SELECT l.*, m.nama, m.nim, s.status_ujian, u.nama_ujian
        FROM log_pelanggaran l
        JOIN sesi_ujian_mahasiswa s ON l.id_sesi = s.id_sesi
        JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
        JOIN ujian u ON s.id_ujian = u.id_ujian
        WHERE u.id_dosen = ?
        ORDER BY l.waktu_kejadian DESC
        """, (id_dosen,)).fetchall()

        peserta = conn.execute("""
        SELECT pu.id_ujian, m.id_mahasiswa, m.nim, m.nama
        FROM peserta_ujian pu
        JOIN mahasiswa m ON pu.id_mahasiswa = m.id_mahasiswa
        JOIN ujian u ON pu.id_ujian = u.id_ujian
        WHERE u.id_dosen = ?
        """, (id_dosen,)).fetchall()

        conn.close()
        self.send_json({
            "soal": [dict(s) for s in soal_list],
            "ujian": [dict(u) for u in ujian_list],
            "logs": [dict(l) for l in logs],
            "peserta": [dict(p) for p in peserta]
        })

    def handle_add_soal(self, body):
        id_dosen = body.get("id_dosen")
        pertanyaan = body.get("pertanyaan")
        opsi = body.get("opsi_jawaban")
        kunci = body.get("kunci_jawaban")

        conn = database.get_connection()
        bs = conn.execute("SELECT id_bank_soal FROM bank_soal WHERE id_dosen = ?", (id_dosen,)).fetchone()
        s_id = f"SOAL_{int(datetime.now().timestamp())}_{random.randint(10, 99)}"

        conn.execute("""
        INSERT INTO soal (id_soal, id_bank_soal, pertanyaan, opsi_jawaban, kunci_jawaban)
        VALUES (?, ?, ?, ?, ?)
        """, (s_id, bs["id_bank_soal"], pertanyaan, json.dumps(opsi), kunci))
        conn.commit()
        conn.close()
        self.send_json({"success": True, "id_soal": s_id})

    def handle_delete_soal(self, body):
        id_soal = body.get("id_soal")
        conn = database.get_connection()
        conn.execute("DELETE FROM soal WHERE id_soal = ?", (id_soal,))
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def handle_create_ujian(self, body):
        id_dosen = body.get("id_dosen")
        nama = body.get("nama_ujian")
        durasi = int(body.get("durasi", 60))
        pin = body.get("pin_ujian")
        toleransi = int(body.get("batas_toleransi", 3))
        soal_ids = body.get("soal_ids", [])

        u_id = f"UJN_{int(datetime.now().timestamp())}"
        now = datetime.now()
        mulai = now.strftime("%Y-%m-%d %H:%M:%S")
        selesai = (now + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")

        conn = database.get_connection()
        conn.execute("""
        INSERT INTO ujian (id_ujian, id_dosen, nama_ujian, tanggal_waktu_mulai, tanggal_waktu_selesai, durasi, pin_ujian, batas_toleransi_pelanggaran)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (u_id, id_dosen, nama, mulai, selesai, durasi, pin, toleransi))

        for s_id in soal_ids:
            conn.execute("INSERT INTO ujian_soal (id_ujian, id_soal) VALUES (?, ?)", (u_id, s_id))

        # Daftarkan semua mahasiswa
        mhs_list = conn.execute("SELECT id_mahasiswa FROM mahasiswa").fetchall()
        for m in mhs_list:
            conn.execute("INSERT OR IGNORE INTO peserta_ujian (id_ujian, id_mahasiswa) VALUES (?, ?)", (u_id, m["id_mahasiswa"]))

        conn.commit()
        conn.close()
        self.send_json({"success": True, "id_ujian": u_id})

    def handle_delete_peserta(self, body):
        id_ujian = body.get("id_ujian")
        id_mahasiswa = body.get("id_mahasiswa")
        conn = database.get_connection()
        conn.execute("DELETE FROM peserta_ujian WHERE id_ujian = ? AND id_mahasiswa = ?", (id_ujian, id_mahasiswa))
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def handle_tetapkan_keputusan(self, body):
        id_sesi = body.get("id_sesi")
        keputusan = body.get("keputusan")

        conn = database.get_connection()
        b_row = conn.execute("SELECT * FROM bukti_ujian_hasil WHERE id_sesi = ?", (id_sesi,)).fetchone()
        if not b_row:
            conn.close()
            return self.send_json({"success": False, "message": "Bukti hasil belum tersedia."})

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
        self.send_json({"success": True, "total_nilai": nilai_baru, "keputusan": keputusan})

    # ================= SERVE WEB UI HTML =================
    def serve_html(self):
        html_content = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiLab - Sistem Ujian Berbasis Web dengan Fitur Anti-Curang | FIK UNKLAB</title>
  <style>
    :root {
      --primary: #1E40AF;
      --primary-dark: #1E3A8A;
      --danger: #DC2626;
      --success: #16A34A;
      --warning: #F59E0B;
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; }
    .header { background: var(--primary-dark); color: #fff; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header h1 { font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .header .user-badge { font-size: 0.9rem; color: #93C5FD; display: flex; align-items: center; gap: 12px; }
    .btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; transition: 0.2s; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: #1D4ED8; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-danger:hover { background: #B91C1C; }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover { background: #15803D; }
    .btn-secondary { background: #E2E8F0; color: #334155; }
    .btn-secondary:hover { background: #CBD5E1; }
    .container { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
    .tab-btn { padding: 10px 18px; border: none; background: transparent; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 3px solid transparent; }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    th { background: #F1F5F9; color: var(--text); font-weight: 700; }
    tr:hover { background: #F8FAFC; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px; color: #334155; }
    .form-control { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; }
    .form-control:focus { outline: none; border-color: var(--primary); ring: 2px solid #93C5FD; }
    /* Anti-cheat banner */
    .alert-banner { background: var(--danger); color: #fff; padding: 12px 20px; font-weight: 700; text-align: center; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    .no-select { user-select: none; -webkit-user-select: none; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script>
    // Global State
    let currentUser = null;
    let currentExamData = null;
    let examTimerInterval = null;
    let violationCount = 0;
    let maxViolations = 3;
    let studentAnswers = {};
    let isExamActive = false;

    const app = document.getElementById("app");

    let selectedRole = null;

    // Init check
    renderLogin();

    function renderLogin() {
      isExamActive = false;
      document.body.classList.remove("no-select");

      if (!selectedRole) {
        // TAMPILAN 2 KARTU OPSI: MAHASISWA & DOSEN
        app.innerHTML = `
          <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: var(--primary-dark); font-size: 1.8rem; margin-bottom: 6px;">SiLab Exam System</h2>
              <p style="color: var(--text-muted); font-size: 0.95rem;">Sistem Ujian Berbasis Web dengan Fitur Anti-Curang<br><strong>Fakultas Ilmu Komputer — Universitas Klabat</strong></p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; width: 100%; max-width: 740px;">
              <!-- Kartu 1: Mahasiswa -->
              <div class="card" style="text-align: center; cursor: pointer; padding: 32px 24px; border: 2px solid var(--border); transition: 0.2s;" 
                   onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'"
                   onclick="chooseRole('Mahasiswa')">
                <div style="font-size: 3rem; margin-bottom: 12px;">👨‍🎓</div>
                <h3 style="color: var(--primary-dark); font-size: 1.3rem; margin-bottom: 8px;">Login Mahasiswa</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px;">
                  Masuk untuk mengerjakan ujian, verifikasi PIN ujian, auto-save jawaban, dan melihat hasil penilaian.
                </p>
                <button class="btn btn-primary" style="width: 100%;">Login ▶</button>
              </div>

              <!-- Kartu 2: Dosen -->
              <div class="card" style="text-align: center; cursor: pointer; padding: 32px 24px; border: 2px solid var(--border); transition: 0.2s;"
                   onmouseover="this.style.borderColor='var(--success)'" onmouseout="this.style.borderColor='var(--border)'"
                   onclick="chooseRole('Dosen')">
                <div style="font-size: 3rem; margin-bottom: 12px;">👨‍🏫</div>
                <h3 style="color: #14532D; font-size: 1.3rem; margin-bottom: 8px;">Login Dosen</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px;">
                  Kelola bank soal, konfigurasikan ujian, pantau log pelanggaran anti-curang, dan tetapkan sanksi nilai.
                </p>
                <button class="btn btn-success" style="width: 100%;">Login ▶</button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // FORM LOGIN SESUAI ROLE TERPILIH
      const isMhs = selectedRole === 'Mahasiswa';
      app.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="width: 100%; max-width: 440px;">
            <div style="display: flex; background: #F1F5F9; padding: 4px; border-radius: 6px; margin-bottom: 20px;">
              <button class="btn" style="flex: 1; font-size: 0.85rem; ${isMhs ? 'background: #fff; color: var(--primary); font-weight: bold;' : 'background: transparent; color: #64748B;'}" onclick="chooseRole('Mahasiswa')">👨‍🎓 Mahasiswa</button>
              <button class="btn" style="flex: 1; font-size: 0.85rem; ${!isMhs ? 'background: #fff; color: var(--success); font-weight: bold;' : 'background: transparent; color: #64748B;'}" onclick="chooseRole('Dosen')">👨‍🏫 Dosen</button>
            </div>

            <h3 style="color: ${isMhs ? 'var(--primary-dark)' : '#14532D'}; font-size: 1.3rem; margin-bottom: 4px;">
              ${isMhs ? 'Portal Masuk Mahasiswa' : 'Portal Masuk Dosen Pengampu'}
            </h3>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 20px;">
              ${isMhs ? 'Masukkan Nomor Induk Mahasiswa (NIM) dan password Anda.' : 'Masukkan username akun dosen dan password Anda.'}
            </p>
            
            <div id="login-error" style="color: var(--danger); font-size: 0.85rem; margin-bottom: 12px; display: none; background: #FEE2E2; padding: 8px 12px; border-radius: 6px;"></div>

            <div class="form-group" style="text-align: left;">
              <label>${isMhs ? 'Nomor Induk Mahasiswa (NIM):' : 'Username Dosen / NIP:'}</label>
              <input type="text" id="username" class="form-control" value="${isMhs ? '105022410021' : 'dosen'}">
            </div>
            <div class="form-group" style="text-align: left;">
              <label>Password:</label>
              <input type="password" id="password" class="form-control" value="${isMhs ? '123' : 'dosen123'}">
            </div>

            <button class="btn ${isMhs ? 'btn-primary' : 'btn-success'}" style="width: 100%; margin-top: 10px; padding: 12px;" onclick="doLogin()">
              Login
            </button>

            <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 0.8rem; text-align: left;">
              <div style="color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">Akun Uji Coba Cepat:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${isMhs ? `
                  <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 8px;" onclick="setAcc('105022410021', '123')">Juan (105022410021)</button>
                  <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 8px;" onclick="setAcc('terkunci', '123')">🔒 Terkunci</button>
                ` : `
                  <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 8px;" onclick="setAcc('dosen', 'dosen123')">George Tangka (dosen)</button>
                `}
              </div>
            </div>

            <div style="text-align: center; margin-top: 16px;">
              <button class="btn" style="background: transparent; color: #64748B; font-size: 0.8rem; text-decoration: underline;" onclick="chooseRole(null)">
                ◀ Kembali ke Pilihan Peran
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function chooseRole(r) {
      selectedRole = r;
      renderLogin();
    }

    function setAcc(u, p) {
      document.getElementById("username").value = u;
      document.getElementById("password").value = p;
      document.getElementById("login-error").style.display = "none";
    }

    async function doLogin() {
      const u = document.getElementById("username").value.trim();
      const p = document.getElementById("password").value.trim();
      const errBox = document.getElementById("login-error");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (!data.success) {
        errBox.textContent = data.message;
        errBox.style.display = "block";
        return;
      }

      if (selectedRole && data.user.role !== selectedRole) {
        errBox.textContent = `Akun ini adalah akun ${data.user.role}. Silakan gunakan opsi Login ${data.user.role}.`;
        errBox.style.display = "block";
        return;
      }

      currentUser = data.user;
      if (currentUser.role === "Mahasiswa") {
        renderMahasiswaPortal();
      } else {
        renderDosenPortal();
      }
    }

    // ================= PORTAL MAHASISWA =================
    async function renderMahasiswaPortal(activeTab = "ujian") {
      isExamActive = false;
      document.body.classList.remove("no-select");

      const res = await fetch("/api/init-data");
      const data = await res.json();

      app.innerHTML = `
        <div class="header">
          <h1>🏛️ SiLab Exam | Portal Mahasiswa</h1>
          <div class="user-badge">
            <span>${currentUser.nama} (NIM: ${currentUser.nim})</span>
            <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="renderLogin()">Keluar</button>
          </div>
        </div>
        <div class="container">
          <div class="tabs">
            <button class="tab-btn ${activeTab === 'ujian' ? 'active' : ''}" onclick="renderMahasiswaPortal('ujian')">📝 Daftar Ujian Tersedia</button>
            <button class="tab-btn ${activeTab === 'hasil' ? 'active' : ''}" onclick="renderMahasiswaPortal('hasil')">📊 Lihat Hasil Ujian</button>
          </div>
          <div id="mhs-content"></div>
        </div>
      `;

      if (activeTab === "ujian") {
        renderMhsUjianTab(data.ujian);
      } else {
        renderMhsHasilTab();
      }
    }

    function renderMhsUjianTab(ujianList) {
      const container = document.getElementById("mhs-content");
      container.innerHTML = `
        <div class="card">
          <h2 style="font-size: 1.2rem; margin-bottom: 6px;">Daftar Ujian Aktif</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Pilih ujian dan masukkan PIN unik yang diberikan dosen untuk memulai sesi ujian.</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Ujian</th>
                <th>Dosen Pengampu</th>
                <th>Durasi</th>
                <th>Jadwal Mulai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${ujianList.map(u => `
                <tr>
                  <td><code>${u.id_ujian}</code></td>
                  <td><strong>${u.nama_ujian}</strong></td>
                  <td>${u.nama_dosen}</td>
                  <td>${u.durasi} Menit</td>
                  <td>${u.tanggal_waktu_mulai}</td>
                  <td>
                    <button class="btn btn-primary" onclick="promptPin('${u.id_ujian}', '${u.nama_ujian}')">🔑 Masuk Ujian</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    async function promptPin(idUjian, namaUjian) {
      const pin = prompt(`Masukkan PIN Ujian untuk:\n"${namaUjian}"\n(Contoh PIN default: 123456)`);
      if (!pin) return;

      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_ujian: idUjian, pin: pin.trim(), id_mahasiswa: currentUser.id_mahasiswa })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
      startExam(idUjian);
    }

    // ================= RUANG UJIAN MAHASISWA & ANTI-CURANG =================
    async function startExam(idUjian) {
      const res = await fetch(`/api/ujian-detail?id_ujian=${idUjian}&id_mahasiswa=${currentUser.id_mahasiswa}`);
      currentExamData = await res.json();

      violationCount = currentExamData.sesi ? currentExamData.sesi.jumlah_peringatan : 0;
      maxViolations = currentExamData.ujian.batas_toleransi_pelanggaran || 3;
      studentAnswers = currentExamData.jawaban_tersimpan || {};

      isExamActive = true;
      document.body.classList.add("no-select");

      renderExamRoom();
      setupAntiCheat();
    }

    function renderExamRoom() {
      let secondsLeft = currentExamData.sesi.sisa_waktu;

      app.innerHTML = `
        <div id="violation-alert" class="alert-banner" style="display: none;"></div>
        <div class="header" style="background: #0F172A;">
          <h1>📝 ${currentExamData.ujian.nama_ujian}</h1>
          <div class="user-badge">
            <span id="violation-badge" class="badge badge-warning" style="font-size: 0.9rem;">Pelanggaran: ${violationCount}/${maxViolations}</span>
            <span id="timer" style="font-size: 1.2rem; font-weight: 700; color: #38BDF8; font-family: monospace;">--:--</span>
          </div>
        </div>

        <div class="container" style="max-width: 900px;">
          <div style="background: #FEF3C7; color: #92400E; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 0.85rem;">
            ⚠️ <strong>Perhatian:</strong> Sistem anti-curang aktif. Dilarang berpindah tab/window atau copy-paste. Pelanggaran di atas ${maxViolations} kali akan mengunci ujian secara otomatis!
          </div>

          <div id="questions-box">
            ${currentExamData.soal.map((q, idx) => `
              <div class="card" style="margin-bottom: 16px;">
                <h3 style="font-size: 1.05rem; margin-bottom: 14px;">${idx + 1}. ${q.pertanyaan}</h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${q.opsi_jawaban.map(opsi => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                      <input type="radio" name="soal_${q.id_soal}" value="${opsi}" 
                             ${studentAnswers[q.id_soal] === opsi ? 'checked' : ''} 
                             onchange="autoSaveAnswer('${q.id_soal}', '${opsi.replace(/'/g, "\\'")}')">
                      <span>${opsi}</span>
                    </label>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-bottom: 40px;">
            <div id="save-status" style="font-size: 0.85rem; color: var(--success); font-style: italic;">✓ Semua jawaban tersimpan otomatis</div>
            <button class="btn btn-success" style="padding: 10px 24px; font-size: 1rem;" onclick="confirmSubmitExam()">💾 Kirim Jawaban Akhir</button>
          </div>
        </div>
      `;

      // Start Countdown Timer
      clearInterval(examTimerInterval);
      examTimerInterval = setInterval(() => {
        if (!isExamActive) return;
        secondsLeft--;
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        const timerEl = document.getElementById("timer");
        if (timerEl) {
          timerEl.textContent = `Sisa Waktu: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (secondsLeft <= 0) {
          clearInterval(examTimerInterval);
          alert("Waktu ujian telah habis! Sistem akan mengirim jawaban secara otomatis.");
          submitExamFinal("Disubmit Otomatis");
        }
      }, 1000);
    }

    async function autoSaveAnswer(idSoal, jawaban) {
      studentAnswers[idSoal] = jawaban;
      const statusEl = document.getElementById("save-status");
      if (statusEl) statusEl.textContent = "Menyimpan jawaban...";

      await fetch("/api/auto-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesi: currentExamData.sesi.id_sesi,
          id_soal: idSoal,
          jawaban: jawaban
        })
      });

      if (statusEl) statusEl.textContent = `✓ Tersimpan otomatis (${new Date().toLocaleTimeString()})`;
    }

    function setupAntiCheat() {
      // 1. Deteksi Tab Switching / Window Blur (Use Case 1.2.14)
      window.onblur = () => {
        if (isExamActive) recordViolation("Pindah Tab");
      };
      document.onvisibilitychange = () => {
        if (document.hidden && isExamActive) recordViolation("Pindah Tab");
      };

      // 2. Blokir Copy-Paste & Context Menu (Use Case 1.2.15)
      document.oncopy = (e) => { if (isExamActive) { e.preventDefault(); recordViolation("Copy-Paste"); } };
      document.oncut = (e) => { if (isExamActive) { e.preventDefault(); recordViolation("Copy-Paste"); } };
      document.onpaste = (e) => { if (isExamActive) { e.preventDefault(); recordViolation("Copy-Paste"); } };
      document.oncontextmenu = (e) => { if (isExamActive) { e.preventDefault(); } };
    }

    async function recordViolation(jenis) {
      if (!isExamActive) return;
      const res = await fetch("/api/log-violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesi: currentExamData.sesi.id_sesi,
          jenis_pelanggaran: jenis
        })
      });
      const data = await res.json();
      violationCount = data.jumlah_peringatan;

      // Update badge
      const badge = document.getElementById("violation-badge");
      if (badge) {
        badge.textContent = `Pelanggaran: ${violationCount}/${maxViolations}`;
        badge.className = "badge badge-danger";
      }

      // Tampilkan Banner Peringatan Visual (Use Case 1.2.17)
      const banner = document.getElementById("violation-alert");
      if (banner) {
        banner.textContent = `⚠️ PERINGATAN: Terdeteksi '${jenis}'! (Pelanggaran ke-${violationCount} dari ${maxViolations})`;
        banner.style.display = "block";
        setTimeout(() => { if (!data.kunci_paksa && banner) banner.style.display = "none"; }, 4000);
      }

      // Kunci Sesi Paksa jika melewati batas toleransi (Use Case 1.2.18)
      if (data.kunci_paksa) {
        isExamActive = false;
        clearInterval(examTimerInterval);
        renderLockedScreen();
      }
    }

    function renderLockedScreen() {
      isExamActive = false;
      document.body.classList.remove("no-select");
      app.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="max-width: 550px; text-align: center; border-color: var(--danger);">
            <h2 style="color: var(--danger); font-size: 1.6rem; margin-bottom: 12px;">🔒 SESI UJIAN DIKUNCI PAKSA</h2>
            <p style="color: var(--text); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px;">
              Akses ujian Anda telah dihentikan secara otomatis oleh <strong>Sistem Anti-Curang</strong> karena melampaui batas toleransi pelanggaran (${maxViolations} kali).
            </p>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 24px;">
              Jawaban terakhir Anda telah disubmit ke sistem, dan insiden telah dicatat ke log pelanggaran untuk ditinjau oleh Dosen Pengampu.
            </p>
            <button class="btn btn-primary" onclick="renderMahasiswaPortal('hasil')">Lihat Hasil & Tanda Terima</button>
          </div>
        </div>
      `;
    }

    async function confirmSubmitExam() {
      if (!confirm("Apakah Anda yakin ingin menyelesaikan dan mengirimkan jawaban ujian?")) return;
      submitExamFinal("Selesai");
    }

    async function submitExamFinal(status) {
      isExamActive = false;
      clearInterval(examTimerInterval);

      const res = await fetch("/api/submit-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesi: currentExamData.sesi.id_sesi,
          status_pengiriman: status,
          answers: studentAnswers
        })
      });
      const data = await res.json();
      renderReceipt(data.bukti);
    }

    // ================= TANDA TERIMA BUKTI UJIAN (Use Case 1.2.19) =================
    function renderReceipt(b) {
      document.body.classList.remove("no-select");
      app.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="max-width: 540px; text-align: center;">
            <h2 style="color: var(--success); font-size: 1.5rem; margin-bottom: 8px;">✅ BUKTI PENGIRIMAN UJIAN</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">Jawaban Anda telah berhasil tersimpan permanen di database sistem SiLab.</p>
            
            <div style="background: #F8FAFC; border: 1px dashed var(--border); border-radius: 6px; padding: 18px; text-align: left; font-family: monospace; font-size: 0.9rem; line-height: 1.8; margin-bottom: 20px;">
              <div><strong>ID Bukti         :</strong> ${b.id_bukti}</div>
              <div><strong>ID Sesi          :</strong> ${b.id_sesi}</div>
              <div><strong>Waktu Kirim      :</strong> ${b.waktu_pengiriman}</div>
              <div><strong>Status Kirim     :</strong> <span class="badge badge-success">${b.status_pengiriman}</span></div>
              <div><strong>Skor Sementara   :</strong> ${b.total_nilai} / 100</div>
            </div>

            <button class="btn btn-primary" onclick="renderMahasiswaPortal('hasil')">Kembali ke Dashboard</button>
          </div>
        </div>
      `;
    }

    // ================= HASIL UJIAN MAHASISWA (Use Case 1.2.5) =================
    async function renderMhsHasilTab() {
      const res = await fetch(`/api/mahasiswa-hasil?id_mahasiswa=${currentUser.id_mahasiswa}`);
      const data = await res.json();
      const container = document.getElementById("mhs-content");

      container.innerHTML = `
        <div class="card">
          <h2 style="font-size: 1.2rem; margin-bottom: 6px;">Riwayat & Nilai Ujian</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Daftar ujian yang telah Anda ikuti beserta keputusan dosen atas pelanggaran.</p>
          <table>
            <thead>
              <tr>
                <th>ID Bukti</th>
                <th>Nama Ujian</th>
                <th>Waktu Pengiriman</th>
                <th>Status</th>
                <th>Nilai Akhir</th>
                <th>Keputusan Dosen</th>
              </tr>
            </thead>
            <tbody>
              ${data.hasil.map(h => `
                <tr>
                  <td><code>${h.id_bukti}</code></td>
                  <td><strong>${h.nama_ujian}</strong></td>
                  <td>${h.waktu_pengiriman}</td>
                  <td><span class="badge ${h.status_pengiriman === 'Selesai' ? 'badge-success' : 'badge-danger'}">${h.status_pengiriman}</span></td>
                  <td><strong>${h.total_nilai !== null ? h.total_nilai : 'Belum dinilai'}</strong></td>
                  <td><span class="badge ${h.status_keputusan === 'Tidak Ada' ? 'badge-success' : 'badge-warning'}">${h.status_keputusan}</span></td>
                </tr>
              `).join("")}
              ${data.hasil.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada riwayat ujian yang disubmit.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      `;
    }

    // ================= PORTAL DOSEN =================
    async function renderDosenPortal(activeTab = "bank") {
      const res = await fetch(`/api/dosen-data?id_dosen=${currentUser.id_dosen}`);
      const data = await res.json();

      app.innerHTML = `
        <div class="header">
          <h1>🏛️ SiLab Exam | Portal Dosen</h1>
          <div class="user-badge">
            <span>${currentUser.nama_dosen} (${currentUser.mata_kuliah})</span>
            <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="renderLogin()">Keluar</button>
          </div>
        </div>
        <div class="container">
          <div class="tabs">
            <button class="tab-btn ${activeTab === 'bank' ? 'active' : ''}" onclick="renderDosenPortal('bank')">📚 Kelola Bank Soal</button>
            <button class="tab-btn ${activeTab === 'atur' ? 'active' : ''}" onclick="renderDosenPortal('atur')">⚙️ Atur Ujian</button>
            <button class="tab-btn ${activeTab === 'peserta' ? 'active' : ''}" onclick="renderDosenPortal('peserta')">👥 Kelola Peserta</button>
            <button class="tab-btn ${activeTab === 'log' ? 'active' : ''}" onclick="renderDosenPortal('log')">🚨 Log Pelanggaran & Sanksi</button>
          </div>
          <div id="dosen-content"></div>
        </div>
      `;

      if (activeTab === "bank") renderDosenBankSoal(data.soal);
      else if (activeTab === "atur") renderDosenAturUjian(data.soal);
      else if (activeTab === "peserta") renderDosenPeserta(data.peserta, data.ujian);
      else if (activeTab === "log") renderDosenLog(data.logs);
    }

    function renderDosenBankSoal(soalList) {
      const container = document.getElementById("dosen-content");
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 360px; gap: 20px;">
          <div class="card">
            <h2 style="font-size: 1.15rem; margin-bottom: 12px;">Daftar Soal di Bank Soal</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pertanyaan</th>
                  <th>Kunci Jawaban</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${soalList.map(s => `
                  <tr>
                    <td><code>${s.id_soal}</code></td>
                    <td>${s.pertanyaan}</td>
                    <td><strong style="color: var(--success);">${s.kunci_jawaban}</strong></td>
                    <td><button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteSoal('${s.id_soal}')">Hapus</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="card">
            <h2 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--primary);">Tambah Soal Baru</h2>
            <div class="form-group">
              <label>Pertanyaan Soal:</label>
              <textarea id="new-tanya" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Pilihan A:</label>
              <input type="text" id="new-oa" class="form-control">
            </div>
            <div class="form-group">
              <label>Pilihan B:</label>
              <input type="text" id="new-ob" class="form-control">
            </div>
            <div class="form-group">
              <label>Pilihan C:</label>
              <input type="text" id="new-oc" class="form-control">
            </div>
            <div class="form-group">
              <label>Pilihan D:</label>
              <input type="text" id="new-od" class="form-control">
            </div>
            <div class="form-group">
              <label>Kunci Jawaban yang Benar:</label>
              <select id="new-kunci" class="form-control">
                <option value="A">Pilihan A</option>
                <option value="B">Pilihan B</option>
                <option value="C">Pilihan C</option>
                <option value="D">Pilihan D</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="addSoal()">➕ Simpan Soal</button>
          </div>
        </div>
      `;
    }

    async function addSoal() {
      const t = document.getElementById("new-tanya").value.trim();
      const oa = document.getElementById("new-oa").value.trim();
      const ob = document.getElementById("new-ob").value.trim();
      const oc = document.getElementById("new-oc").value.trim();
      const od = document.getElementById("new-od").value.trim();
      const k = document.getElementById("new-kunci").value;

      if (!t || !oa || !ob) return alert("Pertanyaan dan Opsi A & B wajib diisi!");
      const opsi = [oa, ob];
      if (oc) opsi.push(oc);
      if (od) opsi.push(od);

      const kunciVal = k === 'A' ? oa : (k === 'B' ? ob : (k === 'C' ? oc : od));

      await fetch("/api/add-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_dosen: currentUser.id_dosen,
          pertanyaan: t,
          opsi_jawaban: opsi,
          kunci_jawaban: kunciVal
        })
      });
      alert("Soal berhasil ditambahkan!");
      renderDosenPortal("bank");
    }

    async function deleteSoal(idSoal) {
      if (!confirm(`Hapus soal ${idSoal}?`)) return;
      await fetch("/api/delete-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_soal: idSoal })
      });
      renderDosenPortal("bank");
    }

    function renderDosenAturUjian(soalList) {
      const container = document.getElementById("dosen-content");
      container.innerHTML = `
        <div class="card" style="max-width: 700px;">
          <h2 style="font-size: 1.15rem; margin-bottom: 14px;">Atur Konfigurasi Ujian Baru</h2>
          <div class="form-group">
            <label>Nama Ujian:</label>
            <input type="text" id="ujian-nama" class="form-control" value="Ujian Akhir Semester (UAS)">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label>Durasi (Menit):</label>
              <input type="number" id="ujian-durasi" class="form-control" value="60">
            </div>
            <div class="form-group">
              <label>PIN Ujian (Untuk Mahasiswa):</label>
              <input type="text" id="ujian-pin" class="form-control" value="654321">
            </div>
          </div>
          <div class="form-group">
            <label>Batas Toleransi Pelanggaran Anti-Curang:</label>
            <input type="number" id="ujian-toleransi" class="form-control" value="3">
          </div>
          <div class="form-group">
            <label>Pilih Soal yang Dimasukkan ke Ujian:</label>
            <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border); padding: 10px; border-radius: 6px;">
              ${soalList.map(s => `
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <input type="checkbox" name="pilih_soal" value="${s.id_soal}" checked>
                  <span style="font-size: 0.85rem;">[${s.id_soal}] ${s.pertanyaan}</span>
                </label>
              `).join("")}
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top: 10px;" onclick="createUjian()">💾 Simpan & Jadwalkan Ujian</button>
        </div>
      `;
    }

    async function createUjian() {
      const nama = document.getElementById("ujian-nama").value.trim();
      const durasi = document.getElementById("ujian-durasi").value;
      const pin = document.getElementById("ujian-pin").value.trim();
      const tol = document.getElementById("ujian-toleransi").value;
      const checkedBoxes = Array.from(document.querySelectorAll("input[name='pilih_soal']:checked")).map(cb => cb.value);

      if (!nama || !pin || checkedBoxes.length === 0) return alert("Mohon isi semua data dan pilih soal!");

      await fetch("/api/create-ujian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_dosen: currentUser.id_dosen,
          nama_ujian: nama,
          durasi: durasi,
          pin_ujian: pin,
          batas_toleransi: tol,
          soal_ids: checkedBoxes
        })
      });
      alert(`Ujian '${nama}' berhasil dijadwalkan!\nPIN Ujian: ${pin}`);
      renderDosenPortal("bank");
    }

    function renderDosenPeserta(pesertaList, ujianList) {
      const container = document.getElementById("dosen-content");
      container.innerHTML = `
        <div class="card">
          <h2 style="font-size: 1.15rem; margin-bottom: 12px;">Daftar Peserta Ujian</h2>
          <table>
            <thead>
              <tr>
                <th>ID Ujian</th>
                <th>NIM Mahasiswa</th>
                <th>Nama Mahasiswa</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${pesertaList.map(p => `
                <tr>
                  <td><code>${p.id_ujian}</code></td>
                  <td>${p.nim}</td>
                  <td><strong>${p.nama}</strong></td>
                  <td><button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deletePeserta('${p.id_ujian}', '${p.id_mahasiswa}')">Hapus</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    async function deletePeserta(idUjian, idMhs) {
      if (!confirm("Hapus peserta ini dari ujian?")) return;
      await fetch("/api/delete-peserta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_ujian: idUjian, id_mahasiswa: idMhs })
      });
      renderDosenPortal("peserta");
    }

    function renderDosenLog(logs) {
      const container = document.getElementById("dosen-content");
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 20px;">
          <div class="card">
            <h2 style="font-size: 1.15rem; margin-bottom: 12px;">Catatan Pelanggaran Anti-Curang</h2>
            <table>
              <thead>
                <tr>
                  <th>Sesi</th>
                  <th>Mahasiswa</th>
                  <th>Jenis Pelanggaran</th>
                  <th>Waktu</th>
                  <th>Akumulasi</th>
                  <th>Status Sesi</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr style="cursor: pointer;" onclick="selectSessionForSanction('${l.id_sesi}', '${l.nama}')">
                    <td><code>${l.id_sesi}</code></td>
                    <td><strong>${l.nama}</strong> (${l.nim})</td>
                    <td><span class="badge badge-danger">${l.jenis_pelanggaran}</span></td>
                    <td>${l.waktu_kejadian}</td>
                    <td><strong>${l.jumlah_pelanggaran}</strong></td>
                    <td><span class="badge ${l.status_ujian === 'Dikunci Paksa' ? 'badge-danger' : 'badge-warning'}">${l.status_ujian}</span></td>
                  </tr>
                `).join("")}
                ${logs.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada log pelanggaran.</td></tr>' : ''}
              </tbody>
            </table>
          </div>

          <div class="card">
            <h2 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--primary);">Tetapkan Keputusan Sanksi</h2>
            <div id="selected-mhs-info" style="font-size: 0.9rem; margin-bottom: 14px; color: var(--text-muted);">
              Pilih salah satu baris di tabel sebelah kiri.
            </div>
            <div class="form-group">
              <label>Pilihan Keputusan Sanksi:</label>
              <label style="display: block; margin-bottom: 6px;"><input type="radio" name="sanksi_opsi" value="Peringatan" checked> Peringatan Tertulis</label>
              <label style="display: block; margin-bottom: 6px;"><input type="radio" name="sanksi_opsi" value="Pengurangan Nilai"> Pengurangan Nilai (-20%)</label>
              <label style="display: block; margin-bottom: 6px;"><input type="radio" name="sanksi_opsi" value="Diskualifikasi"> Diskualifikasi (Skor 0)</label>
            </div>
            <button id="apply-sanksi-btn" class="btn btn-danger" style="width: 100%; margin-top: 10px;" disabled onclick="applySanction()">⚖️ Terapkan Keputusan</button>
          </div>
        </div>
      `;
    }

    let activeSanctionSession = null;
    function selectSessionForSanction(idSesi, nama) {
      activeSanctionSession = idSesi;
      document.getElementById("selected-mhs-info").innerHTML = `Mahasiswa Terpilih: <strong>${nama}</strong><br>ID Sesi: <code>${idSesi}</code>`;
      document.getElementById("apply-sanksi-btn").disabled = false;
    }

    async function applySanction() {
      if (!activeSanctionSession) return;
      const sanksi = document.querySelector("input[name='sanksi_opsi']:checked").value;
      const res = await fetch("/api/tetapkan-keputusan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_sesi: activeSanctionSession, keputusan: sanksi })
      });
      const data = await res.json();
      if (!data.success) return alert(data.message);
      alert(`Keputusan '${sanksi}' berhasil diterapkan!\nNilai akhir sesi menjadi: ${data.total_nilai}`);
      renderDosenPortal("log");
    }
  </script>
</body>
</html>
"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))

def run_web_server():
    database.init_db()
    with socketserver.TCPServer(("", PORT), SiLabWebHandler) as httpd:
        print(f"================================================================")
        print(f"SiLab Web Exam System berjalan di: http://localhost:{PORT}")
        print(f"Tekan Ctrl+C untuk menghentikan server.")
        print(f"================================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer dihentikan.")

if __name__ == "__main__":
    run_web_server()

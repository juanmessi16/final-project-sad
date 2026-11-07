"""
web_ui.py - Server Antarmuka Pengguna (UI) Berbasis Web Menggunakan Python Murni (Standard Library)
Sistem Ujian Berbasis Web dengan Fitur Anti-Curang (SiLab Exam System)
Fakultas Ilmu Komputer, Universitas Klabat

Peran: System Analyst / UI-UX Designer (Valentino Sumual)
Sesuai dengan:
- Dokumentasi Requirement SRS & UML System Analysis & Design
- Visual System Guidelines & Component Specifications

Jalankan:
    python web_ui.py
Lalu buka di browser:
    http://localhost:8000
"""

import http.server
import socketserver
import json
import urllib.parse
import random
from datetime import datetime, timedelta
import database

PORT = 8000

class SiLabWebHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path in ["/", "/index.html"]:
            self.serve_html()
        elif path == "/api/init-data":
            self.api_init_data()
        elif path == "/api/ujian-detail":
            self.api_ujian_detail(params.get("id_ujian", [""])[0], params.get("id_mahasiswa", [""])[0])
        elif path == "/api/dosen-data":
            self.api_dosen_data(params.get("id_dosen", [""])[0])
        elif path == "/api/mahasiswa-hasil":
            self.api_mahasiswa_hasil(params.get("id_mahasiswa", [""])[0])
        else:
            self.send_error(404)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8')) if length else {}
        path = urllib.parse.urlparse(self.path).path

        if path == "/api/login": self.handle_login(body)
        elif path == "/api/verify-pin": self.handle_verify_pin(body)
        elif path == "/api/auto-save": self.handle_auto_save(body)
        elif path == "/api/log-violation": self.handle_log_violation(body)
        elif path == "/api/submit-exam": self.handle_submit_exam(body)
        elif path == "/api/tetapkan-keputusan": self.handle_tetapkan_keputusan(body)
        else: self.send_error(404)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def handle_login(self, body):
        conn = database.get_connection()
        user = conn.execute("SELECT * FROM pengguna WHERE username = ?", (body.get("username", "").strip(),)).fetchone()
        if not user or user["password"] != body.get("password", "").strip():
            conn.close()
            return self.send_json({"success": False, "message": "Username atau password salah."}, 401)

        res = {"id_pengguna": user["id_pengguna"], "username": user["username"], "role": user["role"], "status_akun": user["status_akun"]}
        if user["role"] == "Mahasiswa":
            mhs = conn.execute("SELECT * FROM mahasiswa WHERE id_pengguna = ?", (user["id_pengguna"],)).fetchone()
            res.update({"id_mahasiswa": mhs["id_mahasiswa"], "nim": mhs["nim"], "nama": mhs["nama"]})
        else:
            dos = conn.execute("SELECT * FROM dosen WHERE id_pengguna = ?", (user["id_pengguna"],)).fetchone()
            res.update({"id_dosen": dos["id_dosen"], "nama_dosen": dos["nama_dosen"], "mata_kuliah": dos["mata_kuliah"]})
        conn.close()
        self.send_json({"success": True, "user": res})

    def api_init_data(self):
        conn = database.get_connection()
        rows = conn.execute("SELECT u.*, d.nama_dosen FROM ujian u JOIN dosen d ON u.id_dosen = d.id_dosen").fetchall()
        conn.close()
        self.send_json({"ujian": [dict(r) for r in rows]})

    def handle_verify_pin(self, body):
        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (body.get("id_ujian"),)).fetchone()
        if not ujian or ujian["pin_ujian"] != body.get("pin"):
            conn.close()
            return self.send_json({"success": False, "message": "PIN Ujian Tidak Valid."})

        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?", (body.get("id_ujian"), body.get("id_mahasiswa"))).fetchone()
        if not sesi:
            id_sesi = f"SESI_{int(datetime.now().timestamp())}"
            conn.execute("INSERT INTO sesi_ujian_mahasiswa VALUES (?, ?, ?, ?, ?, 0, 'Berlangsung')",
                         (id_sesi, body.get("id_ujian"), body.get("id_mahasiswa"), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ujian["durasi"]*60))
            conn.commit()
            s_id = id_sesi
        else:
            s_id = sesi["id_sesi"]
        conn.close()
        self.send_json({"success": True, "id_sesi": s_id})

    def api_ujian_detail(self, id_ujian, id_mahasiswa):
        conn = database.get_connection()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (id_ujian,)).fetchone()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_ujian = ? AND id_mahasiswa = ?", (id_ujian, id_mahasiswa)).fetchone()
        soal_rows = conn.execute("SELECT s.* FROM ujian_soal us JOIN soal s ON us.id_soal = s.id_soal WHERE us.id_ujian = ?", (id_ujian,)).fetchall()
        
        saved = {}
        if sesi:
            for j in conn.execute("SELECT id_soal, jawaban_dipilih FROM jawaban_mahasiswa WHERE id_sesi = ?", (sesi["id_sesi"],)).fetchall():
                saved[j["id_soal"]] = j["jawaban_dipilih"]

        soal_list = []
        for r in soal_rows:
            opsi = json.loads(r["opsi_jawaban"]) if isinstance(r["opsi_jawaban"], str) else r["opsi_jawaban"]
            random.shuffle(opsi)
            soal_list.append({"id_soal": r["id_soal"], "pertanyaan": r["pertanyaan"], "opsi_jawaban": opsi})
        conn.close()
        self.send_json({"ujian": dict(ujian), "sesi": dict(sesi) if sesi else None, "soal": soal_list, "jawaban_tersimpan": saved})

    def handle_auto_save(self, body):
        conn = database.get_connection()
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ex = conn.execute("SELECT id_jawaban FROM jawaban_mahasiswa WHERE id_sesi = ? AND id_soal = ?", (body.get("id_sesi"), body.get("id_soal"))).fetchone()
        if ex:
            conn.execute("UPDATE jawaban_mahasiswa SET jawaban_dipilih = ?, waktu_disimpan = ? WHERE id_jawaban = ?", (body.get("jawaban"), w_str, ex["id_jawaban"]))
        else:
            conn.execute("INSERT INTO jawaban_mahasiswa VALUES (?, ?, ?, ?, 1, ?)", (f"JAW_{int(datetime.now().timestamp())}", body.get("id_sesi"), body.get("id_soal"), body.get("jawaban"), w_str))
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def handle_log_violation(self, body):
        conn = database.get_connection()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?", (body.get("id_sesi"),)).fetchone()
        ujian = conn.execute("SELECT * FROM ujian WHERE id_ujian = ?", (sesi["id_ujian"],)).fetchone()
        jml = sesi["jumlah_peringatan"] + 1
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute("INSERT INTO log_pelanggaran VALUES (?, ?, ?, ?, ?)", (f"LOG_{int(datetime.now().timestamp())}", body.get("id_sesi"), body.get("jenis_pelanggaran"), w_str, jml))
        kunci = jml >= ujian["batas_toleransi_pelanggaran"]
        if kunci:
            conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ?, status_ujian = 'Dikunci Paksa' WHERE id_sesi = ?", (jml, body.get("id_sesi")))
            conn.execute("INSERT OR REPLACE INTO bukti_ujian_hasil VALUES (?, ?, ?, 'Dikunci Paksa', 0.0, 'Peringatan')", (f"TRX-EXAM-{random.randint(1000,9999)}", body.get("id_sesi"), w_str))
        else:
            conn.execute("UPDATE sesi_ujian_mahasiswa SET jumlah_peringatan = ? WHERE id_sesi = ?", (jml, body.get("id_sesi")))
        conn.commit()
        conn.close()
        self.send_json({"success": True, "jumlah_peringatan": jml, "batas_toleransi": ujian["batas_toleransi_pelanggaran"], "kunci_paksa": kunci})

    def handle_submit_exam(self, body):
        conn = database.get_connection()
        sesi = conn.execute("SELECT * FROM sesi_ujian_mahasiswa WHERE id_sesi = ?", (body.get("id_sesi"),)).fetchone()
        soal_rows = conn.execute("SELECT s.id_soal, s.kunci_jawaban FROM ujian_soal us JOIN soal s ON us.id_soal = s.id_soal WHERE us.id_ujian = ?", (sesi["id_ujian"],)).fetchall()
        
        total = len(soal_rows)
        benar = sum(1 for s in soal_rows if body.get("answers", {}).get(s["id_soal"]) == s["kunci_jawaban"])
        nilai = round((benar / total) * 100, 2) if total > 0 else 0.0
        w_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute("UPDATE sesi_ujian_mahasiswa SET status_ujian = ? WHERE id_sesi = ?", (body.get("status_pengiriman", "Selesai"), body.get("id_sesi")))
        b_id = f"TRX-EXAM-{random.randint(1000, 9999)}"
        conn.execute("INSERT OR REPLACE INTO bukti_ujian_hasil VALUES (?, ?, ?, ?, ?, 'Tidak Ada')", (b_id, body.get("id_sesi"), w_str, body.get("status_pengiriman", "Selesai"), nilai))
        conn.commit()
        conn.close()
        self.send_json({"success": True, "bukti": {"id_bukti": b_id, "id_sesi": body.get("id_sesi"), "waktu_pengiriman": w_str, "status_pengiriman": body.get("status_pengiriman"), "total_nilai": nilai}})

    def api_mahasiswa_hasil(self, id_mahasiswa):
        conn = database.get_connection()
        rows = conn.execute("SELECT b.*, u.nama_ujian FROM bukti_ujian_hasil b JOIN sesi_ujian_mahasiswa s ON b.id_sesi = s.id_sesi JOIN ujian u ON s.id_ujian = u.id_ujian WHERE s.id_mahasiswa = ?", (id_mahasiswa,)).fetchall()
        conn.close()
        self.send_json({"hasil": [dict(r) for r in rows]})

    def api_dosen_data(self, id_dosen):
        conn = database.get_connection()
        logs = conn.execute("""
        SELECT l.*, m.nama, m.nim, s.status_ujian FROM log_pelanggaran l
        JOIN sesi_ujian_mahasiswa s ON l.id_sesi = s.id_sesi
        JOIN mahasiswa m ON s.id_mahasiswa = m.id_mahasiswa
        JOIN ujian u ON s.id_ujian = u.id_ujian WHERE u.id_dosen = ? ORDER BY l.waktu_kejadian DESC
        """, (id_dosen,)).fetchall()
        conn.close()
        self.send_json({"logs": [dict(l) for l in logs]})

    def handle_tetapkan_keputusan(self, body):
        conn = database.get_connection()
        b_row = conn.execute("SELECT total_nilai FROM bukti_ujian_hasil WHERE id_sesi = ?", (body.get("id_sesi"),)).fetchone()
        if not b_row:
            conn.close()
            return self.send_json({"success": False, "message": "Bukti hasil belum tersedia."})

        n_lama = b_row["total_nilai"] if b_row["total_nilai"] is not None else 100.0
        n_baru = 0.0 if body.get("keputusan") == "Diskualifikasi" else (max(0.0, n_lama - 20.0) if body.get("keputusan") == "Pengurangan Nilai" else n_lama)
        conn.execute("UPDATE bukti_ujian_hasil SET total_nilai = ?, status_keputusan = ? WHERE id_sesi = ?", (n_baru, body.get("keputusan"), body.get("id_sesi")))
        conn.commit()
        conn.close()
        self.send_json({"success": True, "total_nilai": n_baru})

    def serve_html(self):
        html_content = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiLab Exam System | FIK UNKLAB</title>
  <style>
    :root { --primary: #2563EB; --primary-dark: #1E3A8A; --danger: #DC2626; --success: #16A34A; --warning: #F59E0B; --bg: #F8FAFC; --card: #FFFFFF; --text: #0F172A; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; }
    .header { background: var(--primary-dark); color: #fff; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
    .btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-success { background: var(--success); color: #fff; }
    .container { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
    .card { background: var(--card); border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #E2E8F0; font-size: 0.9rem; }
    th { background: #F1F5F9; font-weight: 700; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .no-select { user-select: none; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.75); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card { background: #FFFBEB; border: 1px solid #FCD34D; padding: 24px; border-radius: 10px; max-width: 400px; text-align: center; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    let currentUser = null, currentExamData = null, examTimerInterval = null, violationCount = 0, maxViolations = 3, studentAnswers = {}, isExamActive = false;
    const app = document.getElementById("app");

    renderLogin();

    function renderLogin() {
      app.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="width: 100%; max-width: 400px; text-align: center;">
            <h2 style="color: var(--primary-dark); margin-bottom: 6px;">SiLab Exam System</h2>
            <p style="color: #64748B; font-size: 0.85rem; margin-bottom: 20px;">Fakultas Ilmu Komputer — Universitas Klabat</p>
            <div style="text-align: left; margin-bottom: 12px;">
              <label style="font-size: 0.85rem; font-weight: 600;">NIM / Username:</label>
              <input type="text" id="username" value="105022410021" style="width: 100%; padding: 8px; margin-top: 4px;">
            </div>
            <div style="text-align: left; margin-bottom: 16px;">
              <label style="font-size: 0.85rem; font-weight: 600;">Password:</label>
              <input type="password" id="password" value="123" style="width: 100%; padding: 8px; margin-top: 4px;">
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="doLogin()">Masuk ▶</button>
            <div style="margin-top: 15px; font-size: 0.8rem; color: #64748B;">
              Quick Acc: <a href="#" onclick="setAcc('105022410021','123')">Juan (Mhs)</a> | <a href="#" onclick="setAcc('dosen','dosen123')">George (Dosen)</a>
            </div>
          </div>
        </div>
      `;
    }

    function setAcc(u, p) { document.getElementById("username").value = u; document.getElementById("password").value = p; }

    async function doLogin() {
      const u = document.getElementById("username").value.trim();
      const p = document.getElementById("password").value.trim();
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
      const data = await res.json();
      if (!data.success) return alert(data.message);
      currentUser = data.user;
      if (currentUser.role === "Mahasiswa") renderMahasiswaPortal(); else renderDosenPortal();
    }

    async function renderMahasiswaPortal() {
      const res = await fetch("/api/init-data");
      const data = await res.json();
      app.innerHTML = `
        <div class="header">
          <h1>🏛️ SiLab Exam | Portal Mahasiswa</h1>
          <div><span>${currentUser.nama} (${currentUser.nim})</span> <button class="btn btn-danger" style="padding: 4px 8px;" onclick="renderLogin()">Keluar</button></div>
        </div>
        <div class="container">
          <div class="card">
            <h3>Daftar Ujian Aktif</h3>
            <table>
              <thead><tr><th>Nama Ujian</th><th>Dosen</th><th>Durasi</th><th>Aksi</th></tr></thead>
              <tbody>
                ${data.ujian.map(u => `
                  <tr>
                    <td><strong>${u.nama_ujian}</strong></td>
                    <td>${u.nama_dosen}</td>
                    <td>${u.durasi} Menit</td>
                    <td><button class="btn btn-primary" onclick="promptPin('${u.id_ujian}', '${u.nama_ujian}')">🔑 Masuk Ujian</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    async function promptPin(idUjian, namaUjian) {
      const pin = prompt(`Masukkan PIN Ujian untuk: "${namaUjian}"`);
      if (!pin) return;
      const res = await fetch("/api/verify-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_ujian: idUjian, pin: pin.trim(), id_mahasiswa: currentUser.id_mahasiswa }) });
      const data = await res.json();
      if (!data.success) return alert(data.message);
      startExam(idUjian);
    }

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
        <div class="header" style="background: #0F172A;">
          <h1>📝 ${currentExamData.ujian.nama_ujian}</h1>
          <div>
            <span id="violation-badge" class="badge badge-warning">Peringatan: ${violationCount}/${maxViolations}</span>
            <span id="timer" style="font-family: monospace; font-size: 1.1rem; color: #38BDF8; margin-left: 10px;">--:--</span>
          </div>
        </div>
        <div class="container">
          ${currentExamData.soal.map((q, idx) => `
            <div class="card">
              <h4>${idx + 1}. ${q.pertanyaan}</h4>
              <div style="margin-top: 10px;">
                ${q.opsi_jawaban.map(opsi => `
                  <label style="display: block; margin-bottom: 6px;">
                    <input type="radio" name="soal_${q.id_soal}" value="${opsi}" ${studentAnswers[q.id_soal] === opsi ? 'checked' : ''} onchange="autoSave('${q.id_soal}', '${opsi}')"> ${opsi}
                  </label>
                `).join("")}
              </div>
            </div>
          `).join("")}
          <button class="btn btn-success" style="width: 100%; padding: 12px;" onclick="submitExam('Selesai')">💾 Kirim Jawaban Akhir</button>
        </div>
      `;

      clearInterval(examTimerInterval);
      examTimerInterval = setInterval(() => {
        if (!isExamActive) return;
        secondsLeft--;
        document.getElementById("timer").textContent = `Sisa Waktu: ${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,'0')}`;
        if (secondsLeft <= 0) { clearInterval(examTimerInterval); submitExam('Disubmit Otomatis'); }
      }, 1000);
    }

    async function autoSave(idSoal, val) {
      studentAnswers[idSoal] = val;
      await fetch("/api/auto-save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_sesi: currentExamData.sesi.id_sesi, id_soal: idSoal, jawaban: val }) });
    }

    function setupAntiCheat() {
      window.onblur = () => { if (isExamActive) recordViolation("Pindah Tab"); };
      document.oncopy = (e) => { if (isExamActive) { e.preventDefault(); recordViolation("Copy-Paste"); } };
    }

    async function recordViolation(jenis) {
      if (!isExamActive) return;
      const res = await fetch("/api/log-violation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_sesi: currentExamData.sesi.id_sesi, jenis_pelanggaran: jenis }) });
      const data = await res.json();
      violationCount = data.jumlah_peringatan;

      if (data.kunci_paksa) {
        isExamActive = false;
        clearInterval(examTimerInterval);
        document.body.classList.remove("no-select");
        alert("🔒 Sesi Ujian Dikunci Paksa karena terbukti melakukan pelanggaran berulang.");
        renderMahasiswaPortal();
      } else {
        alert(`⚠️ Peringatan ${violationCount}/${maxViolations}: Terdeteksi aksi '${jenis}'!`);
      }
    }

    async function submitExam(status) {
      isExamActive = false;
      clearInterval(examTimerInterval);
      document.body.classList.remove("no-select");
      const res = await fetch("/api/submit-exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_sesi: currentExamData.sesi.id_sesi, status_pengiriman: status, answers: studentAnswers }) });
      alert("✅ Ujian Berhasil Dikirim!");
      renderMahasiswaPortal();
    }

    async function renderDosenPortal() {
      const res = await fetch(`/api/dosen-data?id_dosen=${currentUser.id_dosen}`);
      const data = await res.json();
      app.innerHTML = `
        <div class="header">
          <h1>🏛️ SiLab Exam | Portal Dosen</h1>
          <div><span>${currentUser.nama_dosen}</span> <button class="btn btn-danger" style="padding: 4px 8px;" onclick="renderLogin()">Keluar</button></div>
        </div>
        <div class="container">
          <div class="card">
            <h3>🚨 Log Pelanggaran Anti-Curang</h3>
            <table>
              <thead><tr><th>Mahasiswa</th><th>Pelanggaran</th><th>Waktu</th><th>Akumulasi</th><th>Aksi Sanksi</th></tr></thead>
              <tbody>
                ${data.logs.map(l => `
                  <tr>
                    <td><strong>${l.nama}</strong> (${l.nim})</td>
                    <td><span class="badge badge-danger">${l.jenis_pelanggaran}</span></td>
                    <td>${l.waktu_kejadian}</td>
                    <td>${l.jumlah_pelanggaran}</td>
                    <td><button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="applySanksi('${l.id_sesi}')">Beri Sanksi (-20%)</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    async function applySanksi(idSesi) {
      await fetch("/api/tetapkan-keputusan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_sesi: idSesi, keputusan: "Pengurangan Nilai" }) });
      alert("Sanksi Pengurangan Nilai berhasil diterapkan!");
      renderDosenPortal();
    }
  </script>
</body>
</html>
"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))

if __name__ == "__main__":
    database.init_db()
    with socketserver.TCPServer(("", PORT), SiLabWebHandler) as httpd:
        print(f"SiLab Web Exam System aktif di: http://localhost:{PORT}")
        httpd.serve_forever()
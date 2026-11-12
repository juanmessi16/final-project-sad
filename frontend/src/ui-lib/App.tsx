import { FormEvent, ReactNode, useEffect, useState } from "react";

type View = "landing" | "student" | "lecturer" | "exam";
type Role = "student" | "lecturer";

const exams = [
  {
    id: 1,
    subject: "Pemrograman Web",
    code: "IF-241",
    date: "Senin, 16 Juni 2025",
    time: "09:00 – 10:30",
    duration: "90 menit",
    status: "Tersedia",
  },
  {
    id: 2,
    subject: "Basis Data Lanjut",
    code: "IF-305",
    date: "Rabu, 18 Juni 2025",
    time: "13:00 – 14:30",
    duration: "90 menit",
    status: "Akan datang",
  },
  {
    id: 3,
    subject: "Rekayasa Perangkat Lunak",
    code: "IF-312",
    date: "Jumat, 20 Juni 2025",
    time: "10:00 – 11:30",
    duration: "90 menit",
    status: "Akan datang",
  },
];

const questions = [
  {
    text: "Dalam pengembangan aplikasi web modern, manakah yang merupakan fungsi utama dari Virtual DOM pada React?",
    options: [
      "Menyimpan data pengguna secara permanen di browser",
      "Mengoptimalkan pembaruan antarmuka dengan membandingkan perubahan sebelum memperbarui DOM asli",
      "Menghubungkan aplikasi secara langsung ke basis data",
      "Menggantikan seluruh fungsi dari server web",
      "Mengatur keamanan dan autentikasi pengguna",
    ],
  },
  {
    text: "Manakah metode HTTP yang paling tepat digunakan untuk memperbarui sebagian data dari sebuah sumber daya?",
    options: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  },
  {
    text: "Apa manfaat utama penggunaan semantic HTML dalam sebuah halaman web?",
    options: [
      "Mengurangi ukuran semua gambar secara otomatis",
      "Menghilangkan kebutuhan terhadap CSS",
      "Meningkatkan aksesibilitas dan membantu mesin pencari memahami struktur konten",
      "Membuat halaman selalu dapat digunakan tanpa JavaScript",
      "Menyimpan seluruh data halaman di server",
    ],
  },
  {
    text: "Properti CSS mana yang digunakan untuk mengatur jarak di antara isi elemen dan batasnya?",
    options: ["margin", "padding", "gap", "outline", "position"],
  },
  {
    text: "Apa tujuan utama penggunaan TypeScript dalam pengembangan aplikasi skala besar?",
    options: [
      "Menggantikan browser dengan lingkungan runtime baru",
      "Memberikan sistem tipe statis untuk membantu menemukan kesalahan lebih awal",
      "Mengubah CSS menjadi JavaScript",
      "Membuat jaringan internet lebih cepat",
      "Mengelola basis data tanpa server",
    ],
  },
];

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <path d="m18 6-12 12" />
        <path d="m6 6 12 12" />
      </>
    ),
    dashboard: (
      <>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
      </>
    ),
    exam: (
      <>
        <path d="M9 5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" />
        <path d="M5 3h4v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M13 9h4M13 13h4M13 17h3" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className={compact ? "brand-mark small" : "brand-mark"}>
        <Icon name="shield" size={compact ? 19 : 25} />
      </span>
      <span className={compact ? "brand-name compact" : "brand-name"}>
        <b>x</b>Unklab
      </span>
    </div>
  );
}

function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Tutup" className="modal-close" onClick={onClose}>
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

function Landing({ onLogin }: { onLogin: (role: Role) => void }) {
  return (
    <main className="landing">
      <div className="landing-orb orb-one" />
      <div className="landing-orb orb-two" />
      <div className="landing-content">
        <div className="hero-logo">
          <Brand />
        </div>
        <p className="eyebrow">Ujian daring yang aman &amp; terintegrasi</p>
        <h1>
          Fokus pada ujianmu.
          <br />
          Kami menjaga sisanya.
        </h1>
        <p className="hero-copy">
          Sistem ujian berbasis web yang dirancang untuk pengalaman evaluasi yang tenang, jujur, dan
          tanpa distraksi.
        </p>
        <div className="login-actions">
          <button className="button primary" onClick={() => onLogin("student")}>
            Login Mahasiswa <Icon name="arrow" size={18} />
          </button>
          <button className="button secondary" onClick={() => onLogin("lecturer")}>
            Login Dosen
          </button>
        </div>
        <div className="security-note">
          <Icon name="shield" size={17} />
          <span>Didukung sistem pengawasan ujian terintegrasi</span>
        </div>
      </div>
      <footer className="landing-footer">
        <span>Universitas Klabat</span>
        <span>© 2025 xUnklab</span>
      </footer>
    </main>
  );
}

function LoginModal({
  role,
  onClose,
  onSuccess,
}: {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(onSuccess, 450);
  };

  return (
    <Modal labelledBy="login-title" onClose={onClose}>
      <div className="modal-brand">
        <Brand compact />
      </div>
      <p className="modal-kicker">{role === "student" ? "PORTAL MAHASISWA" : "PORTAL DOSEN"}</p>
      <h2 id="login-title">Selamat datang kembali</h2>
      <p className="modal-subtitle">Masukkan akun universitas Anda untuk melanjutkan.</p>
      <form className="login-form" onSubmit={submit}>
        <label>
          Username / NIM
          <input
            autoFocus
            placeholder={role === "student" ? "Contoh: 105022410001" : "Username dosen"}
            required
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              minLength={4}
              placeholder="Masukkan password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </span>
        </label>
        <button className="button primary wide" disabled={loading} type="submit">
          {loading ? "Memverifikasi..." : "Masuk"}
          {!loading && <Icon name="arrow" size={18} />}
        </button>
      </form>
      <p className="login-help">Bermasalah dengan akun? Hubungi administrator kampus.</p>
    </Modal>
  );
}

function StudentDashboard({
  onLogout,
  onStartExam,
}: {
  onLogout: () => void;
  onStartExam: () => void;
}) {
  const [pinExam, setPinExam] = useState<(typeof exams)[number] | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const verifyPin = (event: FormEvent) => {
    event.preventDefault();
    if (pin.replace(/\D/g, "").length < 4) {
      setError(true);
      return;
    }
    setPinExam(null);
    onStartExam();
  };

  return (
    <div className="app-shell student-shell">
      <header className="topbar">
        <Brand compact />
        <div className="profile-actions">
          <button aria-label="Notifikasi" className="icon-button">
            <Icon name="bell" size={19} />
            <span className="notification-dot" />
          </button>
          <span className="topbar-divider" />
          <div className="avatar">JM</div>
          <div className="profile-text">
            <strong>Jonathan Mambu</strong>
            <span>105022410001</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={17} /> <span>Keluar</span>
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <section className="welcome-row">
          <div>
            <p className="section-kicker">SENIN, 16 JUNI 2025</p>
            <h1>Selamat pagi, Jonathan.</h1>
            <p>Berikut jadwal ujian yang telah disiapkan untukmu.</p>
          </div>
          <div className="date-card">
            <Icon name="calendar" size={21} />
            <div>
              <span>Semester Genap</span>
              <strong>2024 / 2025</strong>
            </div>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <h2>Jadwal Ujian</h2>
              <p>Pastikan perangkat dan koneksi internetmu siap.</p>
            </div>
            <span className="exam-count">3 ujian</span>
          </div>
          <div className="exam-grid">
            {exams.map((exam, index) => (
              <article className={`exam-card ${index === 0 ? "available" : ""}`} key={exam.id}>
                <div className="card-topline">
                  <span className={`status ${index === 0 ? "status-live" : ""}`}>
                    {index === 0 && <i />}
                    {exam.status}
                  </span>
                  <button aria-label="Menu ujian">
                    <Icon name="dots" />
                  </button>
                </div>
                <div className="subject-icon">
                  <Icon name="exam" size={22} />
                </div>
                <p className="course-code">{exam.code}</p>
                <h3>{exam.subject}</h3>
                <div className="exam-meta">
                  <span>
                    <Icon name="calendar" size={17} />
                    {exam.date}
                  </span>
                  <span>
                    <Icon name="clock" size={17} />
                    {exam.time} · {exam.duration}
                  </span>
                </div>
                <button
                  className={`button exam-button ${index === 0 ? "primary" : "disabled"}`}
                  disabled={index !== 0}
                  onClick={() => setPinExam(exam)}
                >
                  {index === 0 ? "Mulai Ujian" : "Belum Tersedia"}
                  {index === 0 && <Icon name="arrow" size={17} />}
                </button>
              </article>
            ))}
          </div>
        </section>
        <aside className="info-strip">
          <span className="info-icon">
            <Icon name="shield" size={20} />
          </span>
          <div>
            <strong>Lingkungan ujian aman</strong>
            <p>Aktivitas selama ujian akan dipantau. Tutup aplikasi lain sebelum memulai.</p>
          </div>
          <button>Pelajari aturan</button>
        </aside>
        <section className="result-preview">
          <div>
            <span className="subject-icon">
              <Icon name="file" size={21} />
            </span>
            <div>
              <p className="section-kicker">HASIL TERBARU</p>
              <h3>Algoritma &amp; Struktur Data</h3>
              <p>Hasil telah dipublikasikan pada 12 Juni 2025</p>
            </div>
          </div>
          <div className="result-score">
            <span>Nilai akhir</span>
            <strong>86</strong>
          </div>
          <button className="button secondary" onClick={() => setResultOpen(true)}>
            Lihat Hasil
          </button>
        </section>
      </main>

      {pinExam && (
        <Modal labelledBy="pin-title" onClose={() => setPinExam(null)}>
          <div className="pin-icon">
            <Icon name="lock" size={24} />
          </div>
          <p className="modal-kicker centered">VERIFIKASI UJIAN</p>
          <h2 className="centered" id="pin-title">
            Masukkan PIN Ujian
          </h2>
          <p className="modal-subtitle centered">
            PIN diberikan oleh pengawas untuk ujian
            <br />
            <strong>{pinExam.subject}</strong>.
          </p>
          <form className="pin-form" onSubmit={verifyPin}>
            <input
              aria-label="PIN Ujian"
              autoFocus
              className={error ? "input-error" : ""}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ""));
                setError(false);
              }}
              placeholder="••••••"
              value={pin}
            />
            {error && <small>Masukkan minimal 4 digit PIN ujian.</small>}
            <button className="button primary wide" type="submit">
              Masuk ke Ujian <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="pin-note">
            <Icon name="shield" size={15} /> Jangan bagikan PIN kepada siapa pun.
          </p>
        </Modal>
      )}
      {resultOpen && (
        <Modal labelledBy="result-title" onClose={() => setResultOpen(false)}>
          <div className="pin-icon">
            <Icon name="file" size={24} />
          </div>
          <p className="modal-kicker centered">HASIL DIPUBLIKASIKAN</p>
          <h2 className="centered" id="result-title">
            Algoritma &amp; Struktur Data
          </h2>
          <div className="result-detail">
            <strong>86</strong>
            <span>Nilai akhir</span>
            <div>
              <p>
                Jawaban objektif <b>66 / 75</b>
              </p>
              <p>
                Penilaian esai <b>20 / 25</b>
              </p>
            </div>
          </div>
          <button className="button primary wide" onClick={() => setResultOpen(false)}>
            Tutup
          </button>
        </Modal>
      )}
    </div>
  );
}

const navItems = [
  ["dashboard", "Dashboard"],
  ["exam", "Kelola Bank Soal"],
  ["calendar", "Atur Ujian"],
  ["users", "Kelola Peserta"],
  ["shield", "Tinjau Log Pelanggaran"],
];

function LecturerModule({ active }: { active: string }) {
  const [questionsList, setQuestionsList] = useState([
    ["Apa fungsi utama Virtual DOM pada React?", "Pilihan Ganda", "10 poin"],
    ["HTTP adalah protokol stateless.", "Benar / Salah", "5 poin"],
    ["Jelaskan konsep RESTful API.", "Esai", "20 poin"],
  ]);
  const [participants, setParticipants] = useState([
    ["105022410001", "Jonathan Mambu", "Kelas A", "Terdaftar"],
    ["105022410018", "Chelsea Runtuwene", "Kelas A", "Sedang ujian"],
    ["105022410027", "Kevin Tumbel", "Kelas A", "Terdaftar"],
  ]);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  if (active === "Kelola Bank Soal") {
    return (
      <section className="management-panel">
        <div className="management-toolbar">
          <div>
            <p className="section-kicker">IF-241 · PEMROGRAMAN WEB</p>
            <h2>Bank Soal</h2>
            <p>Kelola pilihan ganda, benar/salah, isian singkat, dan esai.</p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              setQuestionsList([
                ...questionsList,
                ["Soal baru — klik ubah untuk melengkapi", "Isian Singkat", "10 poin"],
              ])
            }
          >
            <Icon name="plus" size={17} /> Tambah Soal
          </button>
        </div>
        <div className="data-table">
          <div className="table-row table-head">
            <span>Pertanyaan</span>
            <span>Tipe</span>
            <span>Bobot</span>
            <span>Aksi</span>
          </div>
          {questionsList.map((item, index) => (
            <div className="table-row" key={`${item[0]}-${index}`}>
              <strong>{item[0]}</strong>
              <span>
                <i className="type-dot" />
                {item[1]}
              </span>
              <span>{item[2]}</span>
              <span className="row-actions">
                <button
                  aria-label="Ubah soal"
                  onClick={() =>
                    setQuestionsList(
                      questionsList.map((question, questionIndex) =>
                        questionIndex === index
                          ? [`${question[0]} (diperbarui)`, question[1], question[2]]
                          : question,
                      ),
                    )
                  }
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  aria-label="Hapus soal"
                  onClick={() =>
                    setQuestionsList(questionsList.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (active === "Atur Ujian") {
    return (
      <section className="management-panel">
        <div className="management-toolbar">
          <div>
            <p className="section-kicker">PENGATURAN UJIAN</p>
            <h2>Pemrograman Web</h2>
            <p>Atur jadwal, keamanan, dan aturan pengerjaan.</p>
          </div>
          <button className="button primary" onClick={() => setSettingsSaved(true)}>
            <Icon name={settingsSaved ? "check" : "save"} size={17} />{" "}
            {settingsSaved ? "Pengaturan Tersimpan" : "Simpan Pengaturan"}
          </button>
        </div>
        <div className="settings-grid">
          <label>
            Nama ujian
            <input defaultValue="Ujian Akhir Semester — Pemrograman Web" />
          </label>
          <label>
            Jadwal mulai
            <input defaultValue="2025-06-16 09:00" type="text" />
          </label>
          <label>
            Durasi (menit)
            <input defaultValue="90" type="number" />
          </label>
          <label>
            PIN ujian
            <input defaultValue="••••••" type="password" />
          </label>
          <label>
            Jumlah percobaan
            <select defaultValue="1">
              <option>1</option>
              <option>2</option>
            </select>
          </label>
          <label>
            Ambang pelanggaran
            <select defaultValue="3">
              <option>3 — Kunci sesi</option>
              <option>5 — Kunci sesi</option>
            </select>
          </label>
        </div>
        <div className="toggle-list">
          {[
            ["Acak urutan soal", "Setiap peserta menerima urutan soal berbeda.", true],
            ["Acak opsi jawaban", "Pilihan jawaban diacak untuk setiap peserta.", true],
            ["Batasi jaringan kampus", "Ujian hanya dapat diakses dari jaringan kampus.", false],
          ].map(([title, description, checked]) => (
            <label key={String(title)}>
              <div>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
              <input defaultChecked={Boolean(checked)} type="checkbox" />
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (active === "Kelola Peserta") {
    return (
      <section className="management-panel">
        <div className="management-toolbar">
          <div>
            <p className="section-kicker">PESERTA UJIAN</p>
            <h2>45 Mahasiswa Terdaftar</h2>
            <p>Hanya peserta terdaftar yang dapat memulai ujian.</p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              setParticipants([
                ...participants,
                ["105022410099", "Mahasiswa Baru", "Kelas A", "Terdaftar"],
              ])
            }
          >
            <Icon name="plus" size={17} /> Tambah Peserta
          </button>
        </div>
        <div className="data-table">
          <div className="table-row participants table-head">
            <span>NIM</span>
            <span>Nama</span>
            <span>Kelas</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {participants.map((item, index) => (
            <div className="table-row participants" key={item[0]}>
              <span>{item[0]}</span>
              <strong>{item[1]}</strong>
              <span>{item[2]}</span>
              <span>
                <b className={item[3] === "Sedang ujian" ? "status-chip live" : "status-chip"}>
                  {item[3]}
                </b>
              </span>
              <span className="row-actions">
                <button
                  aria-label="Hapus peserta"
                  onClick={() =>
                    setParticipants(participants.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="management-panel violation-panel">
      <div className="management-toolbar">
        <div>
          <p className="section-kicker">LOG TIDAK DAPAT DIUBAH</p>
          <h2>Tinjau Log Pelanggaran</h2>
          <p>Data aktivitas menjadi pendukung; keputusan akhir tetap pada dosen.</p>
        </div>
        <span className="review-count">
          <Icon name="warning" size={16} /> 3 perlu ditinjau
        </span>
      </div>
      {[
        ["Chelsea Runtuwene", "105022410018", "Perpindahan tab", "09:24:18", "Peringatan 2/3"],
        ["Kevin Tumbel", "105022410027", "Percobaan copy-paste", "09:31:04", "Peringatan 1/3"],
        ["Marcelino Waworuntu", "105022410042", "Keluar layar penuh", "09:35:46", "Sesi terkunci"],
      ].map((item, index) => (
        <article className="violation-row" key={item[1]}>
          <span className="warning-symbol">
            <Icon name="warning" size={18} />
          </span>
          <div>
            <strong>{item[0]}</strong>
            <span>{item[1]}</span>
          </div>
          <div>
            <strong>{item[2]}</strong>
            <span>
              {item[3]} · {item[4]}
            </span>
          </div>
          <select
            aria-label={`Keputusan untuk ${item[0]}`}
            onChange={(event) => setDecisions({ ...decisions, [index]: event.target.value })}
            value={decisions[index] || ""}
          >
            <option value="" disabled>
              Tetapkan keputusan
            </option>
            <option>Peringatan</option>
            <option>Izinkan lanjut</option>
            <option>Diskualifikasi</option>
          </select>
        </article>
      ))}
    </section>
  );
}

function LecturerDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  return (
    <div className="lecturer-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand compact />
        </div>
        <nav>
          <p>MENU UTAMA</p>
          {navItems.map(([icon, label]) => (
            <button
              className={activeNav === label ? "active" : ""}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon} size={19} /> <span>{label}</span>
              {label === "Tinjau Log Pelanggaran" && <b>3</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-security">
          <Icon name="shield" size={20} />
          <div>
            <strong>Sistem terlindungi</strong>
            <span>Semua aktivitas tercatat</span>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar lecturer-avatar">JL</div>
          <div>
            <strong>Dr. Johan Lengkong</strong>
            <span>Dosen Informatika</span>
          </div>
          <button aria-label="Keluar" onClick={onLogout}>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <main className="lecturer-main">
        <header className="mobile-lecturer-header">
          <Brand compact />
          <button onClick={onLogout}>
            <Icon name="logout" />
          </button>
        </header>
        <div className="lecturer-top">
          <div>
            <p className="section-kicker">RINGKASAN AKADEMIK</p>
            <h1>{activeNav === "Dashboard" ? "Selamat pagi, Dr. Johan." : activeNav}</h1>
            <p>
              {activeNav === "Dashboard"
                ? "Pantau dan kelola seluruh aktivitas ujian dari satu tempat."
                : "Modul ini siap digunakan untuk pengelolaan aktivitas akademik."}
            </p>
          </div>
          <button className="button primary" onClick={() => setActiveNav("Atur Ujian")}>
            <Icon name="plus" size={18} /> Buat Ujian Baru
          </button>
        </div>

        <div className="mobile-nav">
          {navItems.slice(0, 4).map(([icon, label]) => (
            <button
              className={activeNav === label ? "active" : ""}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon} size={18} />
              <span>{label.replace("Kelola ", "")}</span>
            </button>
          ))}
        </div>

        {activeNav === "Dashboard" ? (
          <>
            <section className="stats-grid">
              <article>
                <span className="stat-icon blue">
                  <Icon name="exam" />
                </span>
                <div>
                  <p>Ujian Aktif</p>
                  <strong>2</strong>
                  <small>Berlangsung saat ini</small>
                </div>
              </article>
              <article>
                <span className="stat-icon sage">
                  <Icon name="calendar" />
                </span>
                <div>
                  <p>Ujian Mendatang</p>
                  <strong>6</strong>
                  <small>Dalam 7 hari ke depan</small>
                </div>
              </article>
              <article>
                <span className="stat-icon gray">
                  <Icon name="users" />
                </span>
                <div>
                  <p>Peserta Terdaftar</p>
                  <strong>184</strong>
                  <small>Dari semua kelas</small>
                </div>
              </article>
              <article>
                <span className="stat-icon sand">
                  <Icon name="shield" />
                </span>
                <div>
                  <p>Perlu Ditinjau</p>
                  <strong>3</strong>
                  <small>Log pelanggaran baru</small>
                </div>
              </article>
            </section>

            <section className="lecturer-sections">
              <div className="running-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Sedang Berlangsung</h2>
                    <p>Pantau ujian secara real-time.</p>
                  </div>
                  <button>
                    Lihat semua <Icon name="arrow" size={16} />
                  </button>
                </div>
                {[
                  ["Pemrograman Web", "IF-241 · Kelas A", "42 / 45", "Berakhir 10:30"],
                  ["Algoritma & Struktur Data", "IF-203 · Kelas B", "38 / 40", "Berakhir 11:00"],
                ].map((item) => (
                  <article className="running-exam" key={item[0]}>
                    <span className="live-pulse">
                      <i />
                    </span>
                    <div className="running-title">
                      <strong>{item[0]}</strong>
                      <span>{item[1]}</span>
                    </div>
                    <div className="participant-count">
                      <Icon name="users" size={17} />
                      <span>
                        <strong>{item[2]}</strong> peserta
                      </span>
                    </div>
                    <div className="end-time">
                      <Icon name="clock" size={17} />
                      {item[3]}
                    </div>
                    <button
                      className="monitor-button"
                      onClick={() => setActiveNav("Tinjau Log Pelanggaran")}
                    >
                      Pantau
                    </button>
                  </article>
                ))}
              </div>
              <div className="upcoming-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Ujian Mendatang</h2>
                    <p>Jadwal terdekat.</p>
                  </div>
                  <button aria-label="Lihat semua">
                    <Icon name="arrow" size={17} />
                  </button>
                </div>
                {[
                  ["18", "JUN", "Basis Data Lanjut", "13:00 · 45 peserta"],
                  ["20", "JUN", "Rekayasa Perangkat Lunak", "10:00 · 52 peserta"],
                  ["23", "JUN", "Interaksi Manusia & Komputer", "09:00 · 40 peserta"],
                ].map((item) => (
                  <article className="upcoming-item" key={item[2]}>
                    <span className="date-box">
                      <strong>{item[0]}</strong>
                      <small>{item[1]}</small>
                    </span>
                    <div>
                      <strong>{item[2]}</strong>
                      <span>{item[3]}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <LecturerModule active={activeNav} />
        )}
      </main>
    </div>
  );
}

function ExamPage({ onExit }: { onExit: () => void }) {
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [seconds, setSeconds] = useState(90 * 60);
  const [confirm, setConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const [locked, setLocked] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [submittedAt, setSubmittedAt] = useState("");

  const submitExam = () => {
    setSubmittedAt(
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "medium",
      }).format(new Date()),
    );
    setSubmitted(true);
    setConfirm(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  const registerViolation = (message: string) => {
    setViolations((current) => {
      const next = current + 1;
      if (next >= 3) {
        setLocked(true);
      } else {
        setWarning(message);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!started || submitted || locked) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    const autoSave = window.setInterval(() => {
      setSaveState("saving");
      window.setTimeout(() => setSaveState("saved"), 650);
    }, 30000);
    const visibility = () => {
      if (document.hidden) registerViolation("Perpindahan tab atau jendela terdeteksi.");
    };
    const fullscreen = () => {
      if (!document.fullscreenElement) registerViolation("Kamu keluar dari mode layar penuh.");
    };
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      registerViolation("Aksi copy atau paste telah diblokir.");
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(autoSave);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
    };
  }, [started, submitted, locked]);

  useEffect(() => {
    if (started && seconds === 0 && !submitted) submitExam();
  }, [seconds, started, submitted]);

  const moveQuestion = (target: number) => {
    setSaveState("saving");
    setQuestion(target);
    window.setTimeout(() => setSaveState("saved"), 500);
  };

  const startExam = () => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    setStarted(true);
  };

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  if (!started) {
    return (
      <main className="preflight-page">
        <header>
          <Brand compact />
          <span>Verifikasi sebelum ujian</span>
        </header>
        <section className="preflight-card">
          <p className="section-kicker">LANGKAH TERAKHIR</p>
          <h1>Pastikan identitas dan perangkatmu siap.</h1>
          <p>Ujian akan berjalan dalam mode layar penuh dan aktivitas browser akan dicatat.</p>
          <div className="identity-card">
            <div className="avatar">JM</div>
            <div>
              <span>Nama peserta</span>
              <strong>Jonathan Mambu</strong>
            </div>
            <div>
              <span>NIM</span>
              <strong>105022410001</strong>
            </div>
            <div>
              <span>Kelas</span>
              <strong>IF-241 · A</strong>
            </div>
          </div>
          <div className="preflight-exam">
            <div>
              <span>Ujian</span>
              <strong>Pemrograman Web</strong>
            </div>
            <div>
              <span>Durasi</span>
              <strong>90 menit</strong>
            </div>
            <div>
              <span>Percobaan</span>
              <strong>1 dari 1</strong>
            </div>
          </div>
          <div className="readiness-list">
            {[
              "Koneksi internet terhubung",
              "Browser mendukung mode layar penuh",
              "Soal dan opsi jawaban akan diacak",
              "Jawaban tersimpan otomatis setiap 30 detik",
            ].map((item) => (
              <span key={item}>
                <i>
                  <Icon name="check" size={14} />
                </i>
                {item}
              </span>
            ))}
          </div>
          <aside>
            <Icon name="warning" size={19} />
            <p>
              <strong>Peraturan anti-curang aktif</strong>Berpindah tab, keluar dari layar penuh,
              atau mencoba copy-paste akan dicatat. Sesi dikunci pada pelanggaran ke-3.
            </p>
          </aside>
          <button className="button primary wide" onClick={startExam}>
            Saya Siap, Mulai Ujian <Icon name="arrow" size={18} />
          </button>
        </section>
      </main>
    );
  }

  if (locked) {
    return (
      <main className="locked-page">
        <div className="locked-card">
          <span>
            <Icon name="lock" size={30} />
          </span>
          <p className="modal-kicker">SESI DIKUNCI</p>
          <h1>Batas pelanggaran tercapai.</h1>
          <p>
            Sesi ujian dikunci setelah 3 pelanggaran. Jawaban terakhir telah disimpan dan log
            dikirim kepada dosen.
          </p>
          <div>
            <strong>3 / 3</strong>
            <span>Pelanggaran tercatat</span>
          </div>
          <button className="button secondary" onClick={onExit}>
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="submitted-page">
        <div className="submitted-card receipt-card">
          <span>
            <Icon name="check" size={32} />
          </span>
          <p className="modal-kicker">PENGIRIMAN BERHASIL</p>
          <h1>Jawaban berhasil dikirim.</h1>
          <p>Resi ini merupakan bukti bahwa server telah menerima jawabanmu.</p>
          <div className="receipt">
            <div>
              <span>Nama</span>
              <strong>Jonathan Mambu</strong>
            </div>
            <div>
              <span>NIM</span>
              <strong>105022410001</strong>
            </div>
            <div>
              <span>Ujian</span>
              <strong>Pemrograman Web</strong>
            </div>
            <div>
              <span>Waktu kirim</span>
              <strong>{submittedAt}</strong>
            </div>
            <div>
              <span>ID Resi</span>
              <strong>XU-IF241-160625-001</strong>
            </div>
            <div>
              <span>Status</span>
              <b>
                <Icon name="check" size={13} /> Terkonfirmasi
              </b>
            </div>
          </div>
          <button className="button primary" onClick={onExit}>
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div className="exam-identity">
          <Brand compact />
          <span />
          <div>
            <p>IF-241</p>
            <strong>Pemrograman Web</strong>
          </div>
        </div>
        <div className="exam-statuses">
          <span className="save-status">
            <Icon name="save" size={15} />
            {saveState === "saving" ? "Menyimpan..." : "Tersimpan"}
          </span>
          <span className="violation-status">
            <Icon name="shield" size={15} />
            Pelanggaran {violations}/3
          </span>
          <div className="timer">
            <Icon name="clock" size={20} />
            <div>
              <span>SISA WAKTU</span>
              <strong>
                {minutes}:{secs}
              </strong>
            </div>
          </div>
        </div>
      </header>
      <div className="exam-progress">
        <i style={{ width: `${((question + 1) / questions.length) * 100}%` }} />
      </div>
      <main className="question-stage">
        <div className="question-container">
          <div className="question-meta">
            <span>
              SOAL {question + 1} DARI {questions.length} · URUTAN DIACAK
            </span>
            <span>Pilihan Ganda</span>
          </div>
          <h1>{questions[question].text}</h1>
          <div className="options">
            {questions[question].options.map((option, index) => (
              <button
                className={answers[question] === index ? "selected" : ""}
                key={option}
                onClick={() => {
                  setAnswers({ ...answers, [question]: index });
                  setSaveState("saving");
                  window.setTimeout(() => setSaveState("saved"), 500);
                }}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                <p>{option}</p>
                <i>
                  <Icon name="check" size={15} />
                </i>
              </button>
            ))}
          </div>
        </div>
      </main>
      <footer className="exam-footer">
        <button
          className="exam-nav-button"
          disabled={question === 0}
          onClick={() => moveQuestion(question - 1)}
        >
          <Icon name="back" size={18} /> Soal Sebelumnya
        </button>
        <div className="question-dots">
          {questions.map((_, index) => (
            <button
              aria-label={`Ke soal ${index + 1}`}
              className={`${index === question ? "current" : ""} ${answers[index] !== undefined ? "answered" : ""}`}
              key={index}
              onClick={() => moveQuestion(index)}
            />
          ))}
        </div>
        <div className="footer-right">
          {question < questions.length - 1 && (
            <button className="exam-nav-button" onClick={() => moveQuestion(question + 1)}>
              Soal Selanjutnya <Icon name="arrow" size={18} />
            </button>
          )}
          <button className="button submit-button" onClick={() => setConfirm(true)}>
            Kirim Jawaban
          </button>
        </div>
      </footer>
      {warning && (
        <div className="warning-overlay" role="alertdialog" aria-modal="true">
          <div className="warning-card">
            <span>
              <Icon name="warning" size={27} />
            </span>
            <p className="modal-kicker">PERINGATAN {violations} DARI 3</p>
            <h2>Aktivitas tidak diizinkan terdeteksi.</h2>
            <p>{warning} Aktivitas ini telah dicatat pada log pelanggaran.</p>
            <div className="warning-meter">
              <i className={violations > 0 ? "filled" : ""} />
              <i className={violations > 1 ? "filled" : ""} />
              <i />
            </div>
            <button className="button primary wide" onClick={() => setWarning("")}>
              Saya Mengerti, Lanjutkan
            </button>
          </div>
        </div>
      )}
      {confirm && (
        <Modal labelledBy="submit-title" onClose={() => setConfirm(false)}>
          <div className="pin-icon">
            <Icon name="check" size={24} />
          </div>
          <h2 className="centered" id="submit-title">
            Kirim jawaban sekarang?
          </h2>
          <p className="modal-subtitle centered">
            Kamu telah menjawab{" "}
            <strong>
              {Object.keys(answers).length} dari {questions.length} soal
            </strong>
            . Jawaban tidak dapat diubah setelah dikirim.
          </p>
          <div className="confirm-actions">
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Periksa Lagi
            </button>
            <button className="button primary" onClick={submitExam}>
              Ya, Kirim Jawaban
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [loginRole, setLoginRole] = useState<Role | null>(null);

  const loginSuccess = () => {
    setView(loginRole === "student" ? "student" : "lecturer");
    setLoginRole(null);
  };
  const logout = () => setView("landing");

  return (
    <>
      {view === "landing" && <Landing onLogin={setLoginRole} />}
      {view === "student" && (
        <StudentDashboard onLogout={logout} onStartExam={() => setView("exam")} />
      )}
      {view === "lecturer" && <LecturerDashboard onLogout={logout} />}
      {view === "exam" && <ExamPage onExit={() => setView("student")} />}
      {loginRole && (
        <LoginModal onClose={() => setLoginRole(null)} onSuccess={loginSuccess} role={loginRole} />
      )}
    </>
  );
}

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  addExtraTimeForExamOrSession,
  applySanctionDecisionApi,
  autosaveSessionAnswers,
  clearAuthToken,
  createExamApi,
  createQuestionApi,
  deduplicateExams,
  deleteExamApi,
  deleteQuestionApi,
  ExamItem,
  fetchStateFromBackend,
  getOfflineQueue,
  getSimulatedIp,
  gradeEssayAndRecalculate,
  isCampusIp,
  isTokenExpired,
  loadLocalDB,
  loginApi,
  logoutApi,
  ParticipantItem,
  QuestionItem,
  recordViolationApi,
  resetUserDeviceSessionApi,
  saveLocalDB,
  sendAuthHeartbeatApi,
  setSimulatedIp,
  submitExamSessionApi,
  syncExamsFromBackend,
  togglePublishExamResultApi,
  updateExamSettingsApi,
  updateQuestionApi,
  verifyPinAndStartSession,
  ViolationLogItem,
} from "./apiClient";

type View = "landing" | "student" | "lecturer" | "exam";
type Role = "student" | "lecturer";

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
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
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
  onSuccess: (user: any) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const res = await loginApi(username, password, role);
    if (!res.success) {
      setErrorMsg(res.message || "Username atau password salah. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("currentUser", JSON.stringify(res.user));
    setLoading(false);
    onSuccess(res.user);
  };

  return (
    <Modal labelledBy="login-title" onClose={onClose}>
      <div className="modal-brand">
        <Brand compact />
      </div>
      <p className="modal-kicker">{role === "student" ? "PORTAL MAHASISWA" : "PORTAL DOSEN"}</p>
      <h2 id="login-title">Selamat datang kembali</h2>
      <p className="modal-subtitle">Masukkan akun universitas Anda untuk melanjutkan.</p>

      {errorMsg && (
        <div
          role="alert"
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #f87171",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            lineHeight: "1.4",
            marginBottom: "16px",
          }}
        >
          <strong>Gagal Masuk: </strong>
          {errorMsg}
        </div>
      )}

      <form className="login-form" onSubmit={submit}>
        <label>
          {role === "student" ? "Username / NIM" : "Username / NIP"}
          <input
            autoFocus
            placeholder={role === "student" ? "Contoh: 105022410021" : "Contoh: dosen atau NIP"}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              minLength={3}
              placeholder="Masukkan password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </span>
        </label>
        <button className="button primary wide" disabled={loading} type="submit">
          {loading ? "Memverifikasi ke Database..." : "Masuk"}
          {!loading && <Icon name="arrow" size={18} />}
        </button>
      </form>

      <div
        style={{
          marginTop: "14px",
          padding: "10px 12px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          fontSize: "12px",
          color: "#475569",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <strong>Akun Uji Cepat (Klik untuk isi otomatis):</strong>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {role === "student" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setUsername("105022410021");
                  setPassword("123");
                  setErrorMsg("");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Mahasiswa Aktif (105022410021 / 123)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("105022499999");
                  setPassword("123");
                  setErrorMsg("");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #fca5a5",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Akun Terkunci TC-04 (105022499999)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setUsername("dosen");
                  setPassword("dosen123");
                  setErrorMsg("");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Dosen Username (dosen / dosen123)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("198501012010011001");
                  setPassword("dosen123");
                  setErrorMsg("");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Dosen via NIP (198501012010011001)
              </button>
            </>
          )}
        </div>
      </div>

      <p className="login-help">Bermasalah dengan akun? Hubungi administrator kampus.</p>
    </Modal>
  );
}

function getDynamicTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  const minutes = date.getMinutes();

  if (hour >= 4 && hour < 11) {
    return "Selamat pagi";
  }
  if (hour >= 11 && hour < 15) {
    return "Selamat siang";
  }
  if (hour >= 15 && (hour < 18 || (hour === 18 && minutes < 30))) {
    return "Selamat sore";
  }
  return "Selamat malam";
}

function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeParts(value: string): { date: string; hour: string; minute: string } {
  const clean = String(value || "").trim().replace("T", " ");
  const match = clean.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{1,2})/);
  if (match) {
    return {
      date: match[1],
      hour: String(Math.min(23, Math.max(0, Number(match[2])))).padStart(2, "0"),
      minute: String(Math.min(59, Math.max(0, Number(match[3])))).padStart(2, "0"),
    };
  }
  const now = new Date();
  const fallback = formatLocalDateTime(now);
  const [d, t] = fallback.split(" ");
  const [h, m] = t.split(":");
  return { date: d, hour: h, minute: m };
}

function AlarmDateTimePicker({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (nextVal: string) => void;
  presets?: { label: string; getValue: () => string }[];
}) {
  const parts = parseDateTimeParts(value);
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const updateParts = (nextDate: string, nextHour: string, nextMinute: string) => {
    const d = nextDate || parts.date;
    const h = nextHour || parts.hour;
    const m = nextMinute || parts.minute;
    onChange(`${d} ${h}:${m}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1.5px solid #cbd5e1",
        background: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}>{label}</span>
        <span
          style={{
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#2b5c6b",
            background: "#e6f0f3",
            padding: "2px 8px",
            borderRadius: "999px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {parts.date} · {parts.hour}:{parts.minute}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <input
          type="date"
          aria-label={`${label} - Tanggal`}
          value={parts.date}
          onChange={(e) => updateParts(e.target.value, parts.hour, parts.minute)}
          style={{
            flex: "1 1 150px",
            height: "38px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: "1.5px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            color: "#0f172a",
            fontFamily: "inherit",
          }}
        />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#ffffff",
            border: "1.5px solid #2b5c6b",
            borderRadius: "8px",
            padding: "0 8px",
            height: "38px",
          }}
        >
          <Icon name="clock" size={15} />
          <select
            aria-label={`${label} - Jam`}
            value={parts.hour}
            onChange={(e) => updateParts(parts.date, e.target.value, parts.minute)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 700,
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
              cursor: "pointer",
              outline: "none",
              padding: "2px",
            }}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span style={{ fontWeight: 800, color: "#2b5c6b", fontSize: "15px" }}>:</span>
          <select
            aria-label={`${label} - Menit`}
            value={parts.minute}
            onChange={(e) => updateParts(parts.date, parts.hour, e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 700,
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
              cursor: "pointer",
              outline: "none",
              padding: "2px",
            }}
          >
            {minutes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {presets && presets.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.getValue())}
              style={{
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatStudentName(user: any): { fullName: string; shortName: string; nim: string; initials: string } {
  if (!user) {
    return {
      fullName: "Juan Tulengkey",
      shortName: "Juan",
      nim: "105022410021",
      initials: "JT",
    };
  }

  const rawName = user.nama || user.detail?.nama || user.profile?.nama || user.username || "Mahasiswa";
  const nim = user.detail?.nim || user.profile?.nim || user.nim || user.username || "105022410021";

  let fullName = rawName;
  let shortName = rawName;

  if (rawName.includes(",")) {
    const [belakang, depan] = rawName.split(",").map((s: string) => s.trim());
    fullName = depan ? `${depan} ${belakang}` : rawName;
    shortName = depan ? depan.split(" ")[0] : belakang;
  } else {
    shortName = rawName.split(" ")[0];
  }

  let initials = "M";
  const words = fullName.split(" ").filter(Boolean);
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  return { fullName, shortName, nim, initials };
}

function formatLecturerName(user: any): { fullName: string; shortName: string; course: string; initials: string; nip: string } {
  if (!user) {
    return {
      fullName: "George M. W. Tangka, S.Kom., MBA",
      shortName: "George",
      course: "Sistem Analisis & Desain",
      initials: "GT",
      nip: "198501012010011001",
    };
  }

  const fullName = user.nama || user.detail?.nama_dosen || user.profile?.nama_dosen || "George M. W. Tangka, S.Kom., MBA";
  const course = user.detail?.mata_kuliah || user.profile?.mata_kuliah || "Sistem Analisis & Desain";
  const nip = user.detail?.nip || user.profile?.nip || user.nip || "198501012010011001";

  let shortName = "George";
  if (fullName.includes("George")) {
    shortName = "George";
  } else {
    shortName = fullName.replace(/^(Dr\.|Prof\.|Ir\.)\s*/i, "").split(" ")[0];
  }

  let initials = "GT";
  const words = fullName.replace(/^(Dr\.|Prof\.|Ir\.)\s*/i, "").split(" ").filter(Boolean);
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  return { fullName, shortName, course, initials, nip };
}

function StudentDashboard({
  currentUser,
  onLogout,
  onStartExam,
}: {
  currentUser?: any;
  onLogout: () => void;
  onStartExam: (sessionData: any) => void;
}) {
  const student = formatStudentName(currentUser);
  const [activeNav, setActiveNav] = useState<"Ikut Ujian" | "Lihat Nilai">("Ikut Ujian");
  const [timeGreeting, setTimeGreeting] = useState(() => getDynamicTimeGreeting());
  const [examFilterTab, setExamFilterTab] = useState<
    "Semua Ujian" | "Tersedia / Aktif" | "Akan Datang" | "Selesai / Terkunci"
  >("Semua Ujian");
  const [dbState, setDbState] = useState(() => loadLocalDB());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getDynamicTimeGreeting());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [pinExam, setPinExam] = useState<ExamItem | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [multiDeviceBlocked, setMultiDeviceBlocked] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [selectedResultSession, setSelectedResultSession] = useState<any | null>(null);
  const [receiptSession, setReceiptSession] = useState<any | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [currentIp, setCurrentIp] = useState(() => getSimulatedIp());

  const refreshState = () => {
    setDbState(loadLocalDB());
    fetchStateFromBackend().then(() => {
      setDbState(loadLocalDB());
    });
  };

  useEffect(() => {
    refreshState();
  }, [activeNav]);

  // Sinkronisasi Real-Time Lintas Browser / Akun (Auto-polling setiap 3.5 detik & window.onfocus)
  useEffect(() => {
    const handleStateEvent = () => {
      setDbState(loadLocalDB());
    };
    const handleFocus = () => {
      fetchStateFromBackend();
    };
    window.addEventListener("xunklab_state_updated", handleStateEvent);
    window.addEventListener("focus", handleFocus);
    const pollTimer = window.setInterval(() => {
      fetchStateFromBackend();
    }, 3500);
    return () => {
      window.removeEventListener("xunklab_state_updated", handleStateEvent);
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(pollTimer);
    };
  }, []);

  // TC-05: Kirim heartbeat sesi login setiap 10 detik agar Backend tahu Perangkat 1 masih aktif
  useEffect(() => {
    sendAuthHeartbeatApi(student.nim);
    const hbTimer = window.setInterval(() => {
      sendAuthHeartbeatApi(student.nim);
    }, 10000);
    return () => window.clearInterval(hbTimer);
  }, [student.nim]);

  const examsList: ExamItem[] = deduplicateExams(
    dbState.exams || [],
    dbState.questions || [],
    dbState.participants || []
  ).exams;
  const mainExam = examsList[0];

  // Cari sesi hasil untuk mahasiswa ini (TC-25, TC-27, TC-28, TC-36, TC-39, TC-40)
  const studentSessions = (dbState.sessions || []).filter((s: any) => s.nim === student.nim);
  const latestSession = studentSessions[studentSessions.length - 1] || null;
  const activeDetailSession = selectedResultSession || latestSession;
  const currentStudentExam =
    examsList.find((e) => e.id_ujian === activeDetailSession?.id_ujian) || mainExam;
  const isPublished = Boolean(currentStudentExam?.hasil_dipublikasikan);
  const hasUngradedEssay = activeDetailSession ? Boolean(activeDetailSession.has_ungraded_essay) : false;
  const finalScoreDisplay =
    isPublished &&
    activeDetailSession &&
    !hasUngradedEssay &&
    activeDetailSession.total_nilai !== null &&
    activeDetailSession.total_nilai !== undefined
      ? String(activeDetailSession.total_nilai)
      : "Belum dinilai";

  const publishedGradedSessions = studentSessions.filter((s: any) => {
    const ex = examsList.find((e) => e.id_ujian === s.id_ujian) || mainExam;
    return (
      Boolean(ex?.hasil_dipublikasikan) &&
      !s.has_ungraded_essay &&
      s.total_nilai !== null &&
      s.total_nilai !== undefined
    );
  });

  const pendingOrUnpublishedCount = studentSessions.length - publishedGradedSessions.length;
  const avgPublishedScore =
    publishedGradedSessions.length > 0
      ? (
          publishedGradedSessions.reduce((acc: number, curr: any) => acc + Number(curr.total_nilai), 0) /
          publishedGradedSessions.length
        ).toFixed(1)
      : "-";

  const getGradeLetter = (score: number) => {
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "E";
  };

  // Notifikasi Jadwal Ujian bagi Mahasiswa Terdaftar (TC-43 & TC-34)
  // Hanya hitung ujian yang masih aktif di master exams Dosen DAN NIM mahasiswa terdaftar sebagai peserta
  const registeredExamsForStudent = examsList.filter((e) => {
    const examParticipants = (dbState.participants || []).filter(
      (p: ParticipantItem) => (p.id_ujian || p.examId || "UJN_01") === e.id_ujian
    );
    return examParticipants.some((p: ParticipantItem) => p.nim === student.nim);
  });
  const notifications = registeredExamsForStudent.map((e) => ({
    id: e.id_ujian,
    title: `Jadwal Ujian: ${e.nama_ujian}`,
    meta: `${e.tanggal_waktu_mulai} · Durasi ${e.durasi} menit`,
  }));

  const handleVerifyPin = async (event: FormEvent, forceRecover = false) => {
    event.preventDefault();
    if (!pinExam) return;

    setPinError("");
    setMultiDeviceBlocked(false);

    if (!forceRecover && pin.trim().length < 4) {
      setPinError("Masukkan 6 digit PIN ujian (contoh: 483920).");
      return;
    }

    const res = await verifyPinAndStartSession(
      pinExam.id_ujian,
      pin,
      student.nim,
      student.fullName,
      forceRecover
    );

    if (!res.success) {
      setPinError(res.message || "PIN ujian tidak valid.");
      if (res.multi_device_blocked) {
        setMultiDeviceBlocked(true);
      }
      return;
    }

    setPinExam(null);
    setPin("");
    onStartExam(res.session);
  };

  const getExamStatusLabel = (exam: ExamItem) => {
    const now = new Date();
    const mulai = new Date(exam.tanggal_waktu_mulai.replace(" ", "T"));
    const selesai = new Date(exam.tanggal_waktu_selesai.replace(" ", "T"));
    const mhsSession = (dbState.sessions || []).find(
      (s: any) => s.id_ujian === exam.id_ujian && s.nim === student.nim
    );
    if (mhsSession) {
      if (mhsSession.status_ujian === "Berlangsung") return "Sedang Berlangsung";
      return mhsSession.status_ujian;
    }
    if (!isNaN(mulai.getTime()) && now < mulai) return "Akan datang";
    if (!isNaN(selesai.getTime()) && now > selesai) return "Jadwal Berakhir";
    return "Tersedia";
  };

  const studentNavItems: Array<[string, "Ikut Ujian" | "Lihat Nilai"]> = [
    ["exam", "Ikut Ujian"],
    ["award", "Lihat Nilai"],
  ];

  const filteredExams = examsList.filter((exam) => {
    const statusLabel = getExamStatusLabel(exam);
    if (examFilterTab === "Semua Ujian") return true;
    if (examFilterTab === "Tersedia / Aktif") {
      return statusLabel === "Tersedia" || statusLabel === "Sedang Berlangsung";
    }
    if (examFilterTab === "Akan Datang") {
      return statusLabel === "Akan datang";
    }
    return (
      statusLabel === "Jadwal Berakhir" ||
      statusLabel === "Terkirim" ||
      statusLabel === "Selesai" ||
      statusLabel === "Disubmit Otomatis" ||
      statusLabel === "Sesi Dikunci Paksa" ||
      statusLabel === "Dikunci Paksa" ||
      statusLabel === "Diskualifikasi"
    );
  });

  return (
    <div className="lecturer-layout">
      {/* Sidebar Kiri Tetap (Identik dengan Portal Dosen) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand compact />
        </div>
        <nav>
          <p>MENU UTAMA</p>
          {studentNavItems.map(([icon, label]) => (
            <button
              className={activeNav === label ? "active" : ""}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon} size={19} /> <span>{label}</span>
              {label === "Lihat Nilai" && publishedGradedSessions.length > 0 && (
                <b>{publishedGradedSessions.length}</b>
              )}
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
          <div className="avatar">{student.initials}</div>
          <div>
            <strong>{student.fullName}</strong>
            <span>NIM: {student.nim}</span>
          </div>
          <button aria-label="Keluar" onClick={onLogout} title="Keluar dari Portal Mahasiswa">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {/* Area Konten Utama di Kanan */}
      <main className="lecturer-main">
        <header className="mobile-lecturer-header">
          <Brand compact />
          <button onClick={onLogout} aria-label="Keluar">
            <Icon name="logout" />
          </button>
        </header>

        <div className="mobile-nav">
          {studentNavItems.map(([icon, label]) => (
            <button
              className={activeNav === label ? "active" : ""}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeNav === "Ikut Ujian" ? (
          <>
            {/* Header Halaman Ikut Ujian */}
            <div className="lecturer-top" style={{ position: "relative" }}>
              <div>
                <p className="section-kicker">FAKULTAS ILMU KOMPUTER · PORTAL MAHASISWA</p>
                <h1>{timeGreeting}, {student.shortName}.</h1>
                <p>Berikut jadwal ujian yang telah disiapkan untukmu.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                <button
                  aria-label="Notifikasi"
                  className="icon-button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  title="Notifikasi Jadwal Ujian (TC-43)"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                  }}
                >
                  <Icon name="bell" size={19} />
                  {notifications.length > 0 && <span className="notification-dot" />}
                </button>

                {notifOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "54px",
                      right: 0,
                      width: "320px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
                      padding: "14px",
                      zIndex: 50,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong style={{ fontSize: "13px" }}>Notifikasi Jadwal Ujian ({notifications.length})</strong>
                      <button
                        onClick={() => setNotifOpen(false)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "12px",
                          cursor: "pointer",
                          color: "#64748b",
                        }}
                      >
                        Tutup
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Belum ada jadwal ujian terdaftar.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: "8px 10px",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              borderLeft: "3px solid #3d6373",
                              fontSize: "12px",
                            }}
                          >
                            <strong style={{ display: "block", color: "#1e293b" }}>{n.title}</strong>
                            <span style={{ color: "#64748b" }}>{n.meta}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="date-card">
                  <Icon name="calendar" size={21} />
                  <div>
                    <span>Semester Ganjil</span>
                    <strong>2026 / 2027</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* TC-43: Banner Notifikasi Jadwal Ujian Baru */}
            {notifications.length > 0 && (
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  fontSize: "13px",
                  color: "#0c4a6e",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="bell" size={18} />
                  <span>
                    <strong>Notifikasi Jadwal Ujian Baru (TC-43):</strong> Anda terdaftar pada{" "}
                    <b>{notifications.length} jadwal ujian</b>. Pastikan perangkat siap sebelum ujian dimulai.
                  </span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Status: Terdaftar</span>
              </div>
            )}

            {/* Filter Tab Status Ujian */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
              {(["Semua Ujian", "Tersedia / Aktif", "Akan Datang", "Selesai / Terkunci"] as const).map((tab) => {
                const isActive = examFilterTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setExamFilterTab(tab)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: isActive ? "1px solid #355866" : "1px solid #cbd5e1",
                      background: isActive ? "#355866" : "#ffffff",
                      color: isActive ? "#ffffff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Grid Kartu Jadwal Ujian (TC-06, TC-07, TC-08, TC-33, TC-50) */}
            <section style={{ marginBottom: "24px" }}>
              <div className="section-heading" style={{ marginBottom: "14px" }}>
                <div>
                  <h2>Daftar Jadwal Ujian</h2>
                  <p>
                    Pastikan perangkat dan koneksi internetmu siap. (PIN tidak pernah diekspos di UI/API - TC-50)
                  </p>
                </div>
                <span className="exam-count">{filteredExams.length} ujian</span>
              </div>

              {filteredExams.length === 0 ? (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "36px 20px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Tidak ada jadwal ujian pada kategori <strong>{examFilterTab}</strong>.
                </div>
              ) : (
                <div
                  className="exam-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "18px",
                  }}
                >
                  {filteredExams.map((exam, index) => {
                    const statusLabel = getExamStatusLabel(exam);
                    const isAvailable = statusLabel === "Tersedia" || statusLabel === "Sedang Berlangsung";
                    const mhsSession = (dbState.sessions || []).find(
                      (s: any) => s.id_ujian === exam.id_ujian && s.nim === student.nim
                    );
                    const isAlreadySubmitted =
                      mhsSession &&
                      [
                        "Terkirim",
                        "Selesai",
                        "Disubmit Otomatis",
                        "Sesi Dikunci Paksa",
                        "Dikunci Paksa",
                        "Diskualifikasi",
                      ].includes(mhsSession.status_ujian);

                    return (
                      <article className={`exam-card ${isAvailable ? "available" : ""}`} key={exam.id_ujian}>
                        <div className="card-topline">
                          <span className={`status ${isAvailable ? "status-live" : ""}`}>
                            {isAvailable && <i />}
                            {statusLabel}
                          </span>
                          <button
                            aria-label="Menu ujian"
                            onClick={() => {
                              if (isAlreadySubmitted) {
                                setReceiptSession(mhsSession);
                              } else {
                                setPinExam(exam);
                                setPin("");
                                setPinError("");
                                setMultiDeviceBlocked(false);
                              }
                            }}
                          >
                            <Icon name="dots" />
                          </button>
                        </div>
                        <div className="subject-icon">
                          <Icon name="exam" size={22} />
                        </div>
                        <p className="course-code">{exam.kode_mk || `UJN-0${index + 1}`}</p>
                        <h3>{exam.nama_ujian}</h3>
                        <div className="exam-meta">
                          <span>
                            <Icon name="calendar" size={17} />
                            Mulai: {exam.tanggal_waktu_mulai}
                          </span>
                          <span>
                            <Icon name="clock" size={17} />
                            Selesai: {exam.tanggal_waktu_selesai} · {exam.durasi} menit
                          </span>
                        </div>

                        {isAlreadySubmitted ? (
                          <button
                            className="button secondary exam-button"
                            onClick={() => setReceiptSession(mhsSession)}
                          >
                            Lihat Resi Pengiriman (TC-25) <Icon name="file" size={16} />
                          </button>
                        ) : (
                          <button
                            className={`button exam-button ${isAvailable ? "primary" : "secondary"}`}
                            onClick={() => {
                              setPinExam(exam);
                              setPin("");
                              setPinError("");
                              setMultiDeviceBlocked(false);
                            }}
                          >
                            {statusLabel === "Sedang Berlangsung"
                              ? "Lanjutkan Sesi Ujian"
                              : isAvailable
                                ? "Masuk Ujian (Input PIN)"
                                : `Cek Akses (${statusLabel})`}
                            <Icon name="arrow" size={17} />
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Info Strip Lingkungan Ujian Aman & Verifikasi Jaringan Kampus (TC-41) */}
            <aside className="info-strip" style={{ flexWrap: "wrap", gap: "12px" }}>
              <span className="info-icon">
                <Icon name="shield" size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <strong>Lingkungan ujian aman &amp; Verifikasi Jaringan Kampus (TC-41)</strong>
                <p>
                  IP Perangkat Saat Ini: <code>{currentIp}</code> (
                  {isCampusIp(currentIp)
                    ? "Jaringan Kampus UNKLAB - Diizinkan"
                    : "Jaringan Luar Kampus - Ditolak jika IP Whitelist Aktif"}
                  )
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  aria-label="Simulasi IP Jaringan (TC-41)"
                  value={currentIp}
                  onChange={(e) => {
                    setCurrentIp(e.target.value);
                    setSimulatedIp(e.target.value);
                  }}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    background: "#fff",
                  }}
                >
                  <option value="192.168.1.50">IP Kampus (192.168.1.50)</option>
                  <option value="203.0.113.99">IP Luar Kampus (203.0.113.99)</option>
                </select>
                <button onClick={() => setRulesOpen(true)}>Pelajari aturan</button>
              </div>
            </aside>
          </>
        ) : (
          /* MENU 2: LIHAT NILAI (TC-25, TC-27, TC-28, TC-36, TC-39, TC-40) */
          <>
            <div className="lecturer-top">
              <div>
                <p className="section-kicker">RINGKASAN AKADEMIK · PORTAL MAHASISWA</p>
                <h1>Lihat Nilai &amp; Hasil Ujian</h1>
                <p>
                  Pantau status penilaian esai, rincian skor, penalti pelanggaran, dan resi resmi pengiriman ujian Anda.
                </p>
              </div>
              <div className="date-card">
                <Icon name="award" size={21} />
                <div>
                  <span>Nilai Terpublikasi</span>
                  <strong>{publishedGradedSessions.length} Ujian</strong>
                </div>
              </div>
            </div>

            {/* 4 Kartu Ringkasan Statistik Mahasiswa */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "22px",
              }}
            >
              <article
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Ujian Diikuti</p>
                <strong style={{ fontSize: "24px", color: "#0f172a", display: "block", marginTop: "6px" }}>
                  {studentSessions.length}
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "11px" }}>Sesi tercatat pada akun</small>
              </article>

              <article
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#166534", fontWeight: 600 }}>
                  Sudah Dipublikasikan (TC-27)
                </p>
                <strong style={{ fontSize: "24px", color: "#16a34a", display: "block", marginTop: "6px" }}>
                  {publishedGradedSessions.length}
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "11px" }}>Nilai resmi tersedia</small>
              </article>

              <article
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
                  Menunggu Penilaian / Publikasi (TC-28)
                </p>
                <strong style={{ fontSize: "24px", color: "#d97706", display: "block", marginTop: "6px" }}>
                  {pendingOrUnpublishedCount}
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "11px" }}>Belum dinilai atau masih draft</small>
              </article>

              <article
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#0369a1", fontWeight: 600 }}>Rata-rata Nilai Akhir</p>
                <strong style={{ fontSize: "24px", color: "#0c4a6e", display: "block", marginTop: "6px" }}>
                  {avgPublishedScore}{" "}
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#0369a1" }}>/ 100</span>
                </strong>
                <small style={{ color: "#0369a1", fontSize: "11px" }}>Khusus ujian dipublikasikan</small>
              </article>
            </section>

            {/* Daftar Kartu Hasil Ujian Mahasiswa */}
            <section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {studentSessions.length === 0 ? (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <Icon name="award" size={32} />
                  <h3 style={{ margin: "12px 0 6px", color: "#334155" }}>Belum Ada Hasil Ujian</h3>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    Anda belum mengumpulkan ujian apa pun. Silakan buka menu <strong>Ikut Ujian</strong> untuk memulai.
                  </p>
                </div>
              ) : (
                studentSessions.map((session: any, idx: number) => {
                  const examObj = examsList.find((e) => e.id_ujian === session.id_ujian) || mainExam;
                  const sHasUngraded = Boolean(session.has_ungraded_essay);
                  const sIsPublished = Boolean(examObj?.hasil_dipublikasikan);
                  const canShowScore =
                    sIsPublished &&
                    !sHasUngraded &&
                    session.total_nilai !== null &&
                    session.total_nilai !== undefined;

                  const numericScore = Number(session.total_nilai ?? 0);
                  const gradeLetter = getGradeLetter(numericScore);

                  return (
                    <article
                      key={session.id_sesi || idx}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      {/* Top Row: Identitas Ujian & Status Badge */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}>
                            {session.kode_mk || examObj?.kode_mk || "IF-241"} · ID SESI: {session.id_sesi}
                          </span>
                          <h3 style={{ margin: "4px 0", fontSize: "17px", color: "#0f172a" }}>
                            {session.nama_ujian || examObj?.nama_ujian}
                          </h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#64748b" }}>
                            <span>Waktu Kirim: {session.waktu_pengiriman || "-"}</span>
                            <span>·</span>
                            <span>
                              Status Sesi:{" "}
                              <strong
                                style={{
                                  color:
                                    session.status_ujian === "Terkirim" || session.status_ujian === "Disubmit Otomatis"
                                      ? "#1d4ed8"
                                      : "#dc2626",
                                }}
                              >
                                {session.status_ujian}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div>
                          {sHasUngraded ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "5px 12px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                              }}
                            >
                              Belum dinilai (TC-28)
                            </span>
                          ) : !sIsPublished ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "5px 12px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #cbd5e1",
                              }}
                            >
                              Menunggu Publikasi Dosen (TC-27)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "5px 12px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: "#ecfdf5",
                                color: "#047857",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              Dipublikasikan
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Rincian Skor (Hanya Tampil Jika Sudah Dipublikasikan - TC-27 & TC-28) */}
                      {canShowScore ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px 14px",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                              Skor Objektif (TC-39)
                            </span>
                            <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                              {session.objective_earned ?? 0} / {session.objective_bobot ?? 70}
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                              Skor Esai (TC-40)
                            </span>
                            <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                              {session.essay_earned ?? 0} / {session.essay_bobot ?? 30}
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                              Penalti Pelanggaran (TC-36)
                            </span>
                            <strong
                              style={{
                                fontSize: "15px",
                                color:
                                  session.status_keputusan === "Pengurangan Nilai" ||
                                  session.status_keputusan === "Diskualifikasi"
                                    ? "#dc2626"
                                    : "#475569",
                              }}
                            >
                              {session.status_keputusan === "Pengurangan Nilai"
                                ? "-20 Poin"
                                : session.status_keputusan === "Diskualifikasi"
                                  ? "Diskualifikasi (0)"
                                  : "0 Poin"}
                            </strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <div>
                              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                                Total Nilai Akhir
                              </span>
                              <strong style={{ fontSize: "20px", color: "#0f172a" }}>
                                {session.total_nilai} <small style={{ fontSize: "12px", color: "#64748b" }}>/ 100</small>
                              </strong>
                            </div>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                background: "#0f172a",
                                color: "#ffffff",
                                fontSize: "14px",
                                fontWeight: 800,
                              }}
                            >
                              {gradeLetter}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: "#f8fafc",
                            border: "1px dashed #cbd5e1",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            fontSize: "12px",
                            color: "#475569",
                          }}
                        >
                          {sHasUngraded
                            ? "Nilai akhir belum dapat ditampilkan karena masih terdapat soal esai yang sedang dikoreksi oleh dosen (Status: Belum dinilai - TC-28)."
                            : "Penilaian telah selesai, namun hasil ujian belum dipublikasikan oleh dosen pengampu (Status: Menunggu Publikasi Dosen - TC-27)."}
                        </div>
                      )}

                      {/* Bottom Row: Tombol Aksi */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setReceiptSession(session)}
                          style={{ fontSize: "12px", padding: "8px 14px" }}
                        >
                          <Icon name="file" size={15} /> Lihat Resi Ujian (TC-25)
                        </button>
                        {canShowScore && (
                          <button
                            type="button"
                            className="button primary"
                            onClick={() => {
                              setSelectedResultSession(session);
                              setResultOpen(true);
                            }}
                            style={{ fontSize: "12px", padding: "8px 14px" }}
                          >
                            <Icon name="award" size={15} /> Rincian Nilai
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal Resi Ujian Resmi (TC-25) */}
      {receiptSession && (
        <Modal labelledBy="receipt-title" onClose={() => setReceiptSession(null)}>
          <div className="pin-icon">
            <Icon name="check" size={24} />
          </div>
          <p className="modal-kicker centered">RESI BUKTI PENGIRIMAN UJIAN (TC-25)</p>
          <h2 className="centered" id="receipt-title">
            Jawaban Berhasil Dikumpulkan
          </h2>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              fontSize: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              margin: "14px 0 18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>Nama Mahasiswa</span>
              <strong style={{ color: "#0f172a", textAlign: "right" }}>
                {receiptSession.nama_mahasiswa || student.fullName}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>NIM</span>
              <strong style={{ color: "#0f172a" }}>{receiptSession.nim || student.nim}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>Nama Ujian</span>
              <strong style={{ color: "#0f172a", textAlign: "right" }}>
                {receiptSession.nama_ujian || mainExam?.nama_ujian}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>ID Sesi</span>
              <strong style={{ color: "#0f172a" }}>{receiptSession.id_sesi}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>Waktu Kirim</span>
              <strong style={{ color: "#0f172a" }}>{receiptSession.waktu_pengiriman || "-"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ color: "#64748b" }}>Status Pengiriman</span>
              <strong style={{ color: "#16a34a" }}>{receiptSession.status_ujian}</strong>
            </div>
          </div>
          <button className="button primary wide" onClick={() => setReceiptSession(null)}>
            Tutup Resi
          </button>
        </Modal>
      )}

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
            PIN 6 digit diberikan oleh pengawas untuk ujian
            <br />
            <strong>{pinExam.nama_ujian}</strong>.
          </p>

          {pinError && (
            <div
              role="alert"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #f87171",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                lineHeight: "1.4",
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              {pinError}
            </div>
          )}

          <form className="pin-form" onSubmit={(e) => handleVerifyPin(e, false)}>
            <input
              aria-label="PIN Ujian"
              autoFocus
              className={pinError ? "input-error" : ""}
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\s/g, ""));
                setPinError("");
              }}
              placeholder="••••••"
              value={pin}
            />
            <button className="button primary wide" type="submit">
              Masuk ke Ujian <Icon name="arrow" size={18} />
            </button>

            {multiDeviceBlocked && (
              <button
                type="button"
                className="button secondary wide"
                style={{ marginTop: "8px" }}
                onClick={(e) => handleVerifyPin(e as unknown as FormEvent, true)}
              >
                Pulihkan Paksa Sesi di Perangkat Ini (TC-51)
              </button>
            )}
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
          <p className="modal-kicker centered">
            {isPublished && finalScoreDisplay !== "Belum dinilai" ? "HASIL DIPUBLIKASIKAN" : "BELUM DIPUBLIKASIKAN"}
          </p>
          <h2 className="centered" id="result-title">
            {activeDetailSession?.nama_ujian || currentStudentExam?.nama_ujian || "UTS Sistem Analisis & Desain"}
          </h2>
          <div className="result-detail">
            <strong style={{ fontSize: finalScoreDisplay === "Belum dinilai" ? "26px" : undefined }}>
              {finalScoreDisplay}
            </strong>
            <span>Nilai akhir</span>
            <div>
              {isPublished && finalScoreDisplay !== "Belum dinilai" ? (
                <>
                  <p>
                    Skor Objektif <b>{activeDetailSession?.objective_earned ?? 50} / {activeDetailSession?.objective_bobot ?? 70}</b>
                  </p>
                  <p>
                    Penilaian Esai <b>{activeDetailSession?.essay_earned ?? 24} / {activeDetailSession?.essay_bobot ?? 30}</b>
                  </p>
                  {activeDetailSession?.status_keputusan && activeDetailSession.status_keputusan !== "Tidak Ada" && (
                    <p>
                      Keputusan Pengawas <b>{activeDetailSession.status_keputusan}</b>
                    </p>
                  )}
                </>
              ) : (
                <p style={{ textAlign: "center", color: "#64748b" }}>
                  Nilai angka hanya ditampilkan setelah dosen menyelesaikan penilaian esai dan menekan tombol{" "}
                  <b>Publikasikan Hasil</b> (TC-27 &amp; TC-28).
                </p>
              )}
            </div>
          </div>
          <button className="button primary wide" onClick={() => setResultOpen(false)}>
            Tutup
          </button>
        </Modal>
      )}

      {rulesOpen && (
        <Modal labelledBy="rules-title" onClose={() => setRulesOpen(false)}>
          <div className="pin-icon">
            <Icon name="shield" size={24} />
          </div>
          <p className="modal-kicker centered">ATURAN ANTI-CURANG TANPA KAMERA</p>
          <h2 className="centered" id="rules-title">
            Tata Tertib Ujian xUnklab
          </h2>
          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6, marginBottom: "18px" }}>
            <p>1. Ujian wajib dijalankan dalam <b>Mode Layar Penuh (Fullscreen)</b> (TC-20, TC-21).</p>
            <p>2. Dilarang berpindah tab/aplikasi lain (<code>visibilitychange</code> &amp; <code>blur</code>) (TC-14).</p>
            <p>3. Fitur <b>Copy, Cut, Paste, dan Klik Kanan</b> diblokir sepenuhnya selama ujian (TC-15).</p>
            <p>4. Peringatan diberikan pada pelanggaran ke-1 dan ke-2. Pada <b>pelanggaran ke-3</b>, sesi ujian otomatis dikunci paksa (TC-16 s.d. TC-18).</p>
            <p>5. Satu akun hanya dapat membuka sesi ujian pada <b>satu perangkat aktif</b> (TC-05).</p>
          </div>
          <button className="button primary wide" onClick={() => setRulesOpen(false)}>
            Saya Mengerti
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
  ["award", "Nilai Ujian"],
  ["shield", "Tinjau Log Pelanggaran"],
];

function LecturerModule({
  active,
  onNavigateBack,
}: {
  active: string;
  onNavigateBack?: () => void;
}) {
  const [dbState, setDbState] = useState(() => loadLocalDB());

  useEffect(() => {
    const onStateUpdated = () => setDbState(loadLocalDB());
    window.addEventListener("xunklab_state_updated", onStateUpdated);
    return () => window.removeEventListener("xunklab_state_updated", onStateUpdated);
  }, []);

  // State CRUD Bank Soal (TC-29, TC-30, TC-37, TC-38)
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<QuestionItem["tipe_soal"]>("Pilihan Ganda");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", ""]);
  const [qKey, setQKey] = useState("");
  const [qWeight, setQWeight] = useState("15");
  const [qError, setQError] = useState("");
  const [qSuccessMsg, setQSuccessMsg] = useState("");

  // State Filter & Pencarian Bank Soal (Ketentuan 1 & 2)
  const [filterType, setFilterType] = useState<string>("Semua Tipe");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State Inline Form Buat Ujian Baru (Ketentuan 4 - TC-32)
  const defaultNewStart = () => formatLocalDateTime(new Date());
  const defaultNewEnd = () => formatLocalDateTime(new Date(Date.now() + 7 * 86400000));
  const [createExamModalOpen, setCreateExamModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamCourse, setNewExamCourse] = useState("Sistem Analisis & Desain");
  const [newExamCode, setNewExamCode] = useState("IF-241");
  const [newExamDur, setNewExamDur] = useState("90");
  const [newExamPinVal, setNewExamPinVal] = useState("483920");
  const [newExamStart, setNewExamStart] = useState(() => defaultNewStart());
  const [newExamEnd, setNewExamEnd] = useState(() => defaultNewEnd());
  const [createExamError, setCreateExamError] = useState("");
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [confirmDeleteExam, setConfirmDeleteExam] = useState(false);

  // State Pengaturan Ujian (TC-09, TC-10, TC-31..TC-33, TC-41)
  const uniqueExams: ExamItem[] = deduplicateExams(
    dbState.exams || [],
    dbState.questions || [],
    dbState.participants || []
  ).exams;
  const [selectedExamId, setSelectedExamId] = useState("UJN_01");
  const currentExam: ExamItem =
    uniqueExams.find((e: ExamItem) => e.id_ujian === selectedExamId) || uniqueExams[0];

  const [examName, setExamName] = useState(currentExam?.nama_ujian || "");
  const [examStart, setExamStart] = useState(currentExam?.tanggal_waktu_mulai || "");
  const [examEnd, setExamEnd] = useState(currentExam?.tanggal_waktu_selesai || "");
  const [examDuration, setExamDuration] = useState(String(currentExam?.durasi ?? 90));
  const [examPin, setExamPin] = useState(currentExam?.pin_ujian || "483920");
  const [showExamPin, setShowExamPin] = useState(false);
  const [examAttempts, setExamAttempts] = useState(String(currentExam?.maks_percobaan ?? 1));
  const [examTolerance, setExamTolerance] = useState(String(currentExam?.batas_toleransi_pelanggaran ?? 3));
  const [examShuffleQuestions, setExamShuffleQuestions] = useState(Boolean(currentExam?.acak_aktif ?? true));
  const [examShuffleOptions, setExamShuffleOptions] = useState(Boolean(currentExam?.acak_opsi ?? true));
  const [examCampusOnly, setExamCampusOnly] = useState(Boolean(currentExam?.batasi_jaringan_kampus ?? false));
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State Kelola Peserta, Tambah Waktu & Penilaian Esai (TC-34, TC-40, TC-42, TC-27, TC-28)
  const [newNim, setNewNim] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [participantMsg, setParticipantMsg] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantSort, setParticipantSort] = useState<"nama-asc" | "nama-desc" | "nim-asc">("nama-asc");
  const [confirmDeleteParticipant, setConfirmDeleteParticipant] = useState<{ nim: string; nama: string } | null>(null);
  const [gradingModalSession, setGradingModalSession] = useState<any | null>(null);
  const [essayInputScore, setEssayInputScore] = useState("80");
  const [gradeModalTab, setGradeModalTab] = useState<"essay" | "objective">("essay");
  const essayInputRef = useRef<HTMLInputElement | null>(null);

  // State Log Pelanggaran & Sanksi (TC-35, TC-36, TC-52)
  const [sanctionMsg, setSanctionMsg] = useState("");
  const [violationExamFilter, setViolationExamFilter] = useState<string>("ALL");
  const [violationDecisionFilter, setViolationDecisionFilter] = useState<string>("Semua Status");

  useEffect(() => {
    const found = (dbState.exams || []).find((e: ExamItem) => e.id_ujian === selectedExamId);
    if (found) {
      setExamName(found.nama_ujian);
      setExamStart(found.tanggal_waktu_mulai);
      setExamEnd(found.tanggal_waktu_selesai);
      setExamDuration(String(found.durasi));
      setExamPin(found.pin_ujian || "483920");
      setExamAttempts(String(found.maks_percobaan || 1));
      setExamTolerance(String(found.batas_toleransi_pelanggaran || 3));
      setExamShuffleQuestions(Boolean(found.acak_aktif));
      setExamShuffleOptions(Boolean(found.acak_opsi));
      setExamCampusOnly(Boolean(found.batasi_jaringan_kampus));
    }
  }, [selectedExamId, dbState.exams]);

  const openAddQuestionModal = () => {
    setEditingQuestionId(null);
    setQText("");
    setQType("Pilihan Ganda");
    setQOptions(["Opsi Jawaban A", "Opsi Jawaban B", "Opsi Jawaban C", "Opsi Jawaban D"]);
    setQKey("");
    setQWeight("15");
    setQError("");
    setQuestionModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("inline-question-form-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const openEditQuestionModal = (q: QuestionItem) => {
    setEditingQuestionId(q.id_soal);
    setQText(q.pertanyaan);
    setQType(q.tipe_soal);
    setQOptions(
      q.tipe_soal === "Pilihan Ganda" && Array.isArray(q.opsi_jawaban) && q.opsi_jawaban.length >= 4
        ? [...q.opsi_jawaban]
        : ["Opsi A", "Opsi B", "Opsi C", "Opsi D"]
    );
    setQKey(q.kunci_jawaban || "");
    setQWeight(String(q.bobot || 10));
    setQError("");
    setQuestionModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("inline-question-form-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const handleSaveQuestion = (event: FormEvent) => {
    event.preventDefault();
    setQError("");

    if (!qText.trim()) {
      setQError("Pertanyaan soal wajib diisi.");
      return;
    }

    // TC-30: Tolak penyimpanan soal objektif jika kunci jawaban dikosongkan
    if (qType !== "Esai" && !qKey.trim()) {
      setQError(`Validasi Gagal (TC-30): Kunci jawaban wajib diisi untuk soal objektif (${qType})!`);
      return;
    }

    const weightNum = parseFloat(qWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setQError("Bobot nilai soal harus lebih dari 0.");
      return;
    }

    let finalOptions: string[] | null = null;
    if (qType === "Pilihan Ganda") {
      const cleaned = qOptions.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) {
        setQError("Pilihan Ganda wajib memiliki minimal 2 opsi jawaban.");
        return;
      }
      finalOptions = cleaned;
      if (!cleaned.includes(qKey.trim())) {
        setQError("Validasi Gagal (TC-30): Pilih salah satu opsi sebagai Kunci Jawaban menggunakan radio di sebelah kiri opsi.");
        return;
      }
    } else if (qType === "Benar/Salah") {
      finalOptions = ["Benar", "Salah"];
    }

    const db = loadLocalDB();
    if (editingQuestionId) {
      const updatedFields: Partial<QuestionItem> = {
        pertanyaan: qText.trim(),
        tipe_soal: qType,
        opsi_jawaban: finalOptions,
        kunci_jawaban: qType === "Esai" ? qKey.trim() || null : qKey.trim(),
        bobot: weightNum,
        id_ujian: selectedExamId,
        examId: selectedExamId,
      };
      updateQuestionApi(editingQuestionId, updatedFields);
      db.questions = db.questions.map((item: QuestionItem) =>
        item.id_soal === editingQuestionId
          ? {
              ...item,
              ...updatedFields,
            }
          : item
      );
      setQSuccessMsg(`Soal berhasil diperbarui untuk ujian "${currentExam?.nama_ujian}" (TC-29).`);
    } else {
      const newQuestion: QuestionItem = {
        id_soal: `SOAL_${Date.now().toString().slice(-5)}`,
        id_bank_soal: "BS_01",
        id_ujian: selectedExamId,
        examId: selectedExamId,
        pertanyaan: qText.trim(),
        tipe_soal: qType,
        opsi_jawaban: finalOptions,
        kunci_jawaban: qType === "Esai" ? qKey.trim() || null : qKey.trim(),
        bobot: weightNum,
      };
      createQuestionApi(newQuestion);
      db.questions.push(newQuestion);
      setQSuccessMsg(`Soal baru berhasil ditambahkan ke ujian "${currentExam?.nama_ujian}" (TC-29).`);
    }

    saveLocalDB(db);
    setDbState(db);
    setQuestionModalOpen(false);
    setEditingQuestionId(null);
    setTimeout(() => setQSuccessMsg(""), 3500);
  };

  const handleDeleteQuestion = (idSoal: string) => {
    deleteQuestionApi(idSoal, selectedExamId);
    const db = loadLocalDB();
    db.questions = db.questions.filter((q: QuestionItem) => q.id_soal !== idSoal);
    saveLocalDB(db);
    setDbState(db);
    setQSuccessMsg(`Soal berhasil dihapus dari ujian "${currentExam?.nama_ujian}" (TC-29).`);
    setTimeout(() => setQSuccessMsg(""), 3000);
  };

  const openCreateExamForm = () => {
    setNewExamTitle("");
    setNewExamCourse("Sistem Analisis & Desain");
    setNewExamCode("IF-241");
    setNewExamDur("90");
    setNewExamPinVal("483920");
    setNewExamStart(defaultNewStart());
    setNewExamEnd(defaultNewEnd());
    setCreateExamError("");
    setCreateExamModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("inline-create-exam-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const cancelCreateExamForm = () => {
    setCreateExamModalOpen(false);
    setNewExamTitle("");
    setNewExamCourse("Sistem Analisis & Desain");
    setNewExamCode("IF-241");
    setNewExamDur("90");
    setNewExamPinVal("483920");
    setNewExamStart(defaultNewStart());
    setNewExamEnd(defaultNewEnd());
    setCreateExamError("");
    if (active === "Atur Ujian" && onNavigateBack) {
      onNavigateBack();
    }
  };

  const handleCreateNewExam = async (e: FormEvent) => {
    e.preventDefault();
    if (isCreatingExam) return;

    setCreateExamError("");
    const cleanTitle = newExamTitle.trim();
    const cleanCourse = newExamCourse.trim() || "Sistem Analisis & Desain";
    const cleanCode = newExamCode.trim() || "IF-241";

    if (!cleanTitle) {
      setCreateExamError("Nama ujian wajib diisi.");
      return;
    }
    const durNum = parseInt(newExamDur, 10);
    if (isNaN(durNum) || durNum <= 0) {
      setCreateExamError("Validasi Gagal (TC-32): Durasi ujian harus lebih dari 0 menit.");
      return;
    }
    if (!newExamPinVal.trim() || newExamPinVal.trim().length < 4) {
      setCreateExamError("PIN ujian minimal 4-6 digit (contoh: 483920).");
      return;
    }

    setIsCreatingExam(true);
    try {
      const dbBefore = loadLocalDB();
      const existingSame = (dbBefore.exams || []).find(
        (ex: ExamItem) =>
          (ex.nama_ujian || "").trim().toLowerCase() === cleanTitle.toLowerCase() &&
          (ex.kode_mk || "IF-241").trim().toLowerCase() === cleanCode.toLowerCase()
      );

      const targetId = existingSame?.id_ujian || `UJN_${Date.now().toString().slice(-4)}`;
      const examPayload: ExamItem = {
        id_ujian: targetId,
        nama_ujian: cleanTitle,
        mata_kuliah: cleanCourse,
        kode_mk: cleanCode,
        nama_dosen: "George M. W. Tangka, S.Kom., MBA",
        tanggal_waktu_mulai: newExamStart.trim() || defaultNewStart(),
        tanggal_waktu_selesai: newExamEnd.trim() || defaultNewEnd(),
        durasi: durNum,
        pin_ujian: newExamPinVal.trim(),
        maks_percobaan: existingSame?.maks_percobaan ?? 1,
        acak_aktif: existingSame?.acak_aktif ?? true,
        acak_opsi: existingSame?.acak_opsi ?? true,
        batasi_jaringan_kampus: existingSame?.batasi_jaringan_kampus ?? false,
        batas_toleransi_pelanggaran: existingSame?.batas_toleransi_pelanggaran ?? 3,
        hasil_dipublikasikan: existingSame?.hasil_dipublikasikan ?? false,
      };

      const res = await createExamApi(examPayload);
      const finalId = res?.exam?.id_ujian || targetId;

      const db = loadLocalDB();
      const baseParticipants = db.participants.filter(
        (p: ParticipantItem) => (p.id_ujian || p.examId || "UJN_01") === "UJN_01"
      );
      baseParticipants.forEach((bp: ParticipantItem) => {
        if (!db.participants.some((p: ParticipantItem) => p.nim === bp.nim && (p.id_ujian || p.examId) === finalId)) {
          db.participants.push({
            ...bp,
            id_mahasiswa: `${bp.id_mahasiswa}_${finalId}`,
            id_ujian: finalId,
            examId: finalId,
            tambahan_waktu: 0,
          });
        }
      });
      saveLocalDB(db);
      setDbState(loadLocalDB());

      // Otomatis pilih dan aktifkan ujian yang baru dibuat/diperbarui pada Bank Soal & Atur Ujian
      setSelectedExamId(finalId);
      setCreateExamModalOpen(false);
      setNewExamTitle("");
      const successText = existingSame
        ? `Ujian "${examPayload.nama_ujian}" sudah ada sehingga datanya diperbarui tanpa duplikasi.`
        : `Ujian baru "${examPayload.nama_ujian}" berhasil dibuat dan otomatis aktif.`;
      setQSuccessMsg(successText);
      setSettingsMsg({ type: "success", text: successText });
      setTimeout(() => setQSuccessMsg(""), 4000);
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleDeleteExam = async (idUjian: string, namaUjian?: string) => {
    await deleteExamApi(idUjian);
    const updatedDb = loadLocalDB();
    setDbState(updatedDb);
    setConfirmDeleteExam(false);
    const remainingExams = deduplicateExams(
      updatedDb.exams || [],
      updatedDb.questions || [],
      updatedDb.participants || []
    ).exams;
    if (remainingExams.length > 0) {
      setSelectedExamId(remainingExams[0].id_ujian);
    }
    setSettingsMsg({
      type: "success",
      text: `Ujian "${namaUjian || idUjian}" berhasil dihapus dari sistem.`,
    });
  };

  const handleResetExamSettings = () => {
    const found = (dbState.exams || []).find((e: ExamItem) => e.id_ujian === selectedExamId) || currentExam;
    if (found) {
      setExamName(found.nama_ujian || "");
      setExamStart(found.tanggal_waktu_mulai || "");
      setExamEnd(found.tanggal_waktu_selesai || "");
      setExamDuration(String(found.durasi ?? 90));
      setExamPin(found.pin_ujian || "483920");
      setExamAttempts(String(found.maks_percobaan ?? 1));
      setExamTolerance(String(found.batas_toleransi_pelanggaran ?? 3));
      setExamShuffleQuestions(Boolean(found.acak_aktif ?? true));
      setExamShuffleOptions(Boolean(found.acak_opsi ?? true));
      setExamCampusOnly(Boolean(found.batasi_jaringan_kampus ?? false));
    }
    setSettingsMsg(null);
    setCreateExamModalOpen(false);
    setCreateExamError("");
    if (onNavigateBack) {
      onNavigateBack();
    }
  };

  const renderInlineCreateExamForm = () => {
    if (!createExamModalOpen) return null;
    const inputStyle = {
      width: "100%",
      height: "38px",
      boxSizing: "border-box" as const,
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1.5px solid #cbd5e1",
      fontSize: "13.5px",
      color: "#0f172a",
      background: "#f8fafc",
      fontFamily: "inherit",
    };
    const labelStyle = {
      display: "flex",
      flexDirection: "column" as const,
      gap: "5px",
      fontSize: "12.5px",
      fontWeight: 600,
      color: "#334155",
    };

    return (
      <form
        id="inline-create-exam-card"
        onSubmit={handleCreateNewExam}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#ffffff",
          border: "2px solid #2b5c6b",
          borderTop: "6px solid #2b5c6b",
          borderRadius: "12px",
          padding: "20px 24px",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "18px",
        }}
      >
        {/* Header Inline Card Buat Ujian Baru */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            paddingBottom: "12px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h3
              id="modal-new-exam-title"
              style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}
            >
              Buat Ujian Baru
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#2b5c6b",
                background: "#e6f0f3",
                padding: "3px 10px",
                borderRadius: "999px",
              }}
            >
              PENGELOLAAN UJIAN (TC-32)
            </span>
          </div>
          <span style={{ fontSize: "12.5px", color: "#64748b" }}>
            Jadwal ujian baru akan otomatis tersimpan dan aktif pada pilihan ujian.
          </span>
        </div>

        {createExamError && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #f87171",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {createExamError}
          </div>
        )}

        {/* Baris 1: Nama Ujian, Mata Kuliah, Kode MK, Durasi Ujian (TC-32 > 0), & PIN Ujian (TC-06) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.4fr 0.8fr 0.9fr 0.9fr",
            gap: "12px",
          }}
        >
          <label style={labelStyle}>
            Nama Ujian
            <input
              required
              autoFocus
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              placeholder="Contoh: Kuis 1 Analisis Kebutuhan Sistem"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Mata Kuliah
            <input
              required
              value={newExamCourse}
              onChange={(e) => setNewExamCourse(e.target.value)}
              placeholder="Sistem Analisis & Desain"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Kode MK
            <input
              required
              value={newExamCode}
              onChange={(e) => setNewExamCode(e.target.value)}
              placeholder="IF-241"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Durasi (menit) — TC-32 &gt; 0
            <input
              type="number"
              required
              value={newExamDur}
              onChange={(e) => setNewExamDur(e.target.value)}
              placeholder="90"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            PIN Ujian (6 digit) — TC-06
            <input
              required
              maxLength={10}
              value={newExamPinVal}
              onChange={(e) => setNewExamPinVal(e.target.value)}
              placeholder="483920"
              style={inputStyle}
            />
          </label>
        </div>

        {/* Baris 2 (Khusus Jadwal - 2 Kolom Lebar Sejajar): Pemilih Tanggal & Jam Bergaya Alarm */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          <AlarmDateTimePicker
            label="Jadwal Mulai (TC-08)"
            value={newExamStart}
            onChange={setNewExamStart}
            presets={[
              {
                label: "Mulai Sekarang",
                getValue: () => formatLocalDateTime(new Date()),
              },
              {
                label: "Mulai +5 Menit Lagi",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 5 * 60000)),
              },
            ]}
          />
          <AlarmDateTimePicker
            label="Jadwal Selesai (TC-31)"
            value={newExamEnd}
            onChange={setNewExamEnd}
            presets={[
              {
                label: "+90 Menit",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 90 * 60000)),
              },
              {
                label: "+7 Hari",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 7 * 86400000)),
              },
              {
                label: "Set Sudah Berakhir (-1 Menit Lalu)",
                getValue: () => formatLocalDateTime(new Date(Date.now() - 60000)),
              },
            ]}
          />
        </div>

        {/* Footer Form Buat Ujian Baru: Tombol Batal & Simpan Ujian Baru */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            paddingTop: "12px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            className="button secondary"
            onClick={cancelCreateExamForm}
          >
            Batal
          </button>
          <button className="button primary" type="submit" disabled={isCreatingExam}>
            <Icon name="save" size={16} /> {isCreatingExam ? "Menyimpan..." : "Simpan Ujian Baru"}
          </button>
        </div>
      </form>
    );
  };

  const handleSaveExamSettings = () => {
    setSettingsMsg(null);
    const durNum = parseInt(examDuration, 10);

    // TC-32: Tolak penyimpanan jika durasi <= 0 menit
    if (isNaN(durNum) || durNum <= 0) {
      setSettingsMsg({
        type: "error",
        text: "Validasi Gagal (TC-32): Durasi ujian tidak valid! Durasi ujian harus lebih dari 0 menit.",
      });
      return;
    }

    if (!examName.trim() || !examPin.trim()) {
      setSettingsMsg({
        type: "error",
        text: "Nama ujian dan PIN ujian (6 digit) wajib diisi.",
      });
      return;
    }

    const updatedPayload = {
      nama_ujian: examName.trim(),
      tanggal_waktu_mulai: examStart.trim(),
      tanggal_waktu_selesai: examEnd.trim(),
      durasi: durNum,
      pin_ujian: examPin.trim(),
      maks_percobaan: parseInt(examAttempts, 10) || 1,
      batas_toleransi_pelanggaran: parseInt(examTolerance, 10) || 3,
      acak_aktif: examShuffleQuestions,
      acak_opsi: examShuffleOptions,
      batasi_jaringan_kampus: examCampusOnly,
    };

    updateExamSettingsApi(selectedExamId, updatedPayload);

    const db = loadLocalDB();
    db.exams = db.exams.map((ex: ExamItem) =>
      ex.id_ujian === selectedExamId
        ? {
            ...ex,
            ...updatedPayload,
          }
        : ex
    );
    saveLocalDB(db);
    setDbState(db);
    setSettingsMsg({
      type: "success",
      text: `Pengaturan ujian "${examName}" berhasil disimpan (PIN: ${examPin}, Durasi: ${durNum} menit, Acak Soal: ${examShuffleQuestions ? "Aktif" : "Nonaktif"}).`,
    });
  };

  const handleAddParticipant = (event: FormEvent) => {
    event.preventDefault();
    const cleanNim = newNim.trim();
    if (!cleanNim) return;

    const db = loadLocalDB();
    // Cari apakah mahasiswa sudah ada di database users untuk melengkapi namanya jika kosong
    const existingUser = (db.users || []).find(
      (u: any) => u.nim === cleanNim || u.username === cleanNim
    );
    const cleanName =
      newStudentName.trim() ||
      existingUser?.nama ||
      `Mahasiswa (${cleanNim})`;

    const alreadyInThisExam = db.participants.some(
      (p: ParticipantItem) =>
        p.nim === cleanNim && (p.id_ujian || p.examId || "UJN_01") === selectedExamId
    );
    if (alreadyInThisExam) {
      setParticipantMsg(
        `Peserta ${cleanName} (${cleanNim}) sudah terdaftar pada mata kuliah/ujian "${currentExam?.nama_ujian}".`
      );
      setTimeout(() => setParticipantMsg(""), 3500);
      return;
    }

    db.participants.push({
      id_mahasiswa: `MHS_${Date.now().toString().slice(-4)}_${selectedExamId}`,
      nim: cleanNim,
      nama: cleanName,
      kelas: "Kelas A",
      id_ujian: selectedExamId,
      examId: selectedExamId,
    });

    if (!existingUser) {
      db.users.push({
        id_pengguna: `USR_${Date.now().toString().slice(-4)}`,
        username: cleanNim,
        nim: cleanNim,
        password: "123",
        role: "Mahasiswa",
        status_akun: "Aktif",
        nama: cleanName,
        detail: { id_mahasiswa: `MHS_${cleanNim}`, nim: cleanNim, nama: cleanName },
      });
    }
    saveLocalDB(db);
    setDbState(db);
    setNewNim("");
    setNewStudentName("");
    setParticipantMsg(
      `Peserta ${cleanName} (${cleanNim}) berhasil ditambahkan ke ujian "${currentExam?.nama_ujian}" (TC-34 & TC-43).`
    );
    setTimeout(() => setParticipantMsg(""), 3500);
  };

  const handleRemoveParticipant = (nim: string, nama?: string) => {
    const db = loadLocalDB();
    db.participants = db.participants.filter(
      (p: ParticipantItem) =>
        !(p.nim === nim && (p.id_ujian || p.examId || "UJN_01") === selectedExamId)
    );
    saveLocalDB(db);
    setDbState(db);
    setConfirmDeleteParticipant(null);
    setParticipantMsg(
      `Mahasiswa ${nama ? `${nama} (${nim})` : `NIM ${nim}`} berhasil dihapus dari peserta ujian "${currentExam?.nama_ujian}" (TC-34).`
    );
    setTimeout(() => setParticipantMsg(""), 4000);
  };

  const handleAddExtraTime = async (nim?: string, idSesi?: string) => {
    const res = await addExtraTimeForExamOrSession(selectedExamId, idSesi, 5, nim);
    setDbState(loadLocalDB());
    setParticipantMsg(
      nim
        ? `Waktu ujian untuk mahasiswa NIM ${nim} pada "${currentExam?.nama_ujian}" berhasil ditambah +5 menit secara real-time (TC-42).`
        : `${res.message} (Ujian: ${currentExam?.nama_ujian})`
    );
    setTimeout(() => setParticipantMsg(""), 4000);
  };

  const handleGradeEssaySubmit = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    const rawScore = Number(essayInputScore);
    if (isNaN(rawScore) || String(essayInputScore).trim() === "") return;
    const score = Math.max(0, Math.min(100, rawScore));

    const targetNim = gradingModalSession?.nim || "105022410021";
    const targetName = gradingModalSession?.nama_mahasiswa || "Mahasiswa";
    const targetExamId = gradingModalSession?.id_ujian || selectedExamId || "UJN_01";
    const targetSesiId = gradingModalSession?.id_sesi || `SES_${targetExamId}_${targetNim}`;

    const res = await gradeEssayAndRecalculate(targetSesiId, score, {
      id_ujian: targetExamId,
      nim: targetNim,
      nama_mahasiswa: targetName,
    });
    const updatedDb = loadLocalDB();
    setDbState(updatedDb);
    setGradingModalSession(null);
    setParticipantMsg(
      `Nilai esai ${targetName} (${score}) berhasil disimpan dan diakumulasikan ke Nilai Akhir: ${res.totalNilai} / 100 (TC-40).`
    );
    setTimeout(() => setParticipantMsg(""), 4500);
  };

  const handleTogglePublish = async () => {
    const nextPublish = !currentExam?.hasil_dipublikasikan;
    await togglePublishExamResultApi(selectedExamId, nextPublish);
    setDbState(loadLocalDB());
    setParticipantMsg(
      nextPublish
        ? "Hasil ujian berhasil DIPUBLIKASIKAN! Mahasiswa kini dapat melihat nilai angka mereka (TC-28)."
        : 'Publikasi hasil dinonaktifkan. Mahasiswa melihat status "Belum dinilai" (TC-27).'
    );
    setTimeout(() => setParticipantMsg(""), 4500);
  };

  if (active === "Kelola Bank Soal") {
    // 1. Soal terisolasi khusus ujian yang sedang dipilih (Ketentuan 2 & 4)
    const examQuestions: QuestionItem[] = (dbState.questions || []).filter(
      (q: QuestionItem) => (q.id_ujian || q.examId || "UJN_01") === selectedExamId
    );

    // 2. Filter tipe soal dan pencarian teks pertanyaan / kunci jawaban (Ketentuan 1)
    const filteredQuestions = examQuestions.filter((q: QuestionItem) => {
      const matchType = filterType === "Semua Tipe" || q.tipe_soal === filterType;
      const cleanSearch = searchQuery.toLowerCase().trim();
      const matchSearch =
        !cleanSearch ||
        q.pertanyaan.toLowerCase().includes(cleanSearch) ||
        (q.kunci_jawaban && q.kunci_jawaban.toLowerCase().includes(cleanSearch));
      return matchType && matchSearch;
    });

    const totalBobot = examQuestions.reduce((sum, q) => sum + (Number(q.bobot) || 0), 0);
    const courseCode = currentExam?.kode_mk || "IF-241";
    const courseName =
      currentExam?.mata_kuliah?.toUpperCase() ||
      currentExam?.nama_ujian?.toUpperCase() ||
      "SISTEM ANALISIS & DESAIN";

    // Komponen Inline Form Card bergaya Google Forms (100% Lebar Halaman, Tanpa Modal Pop-up)
    const renderInlineQuestionForm = (editIndex?: number) => {
      const isEditing = Boolean(editingQuestionId);
      return (
        <form
          id="inline-question-form-card"
          onSubmit={handleSaveQuestion}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#ffffff",
            border: "2px solid #2b5c6b",
            borderTop: "6px solid #2b5c6b",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: isEditing ? "0px" : "16px",
          }}
        >
          {/* Baris Atas (Header Form Inline): Kiri Judul & Badge Ujian, Kanan Dropdown Tipe Soal & Bobot Poin */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "14px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            {/* Sisi Kiri: Judul Form & Badge Ujian Aktif */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3
                id="modal-soal-title"
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {isEditing ? `Edit Soal #${editIndex ?? ""}` : "Tambah Butir Soal Baru"}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#2b5c6b",
                  background: "#e6f0f3",
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                {isEditing ? "UBAH SOAL (TC-29)" : "TAMBAH SOAL BARU (TC-29)"}
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  background: "#f0f9ff",
                  borderRadius: "6px",
                  border: "1px solid #bae6fd",
                  fontSize: "12px",
                  color: "#0369a1",
                }}
              >
                Terikat: <strong>{currentExam?.nama_ujian} ({currentExam?.kode_mk || "IF-241"})</strong>
              </span>
            </div>

            {/* Sisi Kanan: Dropdown Tipe Soal & Input Bobot Poin Sejajar (Gaya Google Forms) */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <span>Tipe Soal:</span>
                <select
                  aria-label="Tipe Soal (TC-37 & TC-38)"
                  value={qType}
                  onChange={(e) => {
                    const nextType = e.target.value as QuestionItem["tipe_soal"];
                    setQType(nextType);
                    if (nextType === "Benar/Salah") setQKey("Benar");
                    else setQKey("");
                  }}
                  style={{
                    height: "36px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <option value="Pilihan Ganda">Pilihan Ganda (4 Opsi)</option>
                  <option value="Benar/Salah">Benar/Salah (2 Opsi)</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai (Uraian Manual)</option>
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <span>Bobot Poin:</span>
                <input
                  type="number"
                  aria-label="Bobot Poin"
                  min={1}
                  value={qWeight}
                  onChange={(e) => setQWeight(e.target.value)}
                  placeholder="15"
                  style={{
                    width: "80px",
                    height: "36px",
                    boxSizing: "border-box",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
              </label>
            </div>
          </div>

          {/* Pesan Error Validasi (TC-30) */}
          {qError && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #f87171",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {qError}
            </div>
          )}

          {/* Baris Tengah: Input Teks Pertanyaan Lebar Penuh */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Teks Pertanyaan
            <textarea
              rows={2}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Tuliskan pertanyaan ujian di sini..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                background: "#f8fafc",
                fontFamily: "inherit",
                fontSize: "15px",
                fontWeight: 500,
                color: "#0f172a",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </label>

          {/* Baris Bawah: Daftar Opsi Jawaban Vertikal Lebar Penuh (1 baris = 1 opsi lebar penuh) */}
          {qType === "Pilihan Ganda" && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                Opsi Jawaban{" "}
                <span style={{ fontWeight: 400, color: "#64748b" }}>
                  — klik radio di sebelah kiri untuk menetapkan Kunci Jawaban (TC-30)
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {qOptions.map((opt, idx) => {
                  const isKey = qKey !== "" && opt.trim() !== "" && opt === qKey;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: isKey ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                        background: isKey ? "#ecfdf5" : "#f8fafc",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="kunci-pg"
                        aria-label={`Jadikan opsi ${String.fromCharCode(65 + idx)} sebagai kunci jawaban`}
                        checked={isKey}
                        disabled={!opt.trim()}
                        onChange={() => setQKey(opt)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "#10b981",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flexShrink: 0,
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          background: isKey ? "#10b981" : "#e2e8f0",
                          color: isKey ? "#ffffff" : "#334155",
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...qOptions];
                          next[idx] = e.target.value;
                          setQOptions(next);
                          if (isKey) setQKey(e.target.value);
                        }}
                        placeholder={`Teks opsi jawaban ${String.fromCharCode(65 + idx)}...`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: isKey ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                          fontSize: "14px",
                          color: "#0f172a",
                          background: "#ffffff",
                        }}
                      />
                      {isKey && (
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "#10b981",
                            color: "#ffffff",
                          }}
                        >
                          ✓ Kunci Jawaban
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Benar/Salah */}
          {qType === "Benar/Salah" && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                Kunci Jawaban Benar / Salah (TC-30)
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {["Benar", "Salah"].map((label) => {
                  const isKey = qKey === label;
                  return (
                    <label
                      key={label}
                      style={{
                        flex: "1 1 200px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        border: isKey ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                        background: isKey ? "#ecfdf5" : "#f8fafc",
                        color: isKey ? "#065f46" : "#475569",
                      }}
                    >
                      <input
                        type="radio"
                        name="kunci-bs"
                        checked={isKey}
                        onChange={() => setQKey(label)}
                        style={{ width: "17px", height: "17px", accentColor: "#10b981" }}
                      />
                      {label}
                      {isKey && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "#10b981",
                            color: "#ffffff",
                          }}
                        >
                          ✓ Kunci Jawaban
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Isian Singkat */}
          {qType === "Isian Singkat" && (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Kunci Jawaban Singkat (Wajib - TC-30)
              <input
                value={qKey}
                onChange={(e) => setQKey(e.target.value)}
                placeholder="Masukkan kunci jawaban singkat (kosongkan untuk uji validasi TC-30)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #10b981",
                  background: "#ecfdf5",
                  fontSize: "14px",
                  color: "#065f46",
                  fontWeight: 500,
                }}
              />
            </label>
          )}

          {/* Esai */}
          {qType === "Esai" && (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Pedoman / Rubrik Penilaian Dosen (Opsional - TC-40)
              <textarea
                rows={2}
                value={qKey}
                onChange={(e) => setQKey(e.target.value)}
                placeholder="Tuliskan rubrik / poin-poin jawaban ideal untuk membantu penilaian manual..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  color: "#78350f",
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
            </label>
          )}

          {/* Footer Kartu Form Inline */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setQuestionModalOpen(false);
                setEditingQuestionId(null);
                setQError("");
              }}
            >
              Batal
            </button>
            <button className="button primary" type="submit">
              <Icon name="save" size={16} /> {isEditing ? "Simpan Perubahan" : "Simpan Soal"}
            </button>
          </div>
        </form>
      );
    };

    return (
      <section className="management-panel">
        {/* Header Toolbar Dinamis Mengikuti Ujian Aktif */}
        <div className="management-toolbar" style={{ flexWrap: "wrap", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <p className="section-kicker">
              {courseCode} · {courseName}
            </p>
            <h2>
              Bank Soal — {currentExam?.nama_ujian || "Pilih Ujian"} ({examQuestions.length} Soal · Total {totalBobot} Poin)
            </h2>
            <p>
              Kelola butir soal (Pilihan Ganda, Benar/Salah, Isian Singkat, dan Esai) terisolasi khusus untuk ujian <strong>{currentExam?.nama_ujian}</strong> (TC-29, TC-30, TC-37, TC-38).
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="button secondary"
              type="button"
              onClick={openCreateExamForm}
              title="Buat Ujian Baru (Ketentuan 4)"
            >
              <Icon name="calendar" size={17} /> + Buat Ujian Baru
            </button>
            <button className="button primary" onClick={openAddQuestionModal}>
              <Icon name="plus" size={17} /> Tambah Soal
            </button>
          </div>
        </div>

        {/* Inline Form Card Buat Ujian Baru (Tanpa Modal Pop-up) */}
        {renderInlineCreateExamForm()}

        {/* Notifikasi Sukses Operasi CRUD */}
        {qSuccessMsg && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px",
            }}
          >
            {qSuccessMsg}
          </div>
        )}

        {/* Panel Filter Utama: Dropdown Pemilih Ujian, Tipe Soal, dan Search Bar */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* 1. Selector Pemilih Ujian (Filter Utama) */}
            <div style={{ minWidth: "280px", flex: "1 1 300px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Pilih Ujian (Filter Utama):
              </label>
              <select
                aria-label="Pilih Ujian Aktif"
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setSearchQuery("");
                  setQuestionModalOpen(false);
                  setEditingQuestionId(null);
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #0284c7",
                  background: "#f0f9ff",
                  fontWeight: "600",
                  color: "#0369a1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {uniqueExams.map((ex: ExamItem) => {
                  const count = (dbState.questions || []).filter(
                    (q: QuestionItem) => (q.id_ujian || q.examId || "UJN_01") === ex.id_ujian
                  ).length;
                  return (
                    <option key={ex.id_ujian} value={ex.id_ujian}>
                      {ex.nama_ujian} ({ex.kode_mk || "IF-241"}) — {count} Soal
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Search Bar Teks Pertanyaan */}
            <div style={{ minWidth: "240px", flex: "2 1 320px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Pencarian Pertanyaan:
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "10px", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari teks pertanyaan / kunci jawaban..."
                  style={{
                    width: "100%",
                    padding: "9px 32px 9px 34px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Filter Pill Tabs Tipe Soal */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Tipe Soal:</span>
            {["Semua Tipe", "Pilihan Ganda", "Benar/Salah", "Isian Singkat", "Esai"].map((t) => {
              const isActive = filterType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: isActive ? "600" : "400",
                    border: isActive ? "1px solid #0284c7" : "1px solid #cbd5e1",
                    background: isActive ? "#0284c7" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t}
                </button>
              );
            })}

            <div style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b" }}>
              Menampilkan <strong>{filteredQuestions.length}</strong> dari <strong>{examQuestions.length}</strong> butir soal
            </div>
          </div>
        </div>

        {/* Inline Form Card Tambah Soal Baru (Muncul tepat di atas daftar soal saat tombol "+ Tambah Soal" diklik) */}
        {questionModalOpen && !editingQuestionId && renderInlineQuestionForm()}

        {/* Daftar Soal: Stacked Question Cards (gaya Google Forms / CBT modern) */}
        {filteredQuestions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {filteredQuestions.map((item, idx) => {
              // Jika soal ini sedang di-edit, ubah langsung kartu soal ini menjadi Inline Edit Card (gaya Google Forms)
              if (questionModalOpen && editingQuestionId === item.id_soal) {
                return <div key={item.id_soal}>{renderInlineQuestionForm(idx + 1)}</div>;
              }

              const typeStyles: Record<string, { bg: string; fg: string; border: string }> = {
                "Pilihan Ganda": { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
                "Benar/Salah": { bg: "#f5f3ff", fg: "#6d28d9", border: "#ddd6fe" },
                "Isian Singkat": { bg: "#ecfeff", fg: "#0e7490", border: "#a5f3fc" },
                Esai: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
              };
              const ts = typeStyles[item.tipe_soal] || typeStyles["Pilihan Ganda"];
              const keyText = (item.kunci_jawaban || "").trim();
              const keyBadge = (
                <span
                  style={{
                    marginLeft: "auto",
                    flexShrink: 0,
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#10b981",
                    color: "#ffffff",
                  }}
                >
                  ✓ Kunci Jawaban
                </span>
              );
              const optionBase = {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "14px",
              } as const;

              return (
                <article
                  key={item.id_soal}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderLeft: "5px solid #2b5c6b",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  {/* Bagian A: Header Kartu */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#0f172a",
                          fontWeight: 700,
                          fontSize: "13px",
                          padding: "4px 12px",
                          borderRadius: "6px",
                        }}
                      >
                        Soal #{idx + 1}
                      </span>
                      <span
                        style={{
                          background: ts.bg,
                          color: ts.fg,
                          border: `1px solid ${ts.border}`,
                          fontWeight: 600,
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        ● {item.tipe_soal}
                      </span>
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                          fontWeight: 600,
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        ★ {item.bobot} Poin
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        aria-label="Ubah soal"
                        onClick={() => openEditQuestionModal(item)}
                        title="Ubah Soal (TC-29)"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#334155",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="edit" size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus soal"
                        onClick={() => handleDeleteQuestion(item.id_soal)}
                        title="Hapus Soal (TC-29)"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#dc2626",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="trash" size={14} /> Hapus
                      </button>
                    </div>
                  </div>

                  {/* Bagian B: Isi Pertanyaan */}
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#1e293b",
                      margin: "14px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.pertanyaan}
                  </p>

                  {/* Bagian C: Opsi / Kunci Jawaban sesuai tipe */}
                  {item.tipe_soal === "Pilihan Ganda" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                      {(Array.isArray(item.opsi_jawaban) ? item.opsi_jawaban : []).map((op, oIdx) => {
                        const isKey = op === item.kunci_jawaban;
                        return (
                          <div
                            key={oIdx}
                            style={{
                              ...optionBase,
                              background: isKey ? "#ecfdf5" : "#f8fafc",
                              border: isKey ? "1px solid #10b981" : "1px solid #e2e8f0",
                              color: isKey ? "#065f46" : "#475569",
                              fontWeight: isKey ? 600 : 400,
                            }}
                          >
                            <span style={{ width: "18px", textAlign: "center", fontWeight: 700 }}>
                              {isKey ? "✔" : "○"}
                            </span>
                            <span>
                              <strong>{String.fromCharCode(65 + oIdx)}.</strong> {op}
                            </span>
                            {isKey && keyBadge}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.tipe_soal === "Benar/Salah" && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {["Benar", "Salah"].map((label) => {
                        const isKey = keyText.toLowerCase() === label.toLowerCase();
                        return (
                          <div
                            key={label}
                            style={{
                              ...optionBase,
                              flex: "1 1 180px",
                              background: isKey ? "#ecfdf5" : "#f8fafc",
                              border: isKey ? "1px solid #10b981" : "1px solid #e2e8f0",
                              color: isKey ? "#065f46" : "#475569",
                              fontWeight: isKey ? 600 : 400,
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{isKey ? "(✔)" : "( )"}</span>
                            <span>{label}</span>
                            {isKey && keyBadge}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.tipe_soal === "Isian Singkat" && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderBottom: "2px dashed #10b981",
                        borderRadius: "8px 8px 0 0",
                        color: "#065f46",
                        fontSize: "14px",
                      }}
                    >
                      <strong>Kunci Jawaban Singkat:</strong> {keyText || "-"}
                    </div>
                  )}

                  {item.tipe_soal === "Esai" && (
                    <div
                      style={{
                        padding: "12px 14px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        color: "#78350f",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>📄 Pedoman / Rubrik Penilaian Dosen (TC-40):</strong>{" "}
                      {keyText || "Dinilai manual oleh Dosen pada menu Nilai Ujian."}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State Informatif (Ketentuan 2) */
          examQuestions.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "2px dashed #cbd5e1",
                margin: "16px 0",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📝</div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                Belum ada butir soal untuk ujian ini
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "520px", margin: "0 auto 18px", lineHeight: "1.5" }}>
                Bank soal untuk ujian <strong>"{currentExam?.nama_ujian}"</strong> masih kosong. Silakan klik tombol <strong>"+ Tambah Soal"</strong> di bawah untuk mulai membuat soal baru yang otomatis terikat pada ujian ini.
              </p>
              <button className="button primary" onClick={openAddQuestionModal}>
                <Icon name="plus" size={17} /> + Tambah Soal Pertama
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                margin: "16px 0",
              }}
            >
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px" }}>
                Tidak ada butir soal yang cocok dengan filter tipe <strong>"{filterType}"</strong>
                {searchQuery ? ` dan kata kunci "${searchQuery}"` : ""}.
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setFilterType("Semua Tipe");
                  setSearchQuery("");
                }}
              >
                Reset Filter
              </button>
            </div>
          )
        )}
      </section>
    );
  }

  if (active === "Atur Ujian") {
    return (
      <section className="management-panel">
        <div className="management-toolbar">
          <div>
            <p className="section-kicker">PENGATURAN UJIAN (TC-09, TC-10, TC-31..TC-33, TC-41)</p>
            <h2>{examName || "Pengaturan Ujian"}</h2>
            <p>Atur jadwal mulai/selesai, validasi durasi (&gt; 0 menit), PIN 6 digit, pengacakan, dan batas jaringan kampus.</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="button secondary"
              type="button"
              onClick={openCreateExamForm}
              title="Buat Ujian Baru (Ketentuan 4)"
            >
              <Icon name="calendar" size={17} /> + Buat Ujian Baru
            </button>
            <select
              aria-label="Pilih Ujian"
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSettingsMsg(null);
                setConfirmDeleteExam(false);
              }}
              style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            >
              {uniqueExams.map((ex: ExamItem) => (
                <option key={ex.id_ujian} value={ex.id_ujian}>
                  {ex.nama_ujian} ({ex.kode_mk || "IF-241"})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button secondary"
              onClick={handleResetExamSettings}
              title="Batalkan perubahan dan kembalikan ke pengaturan awal ujian"
            >
              Batal
            </button>
            <button type="button" className="button primary" onClick={handleSaveExamSettings}>
              <Icon name="save" size={17} /> Simpan Pengaturan
            </button>
          </div>
        </div>

        {/* Inline Form Card Buat Ujian Baru (Tanpa Modal Pop-up) */}
        {renderInlineCreateExamForm()}

        {settingsMsg && (
          <div
            role="alert"
            style={{
              backgroundColor: settingsMsg.type === "error" ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${settingsMsg.type === "error" ? "#f87171" : "#86efac"}`,
              color: settingsMsg.type === "error" ? "#b91c1c" : "#166534",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            <strong>{settingsMsg.type === "error" ? "Gagal Menyimpan: " : "Berhasil: "}</strong>
            {settingsMsg.text}
          </div>
        )}

        <div className="settings-grid">
          <label>
            Nama ujian
            <input value={examName} onChange={(e) => setExamName(e.target.value)} />
          </label>
          <label>
            Durasi (menit) — Uji TC-32 jika &le; 0
            <input
              value={examDuration}
              onChange={(e) => setExamDuration(e.target.value)}
              type="number"
            />
          </label>
          <label>
            PIN ujian (6 digit - TC-06: 483920)
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={examPin}
                onChange={(e) => setExamPin(e.target.value)}
                type={showExamPin ? "text" : "password"}
                maxLength={10}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowExamPin(!showExamPin)}
                style={{ padding: "0 12px", fontSize: "12px" }}
              >
                {showExamPin ? "Sembunyikan" : "Lihat PIN"}
              </button>
            </div>
          </label>
          <label>
            Jumlah percobaan (TC-33)
            <select value={examAttempts} onChange={(e) => setExamAttempts(e.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label>
            Ambang pelanggaran (TC-18)
            <select value={examTolerance} onChange={(e) => setExamTolerance(e.target.value)}>
              <option value="3">3 — Kunci sesi</option>
              <option value="5">5 — Kunci sesi</option>
            </select>
          </label>
        </div>

        {/* Baris Jadwal Mulai & Jadwal Selesai Bergaya Alarm (2 Kolom Lebar Sejajar) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
            marginTop: "14px",
            marginBottom: "14px",
          }}
        >
          <AlarmDateTimePicker
            label="Jadwal Mulai (TC-08)"
            value={examStart}
            onChange={setExamStart}
            presets={[
              {
                label: "Mulai Sekarang",
                getValue: () => formatLocalDateTime(new Date()),
              },
              {
                label: "Mulai +5 Menit Lagi",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 5 * 60000)),
              },
            ]}
          />
          <AlarmDateTimePicker
            label="Jadwal Selesai (TC-31)"
            value={examEnd}
            onChange={setExamEnd}
            presets={[
              {
                label: "+90 Menit",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 90 * 60000)),
              },
              {
                label: "+7 Hari",
                getValue: () => formatLocalDateTime(new Date(Date.now() + 7 * 86400000)),
              },
              {
                label: "Set Sudah Berakhir (-1 Menit Lalu)",
                getValue: () => formatLocalDateTime(new Date(Date.now() - 60000)),
              },
            ]}
          />
        </div>
        <div className="toggle-list">
          <label>
            <div>
              <strong>Acak urutan soal (TC-09 &amp; TC-10)</strong>
              <span>Setiap peserta menerima urutan soal berbeda yang konsisten saat reload.</span>
            </div>
            <input
              checked={examShuffleQuestions}
              onChange={(e) => setExamShuffleQuestions(e.target.checked)}
              type="checkbox"
            />
          </label>
          <label>
            <div>
              <strong>Acak opsi jawaban (TC-09 &amp; TC-10)</strong>
              <span>Pilihan jawaban Pilihan Ganda diacak secara unik untuk setiap peserta.</span>
            </div>
            <input
              checked={examShuffleOptions}
              onChange={(e) => setExamShuffleOptions(e.target.checked)}
              type="checkbox"
            />
          </label>
          <label>
            <div>
              <strong>Batasi jaringan kampus / IP Whitelisting (TC-41)</strong>
              <span>Ujian hanya dapat diakses dari subnet IP jaringan kampus UNKLAB.</span>
            </div>
            <input
              checked={examCampusOnly}
              onChange={(e) => setExamCampusOnly(e.target.checked)}
              type="checkbox"
            />
          </label>
        </div>

        {/* Footer Aksi Pengaturan Ujian: Hapus Ujian Ini (kiri) + Batal & Simpan Pengaturan (kanan) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div>
            {confirmDeleteExam ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                }}
              >
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#991b1b" }}>
                  Yakin hapus ujian "{currentExam?.nama_ujian}"?
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteExam(selectedExamId, currentExam?.nama_ujian)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #dc2626",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Icon name="trash" size={14} /> Ya, Hapus Ujian
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteExam(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteExam(true)}
                disabled={uniqueExams.length <= 1}
                title={
                  uniqueExams.length <= 1
                    ? "Minimal harus ada 1 ujian aktif di sistem"
                    : "Hapus jadwal ujian ini secara permanen"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: uniqueExams.length <= 1 ? "not-allowed" : "pointer",
                  opacity: uniqueExams.length <= 1 ? 0.5 : 1,
                }}
              >
                <Icon name="trash" size={15} /> Hapus Ujian Ini
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="button secondary"
              onClick={handleResetExamSettings}
            >
              Batal
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleSaveExamSettings}
            >
              <Icon name="save" size={17} /> Simpan Pengaturan
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (active === "Kelola Peserta") {
    const allParticipants: ParticipantItem[] = dbState.participants || [];
    const examParticipants: ParticipantItem[] = allParticipants.filter(
      (p: ParticipantItem) => (p.id_ujian || p.examId || "UJN_01") === selectedExamId
    );
    const sessions = (dbState.sessions || []).filter(
      (s: any) => (s.id_ujian || "UJN_01") === selectedExamId
    );

    const cleanSearch = participantSearch.toLowerCase().trim();
    const filteredParticipants = examParticipants.filter((p: ParticipantItem) => {
      if (!cleanSearch) return true;
      return (
        p.nama.toLowerCase().includes(cleanSearch) ||
        p.nim.toLowerCase().includes(cleanSearch) ||
        (p.kelas && p.kelas.toLowerCase().includes(cleanSearch))
      );
    });

    // Default urutkan berdasarkan Abjad Nama (A–Z) secara rapi
    const sortedParticipants = [...filteredParticipants].sort((a, b) => {
      if (participantSort === "nama-asc") {
        return a.nama.localeCompare(b.nama, "id");
      }
      if (participantSort === "nama-desc") {
        return b.nama.localeCompare(a.nama, "id");
      }
      return a.nim.localeCompare(b.nim, "id");
    });

    const courseCode = currentExam?.kode_mk || "IF-241";
    const courseName =
      currentExam?.mata_kuliah?.toUpperCase() ||
      currentExam?.nama_ujian?.toUpperCase() ||
      "SISTEM ANALISIS & DESAIN";

    const avatarPalettes = [
      { bg: "#e0f2fe", fg: "#0369a1", border: "#bae6fd" },
      { bg: "#e6f0f3", fg: "#2b5c6b", border: "#bcd5dc" },
      { bg: "#ede9fe", fg: "#6d28d9", border: "#ddd6fe" },
      { bg: "#dcfce7", fg: "#15803d", border: "#bbf7d0" },
      { bg: "#fef3c7", fg: "#b45309", border: "#fde68a" },
    ];

    const getInitials = (fullName: string) => {
      const parts = fullName.replace(/,/g, " ").trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "M";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    };

    return (
      <section className="management-panel">
        {/* Header Toolbar Dinamis Mengikuti Mata Kuliah / Ujian Aktif */}
        <div className="management-toolbar" style={{ flexWrap: "wrap", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <p className="section-kicker">
              {courseCode} · {courseName} — KELOLA PESERTA &amp; WAKTU (TC-27, TC-28, TC-34, TC-40, TC-42)
            </p>
            <h2>
              {examParticipants.length} Mahasiswa Terdaftar — {currentExam?.nama_ujian || "Pilih Ujian"}
            </h2>
            <p>
              Hanya peserta terdaftar pada ujian <strong>{currentExam?.nama_ujian}</strong> yang dapat memulai sesi ujian (TC-34). Dosen dapat menambah waktu (+5m), menilai esai, &amp; mempublikasikan hasil.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => handleAddExtraTime()}
              title="Tambah waktu +5 menit untuk seluruh peserta pada ujian terpilih ini (TC-42)"
            >
              <Icon name="clock" size={16} /> +5 Menit Semua Peserta (TC-42)
            </button>
            <button
              type="button"
              className={`button ${currentExam?.hasil_dipublikasikan ? "secondary" : "primary"}`}
              onClick={handleTogglePublish}
            >
              <Icon name="check" size={16} />{" "}
              {currentExam?.hasil_dipublikasikan ? "Hasil Dipublikasikan (Aktif)" : "Publikasikan Hasil (TC-28)"}
            </button>
          </div>
        </div>

        {/* Notifikasi Sukses Operasi Peserta / Waktu / Publikasi */}
        {participantMsg && (
          <div
            role="status"
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "14px",
            }}
          >
            {participantMsg}
          </div>
        )}

        {/* Panel Filter Utama: Dropdown Pilih Mata Kuliah / Ujian, Pencarian Cepat, dan Urutan (Sorting A-Z) */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* 1. Dropdown Pemilih Mata Kuliah & Ujian (Filter Utama) */}
            <div style={{ minWidth: "280px", flex: "1 1 320px" }}>
              <label
                htmlFor="participant-exam-select"
                style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}
              >
                Pilih Mata Kuliah / Ujian (Filter Utama):
              </label>
              <select
                id="participant-exam-select"
                aria-label="Pilih Mata Kuliah atau Ujian"
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setParticipantSearch("");
                  setConfirmDeleteParticipant(null);
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #0284c7",
                  background: "#f0f9ff",
                  fontWeight: 600,
                  color: "#0369a1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {uniqueExams.map((ex: ExamItem) => {
                  const count = allParticipants.filter(
                    (p: ParticipantItem) => (p.id_ujian || p.examId || "UJN_01") === ex.id_ujian
                  ).length;
                  return (
                    <option key={ex.id_ujian} value={ex.id_ujian}>
                      {ex.kode_mk || "IF-241"} • {ex.nama_ujian} — {count} Mahasiswa
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Input Pencarian Cepat Nama atau NIM Mahasiswa */}
            <div style={{ minWidth: "240px", flex: "2 1 320px" }}>
              <label
                htmlFor="participant-search-input"
                style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}
              >
                Pencarian Cepat Peserta:
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: "10px", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                  <Icon name="search" size={16} />
                </span>
                <input
                  id="participant-search-input"
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Cari Nama atau NIM mahasiswa..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "9px 32px 9px 34px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                  }}
                />
                {participantSearch && (
                  <button
                    type="button"
                    onClick={() => setParticipantSearch("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Opsi Urutkan (Sorting Nama A-Z, Z-A, NIM) & Ringkasan */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              paddingTop: "8px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Urutkan:</span>
            {[
              { id: "nama-asc", label: "Nama (A–Z)" },
              { id: "nama-desc", label: "Nama (Z–A)" },
              { id: "nim-asc", label: "NIM" },
            ].map((opt) => {
              const isActive = participantSort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setParticipantSort(opt.id as "nama-asc" | "nama-desc" | "nim-asc")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    border: isActive ? "1px solid #0284c7" : "1px solid #cbd5e1",
                    background: isActive ? "#0284c7" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}

            <div style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b" }}>
              Menampilkan <strong>{sortedParticipants.length}</strong> dari <strong>{examParticipants.length}</strong> mahasiswa terdaftar
            </div>
          </div>
        </div>

        {/* Form Tambah Peserta Baru Terisolasi untuk Ujian Terpilih (TC-34) */}
        <form
          onSubmit={handleAddParticipant}
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
            background: "#ffffff",
            padding: "14px 16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#2b5c6b",
                background: "#e6f0f3",
                padding: "4px 10px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
              }}
            >
              + PESERTA BARU (TC-34)
            </span>
          </div>
          <input
            value={newNim}
            onChange={(e) => setNewNim(e.target.value)}
            placeholder="Masukkan NIM Mahasiswa (contoh: 105022410099)"
            required
            style={{
              flex: "1 1 200px",
              minWidth: "180px",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#f8fafc",
            }}
          />
          <input
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Nama Lengkap Mahasiswa (contoh: Marga, Nama Depan)"
            style={{
              flex: "1.4 1 240px",
              minWidth: "200px",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#f8fafc",
            }}
          />
          <button className="button primary" type="submit" style={{ whiteSpace: "nowrap" }}>
            <Icon name="plus" size={16} /> Tambah Peserta
          </button>
        </form>

        {/* Banner Konfirmasi Hapus Peserta Inline di Atas Tabel (jika ada mahasiswa yang dipilih untuk dihapus) */}
        {confirmDeleteParticipant && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#991b1b", fontSize: "13.5px" }}>
              <Icon name="warning" size={18} />
              <span>
                Yakin ingin menghapus <strong>{confirmDeleteParticipant.nama}</strong> (<strong>{confirmDeleteParticipant.nim}</strong>) dari peserta ujian <strong>{currentExam?.nama_ujian}</strong>?
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleRemoveParticipant(confirmDeleteParticipant.nim, confirmDeleteParticipant.nama)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dc2626",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Icon name="trash" size={14} /> Hapus Mahasiswa
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteParticipant(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Tabel Daftar Peserta Modern & Rapi (Konsisten dengan halaman Nilai Ujian) */}
        {sortedParticipants.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "13px",
                overflow: "hidden",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    color: "#475569",
                    textAlign: "left",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  <th
                    style={{
                      padding: "13px 14px",
                      fontWeight: 700,
                      width: "54px",
                      textAlign: "center",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    NO
                  </th>
                  <th
                    style={{
                      padding: "13px 14px",
                      fontWeight: 700,
                      borderBottom: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setParticipantSort(participantSort === "nama-asc" ? "nama-desc" : "nama-asc")
                    }
                    title="Klik untuk mengurutkan berdasarkan Nama Mahasiswa"
                  >
                    NAMA MAHASISWA {participantSort === "nama-asc" ? "↑" : participantSort === "nama-desc" ? "↓" : ""}
                  </th>
                  <th
                    style={{
                      padding: "13px 14px",
                      fontWeight: 700,
                      borderBottom: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                    onClick={() => setParticipantSort("nim-asc")}
                    title="Klik untuk mengurutkan berdasarkan NIM"
                  >
                    NIM {participantSort === "nim-asc" ? "↑" : ""}
                  </th>
                  <th style={{ padding: "13px 14px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>
                    STATUS SESI
                  </th>
                  <th style={{ padding: "13px 14px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>
                    NILAI AKHIR
                  </th>
                  <th
                    style={{
                      padding: "13px 16px",
                      fontWeight: 700,
                      textAlign: "right",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    AKSI DOSEN
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((item, idx) => {
                  const mhsSession = sessions.find((s: any) => s.nim === item.nim);
                  const statusText = mhsSession?.status_ujian || item.status_ujian || "Terdaftar";
                  const extraMinutes =
                    Number(mhsSession?.tambahan_waktu || item.tambahan_waktu || 0);
                  const finalScoreVal =
                    mhsSession?.total_nilai !== null && mhsSession?.total_nilai !== undefined
                      ? mhsSession.total_nilai
                      : item.total_nilai !== null && item.total_nilai !== undefined
                      ? item.total_nilai
                      : null;
                  const hasScore = finalScoreVal !== null && finalScoreVal !== undefined;
                  const isPendingConfirm = confirmDeleteParticipant?.nim === item.nim;
                  const palette = avatarPalettes[idx % avatarPalettes.length];

                  const statusChipStyle =
                    statusText === "Terkirim" || statusText === "Selesai"
                      ? { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" }
                      : statusText === "Berlangsung"
                      ? { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" }
                      : statusText.includes("Dikunci")
                      ? { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" }
                      : { bg: "#f1f5f9", fg: "#475569", border: "#e2e8f0" };

                  return (
                    <tr
                      key={`${item.nim}_${selectedExamId}`}
                      style={{
                        background: isPendingConfirm
                          ? "#fef2f2"
                          : idx % 2 === 0
                          ? "#ffffff"
                          : "#fcfdff",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Kolom 1: NO */}
                      <td
                        style={{
                          padding: "12px 14px",
                          borderTop: "1px solid #f1f5f9",
                          textAlign: "center",
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-grid",
                            placeItems: "center",
                            width: "26px",
                            height: "26px",
                            borderRadius: "6px",
                            background: "#f1f5f9",
                            color: "#334155",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Kolom 2: Nama Mahasiswa + Inisial Avatar Bulat */}
                      <td style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                          <span
                            style={{
                              flexShrink: 0,
                              width: "34px",
                              height: "34px",
                              borderRadius: "999px",
                              background: palette.bg,
                              color: palette.fg,
                              border: `1px solid ${palette.border}`,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: "12.5px",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {getInitials(item.nama)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                              {item.nama}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                              {item.kelas || "Kelas A"} • {currentExam?.kode_mk || "IF-241"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 3: NIM */}
                      <td style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            fontFamily: "monospace",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {item.nim}
                        </span>
                      </td>

                      {/* Kolom 4: Status Sesi & Tambahan Waktu */}
                      <td style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              background: statusChipStyle.bg,
                              color: statusChipStyle.fg,
                              border: `1px solid ${statusChipStyle.border}`,
                            }}
                          >
                            {statusText}
                          </span>
                          {extraMinutes > 0 && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: "#ecfdf5",
                                color: "#047857",
                                border: "1px solid #6ee7b7",
                              }}
                              title={`Waktu pengerjaan mahasiswa ini telah ditambah +${extraMinutes} menit (TC-42)`}
                            >
                              +{extraMinutes}m
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 5: Nilai Akhir */}
                      <td style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                        {hasScore ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                            <strong style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                              {finalScoreVal}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>/ 100</span>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              background: "#fefce8",
                              color: "#a16207",
                              border: "1px solid #fef08a",
                            }}
                          >
                            Belum dinilai
                          </span>
                        )}
                      </td>

                      {/* Kolom 6: AKSI DOSEN (Tombol Terpisah Rapi + Konfirmasi Hapus Inline) */}
                      <td
                        style={{
                          padding: "12px 16px",
                          borderTop: "1px solid #f1f5f9",
                          textAlign: "right",
                        }}
                      >
                        {isPendingConfirm ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#b91c1c",
                                marginRight: "4px",
                              }}
                            >
                              Yakin ingin menghapus {item.nama.split(",")[0]} ({item.nim})?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(item.nim, item.nama)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #dc2626",
                                background: "#dc2626",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Icon name="trash" size={13} /> Hapus Mahasiswa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteParticipant(null)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#334155",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "8px",
                              flexWrap: "nowrap",
                            }}
                          >
                            {/* 1. Tombol +5m Waktu (TC-42) */}
                            <button
                              type="button"
                              onClick={() => handleAddExtraTime(item.nim, mhsSession?.id_sesi)}
                              title="Tambah Waktu +5 Menit untuk mahasiswa ini (TC-42)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 11px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "8px",
                                border: extraMinutes > 0 ? "1px solid #10b981" : "1px solid #cbd5e1",
                                background: extraMinutes > 0 ? "#ecfdf5" : "#f8fafc",
                                color: extraMinutes > 0 ? "#047857" : "#334155",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Icon name="clock" size={13} />
                              <span>+5m Waktu</span>
                              {extraMinutes > 0 && (
                                <span
                                  style={{
                                    padding: "1px 6px",
                                    borderRadius: "999px",
                                    background: "#10b981",
                                    color: "#ffffff",
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                  }}
                                >
                                  +{extraMinutes}m
                                </span>
                              )}
                            </button>

                            {/* 2. Tombol Nilai Esai (TC-40) */}
                            <button
                              type="button"
                              onClick={() => {
                                setGradingModalSession(
                                  mhsSession || {
                                    id_sesi: `SES_${selectedExamId}_${item.nim}`,
                                    id_ujian: selectedExamId,
                                    nim: item.nim,
                                    nama_mahasiswa: item.nama,
                                  }
                                );
                                setEssayInputScore(
                                  mhsSession?.essayScores?.SOAL_06 !== undefined
                                    ? String(mhsSession.essayScores.SOAL_06)
                                    : "80"
                                );
                              }}
                              title="Penilaian Esai Manual (TC-40)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 11px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "8px",
                                border: "1px solid #bae6fd",
                                background: "#f0f9ff",
                                color: "#0369a1",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Icon name="edit" size={13} />
                              <span>Nilai Esai</span>
                            </button>

                            {/* 3. Tombol Reset Sesi Perangkat (TC-05 Emergency Release) */}
                            <button
                              type="button"
                              onClick={async () => {
                                await resetUserDeviceSessionApi(item.nim);
                                setParticipantMsg(
                                  `Kunci sesi perangkat untuk ${item.nama} (${item.nim}) berhasil direset (TC-05). Mahasiswa kini dapat login ulang.`
                                );
                                setTimeout(() => setParticipantMsg(""), 4000);
                              }}
                              title="Reset Kunci Sesi Perangkat Mahasiswa (TC-05)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 11px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "8px",
                                border: "1px solid #fde68a",
                                background: "#fffbeb",
                                color: "#b45309",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Icon name="shield" size={13} />
                              <span>Reset Sesi</span>
                            </button>

                            {/* 4. Tombol Hapus dengan Konfirmasi Inline (TC-34) */}
                            <button
                              type="button"
                              aria-label={`Hapus peserta ${item.nama}`}
                              onClick={() =>
                                setConfirmDeleteParticipant({ nim: item.nim, nama: item.nama })
                              }
                              title="Hapus Peserta dari ujian ini (TC-34)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 11px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "8px",
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#dc2626",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Icon name="trash" size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
              margin: "12px 0",
            }}
          >
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "10px" }}>
              {participantSearch
                ? `Tidak ada peserta yang cocok dengan kata kunci "${participantSearch}" pada ujian "${currentExam?.nama_ujian}".`
                : `Belum ada peserta terdaftar pada mata kuliah / ujian "${currentExam?.nama_ujian}".`}
            </p>
            {participantSearch && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setParticipantSearch("")}
              >
                Reset Pencarian
              </button>
            )}
          </div>
        )}

        {gradingModalSession && (
          <Modal labelledBy="grade-essay-title" onClose={() => setGradingModalSession(null)}>
            <p className="modal-kicker">PENILAIAN MANUAL SOAL ESAI (TC-40)</p>
            <h2 id="grade-essay-title">Input Nilai Esai Mahasiswa</h2>
            <p className="modal-subtitle">
              Peserta: <strong>{gradingModalSession.nama_mahasiswa}</strong> ({gradingModalSession.nim})
            </p>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              <strong>Jawaban Esai Mahasiswa:</strong>
              <p style={{ margin: "6px 0 0", color: "#334155" }}>
                {gradingModalSession.answers?.SOAL_06 ||
                  "Mekanisme anti-curang tanpa kamera bekerja efektif melalui kombinasi Fullscreen API, deteksi perpindahan fokus tab (Page Visibility API), pemblokiran clipboard copy-paste, serta pencatatan log pelanggaran yang bersifat append-only (immutable)."}
              </p>
            </div>
            <form className="login-form" onSubmit={handleGradeEssaySubmit}>
              <label>
                Nilai Esai (Skala 0 – 100, contoh TC-40: 80)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={essayInputScore}
                  onChange={(e) => setEssayInputScore(e.target.value)}
                  required
                />
              </label>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  color: "#166534",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  Akumulasi Nilai Akhir (Objektif {gradingModalSession.objective_earned ?? 70} + Esai{" "}
                  {Math.round((Math.max(0, Math.min(100, Number(essayInputScore) || 0)) / 100) * 30)}):
                </span>
                <strong style={{ fontSize: "15px" }}>
                  {(gradingModalSession.objective_earned ?? 70) +
                    Math.round((Math.max(0, Math.min(100, Number(essayInputScore) || 0)) / 100) * 30)}{" "}
                  / 100
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setGradingModalSession(null)}
                >
                  Batal
                </button>
                <button className="button primary" type="submit">
                  <Icon name="save" size={17} /> Simpan &amp; Akumulasikan Nilai Akhir
                </button>
              </div>
            </form>
          </Modal>
        )}
      </section>
    );
  }

  // Menu Nilai Ujian (TC-27, TC-28, TC-36, TC-39, TC-40)
  if (active === "Nilai Ujian") {
    const examSessions: any[] = (dbState.sessions || []).filter(
      (s: any) => (s.id_ujian || "UJN_01") === selectedExamId
    );
    const totalSubmitted = examSessions.length;
    const ungradedCount = examSessions.filter((s: any) => s.has_ungraded_essay).length;
    const gradedCount = totalSubmitted - ungradedCount;

    const gradedSessions = examSessions.filter(
      (s: any) => !s.has_ungraded_essay && s.total_nilai !== null && s.total_nilai !== undefined
    );
    const avgScore =
      gradedSessions.length > 0
        ? (
            gradedSessions.reduce((acc, curr) => acc + Number(curr.total_nilai), 0) /
            gradedSessions.length
          ).toFixed(1)
        : "-";

    const isPublished = Boolean(currentExam?.hasil_dipublikasikan);

    // Ambil daftar butir pertanyaan untuk modal penilaian detail
    const examQuestions: QuestionItem[] = (dbState.questions || []).filter(
      (q: QuestionItem) => (q.id_ujian || q.examId || "UJN_01") === selectedExamId
    );
    const objectiveQuestions = examQuestions.filter((q) => q.tipe_soal !== "Esai");
    const essayQuestions = examQuestions.filter((q) => q.tipe_soal === "Esai");

    // Kalkulasi interaktif live untuk modal penilaian esai (TC-40)
    const currentEssayWeight = essayQuestions[0]?.bobot || 30;
    const parsedEssayInput = Math.max(0, Math.min(100, parseFloat(essayInputScore) || 0));
    const liveEssayEarned = Math.round((parsedEssayInput / 100) * currentEssayWeight);
    const liveObjEarned = gradingModalSession?.objective_earned ?? 70;
    let liveNetFinal = liveObjEarned + liveEssayEarned;
    if (gradingModalSession?.status_keputusan === "Pengurangan Nilai") {
      liveNetFinal = Math.max(0, liveNetFinal - 20);
    } else if (gradingModalSession?.status_keputusan === "Diskualifikasi") {
      liveNetFinal = 0;
    }

    return (
      <section className="management-panel">
        <div className="management-toolbar" style={{ flexWrap: "wrap", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <p className="section-kicker">PENILAIAN HASIL UJIAN &amp; PUBLIKASI (TC-27, TC-28, TC-36, TC-39, TC-40)</p>
            <h2>Nilai Ujian &amp; Rekapitulasi Mahasiswa</h2>
            <p>
              Koreksi manual butir esai (TC-40), tinjau akumulasi nilai objektif (TC-39) dan penalti sanksi (TC-36), lalu publikasikan nilai ke portal mahasiswa (TC-27 &amp; TC-28).
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter Pemilih Ujian */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="exam-grade-select" style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                Pilih Ujian:
              </label>
              <select
                id="exam-grade-select"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1e293b",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {uniqueExams.map((exam: ExamItem) => (
                  <option key={exam.id_ujian} value={exam.id_ujian}>
                    {exam.kode_mk || "IF-301"} • {exam.nama_ujian}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Publikasi Hasil Ujian (TC-27, TC-28) */}
            <button
              className={`button ${isPublished ? "secondary" : "primary"}`}
              onClick={handleTogglePublish}
              title={
                isPublished
                  ? "Tarik publikasi hasil agar nilai tidak terlihat oleh mahasiswa (TC-27)"
                  : "Publikasikan nilai ke portal mahasiswa (TC-28)"
              }
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Icon name={isPublished ? "shield" : "award"} size={16} />
              <span>{isPublished ? "Tarik Publikasi (Kembali ke Draft)" : "Publikasikan Hasil Ujian (TC-28)"}</span>
            </button>
          </div>
        </div>

        {participantMsg && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {participantMsg}
          </div>
        )}

        {/* 5 Kartu Ringkasan Statistik */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <article
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Mengumpulkan</p>
            <strong style={{ fontSize: "24px", color: "#0f172a", display: "block", marginTop: "4px" }}>
              {totalSubmitted}
            </strong>
            <small style={{ color: "#94a3b8", fontSize: "11px" }}>Lembar jawaban peserta</small>
          </article>

          <article
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#166534", fontWeight: 600 }}>Sudah Dinilai</p>
            <strong style={{ fontSize: "24px", color: "#16a34a", display: "block", marginTop: "4px" }}>
              {gradedCount}
            </strong>
            <small style={{ color: "#94a3b8", fontSize: "11px" }}>Selesai dikoreksi lengkap</small>
          </article>

          <article
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#b45309", fontWeight: 600 }}>Belum Dinilai (TC-28)</p>
            <strong style={{ fontSize: "24px", color: "#d97706", display: "block", marginTop: "4px" }}>
              {ungradedCount}
            </strong>
            <small style={{ color: "#94a3b8", fontSize: "11px" }}>Menunggu koreksi esai</small>
          </article>

          <article
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Rata-rata Nilai Akhir</p>
            <strong style={{ fontSize: "24px", color: "#0f172a", display: "block", marginTop: "4px" }}>
              {avgScore} <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>/ 100</span>
            </strong>
            <small style={{ color: "#94a3b8", fontSize: "11px" }}>Dari peserta selesai dinilai</small>
          </article>

          <article
            style={{
              background: isPublished ? "#f0fdf4" : "#fefce8",
              border: `1px solid ${isPublished ? "#86efac" : "#fef08a"}`,
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: isPublished ? "#166534" : "#854d0e", fontWeight: 600 }}>
              Status Publikasi
            </p>
            <strong
              style={{
                fontSize: "13px",
                color: isPublished ? "#15803d" : "#a16207",
                display: "block",
                marginTop: "6px",
              }}
            >
              {isPublished ? "Sudah Dipublikasikan (TC-28)" : "Draft / Belum Dipublikasikan (TC-27)"}
            </strong>
            <small style={{ color: isPublished ? "#166534" : "#854d0e", fontSize: "11px", display: "block", marginTop: "2px" }}>
              {isPublished ? "Mahasiswa dapat melihat nilai akhir" : "Nilai disembunyikan dari mahasiswa"}
            </small>
          </article>
        </section>

        {/* Tabel Hasil Ujian Peserta (TC-39, TC-40) */}
        {examSessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "12px",
              color: "#64748b",
            }}
          >
            <Icon name="exam" size={32} />
            <h3 style={{ margin: "12px 0 6px", color: "#334155" }}>Belum Ada Lembar Jawaban</h3>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Belum ada mahasiswa yang mengumpulkan lembar jawaban untuk ujian ini.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Nama Mahasiswa &amp; NIM</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Waktu / Status</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Nilai Objektif (TC-39)</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Nilai Esai (TC-40)</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Penalti (TC-36)</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Total Nilai Akhir</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600 }}>Status Penilaian</th>
                  <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {examSessions.map((session: any, idx: number) => {
                  const hasUngraded = Boolean(session.has_ungraded_essay);
                  const isDisqualified = session.status_keputusan === "Diskualifikasi";
                  const hasDeduction = session.status_keputusan === "Pengurangan Nilai";

                  return (
                    <tr
                      key={session.id_sesi || idx}
                      style={{
                        borderTop: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Mahasiswa */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{session.nama_mahasiswa}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>NIM: {session.nim}</div>
                      </td>

                      {/* Waktu / Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          {session.waktu_pengiriman || "17/11/2026, 09.45"}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "3px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: session.status_ujian === "Terkirim" ? "#eff6ff" : "#fee2e2",
                            color: session.status_ujian === "Terkirim" ? "#1d4ed8" : "#b91c1c",
                          }}
                        >
                          {session.status_ujian}
                        </span>
                      </td>

                      {/* Nilai Objektif (TC-39) */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          {session.objective_earned ?? 0}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          {" "}/ {session.objective_bobot ?? 70} poin
                        </span>
                        <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 500 }}>
                          Otomatis oleh sistem
                        </div>
                      </td>

                      {/* Nilai Esai (TC-40) */}
                      <td style={{ padding: "12px 14px" }}>
                        {hasUngraded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setGradingModalSession(session);
                              setGradeModalTab("essay");
                              setEssayInputScore(
                                session.essayScores?.SOAL_06 !== undefined
                                  ? String(session.essayScores.SOAL_06)
                                  : "80"
                              );
                              setTimeout(() => essayInputRef.current?.focus(), 60);
                            }}
                            title="Klik untuk langsung menilai jawaban esai mahasiswa ini (TC-40)"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 700,
                              fontSize: "11px",
                              border: "1px solid #f59e0b",
                              cursor: "pointer",
                            }}
                          >
                            Perlu Dinilai ✎
                          </button>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>
                              {session.essay_earned ?? 0}
                            </span>
                            <span style={{ color: "#64748b", fontSize: "11px" }}>
                              {" "}/ {session.essay_bobot ?? 30} poin
                            </span>
                          </>
                        )}
                      </td>

                      {/* Penalti Pelanggaran (TC-36) */}
                      <td style={{ padding: "12px 14px" }}>
                        {hasDeduction ? (
                          <span style={{ color: "#dc2626", fontWeight: 600, fontSize: "12px" }}>
                            -20 poin (TC-36)
                          </span>
                        ) : isDisqualified ? (
                          <span style={{ color: "#dc2626", fontWeight: 600, fontSize: "12px" }}>
                            Diskualifikasi (Nilai 0)
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>

                      {/* Total Nilai Akhir */}
                      <td style={{ padding: "12px 14px" }}>
                        {hasUngraded ? (
                          <span style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>
                            Menunggu Esai
                          </span>
                        ) : (
                          <div>
                            <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                              {session.total_nilai}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}> / 100</span>
                          </div>
                        )}
                      </td>

                      {/* Status Penilaian */}
                      <td style={{ padding: "12px 14px" }}>
                        {hasUngraded ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                            }}
                          >
                            Belum Dinilai (TC-28)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            Selesai Dinilai
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          className="button secondary"
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => {
                            setGradingModalSession(session);
                            setGradeModalTab("essay");
                            setEssayInputScore(
                              session.essayScores?.SOAL_06 !== undefined
                                ? String(session.essayScores.SOAL_06)
                                : "80"
                            );
                            setTimeout(() => essayInputRef.current?.focus(), 60);
                          }}
                        >
                          <Icon name="award" size={14} /> Beri Nilai / Detail Jawaban
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Penilaian Esai & Penetapan Nilai Akhir (TC-36, TC-39 & TC-40) */}
        {gradingModalSession && (() => {
          const penaltyVal =
            gradingModalSession.status_keputusan === "Pengurangan Nilai"
              ? 20
              : gradingModalSession.status_keputusan === "Diskualifikasi"
                ? liveObjEarned + liveEssayEarned
                : 0;
          const isDisq = gradingModalSession.status_keputusan === "Diskualifikasi";
          const displayStatusBadge = gradingModalSession.status_ujian || "Terkirim";
          const essayListToRender =
            essayQuestions.length > 0
              ? essayQuestions
              : [
                  {
                    id_soal: "SOAL_06",
                    pertanyaan:
                      "Jelaskan bagaimana mekanisme anti-curang tanpa kamera pada sistem ujian online xUnklab bekerja efektif!",
                    bobot: 30,
                    kunci_jawaban:
                      "Mekanisme anti-curang tanpa kamera menggunakan Fullscreen API, Page Visibility API (pindah tab), clipboard copy-paste blocking, dan log audit imutabel.",
                    tipe_soal: "Esai" as const,
                    opsi_jawaban: null,
                  },
                ];

          return (
            <div
              className="modal-backdrop"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                background: "rgba(15, 23, 42, 0.58)",
                backdropFilter: "blur(6px)",
              }}
              onMouseDown={() => setGradingModalSession(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="grade-detail-title"
            >
              <div
                style={{
                  width: "min(920px, 100%)",
                  maxHeight: "88vh",
                  background: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 25px 60px rgba(15, 23, 42, 0.28)",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* 1. Sticky Header */}
                <header
                  style={{
                    flexShrink: 0,
                    padding: "18px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>
                        Panel Penilaian Esai &amp; Penetapan Nilai Akhir · TC-36, TC-39 &amp; TC-40
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: displayStatusBadge === "Terkirim" ? "#ecfdf5" : "#fef2f2",
                          color: displayStatusBadge === "Terkirim" ? "#047857" : "#b91c1c",
                          border: `1px solid ${displayStatusBadge === "Terkirim" ? "#a7f3d0" : "#fecaca"}`,
                        }}
                      >
                        {displayStatusBadge}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: gradingModalSession.has_ungraded_essay ? "#fef3c7" : "#f0f9ff",
                          color: gradingModalSession.has_ungraded_essay ? "#92400e" : "#0369a1",
                          border: `1px solid ${gradingModalSession.has_ungraded_essay ? "#fde68a" : "#bae6fd"}`,
                        }}
                      >
                        {gradingModalSession.has_ungraded_essay ? "Perlu Penilaian Esai" : "Selesai Dinilai"}
                      </span>
                    </div>
                    <h2 id="grade-detail-title" style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                      {gradingModalSession.nama_mahasiswa}
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                      NIM: <strong style={{ color: "#334155" }}>{gradingModalSession.nim}</strong> ·{" "}
                      {gradingModalSession.nama_ujian || currentExam?.nama_ujian}
                      {gradingModalSession.waktu_pengiriman ? ` · Dikirim: ${gradingModalSession.waktu_pengiriman}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Tutup modal"
                    onClick={() => setGradingModalSession(null)}
                    style={{
                      flexShrink: 0,
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#475569",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </header>

                {/* Sub-Menu 2 Tab Navigasi di Atas Body */}
                <div
                  style={{
                    flexShrink: 0,
                    padding: "10px 24px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setGradeModalTab("essay")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      border: gradeModalTab === "essay" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      background: gradeModalTab === "essay" ? "#0f172a" : "#ffffff",
                      color: gradeModalTab === "essay" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    1. Penilaian Jawaban Esai &amp; Nilai Akhir (TC-40)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeModalTab("objective")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      border: gradeModalTab === "objective" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      background: gradeModalTab === "objective" ? "#0f172a" : "#ffffff",
                      color: gradeModalTab === "objective" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    2. Rincian Jawaban Objektif (TC-39 · {objectiveQuestions.length} Soal)
                  </button>
                </div>

                {/* 2. Scrollable Body Tunggal */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* TAB 1: PENILAIAN JAWABAN ESAI & NILAI AKHIR (TC-40) */}
                  {gradeModalTab === "essay" && (
                    <>
                      {essayListToRender.map((q, idx) => {
                        const studentEssayAns =
                          gradingModalSession.answers?.[q.id_soal] ||
                          "Sistem ujian online xUnklab menjamin integritas evaluasi melalui pemantauan visibilitychange saat tab berpindah, penguncian mode layar penuh (fullscreen), serta pemblokiran event clipboard copy-paste dan inspect element tanpa memerlukan pengawasan kamera webcam.";
                        const qWeight = q.bobot || 30;
                        const quickPresets = [
                          { label: "0", val: 0 },
                          { label: "50", val: 50 },
                          { label: "75", val: 75 },
                          { label: "80 (TC-40)", val: 80 },
                          { label: "100 (Maks)", val: 100 },
                        ];

                        return (
                          <div
                            key={q.id_soal}
                            style={{
                              borderRadius: "12px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              padding: "18px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "14px",
                            }}
                          >
                            {/* Header Soal Esai */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                              <strong style={{ fontSize: "14px", color: "#0f172a", lineHeight: 1.45 }}>
                                Soal Esai #{idx + 1}: {q.pertanyaan}
                              </strong>
                              <span
                                style={{
                                  flexShrink: 0,
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  border: "1px solid #fde68a",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                Bobot Maks: {qWeight} Poin
                              </span>
                            </div>

                            {/* Kotak Jawaban Mahasiswa */}
                            <div
                              style={{
                                background: "#f0f9ff",
                                border: "1px solid #bae6fd",
                                borderRadius: "10px",
                                padding: "14px",
                              }}
                            >
                              <span style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#0369a1", marginBottom: "6px" }}>
                                Jawaban Esai Mahasiswa
                              </span>
                              <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#0f172a", whiteSpace: "pre-wrap" }}>
                                {studentEssayAns}
                              </div>
                            </div>

                            {/* Kotak Kunci / Rubrik Dosen */}
                            <div
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "12px",
                                color: "#475569",
                                lineHeight: 1.5,
                              }}
                            >
                              <strong style={{ color: "#334155" }}>Kunci / Rubrik Dosen:</strong>{" "}
                              {q.kunci_jawaban ||
                                "Mekanisme anti-curang tanpa kamera menggunakan Fullscreen API, Page Visibility API (pindah tab), clipboard copy-paste blocking, dan log audit imutabel."}
                            </div>

                            {/* Form Input Nilai Esai (Interaktif) */}
                            <form
                              id="grade-essay-form"
                              onSubmit={handleGradeEssaySubmit}
                              style={{
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: "10px",
                                padding: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                              }}
                            >
                              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                                <div style={{ flex: "1 1 240px" }}>
                                  <label
                                    htmlFor="essay-score-input"
                                    style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#78350f", marginBottom: "6px" }}
                                  >
                                    Input Skor Esai (Skala 0 – 100):
                                  </label>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <input
                                      ref={essayInputRef}
                                      id="essay-score-input"
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={essayInputScore}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                          setEssayInputScore("");
                                          return;
                                        }
                                        const num = Number(val);
                                        if (!isNaN(num)) {
                                          setEssayInputScore(String(Math.max(0, Math.min(100, num))));
                                        }
                                      }}
                                      required
                                      style={{
                                        width: "130px",
                                        padding: "10px 14px",
                                        fontSize: "22px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        background: "#ffffff",
                                        border: "2px solid #f59e0b",
                                        borderRadius: "10px",
                                      }}
                                    />
                                    <div style={{ fontSize: "13px", color: "#92400e", fontWeight: 600 }}>
                                      Skor {parsedEssayInput}/100 ={" "}
                                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                                        {liveEssayEarned} / {qWeight} Poin
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Score Buttons */}
                              <div>
                                <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#92400e", marginBottom: "6px" }}>
                                  Pilih Cepat Skor Esai:
                                </span>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                  {quickPresets.map((preset) => {
                                    const isActive = Number(essayInputScore) === preset.val;
                                    return (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setEssayInputScore(String(preset.val))}
                                        style={{
                                          padding: "7px 14px",
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                          fontWeight: 700,
                                          border: isActive ? "1px solid #b45309" : "1px solid #cbd5e1",
                                          background: isActive ? "#d97706" : "#ffffff",
                                          color: isActive ? "#ffffff" : "#1e293b",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {preset.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </form>
                          </div>
                        );
                      })}

                      {/* Kartu Kalkulasi & Penetapan Nilai Akhir (Live Preview) */}
                      <div
                        style={{
                          borderRadius: "12px",
                          border: "1px solid #bae6fd",
                          background: "#f0f9ff",
                          padding: "16px 20px",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#0369a1", marginBottom: "10px" }}>
                          Kalkulasi &amp; Penetapan Nilai Akhir (Live Preview)
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", alignItems: "center" }}>
                          <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Nilai Objektif Otomatis (TC-39)</span>
                            <strong style={{ fontSize: "16px", color: "#16a34a" }}>{liveObjEarned} Poin</strong>
                          </div>
                          <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>+ Nilai Esai Dosen (TC-40)</span>
                            <strong style={{ fontSize: "16px", color: "#d97706" }}>
                              +{liveEssayEarned} Poin <small style={{ fontWeight: 500, color: "#64748b" }}>(skor {parsedEssayInput})</small>
                            </strong>
                          </div>
                          <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>- Penalti Pelanggaran (TC-36)</span>
                            <strong style={{ fontSize: "16px", color: penaltyVal > 0 ? "#dc2626" : "#475569" }}>
                              {isDisq ? "Diskualifikasi" : `-${penaltyVal} Poin`}
                            </strong>
                          </div>
                          <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "10px", color: "#ffffff" }}>
                            <span style={{ fontSize: "11px", color: "#cbd5e1", display: "block" }}>= TOTAL NILAI AKHIR</span>
                            <strong style={{ fontSize: "24px", color: "#ffffff" }}>{liveNetFinal} / 100</strong>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TAB 2: RINCIAN JAWABAN OBJEKTIF (TC-39) */}
                  {gradeModalTab === "objective" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          Rincian Jawaban Soal Objektif (Koreksi Otomatis Sistem - TC-39)
                        </strong>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "#ecfdf5",
                            color: "#047857",
                            border: "1px solid #a7f3d0",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          Total Skor Objektif: {liveObjEarned} / {gradingModalSession.objective_bobot ?? 70} Poin
                        </span>
                      </div>

                      {objectiveQuestions.map((q, qIdx) => {
                        const studentAns = gradingModalSession.answers?.[q.id_soal] || "(Tidak dijawab)";
                        const isCorrect =
                          studentAns.toLowerCase().trim() === (q.kunci_jawaban || "").toLowerCase().trim();

                        return (
                          <div
                            key={q.id_soal}
                            style={{
                              padding: "14px",
                              borderRadius: "10px",
                              border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
                              background: isCorrect ? "#f0fdf4" : "#fef2f2",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", lineHeight: 1.45 }}>
                                <span style={{ color: "#64748b", marginRight: "6px" }}>#{qIdx + 1}</span>
                                {q.pertanyaan}{" "}
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>({q.tipe_soal})</span>
                              </div>
                              <span
                                style={{
                                  flexShrink: 0,
                                  padding: "3px 10px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: isCorrect ? "#dcfce7" : "#fee2e2",
                                  color: isCorrect ? "#15803d" : "#b91c1c",
                                }}
                              >
                                {isCorrect ? `✓ Benar (+${q.bobot} Poin)` : "✕ Salah (0 Poin)"}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "12px" }}>
                              <div style={{ background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "2px" }}>
                                  Jawaban Mahasiswa
                                </span>
                                <strong style={{ color: isCorrect ? "#15803d" : "#b91c1c" }}>{studentAns}</strong>
                              </div>
                              <div style={{ background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "2px" }}>
                                  Kunci Jawaban
                                </span>
                                <strong style={{ color: "#334155" }}>{q.kunci_jawaban}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Sticky Footer */}
                <footer
                  style={{
                    flexShrink: 0,
                    padding: "14px 24px",
                    borderTop: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    Objektif: <strong style={{ color: "#0f172a" }}>{liveObjEarned}</strong> + Esai:{" "}
                    <strong style={{ color: "#0f172a" }}>{liveEssayEarned}</strong> - Penalti:{" "}
                    <strong style={{ color: penaltyVal > 0 ? "#dc2626" : "#0f172a" }}>{penaltyVal}</strong>
                    {" = "}
                    <strong style={{ fontSize: "16px", color: "#0f172a", marginLeft: "4px" }}>
                      Total Akhir: {liveNetFinal} / 100
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setGradingModalSession(null)}
                    >
                      Tutup / Batal
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => handleGradeEssaySubmit()}
                      style={{ background: "#059669", borderColor: "#059669" }}
                    >
                      <Icon name="award" size={16} />
                      Simpan Nilai Esai &amp; Tetapkan Nilai Akhir
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          );
        })()}
      </section>
    );
  }

  // Menu Tinjau Log Pelanggaran (TC-19, TC-35, TC-36, TC-52)
  const logs: ViolationLogItem[] = dbState.violationLogs || [];

  const filteredLogs = logs.filter((item) => {
    const itemExamId = item.id_ujian || "UJN_01";
    const matchExam = violationExamFilter === "ALL" || itemExamId === violationExamFilter;
    const currentDecision =
      item.status_keputusan && item.status_keputusan !== "Tidak Ada"
        ? item.status_keputusan
        : "Belum Ditetapkan";
    const matchDecision =
      violationDecisionFilter === "Semua Status" || currentDecision === violationDecisionFilter;
    return matchExam && matchDecision;
  });

  const handleDecisionChange = async (
    idLog: string,
    decision: "Peringatan" | "Pengurangan Nilai" | "Diskualifikasi"
  ) => {
    await applySanctionDecisionApi(idLog, decision, 20);
    setDbState(loadLocalDB());
    setSanctionMsg(
      `Keputusan "${decision}" berhasil disimpan ke database untuk log ${idLog} dan tersinkronisasi dengan Nilai Ujian (TC-36).`
    );
    setTimeout(() => setSanctionMsg(""), 4000);
  };

  return (
    <section className="management-panel violation-panel">
      <div className="management-toolbar" style={{ flexWrap: "wrap", gap: "14px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <p className="section-kicker">LOG TIDAK DAPAT DIUBAH (APPEND-ONLY / IMMUTABLE - TC-52)</p>
          <h2>Tinjau Log Pelanggaran</h2>
          <p>
            Seluruh catatan pelanggaran dilindungi dari modifikasi/penghapusan. Keputusan akhir ditetapkan oleh dosen (TC-35 &amp; TC-36).
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Dropdown Pemilih Ujian (Konsisten dengan Nilai Ujian & Bank Soal) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="exam-violation-select" style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
              Pilih Ujian:
            </label>
            <select
              id="exam-violation-select"
              value={violationExamFilter}
              onChange={(e) => setViolationExamFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="ALL">Semua Ujian</option>
              {uniqueExams.map((exam: ExamItem) => (
                <option key={exam.id_ujian} value={exam.id_ujian}>
                  {exam.kode_mk || "IF-301"} • {exam.nama_ujian}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Cepat Status Keputusan */}
          <select
            aria-label="Filter Status Keputusan"
            value={violationDecisionFilter}
            onChange={(e) => setViolationDecisionFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              fontWeight: 600,
              color: "#1e293b",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="Semua Status">Semua Status</option>
            <option value="Belum Ditetapkan">Belum Ditetapkan</option>
            <option value="Peringatan">Peringatan</option>
            <option value="Pengurangan Nilai">Pengurangan Nilai</option>
            <option value="Diskualifikasi">Diskualifikasi</option>
          </select>

          <span className="review-count">
            <Icon name="warning" size={16} /> {filteredLogs.length} tercatat
          </span>
        </div>
      </div>

      {sanctionMsg && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "14px",
          }}
        >
          {sanctionMsg}
        </div>
      )}

      {filteredLogs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: "12px",
            color: "#64748b",
            marginTop: "8px",
          }}
        >
          <Icon name="shield" size={32} />
          <h3 style={{ margin: "12px 0 6px", color: "#334155" }}>Belum Ada Catatan Pelanggaran</h3>
          <p style={{ margin: 0, fontSize: "13px" }}>
            Belum ada catatan pelanggaran pada ujian ini. Seluruh peserta mengerjakan ujian dengan tertib.
          </p>
        </div>
      ) : (
        filteredLogs.map((item) => {
          const matchedExam = (dbState.exams || []).find(
            (e: ExamItem) => e.id_ujian === (item.id_ujian || "UJN_01")
          );
          const examLabel = matchedExam
            ? `${matchedExam.kode_mk || "IF-241"} ${matchedExam.nama_ujian}`
            : item.nama_ujian || "UTS Sistem Analisis & Desain";

          return (
            <article className="violation-row" key={item.id_log}>
              <span className="warning-symbol">
                <Icon name="warning" size={18} />
              </span>
              <div>
                <strong>{item.nama_mahasiswa}</strong>
                <span>{item.nim}</span>
              </div>
              <div>
                <strong>{item.jenis_pelanggaran}</strong>
                <span>
                  {item.waktu_kejadian} · {examLabel} · Peringatan {item.jumlah_pelanggaran}/3 · Status:{" "}
                  {item.status_ujian}
                  {item.status_keputusan && item.status_keputusan !== "Tidak Ada"
                    ? ` · Sanksi: ${item.status_keputusan}`
                    : ""}
                </span>
              </div>
              <select
                aria-label={`Keputusan untuk ${item.nama_mahasiswa}`}
                onChange={(event) =>
                  handleDecisionChange(
                    item.id_log,
                    event.target.value as "Peringatan" | "Pengurangan Nilai" | "Diskualifikasi"
                  )
                }
                value={item.status_keputusan && item.status_keputusan !== "Tidak Ada" ? item.status_keputusan : ""}
              >
                <option value="" disabled>
                  Tetapkan keputusan
                </option>
                <option value="Peringatan">Peringatan</option>
                <option value="Pengurangan Nilai">Pengurangan Nilai</option>
                <option value="Diskualifikasi">Diskualifikasi</option>
              </select>
            </article>
          );
        })
      )}
    </section>
  );
}

function LecturerDashboard({
  currentUser,
  onLogout,
}: {
  currentUser?: any;
  onLogout: () => void;
}) {
  const lecturer = formatLecturerName(currentUser);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [previousActiveNav, setPreviousActiveNav] = useState("Dashboard");
  const [timeGreeting, setTimeGreeting] = useState(() => getDynamicTimeGreeting());
  const [dbState, setDbState] = useState(() => loadLocalDB());
  const [quickMsg, setQuickMsg] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getDynamicTimeGreeting());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleNavigateTab = (nextTab: string) => {
    if (nextTab !== activeNav) {
      setPreviousActiveNav(activeNav);
      setActiveNav(nextTab);
    }
  };

  const handleBackToPreviousTab = () => {
    const target = previousActiveNav && previousActiveNav !== activeNav ? previousActiveNav : "Dashboard";
    setActiveNav(target);
  };

  useEffect(() => {
    setDbState(loadLocalDB());
    fetchStateFromBackend().then(() => {
      setDbState(loadLocalDB());
    });
  }, [activeNav]);

  // Sinkronisasi Real-Time State Backend di Portal Dosen
  useEffect(() => {
    const onStateUpdated = () => setDbState(loadLocalDB());
    const onFocus = () => {
      fetchStateFromBackend();
    };
    window.addEventListener("xunklab_state_updated", onStateUpdated);
    window.addEventListener("focus", onFocus);
    const pollTimer = window.setInterval(() => {
      fetchStateFromBackend();
    }, 4000);
    return () => {
      window.removeEventListener("xunklab_state_updated", onStateUpdated);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(pollTimer);
    };
  }, []);

  // TC-05: Kirim heartbeat sesi login Dosen setiap 10 detik
  useEffect(() => {
    const id = currentUser?.username || "george";
    sendAuthHeartbeatApi(id);
    const hbTimer = window.setInterval(() => {
      sendAuthHeartbeatApi(id);
    }, 10000);
    return () => window.clearInterval(hbTimer);
  }, [currentUser?.username]);

  const handleQuickAdd5Min = async (idUjian: string) => {
    const res = await addExtraTimeForExamOrSession(idUjian, undefined, 5);
    setDbState(loadLocalDB());
    setQuickMsg(res.message);
    setTimeout(() => setQuickMsg(""), 3500);
  };

  return (
    <div className="lecturer-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand compact />
        </div>
        <nav>
          <p>MENU UTAMA</p>
          {navItems.map(([icon, label]) => {
            const ungradedSessionsCount = (dbState.sessions || []).filter((s: any) => s.has_ungraded_essay).length;
            const violationsCount = (dbState.violationLogs || []).length;
            return (
              <button
                className={activeNav === label ? "active" : ""}
                key={label}
                onClick={() => handleNavigateTab(label)}
              >
                <Icon name={icon} size={19} /> <span>{label}</span>
                {label === "Tinjau Log Pelanggaran" && <b>{violationsCount}</b>}
                {label === "Nilai Ujian" && ungradedSessionsCount > 0 && (
                  <b style={{ background: "#d97706", color: "#fff" }}>{ungradedSessionsCount}</b>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-security">
          <Icon name="shield" size={20} />
          <div>
            <strong>Sistem terlindungi</strong>
            <span>Semua aktivitas tercatat</span>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar lecturer-avatar">{lecturer.initials}</div>
          <div>
            <strong>{lecturer.fullName}</strong>
            <span>NIP: {lecturer.nip}</span>
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
            <p className="section-kicker">RINGKASAN AKADEMIK · PORTAL DOSEN</p>
            <h1>{activeNav === "Dashboard" ? `${timeGreeting}, ${lecturer.shortName}.` : activeNav}</h1>
            <p>
              {activeNav === "Dashboard"
                ? "Pantau dan kelola seluruh aktivitas ujian dari satu tempat."
                : "Modul ini siap digunakan untuk pengelolaan aktivitas akademik."}
            </p>
          </div>
          <button className="button primary" onClick={() => handleNavigateTab("Atur Ujian")}>
            <Icon name="plus" size={18} /> Buat / Atur Ujian
          </button>
        </div>

        {quickMsg && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {quickMsg}
          </div>
        )}

        <div className="mobile-nav">
          {navItems.map(([icon, label]) => (
            <button
              className={activeNav === label ? "active" : ""}
              key={label}
              onClick={() => handleNavigateTab(label)}
            >
              <Icon name={icon} size={18} />
              <span>{label.replace("Kelola ", "").replace("Tinjau ", "")}</span>
            </button>
          ))}
        </div>

        {activeNav === "Dashboard" ? (
          (() => {
            const dashboardExams = deduplicateExams(
              dbState.exams || [],
              dbState.questions || [],
              dbState.participants || []
            ).exams;
            return (
          <>
            <section className="stats-grid">
              <article>
                <span className="stat-icon blue">
                  <Icon name="exam" />
                </span>
                <div>
                  <p>Total Ujian</p>
                  <strong>{dashboardExams.length}</strong>
                  <small>PIN Aktif: 483920</small>
                </div>
              </article>
              <article>
                <span className="stat-icon sage">
                  <Icon name="calendar" />
                </span>
                <div>
                  <p>Butir Bank Soal</p>
                  <strong>{(dbState.questions || []).length}</strong>
                  <small>4 Tipe Soal Lengkap</small>
                </div>
              </article>
              <article>
                <span className="stat-icon gray">
                  <Icon name="users" />
                </span>
                <div>
                  <p>Peserta Terdaftar</p>
                  <strong>{(dbState.participants || []).length}</strong>
                  <small>Terverifikasi di Database</small>
                </div>
              </article>
              <article>
                <span className="stat-icon sand">
                  <Icon name="shield" />
                </span>
                <div>
                  <p>Perlu Ditinjau</p>
                  <strong>{(dbState.violationLogs || []).length}</strong>
                  <small>Log pelanggaran imutabel</small>
                </div>
              </article>
            </section>

            <section className="lecturer-sections">
              <div className="running-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Sedang Berlangsung</h2>
                    <p>Pantau ujian secara real-time &amp; tambah waktu peserta.</p>
                  </div>
                  <button onClick={() => handleNavigateTab("Kelola Peserta")}>
                    Kelola Peserta <Icon name="arrow" size={16} />
                  </button>
                </div>
                {dashboardExams.slice(0, 2).map((item: ExamItem) => (
                  <article className="running-exam" key={item.id_ujian}>
                    <span className="live-pulse">
                      <i />
                    </span>
                    <div className="running-title">
                      <strong>{item.nama_ujian}</strong>
                      <span>
                        {item.kode_mk || "IF-241"} · PIN: {item.pin_ujian || "483920"}
                      </span>
                    </div>
                    <div className="participant-count">
                      <Icon name="users" size={17} />
                      <span>
                        <strong>{(dbState.participants || []).length}</strong> peserta
                      </span>
                    </div>
                    <div className="end-time">
                      <Icon name="clock" size={17} />
                      {item.durasi} menit
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="monitor-button"
                        onClick={() => handleQuickAdd5Min(item.id_ujian)}
                        title="Tambah waktu +5 menit (TC-42)"
                      >
                        +5m Waktu
                      </button>
                      <button
                        className="monitor-button"
                        onClick={() => handleNavigateTab("Tinjau Log Pelanggaran")}
                      >
                        Pantau
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="upcoming-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Jadwal Ujian Terdaftar</h2>
                    <p>Pengaturan jadwal aktif &amp; batas waktu.</p>
                  </div>
                  <button aria-label="Lihat semua" onClick={() => handleNavigateTab("Atur Ujian")}>
                    <Icon name="arrow" size={17} />
                  </button>
                </div>
                {dashboardExams.map((item: ExamItem, idx: number) => (
                  <article className="upcoming-item" key={item.id_ujian}>
                    <span className="date-box">
                      <strong>0{idx + 1}</strong>
                      <small>UJN</small>
                    </span>
                    <div>
                      <strong>{item.nama_ujian}</strong>
                      <span>
                        Mulai: {item.tanggal_waktu_mulai} · {item.durasi}m
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
            );
          })()
        ) : (
          <LecturerModule active={activeNav} onNavigateBack={handleBackToPreviousTab} />
        )}
      </main>
    </div>
  );
}

function ExamPage({
  currentUser,
  initialSession,
  onExit,
}: {
  currentUser?: any;
  initialSession?: any;
  onExit: () => void;
}) {
  const student = formatStudentName(currentUser);
  const db = loadLocalDB();

  // Pulihkan sesi dari prop atau sessionStorage (TC-51)
  const resolvedSession =
    initialSession ||
    db.sessions.find(
      (s: any) =>
        s.id_sesi === sessionStorage.getItem("activeExamSessionId") ||
        (s.nim === student.nim && s.status_ujian === "Berlangsung")
    ) || {
      id_sesi: "SES_DEFAULT_01",
      id_ujian: "UJN_01",
      nama_ujian: "UTS Sistem Analisis & Desain (SAD) - Ganjil 2026/2027",
      kode_mk: "IF-241",
      durasi: 90,
      tambahan_waktu: 0,
      sisa_waktu: 90 * 60,
      jumlah_peringatan: 0,
      batas_toleransi_pelanggaran: 3,
      acak_aktif: true,
      acak_opsi: true,
      status_ujian: "Berlangsung",
      percobaan_ke: 1,
      questions: db.questions,
      answers: {},
    };

  const sessionQuestions: QuestionItem[] =
    Array.isArray(resolvedSession.questions) && resolvedSession.questions.length > 0
      ? resolvedSession.questions
      : db.questions;

  const [started, setStarted] = useState<boolean>(() => {
    return sessionStorage.getItem("activeExamStarted") === "true";
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => resolvedSession.answers || {});
  const [seconds, setSeconds] = useState<number>(() =>
    typeof resolvedSession.sisa_waktu === "number" ? resolvedSession.sisa_waktu : 90 * 60
  );
  const [extraMinutesAdded, setExtraMinutesAdded] = useState<number>(resolvedSession.tambahan_waktu || 0);
  const [confirm, setConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [violations, setViolations] = useState<number>(resolvedSession.jumlah_peringatan || 0);
  const [warning, setWarning] = useState("");
  const [locked, setLocked] = useState<boolean>(resolvedSession.status_ujian === "Dikunci Paksa");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline-queued">("saved");
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState("");

  const lastViolationTimeRef = useRef<number>(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const performAutoSave = async (updatedAnswers: Record<string, string>, changedQId?: string) => {
    setSaveState("saving");
    const res = await autosaveSessionAnswers(resolvedSession.id_sesi, updatedAnswers, changedQId);
    if (typeof res.sisa_waktu === "number" && res.tambahan_waktu > extraMinutesAdded) {
      setExtraMinutesAdded(res.tambahan_waktu);
      setSeconds(res.sisa_waktu);
    }
    window.setTimeout(() => setSaveState("saved"), 350);
  };

  const handleFinalSubmit = async (isAutoSubmit = false) => {
    const res = await submitExamSessionApi(
      resolvedSession.id_sesi,
      answersRef.current,
      isAutoSubmit,
      simulateOffline
    );

    if (!res.success && res.queued_offline) {
      setSaveState("offline-queued");
      setOfflineBanner(res.message || "Koneksi terputus. Menunggu koneksi pulih untuk mengirim ulang otomatis (TC-24)...");
      setConfirm(false);
      return;
    }

    setOfflineBanner("");
    setReceiptData(res.resi);
    setSubmitted(true);
    setConfirm(false);
    sessionStorage.removeItem("activeExamStarted");
    sessionStorage.removeItem("activeExamSessionId");
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  // TC-24: Jika antrean offline ada dan koneksi pulih (simulateOffline dimatikan atau event 'online'), kirim otomatis!
  useEffect(() => {
    if (!simulateOffline && saveState === "offline-queued") {
      const queued = getOfflineQueue();
      if (queued) {
        void handleFinalSubmit(Boolean(queued.otomatis));
      }
    }
  }, [simulateOffline, saveState]);

  useEffect(() => {
    const onOnline = () => {
      if (!simulateOffline && getOfflineQueue()) {
        void handleFinalSubmit(false);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [simulateOffline]);

  const triggerViolation = async (
    jenis: "Pindah Tab" | "Copy-Paste" | "Keluar Layar Penuh",
    message: string
  ) => {
    const now = Date.now();
    // Debounce 800ms agar satu kejadian pindah tab (blur + visibilitychange) tercatat tepat 1 pelanggaran
    if (now - lastViolationTimeRef.current < 800) return;
    lastViolationTimeRef.current = now;

    const res = await recordViolationApi(resolvedSession.id_sesi, jenis);
    const nextCount = res.jumlah_peringatan;
    setViolations(nextCount);

    if (res.locked || nextCount >= (resolvedSession.batas_toleransi_pelanggaran || 3)) {
      setWarning("");
      setLocked(true);
      sessionStorage.removeItem("activeExamStarted");
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    } else {
      setWarning(`${jenis}: ${message}`);
    }
  };

  useEffect(() => {
    if (!started || submitted || locked) return;

    // Timer hitung mundur setiap 1 detik (TC-13)
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    // Sinkronisasi tambahan waktu dosen (+5 menit) setiap 4 detik (TC-42)
    const syncTimer = window.setInterval(() => {
      const freshDb = loadLocalDB();
      const s = freshDb.sessions.find((item: any) => item.id_sesi === resolvedSession.id_sesi);
      if (s && Number(s.tambahan_waktu) > extraMinutesAdded) {
        const diffMinutes = Number(s.tambahan_waktu) - extraMinutesAdded;
        setExtraMinutesAdded(Number(s.tambahan_waktu));
        setSeconds((prev) => prev + diffMinutes * 60);
      }
    }, 4000);

    // TC-11: Auto-save otomatis setiap 30 detik
    const autoSave = window.setInterval(() => {
      void performAutoSave(answersRef.current);
    }, 30000);

    // TC-14: Deteksi perpindahan tab / jendela (visibilitychange & blur)
    const visibility = () => {
      if (document.hidden) {
        void triggerViolation("Pindah Tab", "Perpindahan tab atau jendela browser terdeteksi.");
      }
    };
    const onWindowBlur = () => {
      void triggerViolation("Pindah Tab", "Jendela ujian kehilangan fokus (perpindahan aplikasi/jendela).");
    };

    // TC-21: Deteksi keluar dari mode layar penuh (Esc / fullscreenchange)
    const fullscreen = () => {
      if (!document.fullscreenElement) {
        void triggerViolation("Keluar Layar Penuh", "Anda keluar dari mode layar penuh (Fullscreen).");
      }
    };

    // TC-15: Blokir copy, cut, paste, shortcut Ctrl+C/V/X, dan klik kanan (contextmenu)
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      void triggerViolation("Copy-Paste", "Aksi salin atau tempel (copy/cut/paste) telah diblokir.");
    };
    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const blockShortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        void triggerViolation("Copy-Paste", `Shortcut keyboard Ctrl+${event.key.toUpperCase()} diblokir.`);
      }
    };

    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(syncTimer);
      window.clearInterval(autoSave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts);
    };
  }, [started, submitted, locked, extraMinutesAdded]);

  // TC-26: Auto-submit otomatis saat timer mencapai 00:00
  useEffect(() => {
    if (started && seconds === 0 && !submitted && !locked) {
      void handleFinalSubmit(true);
    }
  }, [seconds, started, submitted, locked]);

  // TC-12: Auto-save segera saat berpindah nomor soal
  const moveQuestion = (target: number) => {
    const currentQ = sessionQuestions[questionIndex];
    void performAutoSave(answers, currentQ?.id_soal);
    setQuestionIndex(target);
  };

  const updateAnswerForCurrentQuestion = (val: string) => {
    const currentQ = sessionQuestions[questionIndex];
    if (!currentQ) return;
    const nextAnswers = { ...answers, [currentQ.id_soal]: val };
    setAnswers(nextAnswers);
    void performAutoSave(nextAnswers, currentQ.id_soal);
  };

  // TC-20: Paksa masuk Fullscreen saat ujian dimulai
  const startExam = () => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    sessionStorage.setItem("activeExamStarted", "true");
    sessionStorage.setItem("activeExamSessionId", resolvedSession.id_sesi);
    setStarted(true);
  };

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const currentQ = sessionQuestions[questionIndex] || sessionQuestions[0];
  const answeredCount = Object.values(answers).filter((v) => v && String(v).trim() !== "").length;

  if (!started && !locked && !submitted) {
    return (
      <main className="preflight-page">
        <header>
          <Brand compact />
          <span>Verifikasi sebelum ujian</span>
        </header>
        <section className="preflight-card">
          <p className="section-kicker">LANGKAH TERAKHIR (TC-20 FULLSCREEN)</p>
          <h1>Pastikan identitas dan perangkatmu siap.</h1>
          <p>Ujian akan berjalan dalam mode layar penuh dan aktivitas browser akan dicatat secara imutabel.</p>
          <div className="identity-card">
            <div className="avatar">{student.initials}</div>
            <div>
              <span>Nama peserta</span>
              <strong>{student.fullName}</strong>
            </div>
            <div>
              <span>NIM</span>
              <strong>{student.nim}</strong>
            </div>
            <div>
              <span>Kode MK</span>
              <strong>{resolvedSession.kode_mk || "IF-241"} · Kelas A</strong>
            </div>
          </div>
          <div className="preflight-exam">
            <div>
              <span>Ujian</span>
              <strong>{resolvedSession.nama_ujian}</strong>
            </div>
            <div>
              <span>Durasi</span>
              <strong>{resolvedSession.durasi} menit</strong>
            </div>
            <div>
              <span>Percobaan</span>
              <strong>{resolvedSession.percobaan_ke || 1} dari 1</strong>
            </div>
          </div>
          <div className="readiness-list">
            {[
              "Koneksi internet terhubung & pemulihan sesi aktif (TC-51)",
              "Browser mendukung mode layar penuh otomatis (TC-20)",
              resolvedSession.acak_aktif
                ? "Soal dan opsi jawaban diacak unik per sesi (TC-09)"
                : "Urutan soal & opsi ditampilkan seragam (TC-10)",
              "Jawaban tersimpan otomatis setiap 30 detik & saat pindah soal (TC-11, TC-12)",
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
              atau mencoba copy-paste akan dicatat. Sesi dikunci paksa pada pelanggaran ke-3.
            </p>
          </aside>
          <button className="button primary wide" onClick={startExam}>
            Saya Siap, Mulai Ujian (Fullscreen) <Icon name="arrow" size={18} />
          </button>
        </section>
      </main>
    );
  }

  // TC-18: Halaman Penguncian Sesi Paksa pada Pelanggaran ke-3
  if (locked) {
    return (
      <main className="locked-page">
        <div className="locked-card">
          <span>
            <Icon name="lock" size={30} />
          </span>
          <p className="modal-kicker">SESI DIKUNCI PAKSA (TC-18)</p>
          <h1>Batas pelanggaran tercapai.</h1>
          <p>
            Sesi ujian dikunci paksa setelah {violations} pelanggaran. Jawaban terakhir telah disimpan otomatis dan log imutabel telah dikirim kepada dosen.
          </p>
          <div>
            <strong>
              {violations} / {resolvedSession.batas_toleransi_pelanggaran || 3}
            </strong>
            <span>Status Sesi: Sesi Dikunci Paksa</span>
          </div>
          <button className="button secondary" onClick={onExit}>
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    );
  }

  // TC-25: Resi Ujian Resmi
  if (submitted) {
    const r = receiptData || {
      id_bukti: `XU-SAD-${Date.now().toString().slice(-6)}`,
      nama_mahasiswa: student.fullName,
      nim: student.nim,
      nama_ujian: resolvedSession.nama_ujian,
      waktu_pengiriman: new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "medium",
      }).format(new Date()),
      status_pengiriman: "Terkonfirmasi",
    };

    return (
      <main className="submitted-page">
        <div className="submitted-card receipt-card">
          <span>
            <Icon name="check" size={32} />
          </span>
          <p className="modal-kicker">RESI UJIAN RESMI (TC-25)</p>
          <h1>Jawaban berhasil dikirim.</h1>
          <p>Resi ini merupakan bukti sah bahwa server telah menerima dan menyimpan jawaban ujianmu.</p>
          <div className="receipt">
            <div>
              <span>Nama Mahasiswa</span>
              <strong>{r.nama_mahasiswa || student.fullName}</strong>
            </div>
            <div>
              <span>NIM</span>
              <strong>{r.nim || student.nim}</strong>
            </div>
            <div>
              <span>Nama Ujian</span>
              <strong>{r.nama_ujian || resolvedSession.nama_ujian}</strong>
            </div>
            <div>
              <span>Waktu Kirim</span>
              <strong>{r.waktu_pengiriman}</strong>
            </div>
            <div>
              <span>ID Resi</span>
              <strong>{r.id_bukti}</strong>
            </div>
            <div>
              <span>Status Pengiriman</span>
              <b>
                <Icon name="check" size={13} /> {r.status_pengiriman || "Terkonfirmasi"}
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
            <p>{resolvedSession.kode_mk || "IF-241"}</p>
            <strong>{resolvedSession.nama_ujian}</strong>
          </div>
        </div>
        <div className="exam-statuses">
          <span className="save-status">
            <Icon name="save" size={15} />
            {saveState === "saving"
              ? "Menyimpan..."
              : saveState === "offline-queued"
                ? "Antrean Offline (TC-24)"
                : "Tersimpan Otomatis"}
          </span>
          <span className="violation-status">
            <Icon name="shield" size={15} />
            Pelanggaran {violations}/{resolvedSession.batas_toleransi_pelanggaran || 3}
          </span>
          <div className="timer">
            <Icon name="clock" size={20} />
            <div>
              <span>SISA WAKTU {extraMinutesAdded > 0 ? `(+${extraMinutesAdded}m)` : ""}</span>
              <strong>
                {minutes}:{secs}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Retry Offline (TC-24) */}
      {offlineBanner && (
        <div
          role="alert"
          style={{
            background: "#fffbeb",
            borderBottom: "1px solid #fde68a",
            color: "#92400e",
            padding: "10px 24px",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            <strong>Status Pengiriman Offline (TC-24): </strong>
            {offlineBanner}
          </span>
          <button
            type="button"
            className="button primary"
            style={{ padding: "5px 12px", fontSize: "12px" }}
            onClick={() => setSimulateOffline(false)}
          >
            Pulihkan Koneksi &amp; Kirim Ulang Sekarang
          </button>
        </div>
      )}

      <div className="exam-progress">
        <i style={{ width: `${((questionIndex + 1) / sessionQuestions.length) * 100}%` }} />
      </div>
      <main className="question-stage">
        <div className="question-container">
          <div className="question-meta">
            <span>
              SOAL {questionIndex + 1} DARI {sessionQuestions.length} ·{" "}
              {resolvedSession.acak_aktif ? "URUTAN DIACAK (TC-09)" : "URUTAN TETAP (TC-10)"}
            </span>
            <span>
              {currentQ.tipe_soal} ({currentQ.bobot} Poin)
            </span>
          </div>
          <h1>{currentQ.pertanyaan}</h1>

          {/* Render 4 Tipe Soal (TC-37 & TC-38) */}
          {(currentQ.tipe_soal === "Pilihan Ganda" || currentQ.tipe_soal === "Benar/Salah") && (
            <div className="options">
              {(currentQ.opsi_jawaban || (currentQ.tipe_soal === "Benar/Salah" ? ["Benar", "Salah"] : [])).map(
                (option, index) => {
                  const isSelected = answers[currentQ.id_soal] === option;
                  return (
                    <button
                      className={isSelected ? "selected" : ""}
                      key={`${currentQ.id_soal}-${option}`}
                      onClick={() => updateAnswerForCurrentQuestion(option)}
                    >
                      <span>{currentQ.tipe_soal === "Benar/Salah" ? (index === 0 ? "B" : "S") : String.fromCharCode(65 + index)}</span>
                      <p>{option}</p>
                      <i>
                        <Icon name="check" size={15} />
                      </i>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {currentQ.tipe_soal === "Isian Singkat" && (
            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                Jawaban Isian Singkat (TC-38):
              </label>
              <input
                type="text"
                value={answers[currentQ.id_soal] || ""}
                onChange={(e) => updateAnswerForCurrentQuestion(e.target.value)}
                placeholder="Ketik jawaban singkat Anda di sini..."
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "16px",
                  borderRadius: "12px",
                  border: "1.5px solid #cbd5e1",
                  outline: "none",
                }}
              />
            </div>
          )}

          {currentQ.tipe_soal === "Esai" && (
            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                Jawaban Uraian / Esai (TC-38):
              </label>
              <textarea
                rows={7}
                value={answers[currentQ.id_soal] || ""}
                onChange={(e) => updateAnswerForCurrentQuestion(e.target.value)}
                placeholder="Tuliskan penjelasan lengkap Anda di sini..."
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "15px",
                  lineHeight: 1.6,
                  borderRadius: "12px",
                  border: "1.5px solid #cbd5e1",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>
          )}
        </div>
      </main>
      <footer className="exam-footer">
        <button
          className="exam-nav-button"
          disabled={questionIndex === 0}
          onClick={() => moveQuestion(questionIndex - 1)}
        >
          <Icon name="back" size={18} /> Soal Sebelumnya
        </button>
        <div className="question-dots">
          {sessionQuestions.map((qItem, index) => (
            <button
              aria-label={`Ke soal ${index + 1}`}
              className={`${index === questionIndex ? "current" : ""} ${answers[qItem.id_soal] ? "answered" : ""}`}
              key={qItem.id_soal}
              onClick={() => moveQuestion(index)}
            />
          ))}
        </div>
        <div className="footer-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#64748b",
              cursor: "pointer",
            }}
            title="Aktifkan untuk menguji skenario koneksi terputus saat kirim jawaban (TC-24)"
          >
            <input
              type="checkbox"
              checked={simulateOffline}
              onChange={(e) => setSimulateOffline(e.target.checked)}
            />
            Simulasi Offline (TC-24)
          </label>
          {questionIndex < sessionQuestions.length - 1 && (
            <button className="exam-nav-button" onClick={() => moveQuestion(questionIndex + 1)}>
              Soal Selanjutnya <Icon name="arrow" size={18} />
            </button>
          )}
          <button className="button submit-button" onClick={() => setConfirm(true)}>
            Kirim Jawaban
          </button>
        </div>
      </footer>

      {/* TC-16 & TC-17: Modal Peringatan Pelanggaran 1/3 dan 2/3 */}
      {warning && (
        <div className="warning-overlay" role="alertdialog" aria-modal="true">
          <div className="warning-card">
            <span>
              <Icon name="warning" size={27} />
            </span>
            <p className="modal-kicker">
              PERINGATAN {violations} DARI {resolvedSession.batas_toleransi_pelanggaran || 3} (TC-16 / TC-17)
            </p>
            <h2>Aktivitas tidak diizinkan terdeteksi.</h2>
            <p>{warning} Aktivitas ini telah dicatat secara permanen pada log pelanggaran.</p>
            <div className="warning-meter">
              <i className={violations > 0 ? "filled" : ""} />
              <i className={violations > 1 ? "filled" : ""} />
              <i className={violations > 2 ? "filled" : ""} />
            </div>
            <button
              className="button primary wide"
              onClick={() => {
                setWarning("");
                if (!document.fullscreenElement) {
                  void document.documentElement.requestFullscreen?.().catch(() => undefined);
                }
              }}
            >
              Saya Mengerti, Kembali ke Layar Penuh &amp; Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* TC-22 & TC-23: Modal Konfirmasi Kirim Jawaban */}
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
              {answeredCount} dari {sessionQuestions.length} soal
            </strong>
            . Jawaban tidak dapat diubah setelah dikirim.
          </p>
          <div className="confirm-actions">
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Batal / Periksa Lagi
            </button>
            <button className="button primary" onClick={() => void handleFinalSubmit(false)}>
              Ya, Kirim Jawaban
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App({
  onLoginSuccess,
  onLogout,
  onStartExam,
}: {
  onLoginSuccess?: (user: any) => void;
  onLogout?: () => void;
  onStartExam?: (sessionId: any) => void;
} = {}) {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      if (isTokenExpired()) {
        clearAuthToken();
        return null;
      }
      const saved = sessionStorage.getItem("currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState<View>(() => {
    try {
      if (isTokenExpired()) return "landing";
      const saved = sessionStorage.getItem("currentUser");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role?.toLowerCase() === "dosen") return "lecturer";
        // TC-51: Jika sebelumnya sedang mengerjakan ujian dan halaman di-reload, langsung pulihkan ruang ujian
        if (sessionStorage.getItem("activeExamSessionId")) {
          return "exam";
        }
        return "student";
      }
    } catch {}
    return "landing";
  });

  const [loginRole, setLoginRole] = useState<Role | null>(null);
  const [activeExamSession, setActiveExamSession] = useState<any | null>(null);

  // TC-49: Cek berkala masa berlaku token JWT (maksimal 3 jam) & proteksi RBAC
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (currentUser && isTokenExpired()) {
        clearAuthToken();
        setCurrentUser(null);
        setView("landing");
        setLoginRole("student");
      }
    }, 10000);
    return () => window.clearInterval(interval);
  }, [currentUser]);

  // TC-49: Proteksi RBAC tingkat komponen — cegah mahasiswa berada di view dosen
  useEffect(() => {
    if (view === "lecturer" && currentUser && currentUser.role?.toLowerCase() !== "dosen") {
      setView("student");
    }
  }, [view, currentUser]);

  const loginSuccess = (user?: any) => {
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    }
    if (user && user.role) {
      const isLecturer = user.role.toLowerCase() === "dosen";
      setView(isLecturer ? "lecturer" : "student");
    } else {
      setView(loginRole === "student" ? "student" : "lecturer");
    }
    setLoginRole(null);
  };

  const logout = () => {
    const identifier =
      currentUser?.detail?.nim ||
      currentUser?.detail?.nip ||
      currentUser?.username ||
      "";
    logoutApi(identifier);
    sessionStorage.removeItem("activeExamStarted");
    sessionStorage.removeItem("activeExamSessionId");
    setCurrentUser(null);
    setActiveExamSession(null);
    if (onLogout) onLogout();
    setView("landing");
  };

  return (
    <>
      {view === "landing" && <Landing onLogin={setLoginRole} />}
      {view === "student" && (
        <StudentDashboard
          currentUser={currentUser}
          onLogout={logout}
          onStartExam={(sessionData) => {
            setActiveExamSession(sessionData);
            sessionStorage.setItem("activeExamSessionId", sessionData.id_sesi);
            if (onStartExam) onStartExam(sessionData.id_sesi);
            setView("exam");
          }}
        />
      )}
      {view === "lecturer" && <LecturerDashboard currentUser={currentUser} onLogout={logout} />}
      {view === "exam" && (
        <ExamPage
          currentUser={currentUser}
          initialSession={activeExamSession}
          onExit={() => {
            sessionStorage.removeItem("activeExamStarted");
            sessionStorage.removeItem("activeExamSessionId");
            setActiveExamSession(null);
            setView("student");
          }}
        />
      )}
      {loginRole && (
        <LoginModal onClose={() => setLoginRole(null)} onSuccess={loginSuccess} role={loginRole} />
      )}
    </>
  );
}

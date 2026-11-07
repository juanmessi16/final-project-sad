import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Clock,
  Laptop
} from 'lucide-react';
import { loginUser } from '../services/storage';

const Login = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('Mahasiswa'); // 'Mahasiswa' or 'Dosen'
  const [username, setUsername] = useState('105022410021');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'Mahasiswa') {
      setUsername('105022410021');
      setPassword('123');
    } else {
      setUsername('dosen');
      setPassword('dosen123');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg(`Mohon masukkan ${selectedRole === 'Mahasiswa' ? 'NIM' : 'Username'} dan kata sandi Anda.`);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = loginUser(username.trim(), password.trim());
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.message);
        return;
      }

      // Validasi role pengguna
      if (result.user.role !== selectedRole) {
        setErrorMsg(`Akun ini terdaftar sebagai ${result.user.role}. Silakan beralih ke tab Login ${result.user.role}.`);
        return;
      }

      onLoginSuccess(result.user);
    }, 350);
  };

  const setPreset = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* Top Navbar */}
      <header className="nav-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>SiLab Exam System</h1>
            <p style={{ fontSize: '0.72rem', color: '#93C5FD', margin: 0 }}>Fakultas Ilmu Komputer — Universitas Klabat</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.15)', padding: '5px 12px', borderRadius: '9999px', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>Pengawasan Anti-Curang Aktif</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 20px' }}>
        <div style={{
          width: '100%',
          maxWidth: '1020px',
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.1)',
          border: '1px solid #E2E8F0'
        }}>
          {/* Left Hero Panel */}
          <div style={{
            background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)',
            color: '#FFFFFF',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#93C5FD',
                marginBottom: '24px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}>
                <Sparkles size={14} color="#FBBF24" />
                <span>Ujian Akademik Terstandarisasi</span>
              </div>

              <h2 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '16px', letterSpacing: '-0.02em' }}>
                Platform Ujian Cerdas & Berintegritas Tinggi
              </h2>

              <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '32px' }}>
                Sistem Ujian Berbasis Web Fakultas Ilmu Komputer UNKLAB dirancang untuk menjamin kejujuran pengerjaan soal secara real-time dengan pengawasan cerdas otomatis.
              </p>

              {/* Feature Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                    <ShieldCheck size={18} color="#60A5FA" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>Deteksi Pindah Tab & Jendela</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Pencatatan instan saat browser kehilangan fokus</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    <Lock size={18} color="#34D399" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>Proteksi Salin-Tempel (Clipboard)</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Blokir copy, paste, cut, & klik kanan context menu</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    <Clock size={18} color="#FBBF24" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>Auto-Save & Bukti Ujian Digital</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Jawaban tersimpan aman setiap detik ke database</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Citation */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.75rem', color: '#94A3B8' }}>
              Mata Kuliah: <strong style={{ color: '#E2E8F0' }}>Sistem Analisis & Desain (SAD)</strong><br />
              Dosen Pengampu: <span style={{ color: '#E2E8F0' }}>George M. W. Tangka, S.Kom., MBA</span>
            </div>
          </div>

          {/* Right Form Panel */}
          <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                Masuk ke Portal Ujian
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                Silakan pilih peran dan masukkan kredensial akun Anda.
              </p>
            </div>

            {/* Role Switcher */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              backgroundColor: '#F1F5F9',
              padding: '5px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <button
                type="button"
                onClick={() => handleRoleChange('Mahasiswa')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: selectedRole === 'Mahasiswa' ? '#FFFFFF' : 'transparent',
                  color: selectedRole === 'Mahasiswa' ? '#1E3A8A' : '#64748B',
                  boxShadow: selectedRole === 'Mahasiswa' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <GraduationCap size={18} />
                <span>Mahasiswa</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('Dosen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: selectedRole === 'Dosen' ? '#FFFFFF' : 'transparent',
                  color: selectedRole === 'Dosen' ? '#047857' : '#64748B',
                  boxShadow: selectedRole === 'Dosen' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <BookOpen size={18} />
                <span>Dosen Pengampu</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDD3',
                color: '#991B1B',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.83rem',
                marginBottom: '18px',
                lineHeight: 1.4
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} color="#64748B" />
                  <span>{selectedRole === 'Mahasiswa' ? 'Nomor Induk Mahasiswa (NIM):' : 'Username / NIP Dosen:'}</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'Mahasiswa' ? 'Contoh: 105022410021' : 'Contoh: dosen'}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} color="#64748B" />
                  <span>Kata Sandi (Password):</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    style={{ paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`btn ${selectedRole === 'Mahasiswa' ? 'btn-primary' : 'btn-success'}`}
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.98rem',
                  borderRadius: '10px',
                  marginTop: '8px'
                }}
              >
                {loading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div style={{ marginTop: '26px', paddingTop: '18px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                ⚡ Akun Uji Coba Cepat (Presentasi Kuliah):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedRole === 'Mahasiswa' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreset('105022410021', '123')}
                      style={{ fontSize: '0.73rem', padding: '5px 9px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer', color: '#1E293B' }}
                    >
                      Juan Messi (105022410021)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreset('105022510107', '123')}
                      style={{ fontSize: '0.73rem', padding: '5px 9px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer', color: '#1E293B' }}
                    >
                      Jeniffer Diana (105022510107)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreset('105022410095', '123')}
                      style={{ fontSize: '0.73rem', padding: '5px 9px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer', color: '#1E293B' }}
                    >
                      Valentino (105022410095)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreset('terkunci', '123')}
                      style={{ fontSize: '0.73rem', padding: '5px 9px', borderRadius: '6px', background: '#FEE2E2', border: '1px solid #FCA5A5', cursor: 'pointer', color: '#991B1B', fontWeight: 600 }}
                      title="Uji coba Use Case 1.2.1.b (Akun Terkunci)"
                    >
                      🔒 Akun Terkunci (Demo)
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreset('dosen', 'dosen123')}
                    style={{ fontSize: '0.73rem', padding: '5px 10px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', cursor: 'pointer', color: '#065F46', fontWeight: 600 }}
                  >
                    George Tangka (dosen / dosen123)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.8rem', color: '#94A3B8', borderTop: '1px solid #E2E8F0' }}>
        Sistem Analisis & Desain (SAD Class) — Fakultas Ilmu Komputer, Universitas Klabat &copy; 2026
      </footer>
    </div>
  );
};

export default Login;

import { useState } from 'react';
import { loginUser } from '../services/storage';

const Login = ({ onLoginSuccess }) => {
  // 'choice' (tampilan awal 2 kartu opsi), 'Mahasiswa', atau 'Dosen'
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectRole = (role) => {
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
      setErrorMsg(`Mohon isi ${selectedRole === 'Mahasiswa' ? 'NIM' : 'Username'} dan password.`);
      return;
    }

    const result = loginUser(username.trim(), password.trim());
    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    // Validasi apakah peran akun cocok dengan opsi login yang dipilih
    if (result.user.role !== selectedRole) {
      setErrorMsg(`Akun ini adalah akun ${result.user.role}. Silakan gunakan opsi Login ${result.user.role}.`);
      return;
    }

    onLoginSuccess(result.user);
  };

  const setPreset = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* Top Header Branding */}
      <header style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF', padding: '16px 28px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', backgroundColor: '#FFFFFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#1E3A8A', fontWeight: 'bold' }}>
            🎓
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: '#FFFFFF' }}>SiLab Exam System</h1>
            <p style={{ fontSize: '0.75rem', color: '#93C5FD', margin: 0 }}>Fakultas Ilmu Komputer — Universitas Klabat</p>
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }}></span>
          Sistem Ujian Anti-Curang Aktif
        </div>
      </header>

      {/* Main Landing Area */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
        <div style={{ width: '100%', maxWidth: selectedRole ? '460px' : '780px', transition: 'all 0.3s ease' }}>
          
          {/* Judul & Hero */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ color: '#0F172A', fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
              Selamat Datang di Portal Ujian
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
              Platform evaluasi akademik berbasis web dengan pengawasan anti-curang otomatis terintegrasi. Silakan pilih jenis akses masuk Anda.
            </p>
          </div>

          {/* OPSI 1: TAMPILAN AWAL 2 KARTU OPSI (LOGIN MAHASISWA & LOGIN DOSEN) */}
          {!selectedRole && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '22px' }}>
              
              {/* Kartu 1: Login Mahasiswa */}
              <div 
                className="card"
                style={{ 
                  padding: '30px 24px', 
                  borderRadius: '12px', 
                  textAlign: 'center', 
                  border: '2px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(37, 99, 235, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                }}
                onClick={() => handleSelectRole('Mahasiswa')}
              >
                <div>
                  <div style={{ width: '70px', height: '70px', backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px auto', border: '1px solid #BFDBFE' }}>
                    👨‍🎓
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '8px' }}>
                    Login Mahasiswa
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    Akses ruang ujian, verifikasi PIN ujian, pengerjaan soal dengan auto-save, dan unduh tanda terima bukti pengerjaan.
                  </p>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '8px' }}
                >
                  Login ▶
                </button>
              </div>

              {/* Kartu 2: Login Dosen */}
              <div 
                className="card"
                style={{ 
                  padding: '30px 24px', 
                  borderRadius: '12px', 
                  textAlign: 'center', 
                  border: '2px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1E3A8A';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(30, 58, 138, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                }}
                onClick={() => handleSelectRole('Dosen')}
              >
                <div>
                  <div style={{ width: '70px', height: '70px', backgroundColor: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px auto', border: '1px solid #BBF7D0' }}>
                    👨‍🏫
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#14532D', marginBottom: '8px' }}>
                    Login Dosen
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    Kelola bank soal, konfigurasikan jadwal ujian & PIN, pantau log pelanggaran anti-curang, dan tetapkan sanksi nilai.
                  </p>
                </div>
                <button 
                  className="btn btn-success" 
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '8px' }}
                >
                  Login ▶
                </button>
              </div>

            </div>
          )}

          {/* OPSI 2: FORM LOGIN TERPILIH (MAHASISWA ATAU DOSEN) */}
          {selectedRole && (
            <div className="card" style={{ padding: '30px 28px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
              
              {/* Tombol Switcher Tab di atas Form */}
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px', marginBottom: '22px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedRole === 'Mahasiswa' ? '#FFFFFF' : 'transparent',
                    color: selectedRole === 'Mahasiswa' ? '#1E3A8A' : '#64748B',
                    boxShadow: selectedRole === 'Mahasiswa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: '0.2s'
                  }}
                  onClick={() => handleSelectRole('Mahasiswa')}
                >
                  👨‍🎓 Login Mahasiswa
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedRole === 'Dosen' ? '#FFFFFF' : 'transparent',
                    color: selectedRole === 'Dosen' ? '#14532D' : '#64748B',
                    boxShadow: selectedRole === 'Dosen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: '0.2s'
                  }}
                  onClick={() => handleSelectRole('Dosen')}
                >
                  👨‍🏫 Login Dosen
                </button>
              </div>

              {/* Judul Form */}
              <div style={{ marginBottom: '18px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: selectedRole === 'Mahasiswa' ? '#1E3A8A' : '#14532D', margin: 0 }}>
                  {selectedRole === 'Mahasiswa' ? 'Portal Masuk Mahasiswa' : 'Portal Masuk Dosen Pengampu'}
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  {selectedRole === 'Mahasiswa' 
                    ? 'Masukkan Nomor Induk Mahasiswa (NIM) dan password Anda.' 
                    : 'Masukkan username akun dosen dan password Anda.'}
                </p>
              </div>

              {/* Alert Error Message */}
              {errorMsg && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left', border: '1px solid #FCA5A5' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                <div className="form-group">
                  <label>{selectedRole === 'Mahasiswa' ? 'Nomor Induk Mahasiswa (NIM):' : 'Username Dosen / NIP:'}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole === 'Mahasiswa' ? 'Contoh: 105022410021' : 'Contoh: dosen'}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Password"
                  />
                </div>

                <button 
                  type="submit" 
                  className={`btn ${selectedRole === 'Mahasiswa' ? 'btn-primary' : 'btn-success'}`} 
                  style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '6px', borderRadius: '8px' }}
                >
                  Login
                </button>
              </form>

              {/* Quick Fill Demo */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '0.8rem', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Akun Cepat untuk Uji Coba:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedRole === 'Mahasiswa' ? (
                    <>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setPreset('105022410021', '123')}>
                        Juan Septhian (105022410021)
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setPreset('105022510107', '123')}>
                        Jeniffer (105022510107)
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setPreset('terkunci', '123')}>
                        🔒 Akun Terkunci (Demo)
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setPreset('dosen', 'dosen123')}>
                      George Tangka (dosen / dosen123)
                    </button>
                  )}
                </div>
              </div>

              {/* Kembali ke Pilihan Peran */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setSelectedRole(null)}
                >
                  ◀ Kembali ke Menu Pilihan Peran
                </button>
              </div>

            </div>
          )}

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

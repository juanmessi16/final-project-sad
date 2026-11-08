import React, { useState } from 'react';
import { loginUser, loginByEmail } from '../services/storage';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCookiesModal, setShowCookiesModal] = useState(false);
  const [showLostPasswordModal, setShowLostPasswordModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Daftar akun UNKLAB Email untuk login cepat (Single Sign-On)
  const unklabAccounts = [
    {
      name: 'Tulengkey, Juan Messi Septhian',
      email: 's105022410021@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022410021',
      avatarBg: '#0F6CBF',
      subtext: 'Fakultas Ilmu Komputer (Informatika)'
    },
    {
      name: 'Tuwaidan, Jeniffer Diana',
      email: 's105022510107@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022510107',
      avatarBg: '#7C3AED',
      subtext: 'Fakultas Ilmu Komputer (Sistem Informasi)'
    },
    {
      name: 'Sumual, Valentino',
      email: 's105022410095@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022410095',
      avatarBg: '#059669',
      subtext: 'Fakultas Ilmu Komputer (Informatika)'
    },
    {
      name: 'Sahetapy, Wilman Valentino',
      email: 's105022410007@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022410007',
      avatarBg: '#D97706',
      subtext: 'Fakultas Ilmu Komputer (Informatika)'
    },
    {
      name: 'Laluyan, Matthew Arnold M',
      email: 's105022510475@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022510475',
      avatarBg: '#4B5563',
      subtext: 'Fakultas Ilmu Komputer (Sistem Informasi)'
    },
    {
      name: 'George M. W. Tangka, S.Kom., MBA',
      email: 'george.tangka@unklab.ac.id',
      role: 'Dosen Pengampu',
      nim: 'DOS_01',
      avatarBg: '#DC2626',
      subtext: 'Dosen Sistem Analisis & Desain'
    },
    {
      name: 'Mahasiswa Terkunci (Demo)',
      email: 'demo.locked@student.unklab.ac.id',
      role: 'Mahasiswa',
      nim: '105022499999',
      avatarBg: '#991B1B',
      subtext: 'Uji Skenario Akun Terkunci (Alternate Flow 1.2.1.b)'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Invalid login, please try again');
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

      onLoginSuccess(result.user);
    }, 250);
  };

  const handleSelectGoogleAccount = (acc) => {
    setLoading(true);
    setShowGoogleModal(false);

    setTimeout(() => {
      const result = loginByEmail(acc.email);
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.message);
        return;
      }

      onLoginSuccess(result.user);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ECEEF1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Main Login Card - Mirrored directly from edUnklab */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        backgroundColor: '#FFFFFF',
        borderRadius: '6px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '36px 36px 32px 36px',
        boxSizing: 'border-box'
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#212529',
          margin: '0 0 24px 0',
          letterSpacing: '-0.01em',
          lineHeight: 1.2
        }}>
          Log in to xUnklab
        </h1>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#F8D7DA',
            color: '#721C24',
            border: '1px solid #F5C6CB',
            padding: '12px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            {errorMsg}
          </div>
        )}

        {/* Standard Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '15px',
                color: '#495057',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CED4DA',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#80BDFF';
                e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CED4DA';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '15px',
                color: '#495057',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CED4DA',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#80BDFF';
                e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CED4DA';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Log in Button - classic Moodle blue button placed on the left */}
          <div style={{ marginBottom: '14px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#0F6CBF',
                borderColor: '#0F6CBF',
                color: '#FFFFFF',
                padding: '7px 20px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '4px',
                border: '1px solid #0F6CBF',
                cursor: 'pointer',
                display: 'inline-block',
                transition: 'background-color 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0C5394'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0F6CBF'; }}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </div>

          {/* Lost password link */}
          <div style={{ marginBottom: '22px' }}>
            <a
              href="#lost-password"
              onClick={(e) => {
                e.preventDefault();
                setShowLostPasswordModal(true);
              }}
              style={{
                color: '#0F6CBF',
                textDecoration: 'none',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
            >
              Lost password?
            </a>
          </div>
        </form>

        {/* Separator Line */}
        <hr style={{
          border: 0,
          borderTop: '1px solid #DEE2E6',
          margin: '0 0 20px 0'
        }} />

        {/* OAuth Section: Log in using your account on: */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#212529',
            margin: '0 0 12px 0'
          }}>
            Log in using your account on:
          </h2>

          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CED4DA',
              borderRadius: '4px',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              color: '#3C4043',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background-color 0.15s ease, border-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8F9FA';
              e.currentTarget.style.borderColor = '#ADB5BD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CED4DA';
            }}
          >
            {/* Google G Logo SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
            </svg>
            <span>Login with UNKLAB Email</span>
          </button>
        </div>

        {/* Cookies notice button */}
        <div>
          <button
            type="button"
            onClick={() => setShowCookiesModal(true)}
            style={{
              backgroundColor: '#6C757D',
              borderColor: '#6C757D',
              color: '#FFFFFF',
              padding: '6px 14px',
              fontSize: '13px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5A6268'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#6C757D'; }}
          >
            Cookies notice
          </button>
        </div>
      </div>

      {/* Floating Help Circle Button at Bottom Right (Exactly as in screenshot) */}
      <button
        type="button"
        onClick={() => setShowHelpModal(true)}
        title="Bantuan Masuk xUnklab"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#6C757D',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '18px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
          transition: 'transform 0.15s ease, background-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#5A6268';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6C757D';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ?
      </button>

      {/* GOOGLE UNKLAB EMAIL SELECTOR MODAL (OAUTH POPUP SIMULATION) */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px 24px',
            boxShadow: '0 20px 30px rgba(0, 0, 0, 0.2)',
            boxSizing: 'border-box'
          }}>
            {/* Google Brand Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <svg width="28" height="28" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#202124', margin: '0 0 4px 0' }}>
                Sign in with Google
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#5F6368', margin: 0 }}>
                Choose an account to continue to <strong>xUnklab</strong> (Universitas Klabat)
              </p>
            </div>

            {/* Account List */}
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              borderTop: '1px solid #E8EAED',
              borderBottom: '1px solid #E8EAED',
              marginBottom: '18px'
            }}>
              {unklabAccounts.map((acc, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectGoogleAccount(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 10px',
                    borderBottom: index === unklabAccounts.length - 1 ? 'none' : '1px solid #F1F3F4',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {/* Initials Avatar */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: acc.avatarBg,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {acc.name.charAt(0)}
                  </div>

                  {/* Account Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acc.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5F6368', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acc.email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#1A73E8', marginTop: '1px' }}>
                      {acc.role} &bull; {acc.subtext}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DADCE0',
                  color: '#1A73E8',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOST PASSWORD MODAL */}
      {showLostPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            maxWidth: '420px',
            width: '100%',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#212529', marginTop: 0 }}>
              Reset Password xUnklab
            </h3>
            <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.6 }}>
              Untuk memulihkan kata sandi akun <strong>xUnklab</strong> atau akun email <em>@student.unklab.ac.id</em>, silakan menghubungi layanan resmi ICT Support Universitas Klabat:
            </p>
            <div style={{
              backgroundColor: '#F8F9FA',
              border: '1px solid #DEE2E6',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              <div><strong>Unit ICT UNKLAB:</strong> Gedung Utama Lantai 2</div>
              <div><strong>Email:</strong> ict@unklab.ac.id</div>
              <div><strong>Helpdesk:</strong> (0431) 891035</div>
            </div>
            <button
              type="button"
              onClick={() => setShowLostPasswordModal(false)}
              style={{
                backgroundColor: '#0F6CBF',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* COOKIES NOTICE MODAL */}
      {showCookiesModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            maxWidth: '420px',
            width: '100%',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#212529', marginTop: 0 }}>
              Cookies Notice
            </h3>
            <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.6 }}>
              Sistem <strong>xUnklab Exam System</strong> menggunakan cookie sesi (*session cookies*) untuk:
            </p>
            <ul style={{ fontSize: '13px', color: '#495057', paddingLeft: '20px', lineHeight: 1.6, marginBottom: '16px' }}>
              <li>Mempertahankan status otentikasi login mahasiswa dan dosen.</li>
              <li>Menyimpan token pengawasan anti-curang real-time (*AI Proctor session*).</li>
              <li>Menjamin keabsahan tanda terima bukti pengerjaan ujian resmi.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowCookiesModal(false)}
              style={{
                backgroundColor: '#6C757D',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* HELP MODAL (?) */}
      {showHelpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#212529', marginTop: 0 }}>
              Panduan Masuk Sistem xUnklab
            </h3>
            <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.6, marginBottom: '12px' }}>
              Anda dapat masuk menggunakan dua metode:
            </p>
            <ol style={{ fontSize: '13px', color: '#495057', paddingLeft: '20px', lineHeight: 1.7, marginBottom: '16px' }}>
              <li>
                <strong>Login with UNKLAB Email:</strong> Klik tombol Google untuk memilih akun mahasiswa atau dosen UNKLAB.
              </li>
              <li>
                <strong>NIM / Username:</strong>
                <div>Mahasiswa: NIM <code>105022410021</code> (Password: <code>123</code>)</div>
                <div>Dosen: Username <code>dosen</code> (Password: <code>dosen123</code>)</div>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              style={{
                backgroundColor: '#0F6CBF',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

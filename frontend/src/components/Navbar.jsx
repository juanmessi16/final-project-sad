import React from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  User, 
  GraduationCap, 
  Award, 
  Radio
} from 'lucide-react';

const Navbar = ({ currentUser, onLogout, inExam = false, examTitle = '' }) => {
  const isMahasiswa = currentUser?.role === 'Mahasiswa';
  const profileName = isMahasiswa 
    ? currentUser?.profile?.nama 
    : currentUser?.profile?.nama_dosen;
  const profileId = isMahasiswa 
    ? `NIM: ${currentUser?.profile?.nim}` 
    : `Mata Kuliah: ${currentUser?.profile?.mata_kuliah}`;

  return (
    <header className="nav-header">
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <GraduationCap size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: '#FFFFFF' }}>
              SiLab Exam System
            </h1>
            <span style={{ 
              fontSize: '0.65rem', 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: '#BFDBFE', 
              padding: '2px 7px', 
              borderRadius: '9999px',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              PROCTOR v2.4
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#93C5FD', margin: 0, fontWeight: 500 }}>
            Fakultas Ilmu Komputer — Universitas Klabat
          </p>
        </div>
      </div>

      {/* Middle info (e.g. Exam Title in exam mode) */}
      {inExam && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.1)', padding: '6px 16px', borderRadius: '9999px' }}>
          <Radio size={16} color="#34D399" className="pulse-icon" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F1F5F9' }}>
            {examTitle}
          </span>
        </div>
      )}

      {/* User Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Anti-cheat engine status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          padding: '6px 12px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          color: '#34D399',
          fontWeight: 600
        }}>
          <ShieldCheck size={14} />
          <span>Anti-Cheat AI Aktif</span>
        </div>

        {/* User Chip */}
        {currentUser && !inExam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 14px 6px 8px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isMahasiswa ? '#3B82F6' : '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {profileName ? profileName.charAt(0) : <User size={16} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
                  {profileName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.1 }}>
                  {profileId}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn btn-danger"
              style={{ padding: '7px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              title="Keluar dari Akun"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

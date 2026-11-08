import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Printer, 
  HelpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { getExamSessionData, autoSaveAnswer, recordViolation, submitExamFinal } from '../../services/storage';

const RuangUjian = ({ idSesi, onExamCompleted }) => {
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [violations, setViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [alertBanner, setAlertBanner] = useState({ show: false, text: '', type: 'danger' });
  const [autoSaveStatus, setAutoSaveStatus] = useState({ text: 'Semua jawaban tersimpan aman', saving: false, time: '' });
  const [isLocked, setIsLocked] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isExamActive = useRef(true);
  const timeLeftRef = useRef(3600);

  // Inisialisasi Sesi Ujian (Use Case 1.2.11)
  useEffect(() => {
    const data = getExamSessionData(idSesi);
    if (!data) return;

    setExamData(data);
    setAnswers(data.jawaban_tersimpan || {});
    setTimeLeft(data.sesi.sisa_waktu);
    timeLeftRef.current = data.sesi.sisa_waktu;
    setViolations(data.sesi.jumlah_peringatan);
    setMaxViolations(data.ujian.batas_toleransi_pelanggaran || 3);
    setAutoSaveStatus({
      text: 'Jawaban tersinkronisasi',
      saving: false,
      time: new Date().toLocaleTimeString('id-ID')
    });

    if (data.sesi.status_ujian === 'Dikunci Paksa') {
      setIsLocked(true);
      isExamActive.current = false;
    }
  }, [idSesi]);

  // Eksekusi Submit Ujian (Use Case 1.2.4, 1.2.16, 1.2.19)
  const executeSubmit = useCallback((status = 'Selesai') => {
    isExamActive.current = false;
    const receipt = submitExamFinal(idSesi, answers, status);
    setSubmittedReceipt(receipt);
  }, [idSesi, answers]);

  // Handle Pelanggaran Anti-Curang (Use Case 1.2.14, 1.2.15, 1.2.17, 1.2.18)
  const handleViolation = useCallback((jenis) => {
    if (!isExamActive.current) return;

    const res = recordViolation(idSesi, jenis);
    if (!res) return;

    setViolations(res.jumlah_peringatan);

    // Tampilkan Peringatan Visual Mencolok (Use Case 1.2.17)
    setAlertBanner({
      show: true,
      text: `PERINGATAN SISTEM: Terdeteksi aktivitas '${jenis}'! (Pelanggaran ke-${res.jumlah_peringatan} dari batas ${res.batas_toleransi})`,
      type: 'danger'
    });

    setTimeout(() => {
      setAlertBanner(prev => ({ ...prev, show: false }));
    }, 4500);

    // Kunci Sesi Paksa jika melewati ambang batas toleransi (Use Case 1.2.18)
    if (res.kunci_paksa) {
      isExamActive.current = false;
      setIsLocked(true);
    }
  }, [idSesi]);

  // Timer Hitung Mundur Real-Time (Use Case 1.2.13)
  useEffect(() => {
    if (isLocked || submittedReceipt) return;

    const timer = setInterval(() => {
      if (!isExamActive.current) return;

      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next <= 0) {
          clearInterval(timer);
          alert('Waktu ujian telah berakhir! Sistem secara otomatis mengumpulkan lembar jawaban Anda.');
          executeSubmit('Disubmit Otomatis'); // Use Case 1.2.16
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, submittedReceipt, executeSubmit]);

  // Event Listeners Anti-Curang (Use Case 1.2.14 & 1.2.15)
  useEffect(() => {
    if (isLocked || submittedReceipt) return;

    // 1. Deteksi Tab Hilang Fokus / Switch Window (Use Case 1.2.14)
    const handleVisibility = () => {
      if (document.hidden && isExamActive.current) {
        handleViolation('Pindah Tab');
      }
    };
    const handleBlur = () => {
      if (isExamActive.current) {
        handleViolation('Pindah Tab');
      }
    };

    // 2. Blokir Copy, Paste, Cut & Klik Kanan (Use Case 1.2.15)
    const handleCopyPaste = (e) => {
      if (isExamActive.current) {
        e.preventDefault();
        handleViolation('Copy-Paste');
      }
    };
    const handleContextMenu = (e) => {
      if (isExamActive.current) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e) => {
      // Blokir shortcut screenshot/developer tools seperti F12, Ctrl+U, Ctrl+Shift+I, Alt+Tab dicegah sebisanya
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'p')) || e.key === 'F12') {
        e.preventDefault();
        handleViolation('Copy-Paste');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleViolation, isLocked, submittedReceipt]);

  // Auto-Save Jawaban Saat Opsi Dipilih (Use Case 1.2.12)
  const handleOptionSelect = (idSoal, pilihan) => {
    const updated = { ...answers, [idSoal]: pilihan };
    setAnswers(updated);
    setAutoSaveStatus({ text: 'Menyimpan jawaban ke database...', saving: true, time: '' });

    setTimeout(() => {
      autoSaveAnswer(idSesi, idSoal, pilihan, timeLeftRef.current);
      setAutoSaveStatus({
        text: 'Tersimpan otomatis',
        saving: false,
        time: new Date().toLocaleTimeString('id-ID')
      });
    }, 200);
  };

  // Trigger Modal Konfirmasi Submit Manual (Use Case 1.2.4)
  const handleConfirmSubmit = () => {
    setShowConfirmModal(true);
  };

  if (!examData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        <Clock size={24} className="pulse-icon" style={{ marginRight: '8px' }} />
        <span>Menyiapkan ruang ujian dan mengacak butir soal...</span>
      </div>
    );
  }

  // TAMPILAN SESI DIKUNCI PAKSA (Use Case 1.2.18)
  if (isLocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#FEF2F2' }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.15)',
          border: '2px solid #FCA5A5'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#DC2626'
          }}>
            <Lock size={36} />
          </div>

          <h2 style={{ color: '#991B1B', fontSize: '1.65rem', fontWeight: 800, marginBottom: '10px' }}>
            SESI UJIAN TELAH DIKUNCI PAKSA
          </h2>

          <div style={{
            background: '#FFF5F5',
            border: '1px solid #FED7D7',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            color: '#742A2A',
            lineHeight: 1.6,
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <strong>Penyebab:</strong> Akumulasi pelanggaran Anda telah melampaui batas toleransi sistem (<strong>{violations} / {maxViolations} pelanggaran</strong>). Aktivitas perpindahan tab/jendela atau penyalinan teks terdeteksi berulang kali.
          </div>

          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '28px', lineHeight: 1.5 }}>
            Seluruh jawaban yang telah Anda pilih sebelum sesi terkunci telah diamankan otomatis ke server. Insiden ini telah dicatat ke <em>Log Pelanggaran</em> untuk ditinjau oleh Dosen Pengampu mata kuliah.
          </p>

          <button
            className="btn btn-danger"
            style={{ width: '100%', padding: '13px', fontSize: '0.95rem', borderRadius: '10px' }}
            onClick={onExamCompleted}
          >
            Kembali ke Portal Mahasiswa
          </button>
        </div>
      </div>
    );
  }

  // TAMPILAN BUKTI PENGIRIMAN UJIAN RESMI (Use Case 1.2.19)
  if (submittedReceipt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#F8FAFC' }}>
        <div className="printable-receipt" style={{
          maxWidth: '580px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '36px',
          textAlign: 'center',
          boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#16A34A'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ color: '#0F172A', fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px' }}>
            Ujian Berhasil Diserahkan!
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '24px' }}>
            Lembar jawaban Anda telah diverifikasi dan tersimpan permanen di database sistem xUnklab FIK UNKLAB.
          </p>

          {/* Receipt Slip */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'left',
            fontSize: '0.85rem',
            lineHeight: 1.9,
            marginBottom: '26px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Nomor Bukti (Receipt):</span>
              <strong style={{ fontFamily: 'monospace', color: '#1E40AF' }}>{submittedReceipt.id_bukti}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>ID Sesi:</span>
              <span style={{ fontFamily: 'monospace' }}>{submittedReceipt.id_sesi}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Waktu Selesai:</span>
              <span>{submittedReceipt.waktu_pengiriman}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Status Pengiriman:</span>
              <span className={`badge ${submittedReceipt.status_pengiriman === 'Selesai' ? 'badge-success' : 'badge-warning'}`}>
                {submittedReceipt.status_pengiriman}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '6px' }}>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>Skor Evaluasi Otomatis:</span>
              <strong style={{ fontSize: '1.3rem', color: (submittedReceipt.total_nilai || 0) >= 70 ? '#059669' : '#DC2626' }}>
                {submittedReceipt.total_nilai} / 100
              </strong>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-outline-primary"
              style={{ flex: 1, padding: '12px' }}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span>Cetak Bukti PDF</span>
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px' }}
              onClick={onExamCompleted}
            >
              Kembali ke Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format Timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeCritical = timeLeft < 300; // < 5 Menit
  const currentSoal = examData.soal[currentIndex];
  const totalQuestions = examData.soal.length;
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="no-select" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* Alert Banner Visual Peringatan Anti-Curang (Use Case 1.2.17) */}
      {alertBanner.show && (
        <div className="alert-banner">
          <AlertTriangle size={20} />
          <span>{alertBanner.text}</span>
        </div>
      )}

      {/* Top Proctor Bar */}
      <header style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Exam Title & Subject */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', background: '#3B82F6', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              RUANG UJIAN LAB
            </span>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              {examData.ujian.nama_ujian}
            </h1>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
            Universitas Klabat &bull; Pengawasan Sistem Anti-Curang Aktif
          </div>
        </div>

        {/* Center: Live Auto Save Status Indicator (Use Case 1.2.12) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94A3B8' }}>
          <Save size={14} color={autoSaveStatus.saving ? '#FBBF24' : '#34D399'} />
          <span>{autoSaveStatus.text}</span>
          {autoSaveStatus.time && <span style={{ color: '#64748B' }}>({autoSaveStatus.time})</span>}
        </div>

        {/* Right: Anti-Cheat Violations & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Violation Counter Badge (Use Case 1.2.17) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: violations > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${violations > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.15)'}`,
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: violations > 0 ? '#FCA5A5' : '#E2E8F0'
          }}>
            <ShieldAlert size={15} color={violations > 0 ? '#EF4444' : '#94A3B8'} />
            <span>Pelanggaran: {violations} / {maxViolations}</span>
          </div>

          {/* Real-time Countdown Timer (Use Case 1.2.13) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isTimeCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(37, 99, 235, 0.2)',
            border: `1px solid ${isTimeCritical ? '#EF4444' : '#3B82F6'}`,
            padding: '6px 16px',
            borderRadius: '9999px',
            color: isTimeCritical ? '#EF4444' : '#60A5FA',
            fontWeight: 800,
            fontFamily: 'monospace',
            fontSize: '1.1rem'
          }}>
            <Clock size={16} />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      {/* Main Examination Grid */}
      <main className="container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', padding: '24px 20px' }}>
        
        {/* Left: Question Card (Use Case 1.2.11 & 1.2.12) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div>
            {/* Question Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#EFF6FF',
                  color: '#1E40AF',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  Soal Nomor {currentIndex + 1}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  dari {totalQuestions} Soal
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Bobot: <strong>20 Poin</strong>
              </div>
            </div>

            {/* Question Text */}
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              lineHeight: 1.6,
              color: '#0F172A',
              marginBottom: '28px'
            }}>
              {currentSoal.pertanyaan}
            </div>

            {/* Options Choices (Shuffled per Use Case 1.2.11) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentSoal.opsi_jawaban.map((opsi, idx) => {
                const isSelected = answers[currentSoal.id_soal] === opsi;
                const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                return (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSelected ? '#2563EB' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      border: isSelected ? 'none' : '1px solid #CBD5E1'
                    }}>
                      {optionLabel}
                    </div>

                    <input
                      type="radio"
                      name={`soal_${currentSoal.id_soal}`}
                      value={opsi}
                      checked={isSelected}
                      onChange={() => handleOptionSelect(currentSoal.id_soal, opsi)}
                      style={{ display: 'none' }}
                    />

                    <span style={{
                      fontSize: '0.95rem',
                      color: isSelected ? '#1E3A8A' : '#1E293B',
                      fontWeight: isSelected ? 600 : 400,
                      lineHeight: 1.4
                    }}>
                      {opsi}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '24px',
            borderTop: '1px solid #E2E8F0',
            marginTop: '32px'
          }}>
            <button
              className="btn btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              style={{ opacity: currentIndex === 0 ? 0.4 : 1, padding: '10px 18px' }}
            >
              <ChevronLeft size={16} />
              <span>Sebelumnya</span>
            </button>

            <button
              className="btn btn-primary"
              disabled={currentIndex === totalQuestions - 1}
              onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
              style={{ opacity: currentIndex === totalQuestions - 1 ? 0.4 : 1, padding: '10px 18px' }}
            >
              <span>Selanjutnya</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Right: Question Navigation Palette & Finish Button */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              Daftar Lembar Soal
            </h3>

            {/* Status Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#64748B', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563EB', display: 'inline-block' }}></span>
                <span>Sedang Dibuka</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#E2E8F0', display: 'inline-block' }}></span>
                <span>Belum Dijawab ({totalQuestions - answeredCount})</span>
              </div>
            </div>

            {/* Grid Palette */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {examData.soal.map((q, idx) => {
                const isAnswered = !!answers[q.id_soal];
                const isCurrent = idx === currentIndex;

                let btnBg = '#F1F5F9';
                let btnColor = '#475569';
                let border = '1px solid #CBD5E1';

                if (isCurrent) {
                  btnBg = '#2563EB';
                  btnColor = '#FFFFFF';
                  border = '1px solid #1D4ED8';
                } else if (isAnswered) {
                  btnBg = '#10B981';
                  btnColor = '#FFFFFF';
                  border = '1px solid #059669';
                }

                return (
                  <button
                    key={q.id_soal}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: '42px',
                      borderRadius: '8px',
                      border: border,
                      backgroundColor: btnBg,
                      color: btnColor,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <button
              className="btn btn-success"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem', borderRadius: '10px' }}
              onClick={handleConfirmSubmit}
            >
              <Send size={16} />
              <span>Selesai & Kumpulkan</span>
            </button>
          </div>
        </div>
      </main>

      {/* CONFIRMATION SUBMIT MODAL (Use Case 1.2.4) */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Konfirmasi Selesai Ujian
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
              Apakah Anda yakin ingin menyelesaikan dan mengumpulkan seluruh jawaban ujian sekarang?
            </p>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Terjawab:</span>
                <strong style={{ fontSize: '1.2rem', color: '#059669' }}>{answeredCount}</strong> / {totalQuestions}
              </div>
              <div style={{ borderLeft: '1px solid #CBD5E1' }}></div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Belum Dijawab:</span>
                <strong style={{ fontSize: '1.2rem', color: totalQuestions - answeredCount > 0 ? '#DC2626' : '#64748B' }}>
                  {totalQuestions - answeredCount}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px' }}
                onClick={() => setShowConfirmModal(false)}
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                className="btn btn-success"
                style={{ flex: 1, padding: '12px' }}
                onClick={() => {
                  setShowConfirmModal(false);
                  executeSubmit('Selesai');
                }}
              >
                Kumpulkan Jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuangUjian;

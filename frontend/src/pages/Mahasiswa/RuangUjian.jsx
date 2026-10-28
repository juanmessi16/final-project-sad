import { useState, useEffect, useRef, useCallback } from 'react';
import { getExamSessionData, autoSaveAnswer, recordViolation, submitExamFinal } from '../../services/storage';

const RuangUjian = ({ idSesi, onExamCompleted }) => {
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [violations, setViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [alertBanner, setAlertBanner] = useState({ show: false, text: '' });
  const [autoSaveStatus, setAutoSaveStatus] = useState('✓ Jawaban tersimpan otomatis');
  const [isLocked, setIsLocked] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  const isExamActive = useRef(true);
  const timeLeftRef = useRef(3600);

  // Inisialisasi Sesi Ujian
  useEffect(() => {
    const data = getExamSessionData(idSesi);
    if (!data) return;

    setExamData(data);
    setAnswers(data.jawaban_tersimpan || {});
    setTimeLeft(data.sesi.sisa_waktu);
    timeLeftRef.current = data.sesi.sisa_waktu;
    setViolations(data.sesi.jumlah_peringatan);
    setMaxViolations(data.ujian.batas_toleransi_pelanggaran || 3);

    if (data.sesi.status_ujian === 'Dikunci Paksa') {
      setIsLocked(true);
      isExamActive.current = false;
    }
  }, [idSesi]);

  // Fungsi Submit Ujian
  const executeSubmit = useCallback((status = 'Selesai') => {
    isExamActive.current = false;
    const receipt = submitExamFinal(idSesi, answers, status);
    setSubmittedReceipt(receipt);
  }, [idSesi, answers]);

  // Handle Pelanggaran Anti-Curang
  const handleViolation = useCallback((jenis) => {
    if (!isExamActive.current) return;

    const res = recordViolation(idSesi, jenis);
    if (!res) return;

    setViolations(res.jumlah_peringatan);

    // Tampilkan Peringatan Visual (Use Case 1.2.17)
    setAlertBanner({
      show: true,
      text: `⚠️ PERINGATAN: Terdeteksi '${jenis}'! (Pelanggaran ke-${res.jumlah_peringatan} dari ${res.batas_toleransi})`
    });

    setTimeout(() => {
      setAlertBanner(prev => ({ ...prev, show: false }));
    }, 4000);

    // Kunci Sesi Paksa jika melewati batas toleransi (Use Case 1.2.18)
    if (res.kunci_paksa) {
      isExamActive.current = false;
      setIsLocked(true);
    }
  }, [idSesi]);

  // Timer Hitung Mundur Real-time (Use Case 1.2.13)
  useEffect(() => {
    if (isLocked || submittedReceipt) return;

    const timer = setInterval(() => {
      if (!isExamActive.current) return;

      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next <= 0) {
          clearInterval(timer);
          alert('Waktu ujian telah habis! Sistem akan secara otomatis mengirimkan jawaban Anda.');
          executeSubmit('Disubmit Otomatis'); // Use Case 1.2.16
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, submittedReceipt, executeSubmit]);

  // Setup Event Anti-Curang (Use Case 1.2.14 & 1.2.15)
  useEffect(() => {
    if (isLocked || submittedReceipt) return;

    // 1. Deteksi Perpindahan Tab / Kehilangan Fokus Window (Use Case 1.2.14)
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

    // 2. Blokir Copy, Paste, Cut & Context Menu (Use Case 1.2.15)
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

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleViolation, isLocked, submittedReceipt]);

  // Handler Perubahan Jawaban (Auto-Save 1.2.12)
  const handleOptionSelect = (idSoal, pilihan) => {
    const updated = { ...answers, [idSoal]: pilihan };
    setAnswers(updated);
    setAutoSaveStatus('Menyimpan jawaban...');

    autoSaveAnswer(idSesi, idSoal, pilihan, timeLeftRef.current);
    setAutoSaveStatus(`✓ Tersimpan otomatis (${new Date().toLocaleTimeString()})`);
  };

  // Konfirmasi Submit Manual (Use Case 1.2.4)
  const handleConfirmSubmit = () => {
    const totalSoal = examData.soal.length;
    const answeredCount = Object.values(answers).filter(Boolean).length;

    const conf = window.confirm(
      `Apakah Anda yakin ingin menyelesaikan ujian?\n` +
      `Soal terjawab: ${answeredCount} dari ${totalSoal} soal.`
    );
    if (conf) {
      executeSubmit('Selesai');
    }
  };

  if (!examData) {
    return <div style={{ textAlign: 'center', marginTop: '80px', color: 'var(--text-muted)' }}>Memuat Sesi Ujian...</div>;
  }

  // TAMPILAN SESI DIKUNCI PAKSA (Use Case 1.2.18)
  if (isLocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '540px', textAlign: 'center', borderColor: 'var(--danger)', borderWidth: '2px' }}>
          <h2 style={{ color: 'var(--danger)', fontSize: '1.6rem', marginBottom: '12px' }}>🔒 SESI UJIAN DIKUNCI PAKSA</h2>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Akses ujian Anda telah dihentikan secara otomatis oleh <strong>Sistem Anti-Curang</strong> karena melampaui batas toleransi pelanggaran ({maxViolations} kali).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Jawaban terakhir Anda telah otomatis tersimpan di server. Insiden ini dicatat ke log pelanggaran untuk ditinjau oleh Dosen Pengampu.
          </p>
          <button className="btn btn-primary" onClick={onExamCompleted}>
            Kembali ke Portal Mahasiswa
          </button>
        </div>
      </div>
    );
  }

  // TAMPILAN BUKTI PENGIRIMAN UJIAN (Use Case 1.2.19)
  if (submittedReceipt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '540px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: '8px' }}>
            ✅ BUKTI PENGIRIMAN UJIAN RESMI
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Jawaban Anda telah berhasil tersimpan permanen di database sistem SiLab.
          </p>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px dashed var(--border)', borderRadius: '6px', padding: '18px', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.8', marginBottom: '24px' }}>
            <div><strong>ID Bukti         :</strong> {submittedReceipt.id_bukti}</div>
            <div><strong>ID Sesi          :</strong> {submittedReceipt.id_sesi}</div>
            <div><strong>Waktu Pengiriman :</strong> {submittedReceipt.waktu_pengiriman}</div>
            <div><strong>Status Pengiriman:</strong> <span className="badge badge-success">{submittedReceipt.status_pengiriman}</span></div>
            <div><strong>Skor Sementara   :</strong> {submittedReceipt.total_nilai} / 100</div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onExamCompleted}>
            Kembali ke Portal Mahasiswa
          </button>
        </div>
      </div>
    );
  }

  // Format Timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentSoal = examData.soal[currentIndex];

  return (
    <div className="no-select" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Banner Peringatan Pelanggaran Visual */}
      {alertBanner.show && (
        <div className="alert-banner">
          {alertBanner.text}
        </div>
      )}

      {/* Header Ruang Ujian */}
      <header className="nav-header" style={{ backgroundColor: '#0F172A' }}>
        <h1>📝 {examData.ujian.nama_ujian}</h1>
        <div className="user-badge">
          <span className={`badge ${violations > 0 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            Pelanggaran: {violations} / {maxViolations}
          </span>
          <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 'bold', color: timeLeft < 300 ? '#EF4444' : '#38BDF8' }}>
            Sisa Waktu: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </header>

      {/* Konten Utama Pengerjaan Ujian */}
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '20px', flex: 1, paddingBottom: '30px' }}>
        {/* Kolom Kiri: Pertanyaan dan Opsi Jawaban */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--primary-dark)', fontSize: '1.1rem' }}>
                Soal Nomor {currentIndex + 1} dari {examData.soal.length}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontStyle: 'italic' }}>
                {autoSaveStatus}
              </span>
            </div>

            <p style={{ fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '24px', color: 'var(--text)' }}>
              {currentSoal.pertanyaan}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentSoal.opsi_jawaban.map((opsi, idx) => {
                const isSelected = answers[currentSoal.id_soal] === opsi;
                return (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name={`soal_${currentSoal.id_soal}`}
                      value={opsi}
                      checked={isSelected}
                      onChange={() => handleOptionSelect(currentSoal.id_soal, opsi)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.95rem', color: isSelected ? 'var(--primary-dark)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                      {opsi}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigasi Sebelumnya / Selanjutnya */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
            >
              ◀ Sebelumnya
            </button>
            <button
              className="btn btn-primary"
              disabled={currentIndex === examData.soal.length - 1}
              onClick={() => setCurrentIndex(prev => Math.min(examData.soal.length - 1, prev + 1))}
              style={{ opacity: currentIndex === examData.soal.length - 1 ? 0.5 : 1 }}
            >
              Selanjutnya ▶
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Kisi Nomor Soal & Tombol Selesai */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              Daftar Soal
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {examData.soal.map((q, idx) => {
                const isAnswered = !!answers[q.id_soal];
                const isCurrent = idx === currentIndex;

                let btnBg = '#E2E8F0';
                let btnColor = '#0F172A';

                if (isCurrent) {
                  btnBg = 'var(--primary)';
                  btnColor = '#FFFFFF';
                } else if (isAnswered) {
                  btnBg = 'var(--success)';
                  btnColor = '#FFFFFF';
                }

                return (
                  <button
                    key={q.id_soal}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: '38px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: btnBg,
                      color: btnColor,
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-success"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '20px' }}
            onClick={handleConfirmSubmit}
          >
            💾 Selesai & Kirim
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuangUjian;

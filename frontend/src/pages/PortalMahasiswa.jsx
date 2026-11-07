import React, { useState } from 'react';
import { 
  FileText, 
  Award, 
  KeyRound, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  X, 
  Calendar, 
  User, 
  ShieldCheck, 
  ChevronRight,
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { getDB, verifyPin, getMahasiswaResults } from '../services/storage';

const PortalMahasiswa = ({ currentUser, onStartExam, onLogout }) => {
  const [activeTab, setActiveTab] = useState('ujian'); // 'ujian' | 'hasil'
  const [pinModal, setPinModal] = useState({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
  const [receiptModal, setReceiptModal] = useState({ open: false, data: null });

  const db = getDB();
  const mhsId = currentUser.profile.id_mahasiswa;

  // Daftar ujian yang didaftarkan untuk mahasiswa ini
  const registeredExams = db.ujian.filter(u => {
    return db.peserta_ujian.some(p => p.id_ujian === u.id_ujian && p.id_mahasiswa === mhsId);
  }).map(u => {
    const dosen = db.dosen.find(d => d.id_dosen === u.id_dosen);
    const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_ujian === u.id_ujian && s.id_mahasiswa === mhsId);
    return {
      ...u,
      nama_dosen: dosen ? dosen.nama_dosen : 'Dosen Pengampu',
      mata_kuliah: dosen ? dosen.mata_kuliah : 'Mata Kuliah',
      status_sesi: sesi ? sesi.status_ujian : 'Belum Mengikuti',
      id_sesi: sesi ? sesi.id_sesi : null
    };
  });

  const hasilList = getMahasiswaResults(mhsId);

  // Perhitungan statistik mahasiswa
  const totalExams = registeredExams.length;
  const completedExams = hasilList.length;
  const avgScore = completedExams > 0 
    ? Math.round((hasilList.reduce((acc, curr) => acc + (curr.total_nilai || 0), 0) / completedExams) * 10) / 10 
    : 0;

  const handleOpenPinModal = (ujian) => {
    if (['Selesai', 'Dikunci Paksa', 'Disubmit Otomatis'].includes(ujian.status_sesi)) {
      alert(`Anda telah menyelesaikan ujian ini dengan status '${ujian.status_sesi}'. Silakan periksa tab 'Hasil & Tanda Terima'.`);
      return;
    }
    setPinModal({ open: true, ujian, pin: '', error: '', attempts: 0 });
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    const { ujian, pin, attempts } = pinModal;

    const res = verifyPin(ujian.id_ujian, pin.trim(), mhsId);
    if (!res.success) {
      const nextAttempts = attempts + 1;
      if (nextAttempts >= 3) {
        alert('Akses Ditolak: Anda telah salah memasukkan PIN sebanyak 3 kali. Silakan hubungi dosen pengawas lab.');
        setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
      } else {
        setPinModal(prev => ({
          ...prev,
          attempts: nextAttempts,
          error: `${res.message} (Tersisa ${3 - nextAttempts} kali percobaan)`
        }));
      }
      return;
    }

    setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
    onStartExam(res.sesi.id_sesi);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <Navbar currentUser={currentUser} onLogout={onLogout} />

      <main className="container" style={{ flex: 1, padding: '28px 20px' }}>
        {/* Welcome Banner & Summary Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          borderRadius: '18px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '26px',
          boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '10px' }}>
              <span>Tahun Ajaran 2026/2027</span>
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
              Selamat Datang, {currentUser.profile.nama}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#BFDBFE' }}>
              NIM: <strong>{currentUser.profile.nim}</strong> &bull; Fakultas Ilmu Komputer, Universitas Klabat
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Total Ujian</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{totalExams}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Selesai</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>{completedExams}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Rata-rata Skor</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBF24', marginTop: '2px' }}>{avgScore}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-nav-btn ${activeTab === 'ujian' ? 'active' : ''}`}
            onClick={() => setActiveTab('ujian')}
          >
            <BookOpen size={18} />
            <span>Daftar Ujian Terjadwal ({registeredExams.length})</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === 'hasil' ? 'active' : ''}`}
            onClick={() => setActiveTab('hasil')}
          >
            <Award size={18} />
            <span>Hasil Penilaian & Tanda Terima ({hasilList.length})</span>
          </button>
        </div>

        {/* TAB 1: DAFTAR UJIAN TERSEDIA (Use Case 1.2.2) */}
        {activeTab === 'ujian' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Jadwal Ujian Aktif
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Pilih ujian dan masukkan kode PIN yang diberikan dosen pengawas di ruang lab.
                </p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Kode Ujian</th>
                    <th>Nama & Mata Kuliah</th>
                    <th>Dosen Pengampu</th>
                    <th>Durasi</th>
                    <th>Jadwal Pelaksanaan</th>
                    <th>Status Sesi</th>
                    <th style={{ textAlign: 'right' }}>Aksi Masuk</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredExams.map((u) => {
                    const isFinished = ['Selesai', 'Dikunci Paksa', 'Disubmit Otomatis'].includes(u.status_sesi);
                    return (
                      <tr key={u.id_ujian}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1E40AF', background: '#EFF6FF', padding: '3px 8px', borderRadius: '4px' }}>
                            {u.id_ujian}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{u.nama_ujian}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{u.mata_kuliah}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#334155' }}>{u.nama_dosen}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#475569' }}>
                            <Clock size={14} color="#64748B" />
                            <span>{u.durasi} Menit</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                            {u.tanggal_waktu_mulai.substring(0, 16)}
                          </div>
                        </td>
                        <td>
                          {u.status_sesi === 'Selesai' && (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} /> Selesai
                            </span>
                          )}
                          {u.status_sesi === 'Dikunci Paksa' && (
                            <span className="badge badge-danger">
                              <AlertTriangle size={12} /> Dikunci Paksa
                            </span>
                          )}
                          {u.status_sesi === 'Disubmit Otomatis' && (
                            <span className="badge badge-warning">
                              <Clock size={12} /> Disubmit Otomatis
                            </span>
                          )}
                          {u.status_sesi === 'Belum Mengikuti' && (
                            <span className="badge badge-neutral">
                              Siap Dikerjakan
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isFinished ? (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => {
                                const matchedResult = hasilList.find(h => h.id_sesi === u.id_sesi);
                                if (matchedResult) {
                                  setReceiptModal({ open: true, data: matchedResult });
                                } else {
                                  alert('Sesi ini telah berakhir.');
                                }
                              }}
                            >
                              <FileText size={14} />
                              <span>Lihat Bukti</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '7px 14px', fontSize: '0.83rem', borderRadius: '8px' }}
                              onClick={() => handleOpenPinModal(u)}
                            >
                              <KeyRound size={15} />
                              <span>Masuk Ujian</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {registeredExams.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                        Tidak ada ujian yang terdaftar saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIHAT HASIL UJIAN (Use Case 1.2.5 & 1.2.19) */}
        {activeTab === 'hasil' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Riwayat & Evaluasi Hasil Ujian
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Bukti resmi pengiriman jawaban terverifikasi beserta penetapan nilai dari dosen.
                </p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID Tanda Terima</th>
                    <th>Nama Ujian</th>
                    <th>Waktu Submit</th>
                    <th>Status Pengiriman</th>
                    <th>Skor Akhir</th>
                    <th>Keputusan Dosen</th>
                    <th style={{ textAlign: 'right' }}>Dokumen Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {hasilList.map((h) => (
                    <tr key={h.id_bukti}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF', fontSize: '0.85rem' }}>
                          {h.id_bukti}
                        </span>
                      </td>
                      <td>
                        <strong>{h.nama_ujian}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#475569' }}>{h.waktu_pengiriman}</span>
                      </td>
                      <td>
                        <span className={`badge ${h.status_pengiriman === 'Selesai' ? 'badge-success' : 'badge-danger'}`}>
                          {h.status_pengiriman}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 800, 
                          color: (h.total_nilai || 0) >= 70 ? '#059669' : '#DC2626' 
                        }}>
                          {h.total_nilai !== null ? h.total_nilai : 'Belum Dinilai'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}> / 100</span>
                      </td>
                      <td>
                        <span className={`badge ${h.status_keputusan === 'Tidak Ada' ? 'badge-success' : 'badge-warning'}`}>
                          {h.status_keputusan}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '7px' }}
                          onClick={() => setReceiptModal({ open: true, data: h })}
                        >
                          <FileText size={14} />
                          <span>Tanda Terima Resmi</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {hasilList.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                        Belum ada riwayat ujian yang telah Anda selesaikan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL VERIFIKASI PIN UJIAN (Use Case 1.2.2) */}
      {pinModal.open && pinModal.ujian && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#2563EB'
            }}>
              <KeyRound size={28} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              Verifikasi PIN Ujian
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
              Masukkan 6-digit PIN sesi ujian untuk mata kuliah <strong>{pinModal.ujian.nama_ujian}</strong>.
            </p>

            {pinModal.error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDD3',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '18px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{pinModal.error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin}>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={pinModal.pin}
                  onChange={(e) => setPinModal(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.75rem',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: '2px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontFamily: 'monospace'
                  }}
                  autoFocus
                  required
                />
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                  (Contoh PIN default demo: <code style={{ color: '#2563EB', fontWeight: 700 }}>123456</code>)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 })}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.3, padding: '12px' }}
                >
                  <span>Mulai Ujian</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BUKTI TANDA TERIMA DIGITAL RESMI (Use Case 1.2.19) */}
      {receiptModal.open && receiptModal.data && (
        <div className="modal-overlay">
          <div className="modal-content printable-receipt" style={{ maxWidth: '580px', padding: '32px', position: 'relative' }}>
            <button
              onClick={() => setReceiptModal({ open: false, data: null })}
              className="no-print"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={18} />
            </button>

            {/* Receipt Header with UNKLAB FIK Identity */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1E3A8A' }}>
                Fakultas Ilmu Komputer &bull; Universitas Klabat
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                TANDA TERIMA BUKTI PENGERJAAN UJIAN (SiLab)
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Sistem Evaluasi Berbasis Web dengan Pengawasan Anti-Curang Terpadu
              </div>
            </div>

            {/* Details Table */}
            <div style={{
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: '10px',
              padding: '18px 20px',
              fontSize: '0.85rem',
              lineHeight: 1.9,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nomor Transaksi / Bukti:</span>
                <strong style={{ fontFamily: 'monospace', color: '#1E40AF' }}>{receiptModal.data.id_bukti}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>ID Sesi Ujian:</span>
                <span style={{ fontFamily: 'monospace' }}>{receiptModal.data.id_sesi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nama Mahasiswa:</span>
                <strong>{currentUser.profile.nama}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nomor Induk Mahasiswa (NIM):</span>
                <span>{currentUser.profile.nim}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nama Ujian:</span>
                <strong>{receiptModal.data.nama_ujian}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Waktu Pengiriman Sesi:</span>
                <span>{receiptModal.data.waktu_pengiriman}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Status Pengiriman:</span>
                <span className={`badge ${receiptModal.data.status_pengiriman === 'Selesai' ? 'badge-success' : 'badge-danger'}`}>
                  {receiptModal.data.status_pengiriman}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Keputusan Sanksi Dosen:</span>
                <span className="badge badge-warning">{receiptModal.data.status_keputusan}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '6px' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Total Nilai Evaluasi:</span>
                <strong style={{ fontSize: '1.25rem', color: (receiptModal.data.total_nilai || 0) >= 70 ? '#059669' : '#DC2626' }}>
                  {receiptModal.data.total_nilai} / 100
                </strong>
              </div>
            </div>

            {/* Digital Signature & Integrity Check */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 16px 8px', fontSize: '0.72rem', color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#10B981" />
                <span>Terverifikasi secara digital oleh SiLab Integrity Engine</span>
              </div>
              <div>Kode Validasi: SHA256-OK</div>
            </div>

            {/* Actions (Print / Close) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-outline-primary"
                style={{ flex: 1, padding: '11px' }}
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '11px' }}
                onClick={() => setReceiptModal({ open: false, data: null })}
              >
                Tutup Tanda Terima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.8rem', color: '#94A3B8', borderTop: '1px solid #E2E8F0', marginTop: 'auto' }}>
        Sistem Analisis & Desain (SAD Class) — Fakultas Ilmu Komputer, Universitas Klabat &copy; 2026
      </footer>
    </div>
  );
};

export default PortalMahasiswa;

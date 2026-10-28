import { useState } from 'react';
import { getDB, verifyPin, getMahasiswaResults } from '../services/storage';

const PortalMahasiswa = ({ currentUser, onStartExam, onLogout }) => {
  const [activeTab, setActiveTab] = useState('ujian');
  const [pinModal, setPinModal] = useState({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
  const [receiptModal, setReceiptModal] = useState({ open: false, data: null });

  const db = getDB();
  const mhsId = currentUser.profile.id_mahasiswa;

  // Ambil daftar ujian yang didaftarkan untuk mahasiswa ini
  const registeredExams = db.ujian.filter(u => {
    return db.peserta_ujian.some(p => p.id_ujian === u.id_ujian && p.id_mahasiswa === mhsId);
  }).map(u => {
    const dosen = db.dosen.find(d => d.id_dosen === u.id_dosen);
    const sesi = db.sesi_ujian_mahasiswa.find(s => s.id_ujian === u.id_ujian && s.id_mahasiswa === mhsId);
    return {
      ...u,
      nama_dosen: dosen ? dosen.nama_dosen : 'Dosen Pengampu',
      status_sesi: sesi ? sesi.status_ujian : 'Belum Mengikuti',
      id_sesi: sesi ? sesi.id_sesi : null
    };
  });

  const hasilList = getMahasiswaResults(mhsId);

  const handleOpenPinModal = (ujian) => {
    if (['Selesai', 'Dikunci Paksa', 'Disubmit Otomatis'].includes(ujian.status_sesi)) {
      alert(`Anda telah menyelesaikan ujian ini dengan status '${ujian.status_sesi}'.`);
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
        alert('Anda telah salah memasukkan PIN sebanyak 3 kali. Akses ujian ditolak.');
        setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
      } else {
        setPinModal(prev => ({
          ...prev,
          attempts: nextAttempts,
          error: `${res.message} (Percobaan tersisa: ${3 - nextAttempts})`
        }));
      }
      return;
    }

    setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 });
    onStartExam(res.sesi.id_sesi);
  };

  return (
    <div>
      {/* Top Navbar */}
      <header className="nav-header">
        <h1>🏛️ SiLab Exam | Portal Mahasiswa</h1>
        <div className="user-badge">
          <span><strong>{currentUser.profile.nama}</strong> (NIM: {currentUser.profile.nim})</span>
          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onLogout}>
            Keluar (Logout)
          </button>
        </div>
      </header>

      <div className="container">
        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'ujian' ? 'active' : ''}`}
            onClick={() => setActiveTab('ujian')}
          >
            📝 Daftar Ujian Tersedia
          </button>
          <button
            className={`tab-btn ${activeTab === 'hasil' ? 'active' : ''}`}
            onClick={() => setActiveTab('hasil')}
          >
            📊 Lihat Hasil Ujian & Tanda Terima
          </button>
        </div>

        {/* Tab 1: Daftar Ujian */}
        {activeTab === 'ujian' && (
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Daftar Ujian yang Anda Ikuti</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pilih ujian dan masukkan PIN unik yang diberikan dosen untuk memulai sesi ujian.
            </p>

            <table>
              <thead>
                <tr>
                  <th>ID Ujian</th>
                  <th>Nama Ujian</th>
                  <th>Dosen Pengampu</th>
                  <th>Durasi</th>
                  <th>Jadwal Mulai</th>
                  <th>Status Sesi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {registeredExams.map((u) => (
                  <tr key={u.id_ujian}>
                    <td><code>{u.id_ujian}</code></td>
                    <td><strong>{u.nama_ujian}</strong></td>
                    <td>{u.nama_dosen}</td>
                    <td>{u.durasi} Menit</td>
                    <td>{u.tanggal_waktu_mulai}</td>
                    <td>
                      <span className={`badge ${
                        u.status_sesi === 'Selesai' ? 'badge-success' :
                        u.status_sesi === 'Dikunci Paksa' ? 'badge-danger' :
                        u.status_sesi === 'Disubmit Otomatis' ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {u.status_sesi}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleOpenPinModal(u)}
                      >
                        🔑 Masuk Ujian
                      </button>
                    </td>
                  </tr>
                ))}
                {registeredExams.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada ujian yang terdaftar saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Lihat Hasil Ujian */}
        {activeTab === 'hasil' && (
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Riwayat Ujian & Hasil Penilaian</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Daftar ujian yang telah Anda selesaikan beserta skor, tanda terima pengiriman, dan status keputusan sanksi.
            </p>

            <table>
              <thead>
                <tr>
                  <th>ID Bukti</th>
                  <th>Nama Ujian</th>
                  <th>Waktu Pengiriman</th>
                  <th>Status Pengiriman</th>
                  <th>Total Nilai</th>
                  <th>Keputusan Sanksi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {hasilList.map((h) => (
                  <tr key={h.id_bukti}>
                    <td><code>{h.id_bukti}</code></td>
                    <td><strong>{h.nama_ujian}</strong></td>
                    <td>{h.waktu_pengiriman}</td>
                    <td>
                      <span className={`badge ${h.status_pengiriman === 'Selesai' ? 'badge-success' : 'badge-danger'}`}>
                        {h.status_pengiriman}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: h.total_nilai >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                        {h.total_nilai !== null ? h.total_nilai : 'Belum Dinilai'}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${h.status_keputusan === 'Tidak Ada' ? 'badge-success' : 'badge-warning'}`}>
                        {h.status_keputusan}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setReceiptModal({ open: true, data: h })}
                      >
                        📄 Lihat Bukti
                      </button>
                    </td>
                  </tr>
                ))}
                {hasilList.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Belum ada riwayat ujian yang diselesaikan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VERIFIKASI PIN UJIAN (Use Case 1.2.2 & Sequence 3.2) */}
      {pinModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', textAlign: 'center', position: 'relative' }}>
            <h3 style={{ color: 'var(--primary-dark)', fontSize: '1.3rem', marginBottom: '4px' }}>Verifikasi PIN Ujian</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ujian: <strong>{pinModal.ujian.nama_ujian}</strong>
            </p>

            {pinModal.error && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '14px' }}>
                ⚠️ {pinModal.error}
              </div>
            )}

            <form onSubmit={handleVerifyPin}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>Masukkan 6-Digit PIN Ujian:</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px', fontWeight: 'bold' }}
                  value={pinModal.pin}
                  onChange={(e) => setPinModal(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="123456"
                  autoFocus
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  (Contoh PIN default sistem: <code>123456</code>)
                </small>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setPinModal({ open: false, ujian: null, pin: '', error: '', attempts: 0 })}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Verifikasi & Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TANDA TERIMA BUKTI UJIAN (Use Case 1.2.19 & Sequence 3.19) */}
      {receiptModal.open && receiptModal.data && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--success)', fontSize: '1.4rem', marginBottom: '8px' }}>
              ✅ TANDA TERIMA PENGIRIMAN UJIAN
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Bukti resmi pengiriman jawaban ke database SiLab Exam System.
            </p>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px dashed var(--border)', borderRadius: '6px', padding: '16px', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.8', marginBottom: '20px' }}>
              <div><strong>ID Bukti         :</strong> {receiptModal.data.id_bukti}</div>
              <div><strong>ID Sesi          :</strong> {receiptModal.data.id_sesi}</div>
              <div><strong>Nama Ujian       :</strong> {receiptModal.data.nama_ujian}</div>
              <div><strong>Waktu Pengiriman :</strong> {receiptModal.data.waktu_pengiriman}</div>
              <div><strong>Status Kirim     :</strong> <span className="badge badge-success">{receiptModal.data.status_pengiriman}</span></div>
              <div><strong>Total Nilai      :</strong> {receiptModal.data.total_nilai} / 100</div>
              <div><strong>Status Keputusan :</strong> {receiptModal.data.status_keputusan}</div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setReceiptModal({ open: false, data: null })}
            >
              Tutup Tanda Terima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalMahasiswa;

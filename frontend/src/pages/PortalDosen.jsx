import { useState } from 'react';
import {
  getDB,
  addSoalToBank,
  deleteSoalFromBank,
  createUjianDosen,
  removePesertaFromUjian,
  applyViolationSanction
} from '../services/storage';

const PortalDosen = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('bank');
  const [dbState, setDbState] = useState(getDB());

  // Form states
  const [newSoal, setNewSoal] = useState({ pertanyaan: '', oa: '', ob: '', oc: '', od: '', kunci: 'A' });
  const [newUjian, setNewUjian] = useState({
    nama: 'Ujian Akhir Semester (UAS) SAD',
    durasi: 60,
    pin: '654321',
    toleransi: 3,
    selectedSoal: []
  });
  const [selectedLogSession, setSelectedLogSession] = useState(null);
  const [sanctionDecision, setSanctionDecision] = useState('Peringatan');

  const dosenId = currentUser.profile.id_dosen;

  const refreshDB = () => {
    setDbState(getDB());
  };

  // 1. Tambah Soal ke Bank Soal (Use Case 1.2.6)
  const handleAddSoal = (e) => {
    e.preventDefault();
    if (!newSoal.pertanyaan.trim() || !newSoal.oa.trim() || !newSoal.ob.trim()) {
      alert('Pertanyaan dan minimal Opsi A & B wajib diisi!');
      return;
    }

    const opsi = [newSoal.oa.trim(), newSoal.ob.trim()];
    if (newSoal.oc.trim()) opsi.push(newSoal.oc.trim());
    if (newSoal.od.trim()) opsi.push(newSoal.od.trim());

    const kunciMap = { A: newSoal.oa.trim(), B: newSoal.ob.trim(), C: newSoal.oc.trim(), D: newSoal.od.trim() };
    const kunciVal = kunciMap[newSoal.kunci] || newSoal.oa.trim();

    addSoalToBank(dosenId, newSoal.pertanyaan.trim(), opsi, kunciVal);
    alert('Soal baru berhasil disimpan ke Bank Soal!');
    setNewSoal({ pertanyaan: '', oa: '', ob: '', oc: '', od: '', kunci: 'A' });
    refreshDB();
  };

  // 2. Hapus Soal (Use Case 1.2.6)
  const handleDeleteSoal = (idSoal) => {
    if (window.confirm(`Hapus soal ${idSoal} dari Bank Soal?`)) {
      deleteSoalFromBank(idSoal);
      refreshDB();
    }
  };

  // 3. Buat Sesi Ujian Baru (Use Case 1.2.7)
  const handleCreateUjian = (e) => {
    e.preventDefault();
    if (!newUjian.nama.trim() || !newUjian.pin.trim() || newUjian.selectedSoal.length === 0) {
      alert('Lengkapi seluruh isian dan pilih minimal 1 soal!');
      return;
    }

    createUjianDosen(
      dosenId,
      newUjian.nama.trim(),
      newUjian.durasi,
      newUjian.pin.trim(),
      newUjian.toleransi,
      newUjian.selectedSoal
    );
    alert(`Sesi Ujian '${newUjian.nama}' berhasil dibuat dan dijadwalkan!\nPIN Ujian: ${newUjian.pin}`);
    refreshDB();
    setActiveTab('bank');
  };

  // 4. Hapus Peserta Ujian (Use Case 1.2.8)
  const handleDeletePeserta = (idUjian, idMhs) => {
    if (window.confirm('Hapus mahasiswa ini dari daftar peserta ujian?')) {
      removePesertaFromUjian(idUjian, idMhs);
      refreshDB();
    }
  };

  // 5. Terapkan Keputusan Sanksi (Use Case 1.2.10)
  const handleApplySanction = () => {
    if (!selectedLogSession) return;
    const res = applyViolationSanction(selectedLogSession.id_sesi, sanctionDecision);
    if (!res) {
      alert('Gagal menerapkan keputusan. Mahasiswa belum menyelesaikan ujian.');
      return;
    }
    alert(`Keputusan '${sanctionDecision}' berhasil diterapkan!\nNilai akhir sesi diperbarui menjadi: ${res.total_nilai}`);
    setSelectedLogSession(null);
    refreshDB();
  };

  // Filter Data Sesuai Dosen
  const bankSoal = dbState.bank_soal.find(b => b.id_dosen === dosenId);
  const mySoal = bankSoal ? dbState.soal.filter(s => s.id_bank_soal === bankSoal.id_bank_soal) : [];
  const myUjian = dbState.ujian.filter(u => u.id_dosen === dosenId);

  // Ambil semua log pelanggaran untuk ujian dosen ini
  const myUjianIds = myUjian.map(u => u.id_ujian);
  const mySessions = dbState.sesi_ujian_mahasiswa.filter(s => myUjianIds.includes(s.id_ujian));
  const mySessionIds = mySessions.map(s => s.id_sesi);

  const myLogs = dbState.log_pelanggaran
    .filter(l => mySessionIds.includes(l.id_sesi))
    .map(l => {
      const sesi = dbState.sesi_ujian_mahasiswa.find(s => s.id_sesi === l.id_sesi);
      const mhs = sesi ? dbState.mahasiswa.find(m => m.id_mahasiswa === sesi.id_mahasiswa) : null;
      const bukti = dbState.bukti_ujian_hasil.find(b => b.id_sesi === l.id_sesi);
      return {
        ...l,
        nama_mhs: mhs ? mhs.nama : 'Mahasiswa',
        nim_mhs: mhs ? mhs.nim : '-',
        status_ujian: sesi ? sesi.status_ujian : '-',
        nilai: bukti ? bukti.total_nilai : null,
        keputusan: bukti ? bukti.status_keputusan : 'Tidak Ada'
      };
    })
    .reverse();

  // Peserta Ujian
  const pesertaList = dbState.peserta_ujian
    .filter(p => myUjianIds.includes(p.id_ujian))
    .map(p => {
      const u = dbState.ujian.find(x => x.id_ujian === p.id_ujian);
      const m = dbState.mahasiswa.find(x => x.id_mahasiswa === p.id_mahasiswa);
      return {
        id_ujian: p.id_ujian,
        nama_ujian: u ? u.nama_ujian : p.id_ujian,
        id_mahasiswa: p.id_mahasiswa,
        nim: m ? m.nim : '-',
        nama: m ? m.nama : '-'
      };
    });

  return (
    <div>
      {/* Top Navbar */}
      <header className="nav-header">
        <h1>🏛️ SiLab Exam | Portal Dosen Pengampu</h1>
        <div className="user-badge">
          <span><strong>{currentUser.profile.nama_dosen}</strong> ({currentUser.profile.mata_kuliah})</span>
          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onLogout}>
            Keluar (Logout)
          </button>
        </div>
      </header>

      <div className="container">
        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            📚 Kelola Bank Soal
          </button>
          <button
            className={`tab-btn ${activeTab === 'atur' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('atur');
              setNewUjian(prev => ({
                ...prev,
                selectedSoal: mySoal.map(s => s.id_soal)
              }));
            }}
          >
            ⚙️ Atur Ujian
          </button>
          <button
            className={`tab-btn ${activeTab === 'peserta' ? 'active' : ''}`}
            onClick={() => setActiveTab('peserta')}
          >
            👥 Kelola Peserta Ujian
          </button>
          <button
            className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            🚨 Log Pelanggaran & Sanksi
          </button>
        </div>

        {/* TAB 1: KELOLA BANK SOAL (Use Case 1.2.6) */}
        {activeTab === 'bank' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
            <div className="card">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Daftar Soal di Bank Soal</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                Kumpulan bank soal untuk mata kuliah <strong>{currentUser.profile.mata_kuliah}</strong>.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Pertanyaan</th>
                    <th>Kunci Jawaban</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mySoal.map((s) => (
                    <tr key={s.id_soal}>
                      <td><code>{s.id_soal}</code></td>
                      <td>{s.pertanyaan}</td>
                      <td><strong style={{ color: 'var(--success)' }}>{s.kunci_jawaban}</strong></td>
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteSoal(s.id_soal)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {mySoal.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Belum ada soal di Bank Soal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Form Buat & Tambah Soal */}
            <div className="card">
              <h2 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--primary-dark)' }}>
                ➕ Tambah Soal Baru
              </h2>
              <form onSubmit={handleAddSoal}>
                <div className="form-group">
                  <label>Pertanyaan Soal:</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={newSoal.pertanyaan}
                    onChange={(e) => setNewSoal({ ...newSoal, pertanyaan: e.target.value })}
                    placeholder="Tuliskan butir soal pertanyaan..."
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi A:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.oa}
                    onChange={(e) => setNewSoal({ ...newSoal, oa: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi B:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.ob}
                    onChange={(e) => setNewSoal({ ...newSoal, ob: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi C (Opsional):</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.oc}
                    onChange={(e) => setNewSoal({ ...newSoal, oc: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi D (Opsional):</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.od}
                    onChange={(e) => setNewSoal({ ...newSoal, od: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Kunci Jawaban yang Benar:</label>
                  <select
                    className="form-control"
                    value={newSoal.kunci}
                    onChange={(e) => setNewSoal({ ...newSoal, kunci: e.target.value })}
                  >
                    <option value="A">Pilihan A</option>
                    <option value="B">Pilihan B</option>
                    <option value="C">Pilihan C</option>
                    <option value="D">Pilihan D</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', marginTop: '6px' }}>
                  Simpan ke Bank Soal
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ATUR UJIAN (Use Case 1.2.7) */}
        {activeTab === 'atur' && (
          <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Atur Konfigurasi Sesi Ujian Baru</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Tetapkan jadwal, PIN ujian, durasi, dan pilih kumpulan soal dari Bank Soal.
            </p>

            <form onSubmit={handleCreateUjian}>
              <div className="form-group">
                <label>Nama Ujian:</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUjian.nama}
                  onChange={(e) => setNewUjian({ ...newUjian, nama: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Durasi Ujian (Menit):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newUjian.durasi}
                    onChange={(e) => setNewUjian({ ...newUjian, durasi: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>PIN Akses Ujian (6 Karakter/Angka):</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUjian.pin}
                    onChange={(e) => setNewUjian({ ...newUjian, pin: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Batas Toleransi Pelanggaran Anti-Curang (Maksimal Peringatan):</label>
                <input
                  type="number"
                  className="form-control"
                  value={newUjian.toleransi}
                  onChange={(e) => setNewUjian({ ...newUjian, toleransi: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Pilih Soal yang Dimasukkan ke Ujian:</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
                  {mySoal.map((s) => {
                    const isChecked = newUjian.selectedSoal.includes(s.id_soal);
                    return (
                      <label key={s.id_soal} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUjian({ ...newUjian, selectedSoal: [...newUjian.selectedSoal, s.id_soal] });
                            } else {
                              setNewUjian({ ...newUjian, selectedSoal: newUjian.selectedSoal.filter(id => id !== s.id_soal) });
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>[{s.id_soal}]</strong> {s.pertanyaan}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
                💾 Simpan & Jadwalkan Ujian
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: KELOLA PESERTA UJIAN (Use Case 1.2.8) */}
        {activeTab === 'peserta' && (
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Kelola Peserta Ujian</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
              Daftar mahasiswa yang berhak mengikuti sesi ujian mata kuliah Anda.
            </p>

            <table>
              <thead>
                <tr>
                  <th>Ujian</th>
                  <th>NIM Mahasiswa</th>
                  <th>Nama Mahasiswa</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pesertaList.map((p, idx) => (
                  <tr key={idx}>
                    <td><strong>{p.nama_ujian}</strong></td>
                    <td>{p.nim}</td>
                    <td>{p.nama}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleDeletePeserta(p.id_ujian, p.id_mahasiswa)}
                      >
                        Hapus Peserta
                      </button>
                    </td>
                  </tr>
                ))}
                {pesertaList.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Belum ada peserta yang terdaftar pada ujian ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: TINJAU LOG & TETAPKAN KEPUTUSAN (Use Case 1.2.9 & 1.2.10) */}
        {activeTab === 'log' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            <div className="card">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Catatan Log Pelanggaran Anti-Curang</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                Klik pada salah satu baris insiden di bawah untuk menetapkan keputusan sanksi terhadap mahasiswa.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Sesi</th>
                    <th>Mahasiswa</th>
                    <th>Jenis Pelanggaran</th>
                    <th>Waktu Kejadian</th>
                    <th>Akumulasi</th>
                    <th>Status Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  {myLogs.map((l) => (
                    <tr
                      key={l.id_log}
                      style={{ cursor: 'pointer', backgroundColor: selectedLogSession?.id_sesi === l.id_sesi ? '#EFF6FF' : 'transparent' }}
                      onClick={() => setSelectedLogSession(l)}
                    >
                      <td><code>{l.id_sesi}</code></td>
                      <td><strong>{l.nama_mhs}</strong> ({l.nim_mhs})</td>
                      <td>
                        <span className="badge badge-danger">{l.jenis_pelanggaran}</span>
                      </td>
                      <td>{l.waktu_kejadian}</td>
                      <td><strong>{l.jumlah_pelanggaran} kali</strong></td>
                      <td>
                        <span className={`badge ${l.status_ujian === 'Dikunci Paksa' ? 'badge-danger' : 'badge-warning'}`}>
                          {l.status_ujian}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Belum ada aktivitas pelanggaran yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Panel Tetapkan Keputusan Pelanggaran (Use Case 1.2.10) */}
            <div className="card">
              <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', color: 'var(--primary-dark)' }}>
                ⚖️ Tetapkan Sanksi Dosen
              </h2>

              {selectedLogSession ? (
                <div>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                    <div>Mahasiswa: <strong>{selectedLogSession.nama_mhs}</strong></div>
                    <div>NIM: <code>{selectedLogSession.nim_mhs}</code></div>
                    <div>ID Sesi: <code>{selectedLogSession.id_sesi}</code></div>
                    <div>Total Pelanggaran: <strong>{selectedLogSession.jumlah_pelanggaran} kali</strong></div>
                  </div>

                  <div className="form-group">
                    <label>Pilihan Keputusan Sanksi:</label>
                    <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sanction"
                        value="Peringatan"
                        checked={sanctionDecision === 'Peringatan'}
                        onChange={(e) => setSanctionDecision(e.target.value)}
                      /> Peringatan Tertulis
                    </label>
                    <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sanction"
                        value="Pengurangan Nilai"
                        checked={sanctionDecision === 'Pengurangan Nilai'}
                        onChange={(e) => setSanctionDecision(e.target.value)}
                      /> Pengurangan Nilai (-20 Poin)
                    </label>
                    <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sanction"
                        value="Diskualifikasi"
                        checked={sanctionDecision === 'Diskualifikasi'}
                        onChange={(e) => setSanctionDecision(e.target.value)}
                      /> Diskualifikasi (Nilai 0)
                    </label>
                  </div>

                  <button
                    className="btn btn-danger"
                    style={{ width: '100%', padding: '10px' }}
                    onClick={handleApplySanction}
                  >
                    Terapkan Sanksi & Perbarui Nilai
                  </button>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '30px 10px' }}>
                  Silakan klik salah satu baris log di tabel untuk menentukan keputusan sanksi.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalDosen;

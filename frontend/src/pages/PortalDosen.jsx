import React, { useState } from 'react';
import { 
  BookOpen, 
  Settings, 
  Users, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  KeyRound, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Gavel, 
  Search, 
  HelpCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  getDB,
  addSoalToBank,
  deleteSoalFromBank,
  createUjianDosen,
  removePesertaFromUjian,
  applyViolationSanction
} from '../services/storage';

const PortalDosen = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('bank'); // 'bank' | 'atur' | 'peserta' | 'log'
  const [dbState, setDbState] = useState(getDB());
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newSoal, setNewSoal] = useState({ pertanyaan: '', oa: '', ob: '', oc: '', od: '', kunci: 'A' });
  const [newUjian, setNewUjian] = useState({
    nama: 'Ujian Akhir Semester (UAS) Sistem Analisis & Desain',
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
    alert('Butir soal baru berhasil ditambahkan ke Bank Soal!');
    setNewSoal({ pertanyaan: '', oa: '', ob: '', oc: '', od: '', kunci: 'A' });
    refreshDB();
  };

  // 2. Hapus Soal dari Bank Soal (Use Case 1.2.6)
  const handleDeleteSoal = (idSoal) => {
    if (window.confirm(`Hapus soal dengan ID ${idSoal} dari Bank Soal?`)) {
      deleteSoalFromBank(idSoal);
      refreshDB();
    }
  };

  // 3. Buat & Jadwalkan Sesi Ujian Baru (Use Case 1.2.7)
  const handleCreateUjian = (e) => {
    e.preventDefault();
    if (!newUjian.nama.trim() || !newUjian.pin.trim() || newUjian.selectedSoal.length === 0) {
      alert('Mohon lengkapi seluruh kolom formulir dan pilih minimal 1 soal dari Bank Soal!');
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

  const handleGeneratePin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewUjian(prev => ({ ...prev, pin: randomPin }));
  };

  // 4. Hapus Peserta Ujian (Use Case 1.2.8)
  const handleDeletePeserta = (idUjian, idMhs) => {
    if (window.confirm('Keluarkan mahasiswa ini dari daftar peserta ujian?')) {
      removePesertaFromUjian(idUjian, idMhs);
      refreshDB();
    }
  };

  // 5. Terapkan Keputusan Sanksi (Use Case 1.2.10)
  const handleApplySanction = () => {
    if (!selectedLogSession) return;
    const res = applyViolationSanction(selectedLogSession.id_sesi, sanctionDecision);
    if (!res) {
      alert('Gagal menerapkan keputusan. Mahasiswa belum menyelesaikan sesi ujian.');
      return;
    }
    alert(`Keputusan sanksi '${sanctionDecision}' berhasil diterapkan!\nNilai akhir sesi mahasiswa diperbarui menjadi: ${res.total_nilai}`);
    setSelectedLogSession(null);
    refreshDB();
  };

  // Filter Data Sesuai Dosen
  const bankSoal = dbState.bank_soal.find(b => b.id_dosen === dosenId);
  const mySoal = bankSoal ? dbState.soal.filter(s => s.id_bank_soal === bankSoal.id_bank_soal) : [];
  const myUjian = dbState.ujian.filter(u => u.id_dosen === dosenId);

  // Ambil semua log pelanggaran untuk ujian dosen ini (Use Case 1.2.9)
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

  // Peserta Ujian (Use Case 1.2.8)
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

  // Filter soal untuk pencarian
  const filteredSoal = mySoal.filter(s => 
    s.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id_soal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      <Navbar currentUser={currentUser} onLogout={onLogout} />

      <main className="container" style={{ flex: 1, padding: '28px 20px' }}>
        {/* Welcome Banner & KPI Dashboard */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)',
          borderRadius: '18px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '26px',
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '10px' }}>
              <span>Portal Akademik Dosen Pengampu</span>
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
              {currentUser.profile.nama_dosen}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#BFDBFE' }}>
              Mata Kuliah: <strong>{currentUser.profile.mata_kuliah}</strong> &bull; Fakultas Ilmu Komputer, Universitas Klabat
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Bank Soal</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{mySoal.length}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Ujian Aktif</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', marginTop: '2px' }}>{myUjian.length}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Peserta Terdaftar</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>{pesertaList.length}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.75rem', color: '#FCA5A5', textTransform: 'uppercase', fontWeight: 700 }}>Pelanggaran Terdeteksi</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>{myLogs.length}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-nav-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <BookOpen size={18} />
            <span>Kelola Bank Soal ({mySoal.length})</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === 'atur' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('atur');
              setNewUjian(prev => ({
                ...prev,
                selectedSoal: mySoal.map(s => s.id_soal)
              }));
            }}
          >
            <Settings size={18} />
            <span>Atur & Jadwalkan Ujian</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === 'peserta' ? 'active' : ''}`}
            onClick={() => setActiveTab('peserta')}
          >
            <Users size={18} />
            <span>Peserta Ujian ({pesertaList.length})</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            <ShieldAlert size={18} />
            <span>Audit Log Pelanggaran & Sanksi ({myLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: KELOLA BANK SOAL (Use Case 1.2.6) */}
        {activeTab === 'bank' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.15fr 400px', gap: '24px' }}>
            {/* Table Questions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Katalog Bank Soal
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Kumpulan soal terdaftar untuk mata kuliah <strong>{currentUser.profile.mata_kuliah}</strong>.
                  </p>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari butir soal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Kode</th>
                      <th>Butir Pertanyaan</th>
                      <th>Kunci Jawaban</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSoal.map((s) => (
                      <tr key={s.id_soal}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#1E40AF', background: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                            {s.id_soal}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                            {s.pertanyaan}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Pilihan Opsi: {s.opsi_jawaban.join(' | ')}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                            <CheckCircle2 size={12} />
                            {s.kunci_jawaban}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                            onClick={() => handleDeleteSoal(s.id_soal)}
                            title="Hapus soal ini"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredSoal.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                          Tidak ada soal yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Tambah Soal Baru */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <Plus size={18} color="#2563EB" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Tambah Soal Baru
                </h3>
              </div>

              <form onSubmit={handleAddSoal}>
                <div className="form-group">
                  <label>Teks Pertanyaan Soal:</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={newSoal.pertanyaan}
                    onChange={(e) => setNewSoal({ ...newSoal, pertanyaan: e.target.value })}
                    placeholder="Tuliskan pertanyaan ujian..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi Jawaban A:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.oa}
                    onChange={(e) => setNewSoal({ ...newSoal, oa: e.target.value })}
                    placeholder="Pilihan A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi Jawaban B:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.ob}
                    onChange={(e) => setNewSoal({ ...newSoal, ob: e.target.value })}
                    placeholder="Pilihan B"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi Jawaban C (Opsional):</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.oc}
                    onChange={(e) => setNewSoal({ ...newSoal, oc: e.target.value })}
                    placeholder="Pilihan C"
                  />
                </div>

                <div className="form-group">
                  <label>Pilihan Opsi Jawaban D (Opsional):</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSoal.od}
                    onChange={(e) => setNewSoal({ ...newSoal, od: e.target.value })}
                    placeholder="Pilihan D"
                  />
                </div>

                <div className="form-group">
                  <label>Tetapkan Kunci Jawaban Benar:</label>
                  <select
                    className="form-control"
                    value={newSoal.kunci}
                    onChange={(e) => setNewSoal({ ...newSoal, kunci: e.target.value })}
                  >
                    <option value="A">Kunci: Pilihan A</option>
                    <option value="B">Kunci: Pilihan B</option>
                    <option value="C">Kunci: Pilihan C</option>
                    <option value="D">Kunci: Pilihan D</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem', borderRadius: '8px', marginTop: '6px' }}
                >
                  <Plus size={16} />
                  <span>Simpan ke Bank Soal</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ATUR UJIAN (Use Case 1.2.7) */}
        {activeTab === 'atur' && (
          <div className="animate-fade-in card" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Konfigurasi Parameter Sesi Ujian Baru
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Tetapkan jadwal, kunci PIN masuk, durasi pengerjaan, dan batas toleransi anti-curang.
              </p>
            </div>

            <form onSubmit={handleCreateUjian}>
              <div className="form-group">
                <label>Nama / Judul Ujian:</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUjian.nama}
                  onChange={(e) => setNewUjian({ ...newUjian, nama: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div className="form-group">
                  <label>Durasi Ujian (Menit):</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    className="form-control"
                    value={newUjian.durasi}
                    onChange={(e) => setNewUjian({ ...newUjian, durasi: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>PIN Akses Ujian (6 Digit):</span>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      🎲 Buat PIN Acak
                    </button>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    style={{ letterSpacing: '4px', fontWeight: 700, fontFamily: 'monospace' }}
                    value={newUjian.pin}
                    onChange={(e) => setNewUjian({ ...newUjian, pin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Batas Toleransi Pelanggaran Anti-Curang (Maks. Peringatan Sebelum Kunci Sesi):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-control"
                    style={{ width: '120px' }}
                    value={newUjian.toleransi}
                    onChange={(e) => setNewUjian({ ...newUjian, toleransi: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    (Standar rekomendasi: <strong>3 kali pelanggaran</strong> sebelum sesi dikunci paksa)
                  </span>
                </div>
              </div>

              {/* Soal Selector */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Pilih Soal dari Bank Soal ({newUjian.selectedSoal.length} Terpilih):</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newUjian.selectedSoal.length === mySoal.length) {
                        setNewUjian({ ...newUjian, selectedSoal: [] });
                      } else {
                        setNewUjian({ ...newUjian, selectedSoal: mySoal.map(s => s.id_soal) });
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {newUjian.selectedSoal.length === mySoal.length ? 'Batal Pilih Semua' : 'Pilih Semua Soal'}
                  </button>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '12px',
                  backgroundColor: '#F8FAFC'
                }}>
                  {mySoal.map((s) => {
                    const isChecked = newUjian.selectedSoal.includes(s.id_soal);
                    return (
                      <label
                        key={s.id_soal}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                          marginBottom: '4px',
                          cursor: 'pointer'
                        }}
                      >
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
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF', marginRight: '6px' }}>
                            [{s.id_soal}]
                          </span>
                          {s.pertanyaan}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '0.98rem', borderRadius: '10px', marginTop: '12px' }}
              >
                <span>Simpan & Buka Sesi Ujian</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: KELOLA PESERTA UJIAN (Use Case 1.2.8) */}
        {activeTab === 'peserta' && (
          <div className="animate-fade-in card">
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Daftar Peserta Ujian Terdaftar
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Mahasiswa yang berhak mengikuti sesi ujian mata kuliah Anda.
              </p>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sesi Ujian</th>
                    <th>Nomor Induk Mahasiswa (NIM)</th>
                    <th>Nama Mahasiswa</th>
                    <th>Status Akses</th>
                    <th style={{ textAlign: 'right' }}>Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody>
                  {pesertaList.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{p.nama_ujian}</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF' }}>
                          {p.nim}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.nama}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Fakultas Ilmu Komputer</div>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          <UserCheck size={12} />
                          Terdaftar
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => handleDeletePeserta(p.id_ujian, p.id_mahasiswa)}
                        >
                          <Trash2 size={13} />
                          <span>Hapus Peserta</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {pesertaList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                        Belum ada mahasiswa yang terdaftar pada ujian ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG PELANGGARAN & TETAPKAN KEPUTUSAN SANKSI (Use Case 1.2.9 & 1.2.10) */}
        {activeTab === 'log' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 380px', gap: '24px' }}>
            {/* Table of Violations */}
            <div className="card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Audit Trail & Log Pelanggaran Anti-Curang
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Pilih salah satu baris insiden di bawah untuk meninjau detail dan menjatuhkan sanksi.
                </p>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sesi</th>
                      <th>Mahasiswa</th>
                      <th>Jenis Pelanggaran</th>
                      <th>Waktu Terdeteksi</th>
                      <th>Akumulasi</th>
                      <th>Status Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLogs.map((l) => {
                      const isSelected = selectedLogSession?.id_sesi === l.id_sesi;
                      return (
                        <tr
                          key={l.id_log}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            borderLeft: isSelected ? '3px solid #2563EB' : 'none'
                          }}
                          onClick={() => setSelectedLogSession(l)}
                        >
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF', fontSize: '0.78rem' }}>
                              {l.id_sesi}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{l.nama_mhs}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{l.nim_mhs}</div>
                          </td>
                          <td>
                            <span className="badge badge-danger">
                              <ShieldAlert size={12} />
                              {l.jenis_pelanggaran}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>{l.waktu_kejadian}</span>
                          </td>
                          <td>
                            <strong style={{ color: '#DC2626' }}>{l.jumlah_pelanggaran}x</strong>
                          </td>
                          <td>
                            <span className={`badge ${l.status_ujian === 'Dikunci Paksa' ? 'badge-danger' : 'badge-warning'}`}>
                              {l.status_ujian}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {myLogs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                          <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                          Tidak ada rekaman insiden pelanggaran yang tercatat saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel Keputusan Sanksi Dosen (Use Case 1.2.10) */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <Gavel size={20} color="#DC2626" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Tetapkan Keputusan Sanksi
                </h3>
              </div>

              {selectedLogSession ? (
                <div>
                  {/* Case File Overview */}
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '0.83rem',
                    lineHeight: 1.7,
                    marginBottom: '18px'
                  }}>
                    <div>Nama Mahasiswa: <strong>{selectedLogSession.nama_mhs}</strong></div>
                    <div>NIM: <code>{selectedLogSession.nim_mhs}</code></div>
                    <div>ID Sesi Ujian: <code>{selectedLogSession.id_sesi}</code></div>
                    <div>Total Pelanggaran: <strong style={{ color: '#DC2626' }}>{selectedLogSession.jumlah_pelanggaran} Kali</strong></div>
                    <div>Nilai Asli Sebelum Sanksi: <strong>{selectedLogSession.nilai !== null ? selectedLogSession.nilai : 'Belum Submit'}</strong></div>
                    <div>Keputusan Saat Ini: <span className="badge badge-warning">{selectedLogSession.keputusan}</span></div>
                  </div>

                  <div className="form-group">
                    <label>Pilihan Ketetapan Sanksi Akademik:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', background: sanctionDecision === 'Peringatan' ? '#EFF6FF' : '#FFFFFF' }}>
                        <input
                          type="radio"
                          name="sanction"
                          value="Peringatan"
                          checked={sanctionDecision === 'Peringatan'}
                          onChange={(e) => setSanctionDecision(e.target.value)}
                        />
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong>Peringatan Tertulis</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Nilai tidak dipotong</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', background: sanctionDecision === 'Pengurangan Nilai' ? '#EFF6FF' : '#FFFFFF' }}>
                        <input
                          type="radio"
                          name="sanction"
                          value="Pengurangan Nilai"
                          checked={sanctionDecision === 'Pengurangan Nilai'}
                          onChange={(e) => setSanctionDecision(e.target.value)}
                        />
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong style={{ color: '#D97706' }}>Pengurangan Nilai (-20 Poin)</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Skor akhir dikurangi 20 poin</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', background: sanctionDecision === 'Diskualifikasi' ? '#EFF6FF' : '#FFFFFF' }}>
                        <input
                          type="radio"
                          name="sanction"
                          value="Diskualifikasi"
                          checked={sanctionDecision === 'Diskualifikasi'}
                          onChange={(e) => setSanctionDecision(e.target.value)}
                        />
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong style={{ color: '#DC2626' }}>Diskualifikasi (Nilai 0)</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Ujian dibatalkan dan nilai menjadi 0</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    className="btn btn-danger"
                    style={{ width: '100%', padding: '12px', fontSize: '0.92rem', borderRadius: '8px', marginTop: '10px' }}
                    onClick={handleApplySanction}
                  >
                    <Gavel size={16} />
                    <span>Terapkan Sanksi & Perbarui Nilai</span>
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', fontSize: '0.85rem' }}>
                  <HelpCircle size={32} color="#CBD5E1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Klik salah satu baris log di tabel audit untuk membuka berkas pelanggaran mahasiswa dan menetapkan sanksi.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.8rem', color: '#94A3B8', borderTop: '1px solid #E2E8F0', marginTop: 'auto' }}>
        Sistem Analisis & Desain (SAD Class) — Fakultas Ilmu Komputer, Universitas Klabat &copy; 2026
      </footer>
    </div>
  );
};

export default PortalDosen;

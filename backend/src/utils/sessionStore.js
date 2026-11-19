/**
 * backend/src/utils/sessionStore.js
 * Penyimpanan terpusat (In-Memory + JSON Persistence) untuk:
 * 1. Single Device Login Lock (active_user_sessions) - TC-05 / BR-01
 * 2. Anti-Multi Device Exam Session Lock (active_exam_sessions) - TC-05 Layer 2
 * 3. Sinkronisasi Daftar Ujian lintas browser/perangkat (synced_exams)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'session_sync_store.json');
const HEARTBEAT_TTL_MS = 60 * 1000; // 60 detik batas aktif heartbeat

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultExams() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const twoHoursLater = new Date(now + 2 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const tomorrowStart = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const tomorrowEnd = new Date(now + 26 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const threeDaysAgo = new Date(now - 72 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');

  return [
    {
      id_ujian: 'UJN_01',
      nama_ujian: 'Sistem Analysis and Design',
      mata_kuliah: 'Sistem Analisis & Desain',
      kode_mk: 'IF-241',
      nama_dosen: 'George M. W. Tangka, S.Kom., MBA',
      tanggal_waktu_mulai: oneHourAgo,
      tanggal_waktu_selesai: twoHoursLater,
      durasi: 90,
      pin_ujian: '483920',
      maks_percobaan: 1,
      acak_aktif: true,
      acak_opsi: true,
      batasi_jaringan_kampus: false,
      subnet_kampus: '127.0.0.1,::1,192.168.,10.,172.16.,103.106.',
      batas_toleransi_pelanggaran: 3,
      hasil_dipublikasikan: false
    },
    {
      id_ujian: 'UJN_02',
      nama_ujian: 'UAS Basis Data Lanjut',
      mata_kuliah: 'Basis Data Lanjut',
      kode_mk: 'IF-305',
      nama_dosen: 'George M. W. Tangka, S.Kom., MBA',
      tanggal_waktu_mulai: tomorrowStart,
      tanggal_waktu_selesai: tomorrowEnd,
      durasi: 90,
      pin_ujian: '483920',
      maks_percobaan: 1,
      acak_aktif: true,
      acak_opsi: true,
      batasi_jaringan_kampus: false,
      subnet_kampus: '127.0.0.1,::1,192.168.,10.,172.16.,103.106.',
      batas_toleransi_pelanggaran: 3,
      hasil_dipublikasikan: false
    },
    {
      id_ujian: 'UJN_03',
      nama_ujian: 'Kuis Rekayasa Perangkat Lunak',
      mata_kuliah: 'Rekayasa Perangkat Lunak',
      kode_mk: 'IF-312',
      nama_dosen: 'George M. W. Tangka, S.Kom., MBA',
      tanggal_waktu_mulai: threeDaysAgo,
      tanggal_waktu_selesai: twoHoursAgo,
      durasi: 60,
      pin_ujian: '483920',
      maks_percobaan: 1,
      acak_aktif: false,
      acak_opsi: false,
      batasi_jaringan_kampus: false,
      subnet_kampus: '127.0.0.1,::1,192.168.,10.,172.16.,103.106.',
      batas_toleransi_pelanggaran: 3,
      hasil_dipublikasikan: true
    }
  ];
}

function deduplicateExamArray(list) {
  if (!Array.isArray(list)) return [];
  const byId = new Map();
  for (const ex of list) {
    if (ex && ex.id_ujian && !byId.has(ex.id_ujian)) {
      byId.set(ex.id_ujian, ex);
    }
  }
  const byComposite = new Map();
  for (const ex of byId.values()) {
    const key = `${(ex.nama_ujian || '').trim().toLowerCase()}::${(ex.kode_mk || 'IF-241').trim().toLowerCase()}`;
    if (!byComposite.has(key)) {
      byComposite.set(key, ex);
    }
  }
  return Array.from(byComposite.values());
}

function loadStore() {
  ensureDataDir();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        active_user_sessions: parsed.active_user_sessions || {},
        active_exam_sessions: parsed.active_exam_sessions || {},
        synced_exams: deduplicateExamArray(Array.isArray(parsed.synced_exams) ? parsed.synced_exams : getDefaultExams()),
        synced_questions: Array.isArray(parsed.synced_questions) ? parsed.synced_questions : null,
        synced_participants: Array.isArray(parsed.synced_participants) ? parsed.synced_participants : null,
        synced_sessions: Array.isArray(parsed.synced_sessions) ? parsed.synced_sessions : null,
        synced_violationLogs: Array.isArray(parsed.synced_violationLogs) ? parsed.synced_violationLogs : null,
        state_version: Number(parsed.state_version) || 1
      };
    }
  } catch (err) {
    console.warn('Gagal membaca session_sync_store.json, membuat ulang store:', err.message);
  }
  const initial = {
    active_user_sessions: {},
    active_exam_sessions: {},
    synced_exams: getDefaultExams(),
    synced_questions: null,
    synced_participants: null,
    synced_sessions: null,
    synced_violationLogs: null,
    state_version: 1
  };
  saveStore(initial);
  return initial;
}

function saveStore(state) {
  try {
    ensureDataDir();
    state.synced_exams = deduplicateExamArray(state.synced_exams);
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('Gagal menulis session_sync_store.json:', err.message);
  }
}

let store = loadStore();

function normalizeKey(id) {
  return String(id || '').trim().toLowerCase();
}

function isHeartbeatAlive(record) {
  if (!record || !record.last_heartbeat) return false;
  return Date.now() - Number(record.last_heartbeat) <= HEARTBEAT_TTL_MS;
}

function cleanupExpiredSessions() {
  let changed = false;
  for (const [k, rec] of Object.entries(store.active_user_sessions)) {
    if (!isHeartbeatAlive(rec)) {
      delete store.active_user_sessions[k];
      changed = true;
    }
  }
  for (const [k, rec] of Object.entries(store.active_exam_sessions)) {
    if (!isHeartbeatAlive(rec)) {
      delete store.active_exam_sessions[k];
      changed = true;
    }
  }
  if (changed) saveStore(store);
}

module.exports = {
  getActiveUserSession(identifier) {
    cleanupExpiredSessions();
    const key = normalizeKey(identifier);
    const rec = store.active_user_sessions[key];
    return isHeartbeatAlive(rec) ? rec : null;
  },

  setActiveUserSession(identifier, payload) {
    cleanupExpiredSessions();
    const key = normalizeKey(identifier);
    store.active_user_sessions[key] = {
      ...payload,
      last_heartbeat: Date.now()
    };
    saveStore(store);
    return store.active_user_sessions[key];
  },

  touchHeartbeat(identifier, deviceId, activeExamId) {
    cleanupExpiredSessions();
    const key = normalizeKey(identifier);
    const rec = store.active_user_sessions[key];
    if (!rec) return null;
    if (deviceId && rec.device_id && rec.device_id !== deviceId) {
      return { conflict: true, current: rec };
    }
    rec.last_heartbeat = Date.now();
    if (activeExamId !== undefined) {
      rec.active_exam_id = activeExamId;
    }

    const examIdToTouch = activeExamId || rec.active_exam_id;
    if (examIdToTouch) {
      const examKey = `${key}::${String(examIdToTouch).trim()}`;
      if (store.active_exam_sessions[examKey]) {
        store.active_exam_sessions[examKey].last_heartbeat = Date.now();
      }
    }
    saveStore(store);
    return rec;
  },

  clearUserSession(identifier, deviceId) {
    const key = normalizeKey(identifier);
    const rec = store.active_user_sessions[key];
    if (rec && (!deviceId || rec.device_id === deviceId)) {
      delete store.active_user_sessions[key];
    }
    for (const examKey of Object.keys(store.active_exam_sessions)) {
      if (examKey.startsWith(`${key}::`)) {
        const eRec = store.active_exam_sessions[examKey];
        if (!deviceId || eRec.device_id === deviceId) {
          delete store.active_exam_sessions[examKey];
        }
      }
    }
    saveStore(store);
    return true;
  },

  forceResetUserSession(identifier) {
    const key = normalizeKey(identifier);
    delete store.active_user_sessions[key];
    for (const examKey of Object.keys(store.active_exam_sessions)) {
      if (examKey.startsWith(`${key}::`)) {
        delete store.active_exam_sessions[examKey];
      }
    }
    saveStore(store);
    return true;
  },

  listActiveSessions() {
    cleanupExpiredSessions();
    return Object.values(store.active_user_sessions);
  },

  getActiveExamSession(identifier, examId) {
    cleanupExpiredSessions();
    const examKey = `${normalizeKey(identifier)}::${String(examId || '').trim()}`;
    const rec = store.active_exam_sessions[examKey];
    return isHeartbeatAlive(rec) ? rec : null;
  },

  setActiveExamSession(identifier, examId, deviceId) {
    cleanupExpiredSessions();
    const key = normalizeKey(identifier);
    const examKey = `${key}::${String(examId || '').trim()}`;
    store.active_exam_sessions[examKey] = {
      nim: identifier,
      exam_id: examId,
      device_id: deviceId,
      status: 'sedang_mengerjakan',
      last_heartbeat: Date.now()
    };
    if (store.active_user_sessions[key]) {
      store.active_user_sessions[key].active_exam_id = examId;
      store.active_user_sessions[key].last_heartbeat = Date.now();
    }
    saveStore(store);
    return store.active_exam_sessions[examKey];
  },

  // Sinkronisasi State Penuh Lintas Browser / Akun (Single Source of Truth)
  getFullState() {
    return {
      exams: deduplicateExamArray(store.synced_exams),
      questions: store.synced_questions,
      participants: store.synced_participants,
      sessions: store.synced_sessions,
      violationLogs: store.synced_violationLogs,
      version: store.state_version || 1
    };
  },

  syncFullState(payload) {
    if (!payload || typeof payload !== 'object') return this.getFullState();
    if (Array.isArray(payload.exams)) {
      store.synced_exams = deduplicateExamArray(payload.exams);
    }
    if (Array.isArray(payload.questions)) {
      store.synced_questions = payload.questions;
    }
    if (Array.isArray(payload.participants)) {
      store.synced_participants = payload.participants;
    }
    if (Array.isArray(payload.sessions)) {
      store.synced_sessions = payload.sessions;
    }
    if (Array.isArray(payload.violationLogs)) {
      store.synced_violationLogs = payload.violationLogs;
    }
    store.state_version = (Number(store.state_version) || 1) + 1;
    saveStore(store);
    return this.getFullState();
  },

  // Sinkronisasi daftar ujian lintas browser
  getExams() {
    return deduplicateExamArray(store.synced_exams);
  },

  upsertExam(examPayload) {
    const cleanTitle = (examPayload.nama_ujian || '').trim().toLowerCase();
    const cleanCode = (examPayload.kode_mk || 'IF-241').trim().toLowerCase();
    const idx = store.synced_exams.findIndex(
      (ex) =>
        ex.id_ujian === examPayload.id_ujian ||
        ((ex.nama_ujian || '').trim().toLowerCase() === cleanTitle &&
          (ex.kode_mk || 'IF-241').trim().toLowerCase() === cleanCode)
    );
    if (idx >= 0) {
      store.synced_exams[idx] = { ...store.synced_exams[idx], ...examPayload, id_ujian: store.synced_exams[idx].id_ujian };
    } else {
      store.synced_exams.push(examPayload);
    }
    store.synced_exams = deduplicateExamArray(store.synced_exams);
    store.state_version = (Number(store.state_version) || 1) + 1;
    saveStore(store);
    return store.synced_exams;
  },

  deleteExam(idUjian) {
    // Cascade Delete: hapus ujian beserta seluruh relasi soal, peserta, sesi, log pelanggaran, & sesi ujian aktif
    store.synced_exams = store.synced_exams.filter((ex) => ex.id_ujian !== idUjian);
    if (Array.isArray(store.synced_questions)) {
      store.synced_questions = store.synced_questions.filter((q) => (q.id_ujian || q.examId) !== idUjian);
    }
    if (Array.isArray(store.synced_participants)) {
      store.synced_participants = store.synced_participants.filter((p) => (p.id_ujian || p.examId) !== idUjian);
    }
    if (Array.isArray(store.synced_sessions)) {
      store.synced_sessions = store.synced_sessions.filter((s) => s.id_ujian !== idUjian);
    }
    if (Array.isArray(store.synced_violationLogs)) {
      store.synced_violationLogs = store.synced_violationLogs.filter((v) => v.id_ujian !== idUjian);
    }
    for (const examKey of Object.keys(store.active_exam_sessions)) {
      if (examKey.endsWith(`::${idUjian}`)) {
        delete store.active_exam_sessions[examKey];
      }
    }
    store.state_version = (Number(store.state_version) || 1) + 1;
    saveStore(store);
    return store.synced_exams;
  }
};

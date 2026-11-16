/**
 * src/utils/autoGrader.js
 * Modul auto-grading untuk koreksi otomatis soal-soal objektif (FR-11, BR-06).
 * Mendukung tipe Pilihan Ganda, Benar/Salah, Isian Singkat, dan penandaan Esai.
 */

/**
 * Menilai satu jawaban mahasiswa berdasarkan tipe soal
 * @param {Object} soal - objek data soal (tipe_soal, kunci_jawaban, bobot)
 * @param {string|null} jawabanMahasiswa - teks jawaban yang dipilih/diinput mahasiswa
 * @returns {number|null} nilai yang diperoleh (null jika tipe Esai)
 */
function gradeSingleAnswer(soal, jawabanMahasiswa) {
  if (soal.tipe_soal === 'Esai') {
    // Esai dinilai manual oleh dosen, default null
    return null;
  }

  if (!jawabanMahasiswa || typeof jawabanMahasiswa !== 'string') {
    return 0;
  }

  const kunci = (soal.kunci_jawaban || '').trim();
  const input = jawabanMahasiswa.trim();
  const bobot = parseFloat(soal.bobot) || 10;

  switch (soal.tipe_soal) {
    case 'Pilihan Ganda':
      return input.toLowerCase() === kunci.toLowerCase() ? bobot : 0;

    case 'Benar/Salah':
      return input.toLowerCase() === kunci.toLowerCase() ? bobot : 0;

    case 'Isian Singkat':
      // Toleransi huruf besar/kecil dan spasi berlebih
      return input.toLowerCase() === kunci.toLowerCase() ? bobot : 0;

    default:
      return 0;
  }
}

/**
 * Menghitung nilai total ujian dalam skala 0 - 100
 * @param {Array} daftarJawaban - array berisi { bobot, nilai_soal, tipe_soal }
 * @returns {{ totalNilai: number|null, adaEsaiPending: boolean }}
 */
function calculateTotalScore(daftarJawaban) {
  let totalBobot = 0;
  let totalPerolehan = 0;
  let adaEsaiPending = false;

  for (const item of daftarJawaban) {
    const bobot = parseFloat(item.bobot) || 10;
    totalBobot += bobot;

    if (item.tipe_soal === 'Esai' && (item.nilai_soal === null || item.nilai_soal === undefined)) {
      adaEsaiPending = true;
    } else {
      totalPerolehan += parseFloat(item.nilai_soal) || 0;
    }
  }

  if (adaEsaiPending) {
    return {
      totalNilai: null, // "Belum dinilai" sampai dosen menyelesaikan penilaian esai
      adaEsaiPending: true
    };
  }

  if (totalBobot <= 0) {
    return {
      totalNilai: 0,
      adaEsaiPending: false
    };
  }

  // Skala 0 s.d. 100
  const nilaiSkala100 = Math.min(100, Math.max(0, (totalPerolehan / totalBobot) * 100));
  return {
    totalNilai: Math.round(nilaiSkala100 * 100) / 100,
    adaEsaiPending: false
  };
}

module.exports = {
  gradeSingleAnswer,
  calculateTotalScore
};

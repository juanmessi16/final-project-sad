exports.getSesiUjian = async (req, res) => {
  res.json({
    id_sesi: req.params.id_sesi,
    nama_ujian: "Ujian Tengah Semester",
    batas_toleransi_pelanggaran: 3,
    sisa_waktu: 3600,
    soal: [
      {
        id_soal: "S01",
        pertanyaan: "Apa definisi dari use case diagram?",
        opsi_jawaban: ["Opsi A", "Opsi B", "Opsi C", "Opsi D"].sort(() => Math.random() - 0.5)
      }
    ]
  });
};

exports.autoSaveJawaban = async (req, res) => {
  const { id_sesi, jawaban } = req.body;
  console.log(`Auto-save sesi ${id_sesi}:`, jawaban);
  res.status(200).send({ message: "Saved" });
};

exports.catatPelanggaran = async (req, res) => {
  const { id_sesi, jenis_pelanggaran, jumlah_pelanggaran } = req.body;
  console.log(`Pelanggaran ${jenis_pelanggaran} dicatat untuk sesi ${id_sesi}. Total: ${jumlah_pelanggaran}`);
  res.status(200).send({ message: "Log dicatat" });
};

exports.kunciSesiPaksa = async (req, res) => {
  const { id_sesi } = req.body;
  res.status(200).send({ message: "Sesi dikunci paksa" });
};

exports.submitUjian = async (req, res) => {
  const { id_sesi, jawaban, status_ujian } = req.body;
  res.status(200).send({ message: "Ujian berhasil disubmit", status: status_ujian });
};
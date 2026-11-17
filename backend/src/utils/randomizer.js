/**
 * src/utils/randomizer.js
 * Utilitas pengacakan murni berbasis algoritma Fisher-Yates (Knuth Shuffle).
 * Digunakan untuk mengacak urutan soal dan urutan opsi jawaban (FR-05, BR-04).
 */

/**
 * Mengacak array secara non-destruktif
 * @param {Array} array - array input yang akan diacak
 * @returns {Array} array baru hasil pengacakan
 */
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = {
  shuffleArray
};

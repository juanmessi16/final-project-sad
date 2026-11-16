/**
 * src/utils/idGenerator.js
 * Generator identifier alfanumerik unik dengan prefix entitas.
 * Menghasilkan string dengan panjang aman (maks 20 karakter) untuk skema VARCHAR(20).
 */

const crypto = require('crypto');

/**
 * Buat ID unik dengan prefix
 * @param {string} prefix - contoh 'USR', 'DOS', 'MHS', 'BS', 'SOAL', 'UJN', 'SES', 'JAW', 'LOG', 'BKT'
 * @param {number} length - panjang random string (default: 8)
 * @returns {string} ID unik terformat
 */
function generateId(prefix, length = 8) {
  const randomStr = crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
  return `${prefix}_${randomStr}`;
}

module.exports = {
  generateId
};

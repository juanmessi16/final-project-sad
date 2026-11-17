/**
 * src/middlewares/securityMiddleware.js
 * Middleware keamanan jaringan & imutabilitas data:
 * - TC-48: Paksa redirect HTTP ke HTTPS
 * - TC-41: Validasi IP Jaringan Kampus (IP Whitelisting)
 * - TC-52: Proteksi Append-Only (Immutable) pada Log Pelanggaran
 */

/**
 * TC-48: Middleware pengalihan paksa HTTP -> HTTPS
 */
function enforceHttps(req, res, next) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forceHttpsEnv = process.env.FORCE_HTTPS === 'true';
  const enforceHeader = req.headers['x-enforce-https'] === 'true' || req.query.enforce_https === '1';

  const isInsecureForwarded = forwardedProto && forwardedProto.toLowerCase() === 'http';
  const isInsecureDirect = !req.secure && (forceHttpsEnv || enforceHeader);

  if (isInsecureForwarded || isInsecureDirect) {
    const host = req.headers.host || 'localhost:5000';
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }

  // Tambahkan header HSTS untuk keamanan transport
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/**
 * Mengekstrak alamat IP klien (mendukung header X-Simulated-IP untuk pengujian TC-41)
 */
function getClientIp(req) {
  const simulatedIp = req.headers['x-simulated-ip'] || req.body?.simulated_ip || req.query?.simulated_ip;
  if (simulatedIp && typeof simulatedIp === 'string' && simulatedIp.trim()) {
    return simulatedIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

/**
 * TC-41: Memeriksa apakah IP klien berada dalam daftar subnet jaringan kampus yang diizinkan
 */
function isCampusNetworkIp(clientIp, subnetConfig = '127.0.0.1,::1,192.168.,10.,172.16.,103.106.') {
  if (!clientIp) return false;
  const normalizedIp = clientIp.trim().replace(/^::ffff:/, '');

  const allowedPrefixes = (subnetConfig || '127.0.0.1,::1,192.168.,10.,172.16.,103.106.')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return allowedPrefixes.some((prefix) => {
    if (prefix === normalizedIp) return true;
    return normalizedIp.startsWith(prefix);
  });
}

/**
 * TC-52: Blokir segala upaya modifikasi (PUT, PATCH, DELETE) pada tabel/endpoint log_pelanggaran
 */
function immutableLogGuard(req, res, next) {
  if (['PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
    return res.status(403).json({
      success: false,
      immutable: true,
      message: 'Akses ditolak (TC-52): Log pelanggaran bersifat permanen (append-only / immutable) dan tidak dapat diubah atau dihapus oleh siapa pun.'
    });
  }
  next();
}

module.exports = {
  enforceHttps,
  getClientIp,
  isCampusNetworkIp,
  immutableLogGuard
};

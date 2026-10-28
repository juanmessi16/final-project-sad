import { useEffect, useState } from 'react';
import api from '../services/api';

export const useAntiCheat = (idSesi, maxViolations, onLockSession) => {
  const [violations, setViolations] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await recordViolation('Pindah Tab');
      }
    };

    const handleCopyPaste = async (e) => {
      e.preventDefault();
      await recordViolation('Copy-Paste');
    };

    const recordViolation = async (jenisPelanggaran) => {
      setViolations((prev) => {
        const newTotal = prev + 1;
        api.post('/ujian/log-pelanggaran', {
          id_sesi: idSesi,
          jenis_pelanggaran: jenisPelanggaran,
          jumlah_pelanggaran: newTotal
        });
        if (newTotal >= maxViolations) {
          api.post('/ujian/kunci-sesi', { id_sesi: idSesi });
          onLockSession();
        }
        return newTotal;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
    };
  }, [idSesi, maxViolations]);

  return violations;
};
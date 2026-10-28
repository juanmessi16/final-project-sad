import { useEffect, useRef } from 'react';
import api from '../services/api';

export const useAutoSave = (answers, idSesi) => {
  const prevAnswers = useRef(answers);

  useEffect(() => {
    const hasChanged = JSON.stringify(answers) !== JSON.stringify(prevAnswers.current);
    
    if (hasChanged) {
      const saveAnswers = async () => {
        try {
          await api.post('/ujian/auto-save', {
            id_sesi: idSesi,
            jawaban: answers
          });
          prevAnswers.current = answers;
        } catch (error) {
          console.error("Gagal menyimpan jawaban otomatis", error);
        }
      };

      const timeoutId = setTimeout(saveAnswers, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [answers, idSesi]);
};
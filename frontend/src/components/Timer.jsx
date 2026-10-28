import { useState, useEffect } from 'react';

const Timer = ({ sisaWaktuDetik, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(sisaWaktuDetik);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={`text-lg font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-blue-900'}`}>
      Sisa Waktu: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

export default Timer;
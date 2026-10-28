import { useState } from 'react';
import Login from './pages/Login';
import PortalMahasiswa from './pages/PortalMahasiswa';
import PortalDosen from './pages/PortalDosen';
import RuangUjian from './pages/Mahasiswa/RuangUjian';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeExamSesi, setActiveExamSesi] = useState(null);

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveExamSesi(null);
  };

  // Mulai ujian dari portal mahasiswa
  const handleStartExam = (idSesi) => {
    setActiveExamSesi(idSesi);
  };

  // Ujian selesai / terkunci -> kembali ke portal
  const handleExamCompleted = () => {
    setActiveExamSesi(null);
  };

  // 1. Belum login
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // 2. Mahasiswa sedang di Ruang Ujian
  if (currentUser.role === 'Mahasiswa' && activeExamSesi) {
    return (
      <RuangUjian
        idSesi={activeExamSesi}
        onExamCompleted={handleExamCompleted}
      />
    );
  }

  // 3. Mahasiswa di Portal
  if (currentUser.role === 'Mahasiswa') {
    return (
      <PortalMahasiswa
        currentUser={currentUser}
        onStartExam={handleStartExam}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Dosen di Portal
  return (
    <PortalDosen
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;

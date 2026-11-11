import UIApp from './ui-lib/App.tsx';

// Adapter functions to connect legacy logic with UI library
function onLoginSuccess(user) {
  // Store user for later UI usage (e.g., in sessionStorage)
  window.sessionStorage.setItem('currentUser', JSON.stringify(user));
}

function onLogout() {
  window.sessionStorage.removeItem('currentUser');
}

function onStartExam(sessionId) {
  window.sessionStorage.setItem('activeExamSession', sessionId);
}

export default function App() {
  // UI library manages its own view state; we just pass callbacks
  return (
    <UIApp
      onLoginSuccess={onLoginSuccess}
      onLogout={onLogout}
      onStartExam={onStartExam}
    />
  );
}


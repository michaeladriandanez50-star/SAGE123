import { useState, useEffect } from 'react'; // 1. Idinagdag ang useEffect
import { Screen } from './types';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import TwoFA from './pages/auth/TwoFA';
import ResetPassword from './pages/auth/ResetPassword'; // 2. Idinagdag ang import na ito
import { MainShell } from './components/Layout';
import Dashboard from './pages/main/Dashboard';
import ManageData from './pages/main/ManageData';
import GenerateSchedule from './pages/main/GenerateSchedule';
import Schedule from './pages/main/Schedule';
import Conflict from './pages/main/Conflict';
import Reports from './pages/main/Reports';
import ServicePortal from './pages/main/ServicePortal';

export default function App() {
// Gagamit tayo ng "lazy initialization" para bago pa man mag-load ang screen,
  // iche-check na niya agad kung may naka-save na token sa browser.
  const [screen, setScreen] = useState<Screen>(() => {
    const savedToken = localStorage.getItem('sage_token');
    // Kung may token, rekta sa dashboard. Kung wala, bagsak sa login screen.
    return savedToken ? 'dashboard' : 'login';
  });
  // 3. Idinagdag ang useEffect para saluhin ang reset link mula sa email
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has('token')) {
      // Kung may token sa URL, i-redirect agad sa reset-password screen
      setScreen('reset-password' as Screen); 
    }
  }, []);

  if (screen === 'login') return <Login setScreen={setScreen} />;
  if (screen === 'signup') return <SignUp setScreen={setScreen} />;
  if (screen === '2fa') return <TwoFA setScreen={setScreen} />;
  
  // 4. Idinagdag ang route render para sa ResetPassword
  if (screen === 'reset-password') return <ResetPassword setScreen={setScreen} />; 

  return (
    <MainShell screen={screen} setScreen={setScreen}>
      {screen === 'dashboard' && <Dashboard setScreen={setScreen} />}
      {screen === 'manage' && <ManageData setScreen={setScreen} />}
      {screen === 'generate' && <GenerateSchedule setScreen={setScreen} />}
      {screen === 'schedule' && <Schedule />}
      {screen === 'conflict' && <Conflict setScreen={setScreen} />}
      {screen === 'reports' && <Reports setScreen={setScreen} />}
      {screen === 'service-portal' && <ServicePortal setScreen={setScreen} />}
    </MainShell>
  );
}
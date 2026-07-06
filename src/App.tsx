import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useTutorialStore } from './store/tutorialStore';
import { useNavigate, useLocation } from 'react-router-dom';

// Layout
import { AppShell } from './components/layout/AppShell';

// Pages
import { SimulatorPage }  from './components/views/SimulatorPage';
import { FilesPage }      from './components/files/FilesPage';
import { GradingPage }    from './components/grading/GradingPage';
import { LearnPage }      from './components/views/LearnPage';
import { PricingPage }    from './components/pricing/PricingPage';
import { SettingsPage }   from './components/settings/SettingsPage';
import { LoginPage }      from './components/auth/LoginPage';
import { RegisterPage }   from './components/auth/RegisterPage';

function App() {
  const { initialize } = useAuthStore();
  const { isActive } = useTutorialStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { initialize(); }, [initialize]);

  // Tutorial still redirects to simulator
  useEffect(() => {
    if (isActive && location.pathname !== '/simulator') navigate('/simulator');
  }, [isActive, location.pathname, navigate]);

  return (
    <Routes>
      {/* Auth pages — still available for users who want to sign in */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* All app routes — no auth wall */}
      <Route element={<AppShell />}>
        <Route path="/"          element={<SimulatorPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/files"     element={<FilesPage />} />
        <Route path="/learn"     element={<LearnPage />} />
        <Route path="/grading"   element={<GradingPage />} />
        <Route path="/pricing"   element={<PricingPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

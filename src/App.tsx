import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

// Layout & Auth
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';

// Pages
import { SimulatorPage } from './components/views/SimulatorPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { FilesPage } from './components/files/FilesPage';
import { ActivityPage } from './components/activity/ActivityPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PricingPage } from './components/pricing/PricingPage';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';
import { GradingPage } from './components/grading/GradingPage';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Protected Routes inside AppShell */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/grading" element={<GradingPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

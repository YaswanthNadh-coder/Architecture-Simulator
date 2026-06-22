import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useTutorialStore } from './store/tutorialStore';

// Layout & Auth
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';
import { TierRoute } from './components/auth/TierRoute';
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
import { LearnPage } from './components/views/LearnPage';

// Institutional Course Pages
import { JoinCoursePage } from './components/courses/JoinCoursePage';
import { CourseListPage } from './components/courses/CourseListPage';
import { CourseDashboardPage } from './components/courses/CourseDashboardPage';
import { AssignmentDetailPage } from './components/courses/AssignmentDetailPage';

function App() {
  const { initialize } = useAuthStore();
  const { isActive } = useTutorialStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle tutorial navigation
  useEffect(() => {
    if (isActive && location.pathname !== '/simulator') {
      navigate('/simulator');
    }
  }, [isActive, location.pathname, navigate]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* All authenticated routes inside ProtectedRoute > AppShell */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>

        {/* Available to all authenticated users regardless of tier */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/learn" element={<LearnPage />} />
        
        {/* Course Routes */}
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/join" element={<JoinCoursePage />} />
        <Route path="/courses/:courseId" element={<CourseDashboardPage />} />
        <Route
          path="/courses/:courseId/assignments/:assignmentId"
          element={
            <RoleRoute allowedRoles={['instructor']}>
              <AssignmentDetailPage />
            </RoleRoute>
          }
        />

        {/* Requires Pro or above — redirect to /pricing if not met */}
        <Route
          path="/analytics"
          element={
            <TierRoute requiredFeature="analyticsDashboard">
              <AnalyticsPage />
            </TierRoute>
          }
        />

        {/* Requires instructor role — redirect to / if student tries to access */}
        <Route
          path="/grading"
          element={
            <RoleRoute allowedRoles={['instructor']}>
              <GradingPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

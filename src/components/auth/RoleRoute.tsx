import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface RoleRouteProps {
  children: React.ReactNode;
  /** One or more roles that are allowed to access this route */
  allowedRoles: Array<'student' | 'instructor'>;
  /** Where to redirect if the user doesn't have the required role */
  redirectTo?: string;
}

/**
 * RoleRoute — Route guard that restricts access based on the user's role.
 *
 * Usage:
 *   <RoleRoute allowedRoles={['instructor']}>
 *     <GradingPage />
 *   </RoleRoute>
 *
 * Must be nested inside <ProtectedRoute> which guarantees that `profile`
 * is loaded before children render.
 */
export const RoleRoute = ({ children, allowedRoles, redirectTo = '/' }: RoleRouteProps) => {
  const { profile, loading } = useAuthStore();

  // Still loading — show nothing (ProtectedRoute above already handles the loading spinner)
  if (loading) return null;

  // Profile not loaded yet (shouldn't happen inside ProtectedRoute, but guard anyway)
  if (!profile) return <Navigate to="/login" replace />;

  // Role check
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

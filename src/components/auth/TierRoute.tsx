import { Navigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { FeatureCapabilities } from '../../lib/tierConfig';

interface TierRouteProps {
  children: React.ReactNode;
  /** The feature capability that must be enabled to access this route */
  requiredFeature: keyof FeatureCapabilities;
  /** Where to redirect if the tier check fails (defaults to /pricing) */
  redirectTo?: string;
}

/**
 * TierRoute — Route guard that restricts access based on the user's subscription tier.
 *
 * Usage:
 *   <TierRoute requiredFeature="analyticsDashboard">
 *     <AnalyticsPage />
 *   </TierRoute>
 *
 * Must be nested inside <ProtectedRoute> which guarantees that subscription
 * state is initialized before children render.
 */
export const TierRoute = ({ children, requiredFeature, redirectTo = '/pricing' }: TierRouteProps) => {
  const { canAccess, initialized } = useSubscriptionStore();

  // Subscription not initialized yet
  if (!initialized) return null;

  if (!canAccess(requiredFeature)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

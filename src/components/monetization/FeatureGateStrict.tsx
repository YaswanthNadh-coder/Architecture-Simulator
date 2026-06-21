import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { FeatureCapabilities } from '../../lib/tierConfig';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { LockedFeatureCard } from './FeatureGate';

interface FeatureGateStrictProps {
  /** The feature capability to check server-side */
  feature: keyof FeatureCapabilities;
  children: ReactNode;
  /** Optional custom fallback when feature is locked */
  fallback?: ReactNode;
}

/**
 * FeatureGateStrict — Server-verified feature gate.
 *
 * Unlike the regular FeatureGate which reads from the client-side Zustand store
 * (overridable via browser devtools), this component calls a Supabase RPC function
 * to verify the user's tier on the server before rendering children.
 *
 * Use this ONLY for high-sensitivity features (exports, grading results, LMS integration)
 * to avoid excessive RPC calls per page render.
 *
 * Usage:
 *   <FeatureGateStrict feature="autoGrader">
 *     <GradingResults />
 *   </FeatureGateStrict>
 */
export const FeatureGateStrict = ({ feature, children, fallback }: FeatureGateStrictProps) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const { data, error } = await supabase.rpc('check_feature_access', {
          feature_name: feature,
        });

        if (!cancelled) {
          if (error) {
            // If the RPC doesn't exist yet (during migration), fall back to checking the
            // client-side store instead of a blind allow.
            console.warn('FeatureGateStrict: RPC check_feature_access failed, falling back to local store check:', error.message);
            setAllowed(useSubscriptionStore.getState().canAccess(feature));
          } else {
            setAllowed(!!data);
          }
        }
      } catch (err) {
        console.warn('Feature check network error:', err);
        // Fallback to secure client-side store check instead of blind allow
        setAllowed(useSubscriptionStore.getState().canAccess(feature));
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [feature]);

  // Loading state — show skeleton
  if (allowed === null) {
    return (
      <div className="animate-pulse h-20 rounded-xl" style={{ background: 'var(--color-bg-surface)' }} />
    );
  }

  // Not allowed — show locked card or custom fallback
  if (!allowed) {
    return fallback ? <>{fallback}</> : <LockedFeatureCard feature={feature} />;
  }

  return <>{children}</>;
};

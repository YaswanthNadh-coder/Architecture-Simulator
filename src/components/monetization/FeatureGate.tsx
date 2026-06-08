import type { ReactNode } from 'react';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { FeatureCapabilities } from '../../lib/tierConfig';
import { getUnlockTier, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from '../../lib/tierConfig';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof FeatureCapabilities;
  children: ReactNode;
  /** Custom fallback UI. If not provided, a default upgrade card is shown. */
  fallback?: ReactNode;
  /** If true, renders children in a disabled/locked visual state instead of replacing with fallback */
  overlay?: boolean;
}

/**
 * FeatureGate — Conditionally renders children based on the user's subscription tier.
 *
 * Usage:
 *   <FeatureGate feature="cacheSimulation">
 *     <CacheSimPanel />
 *   </FeatureGate>
 */
export const FeatureGate = ({ feature, children, fallback, overlay }: FeatureGateProps) => {
  const { canAccess } = useSubscriptionStore();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (overlay) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none select-none blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <LockedFeatureCard feature={feature} compact />
        </div>
      </div>
    );
  }

  return <LockedFeatureCard feature={feature} />;
};

/**
 * LockedFeatureCard — Shown when a feature is gated.
 * Displays what the feature does and which tier unlocks it.
 */
export const LockedFeatureCard = ({
  feature,
  compact,
  onUpgrade,
}: {
  feature: keyof FeatureCapabilities;
  compact?: boolean;
  onUpgrade?: () => void;
}) => {
  const unlockTier = getUnlockTier(feature);
  const label = FEATURE_LABELS[feature] ?? String(feature);
  const description = FEATURE_DESCRIPTIONS[feature] ?? `Upgrade to ${unlockTier} to unlock this feature.`;

  if (compact) {
    return (
      <div className="bg-bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl max-w-sm">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          <Lock size={14} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{label}</p>
          <p className="text-[10px] text-text-muted">Requires {unlockTier.charAt(0).toUpperCase() + unlockTier.slice(1)}</p>
        </div>
        <button
          onClick={onUpgrade}
          className="text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
        >
          Upgrade →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 text-center max-w-sm mx-auto">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-brand-500/20 to-cyan-500/10 flex items-center justify-center">
        <Lock size={22} className="text-brand-400" />
      </div>
      <h4 className="text-sm font-bold text-white mb-1">{label}</h4>
      <p className="text-xs text-text-muted leading-relaxed mb-4">{description}</p>
      <a
        href="/pricing"
        onClick={(e) => {
          if (onUpgrade) { e.preventDefault(); onUpgrade(); }
        }}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20"
      >
        <Sparkles size={12} />
        Upgrade to {unlockTier.charAt(0).toUpperCase() + unlockTier.slice(1)}
        <ArrowRight size={12} />
      </a>
    </div>
  );
};

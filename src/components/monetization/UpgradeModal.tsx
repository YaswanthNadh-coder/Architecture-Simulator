import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FeatureCapabilities } from '../../lib/tierConfig';
import { getUnlockTier, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from '../../lib/tierConfig';

interface UpgradeModalProps {
  feature: keyof FeatureCapabilities;
  /** Optional contextual message (e.g. "You tried to export a timing diagram") */
  context?: string;
  onClose: () => void;
}

/**
 * UpgradeModal — Contextual modal shown when a user hits a feature gate.
 * Shows exactly what the user was trying to do, which plan unlocks it,
 * and a one-click path to the pricing/checkout page.
 */
export const UpgradeModal = ({ feature, context, onClose }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const unlockTier = getUnlockTier(feature);
  const label = FEATURE_LABELS[feature] ?? String(feature);
  const description = FEATURE_DESCRIPTIONS[feature] ?? '';
  const tierName = unlockTier.charAt(0).toUpperCase() + unlockTier.slice(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl relative overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500" />

          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white z-10">
            <X size={18} />
          </button>

          <div className="p-8 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-cyan-500/10 border border-brand-500/20 flex items-center justify-center"
            >
              <Lock size={24} className="text-brand-400" />
            </motion.div>

            {/* Context (what user tried to do) */}
            {context && (
              <p className="text-xs text-text-muted bg-bg-panel rounded-lg px-3 py-2 mb-4 inline-block">
                {context}
              </p>
            )}

            {/* Feature name */}
            <h2 className="text-xl font-bold text-white mb-2">{label}</h2>

            {/* Description */}
            <p className="text-sm text-text-muted leading-relaxed mb-6 max-w-sm mx-auto">
              {description}
            </p>

            {/* Tier badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full mb-6">
              <Sparkles size={12} className="text-brand-400" />
              <span className="text-xs font-semibold text-brand-400">Available on {tierName}</span>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <button
                onClick={() => { onClose(); navigate('/pricing'); }}
                className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Upgrade to {tierName}
                <ArrowRight size={16} />
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-text-muted hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

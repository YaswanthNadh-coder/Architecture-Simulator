import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/subscriptionStore';

interface UpgradeBannerProps {
  cpi?: number;
}

const SESSION_KEY = 'pipelineiq_upgrade_banner_dismissed';

/**
 * UpgradeBanner — Contextual, non-intrusive banner shown after simulation
 * when CPI > 2.0, suggesting the step-back debugger.
 * Only shown once per session.
 */
export const UpgradeBanner = ({ cpi }: UpgradeBannerProps) => {
  const navigate = useNavigate();
  const { tier } = useSubscriptionStore();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });

  // Only show for Free users with high CPI
  if (tier !== 'free' || !cpi || cpi <= 2.0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, 'true');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="mx-4 mt-2"
      >
        <div className="bg-gradient-to-r from-brand-500/10 to-cyan-500/5 border border-brand-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium">
              Your CPI of <span className="text-brand-400 font-bold">{cpi.toFixed(1)}</span> suggests fixable stalls.
            </p>
            <p className="text-[10px] text-text-muted">
              Pro's step-back debugger can help you identify exactly where they occur.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="shrink-0 px-3 py-1.5 bg-brand-500 text-white text-[10px] font-bold rounded-lg hover:bg-brand-400 transition-colors flex items-center gap-1"
          >
            <Sparkles size={10} />
            Try Pro
          </button>
          <button onClick={handleDismiss} className="text-text-muted hover:text-white shrink-0">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

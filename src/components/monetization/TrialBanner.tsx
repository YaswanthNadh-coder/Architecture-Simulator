import { motion } from 'framer-motion';
import { Sparkles, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useState } from 'react';

/**
 * TrialBanner — Persistent banner shown during the Pro trial period.
 * Displays days remaining, changes urgency near the end.
 */
export const TrialBanner = () => {
  const navigate = useNavigate();
  const { isTrialActive, getTrialDaysRemaining, status } = useSubscriptionStore();
  const [dismissed, setDismissed] = useState(false);

  if (!isTrialActive() || status !== 'trialing' || dismissed) return null;

  const daysLeft = getTrialDaysRemaining();
  const isUrgent = daysLeft <= 3;
  const isLastDay = daysLeft <= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`shrink-0 px-4 py-2 flex items-center justify-center gap-3 text-xs font-medium ${
        isLastDay
          ? 'bg-gradient-to-r from-hazard/20 to-yellow-500/10 border-b border-hazard/20'
          : isUrgent
            ? 'bg-gradient-to-r from-yellow-500/10 to-brand-500/5 border-b border-yellow-500/20'
            : 'bg-gradient-to-r from-brand-500/10 to-cyan-500/5 border-b border-brand-500/15'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <Clock size={13} className={isLastDay ? 'text-hazard animate-pulse' : 'text-yellow-400'} />
        ) : (
          <Sparkles size={13} className="text-brand-400" />
        )}
        <span className={isLastDay ? 'text-hazard' : isUrgent ? 'text-yellow-400' : 'text-brand-300'}>
          {isLastDay
            ? '⏳ Last day of your Pro trial!'
            : `🎉 Pro Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
          }
        </span>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className={`px-3 py-1 rounded-md font-bold transition-colors ${
          isUrgent
            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
            : 'bg-brand-500 text-white hover:bg-brand-400'
        }`}
      >
        Upgrade Now
      </button>
      <button onClick={() => setDismissed(true)} className="text-text-muted hover:text-white ml-1">
        <X size={13} />
      </button>
    </motion.div>
  );
};

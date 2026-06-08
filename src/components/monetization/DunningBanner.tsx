import { motion } from 'framer-motion';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { getDunningMessage } from '../../lib/billingUtils';
import { useState } from 'react';

/**
 * DunningBanner — Warning banner shown when payment has failed.
 * Shows retry count, grace period, and a link to update payment method.
 */
export const DunningBanner = () => {
  const navigate = useNavigate();
  const { paymentFailed, retryCount, gracePeriodEndsAt } = useSubscriptionStore();
  const [dismissed, setDismissed] = useState(false);

  if (!paymentFailed || dismissed) return null;

  const message = getDunningMessage(retryCount, gracePeriodEndsAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="shrink-0 px-4 py-2.5 flex items-center justify-center gap-3 text-xs font-medium bg-gradient-to-r from-hazard/15 to-hazard/5 border-b border-hazard/20"
    >
      <AlertCircle size={14} className="text-hazard shrink-0" />
      <span className="text-hazard/90">{message}</span>
      <button
        onClick={() => navigate('/settings')}
        className="px-3 py-1 bg-hazard text-white rounded-md font-bold hover:bg-red-400 transition-colors flex items-center gap-1"
      >
        <CreditCard size={11} />
        Update Payment
      </button>
      <button onClick={() => setDismissed(true)} className="text-hazard/50 hover:text-hazard ml-1">
        <X size={13} />
      </button>
    </motion.div>
  );
};

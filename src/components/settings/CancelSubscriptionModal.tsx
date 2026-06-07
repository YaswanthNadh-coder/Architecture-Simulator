import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { formatBillingDate } from '../../lib/billingUtils';

interface CancelSubscriptionModalProps {
  onClose: () => void;
}

type Step = 'reason' | 'retain' | 'confirm' | 'done';

const CANCEL_REASONS = [
  'Too expensive',
  'Not using it enough',
  'Missing features I need',
  'Switching to another tool',
  'Course semester ended',
  'Other',
];

export const CancelSubscriptionModal = ({ onClose }: CancelSubscriptionModalProps) => {
  const { user } = useAuthStore();
  const { cancelSubscription, currentPeriodEnd, billingInterval, changeBillingInterval } = useSubscriptionStore();
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!user) return;
    setLoading(true);
    await cancelSubscription(user.id);
    setLoading(false);
    setStep('done');
  };

  const handleSwitchToAnnual = async () => {
    if (!user) return;
    setLoading(true);
    await changeBillingInterval(user.id, 'annual');
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl relative"
      >
        {step !== 'done' && (
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white">✕</button>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Reason */}
          {step === 'reason' && (
            <motion.div key="reason" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">We're sorry to see you go</h2>
              <p className="text-sm text-text-muted mb-6">Help us improve — why are you canceling?</p>

              <div className="space-y-2 mb-6">
                {CANCEL_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      selectedReason === reason
                        ? 'bg-brand-500/10 border-brand-500/30 text-white'
                        : 'bg-bg-panel border-border-subtle text-text-muted hover:text-white hover:border-white/10'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(billingInterval === 'monthly' ? 'retain' : 'confirm')}
                disabled={!selectedReason}
                className="w-full py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 2: Retention offer */}
          {step === 'retain' && (
            <motion.div key="retain" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">Before you go...</h2>
              <p className="text-sm text-text-muted mb-6">
                Switch to annual billing and save $36/year — that's 4 months free!
              </p>

              <div className="bg-gradient-to-r from-brand-500/10 to-cyan-500/5 border border-brand-500/20 rounded-xl p-5 mb-6">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm text-white font-semibold">Pro Annual</span>
                  <span className="text-lg font-bold text-white">$72<span className="text-sm text-text-muted">/yr</span></span>
                </div>
                <p className="text-xs text-text-muted">$6/mo effective — save vs $9/mo monthly</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSwitchToAnnual}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/25"
                >
                  {loading ? 'Switching...' : 'Switch to Annual & Save'}
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="w-full py-2 text-sm text-text-muted hover:text-white transition-colors"
                >
                  No thanks, continue canceling
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Final confirmation */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-hazard/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-hazard" />
                </div>
                <h2 className="text-lg font-bold text-white">Confirm cancellation</h2>
              </div>

              <div className="bg-bg-panel rounded-xl border border-border-subtle p-4 mb-6 space-y-2">
                <p className="text-sm text-text-main">
                  Your access will continue until <span className="text-white font-semibold">{currentPeriodEnd ? formatBillingDate(currentPeriodEnd) : 'the end of your billing period'}</span>.
                </p>
                <p className="text-xs text-text-muted">
                  After that, your account will revert to the Free plan. Programs beyond the 10-program limit will become read-only.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-hazard/10 text-hazard font-semibold hover:bg-hazard/20 transition-all border border-hazard/20"
                >
                  {loading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-text-muted hover:text-white transition-colors"
                >
                  Never mind, keep my plan
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center"
              >
                <Check size={28} className="text-text-muted" />
              </motion.div>
              <h2 className="text-lg font-bold text-white mb-2">Subscription canceled</h2>
              <p className="text-sm text-text-muted mb-6">
                You'll retain Pro access until {currentPeriodEnd ? formatBillingDate(currentPeriodEnd) : 'your period ends'}.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors font-semibold text-sm"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

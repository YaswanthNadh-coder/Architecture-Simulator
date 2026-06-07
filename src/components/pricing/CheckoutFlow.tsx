import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, Loader2, CreditCard, Sparkles, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { StripeService } from '../../lib/stripeService';
import { formatPrice, calculateAnnualSavings, getProPrice } from '../../lib/billingUtils';
import { isEduEmail, type TierName, type BillingInterval } from '../../lib/tierConfig';

interface CheckoutFlowProps {
  tier: TierName;
  defaultInterval?: BillingInterval;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'plan' | 'payment' | 'processing' | 'success';

export const CheckoutFlow = ({ tier, defaultInterval = 'annual', onClose, onSuccess }: CheckoutFlowProps) => {
  const { user } = useAuthStore();
  const { subscribe, startTrial } = useSubscriptionStore();
  const [step, setStep] = useState<Step>('plan');
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const isStudentDiscount = isEduEmail(user?.email ?? '');
  const startAsTrial = true;

  const price = getProPrice(interval, isStudentDiscount);
  const savings = calculateAnnualSavings(isStudentDiscount);

  const handleStartTrial = async () => {
    if (!user) return;
    setStep('processing');
    await startTrial(user.id);
    setTimeout(() => setStep('success'), 1500);
  };

  const handlePayment = async () => {
    if (!user) return;
    setStep('processing');

    // Simulate Stripe checkout
    const session = await StripeService.createCheckoutSession(tier, interval, user.email ?? '');
    await StripeService.completeCheckout(session);
    await subscribe(user.id, tier, interval, isStudentDiscount);

    setTimeout(() => setStep('success'), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl relative overflow-hidden"
      >
        {step !== 'processing' && step !== 'success' && (
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white z-10">✕</button>
        )}

        <AnimatePresence mode="wait">
          {/* ── Step 1: Plan Confirmation ─────────────────────────── */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Upgrade to {tier.charAt(0).toUpperCase() + tier.slice(1)}</h2>
                  <p className="text-xs text-text-muted">Unlock the full simulator experience</p>
                </div>
              </div>

              {/* Interval toggle */}
              {tier === 'pro' && (
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setInterval('monthly')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                      interval === 'monthly'
                        ? 'bg-brand-500/10 border-brand-500/50 text-brand-400'
                        : 'bg-bg-panel border-border-subtle text-text-muted hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setInterval('annual')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border relative ${
                      interval === 'annual'
                        ? 'bg-brand-500/10 border-brand-500/50 text-brand-400'
                        : 'bg-bg-panel border-border-subtle text-text-muted hover:text-white'
                    }`}
                  >
                    Annual
                    <span className="absolute -top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      SAVE {savings.savingsPercent}%
                    </span>
                  </button>
                </div>
              )}

              {/* Student discount */}
              {isStudentDiscount && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <GraduationCap size={16} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">
                    Student discount applied — .edu email verified
                  </span>
                </div>
              )}

              {/* Price summary */}
              <div className="bg-bg-panel rounded-xl border border-border-subtle p-4 mb-6">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-text-muted text-sm">
                    Pro {interval === 'annual' ? 'Annual' : 'Monthly'}
                    {isStudentDiscount ? ' (Student)' : ''}
                  </span>
                  <span className="text-white font-bold text-lg">{formatPrice(price, false)}</span>
                </div>
                <p className="text-xs text-text-muted">
                  {interval === 'annual' 
                    ? `${formatPrice(Math.round(price / 12), false)}/mo billed annually` 
                    : 'Billed monthly. Switch to annual to save.'
                  }
                </p>
              </div>

              {/* Trial option */}
              <div className="space-y-3">
                <button
                  onClick={handleStartTrial}
                  className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Start 14-Day Free Trial
                </button>
                <button
                  onClick={() => setStep('payment')}
                  className="w-full py-3 rounded-xl bg-white/5 text-text-muted font-semibold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} />
                  Pay Now — Skip Trial
                </button>
              </div>

              <p className="text-center text-xs text-text-muted mt-4">
                No credit card required for trial. Cancel anytime.
              </p>
            </motion.div>
          )}

          {/* ── Step 2: Payment Form ─────────────────────────────── */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Payment details</h2>
                <p className="text-sm text-text-muted">
                  You'll be charged {formatPrice(price)} {interval === 'annual' ? 'annually' : 'monthly'}.
                </p>
              </div>

              {/* Mock Card Form */}
              <div className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Card Information</label>
                  <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-base">
                    <input type="text" placeholder="4242 4242 4242 4242" className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none border-b border-border-subtle placeholder:text-text-muted/50" />
                    <div className="flex">
                      <input type="text" placeholder="MM / YY" className="w-1/2 bg-transparent px-4 py-3 text-sm text-white outline-none border-r border-border-subtle placeholder:text-text-muted/50" />
                      <input type="text" placeholder="CVC" className="w-1/2 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-text-muted/50" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Cardholder Name</label>
                  <input type="text" placeholder="Ada Lovelace" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-3 text-sm text-white outline-none placeholder:text-text-muted/50" />
                </div>
              </div>

              <button
                onClick={handlePayment}
                className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
              >
                Pay {formatPrice(price)}
              </button>

              <button
                onClick={() => setStep('plan')}
                className="w-full py-2 mt-3 text-sm text-text-muted hover:text-white transition-colors"
              >
                ← Back to plan selection
              </button>

              <p className="text-center text-xs text-text-muted mt-4 flex items-center justify-center gap-1">
                <Shield size={12} /> Secure checkout powered by Stripe
              </p>
            </motion.div>
          )}

          {/* ── Step 3: Processing ───────────────────────────────── */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 flex flex-col items-center justify-center"
            >
              <Loader2 size={40} className="text-brand-500 animate-spin mb-4" />
              <p className="text-white font-semibold">Setting up your account...</p>
              <p className="text-text-muted text-sm mt-1">This will only take a moment.</p>
            </motion.div>
          )}

          {/* ── Step 4: Success ──────────────────────────────────── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 flex flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
              >
                <Check size={32} className="text-emerald-400" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">You're all set! 🎉</h2>
              <p className="text-text-muted text-sm mb-8">
                {startAsTrial 
                  ? 'Your 14-day Pro trial has started. Enjoy full access!'
                  : `Your Pro ${interval} subscription is now active.`
                }
              </p>
              <button
                onClick={onSuccess}
                className="px-8 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25"
              >
                Start Exploring
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

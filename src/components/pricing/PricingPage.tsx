import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, GraduationCap, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { PRICING, TIER_DISPLAY } from '../../lib/tierConfig';
import { PricingToggle } from './PricingToggle';
import { FeatureComparisonTable } from './FeatureComparisonTable';

/** Format cents to a display price string */
function formatPrice(cents: number, showCents = true): string {
  const dollars = cents / 100;
  if (!showCents && dollars === Math.floor(dollars)) {
    return `$${Math.floor(dollars)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

/** Calculate savings between monthly and annual billing */
function calculateAnnualSavings(isStudentDiscount: boolean) {
  const monthly = isStudentDiscount ? PRICING.pro.studentMonthly : PRICING.pro.monthly;
  const annual = isStudentDiscount ? PRICING.pro.studentAnnual : PRICING.pro.annual;
  const yearlyAtMonthly = monthly * 12;
  const savingsAmount = yearlyAtMonthly - annual;
  const savingsPercent = Math.round((savingsAmount / yearlyAtMonthly) * 100);
  return { savingsAmount, savingsPercent };
}

export const PricingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isEdu } = useAuthStore();
  const { tier: currentTier, startTrial } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [isAnnual, setIsAnnual] = useState(true);

  const savings = calculateAnnualSavings(isEdu);

  const proPrice = isAnnual
    ? (isEdu ? PRICING.pro.studentAnnual : PRICING.pro.annual)
    : (isEdu ? PRICING.pro.studentMonthly : PRICING.pro.monthly);

  const proMonthlyEffective = isAnnual ? Math.round(proPrice / 12) : proPrice;

  const handleStartTrial = async () => {
    if (!isAuthenticated || !user) {
      navigate('/register');
      return;
    }
    await startTrial(user.id);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-main relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, #3b82f6 0%, transparent 60%)' }} />
      <div className="absolute top-40 right-0 w-72 h-72 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto relative z-10 px-6 py-20">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
              Level up your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">
                architectural
              </span>{' '}
              workflow.
            </h1>
            <p className="text-lg text-text-muted mb-2">
              Whether you're learning on your own or enrolled in a course.
            </p>
          </motion.div>
        </div>

        {/* ── Toggle ─────────────────────────────────────────── */}
        <PricingToggle
          isAnnual={isAnnual}
          onChange={setIsAnnual}
          savingsText={isAnnual ? `Save ${savings.savingsPercent}%` : undefined}
        />

        {/* ── Tier Cards ─────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto items-start">

          {/* Free Tier */}
          <PlanCard
            name="Free"
            price="$0"
            interval="forever"
            description={TIER_DISPLAY.free.description}
            features={[
              '10 saved programs',
              '50 lines per program',
              'Visual pipeline simulator',
              'Basic hazard detection',
              'Fixed branch prediction',
              'Community forum support',
            ]}
            cta={currentTier === 'free' ? 'Current Plan' : 'Get Started Free'}
            onClick={() => isAuthenticated ? navigate('/') : navigate('/register')}
            current={currentTier === 'free'}
          />

          {/* Pro Tier */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-brand-500/40 to-cyan-500/20 opacity-40 blur-lg" />
            <PlanCard
              name="Pro"
              price={formatPrice(proMonthlyEffective, false)}
              interval={isAnnual ? '/mo billed annually' : '/mo'}
              badge="MOST POPULAR"
              description={TIER_DISPLAY.pro.description}
              highlight
              features={[
                'Unlimited programs & lines',
                'Cache simulation module',
                '4 branch prediction strategies',
                'Step-back debugger',
                'Timing diagram export (PNG/SVG)',
                'Performance analytics dashboard',
                'Concept mastery tracker',
                'RISC-V assembly support',
                'Syntax error explanations',
                'Session sharing',
                'Email support (48h SLA)',
              ]}
              cta={currentTier === 'pro' ? 'Current Plan' : 'Start Free Trial'}
              onClick={handleStartTrial}
              current={currentTier === 'pro'}
              studentBadge={isEdu}
              subPrice={isAnnual ? `${formatPrice(proPrice, false)}/year total` : undefined}
              trialText="14-day free trial — no credit card"
            />
          </div>
        </div>

        {/* ── Designed for ───────────────────────────────────── */}
        <div className="text-center mt-16 mb-4">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-4">Designed for</p>
          <div className="flex items-center justify-center gap-8 opacity-40">
            <span className="text-sm font-semibold text-text-muted">CS Students</span>
            <span className="text-border-subtle">•</span>
            <span className="text-sm font-semibold text-text-muted">Bootcamps</span>
            <span className="text-border-subtle">•</span>
            <span className="text-sm font-semibold text-text-muted">Self-Learners</span>
          </div>
        </div>

        {/* ── Feature Comparison Table ────────────────────────── */}
        <FeatureComparisonTable />

        {/* ── FAQ ────────────────────────────────────────────── */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            <FaqItem
              question="Can I try Pro for free?"
              answer="Yes! Every account gets a 14-day Pro trial with full access — no credit card required. At the end of the trial, your account automatically reverts to Free."
            />
            <FaqItem
              question="What's the student discount?"
              answer="If you register with a .edu email address, you automatically get Pro at $5/month instead of $9/month. No third-party verification required."
            />
            <FaqItem
              question="What happens to my data if I downgrade?"
              answer="Your data is retained for 30 days after downgrade. Programs beyond the Free tier's 10-program limit are not deleted — they become read-only until you upgrade again or remove extras."
            />
            <FaqItem
              question="Will you add more ISA support (ARM, RISC-V)?"
              answer="Yes! RISC-V support is coming for Pro users. We're also planning ARM architecture support in a future release. Stay tuned!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Plan Card Component ─────────────────────────────────────────────────

interface PlanCardProps {
  name: string;
  price: string;
  interval?: string;
  description: string;
  features: string[];
  cta: string;
  onClick: () => void;
  current: boolean;
  highlight?: boolean;
  badge?: string;
  studentBadge?: boolean;
  subPrice?: string;
  trialText?: string;
}

const PlanCard = ({
  name, price, interval, description, features, cta, onClick, current,
  highlight, badge, studentBadge, subPrice, trialText,
}: PlanCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`relative flex flex-col p-7 rounded-3xl border h-full transition-all duration-300 hover:-translate-y-1
      ${highlight
        ? 'bg-bg-surface border-brand-500/40 shadow-2xl shadow-brand-500/10'
        : 'bg-bg-panel border-border-subtle hover:border-white/10'
      }`}
  >
    {badge && (
      <div className="absolute top-0 right-7 -translate-y-1/2">
        <span className="bg-gradient-to-r from-brand-500 to-cyan-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-brand-500/30">
          {badge}
        </span>
      </div>
    )}

    <div className="mb-6">
      <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
      <p className="text-text-muted text-xs min-h-[36px] leading-relaxed">{description}</p>
    </div>

    <div className="mb-1">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{price}</span>
        {interval && <span className="text-text-muted text-sm">{interval}</span>}
      </div>
      {subPrice && (
        <p className="text-xs text-text-muted mt-0.5">{subPrice}</p>
      )}
    </div>

    {studentBadge && (
      <div className="flex items-center gap-1.5 mt-2 mb-1">
        <GraduationCap size={12} className="text-emerald-400" />
        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
          .edu discount applied
        </span>
      </div>
    )}

    {trialText && !current && (
      <p className="text-[10px] text-brand-400 font-medium mt-1 mb-0">{trialText}</p>
    )}

    <button
      onClick={onClick}
      disabled={current}
      className={`w-full py-3 rounded-xl font-semibold transition-all mt-6 mb-6 flex items-center justify-center gap-2 text-sm
        ${current
          ? 'bg-white/5 text-text-muted cursor-not-allowed'
          : highlight
            ? 'bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/25'
            : 'bg-white text-bg-base hover:bg-gray-200'
        }`}
    >
      {current ? '✓ Current Plan' : cta}
      {!current && <ArrowRight size={14} />}
    </button>

    <div className="flex flex-col gap-3 mt-auto">
      {features.map((f) => (
        <div key={f} className="flex items-start gap-2.5">
          <Check size={14} className={`mt-0.5 shrink-0 ${highlight ? 'text-cyan-400' : 'text-brand-500'}`} />
          <span className="text-xs text-text-main leading-relaxed">{f}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// ── FAQ Item ────────────────────────────────────────────────────────────

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden bg-bg-surface/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white">{question}</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-6 pb-4"
        >
          <p className="text-sm text-text-muted leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </div>
  );
};

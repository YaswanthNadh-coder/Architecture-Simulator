import { motion } from 'framer-motion';

interface PricingToggleProps {
  isAnnual: boolean;
  onChange: (isAnnual: boolean) => void;
  savingsText?: string;
}

export const PricingToggle = ({ isAnnual, onChange, savingsText }: PricingToggleProps) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <button
        onClick={() => onChange(false)}
        className={`text-sm font-semibold transition-colors ${
          !isAnnual ? 'text-white' : 'text-text-muted hover:text-white/70'
        }`}
      >
        Monthly
      </button>

      <button
        onClick={() => onChange(!isAnnual)}
        className="relative w-14 h-8 rounded-full bg-bg-panel border border-border-subtle p-1 transition-colors"
        aria-label="Toggle billing interval"
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-500 to-cyan-400 shadow-lg shadow-brand-500/30"
          style={{ marginLeft: isAnnual ? 'auto' : 0 }}
        />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(true)}
          className={`text-sm font-semibold transition-colors ${
            isAnnual ? 'text-white' : 'text-text-muted hover:text-white/70'
          }`}
        >
          Annual
        </button>
        {savingsText && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30"
          >
            {savingsText}
          </motion.span>
        )}
      </div>
    </div>
  );
};

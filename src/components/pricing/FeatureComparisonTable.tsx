import { Fragment } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { FEATURE_COMPARISON, TIER_CONFIGS, type TierName } from '../../lib/tierConfig';

const TIERS: TierName[] = ['free', 'pro', 'institution', 'enterprise'];
const TIER_LABELS: Record<TierName, string> = {
  free: 'Free',
  pro: 'Pro',
  institution: 'Institution',
  enterprise: 'Enterprise',
};

export const FeatureComparisonTable = () => {
  return (
    <div className="mt-20 max-w-6xl mx-auto" id="feature-comparison">
      <h2 className="text-2xl font-bold text-white text-center mb-2">Compare all features</h2>
      <p className="text-text-muted text-center mb-10 text-sm">Every feature, every tier — at a glance.</p>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="bg-bg-panel border-b border-border-subtle">
              <th className="text-left py-4 px-6 text-text-muted font-medium w-[280px]">Feature</th>
              {TIERS.map(tier => (
                <th key={tier} className="py-4 px-4 text-center">
                  <span className={`font-bold ${tier === 'pro' ? 'text-brand-400' : 'text-white'}`}>
                    {TIER_LABELS[tier]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {FEATURE_COMPARISON.map((category, catIdx) => (
              <Fragment key={`cat-group-${catIdx}`}>
                {/* Category header */}
                <tr className="bg-bg-surface/50">
                  <td colSpan={5} className="py-3 px-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      {category.name}
                    </span>
                  </td>
                </tr>

                {/* Feature rows */}
                {category.items.map((item, itemIdx) => (
                  <tr
                    key={`${catIdx}-${itemIdx}`}
                    className="border-b border-border-subtle/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-6 text-text-main">{item.label}</td>
                    {TIERS.map(tier => {
                      const value = TIER_CONFIGS[tier][item.feature];
                      return (
                        <td key={tier} className="py-3 px-4 text-center">
                          <CellValue value={value} formatter={item.formatter} highlight={tier === 'pro'} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function CellValue({
  value,
  formatter,
  highlight,
}: {
  value: unknown;
  formatter?: (v: unknown) => string;
  highlight: boolean;
}) {
  // Custom formatter
  if (formatter) {
    const text = formatter(value);
    return (
      <span className={`text-xs font-medium ${highlight ? 'text-brand-400' : 'text-text-main'}`}>
        {text}
      </span>
    );
  }

  // Boolean
  if (typeof value === 'boolean') {
    if (value) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
          <Check size={14} className="text-emerald-400" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5">
        <X size={14} className="text-text-muted/50" />
      </span>
    );
  }

  // Number
  if (typeof value === 'number') {
    if (value === -1) {
      return <span className={`text-xs font-medium ${highlight ? 'text-brand-400' : 'text-text-main'}`}>Unlimited</span>;
    }
    if (value === 0) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5">
          <Minus size={14} className="text-text-muted/50" />
        </span>
      );
    }
    return <span className={`text-xs font-medium ${highlight ? 'text-brand-400' : 'text-text-main'}`}>{value}</span>;
  }

  // Array (e.g. branch prediction options)
  if (Array.isArray(value)) {
    return <span className={`text-xs font-medium ${highlight ? 'text-brand-400' : 'text-text-main'}`}>{value.length}</span>;
  }

  // String
  return <span className={`text-xs font-medium ${highlight ? 'text-brand-400' : 'text-text-main'}`}>{String(value)}</span>;
}

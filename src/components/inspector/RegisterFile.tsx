import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';

export const RegisterFile = () => {
  const { registers, cycle, modifiedRegs, readRegs } = useSimulatorStore();
  const registerEntries = Object.entries(registers);

  return (
    <div className="h-full bg-bg-panel border-t border-border-subtle flex flex-col">
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-bold tracking-[0.15em] text-text-muted uppercase">Register File</h2>
        <span className="text-[11px] text-text-muted font-mono">
          {cycle === 0 ? '32 registers  •  initial state' : `32 registers  •  after cycle ${cycle}`}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
          {registerEntries.map(([name, val], index) => {
            const isHighlighted = readRegs.has(index); // Read this cycle
            const isModified    = modifiedRegs.has(index); // Written this cycle

            const highlightClass = isHighlighted
              ? 'bg-brand-500/15 border-brand-500/50'
              : isModified
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-bg-surface border-border-subtle';

            const nameColor = isHighlighted
              ? 'text-brand-500'
              : isModified
              ? 'text-emerald-400'
              : 'text-text-muted';

            const valColor = isHighlighted || isModified ? 'text-white' : 'text-text-main';

            return (
              <motion.div
                key={name}
                layout
                animate={isHighlighted ? {
                  boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 12px rgba(59,130,246,0.4)', '0 0 0px rgba(59,130,246,0)'],
                  transition: { duration: 1.5, repeat: Infinity }
                } : {}}
                className={`flex flex-col font-mono rounded-lg border px-2 py-1.5 transition-colors duration-300 ${highlightClass}`}
              >
                <span className={`text-[10px] font-bold leading-none mb-0.5 ${nameColor}`}>{name}</span>
                <span className={`text-[10px] leading-tight truncate ${valColor}`}>{val}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

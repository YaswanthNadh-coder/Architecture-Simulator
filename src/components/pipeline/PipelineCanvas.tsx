import { motion, AnimatePresence } from 'framer-motion';
import { useSimulatorStore, type StageState, type InstructionStatus } from '../../store/simulatorStore';

const stageColors: Record<InstructionStatus, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  normal:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.35)',  glow: '0 0 20px rgba(16,185,129,0.15)',  text: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400' },
  hazard:  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.5)',    glow: '0 0 20px rgba(239,68,68,0.25)',   text: '#ef4444', badge: 'bg-red-500/20 text-red-400' },
  forward: { bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.5)',    glow: '0 0 20px rgba(234,179,8,0.25)',   text: '#eab308', badge: 'bg-yellow-500/20 text-yellow-400' },
  stall:   { bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.35)', glow: 'none',                             text: '#64748b', badge: 'bg-slate-500/20 text-slate-400' },
  bubble:  { bg: 'transparent',            border: 'transparent',            glow: 'none',                             text: '#475569', badge: '' },
};

const STAGE_LABELS: Record<string, { full: string; desc: string; color: string }> = {
  IF:  { full: 'Instruction Fetch',  desc: 'Read from PC',         color: '#818cf8' },
  ID:  { full: 'Instruction Decode', desc: 'Decode & Read Regs',   color: '#a78bfa' },
  EX:  { full: 'Execute',            desc: 'ALU Operation',        color: '#60a5fa' },
  MEM: { full: 'Memory Access',      desc: 'Load / Store',         color: '#34d399' },
  WB:  { full: 'Write Back',         desc: 'Update Registers',     color: '#fb923c' },
};

export const PipelineCanvas = () => {
  const { pipeline, cycle } = useSimulatorStore();
  const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'] as const;

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden">
      {/* Legend */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center gap-5 text-xs">
          {[
            { status: 'normal'  as InstructionStatus, label: 'Normal'      },
            { status: 'hazard'  as InstructionStatus, label: 'Data Hazard' },
            { status: 'forward' as InstructionStatus, label: 'Forwarding'  },
            { status: 'stall'   as InstructionStatus, label: 'Stall'       },
          ].map(({ status, label }) => {
            const c = stageColors[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: c.text, boxShadow: c.glow }}
                />
                <span className="text-text-muted">{label}</span>
              </div>
            );
          })}
        </div>
        <span className="text-xs text-text-muted font-mono">
          {cycle === 0 ? 'Ready — press ▶ to step' : `Cycle ${cycle}`}
        </span>
      </div>

      {/* Stage headers */}
      <div className="grid grid-cols-5 gap-3 px-6 pt-5 pb-2 shrink-0">
        {stages.map((s) => {
          const meta = STAGE_LABELS[s];
          return (
            <div key={s} className="flex flex-col items-center gap-0.5">
              <span
                className="text-sm font-bold tracking-widest"
                style={{ color: meta.color, textShadow: `0 0 10px ${meta.color}55` }}
              >
                {s}
              </span>
              <span className="text-[10px] text-text-muted text-center leading-tight hidden md:block">
                {meta.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pipeline stage cards */}
      <div className="grid grid-cols-5 gap-3 px-6 pb-4 flex-1 min-h-0" style={{ gridTemplateRows: '1fr' }}>
        {stages.map((stage, idx) => (
          <div key={stage} className="relative flex">
            <PipelineStage name={stage} state={pipeline[stage]} />
            {/* Connector arrow */}
            {idx < stages.length - 1 && (
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M0 6H10M10 6L6 2M10 6L6 10" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PipelineStage = ({ name, state }: { name: string; state: StageState }) => {
  const colors = stageColors[state.status];
  const hasInstruction = !!state.instruction;

  return (
    <div
      className="flex-1 rounded-xl border flex flex-col overflow-hidden relative"
      style={{
        background: 'rgba(30,41,59,0.6)',
        borderColor: '#1e293b',
      }}
    >
      {/* depth slots */}
      <div className="flex flex-col gap-2 p-3 h-full">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex-1 rounded-lg border border-white/5"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          />
        ))}
      </div>

      {/* Active instruction card — overlaid on top */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={state.id + name}
          initial={{ y: -30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="absolute inset-3 rounded-lg border-2 flex flex-col items-center justify-center p-2 backdrop-blur-sm"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            boxShadow: colors.glow,
          }}
        >
          {hasInstruction ? (
            <>
              <span
                className="font-mono text-[11px] font-semibold text-center leading-tight text-white break-all"
                style={{ wordBreak: 'break-word' }}
              >
                {state.instruction}
              </span>
              {state.status !== 'normal' && state.status !== 'bubble' && (
                <span
                  className={`text-[9px] mt-1.5 font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${colors.badge}`}
                >
                  {state.status}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] font-mono italic" style={{ color: colors.text }}>
              bubble
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

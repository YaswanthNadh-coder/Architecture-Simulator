import { useSimulatorStore, type InstructionStatus } from '../../store/simulatorStore';
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ParsedInstruction } from '../../engine/mipsParser';

const STAGE_NAMES = ['IF', 'ID', 'EX', 'MEM', 'WB'] as const;

const stageColorMap: Record<string, string> = {
  'normal-bg': 'bg-emerald-500/20',
  'normal-text': 'text-emerald-400',
  'normal-border': 'border-emerald-500/30',
  'hazard-bg': 'bg-red-500/20',
  'hazard-text': 'text-red-400',
  'hazard-border': 'border-red-500/30',
  'forward-bg': 'bg-yellow-500/20',
  'forward-text': 'text-yellow-400',
  'forward-border': 'border-yellow-500/30',
  'stall-bg': 'bg-slate-500/20',
  'stall-text': 'text-slate-400',
  'stall-border': 'border-slate-500/30',
  'bubble-bg': 'bg-slate-800/30',
  'bubble-text': 'text-slate-600',
  'bubble-border': 'border-slate-700/30',
};

function getStageClasses(status: InstructionStatus | string) {
  const bg = stageColorMap[`${status}-bg`] ?? 'bg-brand-500/20';
  const text = stageColorMap[`${status}-text`] ?? 'text-brand-400';
  const border = stageColorMap[`${status}-border`] ?? 'border-brand-500/30';
  return `${bg} ${text} ${border}`;
}

// Build the timing grid from cycle history
interface TimingEntry {
  stage: string;
  status: string;
}

interface InstructionTimeline {
  instruction: ParsedInstruction;
  entries: Map<number, TimingEntry>; // cycle → { stage, status }
}

function buildTimingGrid(cycleHistory: typeof useSimulatorStore.prototype.cycleHistory): {
  timelines: InstructionTimeline[];
  maxCycle: number;
} {
  const instructionMap = new Map<number, InstructionTimeline>(); // keyed by instruction address
  const instructionOrder: number[] = [];
  let maxCycle = 0;

  for (const record of cycleHistory) {
    maxCycle = Math.max(maxCycle, record.cycle);

    for (const stageName of STAGE_NAMES) {
      const stageData = record[stageName];
      if (!stageData.instruction) continue;

      const addr = stageData.instruction.address;
      if (!instructionMap.has(addr)) {
        instructionMap.set(addr, {
          instruction: stageData.instruction,
          entries: new Map(),
        });
        instructionOrder.push(addr);
      }

      const timeline = instructionMap.get(addr)!;
      // Only record if we don't already have an entry for this cycle (prefer non-bubble)
      if (!timeline.entries.has(record.cycle) || stageData.status !== 'bubble') {
        timeline.entries.set(record.cycle, {
          stage: stageName,
          status: stageData.status,
        });
      }
    }
  }

  const timelines = instructionOrder.map(addr => instructionMap.get(addr)!);
  return { timelines, maxCycle };
}

export const TimingView = () => {
  const { cycleHistory, cycle, instructions } = useSimulatorStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentCycleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current cycle
  useEffect(() => {
    if (currentCycleRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = currentCycleRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      if (elRect.right > containerRect.right - 48 || elRect.left < containerRect.left + 200) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [cycle]);

  const { timelines, maxCycle } = buildTimingGrid(cycleHistory);
  const displayCycles = Math.max(maxCycle + 3, 10);
  const cycles = Array.from({ length: displayCycles }, (_, i) => i + 1);

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Timing Diagram</h2>
          {/* Legend */}
          <div className="flex items-center gap-3 ml-4 text-[10px]">
            {[
              { label: 'Normal', color: 'bg-emerald-500' },
              { label: 'Hazard', color: 'bg-red-500' },
              { label: 'Forward', color: 'bg-yellow-500' },
              { label: 'Stall', color: 'bg-slate-500' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-sm ${color}`} />
                <span className="text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <span className="text-xs text-text-muted font-mono">
          {instructions.length} instructions • {cycle} cycles
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-bg-surface border border-border-subtle rounded-xl relative"
      >
        {/* Header Row (Cycles) */}
        <div className="flex border-b border-border-subtle bg-bg-panel sticky top-0 z-10">
          <div className="w-52 shrink-0 p-3 border-r border-border-subtle text-[10px] font-bold text-text-muted uppercase tracking-wider sticky left-0 bg-bg-panel z-20">
            Instruction
          </div>
          <div className="flex min-w-max">
            {cycles.map(c => (
              <div
                key={c}
                ref={c === cycle ? currentCycleRef : undefined}
                className={`w-14 shrink-0 p-3 text-center text-[10px] font-mono border-r border-border-subtle transition-colors ${
                  c === cycle
                    ? 'bg-brand-500/15 text-brand-400 font-bold'
                    : 'text-text-muted'
                }`}
              >
                C{c}
              </div>
            ))}
          </div>
        </div>

        {/* Rows (Instructions) */}
        <div className="min-w-max pb-4">
          {timelines.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              Assemble and step through a program to see the timing diagram.
            </div>
          ) : (
            timelines.map((timeline, idx) => (
              <div
                key={`inst-${timeline.instruction.address}`}
                className={`flex border-b border-border-subtle/50 hover:bg-white/[0.02] transition-colors ${
                  idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                }`}
              >
                {/* Instruction label */}
                <div className="w-52 shrink-0 px-3 py-2 border-r border-border-subtle flex items-center gap-2 sticky left-0 bg-bg-surface z-10">
                  <span className="text-[9px] font-mono text-text-muted/50 w-4 text-right shrink-0">
                    {timeline.instruction.line}
                  </span>
                  <span
                    className="text-[11px] font-mono text-text-main truncate"
                    title={timeline.instruction.raw}
                  >
                    {timeline.instruction.raw}
                  </span>
                </div>

                {/* Cycle cells */}
                <div className="flex">
                  {cycles.map(c => {
                    const entry = timeline.entries.get(c);
                    const isCurrent = c === cycle;

                    return (
                      <div
                        key={c}
                        className={`w-14 h-10 shrink-0 border-r border-border-subtle/30 flex items-center justify-center p-1 transition-colors ${
                          isCurrent ? 'bg-brand-500/5' : ''
                        }`}
                      >
                        {entry && (
                          <motion.div
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className={`w-full h-full flex items-center justify-center text-[10px] font-bold rounded border ${getStageClasses(entry.status)}`}
                            title={`${entry.stage} — ${entry.status}`}
                          >
                            {entry.stage}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

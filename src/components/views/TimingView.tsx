import { useSimulatorStore } from '../../store/simulatorStore';
import { motion } from 'framer-motion';

export const TimingView = () => {
  const { instructions, cycle, pipeline } = useSimulatorStore();

  // For a real timing diagram, we would store history of all stages per instruction.
  // Since we don't have full history exposed to the UI component easily, 
  // we will visualize a conceptual timing grid for the first 10 instructions,
  // showing their *current* pipeline position, which gives a sense of the timing flow.

  const visibleInstructions = instructions.slice(0, 15);
  const maxCycles = Math.max(cycle + 5, 10);
  const cycles = Array.from({ length: maxCycles }, (_, i) => i + 1);

  const getStageForInstAtCycle = (instLine: number, targetCycle: number) => {
    // This is a simplified approximation for the UI since we don't have the full trace
    // Just map the current pipeline state back to the instruction
    if (targetCycle === cycle) {
      if (pipeline.IF.line === instLine) return { stage: 'IF', status: pipeline.IF.status };
      if (pipeline.ID.line === instLine) return { stage: 'ID', status: pipeline.ID.status };
      if (pipeline.EX.line === instLine) return { stage: 'EX', status: pipeline.EX.status };
      if (pipeline.MEM.line === instLine) return { stage: 'MEM', status: pipeline.MEM.status };
      if (pipeline.WB.line === instLine) return { stage: 'WB', status: pipeline.WB.status };
    }
    // Very naive approximation for past/future cycles to draw the diagonal
    const diff = targetCycle - cycle;
    let currentStageIndex = -1;
    if (pipeline.IF.line === instLine) currentStageIndex = 0;
    else if (pipeline.ID.line === instLine) currentStageIndex = 1;
    else if (pipeline.EX.line === instLine) currentStageIndex = 2;
    else if (pipeline.MEM.line === instLine) currentStageIndex = 3;
    else if (pipeline.WB.line === instLine) currentStageIndex = 4;

    if (currentStageIndex !== -1) {
      const stageIdx = currentStageIndex + diff;
      if (stageIdx === 0) return { stage: 'IF', status: 'normal' };
      if (stageIdx === 1) return { stage: 'ID', status: 'normal' };
      if (stageIdx === 2) return { stage: 'EX', status: 'normal' };
      if (stageIdx === 3) return { stage: 'MEM', status: 'normal' };
      if (stageIdx === 4) return { stage: 'WB', status: 'normal' };
    }
    return null;
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'hazard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'forward': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'stall': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-brand-500/20 text-brand-400 border-brand-500/30';
    }
  };

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Timing Diagram</h2>
        <span className="text-xs text-text-muted">Cycle {cycle}</span>
      </div>

      <div className="flex-1 overflow-auto bg-bg-surface border border-border-subtle rounded-xl custom-scrollbar relative">
        {/* Header Row (Cycles) */}
        <div className="flex border-b border-border-subtle bg-bg-panel sticky top-0 z-10">
          <div className="w-48 shrink-0 p-3 border-r border-border-subtle text-xs font-bold text-text-muted uppercase tracking-wider">
            Instruction
          </div>
          <div className="flex min-w-max">
            {cycles.map(c => (
              <div key={c} className={`w-12 shrink-0 p-3 text-center text-xs font-mono border-r border-border-subtle ${c === cycle ? 'bg-brand-500/10 text-brand-400' : 'text-text-muted'}`}>
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Rows (Instructions) */}
        <div className="min-w-max pb-4">
          {visibleInstructions.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">Assemble a program to view the timing diagram.</div>
          ) : (
            visibleInstructions.map((inst, idx) => (
              <div key={idx} className="flex border-b border-border-subtle/50 hover:bg-white/5 transition-colors">
                <div className="w-48 shrink-0 p-3 border-r border-border-subtle flex items-center">
                  <span className="text-xs font-mono text-text-main truncate" title={inst.raw}>{inst.raw}</span>
                </div>
                <div className="flex">
                  {cycles.map(c => {
                    const stageData = getStageForInstAtCycle(inst.line, c);
                    return (
                      <div key={c} className={`w-12 h-10 shrink-0 border-r border-border-subtle/50 flex items-center justify-center p-1 ${c === cycle ? 'bg-brand-500/5' : ''}`}>
                        {stageData && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`w-full h-full flex items-center justify-center text-[10px] font-bold rounded border ${getStageColor(stageData.status)}`}
                          >
                            {stageData.stage}
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

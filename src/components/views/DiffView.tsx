import { useState, useEffect, useCallback } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { assemble } from '../../engine/mipsParser';
import { MIPSPipelineEngine } from '../../engine/pipelineEngine';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const DiffView = () => {
  const { code, isa } = useSimulatorStore();
  
  const [statsOn, setStatsOn] = useState<{ total: number; stalls: number; instrs: number; regs: Int32Array; mem: Map<number, number> } | null>(null);
  const [statsOff, setStatsOff] = useState<{ total: number; stalls: number; instrs: number; regs: Int32Array; mem: Map<number, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [comparisonType, setComparisonType] = useState<'forwarding' | 'branching'>('forwarding');

  const runComparison = useCallback(() => {
    if (!code.trim()) {
      setStatsOn(null);
      setStatsOff(null);
      setError(null);
      return;
    }

    setIsSimulating(true);
    setTimeout(() => {
      try {
        const result = assemble(code);
        if (result.errors.some(e => e.severity === 'error')) {
          setError('Code has assembly errors. Fix them to see the forwarding comparison.');
          setStatsOn(null);
          setStatsOff(null);
          setIsSimulating(false);
          return;
        }

        // Run Option A (Optimized: Forwarding ON or Always Taken)
        const engineOn = new MIPSPipelineEngine();
        engineOn.isa = isa;
        if (comparisonType === 'forwarding') {
          engineOn.forwardingEnabled = true;
          engineOn.branchPrediction = 'not-taken';
        } else {
          engineOn.forwardingEnabled = true;
          engineOn.branchPrediction = 'always-taken';
        }
        engineOn.loadProgram(result.instructions);
        engineOn.loadDataSegment(result.dataSegment);
        let onTotal = 0, onStalls = 0, onInstrs = 0;
        let onFinished = false;
        for (let i = 0; i < 1000; i++) {
          engineOn.step();
          onTotal++;
          if (engineOn.getSnapshot().pipeline.ID.status === 'stall') onStalls++;
          if (engineOn.isFinished()) { onFinished = true; break; }
        }
        onInstrs = engineOn.getSnapshot().stats.instructionsCompleted;

        // Run Option B (Baseline: Forwarding OFF or Not Taken)
        const engineOff = new MIPSPipelineEngine();
        engineOff.isa = isa;
        if (comparisonType === 'forwarding') {
          engineOff.forwardingEnabled = false;
          engineOff.branchPrediction = 'not-taken';
        } else {
          engineOff.forwardingEnabled = true;
          engineOff.branchPrediction = 'not-taken';
        }
        engineOff.loadProgram(result.instructions);
        engineOff.loadDataSegment(result.dataSegment);
        let offTotal = 0, offStalls = 0, offInstrs = 0;
        let offFinished = false;
        for (let i = 0; i < 1000; i++) {
          engineOff.step();
          offTotal++;
          if (engineOff.getSnapshot().pipeline.ID.status === 'stall') offStalls++;
          if (engineOff.isFinished()) { offFinished = true; break; }
        }
        offInstrs = engineOff.getSnapshot().stats.instructionsCompleted;

        if (!onFinished || !offFinished) {
          setError('Program took too long to execute (infinite loop or awaiting input). Cannot compare performance.');
          setStatsOn(null);
          setStatsOff(null);
        } else {
          setError(null);
          setStatsOn({ total: onTotal, stalls: onStalls, instrs: onInstrs, regs: new Int32Array(engineOn.getRegisters()), mem: new Map(engineOn.getMemory()) });
          setStatsOff({ total: offTotal, stalls: offStalls, instrs: offInstrs, regs: new Int32Array(engineOff.getRegisters()), mem: new Map(engineOff.getMemory()) });
        }
      } catch (err) {
        setError('Error simulating comparison.');
      } finally {
        setIsSimulating(false);
      }
    }, 100); // give UI time to render loading state
  }, [code]);

  useEffect(() => {
    runComparison();
  }, [runComparison, comparisonType]);

  if (error) {
    return (
      <div className="flex-1 h-full bg-bg-base flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-4" />
          <p className="text-text-main text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isSimulating || !statsOn || !statsOff) {
    return (
      <div className="flex-1 h-full bg-bg-base flex items-center justify-center p-6">
        <p className="text-text-muted text-sm animate-pulse">Running comparative simulation...</p>
      </div>
    );
  }

  const savedCycles = statsOff.total - statsOn.total;
  const speedup = (statsOff.total / statsOn.total).toFixed(2);
  const diffStalls = statsOff.stalls - statsOn.stalls;

  // Compute Diffs
  const regDiffs: { reg: number; a: number; b: number }[] = [];
  for (let i = 1; i < 32; i++) {
    if (statsOn.regs[i] !== statsOff.regs[i]) {
      regDiffs.push({ reg: i, a: statsOn.regs[i], b: statsOff.regs[i] });
    }
  }
  
  const memDiffs: { addr: number; a: number; b: number }[] = [];
  const allAddrs = new Set([...statsOn.mem.keys(), ...statsOff.mem.keys()]);
  for (const addr of allAddrs) {
    const va = statsOn.mem.get(addr) ?? 0;
    const vb = statsOff.mem.get(addr) ?? 0;
    if (va !== vb) {
      memDiffs.push({ addr, a: va, b: vb });
    }
  }

  const optName = comparisonType === 'forwarding' ? 'Forwarding ON' : 'Branch Always-Taken';
  const baseName = comparisonType === 'forwarding' ? 'Forwarding OFF' : 'Branch Not-Taken';

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-2">What-If Analysis</h2>
          <p className="text-text-muted text-xs">
            A side-by-side comparison of how your code performs under different hardware configurations.
          </p>
        </div>
        <div className="flex bg-bg-surface border border-border-subtle rounded-lg p-1">
          <button
            onClick={() => setComparisonType('forwarding')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${comparisonType === 'forwarding' ? 'bg-brand-500 text-white' : 'text-text-muted hover:text-white'}`}
          >
            Forwarding
          </button>
          <button
            onClick={() => setComparisonType('branching')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${comparisonType === 'branching' ? 'bg-brand-500 text-white' : 'text-text-muted hover:text-white'}`}
          >
            Branch Prediction
          </button>
        </div>
      </div>

      {/* Hero Metric */}
      <div className="flex justify-center mb-10">
        <div className="bg-bg-panel border border-border-subtle rounded-2xl p-6 text-center max-w-lg w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-emerald-400" />
          <h3 className="text-text-muted text-xs uppercase tracking-widest font-bold mb-4">Performance Gain</h3>
          
          <div className="flex items-center justify-center gap-8 mb-2">
            <div className="text-center">
              <span className="text-4xl font-black text-emerald-400">{savedCycles}</span>
              <p className="text-[10px] text-text-muted uppercase mt-1">Cycles Saved</p>
            </div>
            <div className="w-px h-12 bg-border-subtle" />
            <div className="text-center">
              <span className="text-4xl font-black text-brand-400">{speedup}x</span>
              <p className="text-[10px] text-text-muted uppercase mt-1">Speedup</p>
            </div>
          </div>
          
          {savedCycles > 0 ? (
            <p className="text-xs text-text-main mt-4">
              The optimized configuration saved <span className="text-emerald-400 font-bold">{diffStalls}</span> stall cycles!
            </p>
          ) : savedCycles < 0 ? (
            <p className="text-xs text-text-main mt-4 text-hazard">
              The optimized configuration actually performed worse!
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-4">
              Your code's performance is identical under both configurations.
            </p>
          )}
        </div>
      </div>

      {/* Side by Side Comparison */}
      <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {/* Forwarding ON */}
        <div className="bg-bg-surface border border-brand-500/30 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(59,130,246,0.05)]">
          <div className="bg-brand-500/10 px-4 py-3 border-b border-brand-500/20 flex items-center justify-between">
            <h3 className="text-brand-400 font-bold text-sm flex items-center gap-2">
              <CheckCircle2 size={16} /> {optName}
            </h3>
            <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-bold uppercase">Optimized</span>
          </div>
          
          <div className="p-5 flex flex-col gap-4">
            <StatRow label="Total Execution Cycles" value={statsOn.total} />
            <StatRow label="Stall Cycles (Bubbles)" value={statsOn.stalls} highlight={statsOn.stalls > 0 ? 'text-yellow-400' : 'text-emerald-400'} />
            <StatRow label="Instructions Completed" value={statsOn.instrs} />
            
            <div className="mt-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block">Pipeline Efficiency</span>
              <ProgressBar value={(statsOn.instrs / statsOn.total) * 100} color="bg-emerald-500" />
              <div className="text-right text-[10px] font-mono text-emerald-400 mt-1">
                {((statsOn.instrs / statsOn.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Forwarding OFF */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
          <div className="bg-bg-panel px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-text-main font-bold text-sm">
              {baseName}
            </h3>
            <span className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded font-bold uppercase">Baseline</span>
          </div>
          
          <div className="p-5 flex flex-col gap-4">
            <StatRow label="Total Execution Cycles" value={statsOff.total} />
            <StatRow label="Stall Cycles (Bubbles)" value={statsOff.stalls} highlight={statsOff.stalls > 0 ? 'text-hazard' : 'text-emerald-400'} />
            <StatRow label="Instructions Completed" value={statsOff.instrs} />
            
            <div className="mt-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block">Pipeline Efficiency</span>
              <ProgressBar value={(statsOff.instrs / statsOff.total) * 100} color="bg-brand-500" />
              <div className="text-right text-[10px] font-mono text-brand-400 mt-1">
                {((statsOff.instrs / statsOff.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* State Differences */}
      {(regDiffs.length > 0 || memDiffs.length > 0) && (
        <div className="max-w-4xl mx-auto w-full mt-8 bg-bg-surface border border-hazard/50 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          <div className="bg-hazard/10 px-4 py-3 border-b border-hazard/20 flex items-center gap-2">
            <AlertTriangle size={16} className="text-hazard" />
            <h3 className="text-hazard font-bold text-sm">State Divergence Detected</h3>
          </div>
          <div className="p-5">
            <p className="text-xs text-text-main mb-4">
              The execution resulted in different final states. This usually indicates a pipeline hazard wasn't properly resolved in the baseline, causing incorrect data to be written!
            </p>
            <div className="grid grid-cols-2 gap-8">
              {regDiffs.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Register Diffs</h4>
                  <div className="space-y-1">
                    {regDiffs.map(d => (
                      <div key={d.reg} className="flex items-center justify-between text-xs bg-bg-base p-2 rounded border border-border-subtle">
                        <span className="text-text-muted font-mono">$r{d.reg}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-brand-400">{d.a}</span>
                          <span className="text-text-muted">vs</span>
                          <span className="text-hazard">{d.b}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {memDiffs.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Memory Diffs</h4>
                  <div className="space-y-1">
                    {memDiffs.map(d => (
                      <div key={d.addr} className="flex items-center justify-between text-xs bg-bg-base p-2 rounded border border-border-subtle">
                        <span className="text-text-muted font-mono">0x{d.addr.toString(16).padStart(8, '0')}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-brand-400">{d.a}</span>
                          <span className="text-text-muted">vs</span>
                          <span className="text-hazard">{d.b}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

const StatRow = ({ label, value, highlight }: { label: string; value: number; highlight?: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-text-main text-xs">{label}</span>
    <span className={`text-sm font-mono font-bold ${highlight || 'text-white'}`}>{value}</span>
  </div>
);

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <div className="w-full h-1.5 bg-bg-panel rounded-full overflow-hidden">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className={`h-full ${color}`} 
    />
  </div>
);

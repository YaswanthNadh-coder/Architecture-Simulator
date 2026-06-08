import { useState, useEffect, useCallback } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { assemble } from '../../engine/mipsParser';
import { MIPSPipelineEngine } from '../../engine/pipelineEngine';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const DiffView = () => {
  const { code } = useSimulatorStore();
  
  const [statsOn, setStatsOn] = useState<{ total: number; stalls: number; instrs: number } | null>(null);
  const [statsOff, setStatsOff] = useState<{ total: number; stalls: number; instrs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

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

        // Run with Forwarding ON
        const engineOn = new MIPSPipelineEngine();
        engineOn.forwardingEnabled = true;
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

        // Run with Forwarding OFF
        const engineOff = new MIPSPipelineEngine();
        engineOff.forwardingEnabled = false;
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
          setStatsOn({ total: onTotal, stalls: onStalls, instrs: onInstrs });
          setStatsOff({ total: offTotal, stalls: offStalls, instrs: offInstrs });
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
  }, [runComparison]);

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

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-2">Forwarding Impact Analysis</h2>
        <p className="text-text-muted text-xs">
          A side-by-side comparison of how your current code performs with and without data forwarding paths (EX→EX and MEM→EX).
        </p>
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
              Forwarding resolved <span className="text-emerald-400 font-bold">{diffStalls}</span> data hazards without needing to stall the pipeline!
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-4">
              Your code didn't trigger any data hazards that forwarding could solve.
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
              <CheckCircle2 size={16} /> Forwarding ON
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
              Forwarding OFF
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

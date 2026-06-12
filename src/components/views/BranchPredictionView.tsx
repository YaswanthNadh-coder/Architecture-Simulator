import { useSimulatorStore } from '../../store/simulatorStore';
import { motion } from 'framer-motion';
import { Target, TrendingUp, GitBranch, AlertTriangle } from 'lucide-react';

export const BranchPredictionView = () => {
  const { stats, branchPrediction } = useSimulatorStore();

  const totalBranches = stats.branchCount;
  const mispredictions = stats.branchMispredictions;
  const correctPredictions = totalBranches - mispredictions;
  const accuracy = totalBranches > 0 ? (correctPredictions / totalBranches) * 100 : 0;

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-2">Branch Prediction Analysis</h2>
        <p className="text-text-muted text-xs">
          Analyze how well your selected branch predictor performs on your code.
        </p>
      </div>

      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Predictor Info */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch size={16} className="text-brand-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Current Predictor</h3>
            </div>
            <div className="text-2xl font-black text-brand-400 capitalize mb-2">
              {branchPrediction.replace('-', ' ')}
            </div>
            <p className="text-xs text-text-muted">
              {branchPrediction === 'not-taken' 
                ? 'Assumes branches are never taken. Flushes pipeline if a branch is actually taken.'
                : 'Assumes branches are always taken. Flushes pipeline if a branch is actually not taken.'}
            </p>
          </div>
        </div>

        {/* Accuracy Circular Chart */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-brand-500" />
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 w-full text-left">Prediction Accuracy</h3>
          
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--color-bg-panel)"
                strokeWidth="10"
              />
              {/* Foreground circle */}
              <motion.circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--color-emerald-500)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - accuracy / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-white">{accuracy.toFixed(1)}<span className="text-sm">%</span></span>
            </div>
          </div>
        </div>

        {/* Stats List */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Metrics</h3>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base p-3 rounded-lg border border-border-subtle">
            <span className="text-xs text-text-muted">Total Branches</span>
            <span className="font-mono text-sm font-bold text-white">{totalBranches}</span>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base p-3 rounded-lg border border-border-subtle">
            <span className="text-xs text-text-muted">Correct Predictions</span>
            <span className="font-mono text-sm font-bold text-emerald-400">{correctPredictions}</span>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base p-3 rounded-lg border border-hazard/30">
            <span className="text-xs text-text-muted">Mispredictions (Flushes)</span>
            <span className="font-mono text-sm font-bold text-hazard">{mispredictions}</span>
          </div>
        </div>

      </div>

      {totalBranches > 0 && mispredictions > (totalBranches / 2) && (
        <div className="max-w-4xl mx-auto w-full mt-6 bg-hazard/10 border border-hazard/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-hazard shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-hazard mb-1">High Misprediction Rate Detected</h4>
            <p className="text-xs text-text-main">
              Your code's branches behave opposite to the '{branchPrediction}' strategy most of the time. 
              Try switching the branch predictor in the Settings panel to improve pipeline efficiency.
            </p>
          </div>
        </div>
      )}

      {totalBranches === 0 && (
        <div className="max-w-4xl mx-auto w-full mt-6 bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Target size={32} className="text-brand-400 mb-3" />
          <h4 className="text-sm font-bold text-white mb-2">No Branches Executed</h4>
          <p className="text-xs text-text-muted max-w-md">
            Execute some branch instructions (like beq or bne) to see how the branch predictor handles them.
          </p>
        </div>
      )}
    </div>
  );
};

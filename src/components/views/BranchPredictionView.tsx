import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { motion } from 'framer-motion';
import { Target, TrendingUp, GitBranch, AlertTriangle, Cpu } from 'lucide-react';

export const BranchPredictionView = () => {
  const { stats, branchPrediction, getEngine } = useSimulatorStore();
  const engine = getEngine();
  const branchTracker = engine.branchPredictor;

  const bht = branchTracker.getBHT();
  const btb = branchTracker.getBTB();

  const totalBranches = stats.branchCount;
  const mispredictions = stats.branchMispredictions;
  const correctPredictions = totalBranches - mispredictions;
  const accuracy = totalBranches > 0 ? (correctPredictions / totalBranches) * 100 : 0;

  // Selected BHT entry for state machine display
  const [selectedPC, setSelectedPC] = useState<number | null>(null);

  // Default selection to first BHT entry if none is selected
  const activePC = selectedPC !== null ? selectedPC : (bht.length > 0 ? bht[0].address : null);
  const activeEntry = bht.find(e => e.address === activePC);
  const activeState = activeEntry ? activeEntry.state : 'strongly-not-taken';

  const nodeStates = [
    { id: 'strongly-not-taken', label: 'Strongly Not Taken', binary: '00', color: 'text-red-500 bg-red-500/10' },
    { id: 'weakly-not-taken', label: 'Weakly Not Taken', binary: '01', color: 'text-orange-400 bg-orange-400/10' },
    { id: 'weakly-taken', label: 'Weakly Taken', binary: '10', color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'strongly-taken', label: 'Strongly Taken', binary: '11', color: 'text-emerald-500 bg-emerald-500/10' }
  ];

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="mb-6 shrink-0">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-2 font-display">Branch Prediction Analysis</h2>
        <p className="text-text-muted text-xs">
          Analyze branch behavior, Branch History Table (BHT), Branch Target Buffer (BTB), and the 2-bit prediction state machine.
        </p>
      </div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
        {/* Predictor Info */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch size={16} className="text-brand-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Current Strategy</h3>
            </div>
            <div className="text-2xl font-black text-brand-400 capitalize mb-2 font-display">
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
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-brand-500" />
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 w-full text-left">Prediction Accuracy</h3>
          
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--color-bg-panel)"
                strokeWidth="8"
              />
              <motion.circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--color-emerald-500)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - accuracy / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white font-mono">{accuracy.toFixed(1)}<span className="text-xs">%</span></span>
            </div>
          </div>
        </div>

        {/* Stats List */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Metrics</h3>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base px-3 py-2 rounded-lg border border-border-subtle">
            <span className="text-xs text-text-muted">Total Branches</span>
            <span className="font-mono text-xs font-bold text-white">{totalBranches}</span>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base px-3 py-2 rounded-lg border border-border-subtle">
            <span className="text-xs text-text-muted">Correct Predictions</span>
            <span className="font-mono text-xs font-bold text-emerald-400">{correctPredictions}</span>
          </div>
          
          <div className="flex justify-between items-center bg-bg-base px-3 py-2 rounded-lg border border-hazard/20">
            <span className="text-xs text-text-muted">Mispredictions</span>
            <span className="font-mono text-xs font-bold text-hazard">{mispredictions}</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Pane */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* BHT and BTB Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Branch History Table (BHT) */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <GitBranch size={14} className="text-brand-400" /> Branch History Table (BHT)
            </h3>
            
            {bht.length === 0 ? (
              <div className="py-8 text-center bg-bg-panel border border-dashed border-border-subtle rounded-lg">
                <span className="text-xs text-text-muted italic">No branch entries tracked. Execute branch code first.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-text-muted font-bold">
                      <th className="py-2 px-3">Address</th>
                      <th className="py-2 px-3">Instruction</th>
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3 text-right">Hits/Misses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40">
                    {bht.map((entry) => {
                      const isSelected = activePC === entry.address;
                      return (
                        <tr 
                          key={entry.address}
                          onClick={() => setSelectedPC(entry.address)}
                          className={`cursor-pointer transition-colors hover:bg-white/5 ${
                            isSelected ? 'bg-brand-500/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-brand-400">
                            0x{entry.address.toString(16).toUpperCase()}
                          </td>
                          <td className="py-2 px-3 font-mono text-white">
                            {entry.instruction}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.state.includes('taken') && !entry.state.includes('not')
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {entry.state.replace(/-/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-text-muted">
                            <span className="text-emerald-400">{entry.hitCount}</span> / <span className="text-hazard">{entry.missCount}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Branch Target Buffer (BTB) */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Target size={14} className="text-cyan-400" /> Branch Target Buffer (BTB)
            </h3>
            
            {btb.length === 0 ? (
              <div className="py-8 text-center bg-bg-panel border border-dashed border-border-subtle rounded-lg">
                <span className="text-xs text-text-muted italic">No branch targets stored. Taken branches will populate BTB.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-text-muted font-bold">
                      <th className="py-2 px-3">Branch Tag</th>
                      <th className="py-2 px-3">Instruction</th>
                      <th className="py-2 px-3">Predicted Target</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40">
                    {btb.map((entry) => (
                      <tr key={entry.tag} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-brand-400">
                          0x{entry.tag.toString(16).toUpperCase()}
                        </td>
                        <td className="py-2 px-3 font-mono text-white">
                          {entry.instruction}
                        </td>
                        <td className="py-2 px-3 font-mono text-cyan-400">
                          0x{entry.target.toString(16).toUpperCase()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[9px]">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 2-Bit State Machine SVG Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-lg flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} className="text-emerald-400" /> 2-Bit Predictor State Machine
              </h3>
              {activeEntry && (
                <span className="text-[10px] font-mono text-brand-400 font-bold">
                  Branch PC: 0x{activeEntry.address.toString(16).toUpperCase()}
                </span>
              )}
            </div>

            <p className="text-[11px] text-text-muted mb-4">
              Highlights transition paths. A branch must fail twice to change direction prediction.
            </p>

            {/* SVG Visualizer Container */}
            <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 flex items-center justify-center min-h-[300px]">
              <svg width="100%" height="260" viewBox="0 0 640 240" className="overflow-visible select-none">
                <defs>
                  {/* Arrow Marker Definitions */}
                  <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4B5563" />
                  </marker>
                  <marker id="arrow-taken" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                  </marker>
                  <marker id="arrow-nontaken" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
                  </marker>

                  {/* Gradient Glow */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* State Machine Transition Paths */}
                {/* 00 -> 01 (Taken) */}
                <path 
                  d="M 115 100 Q 160 70 205 100" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  markerEnd="url(#arrow-taken)" 
                />
                <text x="160" y="70" fill="#10B981" className="text-[10px] font-bold font-mono" textAnchor="middle">T</text>

                {/* 01 -> 00 (Not Taken) */}
                <path 
                  d="M 205 120 Q 160 150 115 120" 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth="2" 
                  markerEnd="url(#arrow-nontaken)" 
                />
                <text x="160" y="155" fill="#EF4444" className="text-[10px] font-bold font-mono" textAnchor="middle">NT</text>

                {/* 01 -> 10 (Taken) */}
                <path 
                  d="M 275 100 Q 320 70 365 100" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  markerEnd="url(#arrow-taken)" 
                />
                <text x="320" y="70" fill="#10B981" className="text-[10px] font-bold font-mono" textAnchor="middle">T</text>

                {/* 10 -> 01 (Not Taken) */}
                <path 
                  d="M 365 120 Q 320 150 275 120" 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth="2" 
                  markerEnd="url(#arrow-nontaken)" 
                />
                <text x="320" y="155" fill="#EF4444" className="text-[10px] font-bold font-mono" textAnchor="middle">NT</text>

                {/* 10 -> 11 (Taken) */}
                <path 
                  d="M 435 100 Q 480 70 525 100" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  markerEnd="url(#arrow-taken)" 
                />
                <text x="480" y="70" fill="#10B981" className="text-[10px] font-bold font-mono" textAnchor="middle">T</text>

                {/* 11 -> 10 (Not Taken) */}
                <path 
                  d="M 525 120 Q 480 150 435 120" 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth="2" 
                  markerEnd="url(#arrow-nontaken)" 
                />
                <text x="480" y="155" fill="#EF4444" className="text-[10px] font-bold font-mono" textAnchor="middle">NT</text>

                {/* Strongly Not Taken Loop */}
                <path 
                  d="M 60 90 C 30 70 30 150 60 130" 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth="2" 
                  markerEnd="url(#arrow-nontaken)" 
                />
                <text x="25" y="115" fill="#EF4444" className="text-[10px] font-bold font-mono" textAnchor="middle">NT</text>

                {/* Strongly Taken Loop */}
                <path 
                  d="M 580 90 C 610 70 610 150 580 130" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  markerEnd="url(#arrow-taken)" 
                />
                <text x="615" y="115" fill="#10B981" className="text-[10px] font-bold font-mono" textAnchor="middle">T</text>

                {/* Render Nodes */}
                {nodeStates.map((node, idx) => {
                  const cx = 80 + idx * 160;
                  const cy = 110;
                  const isSelectedState = activeState === node.id;
                  
                  return (
                    <g key={node.id} className="cursor-default">
                      <circle
                        cx={cx}
                        cy={cy}
                        r="35"
                        fill={isSelectedState ? 'var(--color-brand-500)' : 'var(--color-bg-base)'}
                        stroke={isSelectedState ? 'var(--color-cyan-400)' : 'var(--color-border-subtle)'}
                        strokeWidth={isSelectedState ? '3.5' : '1.5'}
                        filter={isSelectedState ? 'url(#glow)' : undefined}
                        className="transition-all duration-300"
                      />
                      <text 
                        x={cx} 
                        y={cy - 2} 
                        fill={isSelectedState ? '#FFFFFF' : 'var(--color-text-muted)'} 
                        className="text-[9px] font-bold font-display" 
                        textAnchor="middle"
                      >
                        {node.binary}
                      </text>
                      <text 
                        x={cx} 
                        y={cy + 12} 
                        fill={isSelectedState ? '#FFFFFF' : 'var(--color-text-muted)'} 
                        className="text-[7.5px] font-bold tracking-tighter" 
                        textAnchor="middle"
                      >
                        {node.id.split('-').map(w => w[0].toUpperCase()).join('')}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Explanation card below BHT counter */}
            <div className="mt-4 bg-bg-panel border border-border-subtle rounded-xl p-3 text-xs space-y-2">
              <span className="font-bold text-white">Legend:</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Strongly/Weakly Taken</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Strongly/Weakly Not Taken</span>
                <span className="flex items-center gap-1.5 font-bold text-brand-400">T = Taken (Predicts Taken)</span>
                <span className="flex items-center gap-1.5 font-bold text-hazard">NT = Not Taken</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {totalBranches > 0 && mispredictions > (totalBranches / 2) && (
        <div className="max-w-6xl mx-auto w-full mt-6 bg-hazard/10 border border-hazard/30 rounded-xl p-4 flex items-start gap-3">
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
        <div className="max-w-6xl mx-auto w-full mt-6 bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Target size={32} className="text-brand-400 mb-3 animate-pulse" />
          <h4 className="text-sm font-bold text-white mb-2">No Branches Executed</h4>
          <p className="text-xs text-text-muted max-w-md">
            Execute some branch instructions (like beq, bne, bgtz, etc.) in the simulator to see BHT states, BTB target predictions, and 2-bit counter node highlights.
          </p>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { motion } from 'framer-motion';
import { Target, GitBranch, AlertTriangle, Cpu } from 'lucide-react';

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
  const [tableTab, setTableTab] = useState<'bht' | 'btb'>('bht');

  // Default selection to first BHT entry if none is selected
  const activePC = selectedPC !== null ? selectedPC : (bht.length > 0 ? bht[0].address : null);
  const activeEntry = bht.find(e => e.address === activePC);
  const activeState = activeEntry ? activeEntry.state : 'strongly-not-taken';

  // Empty state
  if (totalBranches === 0) {
    return (
      <div className="flex-1 h-full bg-bg-base flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-10 flex flex-col items-center text-center max-w-md shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5">
            <Target size={28} className="text-brand-400 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-white mb-2 font-display">No Branches Executed</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Execute branch instructions (beq, bne, bgtz, etc.) in the simulator to see the Branch History Table, Branch Target Buffer, and 2-bit predictor state machine.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-y-auto custom-scrollbar animate-fade-in">

      {/* ── Compact Stat Bar ─────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-3 bg-bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Strategy */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <GitBranch size={14} className="text-brand-400" />
            </div>
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider block leading-none">Strategy</span>
              <span className="text-xs font-bold text-brand-400 capitalize">{branchPrediction.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="w-px h-8 bg-border-subtle" />

          {/* Accuracy ring */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-bg-panel)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke={accuracy >= 70 ? '#10B981' : accuracy >= 40 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - accuracy / 100) }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white font-mono">
                {accuracy.toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider block leading-none">Accuracy</span>
              <span className="text-xs font-bold text-white">{correctPredictions}/{totalBranches}</span>
            </div>
          </div>

          <div className="w-px h-8 bg-border-subtle" />

          {/* Quick metrics */}
          <div className="flex items-center gap-4">
            <StatChip label="Branches" value={totalBranches} color="text-white" />
            <StatChip label="Correct" value={correctPredictions} color="text-emerald-400" />
            <StatChip label="Missed" value={mispredictions} color="text-red-400" />
          </div>

          {/* Misprediction warning */}
          {mispredictions > totalBranches / 2 && (
            <>
              <div className="w-px h-8 bg-border-subtle" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/8 border border-red-500/20 rounded-lg">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-[10px] text-red-400 font-semibold">High miss rate — try switching strategy</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 lg:gap-0">

        {/* ── Left: Tables (BHT / BTB) ──────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border-subtle">
          {/* Tab switcher */}
          <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0">
            <button
              onClick={() => setTableTab('bht')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                tableTab === 'bht'
                  ? 'bg-bg-surface text-brand-400 border border-border-subtle border-b-transparent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <GitBranch size={11} className="inline mr-1 -mt-0.5" />
              BHT ({bht.length})
            </button>
            <button
              onClick={() => setTableTab('btb')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                tableTab === 'btb'
                  ? 'bg-bg-surface text-cyan-400 border border-border-subtle border-b-transparent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Target size={11} className="inline mr-1 -mt-0.5" />
              BTB ({btb.length})
            </button>
          </div>

          {/* Table content */}
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-bg-surface mx-4 mb-4 rounded-b-xl rounded-tr-xl border border-border-subtle">
            {tableTab === 'bht' ? (
              bht.length === 0 ? (
                <EmptyTable message="No branch entries tracked yet." />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-bg-panel z-10">
                    <tr className="border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3">PC Address</th>
                      <th className="py-2 px-3">Instruction</th>
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3 text-right">Hit / Miss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30">
                    {bht.map((entry) => {
                      const isSelected = activePC === entry.address;
                      return (
                        <tr
                          key={entry.address}
                          onClick={() => setSelectedPC(entry.address)}
                          className={`cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-brand-500/10 border-l-2 border-l-brand-500'
                              : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                          }`}
                        >
                          <td className="py-1.5 px-3 font-mono font-bold text-brand-400 text-[11px]">
                            0x{entry.address.toString(16).toUpperCase().padStart(8, '0')}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-white text-[11px]">
                            {entry.instruction}
                          </td>
                          <td className="py-1.5 px-3">
                            <StateBadge state={entry.state} />
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-[11px]">
                            <span className="text-emerald-400">{entry.hitCount}</span>
                            <span className="text-text-muted mx-1">/</span>
                            <span className="text-red-400">{entry.missCount}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              btb.length === 0 ? (
                <EmptyTable message="No branch targets stored. Execute taken branches to populate." />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-bg-panel z-10">
                    <tr className="border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3">Branch Tag</th>
                      <th className="py-2 px-3">Instruction</th>
                      <th className="py-2 px-3">Predicted Target</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30">
                    {btb.map((entry) => (
                      <tr key={entry.tag} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-1.5 px-3 font-mono font-bold text-brand-400 text-[11px]">
                          0x{entry.tag.toString(16).toUpperCase().padStart(8, '0')}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-white text-[11px]">
                          {entry.instruction}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-cyan-400 text-[11px]">
                          0x{entry.target.toString(16).toUpperCase().padStart(8, '0')}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[9px]">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* ── Right: 2-Bit State Machine ────────────────────────────── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col p-4">
          <div className="bg-bg-surface border border-border-subtle rounded-xl flex flex-col h-full shadow-lg">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={12} className="text-emerald-400" /> 2-Bit Predictor FSM
              </h3>
              {activeEntry && (
                <span className="text-[9px] font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                  PC: 0x{activeEntry.address.toString(16).toUpperCase()}
                </span>
              )}
            </div>

            {/* State Machine SVG */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-[280px]">
              <svg viewBox="0 0 320 280" className="w-full h-full max-w-[320px] max-h-[280px] overflow-visible select-none">
                <defs>
                  <marker id="bp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4B5563" />
                  </marker>
                  <marker id="bp-arrow-t" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                  </marker>
                  <marker id="bp-arrow-nt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
                  </marker>
                  <filter id="bp-glow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid layout:
                    SNT (80,70)    WNT (240,70)
                    ST  (80,210)   WT  (240,210)
                */}

                {/* ── Transition Arrows ─────────────────────── */}

                {/* SNT → WNT  (Taken, top row, left to right) */}
                <path d="M 115 60 Q 160 30 205 60" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#bp-arrow-t)" opacity={activeState === 'strongly-not-taken' ? 1 : 0.3} />
                <text x="160" y="28" fill="#10B981" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'strongly-not-taken' ? 1 : 0.35}>T</text>

                {/* WNT → SNT  (Not Taken, top row, right to left) */}
                <path d="M 205 80 Q 160 110 115 80" fill="none" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#bp-arrow-nt)" opacity={activeState === 'weakly-not-taken' ? 1 : 0.3} />
                <text x="160" y="112" fill="#EF4444" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'weakly-not-taken' ? 1 : 0.35}>NT</text>

                {/* WNT → WT  (Taken, right column, top to bottom) */}
                <path d="M 250 105 Q 280 140 250 175" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#bp-arrow-t)" opacity={activeState === 'weakly-not-taken' ? 1 : 0.3} />
                <text x="288" y="143" fill="#10B981" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'weakly-not-taken' ? 1 : 0.35}>T</text>

                {/* WT → WNT  (Not Taken, right column, bottom to top) */}
                <path d="M 230 175 Q 200 140 230 105" fill="none" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#bp-arrow-nt)" opacity={activeState === 'weakly-taken' ? 1 : 0.3} />
                <text x="192" y="143" fill="#EF4444" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'weakly-taken' ? 1 : 0.35}>NT</text>

                {/* WT → ST  (Taken, bottom row, right to left) */}
                <path d="M 205 220 Q 160 250 115 220" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#bp-arrow-t)" opacity={activeState === 'weakly-taken' ? 1 : 0.3} />
                <text x="160" y="256" fill="#10B981" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'weakly-taken' ? 1 : 0.35}>T</text>

                {/* ST → WT  (Not Taken, bottom row, left to right) */}
                <path d="M 115 200 Q 160 170 205 200" fill="none" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#bp-arrow-nt)" opacity={activeState === 'strongly-taken' ? 1 : 0.3} />
                <text x="160" y="168" fill="#EF4444" className="text-[9px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'strongly-taken' ? 1 : 0.35}>NT</text>

                {/* SNT self-loop (Not Taken) */}
                <path d="M 52 55 C 20 30 20 110 52 85" fill="none" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#bp-arrow-nt)" opacity={activeState === 'strongly-not-taken' ? 1 : 0.3} />
                <text x="14" y="73" fill="#EF4444" className="text-[8px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'strongly-not-taken' ? 1 : 0.35}>NT</text>

                {/* ST self-loop (Taken) */}
                <path d="M 52 195 C 20 170 20 250 52 225" fill="none" stroke="#10B981" strokeWidth="2" markerEnd="url(#bp-arrow-t)" opacity={activeState === 'strongly-taken' ? 1 : 0.3} />
                <text x="14" y="213" fill="#10B981" className="text-[8px] font-bold font-mono" textAnchor="middle" opacity={activeState === 'strongly-taken' ? 1 : 0.35}>T</text>

                {/* ── State Nodes ───────────────────────────── */}
                {[
                  { id: 'strongly-not-taken', label: 'SNT', binary: '00', cx: 80, cy: 70, predict: 'Not Taken' },
                  { id: 'weakly-not-taken', label: 'WNT', binary: '01', cx: 240, cy: 70, predict: 'Not Taken' },
                  { id: 'weakly-taken', label: 'WT', binary: '10', cx: 240, cy: 210, predict: 'Taken' },
                  { id: 'strongly-taken', label: 'ST', binary: '11', cx: 80, cy: 210, predict: 'Taken' },
                ].map((node) => {
                  const isActive = activeState === node.id;
                  const isTaken = node.predict === 'Taken';
                  return (
                    <g key={node.id}>
                      {/* Outer glow for active */}
                      {isActive && (
                        <circle
                          cx={node.cx} cy={node.cy} r="34"
                          fill="none"
                          stroke={isTaken ? '#10B981' : '#EF4444'}
                          strokeWidth="1"
                          opacity="0.4"
                          filter="url(#bp-glow)"
                        />
                      )}
                      <circle
                        cx={node.cx} cy={node.cy} r="28"
                        fill={isActive ? (isTaken ? '#10B981' : '#EF4444') : 'var(--color-bg-panel)'}
                        fillOpacity={isActive ? 0.15 : 1}
                        stroke={isActive ? (isTaken ? '#10B981' : '#EF4444') : 'var(--color-border-subtle)'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        className="transition-all duration-300"
                      />
                      <text
                        x={node.cx} y={node.cy - 5}
                        fill={isActive ? '#FFFFFF' : 'var(--color-text-muted)'}
                        className="text-[11px] font-black font-mono"
                        textAnchor="middle"
                      >
                        {node.binary}
                      </text>
                      <text
                        x={node.cx} y={node.cy + 10}
                        fill={isActive ? '#FFFFFF' : 'var(--color-text-muted)'}
                        className="text-[7px] font-bold tracking-tight"
                        textAnchor="middle"
                        opacity={0.7}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}

                {/* Predict labels */}
                <text x="160" y="60" fill="var(--color-text-muted)" className="text-[7px]" textAnchor="middle" opacity="0.4">PREDICT NOT TAKEN</text>
                <text x="160" y="230" fill="var(--color-text-muted)" className="text-[7px]" textAnchor="middle" opacity="0.4">PREDICT TAKEN</text>
              </svg>
            </div>

            {/* Legend */}
            <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-panel/50 rounded-b-xl shrink-0">
              <div className="flex items-center gap-4 text-[9px] text-text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Taken transition</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Not Taken transition</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-brand-400 inline-block" /> Active state</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <span className="text-[9px] text-text-muted uppercase tracking-wider block leading-none">{label}</span>
    <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const StateBadge = ({ state }: { state: string }) => {
  const isTaken = state.includes('taken') && !state.includes('not');
  const isStrong = state.includes('strongly');
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
      isTaken
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'bg-red-500/10 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isTaken ? 'bg-emerald-500' : 'bg-red-500'} ${isStrong ? 'opacity-100' : 'opacity-50'}`} />
      {state.replace(/-/g, ' ')}
    </span>
  );
};

const EmptyTable = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-12">
    <span className="text-xs text-text-muted italic">{message}</span>
  </div>
);

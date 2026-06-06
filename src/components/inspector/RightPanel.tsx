import { ExternalLink, AlertTriangle, Zap, Cpu, BookOpen, TerminalSquare } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { ISAReference } from './ISAReference';
import { useState } from 'react';

export const RightPanel = () => {
  const [activeTab, setActiveTab] = useState<'sim' | 'isa'>('sim');
  const { cycle, pipeline, forwardingEnabled, toggleForwarding, stats } = useSimulatorStore();

  // Derive active hazards from current pipeline state
  const hazardStages = Object.entries(pipeline).filter(([, s]) => s.status === 'hazard');
  const forwardStages = Object.entries(pipeline).filter(([, s]) => s.status === 'forward');
  const stallStages = Object.entries(pipeline).filter(([, s]) => s.status === 'stall');

  // Compute performance metrics based on real stats
  const totalInstructions = stats.instructionsCompleted;
  const stallCycles = stats.stallCycles;
  const totalCycles = stats.totalCycles;
  const cpi = stats.cpi;
  const usefulPct = stats.efficiency;

  return (
    <div className="w-[240px] xl:w-72 h-full bg-bg-surface border-l border-border-subtle flex flex-col overflow-hidden shrink-0">
      {/* Tabs */}
      <div className="flex px-4 pt-3 border-b border-border-subtle shrink-0 gap-4">
        <button
          onClick={() => setActiveTab('sim')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'sim' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
          }`}
        >
          Simulation
        </button>
        <button
          onClick={() => setActiveTab('isa')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'isa' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
          }`}
        >
          ISA Reference
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'isa' ? (
          <ISAReference />
        ) : (
          <div className="flex flex-col h-full">
      <Section title="Hazards" icon={<AlertTriangle size={13} className="text-hazard" />}>
        {hazardStages.length === 0 && forwardStages.length === 0 && stallStages.length === 0 ? (
          <p className="text-text-muted text-xs italic">None detected at cycle {cycle}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {hazardStages.map(([stage, s]) => s.instruction && (
              <HazardItem
                key={stage}
                color="bg-hazard"
                title="Data Hazard"
                desc={`${s.instruction} in ${stage} — read-after-write dependency`}
              />
            ))}
            {forwardStages.map(([stage, s]) => s.instruction && (
              <HazardItem
                key={stage}
                color="bg-forward"
                title="Forwarding Path"
                desc={`${s.instruction} in ${stage} → resolved via forwarding`}
              />
            ))}
            {stallStages.map(([stage, _s]) => (
              <HazardItem
                key={stage}
                color="bg-stall"
                title="Pipeline Stall"
                desc={`Bubble inserted in ${stage}`}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Performance ─────────────────────────────────────── */}
      <Section title="Performance" icon={<Zap size={13} className="text-brand-500" />}>
        <div className="flex flex-col gap-1.5">
          <Stat name="CPI"           value={String(cpi)} />
          <Stat name="Instructions"  value={String(totalInstructions)} />
          <Stat name="Cycles Elapsed" value={String(totalCycles)} />
          <Stat name="Stall cycles"  value={String(stallCycles)} highlight />
          <div className="mt-1 pt-2 border-t border-border-subtle">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-text-muted">Pipeline efficiency</span>
              <span className="font-mono text-white">{usefulPct}%</span>
            </div>
            <div className="w-full h-2 bg-bg-panel rounded-full overflow-hidden flex gap-px">
              <div
                className="h-full bg-emerald-500/80 rounded-l-full transition-all duration-500"
                style={{ width: `${usefulPct}%` }}
              />
              <div
                className="h-full bg-hazard/60 transition-all duration-500"
                style={{ width: `${totalCycles > 0 ? Math.round((stallCycles / totalCycles) * 100) : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mt-1 text-[9px]">
              <span className="text-emerald-500">■ Useful</span>
              <span className="text-hazard">■ Stall</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Config ──────────────────────────────────────────── */}
      <Section title="Config" icon={<Cpu size={13} className="text-text-muted" />}>
        <div className="flex flex-col gap-2.5">

          {/* Forwarding toggle */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-main">Forwarding</span>
            <button
              onClick={toggleForwarding}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                forwardingEnabled ? 'bg-brand-500' : 'bg-border-subtle'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  forwardingEnabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <ConfigRow label="Branch predict" value="Not taken" />
          <ConfigRow label="Cache sim"     value="Off" />
          <ConfigRow label="Delay slots"   value="Off" />
          <ConfigRow label="ISA"           value="MIPS I" />
        </div>
      </Section>

      {/* ── Assignment ──────────────────────────────────────── */}
      <Section title="Assignment" icon={<BookOpen size={13} className="text-text-muted" />} last>
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-white font-semibold text-sm">Lab 3 — Hazards</h4>
              <p className="text-text-muted text-xs">Task 2 of 4</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-medium shrink-0">
              Due 2d
            </span>
          </div>

          <div className="w-full h-1.5 bg-bg-panel rounded-full overflow-hidden mb-1">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: '50%', boxShadow: '0 0 6px rgba(59,130,246,0.5)' }} />
          </div>
          <p className="text-text-muted text-xs mb-3">50% complete — 2 of 4 tasks done</p>

          <div className="flex flex-col gap-1.5 mb-3">
            {[
              { label: 'Identify data hazards',    done: true },
              { label: 'Explain forwarding paths', done: true },
              { label: 'Count stall cycles',       done: false },
              { label: 'Optimise code',            done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${done ? 'bg-brand-500 border-brand-500' : 'border-border-subtle'}`}>
                  {done && <span className="text-white text-[9px] font-bold">✓</span>}
                </div>
                <span className={done ? 'text-text-muted line-through' : 'text-text-main'}>{label}</span>
              </div>
            ))}
          </div>

          <button className="text-xs text-brand-500 hover:text-brand-400 flex items-center gap-1 transition-colors">
            View rubric <ExternalLink size={11} />
          </button>
        </div>
      </Section>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const Section = ({
  title, icon, children, last = false
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; last?: boolean;
}) => (
  <div className={`p-5 ${last ? 'bg-bg-panel flex-1' : 'border-b border-border-subtle'}`}>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

const HazardItem = ({ color, title, desc }: { color: string; title: string; desc: string }) => (
  <div className="flex items-start gap-2">
    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
    <div>
      <p className="text-white text-xs font-medium">{title}</p>
      <p className="text-text-muted text-[11px] mt-0.5 leading-tight">{desc}</p>
    </div>
  </div>
);

const Stat = ({ name, value, highlight = false }: { name: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between items-center">
    <span className="text-text-main text-xs">{name}</span>
    <span className={`font-mono text-xs ${highlight ? 'text-hazard' : 'text-white'}`}>{value}</span>
  </div>
);

const ConfigRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-text-main">{label}</span>
    <span className="text-text-muted text-xs font-mono">{value}</span>
  </div>
);


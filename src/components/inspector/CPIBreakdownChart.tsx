import { useMemo } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { motion } from 'framer-motion';

export const CPIBreakdownChart = () => {
  const { stats } = useSimulatorStore();

  const data = useMemo(() => {
    const ideal = stats.instructionsCompleted;
    const dataStalls = stats.dataStallCycles;
    const controlStalls = stats.controlStallCycles;
    const memoryStalls = stats.memoryStallCycles;
    // Handle cases where total stalls in stats might be slightly off from our individual counters
    // due to edge cases (e.g., overlapping stalls, though our pipeline doesn't do that yet).
    const unaccountedStalls = Math.max(0, stats.stallCycles - dataStalls - controlStalls - memoryStalls);

    const total = ideal + dataStalls + controlStalls + memoryStalls + unaccountedStalls;
    if (total === 0) return [];

    return [
      { id: 'ideal', label: 'Ideal Execution', value: ideal, color: '#10b981', desc: 'Instructions completed' },
      { id: 'data', label: 'Data Hazards', value: dataStalls, color: '#ef4444', desc: 'Load-use stall cycles' },
      { id: 'control', label: 'Control Hazards', value: controlStalls, color: '#a855f7', desc: 'Branch flush penalties' },
      { id: 'memory', label: 'Memory Stalls', value: memoryStalls, color: '#f97316', desc: 'Cache miss/latency' },
      { id: 'other', label: 'Other Stalls', value: unaccountedStalls, color: '#64748b', desc: 'Miscellaneous stalls' },
    ].filter(d => d.value > 0).map(d => ({
      ...d,
      percent: (d.value / total) * 100
    }));
  }, [stats]);

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-text-muted italic border border-border-subtle rounded-xl bg-bg-panel mt-3">
        Run simulation to see CPI breakdown
      </div>
    );
  }

  // Calculate SVG stroke-dasharray properties
  let currentOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const chartSegments = data.map((segment) => {
    const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (segment.percent / 100) * circumference;
    
    return {
      ...segment,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const totalStalls = stats.dataStallCycles + stats.controlStallCycles + stats.memoryStallCycles;
  const wastePct = stats.totalCycles > 0 ? ((totalStalls / stats.totalCycles) * 100).toFixed(1) : '0.0';

  return (
    <div className="mt-3 p-3 bg-bg-panel border border-border-subtle rounded-xl flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        {/* Donut Chart */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1e3052" strokeWidth="16" />
            {chartSegments.map((seg) => (
              <motion.circle
                key={seg.id}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: seg.strokeDasharray }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider leading-none mb-0.5">CPI</span>
            <span className="text-sm font-bold text-white font-mono leading-none">{stats.cpi.toFixed(2)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {data.map(seg => (
            <div key={seg.id} className="flex items-center justify-between text-[10px] group relative" title={seg.desc}>
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-text-main truncate group-hover:text-white transition-colors">{seg.label}</span>
              </div>
              <span className="font-mono text-text-muted shrink-0 ml-2">
                {seg.percent.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-text-muted text-center pt-2 border-t border-border-subtle/50 leading-relaxed">
        Your CPI of <strong className="text-brand-400">{stats.cpi.toFixed(2)}</strong> means <strong className="text-white">{wastePct}%</strong> of cycles were wasted on stalls.
      </div>
    </div>
  );
};

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, BarChart3, Activity, Zap, Timer } from 'lucide-react';

interface SessionData {
  id: string;
  date: string;
  cpi: number;
  stallRate: number;
  hazards: { data: number; control: number; structural: number };
  cycles: number;
  instructions: number;
}

// Mock session data for demonstration
const MOCK_SESSIONS: SessionData[] = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (11 - i) * 3);
  const cpi = 1.2 + Math.random() * 1.5 - (i * 0.05); // trending down over time
  return {
    id: `s${i}`,
    date: date.toISOString(),
    cpi: Math.max(1, Math.round(cpi * 100) / 100),
    stallRate: Math.round(Math.random() * 30),
    hazards: {
      data: Math.floor(Math.random() * 15 + 2),
      control: Math.floor(Math.random() * 8),
      structural: Math.floor(Math.random() * 3),
    },
    cycles: Math.floor(Math.random() * 200 + 50),
    instructions: Math.floor(Math.random() * 100 + 20),
  };
});

export const AnalyticsDashboard = () => {
  const sessions = MOCK_SESSIONS;
  const latest = sessions[sessions.length - 1];
  const previous = sessions[sessions.length - 2];
  const cpiTrend = latest.cpi < previous.cpi ? 'improving' : 'degrading';

  const avgCpi = useMemo(() => {
    const sum = sessions.reduce((a, s) => a + s.cpi, 0);
    return Math.round((sum / sessions.length) * 100) / 100;
  }, [sessions]);

  const totalHazards = useMemo(() => {
    return sessions.reduce((a, s) => a + s.hazards.data + s.hazards.control + s.hazards.structural, 0);
  }, [sessions]);

  const hazardBreakdown = useMemo(() => {
    const totals = sessions.reduce(
      (a, s) => ({
        data: a.data + s.hazards.data,
        control: a.control + s.hazards.control,
        structural: a.structural + s.hazards.structural,
      }),
      { data: 0, control: 0, structural: 0 }
    );
    const total = totals.data + totals.control + totals.structural;
    return {
      ...totals,
      total,
      dataPercent: total > 0 ? Math.round((totals.data / total) * 100) : 0,
      controlPercent: total > 0 ? Math.round((totals.control / total) * 100) : 0,
      structuralPercent: total > 0 ? Math.round((totals.structural / total) * 100) : 0,
    };
  }, [sessions]);

  // SVG sparkline for CPI trend
  const sparklinePoints = useMemo(() => {
    const maxCpi = Math.max(...sessions.map(s => s.cpi));
    const minCpi = Math.min(...sessions.map(s => s.cpi));
    const range = maxCpi - minCpi || 1;
    return sessions.map((s, i) => {
      const x = (i / (sessions.length - 1)) * 280 + 10;
      const y = 50 - ((s.cpi - minCpi) / range) * 40 + 5;
      return `${x},${y}`;
    }).join(' ');
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Avg CPI"
          value={avgCpi.toString()}
          icon={<Activity size={16} />}
          trend={cpiTrend === 'improving' ? 'down' : 'up'}
          trendLabel={cpiTrend === 'improving' ? 'Improving' : 'Increasing'}
        />
        <StatCard
          label="Total Sessions"
          value={sessions.length.toString()}
          icon={<Timer size={16} />}
        />
        <StatCard
          label="Total Hazards"
          value={totalHazards.toString()}
          icon={<Zap size={16} />}
        />
        <StatCard
          label="Avg Stall Rate"
          value={`${Math.round(sessions.reduce((a, s) => a + s.stallRate, 0) / sessions.length)}%`}
          icon={<BarChart3 size={16} />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* CPI Trend Chart */}
        <div className="bg-bg-panel border border-border-subtle rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-brand-400" />
            CPI Over Time
          </h3>
          <svg viewBox="0 0 300 60" className="w-full h-20">
            <defs>
              <linearGradient id="cpi-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points={`10,55 ${sparklinePoints} 290,55`}
              fill="url(#cpi-gradient)"
            />
          </svg>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-text-muted">{sessions.length} sessions</span>
            <span className="text-[10px] text-text-muted">Latest: {latest.cpi}</span>
          </div>
        </div>

        {/* Hazard Breakdown */}
        <div className="bg-bg-panel border border-border-subtle rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            Hazard Breakdown
          </h3>

          <div className="space-y-3">
            <HazardBar label="Data Hazards" count={hazardBreakdown.data} percent={hazardBreakdown.dataPercent} color="bg-hazard" />
            <HazardBar label="Control Hazards" count={hazardBreakdown.control} percent={hazardBreakdown.controlPercent} color="bg-yellow-500" />
            <HazardBar label="Structural Hazards" count={hazardBreakdown.structural} percent={hazardBreakdown.structuralPercent} color="bg-blue-500" />
          </div>

          {/* Donut chart (simple SVG) */}
          <div className="flex items-center justify-center mt-4">
            <svg viewBox="0 0 36 36" className="w-16 h-16">
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="#1e3052" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="#ef4444"
                strokeDasharray={`${hazardBreakdown.dataPercent} ${100 - hazardBreakdown.dataPercent}`}
                strokeDashoffset="25" strokeLinecap="round"
              />
              <circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="#eab308"
                strokeDasharray={`${hazardBreakdown.controlPercent} ${100 - hazardBreakdown.controlPercent}`}
                strokeDashoffset={`${25 - hazardBreakdown.dataPercent}`} strokeLinecap="round"
              />
              <circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="#3b82f6"
                strokeDasharray={`${hazardBreakdown.structuralPercent} ${100 - hazardBreakdown.structuralPercent}`}
                strokeDashoffset={`${25 - hazardBreakdown.dataPercent - hazardBreakdown.controlPercent}`} strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatCard({
  label, value, icon, trend, trendLabel,
}: {
  label: string; value: string; icon: React.ReactNode; trend?: 'up' | 'down'; trendLabel?: string;
}) {
  return (
    <div className="bg-bg-panel border border-border-subtle rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-text-muted">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 mt-1 ${trend === 'down' ? 'text-emerald-400' : 'text-hazard'}`}>
          {trend === 'down' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          <span className="text-[10px] font-medium">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function HazardBar({ label, count, percent, color }: { label: string; count: number; percent: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs text-white font-medium">{count} ({percent}%)</span>
      </div>
      <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

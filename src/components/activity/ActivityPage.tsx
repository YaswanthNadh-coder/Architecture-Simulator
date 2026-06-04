import { useMemo } from 'react';
import { ActivitySquare, Flame, TrendingUp, AlertTriangle } from 'lucide-react';

export const ActivityPage = () => {
  const heatmapData = useMemo(() => 
    Array.from({ length: 52 }, () => 
      Array.from({ length: 7 }, () => Math.random())
    ), []
  );

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <ActivitySquare className="text-cyan-500" /> Activity & Analytics
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Current Streak" value="3 Days" icon={<Flame className="text-orange-500" />} />
          <StatCard title="Simulations Run" value="42" icon={<TrendingUp className="text-emerald-500" />} />
          <StatCard title="Hazards Found" value="18" icon={<AlertTriangle className="text-hazard" />} />
        </div>

        <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Contribution Heatmap</h2>
          <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
            {/* Mock github-style heatmap */}
            {heatmapData.map((week, w) => (
              <div key={w} className="flex flex-col gap-1 shrink-0">
                {week.map((val, d) => {
                  const color = val > 0.8 ? 'bg-brand-500' : val > 0.5 ? 'bg-brand-500/60' : val > 0.2 ? 'bg-brand-500/30' : 'bg-bg-panel border border-border-subtle';
                  return <div key={d} className={`w-3 h-3 rounded-sm ${color}`} />;
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

interface StatCardProps { title: string; value: string; icon: React.ReactNode; }
const StatCard = ({ title, value, icon }: StatCardProps) => (
  <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-bg-panel border border-border-subtle flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-text-muted text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

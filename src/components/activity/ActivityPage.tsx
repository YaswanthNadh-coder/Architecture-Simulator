import { useState, useEffect } from 'react';
import { ActivitySquare, Flame, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getUserActivityMetrics, type ActivityMetrics } from '../../services/activityService';

export const ActivityPage = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!profile) {
        if (!authLoading) setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMsg(null);
      const { metrics: data, error } = await getUserActivityMetrics(profile.id);
      if (error) {
        setErrorMsg(error);
      } else {
        setMetrics(data);
      }
      setLoading(false);
    };

    fetchMetrics();
  }, [profile, authLoading]);

  const heatmapData = metrics?.heatmapData || Array.from({ length: 52 }, () => Array.from({ length: 7 }, () => 0));

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <ActivitySquare className="text-cyan-500" /> Activity & Analytics
        </h1>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
          </div>
        ) : errorMsg ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 mb-8 flex flex-col items-center justify-center">
            <AlertTriangle className="text-red-500 mb-2" size={32} />
            <h2 className="text-white font-bold text-lg mb-1">Could not load activity</h2>
            <p className="text-red-200/80 text-sm">{errorMsg}</p>
            <p className="text-text-muted text-xs mt-4 max-w-md text-center">
              Did you forget to run the `supabase_simulation_events.sql` script in your Supabase SQL editor?
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Current Streak" value={`${metrics?.currentStreak || 0} Days`} icon={<Flame className="text-orange-500" />} />
              <StatCard title="Simulations Run" value={`${metrics?.simulationsRun || 0}`} icon={<TrendingUp className="text-emerald-500" />} />
              <StatCard title="Hazards Found" value={`${metrics?.hazardsFound || 0}`} icon={<AlertTriangle className="text-hazard" />} />
            </div>

            <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6 mb-8">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Contribution Heatmap</h2>
              <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                {heatmapData.map((week, w) => (
                  <div key={w} className="flex flex-col gap-1 shrink-0">
                    {week.map((val, d) => {
                      const color = val > 0.8 ? 'bg-brand-500' : val > 0.5 ? 'bg-brand-500/60' : val > 0.2 ? 'bg-brand-500/30' : 'bg-bg-panel border border-border-subtle';
                      return <div key={d} className={`w-3 h-3 rounded-sm ${color}`} title={val > 0 ? 'Activity logged' : 'No activity'} />;
                    })}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
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

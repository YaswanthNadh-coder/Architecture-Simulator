import { Play, BookOpen, Clock, BarChart3, Sparkles, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useNavigate } from 'react-router-dom';
import { FeatureGate } from '../monetization/FeatureGate';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import { ConceptMastery } from '../analytics/ConceptMastery';

export const DashboardPage = () => {
  const { profile } = useAuthStore();
  const { tier, canAccess } = useSubscriptionStore();
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-brand-900/50 to-cyan-900/20 border border-brand-500/30 rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">{greeting}, {profile?.full_name?.split(' ')[0] || 'Architect'} 👋</h1>
            <p className="text-brand-100/80 mb-6 max-w-lg">Ready to simulate some pipelines? You have 2 assignments due this week in CS301.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/simulator')} className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-500/25 flex items-center gap-2 hover:bg-brand-400 transition-colors">
                <Play size={16} fill="currentColor" /> Resume Last Simulation
              </button>
              {tier === 'free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-white/5 text-brand-400 px-5 py-2.5 rounded-xl font-semibold border border-brand-500/20 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Sparkles size={16} /> Try Pro Free
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Active Courses */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-brand-500" /> Active Courses
            </h2>
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">CS301: Computer Architecture</h3>
                  <p className="text-sm text-text-muted">Prof. Patterson</p>
                </div>
                <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-1 rounded">Lab 3 Active</span>
              </div>
              <div className="w-full h-2 bg-bg-panel rounded-full overflow-hidden mb-2">
                <div className="h-full bg-brand-500 w-[65%]" />
              </div>
              <p className="text-xs text-text-muted">65% complete • Next assignment due in 2d</p>
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-cyan-500" /> Recent Activity
            </h2>
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 space-y-4">
              <ActivityItem title="Ran Fibonacci Loop" time="2h ago" type="sim" />
              <ActivityItem title="Completed task: Identify Hazards" time="Yesterday" type="task" />
              <ActivityItem title="Created new project: Array Sum" time="3d ago" type="file" />
            </div>
          </section>
        </div>

        {/* Analytics Preview */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-400" /> Performance Analytics
            {!canAccess('analyticsDashboard') && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock size={8} /> Pro
              </span>
            )}
          </h2>

          <FeatureGate feature="analyticsDashboard" overlay>
            <AnalyticsDashboard />
          </FeatureGate>
        </section>

        {/* Concept Mastery Preview */}
        {canAccess('conceptMastery') && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-cyan-400" /> Concept Mastery
            </h2>
            <ConceptMastery />
          </section>
        )}
      </div>
    </div>
  );
};

interface ActivityItemProps { title: string; time: string; type: 'sim' | 'task' | 'file'; }
const ActivityItem = ({ title, time, type }: ActivityItemProps) => (
  <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 last:pb-0">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${type === 'sim' ? 'bg-brand-500' : type === 'task' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
      <span className="text-sm text-text-main">{title}</span>
    </div>
    <span className="text-xs text-text-muted">{time}</span>
  </div>
);

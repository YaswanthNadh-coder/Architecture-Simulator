import { Play, BookOpen, BarChart3, Sparkles, Lock, FolderOpen, Code, GraduationCap } from 'lucide-react';
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
            <p className="text-brand-100/80 mb-6 max-w-lg">Welcome to Architecture Simulator. Start a new simulation, manage your files, or check out your analytics.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/simulator')} className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-500/25 flex items-center gap-2 hover:bg-brand-400 transition-colors">
                <Play size={16} fill="currentColor" /> Open Simulator
              </button>
              {tier === 'free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-white/5 text-brand-400 px-5 py-2.5 rounded-xl font-semibold border border-brand-500/20 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Sparkles size={16} /> Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Start Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <QuickStartCard 
            icon={<Code size={24} className="text-brand-400" />}
            title="New Simulation"
            description="Write and test MIPS assembly code in the pipeline simulator."
            onClick={() => navigate('/simulator')}
          />
          <QuickStartCard 
            icon={<FolderOpen size={24} className="text-cyan-400" />}
            title="Manage Files"
            description="Organize your assembly programs and project files."
            onClick={() => navigate('/files')}
          />
          <QuickStartCard 
            icon={<BarChart3 size={24} className="text-emerald-400" />}
            title="View Analytics"
            description="Track your performance and concept mastery over time."
            onClick={() => navigate('/analytics')}
          />
          <QuickStartCard 
            icon={<GraduationCap size={24} className="text-purple-400" />}
            title="Professor Tools"
            description="Auto-grade assignments and check for structural plagiarism."
            onClick={() => navigate('/grading')}
          />
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

interface QuickStartCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const QuickStartCard = ({ icon, title, description, onClick }: QuickStartCardProps) => (
  <button 
    onClick={onClick}
    className="bg-bg-surface border border-border-subtle rounded-2xl p-6 text-left hover:border-brand-500/50 hover:bg-bg-panel transition-all group w-full"
  >
    <div className="bg-bg-base w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-text-muted">{description}</p>
  </button>
);

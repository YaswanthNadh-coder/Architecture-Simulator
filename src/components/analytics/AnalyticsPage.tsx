import { BarChart3, BookOpen } from 'lucide-react';
import { FeatureGate } from '../monetization/FeatureGate';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ConceptMastery } from './ConceptMastery';

export const AnalyticsPage = () => {
  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <BarChart3 className="text-brand-500" /> Analytics
        </h1>

        <FeatureGate feature="analyticsDashboard">
          <div className="space-y-10">
            {/* Performance Dashboard */}
            <section>
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <BarChart3 size={18} className="text-brand-400" />
                Performance Dashboard
              </h2>
              <AnalyticsDashboard />
            </section>

            {/* Concept Mastery */}
            <section>
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <BookOpen size={18} className="text-cyan-400" />
                Concept Mastery
              </h2>
              <ConceptMastery />
            </section>
          </div>
        </FeatureGate>
      </div>
    </div>
  );
};

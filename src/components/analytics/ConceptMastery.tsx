import { CheckCircle2, Circle, AlertTriangle, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getConceptMasteryData, type ConceptMasteryData } from '../../services/activityService';
import { useAuthStore } from '../../store/authStore';

export const ConceptMastery = () => {
  const { profile } = useAuthStore();
  const [concepts, setConcepts] = useState<ConceptMasteryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      getConceptMasteryData(profile.id).then(({ concepts }) => {
        setConcepts(concepts);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [profile]);

  if (loading) return <div className="text-text-muted">Loading concepts...</div>;

  const masteredCount = concepts.filter(c => c.mastered).length;
  const weakSpots = concepts.filter(c => c.weakSpot);

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-text-muted">Mastery Progress</span>
            <span className="text-xs text-white font-medium">{masteredCount} / {concepts.length}</span>
          </div>
          <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${concepts.length > 0 ? (masteredCount / concepts.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Concept cards */}
      <div className="grid gap-3">
        {concepts.map(concept => (
          <div
            key={concept.id}
            className={`rounded-xl border p-4 transition-all ${
              concept.mastered
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-bg-panel border-border-subtle'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{concept.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-semibold text-white">{concept.name}</h4>
                  {concept.mastered ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Circle size={14} className="text-text-muted" />
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{concept.description}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  Exercised <span className="text-white font-medium">{concept.exercised}</span> times
                </p>
              </div>
            </div>

            {/* Weak spot alert */}
            {concept.weakSpot && (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 flex items-start gap-2">
                <AlertTriangle size={13} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-yellow-400/80 leading-relaxed">{concept.weakSpot}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Weak spots summary */}
      {weakSpots.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
          <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <BookOpen size={13} className="text-brand-400" />
            Areas for improvement
          </h4>
          <div className="space-y-2">
            {weakSpots.map(ws => (
              <div key={ws.id} className="flex items-center gap-2">
                <span className="text-xs">{ws.icon}</span>
                <span className="text-xs text-text-muted">{ws.name}: practiced {ws.exercised} times — needs more exploration</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

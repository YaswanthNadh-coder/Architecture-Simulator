import { CheckCircle2, Circle, AlertTriangle, BookOpen } from 'lucide-react';

interface Concept {
  id: string;
  name: string;
  description: string;
  exercised: number;
  mastered: boolean;
  icon: string;
  weakSpot?: string;
}

const CONCEPTS: Concept[] = [
  {
    id: 'data_hazards',
    name: 'Data Hazards',
    description: 'Read-After-Write (RAW) dependencies between instructions',
    exercised: 24,
    mastered: true,
    icon: '⚡',
  },
  {
    id: 'forwarding',
    name: 'Data Forwarding',
    description: 'Bypass paths that eliminate stalls from data hazards',
    exercised: 18,
    mastered: true,
    icon: '🔄',
  },
  {
    id: 'branch_penalties',
    name: 'Branch Penalties',
    description: 'Pipeline flushes caused by mispredicted branches',
    exercised: 9,
    mastered: false,
    icon: '🎯',
    weakSpot: 'Your branch-heavy code frequently triggers flushes. Try reordering instructions to reduce branch density.',
  },
  {
    id: 'cache_misses',
    name: 'Cache Miss Penalties',
    description: 'Memory stalls from cache misses in the hierarchy',
    exercised: 3,
    mastered: false,
    icon: '📦',
    weakSpot: 'You haven\'t explored cache configurations much. Try varying cache size and associativity to see the impact on CPI.',
  },
  {
    id: 'structural_hazards',
    name: 'Structural Hazards',
    description: 'Resource conflicts when multiple instructions need the same hardware',
    exercised: 6,
    mastered: false,
    icon: '🏗️',
  },
  {
    id: 'load_use',
    name: 'Load-Use Dependencies',
    description: 'Stalls caused by using data immediately after a load instruction',
    exercised: 15,
    mastered: true,
    icon: '📥',
  },
];

export const ConceptMastery = () => {
  const masteredCount = CONCEPTS.filter(c => c.mastered).length;
  const weakSpots = CONCEPTS.filter(c => c.weakSpot);

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-text-muted">Mastery Progress</span>
            <span className="text-xs text-white font-medium">{masteredCount} / {CONCEPTS.length}</span>
          </div>
          <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${(masteredCount / CONCEPTS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Concept cards */}
      <div className="grid gap-3">
        {CONCEPTS.map(concept => (
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

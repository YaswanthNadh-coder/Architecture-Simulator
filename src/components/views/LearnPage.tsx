import { useState } from 'react';
import { BookOpen, CheckCircle2, Play, Trophy, Clock, FlaskConical, X, ChevronRight, Info } from 'lucide-react';
import { TUTORIAL_LESSONS, type TutorialLesson } from '../../engine/tutorialLessons';
import { useTutorialStore } from '../../store/tutorialStore';
import { CURRICULUM_LABS, CURRICULUM_MODULES, getLabsByModule, type CurriculumLab } from '../../engine/curriculumLabs';
import { useNavigate } from 'react-router-dom';
import { useSimulatorStore } from '../../store/simulatorStore';
import ReactMarkdown from 'react-markdown';

export const LearnPage = () => {
  const { startLesson, getLessonProgress, getOverallProgress } = useTutorialStore();
  const overall = getOverallProgress();

  // Group lessons by difficulty
  const beginner = TUTORIAL_LESSONS.filter(l => l.difficulty === 'beginner');
  const intermediate = TUTORIAL_LESSONS.filter(l => l.difficulty === 'intermediate');
  const advanced = TUTORIAL_LESSONS.filter(l => l.difficulty === 'advanced');

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BookOpen size={28} className="text-brand-400" />
              Interactive Pipeline Course
            </h1>
            <p className="text-text-muted text-sm max-w-2xl leading-relaxed">
              Master computer architecture from the ground up. This 10-lesson interactive course guides you through pipeline stages, data hazards, forwarding, and code optimization using real simulations.
            </p>
          </div>
          
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col items-center min-w-[200px]">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Course Progress</span>
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-16 h-16">
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke="#1e293b" />
                <circle
                  cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke="#3b82f6"
                  strokeDasharray={`${overall.percentage * 0.94} ${94 - overall.percentage * 0.94}`}
                  strokeDashoffset="23.5" strokeLinecap="round" className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-bold text-white">{overall.percentage}%</span>
              </div>
            </div>
            <span className="text-xs text-text-muted mt-2">{overall.completed} of {overall.total} lessons completed</span>
          </div>
        </div>

        {/* Curriculum Modules */}
        <div className="space-y-10">
          <ModuleSection title="Module 1: Pipeline Fundamentals" lessons={beginner} color="emerald" startLesson={startLesson} getLessonProgress={getLessonProgress} />
          <ModuleSection title="Module 2: Hazards & Solutions" lessons={intermediate} color="brand" startLesson={startLesson} getLessonProgress={getLessonProgress} />
          <ModuleSection title="Module 3: Advanced Optimization" lessons={advanced} color="purple" startLesson={startLesson} getLessonProgress={getLessonProgress} />
        </div>

        {/* ─── Curriculum Labs ─── */}
        <div className="border-t border-border-subtle pt-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <FlaskConical size={24} className="text-cyan-400" />
                Curriculum Labs
              </h2>
              <p className="text-text-muted text-sm max-w-2xl leading-relaxed">
                15 structured labs covering the full Patterson & Hennessy syllabus. Each lab includes starter code, instructions, hints, and test cases.
              </p>
            </div>
            <div className="bg-bg-surface border border-border-subtle rounded-xl px-4 py-2">
              <span className="text-xs font-bold text-cyan-400">{CURRICULUM_LABS.length} labs</span>
              <span className="text-xs text-text-muted"> · 5 modules</span>
            </div>
          </div>

          <CurriculumLabsSection />
        </div>
      </div>
    </div>
  );
};

function ModuleSection({
  title, lessons, color, startLesson, getLessonProgress
}: {
  title: string; lessons: TutorialLesson[]; color: 'emerald' | 'brand' | 'purple';
  startLesson: (id: string) => void;
  getLessonProgress: (id: string) => { completed: boolean; score: { correct: number; total: number } | null };
}) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="h-px bg-border-subtle flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map((lesson) => {
          const progress = getLessonProgress(lesson.id);
          
          return (
            <div
              key={lesson.id}
              onClick={() => startLesson(lesson.id)}
              className={`group relative bg-bg-surface border border-border-subtle rounded-2xl p-5 cursor-pointer hover:border-brand-500/50 transition-all overflow-hidden ${
                progress.completed ? 'opacity-70 hover:opacity-100' : ''
              }`}
            >
              {/* Highlight bar */}
              <div className="absolute top-0 left-0 w-1 h-full bg-border-subtle group-hover:bg-brand-500 transition-colors" />

              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${colorMap[color]}`}>
                  {lesson.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white truncate pr-4">{lesson.title}</h3>
                    {progress.completed ? (
                      <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={12} className="text-white ml-0.5" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed">
                    {lesson.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Clock size={12} /> {lesson.estimatedMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <BookOpen size={12} /> {lesson.steps.length} steps
                    </span>
                    {progress.score && (
                      <span className={`flex items-center gap-1.5 ${progress.score.correct === progress.score.total ? 'text-emerald-400' : 'text-brand-400'}`}>
                        <Trophy size={12} /> Quiz: {progress.score.correct}/{progress.score.total}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CurriculumLabsSection() {
  const [activeModule, setActiveModule] = useState<string>(CURRICULUM_MODULES[0]);
  const [selectedLab, setSelectedLab] = useState<CurriculumLab | null>(null);
  const navigate = useNavigate();
  const { setCode, setISA } = useSimulatorStore();

  const labsByModule = getLabsByModule();
  const activeLabs = labsByModule[activeModule] || [];

  const handleLoadLab = (lab: CurriculumLab) => {
    setCode(lab.starterCode);
    setISA('mips');
    navigate('/simulator');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'intermediate': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'advanced': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-text-muted bg-bg-panel border-border-subtle';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module selector tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-4">
        {CURRICULUM_MODULES.map((mod) => {
          const isActive = activeModule === mod;
          const count = labsByModule[mod]?.length || 0;
          return (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                  : 'bg-bg-surface text-text-muted border-border-subtle hover:text-white hover:border-border-muted'
              }`}
            >
              {mod} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeLabs.map((lab) => (
          <div
            key={lab.id}
            onClick={() => setSelectedLab(lab)}
            className="group relative bg-bg-surface border border-border-subtle rounded-2xl p-5 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all overflow-hidden"
          >
            {/* Highlight bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-border-subtle group-hover:bg-brand-500 transition-colors" />
            
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getLevelColor(lab.level)}`}>
                    {lab.level}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Clock size={12} /> {lab.estimatedMinutes} min
                  </span>
                </div>
                
                <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors mb-2">
                  {lab.title}
                </h3>
                
                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-4">
                  {lab.learningObjective}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 border-t border-border-subtle/50 pt-3">
                <div className="flex flex-wrap gap-1">
                  {lab.concepts.slice(0, 2).map((c) => (
                    <span key={c} className="text-[10px] bg-bg-panel border border-border-subtle px-1.5 py-0.5 rounded text-text-muted font-mono">
                      {c.replace('-', ' ')}
                    </span>
                  ))}
                  {lab.concepts.length > 2 && (
                    <span className="text-[10px] text-text-muted px-1">+{lab.concepts.length - 2}</span>
                  )}
                </div>
                
                <span className="text-xs font-bold text-brand-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Lab <ChevronRight size={14} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lab Details Modal */}
      {selectedLab && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle bg-bg-panel flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${getLevelColor(selectedLab.level)}`}>
                  {selectedLab.level}
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock size={13} /> {selectedLab.estimatedMinutes} minutes
                </span>
              </div>
              <button
                onClick={() => setSelectedLab(null)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar">
              {/* Main Content (Instructions) */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{selectedLab.title}</h2>
                  <div className="text-xs text-brand-400 bg-brand-500/5 border border-brand-500/10 rounded-lg p-3 leading-relaxed">
                    <span className="font-bold uppercase tracking-wider block mb-1 text-[10px]">Objective:</span>
                    {selectedLab.learningObjective}
                  </div>
                </div>

                <div className="border-t border-border-subtle/50 pt-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Lab Instructions</h3>
                  <div className="bg-bg-panel/40 border border-border-subtle/50 rounded-xl p-5 text-xs text-text-main leading-relaxed space-y-3">
                    <ReactMarkdown
                      components={{
                        h2: ({ node, ...props }) => <h3 className="text-sm font-bold text-white mt-4 mb-2 border-b border-border-subtle/30 pb-1" {...props} />,
                        h3: ({ node, ...props }) => <h4 className="text-xs font-bold text-white mt-3 mb-1" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-2 text-text-muted" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-3 space-y-1 text-text-muted" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-3 space-y-1 text-text-muted" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        code: ({ node, inline, className, children, ...props }: any) => {
                          return inline ? (
                            <code className="bg-bg-panel border border-border-subtle px-1.5 py-0.5 rounded text-brand-400 font-mono text-[10px]" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-bg-panel border border-border-subtle p-3 rounded-xl overflow-x-auto text-emerald-400 font-mono text-[10px] my-3 leading-normal">
                              <code {...props}>{children}</code>
                            </pre>
                          );
                        },
                        table: ({ node, ...props }) => <table className="w-full text-left border-collapse border border-border-subtle text-[11px] my-4" {...props} />,
                        thead: ({ node, ...props }) => <thead className="bg-bg-panel" {...props} />,
                        th: ({ node, ...props }) => <th className="border border-border-subtle p-2 font-bold text-white" {...props} />,
                        td: ({ node, ...props }) => <td className="border border-border-subtle p-2 text-text-muted" {...props} />,
                      }}
                    >
                      {selectedLab.instructions}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Sidebar (Metadata, Test Cases, Hints) */}
              <div className="space-y-6 lg:border-l lg:border-border-subtle lg:pl-6">
                {/* Concepts */}
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Key Concepts</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLab.concepts.map((c) => (
                      <span key={c} className="text-[10px] bg-bg-panel border border-border-subtle px-2.5 py-1 rounded-lg text-text-muted font-mono">
                        {c.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Test cases */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Verification Tests</h3>
                  <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 space-y-3">
                    {selectedLab.sampleTestCases.map((tc) => (
                      <div key={tc.id} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-text-muted">{tc.name || `Check register ${tc.register}`}</span>
                        <span className="font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          {tc.register} == {tc.expectedValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hints */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lab Hints</h3>
                  <div className="space-y-2">
                    {selectedLab.hints.map((hint, idx) => (
                      <div key={idx} className="bg-bg-surface/50 border border-border-subtle/50 rounded-xl p-3 text-xs text-text-muted flex gap-2">
                        <Info size={14} className="text-brand-400 shrink-0 mt-0.5" />
                        <p>{hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-subtle bg-bg-panel flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedLab(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Close Details
              </button>
              <button
                onClick={() => handleLoadLab(selectedLab)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
              >
                <Play size={12} fill="currentColor" /> Load Lab in Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

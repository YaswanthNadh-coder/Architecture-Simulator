import { BookOpen, CheckCircle2, Play, Trophy, Clock } from 'lucide-react';
import { TUTORIAL_LESSONS, type TutorialLesson } from '../../engine/tutorialLessons';
import { useTutorialStore } from '../../store/tutorialStore';

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

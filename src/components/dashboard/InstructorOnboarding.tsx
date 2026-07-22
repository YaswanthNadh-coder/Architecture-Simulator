import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { BookOpen, Users, Share2, ClipboardCheck, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  actionLabel: string;
  completed: boolean;
}

export const InstructorOnboarding = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Don't render for non-instructors or if already completed
  const shouldShow = profile?.role === 'instructor'
    && !profile.onboarding_completed_at
    && !dismissed;

  useEffect(() => {
    if (!shouldShow || !profile) return;

    const checkProgress = async () => {
      // Check if user has created any courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', profile.id)
        .limit(1);
      
      const courseExists = (courses?.length ?? 0) > 0;

      let assignExists = false;
      let submissionExists = false;

      if (courseExists && courses?.[0]) {
        // Check if any assignments exist
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id')
          .eq('instructor_id', profile.id)
          .limit(1);
        
        assignExists = (assignments?.length ?? 0) > 0;

        if (assignExists) {
          // Check if any submissions exist for their courses
          const { data: subs } = await supabase
            .from('submissions')
            .select('id')
            .eq('course_id', courses[0].id)
            .limit(1);
          submissionExists = (subs?.length ?? 0) > 0;
        }
      }

      const done = new Set<string>();
      if (courseExists) done.add('create-course');
      if (assignExists) done.add('add-assignment');
      // "share-code" is considered done once they have a course (code auto-generated)
      if (courseExists) done.add('share-code');
      if (submissionExists) done.add('review-submission');
      setCompletedSteps(done);
    };

    checkProgress();
  }, [shouldShow, profile]);

  const handleDismiss = async () => {
    setDismissed(true);
    // Mark onboarding as completed in the database
    if (profile) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', profile.id);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'create-course',
      title: 'Create your first course',
      description: 'Set up a classroom with a title, semester, and auto-generated join code.',
      icon: <BookOpen size={18} />,
      action: () => navigate('/courses'),
      actionLabel: 'Go to Courses',
      completed: completedSteps.has('create-course'),
    },
    {
      id: 'add-assignment',
      title: 'Add your first assignment',
      description: 'Build an exercise with test cases, rubric weights, and a due date.',
      icon: <ClipboardCheck size={18} />,
      action: () => navigate('/courses'),
      actionLabel: 'Open Course',
      completed: completedSteps.has('add-assignment'),
    },
    {
      id: 'share-code',
      title: 'Share join code with students',
      description: 'Your 6-character code lets students enroll instantly.',
      icon: <Share2 size={18} />,
      action: () => navigate('/courses'),
      actionLabel: 'View Join Code',
      completed: completedSteps.has('share-code'),
    },
    {
      id: 'review-submission',
      title: 'Review your first submission',
      description: 'View auto-graded results and optionally override scores.',
      icon: <Users size={18} />,
      action: () => navigate('/courses'),
      actionLabel: 'View Submissions',
      completed: completedSteps.has('review-submission'),
    },
  ];

  const completionCount = steps.filter(s => s.completed).length;
  const allComplete = completionCount === steps.length;

  // If all steps complete, auto-dismiss after a moment
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(handleDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, handleDismiss]);

  if (!shouldShow) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-gradient-to-r from-brand-900/40 to-purple-900/20 border border-brand-500/25 rounded-2xl p-6 mb-8 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-500/10 blur-3xl rounded-full" />
      
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 text-text-muted hover:text-white transition-colors rounded-lg cursor-pointer z-10"
        title="Dismiss onboarding"
      >
        <X size={16} />
      </button>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🎓 Instructor Setup Guide
              {allComplete && <span className="text-emerald-400 text-xs font-semibold">— All done!</span>}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Complete these steps to get your classroom ready.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-brand-400">{completionCount}/{steps.length}</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-500 rounded-full"
                animate={{ width: `${(completionCount / steps.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-xl p-4 border transition-all ${
                step.completed
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-white/[0.02] border-border-subtle hover:border-brand-500/30 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  step.completed
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-brand-500/10 text-brand-400'
                }`}>
                  {step.completed ? <CheckCircle2 size={18} /> : step.icon}
                </div>
                <div className="min-w-0">
                  <h4 className={`text-xs font-bold ${step.completed ? 'text-emerald-400' : 'text-white'}`}>
                    {step.title}
                  </h4>
                  <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </div>

              {!step.completed && (
                <button
                  onClick={step.action}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-brand-400 bg-brand-500/10 rounded-lg border border-brand-500/15 hover:bg-brand-500/20 transition-colors cursor-pointer"
                >
                  {step.actionLabel}
                  <ChevronRight size={10} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, GraduationCap, User, Building2 } from 'lucide-react';
import type { TierName } from '../../lib/tierConfig';

interface PlanQuizProps {
  onResult: (tier: TierName) => void;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  icon: React.ReactNode;
  options: { label: string; value: string }[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'role',
    question: 'What best describes you?',
    icon: <User size={20} />,
    options: [
      { label: "I'm a student exploring on my own", value: 'self_learner' },
      { label: "I'm a student enrolled in a course", value: 'enrolled_student' },
      { label: "I'm an instructor or professor", value: 'instructor' },
      { label: "I'm purchasing for an organization", value: 'org_buyer' },
    ],
  },
  {
    id: 'needs',
    question: 'What features matter most to you?',
    icon: <GraduationCap size={20} />,
    options: [
      { label: 'Just the basics — see how a pipeline works', value: 'basics' },
      { label: 'Cache simulation, debugging, and analytics', value: 'advanced' },
      { label: 'Assignments, grading, and class management', value: 'teaching' },
      { label: 'API access, SSO, and custom deployment', value: 'enterprise' },
    ],
  },
  {
    id: 'scale',
    question: 'How many people will use it?',
    icon: <Building2 size={20} />,
    options: [
      { label: 'Just me', value: 'individual' },
      { label: '2–5 people (study group)', value: 'small_group' },
      { label: '20–500 (a class or department)', value: 'department' },
      { label: '500+ (organization-wide)', value: 'organization' },
    ],
  },
];

function recommendTier(answers: Record<string, string>): TierName {
  // Organization or enterprise needs → Enterprise
  if (answers.role === 'org_buyer' || answers.needs === 'enterprise' || answers.scale === 'organization') {
    return 'enterprise';
  }
  // Instructor or teaching needs or department scale → Institution
  if (answers.role === 'instructor' || answers.needs === 'teaching' || answers.scale === 'department') {
    return 'institution';
  }
  // Advanced needs or enrolled student → Pro
  if (answers.needs === 'advanced' || answers.role === 'enrolled_student' || answers.scale === 'small_group') {
    return 'pro';
  }
  // Default → Free
  return 'free';
}

const TIER_MESSAGES: Record<TierName, { title: string; description: string }> = {
  free: {
    title: 'Free is perfect for you!',
    description: 'Start exploring pipeline fundamentals with our visual simulator — no commitment needed.',
  },
  pro: {
    title: 'We recommend Pro',
    description: 'Unlock cache simulation, step-back debugging, performance analytics, and export tools. Start with a 14-day free trial.',
  },
  institution: {
    title: 'Institution is your best fit',
    description: 'Get assignments, auto-grading, LMS integration, and cohort analytics for your entire class. Start with a free pilot semester.',
  },
  enterprise: {
    title: 'Enterprise is built for you',
    description: 'Private deployment, API access, custom branding, and dedicated support for large-scale training programs.',
  },
};

export const PlanQuiz = ({ onResult, onClose }: PlanQuizProps) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TierName | null>(null);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const recommended = recommendTier(newAnswers);
      setResult(recommended);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-2xl p-8 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white text-lg">✕</button>

        {result === null ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {/* Progress */}
              <div className="flex gap-1.5 mb-8">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= step ? 'bg-brand-500' : 'bg-bg-panel'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                  {QUESTIONS[step].icon}
                </div>
                <h3 className="text-lg font-bold text-white">{QUESTIONS[step].question}</h3>
              </div>

              <div className="space-y-3">
                {QUESTIONS[step].options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(QUESTIONS[step].id, option.value)}
                    className="w-full text-left px-5 py-4 rounded-xl border border-border-subtle bg-bg-panel hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group flex items-center justify-between"
                  >
                    <span className="text-sm text-text-main group-hover:text-white transition-colors">{option.label}</span>
                    <ChevronRight size={16} className="text-text-muted group-hover:text-brand-400 transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <GraduationCap size={28} className="text-white" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{TIER_MESSAGES[result].title}</h3>
            <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto">{TIER_MESSAGES[result].description}</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => onResult(result)}
                className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25"
              >
                View {result.charAt(0).toUpperCase() + result.slice(1)} Plan
              </button>
              <button
                onClick={() => { setStep(0); setAnswers({}); setResult(null); }}
                className="px-6 py-3 bg-white/5 text-text-muted font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Start Over
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TUTORIAL_LESSONS, type TutorialLesson } from '../engine/tutorialLessons';

interface TutorialStore {
  // Current lesson state
  currentLessonId: string | null;
  currentStepIndex: number;
  isActive: boolean;

  // Progress tracking (persisted)
  completedLessons: string[];
  lessonScores: Record<string, { correct: number; total: number }>;
  answeredQuestions: Record<string, number[]>; // lessonId -> step indices answered

  // Actions
  startLesson: (lessonId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  answerQuestion: (stepIndex: number, selectedIndex: number) => boolean;
  completeLesson: () => void;
  exitLesson: () => void;
  resetProgress: () => void;

  // Getters
  getCurrentLesson: () => TutorialLesson | null;
  getLessonProgress: (lessonId: string) => { completed: boolean; score: { correct: number; total: number } | null };
  getOverallProgress: () => { completed: number; total: number; percentage: number };
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      currentLessonId: null,
      currentStepIndex: 0,
      isActive: false,

      completedLessons: [],
      lessonScores: {},
      answeredQuestions: {},

      startLesson: (lessonId: string) => {
        const lesson = TUTORIAL_LESSONS.find(l => l.id === lessonId);
        if (!lesson) return;
        set({
          currentLessonId: lessonId,
          currentStepIndex: 0,
          isActive: true,
        });
      },

      nextStep: () => {
        const { currentLessonId, currentStepIndex } = get();
        if (!currentLessonId) return;
        const lesson = TUTORIAL_LESSONS.find(l => l.id === currentLessonId);
        if (!lesson) return;

        if (currentStepIndex < lesson.steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      answerQuestion: (stepIndex: number, selectedIndex: number): boolean => {
        const { currentLessonId, answeredQuestions, lessonScores } = get();
        if (!currentLessonId) return false;

        const lesson = TUTORIAL_LESSONS.find(l => l.id === currentLessonId);
        if (!lesson) return false;

        const step = lesson.steps[stepIndex];
        if (!step?.question) return false;

        const isCorrect = selectedIndex === step.question.correctIndex;

        // Track answered questions
        const lessonAnswered = answeredQuestions[currentLessonId] || [];
        if (!lessonAnswered.includes(stepIndex)) {
          const newAnswered = { ...answeredQuestions, [currentLessonId]: [...lessonAnswered, stepIndex] };

          // Update score
          const currentScore = lessonScores[currentLessonId] || { correct: 0, total: 0 };
          const newScore = {
            correct: currentScore.correct + (isCorrect ? 1 : 0),
            total: currentScore.total + 1,
          };

          set({
            answeredQuestions: newAnswered,
            lessonScores: { ...lessonScores, [currentLessonId]: newScore },
          });
        }

        return isCorrect;
      },

      completeLesson: () => {
        const { currentLessonId, completedLessons } = get();
        if (!currentLessonId) return;

        if (!completedLessons.includes(currentLessonId)) {
          set({ completedLessons: [...completedLessons, currentLessonId] });
        }
      },

      exitLesson: () => {
        set({
          currentLessonId: null,
          currentStepIndex: 0,
          isActive: false,
        });
      },

      resetProgress: () => {
        set({
          completedLessons: [],
          lessonScores: {},
          answeredQuestions: {},
        });
      },

      getCurrentLesson: () => {
        const { currentLessonId } = get();
        if (!currentLessonId) return null;
        return TUTORIAL_LESSONS.find(l => l.id === currentLessonId) || null;
      },

      getLessonProgress: (lessonId: string) => {
        const { completedLessons, lessonScores } = get();
        return {
          completed: completedLessons.includes(lessonId),
          score: lessonScores[lessonId] || null,
        };
      },

      getOverallProgress: () => {
        const { completedLessons } = get();
        const total = TUTORIAL_LESSONS.length;
        const completed = completedLessons.length;
        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },
    }),
    {
      name: 'archsim_tutorial_progress',
      partialize: (state) => ({
        completedLessons: state.completedLessons,
        lessonScores: state.lessonScores,
        answeredQuestions: state.answeredQuestions,
      }),
    }
  )
);

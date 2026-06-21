import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TUTORIAL_LESSONS, type TutorialLesson } from '../engine/tutorialLessons';
import { useAuthStore } from './authStore';

interface UserProgress {
  completedLessons: string[];
  lessonScores: Record<string, { correct: number; total: number }>;
  answeredQuestions: Record<string, number[]>;
}

interface TutorialStore {
  // Current lesson state
  currentLessonId: string | null;
  currentStepIndex: number;
  isActive: boolean;

  // Progress tracking (persisted) keyed by user id
  userProgress: Record<string, UserProgress>;

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

const getUserId = () => useAuthStore.getState().user?.id || 'anonymous';
const getDefaultProgress = (): UserProgress => ({
  completedLessons: [],
  lessonScores: {},
  answeredQuestions: {},
});

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      currentLessonId: null,
      currentStepIndex: 0,
      isActive: false,

      userProgress: {},

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
        const { currentLessonId, userProgress } = get();
        if (!currentLessonId) return false;

        const lesson = TUTORIAL_LESSONS.find(l => l.id === currentLessonId);
        if (!lesson) return false;

        const step = lesson.steps[stepIndex];
        if (!step?.question) return false;

        const isCorrect = selectedIndex === step.question.correctIndex;

        const userId = getUserId();
        const progress = userProgress[userId] || getDefaultProgress();

        // Track answered questions
        const lessonAnswered = progress.answeredQuestions[currentLessonId] || [];
        if (!lessonAnswered.includes(stepIndex)) {
          const newAnswered = { ...progress.answeredQuestions, [currentLessonId]: [...lessonAnswered, stepIndex] };

          // Update score
          const currentScore = progress.lessonScores[currentLessonId] || { correct: 0, total: 0 };
          const newScore = {
            correct: currentScore.correct + (isCorrect ? 1 : 0),
            total: currentScore.total + 1,
          };

          const newProgress = {
            ...progress,
            answeredQuestions: newAnswered,
            lessonScores: { ...progress.lessonScores, [currentLessonId]: newScore },
          };

          set({
            userProgress: { ...userProgress, [userId]: newProgress },
          });
        }

        return isCorrect;
      },

      completeLesson: () => {
        const { currentLessonId, userProgress } = get();
        if (!currentLessonId) return;

        const userId = getUserId();
        const progress = userProgress[userId] || getDefaultProgress();

        if (!progress.completedLessons.includes(currentLessonId)) {
          const newProgress = {
            ...progress,
            completedLessons: [...progress.completedLessons, currentLessonId],
          };
          set({
            userProgress: { ...userProgress, [userId]: newProgress },
          });
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
        const userId = getUserId();
        const { userProgress } = get();
        set({
          userProgress: {
            ...userProgress,
            [userId]: getDefaultProgress(),
          },
        });
      },

      getCurrentLesson: () => {
        const { currentLessonId } = get();
        if (!currentLessonId) return null;
        return TUTORIAL_LESSONS.find(l => l.id === currentLessonId) || null;
      },

      getLessonProgress: (lessonId: string) => {
        const userId = getUserId();
        const progress = get().userProgress[userId] || getDefaultProgress();
        return {
          completed: progress.completedLessons.includes(lessonId),
          score: progress.lessonScores[lessonId] || null,
        };
      },

      getOverallProgress: () => {
        const userId = getUserId();
        const progress = get().userProgress[userId] || getDefaultProgress();
        const total = TUTORIAL_LESSONS.length;
        const completed = progress.completedLessons.length;
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
        userProgress: state.userProgress,
      }),
      merge: (persistedState: any, currentState) => {
        // Migrate old flat structure to the new userProgress keyed object structure
        if (persistedState && persistedState.completedLessons) {
          return {
            ...currentState,
            userProgress: {
              ...currentState.userProgress,
              'anonymous': {
                completedLessons: persistedState.completedLessons || [],
                lessonScores: persistedState.lessonScores || {},
                answeredQuestions: persistedState.answeredQuestions || {},
              }
            }
          };
        }
        return { ...currentState, ...persistedState };
      }
    }
  )
);

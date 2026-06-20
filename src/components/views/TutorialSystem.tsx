import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorialStore } from '../../store/tutorialStore';
import { useSimulatorStore } from '../../store/simulatorStore';
import {
  ChevronRight, ChevronLeft, X, CheckCircle2, AlertCircle, Play, FastForward, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const TutorialSystem = () => {
  const {
    isActive, currentStepIndex, getCurrentLesson,
    nextStep, prevStep, exitLesson, answerQuestion, completeLesson
  } = useTutorialStore();

  const {
    setCode, assemble, nextCycle, setForwardingEnabled, setBranchPrediction
  } = useSimulatorStore();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const lesson = getCurrentLesson();
  const step = lesson?.steps[currentStepIndex];
  const isLastStep = lesson && currentStepIndex === lesson.steps.length - 1;

  // Initialize lesson state when it starts
  useEffect(() => {
    if (isActive && lesson && currentStepIndex === 0) {
      setCode(lesson.program);
      if (lesson.settings?.forwarding !== undefined) {
        setForwardingEnabled(lesson.settings.forwarding);
      }
      if (lesson.settings?.branchPrediction) {
        setBranchPrediction(lesson.settings.branchPrediction);
      }
      // Small delay to let the UI settle before assembling
      setTimeout(() => assemble(), 100);
    }
  }, [isActive, lesson, currentStepIndex, setCode, setForwardingEnabled, setBranchPrediction, assemble]);

  // Handle auto-stepping
  useEffect(() => {
    if (isActive && step?.autoStep) {
      let count = 0;
      const interval = setInterval(() => {
        if (count < step.autoStep!) {
          nextCycle();
          count++;
        } else {
          clearInterval(interval);
        }
      }, 300); // 300ms per step
      return () => clearInterval(interval);
    }
  }, [isActive, step, nextCycle]);

  // Reset question state when step changes
  useEffect(() => {
    setSelectedOption(null);
    setShowExplanation(false);
    setIsCorrect(null);
  }, [currentStepIndex]);

  if (!isActive || !lesson || !step) return null;

  const handleAnswer = () => {
    if (selectedOption === null || !step.question) return;
    const correct = answerQuestion(currentStepIndex, selectedOption);
    setIsCorrect(correct);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (isLastStep) {
      completeLesson();
      exitLesson();
    } else {
      nextStep();
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-20 right-6 w-96 max-h-[calc(100vh-100px)] flex flex-col bg-bg-surface/95 backdrop-blur-xl border border-brand-500/30 shadow-2xl shadow-brand-500/10 rounded-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-500/10 to-transparent border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xl">{lesson.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{lesson.title}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex gap-1">
                    {lesson.steps.map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-1 rounded-full ${
                          i < currentStepIndex ? 'bg-brand-500' :
                          i === currentStepIndex ? 'bg-brand-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                          'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-text-muted ml-1">
                    {currentStepIndex + 1}/{lesson.steps.length}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={exitLesson}
              className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              {step.type === 'instruction' && <Info size={18} className="text-brand-400" />}
              {step.type === 'step-simulation' && <Play size={18} className="text-emerald-400" />}
              {step.type === 'observe' && <FastForward size={18} className="text-purple-400" />}
              {step.type === 'question' && <AlertCircle size={18} className="text-yellow-400" />}
              {step.title}
            </h4>

            <div className="text-sm text-text-main leading-relaxed prose prose-invert prose-p:my-2 prose-pre:my-3 prose-pre:bg-bg-base prose-pre:border prose-pre:border-border-subtle max-w-none">
              <ReactMarkdown>{step.content}</ReactMarkdown>
            </div>

            {/* Interactive Question */}
            {step.type === 'question' && step.question && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-bold text-white">{step.question.prompt}</p>
                <div className="space-y-2">
                  {step.question.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => !showExplanation && setSelectedOption(i)}
                      disabled={showExplanation}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                        showExplanation
                          ? i === step.question!.correctIndex
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100' // Correct answer (always green when revealed)
                            : i === selectedOption
                              ? 'bg-red-500/20 border-red-500/50 text-red-100' // Wrong answer chosen
                              : 'bg-bg-base border-border-subtle text-text-muted opacity-50' // Unchosen wrong answers
                          : i === selectedOption
                            ? 'bg-brand-500/20 border-brand-500 text-brand-100' // Currently selected
                            : 'bg-bg-base border-border-subtle text-text-main hover:border-brand-500/50 hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {!showExplanation && (
                  <button
                    onClick={handleAnswer}
                    disabled={selectedOption === null}
                    className="w-full mt-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:hover:bg-brand-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Check Answer
                  </button>
                )}

                {/* Explanation Box */}
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-4 rounded-xl border ${
                      isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-yellow-500/10 border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={16} className="text-yellow-400" />
                      )}
                      <span className={`font-bold text-sm ${isCorrect ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {isCorrect ? 'Correct!' : 'Not quite.'}
                      </span>
                    </div>
                    <p className="text-xs text-text-main leading-relaxed">
                      {step.question.explanation}
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="px-5 py-4 bg-bg-surface border-t border-border-subtle flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="p-2 text-text-muted hover:text-white disabled:opacity-30 disabled:hover:text-text-muted transition-colors rounded-lg hover:bg-white/5"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              disabled={step.type === 'question' && !showExplanation}
              className={`flex items-center gap-2 px-5 py-2 font-bold rounded-lg transition-all ${
                isLastStep
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20 disabled:opacity-50'
              }`}
            >
              {isLastStep ? 'Finish Lesson' : 'Next'}
              {!isLastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

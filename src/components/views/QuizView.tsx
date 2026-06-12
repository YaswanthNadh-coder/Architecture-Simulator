/**
 * Quiz Mode View — Feature #7
 * After running a program, quiz the student with auto-graded questions from engine stats.
 */

import { useState, useMemo } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { generateQuizQuestions, gradeAnswer, type QuizQuestion } from '../../engine/quizGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle2, XCircle, Trophy, RotateCcw, Lightbulb } from 'lucide-react';

interface AnswerState {
  value: string;
  submitted: boolean;
  correct: boolean;
  feedback: string;
}

export const QuizView = () => {
  const { stats, forwardingEnabled, branchPrediction, isFinished, isAssembled } = useSimulatorStore();

  const questions = useMemo(() => {
    if (!isFinished || stats.totalCycles === 0) return [];
    return generateQuizQuestions(stats, forwardingEnabled, branchPrediction);
  }, [stats, forwardingEnabled, branchPrediction, isFinished]);

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showHints, setShowHints] = useState<Set<string>>(new Set());

  if (!isAssembled || !isFinished || stats.totalCycles === 0) {
    return (
      <div className="flex-1 h-full bg-bg-base flex items-center justify-center p-6">
        <div className="text-center">
          <Brain size={40} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Quiz Mode</h3>
          <p className="text-text-muted text-sm max-w-sm">
            Run your program to completion, then test your understanding of pipeline behavior with auto-generated questions.
          </p>
        </div>
      </div>
    );
  }

  const totalAnswered = Object.values(answers).filter(a => a.submitted).length;
  const totalCorrect = Object.values(answers).filter(a => a.submitted && a.correct).length;
  const allAnswered = totalAnswered === questions.length;

  const handleSubmit = (q: QuizQuestion) => {
    const current = answers[q.id];
    if (!current || !current.value.trim()) return;

    const result = gradeAnswer(q, current.value);
    setAnswers(prev => ({
      ...prev,
      [q.id]: { ...prev[q.id], submitted: true, correct: result.correct, feedback: result.feedback },
    }));
  };

  const handleReset = () => {
    setAnswers({});
    setShowHints(new Set());
  };

  const toggleHint = (id: string) => {
    setShowHints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Quiz Mode</h2>
          <span className="text-[10px] text-text-muted">({questions.length} questions)</span>
        </div>
        <div className="flex items-center gap-3">
          {totalAnswered > 0 && (
            <span className="text-[10px] font-mono text-brand-400">
              {totalCorrect}/{totalAnswered} correct
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-[10px] text-text-muted hover:text-white transition-colors flex items-center gap-1"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Score summary */}
        {allAnswered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl border text-center bg-gradient-to-br from-purple-500/10 to-brand-500/10 border-purple-500/20"
          >
            <Trophy size={28} className="mx-auto text-yellow-400 mb-2" />
            <h3 className="text-white font-bold text-lg mb-1">
              Score: {totalCorrect}/{questions.length}
            </h3>
            <p className="text-text-muted text-sm">
              {totalCorrect === questions.length ? '🎉 Perfect score!' :
               totalCorrect >= questions.length * 0.7 ? '👏 Great job!' :
               'Keep practicing — review the explanations below.'}
            </p>
          </motion.div>
        )}

        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {questions.map((q, i) => {
            const answer = answers[q.id];
            const showHint = showHints.has(q.id);

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-5 transition-all ${
                  answer?.submitted
                    ? answer.correct
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                    : 'bg-bg-surface border-border-subtle'
                }`}
              >
                {/* Question header */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-[10px] font-bold shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-text-muted">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                        q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted uppercase">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-white text-sm">{q.question}</p>
                  </div>
                </div>

                {/* Hint */}
                {q.hint && (
                  <div className="ml-9 mb-3">
                    <button
                      onClick={() => toggleHint(q.id)}
                      className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                    >
                      <Lightbulb size={10} /> {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                    <AnimatePresence>
                      {showHint && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="text-text-muted text-xs mt-1 pl-3 border-l-2 border-brand-500/30"
                        >
                          {q.hint}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Answer input */}
                <div className="ml-9 flex items-center gap-2">
                  <input
                    type="text"
                    value={answer?.value || ''}
                    onChange={e => setAnswers(prev => ({
                      ...prev,
                      [q.id]: { ...prev[q.id], value: e.target.value, submitted: false, correct: false, feedback: '' },
                    }))}
                    disabled={answer?.submitted}
                    placeholder={`Enter your answer${q.unit ? ` (${q.unit})` : ''}...`}
                    className="flex-1 bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:outline-none focus:border-brand-500/50 disabled:opacity-50"
                    onKeyDown={e => e.key === 'Enter' && handleSubmit(q)}
                  />
                  {!answer?.submitted && (
                    <button
                      onClick={() => handleSubmit(q)}
                      className="px-3 py-2 bg-brand-500/15 text-brand-400 text-xs font-bold rounded-lg hover:bg-brand-500/25 transition-all border border-brand-500/30"
                    >
                      Check
                    </button>
                  )}
                  {answer?.submitted && (
                    answer.correct
                      ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                      : <XCircle size={20} className="text-red-400 shrink-0" />
                  )}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {answer?.submitted && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className={`ml-9 mt-2 text-xs leading-relaxed ${
                        answer.correct ? 'text-emerald-400/80' : 'text-red-400/80'
                      }`}
                    >
                      {answer.feedback}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

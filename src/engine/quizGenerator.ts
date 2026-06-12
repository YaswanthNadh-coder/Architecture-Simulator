/**
 * Quiz Question Generator — Feature #7
 * Generates quiz questions from pipeline engine execution stats.
 * Auto-grades answers by comparing against the real engine data.
 */

import type { EngineStats } from './pipelineEngine';

export interface QuizQuestion {
  id: string;
  category: 'hazards' | 'performance' | 'branching' | 'forwarding';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  hint?: string;
  answer: number | string;
  unit?: string;
  explanation: string;
}

/**
 * Generate quiz questions from engine stats and configuration
 */
export function generateQuizQuestions(
  stats: EngineStats,
  forwardingEnabled: boolean,
  branchPrediction: string,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const { totalCycles, instructionsCompleted, stallCycles, forwardCount, branchCount, branchMispredictions, flushCount } = stats;

  if (totalCycles === 0 || instructionsCompleted === 0) return [];

  const cpi = Math.round((totalCycles / instructionsCompleted) * 100) / 100;

  // ── Easy Questions ─────────────────────────────────────────────────
  questions.push({
    id: 'q-total-cycles',
    category: 'performance',
    difficulty: 'easy',
    question: 'How many clock cycles did the program take to execute?',
    answer: totalCycles,
    unit: 'cycles',
    explanation: `The program executed in ${totalCycles} total clock cycles. This includes ${instructionsCompleted} useful instruction cycles plus ${stallCycles} stall cycles and pipeline fill/drain overhead.`,
  });

  questions.push({
    id: 'q-instr-count',
    category: 'performance',
    difficulty: 'easy',
    question: 'How many instructions were completed (retired)?',
    answer: instructionsCompleted,
    unit: 'instructions',
    explanation: `${instructionsCompleted} instructions successfully completed (reached the WB stage).`,
  });

  questions.push({
    id: 'q-stall-count',
    category: 'hazards',
    difficulty: 'easy',
    question: 'How many stall cycles (bubbles) occurred during execution?',
    hint: 'Look for cycles where the pipeline was frozen due to data dependencies.',
    answer: stallCycles,
    unit: 'cycles',
    explanation: `${stallCycles} stall cycles occurred. These are cycles where a bubble was inserted due to a data hazard that couldn't be resolved by forwarding.`,
  });

  // ── Medium Questions ───────────────────────────────────────────────
  questions.push({
    id: 'q-cpi',
    category: 'performance',
    difficulty: 'medium',
    question: `What is the CPI (Cycles Per Instruction) for this program?`,
    hint: 'CPI = Total Cycles ÷ Instructions Completed',
    answer: cpi,
    unit: '',
    explanation: `CPI = ${totalCycles} ÷ ${instructionsCompleted} = ${cpi}. An ideal pipeline has CPI = 1.0. Your CPI of ${cpi} means ${cpi > 1 ? `the pipeline is losing ${((cpi - 1) * 100).toFixed(0)}% efficiency due to hazards.` : 'the pipeline is running at ideal efficiency!'}`,
  });

  if (forwardCount > 0) {
    questions.push({
      id: 'q-forward-count',
      category: 'forwarding',
      difficulty: 'medium',
      question: 'How many forwarding operations occurred during execution?',
      hint: 'Count the number of times data was forwarded from EX/MEM or MEM/WB to the ALU inputs.',
      answer: forwardCount,
      unit: 'forwards',
      explanation: `${forwardCount} forwarding operations occurred. ${forwardingEnabled ? 'Without forwarding, these would have all been stall cycles.' : 'Forwarding is disabled, so this counts potential forwarding opportunities.'}`,
    });
  }

  if (branchCount > 0) {
    questions.push({
      id: 'q-branch-mispredictions',
      category: 'branching',
      difficulty: 'medium',
      question: `How many branch mispredictions occurred? (prediction strategy: ${branchPrediction})`,
      hint: `The pipeline uses "${branchPrediction}" prediction. A misprediction causes a pipeline flush.`,
      answer: branchMispredictions,
      unit: 'mispredictions',
      explanation: `${branchMispredictions} out of ${branchCount} branches were mispredicted (${branchCount > 0 ? Math.round((branchMispredictions / branchCount) * 100) : 0}% miss rate). Each misprediction caused a pipeline flush.`,
    });
  }

  // ── Hard Questions ─────────────────────────────────────────────────
  const efficiency = totalCycles > 0 ? Math.round((instructionsCompleted / totalCycles) * 10000) / 100 : 0;

  questions.push({
    id: 'q-efficiency',
    category: 'performance',
    difficulty: 'hard',
    question: 'What is the pipeline efficiency (percentage of useful cycles)?',
    hint: 'Efficiency = (Instructions Completed ÷ Total Cycles) × 100',
    answer: efficiency,
    unit: '%',
    explanation: `Efficiency = (${instructionsCompleted} ÷ ${totalCycles}) × 100 = ${efficiency}%. The remaining ${(100 - efficiency).toFixed(2)}% was wasted on stalls, flushes, and pipeline fill/drain.`,
  });

  if (flushCount > 0) {
    questions.push({
      id: 'q-flush-count',
      category: 'branching',
      difficulty: 'hard',
      question: 'How many pipeline flushes occurred? What type of hazard causes flushes?',
      answer: flushCount,
      unit: 'flushes',
      explanation: `${flushCount} pipeline flushes occurred. Flushes are caused by control hazards — branch mispredictions and jumps. Each flush discards the incorrectly fetched instruction from the pipeline.`,
    });
  }

  return questions;
}

/**
 * Grade a student answer against the correct answer
 */
export function gradeAnswer(
  question: QuizQuestion,
  studentAnswer: string,
): { correct: boolean; feedback: string } {
  const expected = typeof question.answer === 'number' ? question.answer : parseFloat(String(question.answer));
  const student = parseFloat(studentAnswer.trim());

  if (isNaN(student)) {
    return { correct: false, feedback: `Please enter a valid number. The correct answer is ${question.answer}${question.unit ? ' ' + question.unit : ''}.` };
  }

  // Allow small floating point tolerance for CPI/efficiency
  const tolerance = question.difficulty === 'hard' || question.id === 'q-cpi' ? 0.05 : 0.01;
  const correct = Math.abs(student - expected) <= tolerance;

  if (correct) {
    return { correct: true, feedback: `Correct! ${question.explanation}` };
  } else {
    return {
      correct: false,
      feedback: `Not quite. You answered ${student}, but the correct answer is ${question.answer}${question.unit ? ' ' + question.unit : ''}. ${question.explanation}`,
    };
  }
}

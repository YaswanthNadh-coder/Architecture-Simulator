import { MIPSPipelineEngine } from './pipelineEngine';
import { assemble } from './mipsParser';
import { type AssignmentProfile, type TestCase } from './assignmentProfile';

export interface TestCaseResult {
  testCaseId: string;
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  feedback: string[];
}

export interface GradingReport {
  assignmentId: string;
  totalScore: number;
  maxScore: number;
  compileError: boolean;
  testResults: TestCaseResult[];
  cpi: number;
  stalls: number;
  cycles: number;
}

export class AutoGrader {
  
  static grade(code: string, assignment: AssignmentProfile, useForwarding: boolean = true): GradingReport {
    const report: GradingReport = {
      assignmentId: assignment.id,
      totalScore: 0,
      maxScore: 100, // Normalized to 100
      compileError: false,
      testResults: [],
      cpi: 0,
      stalls: 0,
      cycles: 0,
    };

    // 1. Assemble Code
    const assemblyResult = assemble(code);
    if (assemblyResult.errors.some(e => e.severity === 'error')) {
      report.compileError = true;
      report.testResults = assignment.testCases.map(tc => ({
        testCaseId: tc.id,
        name: tc.name,
        passed: false,
        score: 0,
        maxScore: tc.weight,
        feedback: ['Compilation failed. See editor for details.']
      }));
      return report;
    }

    let totalCorrectnessScore = 0;
    const maxCorrectnessScore = assignment.testCases.reduce((sum, tc) => sum + tc.weight, 0);

    // 2. Run Test Cases
    for (const tc of assignment.testCases) {
      const tcResult = this.runTestCase(assemblyResult, tc, useForwarding);
      report.testResults.push(tcResult);
      totalCorrectnessScore += tcResult.score;
      
      // We take metrics from the last run (or we could average them)
      if (tcResult.passed) {
        // Just extract the engine stats from the headless run inside runTestCase if we returned it, 
        // but for simplicity we'll just run it once more for overall stats if it passes.
      }
    }

    // 3. Compute Metrics (Run once more without input constraints for raw metrics)
    const engine = new MIPSPipelineEngine();
    engine.forwardingEnabled = useForwarding;
    engine.loadProgram(assemblyResult.instructions);
    engine.loadDataSegment(assemblyResult.dataSegment);
    while (!engine.isFinished()) {
      engine.step();
    }
    const stats = engine.getSnapshot().stats;
    report.cycles = stats.totalCycles;
    report.stalls = stats.stallCycles;
    report.cpi = stats.totalCycles / Math.max(1, stats.instructionsCompleted);

    // 4. Calculate Final Grade
    // Correctness
    const correctnessPct = maxCorrectnessScore > 0 ? (totalCorrectnessScore / maxCorrectnessScore) : 0;
    let finalScore = correctnessPct * assignment.rubric.correctness;

    // Efficiency
    // For simplicity, if the student passes all tests (including efficiency tests), they get full rubric points.
    if (correctnessPct === 1) {
      finalScore += assignment.rubric.efficiency;
      finalScore += assignment.rubric.style;
    }

    report.totalScore = Math.round(finalScore);

    return report;
  }

  private static runTestCase(
    assemblyResult: ReturnType<typeof assemble>, 
    tc: TestCase,
    useForwarding: boolean
  ): TestCaseResult {
    const engine = new MIPSPipelineEngine();
    engine.forwardingEnabled = useForwarding;
    engine.loadProgram(assemblyResult.instructions);
    engine.loadDataSegment(assemblyResult.dataSegment);

    // Apply inputs
    if (tc.input?.registers) {
      for (const [reg, val] of Object.entries(tc.input.registers)) {
        const regIndex = parseInt(reg.replace('$', ''));
        engine.getRegisters()[regIndex] = val;
      }
    }
    if (tc.input?.memory) {
      for (const [addr, val] of Object.entries(tc.input.memory)) {
        engine.getMemory().set(Number(addr), val);
      }
    }

    // Run execution
    let cycles = 0;
    const MAX_CYCLES = 10000;
    while (!engine.isFinished() && cycles < MAX_CYCLES) {
      engine.step();
      cycles++;
    }

    const feedback: string[] = [];
    let passed = true;

    if (cycles >= MAX_CYCLES) {
      passed = false;
      feedback.push(`Execution timeout (${MAX_CYCLES} cycles). Infinite loop?`);
    }

    const stats = engine.getSnapshot().stats;

    // Check outputs
    if (tc.expected.registers) {
      const regs = engine.getRegisters();
      for (const [reg, expVal] of Object.entries(tc.expected.registers)) {
        const regIndex = parseInt(reg.replace('$', ''));
        const actualVal = regs[regIndex] | 0;
        if (actualVal !== expVal) {
          passed = false;
          feedback.push(`Register ${reg}: expected ${expVal}, got ${actualVal}`);
        }
      }
    }

    if (tc.expected.maxCycles !== undefined && stats.totalCycles > tc.expected.maxCycles) {
      passed = false;
      feedback.push(`Efficiency: Took ${stats.totalCycles} cycles (max allowed: ${tc.expected.maxCycles})`);
    }

    if (tc.expected.maxStalls !== undefined && stats.stallCycles > tc.expected.maxStalls) {
      passed = false;
      feedback.push(`Efficiency: Had ${stats.stallCycles} stalls (max allowed: ${tc.expected.maxStalls})`);
    }

    return {
      testCaseId: tc.id,
      name: tc.name,
      passed,
      score: passed ? tc.weight : 0,
      maxScore: tc.weight,
      feedback: feedback.length ? feedback : ['Passed']
    };
  }
}

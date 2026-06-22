import { MIPSPipelineEngine } from './pipelineEngine.ts';
import { assemble, parseRegister } from './mipsParser.ts';
import { type AssignmentProfile, type TestCase } from './assignmentProfile.ts';

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
      maxScore: 100,
      compileError: false,
      testResults: [],
      cpi: 0,
      stalls: 0,
      cycles: 0,
    };

    const assemblyResult = assemble(code);
    if (assemblyResult.errors.some(e => e.severity === 'error')) {
      report.compileError = true;
      report.testResults = assignment.testCases.map(tc => ({
        testCaseId: tc.id,
        name: tc.name,
        passed: false,
        score: 0,
        maxScore: tc.weight,
        feedback: ['Compilation failed.']
      }));
      return report;
    }

    let totalCorrectnessScore = 0;
    const maxCorrectnessScore = assignment.testCases.reduce((sum, tc) => sum + tc.weight, 0);

    for (const tc of assignment.testCases) {
      const tcResult = this.runTestCase(assemblyResult, tc, useForwarding);
      report.testResults.push(tcResult);
      totalCorrectnessScore += tcResult.score;
    }

    const engine = new MIPSPipelineEngine();
    engine.forwardingEnabled = useForwarding;
    engine.loadProgram(assemblyResult.instructions);
    engine.loadDataSegment(assemblyResult.dataSegment);
    let metricsCycles = 0;
    const MAX_CYCLES = 10000;
    while (!engine.isFinished() && metricsCycles < MAX_CYCLES) {
      engine.step();
      metricsCycles++;
    }
    const stats = engine.getSnapshot().stats;
    report.cycles = stats.totalCycles;
    report.stalls = stats.stallCycles;
    report.cpi = stats.totalCycles / Math.max(1, stats.instructionsCompleted);

    const correctnessPct = maxCorrectnessScore > 0 ? (totalCorrectnessScore / maxCorrectnessScore) : 0;
    let finalScore = correctnessPct * assignment.rubric.correctness;

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

    if (tc.input?.registers) {
      for (const [reg, val] of Object.entries(tc.input.registers)) {
        const regIndex = parseRegister(reg) ?? parseInt(reg.replace('$', ''));
        if (regIndex !== null && !isNaN(regIndex)) {
          engine.getRegisters()[regIndex] = val;
        }
      }
    }
    if (tc.input?.memory) {
      for (const [addr, val] of Object.entries(tc.input.memory)) {
        engine.getMemory().set(Number(addr), val);
      }
    }

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

    if (tc.expected.registers) {
      const regs = engine.getRegisters();
      for (const [reg, expVal] of Object.entries(tc.expected.registers)) {
        const regIndex = parseRegister(reg) ?? parseInt(reg.replace('$', ''));
        if (regIndex === null || isNaN(regIndex) || regIndex < 0 || regIndex > 31) {
          passed = false;
          feedback.push(`Invalid register name: ${reg}`);
          continue;
        }
        const actualVal = regs[regIndex] | 0;
        if (actualVal !== expVal) {
          passed = false;
          feedback.push(`Register ${reg}: expected ${expVal}, got ${actualVal}`);
        }
      }
    }

    if (tc.expected.memory) {
      const mem = engine.getMemory();
      for (const [addrStr, expVal] of Object.entries(tc.expected.memory)) {
        const addr = Number(addrStr);
        if (isNaN(addr)) {
          passed = false;
          feedback.push(`Invalid memory address: ${addrStr}`);
          continue;
        }
        const b0 = mem.get(addr) ?? 0;
        const b1 = mem.get(addr + 1) ?? 0;
        const b2 = mem.get(addr + 2) ?? 0;
        const b3 = mem.get(addr + 3) ?? 0;
        const actualVal = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;

        if (actualVal !== expVal) {
          passed = false;
          feedback.push(`Memory at ${addr}: expected ${expVal}, got ${actualVal}`);
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

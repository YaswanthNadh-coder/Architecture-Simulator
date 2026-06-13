import { create } from 'zustand';
import { assemble, type ParsedInstruction, type ParseError } from '../engine/mipsParser';
import { MIPSPipelineEngine, type PipelineSnapshot, type EngineStats, type DatapathValues } from '../engine/pipelineEngine';
import { completeSyscallInput, SYSCALL } from '../engine/syscallHandler';
import type { CacheConfig } from '../engine/cacheSimulator';
import { logSimulationEvent } from '../services/activityService';

// ── Re-export types for UI compatibility ─────────────────────────────────

export type InstructionStatus = 'normal' | 'hazard' | 'forward' | 'stall' | 'bubble';

export interface StageState {
  instruction: string | null;
  status: InstructionStatus;
  id: string;
  line?: number;
  hazardExplanation?: string;
}

export interface PipelineState {
  IF: StageState;
  ID: StageState;
  EX: StageState;
  MEM: StageState;
  WB: StageState;
}

// ── Stats interface ──────────────────────────────────────────────────────

export interface SimStats {
  totalCycles: number;
  instructionsCompleted: number;
  stallCycles: number;
  dataStallCycles: number;
  controlStallCycles: number;
  memoryStallCycles: number;
  forwardCount: number;
  branchCount: number;
  branchMispredictions: number;
  flushCount: number;
  cpi: number;
  efficiency: number;
}

// ── Store Interface ──────────────────────────────────────────────────────

interface SimulatorStore {
  // Code
  code: string;
  setCode: (code: string) => void;

  // Engine state
  cycle: number;
  pc: number;
  pipeline: PipelineState;
  datapathValues: DatapathValues;
  isFinished: boolean;

  // Parse state
  instructions: ParsedInstruction[];
  parseErrors: ParseError[];
  labels: Map<string, number>;
  dataLabels: Map<string, number>;
  isAssembled: boolean;

  // Control
  isPlaying: boolean;
  forwardingEnabled: boolean;
  branchPrediction: 'not-taken' | 'always-taken';
  memoryLatency: number;
  cacheConfig: CacheConfig;
  speed: number;
  breakpoints: Set<number>;

  // Stats
  stats: SimStats;

  // Recently modified registers (for highlighting)
  modifiedRegs: Set<number>;
  readRegs: Set<number>;
  modifiedAddresses: Set<number>;

  // Current line in editor being executed
  currentPCLine: number;

  // Total possible cycles estimate
  totalInstructionCount: number;

  // Console / IO
  consoleOutput: string[];
  waitingForInput: boolean;
  pendingSyscallV0: number;


  // Blocked instructions (for assignment sandboxing)
  blockedInstructions: string[];

  // Actions
  assemble: () => boolean;
  nextCycle: () => void;
  prevCycle: () => void;
  togglePlay: () => void;
  toggleForwarding: () => void;
  setBranchPrediction: (strategy: 'not-taken' | 'always-taken') => void;
  setMemoryLatency: (latency: number) => void;
  setCacheConfig: (config: CacheConfig) => void;
  reset: () => void;
  setBreakpoint: (line: number) => void;
  removeBreakpoint: (line: number) => void;
  setSpeed: (speed: number) => void;
  clearErrors: () => void;
  submitConsoleInput: (input: string) => void;
  clearConsole: () => void;
  setBlockedInstructions: (blocked: string[]) => void;
  getEngine: () => MIPSPipelineEngine;
}

// ── Engine Instance ──────────────────────────────────────────────────────

const engine = new MIPSPipelineEngine();

// ── Helpers ──────────────────────────────────────────────────────────────

function snapshotToPipelineState(snap: PipelineSnapshot): PipelineState {
  const convert = (entry: PipelineSnapshot[keyof PipelineSnapshot], stageName: string): StageState => ({
    instruction: entry.instruction ? entry.instruction.raw : null,
    status: entry.status,
    id: entry.instruction ? `inst-${entry.instruction.address}-${stageName}` : `bubble-${stageName}`,
    line: entry.instruction?.line,
    hazardExplanation: entry.hazardExplanation,
  });
  return {
    IF: convert(snap.IF, 'IF'),
    ID: convert(snap.ID, 'ID'),
    EX: convert(snap.EX, 'EX'),
    MEM: convert(snap.MEM, 'MEM'),
    WB: convert(snap.WB, 'WB'),
  };
}

function computeStats(engineStats: EngineStats): SimStats {
  const cpi = engineStats.instructionsCompleted > 0
    ? engineStats.totalCycles / engineStats.instructionsCompleted
    : 0;
  const idealCycles = engineStats.instructionsCompleted;
  const efficiency = engineStats.totalCycles > 0
    ? (idealCycles / engineStats.totalCycles) * 100
    : 0;
  return {
    ...engineStats,
    cpi: Math.round(cpi * 100) / 100,
    efficiency: Math.round(efficiency * 100) / 100,
  };
}

const EMPTY_PIPELINE: PipelineState = {
  IF: { instruction: null, status: 'bubble', id: 'e-if' },
  ID: { instruction: null, status: 'bubble', id: 'e-id' },
  EX: { instruction: null, status: 'bubble', id: 'e-ex' },
  MEM: { instruction: null, status: 'bubble', id: 'e-mem' },
  WB: { instruction: null, status: 'bubble', id: 'e-wb' },
};

const EMPTY_STATS: SimStats = {
  totalCycles: 0, instructionsCompleted: 0, stallCycles: 0,
  dataStallCycles: 0, controlStallCycles: 0, memoryStallCycles: 0,
  forwardCount: 0, branchCount: 0, branchMispredictions: 0,
  flushCount: 0, cpi: 0, efficiency: 0,
};

const INITIAL_CODE = `# MIPS Pipeline Demo — Bubble Sort
# Demonstrates .data section, loops, and memory access

.data
array:  .word 5, 3, 8, 1, 4, 7, 2, 6
size:   .word 8

.text
main:
  # Load array base and size
  la    $t0, array        # $t0 = base address
  lw    $t1, 0($t0)       # load first element for demo
  
  # Fibonacci sequence
  addi  $t2, $zero, 0     # fib(n-2) = 0
  addi  $t3, $zero, 1     # fib(n-1) = 1
  addi  $t5, $zero, 8     # loop counter

fib_loop:
  add   $t4, $t2, $t3     # fib = fib(n-2) + fib(n-1)
  add   $t2, $t3, $zero   # advance fib(n-2)
  add   $t3, $t4, $zero   # advance fib(n-1)
  addi  $t5, $t5, -1      # decrement counter
  bne   $t5, $zero, fib_loop

  # Print result
  addi  $v0, $zero, 1     # syscall 1 = print_int
  add   $a0, $t4, $zero   # $a0 = final fibonacci number
  syscall

  # Exit
  addi  $v0, $zero, 10    # syscall 10 = exit
  syscall
`;

const timerWorker = new Worker(new URL('../workers/timerWorker.ts', import.meta.url), { type: 'module' });

timerWorker.onmessage = () => {
  const s = useSimulatorStore.getState();
  if (s.isFinished || !s.isPlaying || s.waitingForInput) {
    timerWorker.postMessage({ command: 'stop' });
    useSimulatorStore.setState({ isPlaying: false });
    return;
  }
  s.nextCycle();
};

// ── Store ────────────────────────────────────────────────────────────────

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  code: INITIAL_CODE,
  cycle: 0,
  pc: 0,
  pipeline: EMPTY_PIPELINE,
  datapathValues: { pc: 0, rsVal: 0, rtVal: 0, imm: 0, aluResult: 0, memData: 0, writeData: 0 },
  isFinished: false,

  instructions: [],
  parseErrors: [],
  labels: new Map(),
  dataLabels: new Map(),
  isAssembled: false,

  isPlaying: false,
  forwardingEnabled: true,
  branchPrediction: 'not-taken',
  memoryLatency: 0,
  cacheConfig: {
    enabled: false,
    cacheSize: 256,
    blockSize: 16,
    associativity: 1,
    missPenalty: 10,
  },
  speed: 800,
  breakpoints: new Set(),

  stats: EMPTY_STATS,
  modifiedRegs: new Set(),
  readRegs: new Set(),
  modifiedAddresses: new Set(),
  currentPCLine: -1,
  totalInstructionCount: 0,

  consoleOutput: [],
  waitingForInput: false,
  pendingSyscallV0: 0,

  blockedInstructions: [],

  getEngine: () => engine,

  setCode: (code) => set({ code, isAssembled: false }),

  assemble: () => {
    const { code, forwardingEnabled, branchPrediction, memoryLatency, cacheConfig, blockedInstructions } = get();
    const result = assemble(code, {
      blockedInstructions: blockedInstructions.length > 0 ? blockedInstructions : undefined,
    });

    // Only block on actual errors, not warnings
    const hasErrors = result.errors.some(e => e.severity === 'error');
    if (hasErrors) {
      set({
        parseErrors: result.errors,
        isAssembled: false,
        instructions: [],
      });
      return false;
    }

    logSimulationEvent('assemble');

    engine.forwardingEnabled = forwardingEnabled;
    engine.branchPrediction = branchPrediction;
    engine.memoryLatency = memoryLatency;
    engine.cache.updateConfig(cacheConfig);
    engine.loadProgram(result.instructions);
    engine.loadDataSegment(result.dataSegment);

    const snap = engine.getSnapshot();

    set({
      instructions: result.instructions,
      parseErrors: result.errors, // May include warnings
      labels: result.labels,
      dataLabels: result.dataLabels,
      isAssembled: true,
      cycle: 0,
      pc: snap.pc,
      pipeline: EMPTY_PIPELINE,
      datapathValues: snap.datapathValues,
      isFinished: false,
      stats: EMPTY_STATS,
      modifiedRegs: new Set(),
      readRegs: new Set(),
      modifiedAddresses: new Set(),
      currentPCLine: result.instructions.length > 0 ? result.instructions[0].line : -1,
      totalInstructionCount: result.instructions.length,
      isPlaying: false,
      consoleOutput: [],
      waitingForInput: false,
      pendingSyscallV0: 0,
    });

    // Stop auto-play if running
    timerWorker.postMessage({ command: 'stop' });

    return true;
  },

  nextCycle: () => {
    const state = get();
    if (!state.isAssembled || state.isFinished || state.waitingForInput) {
      if (state.isPlaying) {
        set({ isPlaying: false });
        timerWorker.postMessage({ command: 'stop' });
      }
      return;
    }

    if (!state.isPlaying) {
      logSimulationEvent('step');
    }

    const prevRegs = engine.getSnapshot().registers;
    const snap = engine.step();

    // Determine which registers changed
    const modified = new Set<number>();
    const read = new Set<number>();
    for (let i = 1; i < 32; i++) {
      if (snap.registers[i] !== prevRegs[i]) modified.add(i);
    }
    // Track reads from current ID stage
    if (snap.pipeline.ID.instruction) {
      for (const r of snap.pipeline.ID.instruction.readsRegs) {
        if (r > 0) read.add(r);
      }
    }

    // Handle console output
    const newConsoleOutput = [...state.consoleOutput];
    if (snap.consoleOutput) {
      newConsoleOutput.push(snap.consoleOutput);
    }

    // Handle syscall input request
    let waitingForInput = false;
    let pendingSyscallV0 = 0;
    if (snap.syscallResult?.waitForInput) {
      waitingForInput = true;
      pendingSyscallV0 = engine.getRegisters()[2]; // $v0
      // Pause auto-play
      if (state.isPlaying) {
        timerWorker.postMessage({ command: 'stop' });
      }
    }

    // Check breakpoints
    if (state.isPlaying && snap.pipeline.IF.instruction && !waitingForInput) {
      const line = snap.pipeline.IF.instruction.line;
      if (state.breakpoints.has(line)) {
        set({ isPlaying: false });
        timerWorker.postMessage({ command: 'stop' });
      }
    }

    // Check if finished
    if (snap.finished && state.isPlaying) {
      set({ isPlaying: false });
      timerWorker.postMessage({ command: 'stop' });
    }

    if (snap.finished && snap.terminationReason === 'max_cycles_reached') {
      newConsoleOutput.push(`\n[Program terminated: Maximum cycle limit (${engine.maxCycles}) reached. Possible infinite loop.]`);
    }

    set({
      cycle: snap.cycle,
      pc: snap.pc,
      pipeline: snapshotToPipelineState(snap.pipeline),
      datapathValues: snap.datapathValues,
      isFinished: snap.finished,
      stats: computeStats(snap.stats),
      modifiedRegs: modified,
      readRegs: read,
      modifiedAddresses: new Set(snap.modifiedAddresses),
      currentPCLine: snap.pipeline.IF.instruction?.line ?? -1,
      consoleOutput: newConsoleOutput,
      waitingForInput,
      pendingSyscallV0,
    });
  },

  prevCycle: () => {
    const snap = engine.stepBack();
    if (!snap) return;

    set({
      cycle: snap.cycle,
      pc: snap.pc,
      pipeline: snapshotToPipelineState(snap.pipeline),
      datapathValues: snap.datapathValues,
      isFinished: snap.finished,
      stats: computeStats(snap.stats),
      modifiedRegs: new Set(),
      readRegs: new Set(),
      modifiedAddresses: new Set(),
      currentPCLine: snap.pipeline.IF.instruction?.line ?? -1,
    });
  },

  togglePlay: () => {
    const state = get();

    // Auto-assemble if not yet assembled
    if (!state.isAssembled) {
      const success = get().assemble();
      if (!success) return;
    }

    if (state.isPlaying) {
      // Stop
      timerWorker.postMessage({ command: 'stop' });
      set({ isPlaying: false });
    } else {
      // Start
      if (state.isFinished || state.waitingForInput) return;
      set({ isPlaying: true });
      timerWorker.postMessage({ command: 'start', interval: state.speed });
    }
  },

  toggleForwarding: () => {
    const state = get();
    const newValue = !state.forwardingEnabled;
    engine.forwardingEnabled = newValue;
    set({ forwardingEnabled: newValue });
    // Re-assemble if already assembled to apply new forwarding mode
    if (state.isAssembled) {
      get().assemble();
    }
  },

  setBranchPrediction: (strategy) => {
    engine.branchPrediction = strategy;
    set({ branchPrediction: strategy });
    if (get().isAssembled) get().assemble();
  },

  setMemoryLatency: (latency) => {
    engine.memoryLatency = latency;
    set({ memoryLatency: latency });
    if (get().isAssembled) get().assemble();
  },

  setCacheConfig: (config) => {
    engine.cache.updateConfig(config);
    set({ cacheConfig: config });
    if (get().isAssembled) get().assemble();
  },

  reset: () => {
    timerWorker.postMessage({ command: 'stop' });
    const state = get();
    if (state.isAssembled && state.instructions.length > 0) {
      engine.loadProgram(state.instructions);
      // Re-load data segment from last assembly
      const result = assemble(state.code);
      engine.loadDataSegment(result.dataSegment);
      const snap = engine.getSnapshot();
      set({
        cycle: 0,
        pc: snap.pc,
        pipeline: EMPTY_PIPELINE,
        isFinished: false,
        isPlaying: false,
        stats: EMPTY_STATS,
        modifiedRegs: new Set(),
        readRegs: new Set(),
        modifiedAddresses: new Set(),
        currentPCLine: state.instructions[0]?.line ?? -1,
        consoleOutput: [],
        waitingForInput: false,
        pendingSyscallV0: 0,
      });
    } else {
      set({
        cycle: 0, pc: 0,
        pipeline: EMPTY_PIPELINE,
        isFinished: false, isPlaying: false,
        stats: EMPTY_STATS,
        modifiedRegs: new Set(), readRegs: new Set(),
        modifiedAddresses: new Set(),
        currentPCLine: -1,
        consoleOutput: [],
        waitingForInput: false,
        pendingSyscallV0: 0,
      });
    }
  },

  setBreakpoint: (line) => {
    const bps = new Set(get().breakpoints);
    bps.add(line);
    set({ breakpoints: bps });
  },

  removeBreakpoint: (line) => {
    const bps = new Set(get().breakpoints);
    bps.delete(line);
    set({ breakpoints: bps });
  },

  setSpeed: (speed) => {
    set({ speed });
    // Restart interval if playing
    if (get().isPlaying) {
      timerWorker.postMessage({ command: 'start', interval: speed });
    }
  },

  clearErrors: () => set({ parseErrors: [] }),

  submitConsoleInput: (input: string) => {
    const state = get();
    if (!state.waitingForInput) return;

    if (state.pendingSyscallV0 === SYSCALL.READ_INT) {
      const parsed = parseInt(input.trim(), 10);
      if (isNaN(parsed)) {
        set({
          consoleOutput: [...state.consoleOutput, `> ${input}`, `Error: Invalid integer input. Please try again.`],
        });
        return;
      }
    }

    const registers = engine.getRegisters();
    const memory = engine.getMemory();

    // Complete the pending syscall
    const writes = completeSyscallInput(state.pendingSyscallV0, input, registers, memory);

    // Apply register writes
    for (const [reg, val] of writes) {
      registers[reg] = val;
    }

    // Add input echo to console
    const newConsoleOutput = [...state.consoleOutput];
    if (state.pendingSyscallV0 === SYSCALL.READ_INT) {
      newConsoleOutput.push(`> ${input}`);
    } else if (state.pendingSyscallV0 === SYSCALL.READ_STRING) {
      newConsoleOutput.push(`> ${input}`);
    }

    set({
      waitingForInput: false,
      pendingSyscallV0: 0,
      consoleOutput: newConsoleOutput,
    });

    // Resume auto-play if it was running
    if (state.isPlaying) {
      timerWorker.postMessage({ command: 'start', interval: state.speed });
    }
  },

  clearConsole: () => set({ consoleOutput: [] }),

  setBlockedInstructions: (blocked) => set({ blockedInstructions: blocked }),
}));

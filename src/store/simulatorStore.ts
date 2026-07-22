import { create } from 'zustand';
import { assemble, type ParsedInstruction, type ParseError } from '../engine/mipsParser';
import { assembleRISCV } from '../engine/riscvParser';
import { MIPSPipelineEngine, type PipelineSnapshot, type EngineStats, type DatapathValues } from '../engine/pipelineEngine';
import { completeSyscallInput, SYSCALL } from '../engine/syscallHandler';
import type { CacheConfig, CacheHierarchyConfig } from '../engine/cacheSimulator';
import { logSimulationEvent, logSimulationCompletion } from '../services/activityService';

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
  cacheHierarchyConfig: CacheHierarchyConfig;
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

  // ISA selection
  isa: 'mips' | 'riscv';

  // Actions
  assemble: () => boolean;
  nextCycle: () => void;
  prevCycle: () => void;
  togglePlay: () => void;
  toggleForwarding: () => void;
  setForwardingEnabled: (enabled: boolean) => void;
  setBranchPrediction: (strategy: 'not-taken' | 'always-taken') => void;
  setMemoryLatency: (latency: number) => void;
  setCacheConfig: (config: CacheConfig) => void;
  setCacheHierarchyConfig: (config: CacheHierarchyConfig) => void;
  reset: () => void;
  setBreakpoint: (line: number) => void;
  removeBreakpoint: (line: number) => void;
  setSpeed: (speed: number) => void;
  clearErrors: () => void;
  submitConsoleInput: (input: string) => void;
  clearConsole: () => void;
  setBlockedInstructions: (blocked: string[]) => void;
  setISA: (isa: 'mips' | 'riscv') => void;
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
# Sorts an array of integers in ascending order

.data
array:  .word 64, 25, 12, 22, 11, 90, 45, 33
size:   .word 8

.text
main:
  la    $s0, array       # $s0 = base address
  addi  $s1, $zero, 8    # size = 8

outer:
  addi  $t0, $zero, 0    # swapped = false
  addi  $t1, $zero, 0    # i = 0
  addi  $t2, $s1, -1     # limit = size - 1

inner:
  beq   $t1, $t2, check_swap

  # Load array[i] and array[i+1]
  sll   $t3, $t1, 2      # offset = i * 4
  add   $t3, $s0, $t3    # addr = base + offset
  lw    $t4, 0($t3)      # array[i]
  lw    $t5, 4($t3)      # array[i+1]

  # Compare and swap if needed
  slt   $t6, $t5, $t4    # if array[i+1] < array[i]
  beq   $t6, $zero, no_swap

  sw    $t5, 0($t3)      # swap: array[i] = array[i+1]
  sw    $t4, 4($t3)      # swap: array[i+1] = array[i]
  addi  $t0, $zero, 1    # swapped = true

no_swap:
  addi  $t1, $t1, 1      # i++
  j     inner

check_swap:
  bne   $t0, $zero, outer  # if swapped, repeat

  # Print sorted array
  addi  $t1, $zero, 0    # i = 0
print_loop:
  beq   $t1, $s1, done
  sll   $t3, $t1, 2
  add   $t3, $s0, $t3
  lw    $a0, 0($t3)
  addi  $v0, $zero, 1    # syscall 1 = print int
  syscall
  addi  $v0, $zero, 11   # syscall 11 = print char
  addi  $a0, $zero, 32   # 32 = space
  syscall
  addi  $t1, $t1, 1      # i++
  j     print_loop

done:
  addi  $v0, $zero, 10   # syscall 10 = exit
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
    missPenalty: 1,
    policy: 'lru',
  },
  cacheHierarchyConfig: {
    l1: { enabled: false, cacheSize: 256, blockSize: 16, associativity: 1, missPenalty: 1, policy: 'lru' },
    l2: { enabled: false, cacheSize: 4096, blockSize: 32, associativity: 4, missPenalty: 10, policy: 'lru' },
    l3: { enabled: false, cacheSize: 32768, blockSize: 64, associativity: 8, missPenalty: 50, policy: 'lru' },
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
  isa: 'mips',

  getEngine: () => engine,

  setCode: (code) => set({ code, isAssembled: false }),

  assemble: () => {
    const { code, forwardingEnabled, branchPrediction, memoryLatency, cacheHierarchyConfig, blockedInstructions, isa } = get();
    const result = isa === 'riscv'
      ? assembleRISCV(code, {
          blockedInstructions: blockedInstructions.length > 0 ? blockedInstructions : undefined,
        })
      : assemble(code, {
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
    engine.cacheHierarchy.updateConfig(cacheHierarchyConfig);
    engine.isa = isa;
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

    // Log rich completion event
    if (snap.finished && !state.isFinished) {
      logSimulationCompletion(snap.stats, state.forwardingEnabled).catch(() => {});
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

  setForwardingEnabled: (enabled) => {
    const state = get();
    engine.forwardingEnabled = enabled;
    set({ forwardingEnabled: enabled });
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
    const hierarchy = { ...get().cacheHierarchyConfig, l1: config };
    engine.cacheHierarchy.updateConfig(hierarchy);
    set({ cacheConfig: config, cacheHierarchyConfig: hierarchy });
    if (get().isAssembled) get().assemble();
  },

  setCacheHierarchyConfig: (hierarchyConfig) => {
    engine.cacheHierarchy.updateConfig(hierarchyConfig);
    set({ cacheHierarchyConfig: hierarchyConfig, cacheConfig: hierarchyConfig.l1 });
    if (get().isAssembled) get().assemble();
  },

  setISA: (isa) => {
    set({ isa, isAssembled: false });
  },

  reset: () => {
    timerWorker.postMessage({ command: 'stop' });
    const state = get();
    if (state.isAssembled && state.instructions.length > 0) {
      engine.loadProgram(state.instructions);
      // Re-load data segment from last assembly
      const result = state.isa === 'riscv' ? assembleRISCV(state.code) : assemble(state.code);
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
    const writes = completeSyscallInput(state.pendingSyscallV0, input, registers, memory, state.isa);

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

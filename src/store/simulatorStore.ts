import { create } from 'zustand';
import { assemble, type ParsedInstruction, type ParseError, REG_NAMES } from '../engine/mipsParser';
import { MIPSPipelineEngine, type PipelineSnapshot, type EngineStats, type CycleRecord } from '../engine/pipelineEngine';
import { completeSyscallInput, SYSCALL } from '../engine/syscallHandler';

// ── Re-export types for UI compatibility ─────────────────────────────────

export type InstructionStatus = 'normal' | 'hazard' | 'forward' | 'stall' | 'bubble';

export interface StageState {
  instruction: string | null;
  status: InstructionStatus;
  id: string;
  line?: number;
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
  registers: Record<string, string>;
  memory: Map<number, number>;
  pipeline: PipelineState;
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

  // Cycle history for timing diagram
  cycleHistory: CycleRecord[];

  // Blocked instructions (for assignment sandboxing)
  blockedInstructions: string[];

  // Actions
  assemble: () => boolean;
  nextCycle: () => void;
  prevCycle: () => void;
  togglePlay: () => void;
  toggleForwarding: () => void;
  reset: () => void;
  setBreakpoint: (line: number) => void;
  removeBreakpoint: (line: number) => void;
  setSpeed: (speed: number) => void;
  clearErrors: () => void;
  submitConsoleInput: (input: string) => void;
  clearConsole: () => void;
  setBlockedInstructions: (blocked: string[]) => void;
}

// ── Engine Instance ──────────────────────────────────────────────────────

const engine = new MIPSPipelineEngine();

// ── Helpers ──────────────────────────────────────────────────────────────

function registersToRecord(regs: Int32Array): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < 32; i++) {
    result[REG_NAMES[i]] = '0x' + ((regs[i] >>> 0).toString(16)).toUpperCase().padStart(8, '0');
  }
  return result;
}

function snapshotToPipelineState(snap: PipelineSnapshot): PipelineState {
  const convert = (entry: PipelineSnapshot[keyof PipelineSnapshot], stageName: string): StageState => ({
    instruction: entry.instruction ? entry.instruction.raw : null,
    status: entry.status,
    id: entry.instruction ? `inst-${entry.instruction.address}-${stageName}` : `bubble-${stageName}`,
    line: entry.instruction?.line,
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

let autoPlayInterval: ReturnType<typeof setInterval> | null = null;

// ── Store ────────────────────────────────────────────────────────────────

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  code: INITIAL_CODE,
  cycle: 0,
  pc: 0,
  registers: registersToRecord(new Int32Array(32)),
  memory: new Map(),
  pipeline: EMPTY_PIPELINE,
  isFinished: false,

  instructions: [],
  parseErrors: [],
  labels: new Map(),
  dataLabels: new Map(),
  isAssembled: false,

  isPlaying: false,
  forwardingEnabled: true,
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

  cycleHistory: [],
  blockedInstructions: [],

  setCode: (code) => set({ code, isAssembled: false }),

  assemble: () => {
    const { code, forwardingEnabled, blockedInstructions } = get();
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

    engine.forwardingEnabled = forwardingEnabled;
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
      registers: registersToRecord(snap.registers),
      memory: new Map(snap.memory),
      pipeline: EMPTY_PIPELINE,
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
      cycleHistory: [],
    });

    // Stop auto-play if running
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }

    return true;
  },

  nextCycle: () => {
    const state = get();
    if (!state.isAssembled || state.isFinished || state.waitingForInput) {
      if (state.isPlaying) {
        set({ isPlaying: false });
        if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
      }
      return;
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
        if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
      }
    }

    // Check breakpoints
    if (state.isPlaying && snap.pipeline.IF.instruction && !waitingForInput) {
      const line = snap.pipeline.IF.instruction.line;
      if (state.breakpoints.has(line)) {
        set({ isPlaying: false });
        if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
      }
    }

    // Check if finished
    if (snap.finished && state.isPlaying) {
      set({ isPlaying: false });
      if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
    }

    set({
      cycle: snap.cycle,
      pc: snap.pc,
      registers: registersToRecord(snap.registers),
      memory: new Map(snap.memory),
      pipeline: snapshotToPipelineState(snap.pipeline),
      isFinished: snap.finished,
      stats: computeStats(snap.stats),
      modifiedRegs: modified,
      readRegs: read,
      modifiedAddresses: new Set(snap.modifiedAddresses),
      currentPCLine: snap.pipeline.IF.instruction?.line ?? -1,
      consoleOutput: newConsoleOutput,
      waitingForInput,
      pendingSyscallV0,
      cycleHistory: [...engine.cycleHistory],
    });
  },

  prevCycle: () => {
    const snap = engine.stepBack();
    if (!snap) return;

    set({
      cycle: snap.cycle,
      pc: snap.pc,
      registers: registersToRecord(snap.registers),
      memory: new Map(snap.memory),
      pipeline: snapshotToPipelineState(snap.pipeline),
      isFinished: snap.finished,
      stats: computeStats(snap.stats),
      modifiedRegs: new Set(),
      readRegs: new Set(),
      modifiedAddresses: new Set(),
      currentPCLine: snap.pipeline.IF.instruction?.line ?? -1,
      cycleHistory: [...engine.cycleHistory],
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
      if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
      set({ isPlaying: false });
    } else {
      // Start
      if (state.isFinished || state.waitingForInput) return;
      set({ isPlaying: true });
      autoPlayInterval = setInterval(() => {
        const s = get();
        if (s.isFinished || !s.isPlaying || s.waitingForInput) {
          if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
          set({ isPlaying: false });
          return;
        }
        s.nextCycle();
      }, state.speed);
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

  reset: () => {
    if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
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
        registers: registersToRecord(snap.registers),
        memory: new Map(snap.memory),
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
        cycleHistory: [],
      });
    } else {
      set({
        cycle: 0, pc: 0,
        registers: registersToRecord(new Int32Array(32)),
        memory: new Map(),
        pipeline: EMPTY_PIPELINE,
        isFinished: false, isPlaying: false,
        stats: EMPTY_STATS,
        modifiedRegs: new Set(), readRegs: new Set(),
        modifiedAddresses: new Set(),
        currentPCLine: -1,
        consoleOutput: [],
        waitingForInput: false,
        pendingSyscallV0: 0,
        cycleHistory: [],
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
    if (get().isPlaying && autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = setInterval(() => {
        const s = get();
        if (s.isFinished || !s.isPlaying || s.waitingForInput) {
          if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
          set({ isPlaying: false });
          return;
        }
        s.nextCycle();
      }, speed);
    }
  },

  clearErrors: () => set({ parseErrors: [] }),

  submitConsoleInput: (input: string) => {
    const state = get();
    if (!state.waitingForInput) return;

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
      registers: registersToRecord(registers),
      consoleOutput: newConsoleOutput,
    });

    // Resume auto-play if it was running
    if (state.isPlaying) {
      autoPlayInterval = setInterval(() => {
        const s = get();
        if (s.isFinished || !s.isPlaying || s.waitingForInput) {
          if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; }
          set({ isPlaying: false });
          return;
        }
        s.nextCycle();
      }, state.speed);
    }
  },

  clearConsole: () => set({ consoleOutput: [] }),

  setBlockedInstructions: (blocked) => set({ blockedInstructions: blocked }),
}));

/**
 * MIPS 5-Stage Pipeline Simulation Engine
 * Implements: IF → ID → EX → MEM → WB with hazard detection, forwarding, and stalls.
 * Supports syscalls, data segments, history cap, and event callbacks.
 */

import type { ParsedInstruction } from './mipsParser';
import { handleSyscall, type SyscallResult } from './syscallHandler';
import { CacheSimulator } from './cacheSimulator';
import { BranchPredictionTracker } from './branchPredictor';

// ── Types ────────────────────────────────────────────────────────────────

export type InstructionStatus = 'normal' | 'hazard' | 'forward' | 'stall' | 'bubble';

export interface StageEntry {
  instruction: ParsedInstruction | null;
  status: InstructionStatus;
  hazardExplanation?: string;
}

export interface PipelineSnapshot {
  IF: StageEntry;
  ID: StageEntry;
  EX: StageEntry;
  MEM: StageEntry;
  WB: StageEntry;
}

export interface DatapathValues {
  pc: number;
  rsVal: number;
  rtVal: number;
  imm: number;
  aluResult: number;
  memData: number;
  writeData: number;
}

/** Record of which instruction was in which stage at a given cycle */
export interface CycleRecord {
  cycle: number;
  IF: { instruction: ParsedInstruction | null; status: InstructionStatus; hazardExplanation?: string };
  ID: { instruction: ParsedInstruction | null; status: InstructionStatus; hazardExplanation?: string };
  EX: { instruction: ParsedInstruction | null; status: InstructionStatus; hazardExplanation?: string };
  MEM: { instruction: ParsedInstruction | null; status: InstructionStatus; hazardExplanation?: string };
  WB: { instruction: ParsedInstruction | null; status: InstructionStatus; hazardExplanation?: string };
}

export interface CycleSnapshot {
  cycle: number;
  pc: number;
  registers: Int32Array;
  memory: Map<number, number>;
  pipeline: PipelineSnapshot;
  datapathValues: DatapathValues;
  stats: EngineStats;
  hi: number;
  lo: number;
  finished: boolean;
  consoleOutput: string;
  syscallResult: SyscallResult | null;
  modifiedAddresses: number[];
  terminationReason?: 'normal' | 'max_cycles_reached' | 'exception';
}

export interface EngineStats {
  totalCycles: number;
  instructionsCompleted: number;
  stallCycles: number; // total
  dataStallCycles: number;
  controlStallCycles: number;
  memoryStallCycles: number;
  forwardCount: number;
  branchCount: number;
  branchMispredictions: number;
  flushCount: number;
}

// ── Event Callbacks ──────────────────────────────────────────────────────

export interface EngineEvents {
  onForward?: (from: 'ex' | 'mem', register: number, value: number) => void;
  onStall?: (reason: string, cycle: number) => void;
  onBranchResolved?: (taken: boolean, target: number, cycle: number) => void;
  onSyscall?: (v0: number, result: SyscallResult) => void;
}

// ── Internal Pipeline Latch Types ────────────────────────────────────────

interface IFIDLatch {
  instruction: ParsedInstruction | null;
  pc: number;
  npc: number;
  valid: boolean;
}

interface IDEXLatch {
  instruction: ParsedInstruction | null;
  pc: number;
  rsVal: number;
  rtVal: number;
  imm: number;
  shamt: number;
  rs: number;
  rt: number;
  writeReg: number;
  // Control
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;
  memToReg: boolean;
  isBranch: boolean;
  isJump: boolean;
  isJumpReg: boolean;
  isLoad: boolean;
  isStore: boolean;
  isSyscall: boolean;
  op: string;
  valid: boolean;
  status: InstructionStatus;
  writesHiLo: boolean;
  hiResult: number;
  loResult: number;
  predictedTaken: boolean;
  fallthroughPC: number;
  hazardExplanation?: string;
}

interface EXMEMLatch {
  instruction: ParsedInstruction | null;
  pc: number;
  aluResult: number;
  writeData: number;
  writeReg: number;
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;
  memToReg: boolean;
  isLoad: boolean;
  isSyscall: boolean;
  op: string;
  valid: boolean;
  status: InstructionStatus;
  writesHiLo: boolean;
  hiResult: number;
  loResult: number;
  hazardExplanation?: string;
}

interface MEMWBLatch {
  instruction: ParsedInstruction | null;
  pc: number;
  aluResult: number;
  memData: number;
  writeReg: number;
  regWrite: boolean;
  memToReg: boolean;
  isSyscall: boolean;
  op: string;
  valid: boolean;
  status: InstructionStatus;
  writesHiLo: boolean;
  hiResult: number;
  loResult: number;
}

// ── Bubble Factories ─────────────────────────────────────────────────────

const bubbleIFID = (): IFIDLatch => ({ instruction: null, pc: 0, npc: 0, valid: false });
const bubbleIDEX = (): IDEXLatch => ({
  instruction: null, pc: 0, rsVal: 0, rtVal: 0, imm: 0, shamt: 0,
  rs: -1, rt: -1, writeReg: -1,
  regWrite: false, memRead: false, memWrite: false, memToReg: false,
  isBranch: false, isJump: false, isJumpReg: false, isLoad: false, isStore: false,
  isSyscall: false, op: '', valid: false, status: 'bubble', writesHiLo: false, hiResult: 0, loResult: 0, predictedTaken: false, fallthroughPC: 0,
});
const bubbleEXMEM = (): EXMEMLatch => ({
  instruction: null, pc: 0, aluResult: 0, writeData: 0, writeReg: -1,
  regWrite: false, memRead: false, memWrite: false, memToReg: false,
  isLoad: false, isSyscall: false, op: '', valid: false, status: 'bubble', writesHiLo: false, hiResult: 0, loResult: 0,
});
const bubbleMEMWB = (): MEMWBLatch => ({
  instruction: null, pc: 0, aluResult: 0, memData: 0, writeReg: -1,
  regWrite: false, memToReg: false, isSyscall: false, op: '', valid: false, status: 'bubble', writesHiLo: false, hiResult: 0, loResult: 0,
});

// ── History Snapshot (compressed for circular buffer) ─────────────────────

interface HistoryEntry {
  cycle: number;
  pc: number;
  registers: Int32Array;
  memoryDelta: Map<number, number>; // Only changed bytes vs. initial
  hi: number;
  lo: number;
  finished: boolean;
  ifId: IFIDLatch;
  idEx: IDEXLatch;
  exMem: EXMEMLatch;
  memWb: MEMWBLatch;
  stats: EngineStats;
  terminationReason?: 'normal' | 'max_cycles_reached' | 'exception';
}

// ── Main Engine ──────────────────────────────────────────────────────────

const MAX_HISTORY = 500;

export class MIPSPipelineEngine {
  private instructions: ParsedInstruction[] = [];
  private registers = new Int32Array(32);
  private memory = new Map<number, number>();
  private initialMemory = new Map<number, number>();
  private pc = 0;
  public csrRegisters = new Map<number, number>();
  private hi = 0;
  private lo = 0;
  private cycle = 0;
  private finished = false;
  private terminationReason?: 'normal' | 'max_cycles_reached' | 'exception';

  // Pipeline latches
  private ifId: IFIDLatch = bubbleIFID();
  private idEx: IDEXLatch = bubbleIDEX();
  private exMem: EXMEMLatch = bubbleEXMEM();
  private memWb: MEMWBLatch = bubbleMEMWB();

  // Stats
  private stats: EngineStats = this.emptyStats();

  // Config
  public forwardingEnabled = true;
  public branchPrediction: 'not-taken' | 'always-taken' = 'not-taken';
  public memoryLatency = 0;
  public maxCycles = 10000;
  public isa: 'mips' | 'riscv' = 'mips';
  
  // Cache
  public cache = new CacheSimulator({
    enabled: false,
    cacheSize: 256,
    blockSize: 16,
    associativity: 1,
    missPenalty: 10,
  });

  public branchPredictor = new BranchPredictionTracker();

  private memStallCounter = 0;

  // Cycle history for timing diagram
  public cycleHistory: CycleRecord[] = [];

  // History for backward stepping (circular buffer)
  private history: HistoryEntry[] = [];

  // Event callbacks
  public events: EngineEvents = {};

  // Addresses modified this cycle (for UI highlighting)
  private lastModifiedAddresses: number[] = [];

  // ── Public API ───────────────────────────────────────────────────────

  loadProgram(instructions: ParsedInstruction[]): void {
    this.instructions = instructions;
    this.reset();
  }

  loadDataSegment(data: Map<number, number>): void {
    for (const [addr, val] of data) {
      this.memory.set(addr, val);
      this.initialMemory.set(addr, val);
    }
  }

  reset(): void {
    this.registers = new Int32Array(32);
    this.registers[28] = 0x10008000; // $gp
    this.registers[29] = 0x7FFFFFFC; // $sp (MIPS)
    this.registers[2] = 0x7FFFFFFC;  // sp (RISC-V)
    this.memory = new Map(this.initialMemory);
    this.csrRegisters.clear();
    this.pc = 0;
    this.hi = 0;
    this.lo = 0;
    this.cycle = 0;
    this.finished = false;
    this.terminationReason = undefined;
    this.ifId = bubbleIFID();
    this.idEx = bubbleIDEX();
    this.exMem = bubbleEXMEM();
    this.memWb = bubbleMEMWB();
    this.stats = this.emptyStats();
    this.history = [];
    this.cycleHistory = [];
    this.lastModifiedAddresses = [];
    this.memStallCounter = 0;
    this.cache.reset();
    this.branchPredictor.reset();
    // Save initial snapshot
    this.history.push(this.takeHistoryEntry());
  }

  step(): CycleSnapshot {
    if (this.finished) return this.takeSnapshot();

    this.cycle++;
    this.stats.totalCycles = this.cycle;
    this.lastModifiedAddresses = [];

    // Safety: max cycle limit
    if (this.cycle > this.maxCycles) {
      this.finished = true;
      this.terminationReason = 'max_cycles_reached';
      return this.takeSnapshot();
    }

    // ── 1. Detect hazards ──────────────────────────────────────────
    const stallNeeded = this.detectLoadUseHazard();

    // ── 2. Forwarding logic has been moved to EX stage ─────────────

    // ── 3. Write-Back stage ────────────────────────────────────────
    let syscallResult: SyscallResult | null = null;
    let consoleOutput = '';

    if (this.memWb.valid && this.memWb.regWrite && this.memWb.writeReg > 0) {
      const value = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
      this.registers[this.memWb.writeReg] = value;
      this.stats.instructionsCompleted++;
    } else if (this.memWb.valid && !this.memWb.regWrite) {
      this.stats.instructionsCompleted++;
    }

    // Apply HI/LO register writes
    if (this.memWb.valid && this.memWb.writesHiLo) {
      this.hi = this.memWb.hiResult;
      this.lo = this.memWb.loResult;
    }

    // Handle syscall and ebreak in WB stage
    if (this.memWb.valid && this.memWb.isSyscall) {
      if (this.memWb.op === 'ebreak') {
        this.finished = true;
        this.terminationReason = 'normal';
        consoleOutput = 'Breakpoint encountered (ebreak).\n';
      } else {
        // Use MIPS v0 (reg 2) or RISC-V a7 (reg 17)
        const v0 = this.isa === 'riscv' ? this.registers[17] : this.registers[2];
        syscallResult = handleSyscall(v0, this.registers, this.memory, this.isa);
        consoleOutput = syscallResult.outputText;

        // Apply register writes from syscall
        for (const [reg, val] of syscallResult.registerWrites) {
          this.registers[reg] = val;
        }

        if (syscallResult.exit) {
          this.finished = true;
          this.terminationReason = 'normal';
        }

        this.events.onSyscall?.(v0, syscallResult);
      }
    }

    // ── Memory Stall Logic ──
    let memStallNeeded = false;
    if (this.memStallCounter > 0) {
      this.memStallCounter--;
      if (this.memStallCounter > 0) memStallNeeded = true;
    } else if (this.exMem.valid && (this.exMem.memRead || this.exMem.memWrite)) {
      let latency = this.memoryLatency;
      if (this.cache.config.enabled) {
        const addr = this.exMem.aluResult;
        const result = this.cache.access(addr, this.exMem.memWrite);
        latency = result.stallCycles;
      }
      
      if (latency > 0) {
        this.memStallCounter = latency;
        memStallNeeded = true;
      }
    }

    if (memStallNeeded) {
      this.stats.stallCycles++;
      this.stats.memoryStallCycles++;
      this.events.onStall?.('memory latency', this.cycle);

      this.memWb = bubbleMEMWB();
      this.memWb.status = 'stall';

      if (!this.finished) {
        this.finished = this.isPipelineDrained();
      }

      this.cycleHistory.push({
        cycle: this.cycle,
        IF: { instruction: this.ifId.valid ? this.ifId.instruction : null, status: this.ifId.valid ? 'normal' : 'bubble' },
        ID: { instruction: this.idEx.valid ? this.idEx.instruction : null, status: this.idEx.valid ? this.idEx.status : 'bubble' },
        EX: { instruction: this.exMem.valid ? this.exMem.instruction : null, status: this.exMem.valid ? 'stall' : 'bubble' },
        MEM: { instruction: this.memWb.valid ? this.memWb.instruction : null, status: this.memWb.valid ? this.memWb.status : 'bubble' },
        WB: { instruction: this.memWb.valid ? this.memWb.instruction : null, status: this.memWb.valid ? this.memWb.status : 'bubble' },
      });

      this.history.push(this.takeHistoryEntry());
      if (this.history.length > MAX_HISTORY) this.history.shift();

      return this.takeSnapshot(consoleOutput, syscallResult);
    }

    // ── 4. Memory stage ────────────────────────────────────────────
    const newMemWb: MEMWBLatch = this.exMem.valid ? {
      instruction: this.exMem.instruction,
      pc: this.exMem.pc,
      aluResult: this.exMem.aluResult,
      memData: this.exMem.memRead ? this.readMemByOp(this.exMem.op, this.exMem.aluResult) : 0,
      writeReg: this.exMem.writeReg,
      regWrite: this.exMem.regWrite,
      memToReg: this.exMem.memToReg,
      isSyscall: this.exMem.isSyscall,
      op: this.exMem.op,
      valid: true,
      status: this.exMem.status,
      writesHiLo: this.exMem.writesHiLo,
      hiResult: this.exMem.hiResult,
      loResult: this.exMem.loResult,
    } : bubbleMEMWB();

    if (this.exMem.valid && this.exMem.memWrite) {
      const addr = this.exMem.aluResult;
      this.writeMemByOp(this.exMem.op, addr, this.exMem.writeData);
    }

    // ── 5. Execute stage ───────────────────────────────────────────
    let newExMem: EXMEMLatch;
    let branchTaken = false;
    let branchTarget = 0;

    if (this.idEx.valid) {
      let forwardA: 'ex' | 'mem' | null = null;
      let forwardB: 'ex' | 'mem' | null = null;

      if (this.forwardingEnabled) {
        // EX hazard
        if (this.exMem.valid && this.exMem.regWrite && this.exMem.writeReg !== 0) {
          if (this.exMem.writeReg === this.idEx.rs) forwardA = 'ex';
          if (this.exMem.writeReg === this.idEx.rt) forwardB = 'ex';
        }
        // MEM hazard
        if (this.memWb.valid && this.memWb.regWrite && this.memWb.writeReg !== 0) {
          if (this.memWb.writeReg === this.idEx.rs && forwardA !== 'ex') forwardA = 'mem';
          if (this.memWb.writeReg === this.idEx.rt && forwardB !== 'ex') forwardB = 'mem';
        }
      }

      // Apply forwarding to get actual operand values
      let aVal = this.idEx.rsVal;
      let bVal = this.idEx.rtVal;

      if (this.forwardingEnabled) {
        if (forwardA === 'ex') {
          aVal = this.exMem.aluResult;
          this.stats.forwardCount++;
          this.events.onForward?.('ex', this.idEx.rs, aVal);
        } else if (forwardA === 'mem') {
          aVal = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
          this.stats.forwardCount++;
          this.events.onForward?.('mem', this.idEx.rs, aVal);
        }
        if (forwardB === 'ex') {
          bVal = this.exMem.aluResult;
          this.stats.forwardCount++;
          this.events.onForward?.('ex', this.idEx.rt, bVal);
        } else if (forwardB === 'mem') {
          bVal = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
          this.stats.forwardCount++;
          this.events.onForward?.('mem', this.idEx.rt, bVal);
        }
      }

      const aluInput2 = (this.idEx.isLoad || this.idEx.isStore || this.idEx.op === 'addi' ||
        this.idEx.op === 'addiu' || this.idEx.op === 'andi' || this.idEx.op === 'ori' ||
        this.idEx.op === 'xori' || this.idEx.op === 'slti' || this.idEx.op === 'sltiu' ||
        this.idEx.op === 'lui' || this.idEx.op.startsWith('csr'))
        ? this.idEx.imm
        : bVal;

      let actualHi = this.hi;
      let actualLo = this.lo;
      if (this.forwardingEnabled) {
        if (this.memWb.valid && this.memWb.writesHiLo) {
          actualHi = this.memWb.hiResult;
          actualLo = this.memWb.loResult;
        }
        if (this.exMem.valid && this.exMem.writesHiLo) {
          actualHi = this.exMem.hiResult;
          actualLo = this.exMem.loResult;
        }
      }

      const aluResult = this.executeALU(this.idEx.op, aVal, aluInput2, this.idEx.shamt, actualHi, actualLo);

      // Handle mult/div locally in EX
      let writesHiLo = false;
      let hiResult = 0;
      let loResult = 0;
      if (this.idEx.op === 'mult' || this.idEx.op === 'multu' || this.idEx.op === 'div' || this.idEx.op === 'divu') {
        writesHiLo = true;
        if (this.idEx.op === 'mult') {
          const result = BigInt(aVal) * BigInt(bVal);
          hiResult = Number((result >> 32n) & 0xFFFFFFFFn);
          loResult = Number(result & 0xFFFFFFFFn);
        } else if (this.idEx.op === 'multu') {
          const result = BigInt(aVal >>> 0) * BigInt(bVal >>> 0);
          hiResult = Number((result >> 32n) & 0xFFFFFFFFn);
          loResult = Number(result & 0xFFFFFFFFn);
        } else if (this.idEx.op === 'div') {
          if (bVal !== 0) { loResult = (aVal / bVal) | 0; hiResult = aVal % bVal; }
        } else if (this.idEx.op === 'divu') {
          if (bVal !== 0) { loResult = ((aVal >>> 0) / (bVal >>> 0)) | 0; hiResult = (aVal >>> 0) % (bVal >>> 0); }
        }
      }

      // Branch evaluation
      if (this.idEx.isBranch) {
        this.stats.branchCount++;
        const actuallyTaken = this.evaluateBranch(this.idEx.op, aVal, bVal);
        
        // Record details for visualizer BHT/BTB
        this.branchPredictor.recordBranch(
          this.idEx.pc,
          this.idEx.instruction!.raw,
          actuallyTaken,
          actuallyTaken ? this.idEx.instruction!.targetAddress : this.idEx.fallthroughPC,
          this.cycle,
          this.branchPrediction
        );
        
        if (actuallyTaken !== this.idEx.predictedTaken) {
          this.stats.branchMispredictions++;
          this.stats.flushCount++;
          this.stats.controlStallCycles += 1; // 1 cycle penalty for flush in IF
          branchTaken = true; // Tell Fetch to flush and redirect
          if (actuallyTaken) {
             // Predicted not-taken, but was taken.
             branchTarget = this.idEx.instruction!.targetAddress;
             this.events.onBranchResolved?.(true, branchTarget, this.cycle);
          } else {
             // Predicted taken, but was not taken.
             branchTarget = this.idEx.fallthroughPC;
             this.events.onBranchResolved?.(false, branchTarget, this.cycle);
          }
        } else {
          // Predicted correctly!
          this.events.onBranchResolved?.(actuallyTaken, actuallyTaken ? this.idEx.instruction!.targetAddress : 0, this.cycle);
        }
      }

      // Jump
      if (this.idEx.isJump && !this.idEx.isBranch) {
        branchTaken = true;
        branchTarget = this.idEx.isJumpReg ? aVal : this.idEx.instruction!.targetAddress;
        this.stats.flushCount++;
      }

      // CSR Operations (executed locally in EX)
      if (this.idEx.op.startsWith('csr')) {
        const csrAddr = this.idEx.imm; // CSR address is usually parsed as imm in I-type
        const oldVal = this.csrRegisters.get(csrAddr) ?? 0;
        let newVal = oldVal;
        
        const isImm = this.idEx.op.endsWith('i');
        const writeVal = isImm ? this.idEx.rs : aVal; // For immediate CSR, rs field holds the zimm

        if (this.idEx.op.includes('rw')) newVal = writeVal;
        else if (this.idEx.op.includes('rs') && writeVal !== 0) newVal = oldVal | writeVal;
        else if (this.idEx.op.includes('rc') && writeVal !== 0) newVal = oldVal & ~writeVal;

        this.csrRegisters.set(csrAddr, newVal);
        // aluResult already captures oldVal if executeALU is updated
      }

      let exStatus: InstructionStatus = this.idEx.status;
      if (exStatus === 'bubble') exStatus = 'normal';
      if (forwardA || forwardB) exStatus = 'forward';

      newExMem = {
        instruction: this.idEx.instruction,
        pc: this.idEx.pc,
        aluResult,
        hiResult,
        writeData: bVal,
        writeReg: this.idEx.writeReg,
        regWrite: this.idEx.regWrite,
        memRead: this.idEx.memRead,
        memWrite: this.idEx.memWrite,
        memToReg: this.idEx.memToReg,
        isLoad: this.idEx.isLoad,
        isSyscall: this.idEx.isSyscall,
        op: this.idEx.op,
        valid: true,
        status: exStatus,
        writesHiLo,
        loResult,
        hazardExplanation: (forwardA || forwardB) ? `Forwarding paths used: ${forwardA ? `A (${this.idEx.rsVal} → ${aVal}) from ${forwardA.toUpperCase()}` : ''} ${forwardB ? `B (${this.idEx.rtVal} → ${bVal}) from ${forwardB.toUpperCase()}` : ''}`.trim() : undefined,
      };
    } else {
      newExMem = bubbleEXMEM();
    }

    // ── 6. Decode stage ────────────────────────────────────────────
    let newIdEx: IDEXLatch;
    let idPredictedTaken = false;
    let idBranchTarget = 0;
    if (stallNeeded) {
      // Stall: insert bubble into EX, freeze IF and ID
      newIdEx = bubbleIDEX();
      newIdEx.status = 'stall';
      newIdEx.instruction = this.ifId.instruction;
      newIdEx.hazardExplanation = `Load-use hazard: ${this.ifId.instruction?.raw} needs a register being loaded by ${this.idEx.instruction?.raw}. Inserting 1 stall cycle.`;
      this.stats.stallCycles++;
      this.stats.dataStallCycles++;
      this.events.onStall?.('load-use hazard', this.cycle);
    } else if (branchTaken) {
      // Flush: instruction in ID was fetched speculatively, discard it
      newIdEx = bubbleIDEX();
    } else if (this.ifId.valid) {
      const inst = this.ifId.instruction!;
      newIdEx = {
        instruction: inst,
        pc: this.ifId.pc,
        rsVal: inst.readsRegs.length > 0 ? this.registers[inst.readsRegs[0]] : 0,
        rtVal: inst.readsRegs.length > 1 ? this.registers[inst.readsRegs[1]] : 0,
        imm: inst.imm,
        shamt: inst.shamt,
        rs: inst.readsRegs.length > 0 ? inst.readsRegs[0] : -1,
        rt: inst.readsRegs.length > 1 ? inst.readsRegs[1] : -1,
        writeReg: inst.writesReg,
        regWrite: inst.writesReg >= 0,
        memRead: inst.isLoad,
        memWrite: inst.isStore,
        memToReg: inst.isLoad,
        isBranch: inst.isBranch,
        isJump: inst.isJump,
        isJumpReg: inst.isJumpReg,
        isLoad: inst.isLoad,
        isStore: inst.isStore,
        isSyscall: inst.isSyscall,
        op: inst.op,
        valid: true,
        status: this.getIDStatus(inst, null, null),
        writesHiLo: false,
        hiResult: 0,
        loResult: 0,
        predictedTaken: false,
        fallthroughPC: this.ifId.npc,
      };

      if (inst.isBranch && this.branchPrediction === 'always-taken') {
        newIdEx.predictedTaken = true;
        idPredictedTaken = true;
        idBranchTarget = inst.targetAddress;
      }
    } else {
      newIdEx = bubbleIDEX();
    }

    // ── 7. Fetch stage ─────────────────────────────────────────────
    let newIfId: IFIDLatch;
    if (stallNeeded) {
      // Keep current IF/ID (don't advance PC)
      newIfId = this.ifId;
    } else if (branchTaken) {
      // Flush instruction fetched at wrong PC, fetch from branch target
      this.pc = branchTarget;
      newIfId = this.fetchInstruction();
    } else if (idPredictedTaken) {
      // Predict taken, fetch from target next cycle, discard sequentially fetched instruction
      this.pc = idBranchTarget;
      newIfId = this.fetchInstruction();
    } else {
      newIfId = this.fetchInstruction();
    }

    // ── 8. Update all latches ──────────────────────────────────────
    this.memWb = newMemWb;
    this.exMem = newExMem;
    this.idEx = newIdEx;
    if (!stallNeeded) {
      this.ifId = newIfId;
    }

    // Check if pipeline is drained (all stages empty and no more instructions)
    if (!this.finished) {
      this.finished = this.isPipelineDrained();
    }

    // Record cycle for timing diagram
    this.cycleHistory.push({
      cycle: this.cycle,
      IF: { instruction: this.ifId.valid ? this.ifId.instruction : null, status: this.ifId.valid ? 'normal' : 'bubble' },
      ID: { instruction: this.idEx.valid ? this.idEx.instruction : null, status: this.idEx.valid ? this.idEx.status : 'bubble' },
      EX: { instruction: this.exMem.valid ? this.exMem.instruction : null, status: this.exMem.valid ? this.exMem.status : 'bubble' },
      MEM: { instruction: this.memWb.valid ? this.memWb.instruction : null, status: this.memWb.valid ? this.memWb.status : 'bubble' },
      WB: { instruction: this.memWb.valid ? this.memWb.instruction : null, status: this.memWb.valid ? this.memWb.status : 'bubble' },
    });

    // Save history entry (circular buffer)
    this.history.push(this.takeHistoryEntry());
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    return this.takeSnapshot(consoleOutput, syscallResult);
  }

  /** Run to completion or until maxCycles. Returns final snapshot. */
  runToCompletion(maxCycles?: number): CycleSnapshot {
    const limit = maxCycles ?? this.maxCycles;
    while (!this.finished && this.cycle < limit) {
      this.step();
    }
    return this.takeSnapshot();
  }

  stepBack(): CycleSnapshot | null {
    if (this.history.length <= 1) return null;
    this.history.pop(); // Remove current
    const prev = this.history[this.history.length - 1];
    this.restoreFromHistory(prev);

    // Also remove last cycle record
    if (this.cycleHistory.length > 0) {
      this.cycleHistory.pop();
    }

    return this.takeSnapshot();
  }

  getSnapshot(): CycleSnapshot {
    return this.takeSnapshot();
  }

  getCycle(): number {
    return this.cycle;
  }

  isFinished(): boolean {
    return this.finished;
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  getRegisters(): Int32Array {
    return this.registers;
  }

  getMemory(): Map<number, number> {
    return this.memory;
  }

  // ── Private Methods ────────────────────────────────────────────────

  private fetchInstruction(): IFIDLatch {
    const idx = this.pc / 4;
    if (idx < 0 || idx >= this.instructions.length) {
      return bubbleIFID();
    }
    const inst = this.instructions[idx];
    const result: IFIDLatch = {
      instruction: inst,
      pc: this.pc,
      npc: this.pc + 4,
      valid: true,
    };
    this.pc += 4;
    return result;
  }

  private detectLoadUseHazard(): boolean {
    if (!this.forwardingEnabled) {
      // Without forwarding, any data dependency causes a stall
      if (this.idEx.valid && this.idEx.regWrite && this.idEx.writeReg > 0 && this.ifId.valid) {
        const inst = this.ifId.instruction!;
        for (const r of inst.readsRegs) {
          if (r === this.idEx.writeReg) return true;
        }
      }
      // Also check EX/MEM
      if (this.exMem.valid && this.exMem.regWrite && this.exMem.writeReg > 0 && this.ifId.valid) {
        const inst = this.ifId.instruction!;
        for (const r of inst.readsRegs) {
          if (r === this.exMem.writeReg) return true;
        }
      }
      return false;
    }
    // With forwarding, only load-use causes a stall
    // Load in EX (idEx is load, result not available until MEM)
    if (this.idEx.valid && this.idEx.isLoad && this.idEx.writeReg > 0 && this.ifId.valid) {
      const inst = this.ifId.instruction!;
      for (const r of inst.readsRegs) {
        if (r === this.idEx.writeReg) return true;
      }
    }
    return false;
  }

  private getIDStatus(
    inst: ParsedInstruction,
    fwdA: 'ex' | 'mem' | null,
    fwdB: 'ex' | 'mem' | null,
  ): InstructionStatus {
    if (fwdA || fwdB) return 'forward';
    // Check for raw hazard (dependency exists but not forwarded)
    if (this.idEx.valid && this.idEx.regWrite && this.idEx.writeReg > 0) {
      for (const r of inst.readsRegs) {
        if (r === this.idEx.writeReg) return 'hazard';
      }
    }
    if (this.exMem.valid && this.exMem.regWrite && this.exMem.writeReg > 0) {
      for (const r of inst.readsRegs) {
        if (r === this.exMem.writeReg) return 'hazard';
      }
    }
    return 'normal';
  }

  private executeALU(op: string, a: number, b: number, shamt: number, actualHi: number, actualLo: number): number {
    // All arithmetic is 32-bit signed
    switch (op) {
      case 'add': case 'addi': case 'addiu': case 'addu':
        return (a + b) | 0;
      case 'sub': case 'subu':
        return (a - b) | 0;
      case 'and': case 'andi':
        return a & b;
      case 'or': case 'ori':
        return a | b;
      case 'xor': case 'xori':
        return a ^ b;
      case 'nor':
        return ~(a | b);
      case 'slt': case 'slti':
        return (a < b) ? 1 : 0;
      case 'sltu': case 'sltiu':
        return ((a >>> 0) < (b >>> 0)) ? 1 : 0;
      case 'sll':
        return this.isa === 'riscv' ? (a << (b & 0x1F)) | 0 : (a << shamt) | 0;
      case 'slli':
        return (a << (shamt & 0x1F)) | 0;
      case 'srl':
        return this.isa === 'riscv' ? (a >>> (b & 0x1F)) | 0 : (a >>> shamt) | 0;
      case 'srli':
        return (a >>> (shamt & 0x1F)) | 0;
      case 'sra':
        return this.isa === 'riscv' ? (a >> (b & 0x1F)) | 0 : (a >> shamt) | 0;
      case 'srai':
        return (a >> (shamt & 0x1F)) | 0;
      case 'sllv':
        return (b << (a & 0x1F)) | 0;
      case 'srlv':
        return (b >>> (a & 0x1F)) | 0;
      case 'srav':
        return (b >> (a & 0x1F)) | 0;
      case 'lui':
        return (b << 16) | 0;
      case 'mult':
      case 'multu':
        return 0; // Handled in EX stage
      case 'mfhi':
        return actualHi;
      case 'mflo':
        return actualLo;
      
      // RV32M Extensions
      case 'mul': return Number((BigInt(a) * BigInt(b)) & 0xFFFFFFFFn) | 0;
      case 'mulh': return Number(((BigInt(a) * BigInt(b)) >> 32n) & 0xFFFFFFFFn) | 0;
      case 'mulhsu': return Number(((BigInt(a) * BigInt(b >>> 0)) >> 32n) & 0xFFFFFFFFn) | 0;
      case 'mulhu': return Number(((BigInt(a >>> 0) * BigInt(b >>> 0)) >> 32n) & 0xFFFFFFFFn) | 0;
      case 'div': return b === 0 ? -1 : ((a / b) | 0);
      case 'divu': return b === 0 ? -1 : (((a >>> 0) / (b >>> 0)) | 0);
      case 'rem': return b === 0 ? a : (a % b) | 0;
      case 'remu': return b === 0 ? a : ((a >>> 0) % (b >>> 0)) | 0;

      // CSR Operations
      case 'csrrw': case 'csrrs': case 'csrrc':
      case 'csrrwi': case 'csrrsi': case 'csrrci':
        // Return the old CSR value (shamt is used to pass the CSR value in evaluate, or we just rely on state)
        // Wait, executeALU shouldn't read state directly. We read it here via this.csrRegisters
        // using aluInput2 (imm) as the CSR address.
        return this.csrRegisters.get(b) ?? 0;

      case 'lw': case 'lh': case 'lhu': case 'lb': case 'lbu':
      case 'sw': case 'sh': case 'sb':
        return (a + b) | 0; // Address calculation
      case 'jal': case 'jalr':
        return this.idEx.pc + 4; // Return address (PC + 4 since delay slots are not executed)
      case 'jr':
        return a;
      default:
        return (a + b) | 0;
    }
  }

  private evaluateBranch(op: string, rs: number, rt: number): boolean {
    switch (op) {
      case 'beq': return rs === rt;
      case 'bne': return rs !== rt;
      case 'bgtz': return rs > 0;
      case 'blez': return rs <= 0;
      case 'bgez': return rs >= 0;
      case 'bltz': return rs < 0;
      // RISC-V branches
      case 'blt': return rs < rt;
      case 'bge': return rs >= rt;
      case 'bltu': return (rs >>> 0) < (rt >>> 0);
      case 'bgeu': return (rs >>> 0) >= (rt >>> 0);
      default: return false;
    }
  }

  private readMemWord(address: number): number {
    const aligned = address & ~3;
    const b0 = this.memory.get(aligned) ?? 0;
    const b1 = this.memory.get(aligned + 1) ?? 0;
    const b2 = this.memory.get(aligned + 2) ?? 0;
    const b3 = this.memory.get(aligned + 3) ?? 0;
    return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) | 0;
  }

  private readMemByOp(op: string, address: number): number {
    const word = this.readMemWord(address);
    const byteOffset = address & 3;
    const shift = (3 - byteOffset) * 8; // Big-endian
    
    switch (op) {
      case 'lb': {
        const b = (word >>> shift) & 0xFF;
        return (b << 24) >> 24; // Sign-extend
      }
      case 'lbu': {
        return (word >>> shift) & 0xFF; // Zero-extend
      }
      case 'lh': {
        // Assume halfword is aligned, or handle unaligned by taking 2 bytes
        const alignOffset = address & 2;
        const sh = alignOffset === 0 ? 16 : 0;
        const h = (word >>> sh) & 0xFFFF;
        return (h << 16) >> 16; // Sign-extend
      }
      case 'lhu': {
        const alignOffset = address & 2;
        const sh = alignOffset === 0 ? 16 : 0;
        return (word >>> sh) & 0xFFFF; // Zero-extend
      }
      default:
        return word; // lw
    }
  }

  private writeMemWord(address: number, value: number): void {
    const aligned = address & ~3;
    this.memory.set(aligned, (value >> 24) & 0xFF);
    this.memory.set(aligned + 1, (value >> 16) & 0xFF);
    this.memory.set(aligned + 2, (value >> 8) & 0xFF);
    this.memory.set(aligned + 3, value & 0xFF);
    this.lastModifiedAddresses.push(aligned, aligned + 1, aligned + 2, aligned + 3);
  }

  private writeMemByOp(op: string, address: number, value: number): void {
    switch (op) {
      case 'sw':
        this.writeMemWord(address, value);
        break;
      case 'sh': {
        const aligned = address & ~1;
        this.memory.set(aligned, (value >> 8) & 0xFF);
        this.memory.set(aligned + 1, value & 0xFF);
        this.lastModifiedAddresses.push(aligned, aligned + 1);
        break;
      }
      case 'sb':
        this.memory.set(address, value & 0xFF);
        this.lastModifiedAddresses.push(address);
        break;
      default:
        this.writeMemWord(address, value);
    }
  }

  private isPipelineDrained(): boolean {
    const noMoreFetch = this.pc / 4 >= this.instructions.length;
    return noMoreFetch &&
      !this.ifId.valid &&
      !this.idEx.valid &&
      !this.exMem.valid &&
      !this.memWb.valid;
  }

  private emptyStats(): EngineStats {
    return {
      totalCycles: 0,
      instructionsCompleted: 0,
      stallCycles: 0,
      dataStallCycles: 0,
      controlStallCycles: 0,
      memoryStallCycles: 0,
      forwardCount: 0,
      branchCount: 0,
      branchMispredictions: 0,
      flushCount: 0,
    };
  }

  private takeSnapshot(consoleOutput: string = '', syscallResult: SyscallResult | null = null): CycleSnapshot {
    return {
      cycle: this.cycle,
      pc: this.pc,
      registers: new Int32Array(this.registers),
      memory: new Map(this.memory),
      pipeline: {
        IF: {
          instruction: this.ifId.valid ? this.ifId.instruction : null,
          status: this.ifId.valid ? 'normal' : 'bubble',
        },
        ID: {
          instruction: this.idEx.valid ? this.idEx.instruction : (this.idEx.status === 'stall' ? this.ifId.instruction : null),
          status: this.idEx.valid ? this.idEx.status : (this.idEx.status === 'stall' ? 'stall' : 'bubble'),
          hazardExplanation: this.idEx.hazardExplanation,
        },
        EX: {
          instruction: this.exMem.valid ? this.exMem.instruction : null,
          status: this.exMem.valid ? this.exMem.status : 'bubble',
          hazardExplanation: this.exMem.hazardExplanation,
        },
        MEM: {
          instruction: this.memWb.valid ? this.memWb.instruction : null,
          status: this.memWb.valid ? this.memWb.status : 'bubble',
        },
        WB: {
          instruction: this.memWb.valid ? this.memWb.instruction : null,
          status: this.memWb.valid ? this.memWb.status : 'bubble',
        },
      },
      datapathValues: {
        pc: this.pc,
        rsVal: this.idEx.rsVal,
        rtVal: this.idEx.rtVal,
        imm: this.idEx.imm,
        aluResult: this.exMem.aluResult,
        memData: this.memWb.memData, // from MEM stage
        writeData: this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult,
      },
      stats: { ...this.stats },
      hi: this.hi,
      lo: this.lo,
      finished: this.finished,
      consoleOutput,
      syscallResult,
      modifiedAddresses: [...this.lastModifiedAddresses],
      terminationReason: this.terminationReason,
    };
  }

  private takeHistoryEntry(): HistoryEntry {
    const memoryDelta = new Map<number, number>();
    for (const [k, v] of this.memory) {
      if (this.initialMemory.get(k) !== v) {
        memoryDelta.set(k, v);
      }
    }

    return {
      cycle: this.cycle,
      pc: this.pc,
      registers: new Int32Array(this.registers),
      memoryDelta,
      hi: this.hi,
      lo: this.lo,
      finished: this.finished,
      ifId: { ...this.ifId },
      idEx: { ...this.idEx },
      exMem: { ...this.exMem },
      memWb: { ...this.memWb },
      stats: { ...this.stats },
      terminationReason: this.terminationReason,
    };
  }

  private restoreFromHistory(entry: HistoryEntry): void {
    this.cycle = entry.cycle;
    this.pc = entry.pc;
    this.registers = new Int32Array(entry.registers);
    this.memory = new Map(this.initialMemory);
    for (const [k, v] of entry.memoryDelta) {
      this.memory.set(k, v);
    }
    this.hi = entry.hi;
    this.lo = entry.lo;
    this.finished = entry.finished;
    this.terminationReason = entry.terminationReason;
    this.stats = { ...entry.stats };
    this.ifId = { ...entry.ifId };
    this.idEx = { ...entry.idEx };
    this.exMem = { ...entry.exMem };
    this.memWb = { ...entry.memWb };
  }
}

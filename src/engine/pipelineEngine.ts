/**
 * MIPS 5-Stage Pipeline Simulation Engine
 * Implements: IF → ID → EX → MEM → WB with hazard detection, forwarding, and stalls.
 */

import type { ParsedInstruction } from './mipsParser';

// ── Types ────────────────────────────────────────────────────────────────

export type InstructionStatus = 'normal' | 'hazard' | 'forward' | 'stall' | 'bubble';

export interface StageEntry {
  instruction: ParsedInstruction | null;
  status: InstructionStatus;
  forwardFromA?: 'ex' | 'mem' | null;
  forwardFromB?: 'ex' | 'mem' | null;
}

export interface PipelineSnapshot {
  IF: StageEntry;
  ID: StageEntry;
  EX: StageEntry;
  MEM: StageEntry;
  WB: StageEntry;
}

export interface CycleSnapshot {
  cycle: number;
  pc: number;
  registers: Int32Array;
  memory: Map<number, number>;
  pipeline: PipelineSnapshot;
  stats: EngineStats;
  hi: number;
  lo: number;
  finished: boolean;
}

export interface EngineStats {
  totalCycles: number;
  instructionsCompleted: number;
  stallCycles: number;
  forwardCount: number;
  branchCount: number;
  branchMispredictions: number;
  flushCount: number;
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
  op: string;
  valid: boolean;
  status: InstructionStatus;
  forwardA: 'ex' | 'mem' | null;
  forwardB: 'ex' | 'mem' | null;
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
  op: string;
  valid: boolean;
  status: InstructionStatus;
}

interface MEMWBLatch {
  instruction: ParsedInstruction | null;
  pc: number;
  aluResult: number;
  memData: number;
  writeReg: number;
  regWrite: boolean;
  memToReg: boolean;
  op: string;
  valid: boolean;
  status: InstructionStatus;
}

// ── Bubble Factories ─────────────────────────────────────────────────────

const bubbleIFID = (): IFIDLatch => ({ instruction: null, pc: 0, npc: 0, valid: false });
const bubbleIDEX = (): IDEXLatch => ({
  instruction: null, pc: 0, rsVal: 0, rtVal: 0, imm: 0, shamt: 0,
  rs: -1, rt: -1, writeReg: -1,
  regWrite: false, memRead: false, memWrite: false, memToReg: false,
  isBranch: false, isJump: false, isJumpReg: false, isLoad: false, isStore: false,
  op: '', valid: false, status: 'bubble', forwardA: null, forwardB: null,
});
const bubbleEXMEM = (): EXMEMLatch => ({
  instruction: null, pc: 0, aluResult: 0, writeData: 0, writeReg: -1,
  regWrite: false, memRead: false, memWrite: false, memToReg: false,
  isLoad: false, op: '', valid: false, status: 'bubble',
});
const bubbleMEMWB = (): MEMWBLatch => ({
  instruction: null, pc: 0, aluResult: 0, memData: 0, writeReg: -1,
  regWrite: false, memToReg: false, op: '', valid: false, status: 'bubble',
});

// ── Main Engine ──────────────────────────────────────────────────────────

export class MIPSPipelineEngine {
  private instructions: ParsedInstruction[] = [];
  private registers = new Int32Array(32);
  private memory = new Map<number, number>();
  private pc = 0;
  private hi = 0;
  private lo = 0;
  private cycle = 0;
  private finished = false;

  // Pipeline latches
  private ifId: IFIDLatch = bubbleIFID();
  private idEx: IDEXLatch = bubbleIDEX();
  private exMem: EXMEMLatch = bubbleEXMEM();
  private memWb: MEMWBLatch = bubbleMEMWB();

  // Stats
  private stats: EngineStats = this.emptyStats();

  // Config
  public forwardingEnabled = true;

  // History for backward stepping
  private history: CycleSnapshot[] = [];

  // ── Public API ───────────────────────────────────────────────────────

  loadProgram(instructions: ParsedInstruction[]): void {
    this.instructions = instructions;
    this.reset();
  }

  reset(): void {
    this.registers = new Int32Array(32);
    this.registers[28] = 0x10008000; // $gp
    this.registers[29] = 0x7FFFFFFC; // $sp
    this.memory = new Map();
    this.pc = 0;
    this.hi = 0;
    this.lo = 0;
    this.cycle = 0;
    this.finished = false;
    this.ifId = bubbleIFID();
    this.idEx = bubbleIDEX();
    this.exMem = bubbleEXMEM();
    this.memWb = bubbleMEMWB();
    this.stats = this.emptyStats();
    this.history = [];
    // Save initial snapshot
    this.history.push(this.takeSnapshot());
  }

  step(): CycleSnapshot {
    if (this.finished) return this.takeSnapshot();

    this.cycle++;
    this.stats.totalCycles = this.cycle;

    // ── 1. Detect hazards ──────────────────────────────────────────
    const stallNeeded = this.detectLoadUseHazard();

    // ── 2. Detect forwarding ───────────────────────────────────────
    let forwardA: 'ex' | 'mem' | null = null;
    let forwardB: 'ex' | 'mem' | null = null;
    if (this.forwardingEnabled && this.ifId.valid) {
      const inst = this.ifId.instruction!;
      const readsRs = inst.readsRegs.length > 0 ? inst.readsRegs[0] : -1;
      const readsRt = inst.readsRegs.length > 1 ? inst.readsRegs[1] : -1;

      // EX forwarding (from EX/MEM)
      if (this.exMem.valid && this.exMem.regWrite && this.exMem.writeReg > 0) {
        if (readsRs === this.exMem.writeReg) forwardA = 'ex';
        if (readsRt === this.exMem.writeReg) forwardB = 'ex';
      }
      // MEM forwarding (from MEM/WB) — only if not already forwarded from EX
      if (this.memWb.valid && this.memWb.regWrite && this.memWb.writeReg > 0) {
        if (readsRs === this.memWb.writeReg && forwardA !== 'ex') forwardA = 'mem';
        if (readsRt === this.memWb.writeReg && forwardB !== 'ex') forwardB = 'mem';
      }
    }

    // ── 3. Write-Back stage (first, so register writes happen before ID reads) ──
    if (this.memWb.valid && this.memWb.regWrite && this.memWb.writeReg > 0) {
      const value = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
      this.registers[this.memWb.writeReg] = value;
      this.stats.instructionsCompleted++;
    }

    // ── 4. Memory stage ────────────────────────────────────────────
    const newMemWb: MEMWBLatch = this.exMem.valid ? {
      instruction: this.exMem.instruction,
      pc: this.exMem.pc,
      aluResult: this.exMem.aluResult,
      memData: this.exMem.memRead ? this.readMemWord(this.exMem.aluResult) : 0,
      writeReg: this.exMem.writeReg,
      regWrite: this.exMem.regWrite,
      memToReg: this.exMem.memToReg,
      op: this.exMem.op,
      valid: true,
      status: this.exMem.status,
    } : bubbleMEMWB();

    if (this.exMem.valid && this.exMem.memWrite) {
      this.writeMemWord(this.exMem.aluResult, this.exMem.writeData);
    }

    // ── 5. Execute stage ───────────────────────────────────────────
    let newExMem: EXMEMLatch;
    let branchTaken = false;
    let branchTarget = 0;

    if (this.idEx.valid) {
      // Apply forwarding to get actual operand values
      let aVal = this.idEx.rsVal;
      let bVal = this.idEx.rtVal;

      if (this.forwardingEnabled) {
        if (this.idEx.forwardA === 'ex') {
          aVal = this.exMem.aluResult;
          this.stats.forwardCount++;
        } else if (this.idEx.forwardA === 'mem') {
          aVal = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
          this.stats.forwardCount++;
        }
        if (this.idEx.forwardB === 'ex') {
          bVal = this.exMem.aluResult;
          this.stats.forwardCount++;
        } else if (this.idEx.forwardB === 'mem') {
          bVal = this.memWb.memToReg ? this.memWb.memData : this.memWb.aluResult;
          this.stats.forwardCount++;
        }
      }

      const aluInput2 = (this.idEx.isLoad || this.idEx.isStore || this.idEx.op === 'addi' ||
        this.idEx.op === 'addiu' || this.idEx.op === 'andi' || this.idEx.op === 'ori' ||
        this.idEx.op === 'xori' || this.idEx.op === 'slti' || this.idEx.op === 'sltiu' ||
        this.idEx.op === 'lui')
        ? this.idEx.imm
        : bVal;

      const aluResult = this.executeALU(this.idEx.op, aVal, aluInput2, this.idEx.shamt);

      // Branch evaluation
      if (this.idEx.isBranch) {
        this.stats.branchCount++;
        branchTaken = this.evaluateBranch(this.idEx.op, aVal, bVal);
        if (branchTaken) {
          branchTarget = this.idEx.instruction!.targetAddress;
          this.stats.branchMispredictions++; // We predict not-taken
          this.stats.flushCount++;
        }
      }

      // Jump
      if (this.idEx.isJump && !this.idEx.isBranch) {
        branchTaken = true;
        branchTarget = this.idEx.isJumpReg ? aVal : this.idEx.instruction!.targetAddress;
      }

      let exStatus: InstructionStatus = this.idEx.status;
      if (exStatus === 'bubble') exStatus = 'normal';
      if (this.idEx.forwardA || this.idEx.forwardB) exStatus = 'forward';

      newExMem = {
        instruction: this.idEx.instruction,
        pc: this.idEx.pc,
        aluResult,
        writeData: bVal,
        writeReg: this.idEx.writeReg,
        regWrite: this.idEx.regWrite,
        memRead: this.idEx.memRead,
        memWrite: this.idEx.memWrite,
        memToReg: this.idEx.memToReg,
        isLoad: this.idEx.isLoad,
        op: this.idEx.op,
        valid: true,
        status: exStatus,
      };
    } else {
      newExMem = bubbleEXMEM();
    }

    // ── 6. Decode stage ────────────────────────────────────────────
    let newIdEx: IDEXLatch;
    if (stallNeeded) {
      // Stall: insert bubble into EX, freeze IF and ID
      newIdEx = bubbleIDEX();
      newIdEx.status = 'stall';
      this.stats.stallCycles++;
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
        op: inst.op,
        valid: true,
        status: this.getIDStatus(inst, forwardA, forwardB),
        forwardA,
        forwardB,
      };
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
    this.finished = this.isPipelineDrained();

    // Save snapshot
    const snapshot = this.takeSnapshot();
    this.history.push(snapshot);
    return snapshot;
  }

  stepBack(): CycleSnapshot | null {
    if (this.history.length <= 1) return null;
    this.history.pop(); // Remove current
    const prev = this.history[this.history.length - 1];
    this.restoreSnapshot(prev);
    return prev;
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

  private executeALU(op: string, a: number, b: number, shamt: number): number {
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
        return (b << shamt) | 0;
      case 'srl':
        return (b >>> shamt) | 0;
      case 'sra':
        return (b >> shamt) | 0;
      case 'sllv':
        return (b << (a & 0x1F)) | 0;
      case 'srlv':
        return (b >>> (a & 0x1F)) | 0;
      case 'srav':
        return (b >> (a & 0x1F)) | 0;
      case 'lui':
        return (b << 16) | 0;
      case 'mult': {
        const result = BigInt(a) * BigInt(b);
        this.hi = Number((result >> 32n) & 0xFFFFFFFFn);
        this.lo = Number(result & 0xFFFFFFFFn);
        return 0;
      }
      case 'multu': {
        const result = BigInt(a >>> 0) * BigInt(b >>> 0);
        this.hi = Number((result >> 32n) & 0xFFFFFFFFn);
        this.lo = Number(result & 0xFFFFFFFFn);
        return 0;
      }
      case 'div': {
        if (b !== 0) {
          this.lo = (a / b) | 0;
          this.hi = a % b;
        }
        return 0;
      }
      case 'divu': {
        if (b !== 0) {
          this.lo = ((a >>> 0) / (b >>> 0)) | 0;
          this.hi = (a >>> 0) % (b >>> 0);
        }
        return 0;
      }
      case 'mfhi':
        return this.hi;
      case 'mflo':
        return this.lo;
      case 'lw': case 'lh': case 'lhu': case 'lb': case 'lbu':
      case 'sw': case 'sh': case 'sb':
        return (a + b) | 0; // Address calculation
      case 'jal': case 'jalr':
        return a + 8; // Return address (PC + 8 in pipeline)
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

  private writeMemWord(address: number, value: number): void {
    const aligned = address & ~3;
    this.memory.set(aligned, (value >> 24) & 0xFF);
    this.memory.set(aligned + 1, (value >> 16) & 0xFF);
    this.memory.set(aligned + 2, (value >> 8) & 0xFF);
    this.memory.set(aligned + 3, value & 0xFF);
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
      forwardCount: 0,
      branchCount: 0,
      branchMispredictions: 0,
      flushCount: 0,
    };
  }

  private takeSnapshot(): CycleSnapshot {
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
          instruction: this.idEx.valid ? this.idEx.instruction : null,
          status: this.idEx.valid ? this.idEx.status : 'bubble',
          forwardFromA: this.idEx.forwardA,
          forwardFromB: this.idEx.forwardB,
        },
        EX: {
          instruction: this.exMem.valid ? this.exMem.instruction : null,
          status: this.exMem.valid ? this.exMem.status : 'bubble',
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
      stats: { ...this.stats },
      hi: this.hi,
      lo: this.lo,
      finished: this.finished,
    };
  }

  private restoreSnapshot(snap: CycleSnapshot): void {
    this.cycle = snap.cycle;
    this.pc = snap.pc;
    this.registers = new Int32Array(snap.registers);
    this.memory = new Map(snap.memory);
    this.hi = snap.hi;
    this.lo = snap.lo;
    this.finished = snap.finished;
    this.stats = { ...snap.stats };
    // Reconstruct latches from snapshot pipeline state
    // This is approximate — for backward stepping the history array is the source of truth
    this.ifId = snap.pipeline.IF.instruction
      ? { instruction: snap.pipeline.IF.instruction, pc: snap.pipeline.IF.instruction.address, npc: snap.pipeline.IF.instruction.address + 4, valid: true }
      : bubbleIFID();
    this.idEx = snap.pipeline.ID.instruction
      ? this.reconstructIDEX(snap.pipeline.ID)
      : bubbleIDEX();
    this.exMem = snap.pipeline.EX.instruction
      ? this.reconstructEXMEM(snap.pipeline.EX)
      : bubbleEXMEM();
    this.memWb = snap.pipeline.MEM.instruction
      ? this.reconstructMEMWB(snap.pipeline.MEM)
      : bubbleMEMWB();
  }

  private reconstructIDEX(entry: StageEntry): IDEXLatch {
    const inst = entry.instruction!;
    return {
      instruction: inst, pc: inst.address,
      rsVal: 0, rtVal: 0, imm: inst.imm, shamt: inst.shamt,
      rs: inst.readsRegs[0] ?? -1, rt: inst.readsRegs[1] ?? -1,
      writeReg: inst.writesReg,
      regWrite: inst.writesReg >= 0, memRead: inst.isLoad, memWrite: inst.isStore,
      memToReg: inst.isLoad, isBranch: inst.isBranch, isJump: inst.isJump,
      isJumpReg: inst.isJumpReg, isLoad: inst.isLoad, isStore: inst.isStore,
      op: inst.op, valid: true, status: entry.status,
      forwardA: entry.forwardFromA ?? null, forwardB: entry.forwardFromB ?? null,
    };
  }

  private reconstructEXMEM(entry: StageEntry): EXMEMLatch {
    const inst = entry.instruction!;
    return {
      instruction: inst, pc: inst.address, aluResult: 0, writeData: 0,
      writeReg: inst.writesReg, regWrite: inst.writesReg >= 0,
      memRead: inst.isLoad, memWrite: inst.isStore, memToReg: inst.isLoad,
      isLoad: inst.isLoad, op: inst.op, valid: true, status: entry.status,
    };
  }

  private reconstructMEMWB(entry: StageEntry): MEMWBLatch {
    const inst = entry.instruction!;
    return {
      instruction: inst, pc: inst.address, aluResult: 0, memData: 0,
      writeReg: inst.writesReg, regWrite: inst.writesReg >= 0,
      memToReg: inst.isLoad, op: inst.op, valid: true, status: entry.status,
    };
  }
}

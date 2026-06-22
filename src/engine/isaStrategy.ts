// ── ISA Strategy Pattern ─────────────────────────────────────────────────
// Abstraction layer allowing the pipeline engine to work with multiple ISAs.
// Each ISA provides its own ALU execution, branch evaluation, and register conventions.

export interface ISAStrategy {
  /** ISA identifier */
  name: 'mips' | 'riscv';

  /** Execute an ALU operation. Returns the result value. */
  executeALU(op: string, a: number, b: number, shamt: number, hi: number, lo: number): number;

  /** Evaluate a branch condition. Returns true if branch is taken. */
  evaluateBranch(op: string, rs: number, rt: number): boolean;

  /** Compute HI/LO results for multiply/divide (MIPS-specific, RISC-V returns null). */
  computeHiLo(op: string, a: number, b: number): { hi: number; lo: number } | null;

  /** Get initial register state (e.g., $gp, $sp defaults) */
  getInitialRegisters(): Int32Array;

  /** Human-readable register names */
  registerNames: string[];

  /** Check if an op is an immediate-type instruction (uses imm instead of rtVal for ALU input 2) */
  isImmediateALU(op: string): boolean;

  /** Return address register index (31 for MIPS $ra, 1 for RISC-V x1/ra) */
  returnAddressReg: number;

  /** Compute return address value for JAL-type instructions */
  computeReturnAddress(pc: number): number;
}

// ── MIPS Strategy ────────────────────────────────────────────────────────

export const MIPSStrategy: ISAStrategy = {
  name: 'mips',
  returnAddressReg: 31,

  registerNames: [
    '$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3',
    '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
    '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra',
  ],

  getInitialRegisters(): Int32Array {
    const regs = new Int32Array(32);
    regs[28] = 0x10008000; // $gp
    regs[29] = 0x7FFFFFFC; // $sp
    return regs;
  },

  computeReturnAddress(pc: number): number {
    return pc + 4; // PC + 4 since delay slots are not executed
  },

  isImmediateALU(op: string): boolean {
    return ['addi', 'addiu', 'andi', 'ori', 'xori', 'slti', 'sltiu', 'lui'].includes(op);
  },

  executeALU(op: string, a: number, b: number, shamt: number, actualHi: number, actualLo: number): number {
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
        return (a << shamt) | 0;
      case 'srl':
        return (a >>> shamt) | 0;
      case 'sra':
        return (a >> shamt) | 0;
      case 'sllv':
        return (b << (a & 0x1F)) | 0;
      case 'srlv':
        return (b >>> (a & 0x1F)) | 0;
      case 'srav':
        return (b >> (a & 0x1F)) | 0;
      case 'lui':
        return (b << 16) | 0;
      case 'mult': case 'multu': case 'div': case 'divu':
        return 0;
      case 'mfhi':
        return actualHi;
      case 'mflo':
        return actualLo;
      case 'lw': case 'lh': case 'lhu': case 'lb': case 'lbu':
      case 'sw': case 'sh': case 'sb':
        return (a + b) | 0;
      case 'jal': case 'jalr':
        return 0; // handled by computeReturnAddress
      case 'jr':
        return a;
      default:
        return (a + b) | 0;
    }
  },

  evaluateBranch(op: string, rs: number, rt: number): boolean {
    switch (op) {
      case 'beq': return rs === rt;
      case 'bne': return rs !== rt;
      case 'bgtz': return rs > 0;
      case 'blez': return rs <= 0;
      case 'bgez': return rs >= 0;
      case 'bltz': return rs < 0;
      default: return false;
    }
  },

  computeHiLo(op: string, a: number, b: number): { hi: number; lo: number } | null {
    switch (op) {
      case 'mult': {
        const result = BigInt(a) * BigInt(b);
        return {
          hi: Number((result >> 32n) & 0xFFFFFFFFn),
          lo: Number(result & 0xFFFFFFFFn),
        };
      }
      case 'multu': {
        const result = BigInt(a >>> 0) * BigInt(b >>> 0);
        return {
          hi: Number((result >> 32n) & 0xFFFFFFFFn),
          lo: Number(result & 0xFFFFFFFFn),
        };
      }
      case 'div':
        if (b !== 0) return { lo: (a / b) | 0, hi: a % b };
        return { lo: 0, hi: 0 };
      case 'divu':
        if (b !== 0) return { lo: ((a >>> 0) / (b >>> 0)) | 0, hi: (a >>> 0) % (b >>> 0) };
        return { lo: 0, hi: 0 };
      default:
        return null;
    }
  },
};

// ── RISC-V RV32I Strategy ────────────────────────────────────────────────

export const RV32IStrategy: ISAStrategy = {
  name: 'riscv',
  returnAddressReg: 1, // x1 = ra

  registerNames: [
    'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
    's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
    'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
    's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6',
  ],

  getInitialRegisters(): Int32Array {
    const regs = new Int32Array(32);
    regs[2] = 0x7FFFFFFC; // sp
    regs[3] = 0x10008000; // gp
    return regs;
  },

  computeReturnAddress(pc: number): number {
    return pc + 4; // RISC-V: PC + 4 (no delay slot)
  },

  isImmediateALU(op: string): boolean {
    return ['addi', 'andi', 'ori', 'xori', 'slti', 'sltiu', 'slli', 'srli', 'srai', 'lui', 'auipc'].includes(op);
  },

  executeALU(op: string, a: number, b: number, shamt: number, _hi: number, _lo: number): number {
    switch (op) {
      case 'add': case 'addi':
        return (a + b) | 0;
      case 'sub':
        return (a - b) | 0;
      case 'and': case 'andi':
        return a & b;
      case 'or': case 'ori':
        return a | b;
      case 'xor': case 'xori':
        return a ^ b;
      case 'slt': case 'slti':
        return (a < b) ? 1 : 0;
      case 'sltu': case 'sltiu':
        return ((a >>> 0) < (b >>> 0)) ? 1 : 0;
      case 'sll': case 'slli':
        return (a << (shamt & 0x1F)) | 0;
      case 'srl': case 'srli':
        return (a >>> (shamt & 0x1F)) | 0;
      case 'sra': case 'srai':
        return (a >> (shamt & 0x1F)) | 0;
      case 'lui':
        return b; // Parser already shifts the immediate for RISC-V LUI
      case 'auipc':
        return b; // Parser computes PC + (imm << 12)
      // Loads/stores: address calc
      case 'lb': case 'lh': case 'lw': case 'lbu': case 'lhu':
      case 'sb': case 'sh': case 'sw':
        return (a + b) | 0;
      case 'jal': case 'jalr':
        return 0; // handled by computeReturnAddress
      default:
        return (a + b) | 0;
    }
  },

  evaluateBranch(op: string, rs: number, rt: number): boolean {
    switch (op) {
      case 'beq': return rs === rt;
      case 'bne': return rs !== rt;
      case 'blt': return rs < rt;
      case 'bge': return rs >= rt;
      case 'bltu': return (rs >>> 0) < (rt >>> 0);
      case 'bgeu': return (rs >>> 0) >= (rt >>> 0);
      default: return false;
    }
  },

  computeHiLo(_op: string, _a: number, _b: number): { hi: number; lo: number } | null {
    return null; // RISC-V base ISA has no HI/LO registers
  },
};

import type { ParsedInstruction } from './mipsParser';
import { ISA_DATA } from './isaData';

export interface EncodedField {
  name: string;
  value: number;
  bits: number;
  binary: string;
}

export interface EncodedInstruction {
  binary: string;
  hex: string;
  fields: EncodedField[];
  format: 'R-type' | 'I-type' | 'J-type' | 'S-type' | 'B-type' | 'U-type' | 'Unknown';
}

function toBin(val: number, bits: number): string {
  if (val < 0) {
    // Two's complement for negative numbers
    val = (1 << bits) + val;
  }
  return val.toString(2).padStart(bits, '0').slice(-bits);
}

function toHex(binary: string): string {
  // Use BigInt to prevent 32-bit signed overflow issues
  const dec = BigInt('0b' + binary);
  return '0x' + dec.toString(16).padStart(8, '0').toUpperCase();
}

/** Encode MIPS Instruction */
function encodeMIPS(inst: ParsedInstruction): EncodedInstruction {
  const def = ISA_DATA.find(d => d.name === inst.op);
  if (!def || !def.encoding) {
    return {
      binary: '0'.repeat(32),
      hex: '0x00000000',
      fields: [{ name: 'unknown', value: 0, bits: 32, binary: '0'.repeat(32) }],
      format: 'Unknown'
    };
  }

  const parts = def.encoding.split(' ');
  let binary = '';
  const fields: EncodedField[] = [];

  for (const part of parts) {
    let bits = 0;
    let val = 0;

    if (/^[01]+$/.test(part)) {
      bits = part.length;
      val = parseInt(part, 2);
      const binStr = part;
      binary += binStr;
      
      let name = 'opcode';
      if (bits === 6 && fields.length > 0) name = 'funct';
      else if (bits === 5 && val === 0) name = 'zero';
      
      fields.push({ name, value: val, bits, binary: binStr });
    } else if (part === 'rs') {
      bits = 5;
      val = Math.max(0, inst.rs);
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'rs', value: val, bits, binary: binStr });
    } else if (part === 'rt') {
      bits = 5;
      val = Math.max(0, inst.rt);
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'rt', value: val, bits, binary: binStr });
    } else if (part === 'rd') {
      bits = 5;
      val = Math.max(0, inst.rd);
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'rd', value: val, bits, binary: binStr });
    } else if (part === 'shamt') {
      bits = 5;
      val = Math.max(0, inst.shamt);
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'shamt', value: val, bits, binary: binStr });
    } else if (part === 'immediate' || part === 'offset') {
      bits = 16;
      val = inst.imm;
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'imm', value: val, bits, binary: binStr });
    } else if (part === 'target') {
      bits = 26;
      val = (inst.targetAddress >>> 2) & 0x03FFFFFF;
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'target', value: val, bits, binary: binStr });
    }
  }

  if (binary.length !== 32) {
    binary = binary.padEnd(32, '0').slice(0, 32);
  }

  let format: 'R-type' | 'I-type' | 'J-type' | 'Unknown' = 'Unknown';
  if (def.format === 'R-type') format = 'R-type';
  else if (def.format === 'I-type') format = 'I-type';
  else if (def.format === 'J-type') format = 'J-type';

  return {
    binary,
    hex: toHex(binary),
    fields,
    format
  };
}

/** Encode RISC-V RV32I Instruction */
function encodeRISCV(inst: ParsedInstruction): EncodedInstruction {
  const op = inst.op.toLowerCase();
  let binary = '';
  let format: EncodedInstruction['format'] = 'Unknown';
  const fields: EncodedField[] = [];

  const rd = Math.max(0, inst.rd >= 0 ? inst.rd : inst.writesReg >= 0 ? inst.writesReg : 0);
  const rs1 = Math.max(0, inst.rs >= 0 ? inst.rs : inst.readsRegs[0] ?? 0);
  const rs2 = Math.max(0, inst.rt >= 0 ? inst.rt : inst.readsRegs[1] ?? 0);
  const imm = inst.imm;

  // Helper bit builders
  const addField = (name: string, val: number, bits: number) => {
    const binStr = toBin(val, bits);
    binary += binStr;
    fields.push({ name, value: val, bits, binary: binStr });
  };

  // 1. R-type instructions (opcode 0x33 = 0110011)
  const rTypeOps: Record<string, { funct3: number; funct7: number }> = {
    'add':  { funct3: 0b000, funct7: 0b0000000 },
    'sub':  { funct3: 0b000, funct7: 0b0100000 },
    'sll':  { funct3: 0b001, funct7: 0b0000000 },
    'slt':  { funct3: 0b010, funct7: 0b0000000 },
    'sltu': { funct3: 0b011, funct7: 0b0000000 },
    'xor':  { funct3: 0b100, funct7: 0b0000000 },
    'srl':  { funct3: 0b101, funct7: 0b0000000 },
    'sra':  { funct3: 0b101, funct7: 0b0100000 },
    'or':   { funct3: 0b110, funct7: 0b0000000 },
    'and':  { funct3: 0b111, funct7: 0b0000000 },
  };

  // 2. I-type ALU instructions (opcode 0x13 = 0010011)
  const iTypeOps: Record<string, number> = {
    'addi': 0b000, 'slli': 0b001, 'slti': 0b010, 'sltiu': 0b011,
    'xori': 0b100, 'srli': 0b101, 'srai': 0b101, 'ori': 0b110, 'andi': 0b111
  };

  // 3. Load instructions (opcode 0x03 = 0000011)
  const loadOps: Record<string, number> = {
    'lb': 0b000, 'lh': 0b001, 'lw': 0b010, 'lbu': 0b100, 'lhu': 0b101
  };

  // 4. Store instructions (opcode 0x23 = 0100011)
  const storeOps: Record<string, number> = {
    'sb': 0b000, 'sh': 0b001, 'sw': 0b010
  };

  // 5. Branch instructions (opcode 0x63 = 1100011)
  const branchOps: Record<string, number> = {
    'beq': 0b000, 'bne': 0b001, 'blt': 0b100, 'bge': 0b101, 'bltu': 0b110, 'bgeu': 0b111
  };

  if (rTypeOps[op] !== undefined) {
    format = 'R-type';
    const { funct3, funct7 } = rTypeOps[op];
    addField('funct7', funct7, 7);
    addField('rs2', rs2, 5);
    addField('rs1', rs1, 5);
    addField('funct3', funct3, 3);
    addField('rd', rd, 5);
    addField('opcode', 0b0110011, 7);
  } else if (iTypeOps[op] !== undefined) {
    format = 'I-type';
    const funct3 = iTypeOps[op];
    let immVal = imm;
    if (op === 'srai') immVal = (0b0100000 << 5) | (inst.shamt & 0x1F);
    else if (op === 'slli' || op === 'srli') immVal = inst.shamt & 0x1F;
    
    addField('imm[11:0]', immVal, 12);
    addField('rs1', rs1, 5);
    addField('funct3', funct3, 3);
    addField('rd', rd, 5);
    addField('opcode', 0b0010011, 7);
  } else if (loadOps[op] !== undefined) {
    format = 'I-type';
    const funct3 = loadOps[op];
    addField('offset[11:0]', imm, 12);
    addField('rs1', rs1, 5);
    addField('funct3', funct3, 3);
    addField('rd', rd, 5);
    addField('opcode', 0b0000011, 7);
  } else if (storeOps[op] !== undefined) {
    format = 'S-type';
    const funct3 = storeOps[op];
    const immBin = toBin(imm, 12);
    const imm11_5 = parseInt(immBin.slice(0, 7), 2);
    const imm4_0 = parseInt(immBin.slice(7, 12), 2);

    addField('imm[11:5]', imm11_5, 7);
    addField('rs2', rs2, 5);
    addField('rs1', rs1, 5);
    addField('funct3', funct3, 3);
    addField('imm[4:0]', imm4_0, 5);
    addField('opcode', 0b0100011, 7);
  } else if (branchOps[op] !== undefined) {
    format = 'B-type';
    const funct3 = branchOps[op];
    const offset = inst.targetAddress ? (inst.targetAddress - inst.pc) : imm;
    const immBin = toBin(offset >> 1, 12); // B-type omits bit 0

    const imm12 = parseInt(immBin.slice(0, 1), 2);
    const imm10_5 = parseInt(immBin.slice(2, 8), 2);
    const imm4_1 = parseInt(immBin.slice(8, 12), 2);
    const imm11 = parseInt(immBin.slice(1, 2), 2);

    const high7 = (imm12 << 6) | imm10_5;
    const low5 = (imm4_1 << 1) | imm11;

    addField('imm[12|10:5]', high7, 7);
    addField('rs2', rs2, 5);
    addField('rs1', rs1, 5);
    addField('funct3', funct3, 3);
    addField('imm[4:1|11]', low5, 5);
    addField('opcode', 0b1100011, 7);
  } else if (op === 'lui') {
    format = 'U-type';
    addField('imm[31:12]', imm >>> 12, 20);
    addField('rd', rd, 5);
    addField('opcode', 0b0110111, 7);
  } else if (op === 'auipc') {
    format = 'U-type';
    addField('imm[31:12]', imm >>> 12, 20);
    addField('rd', rd, 5);
    addField('opcode', 0b0010111, 7);
  } else if (op === 'jal') {
    format = 'J-type';
    const offset = inst.targetAddress ? (inst.targetAddress - inst.pc) : imm;
    const immBin = toBin(offset >> 1, 20); // J-type omits bit 0

    const imm20 = parseInt(immBin.slice(0, 1), 2);
    const imm10_1 = parseInt(immBin.slice(10, 20), 2);
    const imm11 = parseInt(immBin.slice(9, 10), 2);
    const imm19_12 = parseInt(immBin.slice(1, 9), 2);

    const immCombined = (imm20 << 19) | (imm10_1 << 9) | (imm11 << 8) | imm19_12;

    addField('imm[20|10:1|11|19:12]', immCombined, 20);
    addField('rd', rd, 5);
    addField('opcode', 0b1101111, 7);
  } else if (op === 'jalr') {
    format = 'I-type';
    addField('imm[11:0]', imm, 12);
    addField('rs1', rs1, 5);
    addField('funct3', 0b000, 3);
    addField('rd', rd, 5);
    addField('opcode', 0b1100111, 7);
  } else if (op === 'ecall') {
    format = 'I-type';
    addField('funct12', 0, 12);
    addField('rs1', 0, 5);
    addField('funct3', 0, 3);
    addField('rd', 0, 5);
    addField('opcode', 0b1110011, 7);
  } else {
    // Fallback/pseudo-ops encode to NOP/0x00000013 (addi x0, x0, 0)
    format = 'I-type';
    addField('imm', 0, 12);
    addField('rs1', 0, 5);
    addField('funct3', 0, 3);
    addField('rd', 0, 5);
    addField('opcode', 0b0010011, 7);
  }

  if (binary.length !== 32) {
    binary = binary.padEnd(32, '0').slice(0, 32);
  }

  return {
    binary,
    hex: toHex(binary),
    fields,
    format
  };
}

/** Encode instruction for specified ISA ('mips' | 'riscv') */
export function encodeInstruction(inst: ParsedInstruction, isa: 'mips' | 'riscv' = 'mips'): EncodedInstruction {
  if (isa === 'riscv') {
    return encodeRISCV(inst);
  }
  return encodeMIPS(inst);
}

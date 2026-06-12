/**
 * MIPS Instruction Encoder — Feature #2
 * Converts parsed MIPS instructions into their 32-bit machine code encoding.
 * Shows binary, hex, and field breakdown for educational purposes.
 */

import type { ParsedInstruction } from './mipsParser';
import { REG_NAMES } from './mipsParser';

// ── Opcode and Function Code Tables ──────────────────────────────────────

const OPCODES: Record<string, number> = {
  // R-type instructions all have opcode 0x00
  'add': 0x00, 'addu': 0x00, 'sub': 0x00, 'subu': 0x00,
  'and': 0x00, 'or': 0x00, 'xor': 0x00, 'nor': 0x00,
  'slt': 0x00, 'sltu': 0x00,
  'sll': 0x00, 'srl': 0x00, 'sra': 0x00,
  'sllv': 0x00, 'srlv': 0x00, 'srav': 0x00,
  'mult': 0x00, 'multu': 0x00, 'div': 0x00, 'divu': 0x00,
  'mfhi': 0x00, 'mflo': 0x00,
  'jr': 0x00, 'jalr': 0x00,
  'syscall': 0x00,
  // I-type
  'addi': 0x08, 'addiu': 0x09,
  'andi': 0x0C, 'ori': 0x0D, 'xori': 0x0E,
  'slti': 0x0A, 'sltiu': 0x0B,
  'lui': 0x0F,
  'lw': 0x23, 'lh': 0x21, 'lhu': 0x25, 'lb': 0x20, 'lbu': 0x24,
  'sw': 0x2B, 'sh': 0x29, 'sb': 0x28,
  'beq': 0x04, 'bne': 0x05,
  'blez': 0x06, 'bgtz': 0x07,
  'bltz': 0x01, 'bgez': 0x01,
  // J-type
  'j': 0x02, 'jal': 0x03,
};

const FUNC_CODES: Record<string, number> = {
  'add': 0x20, 'addu': 0x21, 'sub': 0x22, 'subu': 0x23,
  'and': 0x24, 'or': 0x25, 'xor': 0x26, 'nor': 0x27,
  'slt': 0x2A, 'sltu': 0x2B,
  'sll': 0x00, 'srl': 0x02, 'sra': 0x03,
  'sllv': 0x04, 'srlv': 0x06, 'srav': 0x07,
  'mult': 0x18, 'multu': 0x19, 'div': 0x1A, 'divu': 0x1B,
  'mfhi': 0x10, 'mflo': 0x12,
  'jr': 0x08, 'jalr': 0x09,
  'syscall': 0x0C,
};

// ── Types ────────────────────────────────────────────────────────────────

export type InstructionFormat = 'R' | 'I' | 'J' | 'pseudo' | 'unknown';

export interface EncodedInstruction {
  binary: string;          // 32-char binary string
  hex: string;             // 8-char hex string with 0x prefix
  format: InstructionFormat;
  fields: EncodingField[];
  machineWord: number;
}

export interface EncodingField {
  name: string;
  bits: string;
  value: number;
  width: number;
  description: string;
}

// ── Encoder ──────────────────────────────────────────────────────────────

function getFormat(op: string): InstructionFormat {
  if (op === 'j' || op === 'jal') return 'J';
  if (op === 'nop' || op === 'la' || op === 'li' || op === 'move' ||
      op === 'blt' || op === 'bge' || op === 'bgt' || op === 'ble') return 'pseudo';
  if (OPCODES[op] === 0x00) return 'R';
  if (OPCODES[op] !== undefined) return 'I';
  return 'unknown';
}

function toBin(val: number, width: number): string {
  return (val >>> 0).toString(2).padStart(width, '0').slice(-width);
}

function toHex(val: number): string {
  return '0x' + (val >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export function encodeInstruction(inst: ParsedInstruction): EncodedInstruction {
  const format = getFormat(inst.op);
  let machineWord = 0;
  const fields: EncodingField[] = [];

  const opcode = OPCODES[inst.op] ?? 0;

  if (format === 'R') {
    const funct = FUNC_CODES[inst.op] ?? 0;
    const rs = inst.rs >= 0 ? inst.rs : 0;
    const rt = inst.rt >= 0 ? inst.rt : 0;
    const rd = inst.rd >= 0 ? inst.rd : 0;
    const shamt = inst.shamt ?? 0;

    machineWord = ((opcode & 0x3F) << 26) | ((rs & 0x1F) << 21) | ((rt & 0x1F) << 16) |
                  ((rd & 0x1F) << 11) | ((shamt & 0x1F) << 6) | (funct & 0x3F);

    fields.push(
      { name: 'opcode', bits: toBin(opcode, 6), value: opcode, width: 6, description: `Opcode (${inst.op === 'syscall' ? 'special' : 'R-type'})` },
      { name: 'rs', bits: toBin(rs, 5), value: rs, width: 5, description: `Source: ${REG_NAMES[rs] || `$${rs}`}` },
      { name: 'rt', bits: toBin(rt, 5), value: rt, width: 5, description: `Target: ${REG_NAMES[rt] || `$${rt}`}` },
      { name: 'rd', bits: toBin(rd, 5), value: rd, width: 5, description: `Destination: ${REG_NAMES[rd] || `$${rd}`}` },
      { name: 'shamt', bits: toBin(shamt, 5), value: shamt, width: 5, description: `Shift amount: ${shamt}` },
      { name: 'funct', bits: toBin(funct, 6), value: funct, width: 6, description: `Function: 0x${funct.toString(16)} (${inst.op})` },
    );
  } else if (format === 'I') {
    const rs = inst.rs >= 0 ? inst.rs : 0;
    const rt = inst.rt >= 0 ? inst.rt : (inst.rd >= 0 ? inst.rd : 0);
    const imm = inst.imm & 0xFFFF;

    machineWord = ((opcode & 0x3F) << 26) | ((rs & 0x1F) << 21) | ((rt & 0x1F) << 16) | (imm & 0xFFFF);

    fields.push(
      { name: 'opcode', bits: toBin(opcode, 6), value: opcode, width: 6, description: `Opcode: 0x${opcode.toString(16)} (${inst.op})` },
      { name: 'rs', bits: toBin(rs, 5), value: rs, width: 5, description: `Source: ${REG_NAMES[rs] || `$${rs}`}` },
      { name: 'rt', bits: toBin(rt, 5), value: rt, width: 5, description: `Target: ${REG_NAMES[rt] || `$${rt}`}` },
      { name: 'immediate', bits: toBin(imm, 16), value: inst.imm, width: 16, description: `Immediate: ${inst.imm} (0x${(imm).toString(16)})` },
    );
  } else if (format === 'J') {
    const target = (inst.targetAddress >>> 2) & 0x03FFFFFF;
    machineWord = ((opcode & 0x3F) << 26) | (target & 0x03FFFFFF);

    fields.push(
      { name: 'opcode', bits: toBin(opcode, 6), value: opcode, width: 6, description: `Opcode: 0x${opcode.toString(16)} (${inst.op})` },
      { name: 'address', bits: toBin(target, 26), value: target, width: 26, description: `Target: 0x${(target << 2).toString(16)}` },
    );
  } else {
    // Pseudo instructions — show as expanded
    fields.push(
      { name: 'pseudo', bits: ''.padStart(32, '?'), value: 0, width: 32, description: `Pseudo-instruction: ${inst.op} (expanded by assembler)` },
    );
  }

  return {
    binary: toBin(machineWord, 32),
    hex: toHex(machineWord),
    format,
    fields,
    machineWord,
  };
}

/** Encode all instructions and return a map keyed by address */
export function encodeAllInstructions(instructions: ParsedInstruction[]): Map<number, EncodedInstruction> {
  const map = new Map<number, EncodedInstruction>();
  for (const inst of instructions) {
    map.set(inst.address, encodeInstruction(inst));
  }
  return map;
}

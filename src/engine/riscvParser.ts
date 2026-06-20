/**
 * RISC-V RV32I Assembly Parser & Assembler
 * Parses RISC-V assembly text into structured instructions for pipeline simulation.
 * Supports .data/.text sections, pseudo-instructions, and label resolution.
 * Produces the same ParsedInstruction interface as the MIPS parser for engine compatibility.
 */

import type { ParsedInstruction, ParseError, ParseResult, AssembleOptions } from './mipsParser';

// Re-export types used by consumers
export type { ParsedInstruction, ParseError, ParseResult };

// ── Constants ────────────────────────────────────────────────────────────

const DATA_BASE = 0x10010000;

// ── Register Mapping ─────────────────────────────────────────────────────

const REG: Record<string, number> = {
  'zero': 0, 'x0': 0,
  'ra': 1, 'x1': 1,
  'sp': 2, 'x2': 2,
  'gp': 3, 'x3': 3,
  'tp': 4, 'x4': 4,
  't0': 5, 'x5': 5,
  't1': 6, 'x6': 6,
  't2': 7, 'x7': 7,
  's0': 8, 'fp': 8, 'x8': 8,
  's1': 9, 'x9': 9,
  'a0': 10, 'x10': 10,
  'a1': 11, 'x11': 11,
  'a2': 12, 'x12': 12,
  'a3': 13, 'x13': 13,
  'a4': 14, 'x14': 14,
  'a5': 15, 'x15': 15,
  'a6': 16, 'x16': 16,
  'a7': 17, 'x17': 17,
  's2': 18, 'x18': 18,
  's3': 19, 'x19': 19,
  's4': 20, 'x20': 20,
  's5': 21, 'x21': 21,
  's6': 22, 'x22': 22,
  's7': 23, 'x23': 23,
  's8': 24, 'x24': 24,
  's9': 25, 'x25': 25,
  's10': 26, 'x26': 26,
  's11': 27, 'x27': 27,
  't3': 28, 'x28': 28,
  't4': 29, 'x29': 29,
  't5': 30, 'x30': 30,
  't6': 31, 'x31': 31,
};

export const RV_REG_NAMES = [
  'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
  's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
  'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
  's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6',
];

// ── Instruction Format Definitions ───────────────────────────────────────

type RVFormat = 'R' | 'I' | 'S' | 'B' | 'U' | 'J' | 'LOAD' | 'STORE' | 'BRANCH' | 'ECALL' | 'NOP'
  | 'I_SHIFT';

interface RVInstructionDef {
  format: RVFormat;
  writesRd?: boolean;
  isLoad?: boolean;
  isStore?: boolean;
  isBranch?: boolean;
  isJump?: boolean;
  isJumpReg?: boolean;
  isSyscall?: boolean;
}

const RV_INSTRUCTIONS: Record<string, RVInstructionDef> = {
  // R-type: op rd, rs1, rs2
  'add':   { format: 'R', writesRd: true },
  'sub':   { format: 'R', writesRd: true },
  'and':   { format: 'R', writesRd: true },
  'or':    { format: 'R', writesRd: true },
  'xor':   { format: 'R', writesRd: true },
  'sll':   { format: 'R', writesRd: true },
  'srl':   { format: 'R', writesRd: true },
  'sra':   { format: 'R', writesRd: true },
  'slt':   { format: 'R', writesRd: true },
  'sltu':  { format: 'R', writesRd: true },

  // I-type arithmetic: op rd, rs1, imm
  'addi':  { format: 'I', writesRd: true },
  'andi':  { format: 'I', writesRd: true },
  'ori':   { format: 'I', writesRd: true },
  'xori':  { format: 'I', writesRd: true },
  'slti':  { format: 'I', writesRd: true },
  'sltiu': { format: 'I', writesRd: true },

  // I-type shifts: op rd, rs1, shamt
  'slli':  { format: 'I_SHIFT', writesRd: true },
  'srli':  { format: 'I_SHIFT', writesRd: true },
  'srai':  { format: 'I_SHIFT', writesRd: true },

  // Load: op rd, offset(rs1)
  'lb':    { format: 'LOAD', writesRd: true, isLoad: true },
  'lh':    { format: 'LOAD', writesRd: true, isLoad: true },
  'lw':    { format: 'LOAD', writesRd: true, isLoad: true },
  'lbu':   { format: 'LOAD', writesRd: true, isLoad: true },
  'lhu':   { format: 'LOAD', writesRd: true, isLoad: true },

  // Store: op rs2, offset(rs1)
  'sb':    { format: 'STORE', isStore: true },
  'sh':    { format: 'STORE', isStore: true },
  'sw':    { format: 'STORE', isStore: true },

  // Branch: op rs1, rs2, label
  'beq':   { format: 'BRANCH', isBranch: true },
  'bne':   { format: 'BRANCH', isBranch: true },
  'blt':   { format: 'BRANCH', isBranch: true },
  'bge':   { format: 'BRANCH', isBranch: true },
  'bltu':  { format: 'BRANCH', isBranch: true },
  'bgeu':  { format: 'BRANCH', isBranch: true },

  // Upper immediate: op rd, imm
  'lui':   { format: 'U', writesRd: true },
  'auipc': { format: 'U', writesRd: true },

  // Jump: jal rd, label
  'jal':   { format: 'J', writesRd: true, isJump: true },

  // Jump register: jalr rd, rs1, offset
  'jalr':  { format: 'I', writesRd: true, isJump: true, isJumpReg: true },

  // System
  'ecall': { format: 'ECALL', isSyscall: true },
  'nop':   { format: 'NOP' },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function parseNumber(s: string): number | null {
  s = s.trim();
  if (s.startsWith('0x') || s.startsWith('0X')) return isNaN(parseInt(s, 16)) ? null : parseInt(s, 16);
  if (s.startsWith('0b') || s.startsWith('0B')) return isNaN(parseInt(s.substring(2), 2)) ? null : parseInt(s.substring(2), 2);
  if (s.startsWith('-0x') || s.startsWith('-0X')) return isNaN(parseInt(s, 16)) ? null : parseInt(s, 16);
  const v = parseInt(s, 10);
  return isNaN(v) ? null : v;
}

function parseRegister(s: string): number | null {
  s = s.trim().toLowerCase();
  return REG[s] ?? null;
}

function parseMemoryOperand(s: string): { offset: number; reg: number } | null {
  const m = s.trim().match(/^(-?\d+|0x[\da-fA-F]+)?\s*\(\s*(\w+)\s*\)$/);
  if (!m) return null;
  const offset = m[1] ? (parseNumber(m[1]) ?? 0) : 0;
  const reg = parseRegister(m[2]);
  if (reg === null) return null;
  return { offset, reg };
}

function splitOperands(operandStr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of operandStr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function requireReg(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing register operand', severity: 'error' }); return -1; }
  const r = parseRegister(s);
  if (r === null) { errors.push({ line, message: `Invalid register: '${s}'`, severity: 'error' }); return -1; }
  return r;
}

function requireImm(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing immediate operand', severity: 'error' }); return 0; }
  const labelResolved = parseNumber(s);
  if (labelResolved === null) { errors.push({ line, message: `Invalid immediate: '${s}'`, severity: 'error' }); return 0; }
  return labelResolved;
}

function resolveLabel(s: string | undefined, labels: Map<string, number>, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing label', severity: 'error' }); return -1; }
  const trimmed = s.trim();
  const addr = labels.get(trimmed);
  if (addr !== undefined) return addr;
  const num = parseNumber(trimmed);
  if (num !== null) return num;
  errors.push({ line, message: `Undefined label: '${trimmed}'`, severity: 'error' });
  return -1;
}

// ── Data Section Parser ──────────────────────────────────────────────────

function parseDataSection(lines: { text: string; line: number }[]): {
  dataSegment: Map<number, number>;
  dataLabels: Map<string, number>;
  errors: ParseError[];
} {
  const dataSegment = new Map<number, number>();
  const dataLabels = new Map<string, number>();
  const errors: ParseError[] = [];
  let address = DATA_BASE;

  for (const { text, line } of lines) {
    let remaining = text;
    const labelMatch = remaining.match(/^(\w+):\s*/);
    if (labelMatch) {
      dataLabels.set(labelMatch[1], address);
      remaining = remaining.substring(labelMatch[0].length);
    }
    if (!remaining.trim()) continue;

    const parts = remaining.trim().split(/\s+/);
    const directive = parts[0].toLowerCase();
    const argStr = parts.slice(1).join(' ');

    switch (directive) {
      case '.word': {
        const values = argStr.split(',').map(s => s.trim()).filter(Boolean);
        for (const vs of values) {
          const colonMatch = vs.match(/^(-?\d+|0x[\da-fA-F]+)\s*:\s*(\d+)$/);
          if (colonMatch) {
            const val = parseNumber(colonMatch[1]) ?? 0;
            const count = parseInt(colonMatch[2], 10);
            for (let i = 0; i < count; i++) { writeWord(dataSegment, address, val); address += 4; }
          } else {
            const val = parseNumber(vs);
            if (val === null) errors.push({ line, message: `Invalid .word: '${vs}'`, severity: 'error' });
            else { writeWord(dataSegment, address, val); address += 4; }
          }
        }
        break;
      }
      case '.half': {
        for (const vs of argStr.split(',').map(s => s.trim()).filter(Boolean)) {
          const val = parseNumber(vs);
          if (val === null) errors.push({ line, message: `Invalid .half: '${vs}'`, severity: 'error' });
          else { dataSegment.set(address, (val >> 8) & 0xFF); dataSegment.set(address + 1, val & 0xFF); address += 2; }
        }
        break;
      }
      case '.byte': {
        for (const vs of argStr.split(',').map(s => s.trim()).filter(Boolean)) {
          const val = parseNumber(vs);
          if (val === null) errors.push({ line, message: `Invalid .byte: '${vs}'`, severity: 'error' });
          else { dataSegment.set(address, val & 0xFF); address += 1; }
        }
        break;
      }
      case '.asciiz': case '.ascii': case '.string': {
        const strMatch = argStr.match(/^"((?:[^"\\]|\\.)*)"/);
        if (!strMatch) { errors.push({ line, message: `Invalid string`, severity: 'error' }); break; }
        const str = strMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\0/g, '\0').replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        for (let i = 0; i < str.length; i++) { dataSegment.set(address, str.charCodeAt(i) & 0xFF); address++; }
        if (directive === '.asciiz' || directive === '.string') { dataSegment.set(address, 0); address++; }
        break;
      }
      case '.space': {
        const size = parseNumber(argStr.trim());
        if (size === null || size < 0) errors.push({ line, message: `Invalid .space`, severity: 'error' });
        else for (let i = 0; i < size; i++) { dataSegment.set(address, 0); address++; }
        break;
      }
      case '.align': {
        const n = parseNumber(argStr.trim());
        if (n !== null && n >= 0 && n <= 3) { const a = 1 << n; while (address % a !== 0) address++; }
        break;
      }
      case '.globl': break;
      default:
        if (directive.startsWith('.')) errors.push({ line, message: `Unknown directive: '${directive}'`, severity: 'warning' });
    }
  }
  while (address % 4 !== 0) address++;
  return { dataSegment, dataLabels, errors };
}

function writeWord(mem: Map<number, number>, address: number, value: number): void {
  mem.set(address, (value >> 24) & 0xFF);
  mem.set(address + 1, (value >> 16) & 0xFF);
  mem.set(address + 2, (value >> 8) & 0xFF);
  mem.set(address + 3, value & 0xFF);
}

// ── Pseudo-instruction Expansion ─────────────────────────────────────────

interface RawLine { text: string; line: number; }

function expandPseudoInstructions(lines: RawLine[], allLabels: Map<string, number>): RawLine[] {
  const expanded: RawLine[] = [];
  for (const { text, line } of lines) {
    const stripped = text.replace(/#.*$/, '').trim();
    const withoutLabel = stripped.replace(/^\w+:\s*/, '');
    if (!withoutLabel) { expanded.push({ text, line }); continue; }

    const labelPrefix = stripped.startsWith(withoutLabel) ? '' : stripped.substring(0, stripped.indexOf(withoutLabel));
    const parts = withoutLabel.split(/\s+/);
    const op = parts[0].toLowerCase();
    const operands = splitOperands(parts.slice(1).join(' '));

    switch (op) {
      case 'li': {
        const rd = operands[0];
        const imm = parseNumber(operands[1] || '0') ?? 0;
        if (imm >= -2048 && imm <= 2047) {
          expanded.push({ text: `${labelPrefix}addi ${rd}, zero, ${imm}`, line });
        } else {
          const upper = ((imm + 0x800) >>> 12) & 0xFFFFF;
          const lower = imm - (upper << 12);
          expanded.push({ text: `${labelPrefix}lui ${rd}, ${upper}`, line });
          if (lower !== 0) expanded.push({ text: `addi ${rd}, ${rd}, ${lower}`, line });
        }
        break;
      }
      case 'la': {
        const rd = operands[0];
        const labelName = operands[1]?.trim();
        const addr = labelName ? allLabels.get(labelName) : undefined;
        if (addr !== undefined) {
          const upper = ((addr + 0x800) >>> 12) & 0xFFFFF;
          const lower = addr - (upper << 12);
          expanded.push({ text: `${labelPrefix}lui ${rd}, ${upper}`, line });
          if (lower !== 0) expanded.push({ text: `addi ${rd}, ${rd}, ${lower}`, line });
        } else {
          expanded.push({ text, line });
        }
        break;
      }
      case 'mv':
        expanded.push({ text: `${labelPrefix}addi ${operands[0]}, ${operands[1]}, 0`, line });
        break;
      case 'nop':
        expanded.push({ text: `${labelPrefix}addi zero, zero, 0`, line });
        break;
      case 'j':
        expanded.push({ text: `${labelPrefix}jal zero, ${operands[0]}`, line });
        break;
      case 'jr':
        expanded.push({ text: `${labelPrefix}jalr zero, ${operands[0]}, 0`, line });
        break;
      case 'ret':
        expanded.push({ text: `${labelPrefix}jalr zero, ra, 0`, line });
        break;
      case 'call':
        expanded.push({ text: `${labelPrefix}jal ra, ${operands[0]}`, line });
        break;
      case 'bgt':
        expanded.push({ text: `${labelPrefix}blt ${operands[1]}, ${operands[0]}, ${operands[2]}`, line });
        break;
      case 'ble':
        expanded.push({ text: `${labelPrefix}bge ${operands[1]}, ${operands[0]}, ${operands[2]}`, line });
        break;
      case 'bgtu':
        expanded.push({ text: `${labelPrefix}bltu ${operands[1]}, ${operands[0]}, ${operands[2]}`, line });
        break;
      case 'bleu':
        expanded.push({ text: `${labelPrefix}bgeu ${operands[1]}, ${operands[0]}, ${operands[2]}`, line });
        break;
      case 'not':
        expanded.push({ text: `${labelPrefix}xori ${operands[0]}, ${operands[1]}, -1`, line });
        break;
      case 'neg':
        expanded.push({ text: `${labelPrefix}sub ${operands[0]}, zero, ${operands[1]}`, line });
        break;
      case 'seqz':
        expanded.push({ text: `${labelPrefix}sltiu ${operands[0]}, ${operands[1]}, 1`, line });
        break;
      case 'snez':
        expanded.push({ text: `${labelPrefix}sltu ${operands[0]}, zero, ${operands[1]}`, line });
        break;
      case 'beqz':
        expanded.push({ text: `${labelPrefix}beq ${operands[0]}, zero, ${operands[1]}`, line });
        break;
      case 'bnez':
        expanded.push({ text: `${labelPrefix}bne ${operands[0]}, zero, ${operands[1]}`, line });
        break;
      case 'lw': case 'sw': case 'lb': case 'sb': case 'lh': case 'sh': case 'lbu': case 'lhu': {
        // Check if second operand is a label (not memory operand format)
        const memMatch = operands[1]?.trim().match(/^(-?\d+|0x[\da-fA-F]+)?\s*\(\s*(\w+)\s*\)$/);
        if (!memMatch && operands[1]) {
          const labelName = operands[1].trim();
          const addr = allLabels.get(labelName);
          if (addr !== undefined) {
            const upper = ((addr + 0x800) >>> 12) & 0xFFFFF;
            const lower = addr - (upper << 12);
            // Use t6 as temp for label-based loads/stores (not ideal but avoids complexity)
            if (op.startsWith('l')) {
              expanded.push({ text: `${labelPrefix}lui ${operands[0]}, ${upper}`, line });
              expanded.push({ text: `${op} ${operands[0]}, ${lower}(${operands[0]})`, line });
            } else {
              expanded.push({ text: `${labelPrefix}lui t6, ${upper}`, line });
              expanded.push({ text: `${op} ${operands[0]}, ${lower}(t6)`, line });
            }
          } else {
            expanded.push({ text, line });
          }
        } else {
          expanded.push({ text, line });
        }
        break;
      }
      default:
        expanded.push({ text, line });
    }
  }
  return expanded;
}

// ── Main Assembler ───────────────────────────────────────────────────────

export function assembleRISCV(code: string, options?: AssembleOptions): ParseResult {
  const errors: ParseError[] = [];
  const labels = new Map<string, number>();
  const instructions: ParsedInstruction[] = [];
  const blockedSet = new Set(options?.blockedInstructions?.map(s => s.toLowerCase()) ?? []);

  // Step 1: Split into lines
  const sourceLines = code.split(/\r?\n/);
  const allLines: RawLine[] = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const stripped = sourceLines[i].replace(/#.*$/, '').trim();
    if (stripped.length > 0) allLines.push({ text: stripped, line: i + 1 });
  }

  // Step 2: Split .data / .text
  const dataLines: RawLine[] = [];
  const textLines: RawLine[] = [];
  let currentSection: 'text' | 'data' = 'text';

  for (const rawLine of allLines) {
    const withoutLabel = rawLine.text.replace(/^\w+:\s*/, '').trim().toLowerCase();
    if (withoutLabel === '.data') {
      const labelMatch = rawLine.text.match(/^(\w+):\s*/);
      if (labelMatch) dataLines.push({ text: `${labelMatch[1]}:`, line: rawLine.line });
      currentSection = 'data'; continue;
    }
    if (withoutLabel === '.text') {
      const labelMatch = rawLine.text.match(/^(\w+):\s*/);
      if (labelMatch) textLines.push({ text: `${labelMatch[1]}:`, line: rawLine.line });
      currentSection = 'text'; continue;
    }
    if (withoutLabel.startsWith('.globl') || withoutLabel.startsWith('.global')) continue;
    if (currentSection === 'data') dataLines.push(rawLine);
    else textLines.push(rawLine);
  }

  // Step 3: Parse data
  const dataResult = parseDataSection(dataLines);
  errors.push(...dataResult.errors);
  for (const [name, addr] of dataResult.dataLabels) labels.set(name, addr);

  // Step 4: Pre-pass for labels
  let preAddress = 0;
  const preLabels = new Map<string, number>(labels);
  for (const { text } of textLines) {
    let remaining = text;
    let match;
    while ((match = remaining.match(/^(\w+):\s*/))) {
      preLabels.set(match[1], preAddress);
      remaining = remaining.substring(match[0].length);
    }
    if (remaining.trim() && !remaining.trim().startsWith('.')) preAddress += 4;
  }
  for (const [k, v] of preLabels) labels.set(k, v);

  // Step 5-7: Expand pseudo-instructions with convergence
  let labelsStable = false;
  let iterations = 0;
  let finalLines: RawLine[] = [];

  while (!labelsStable && iterations < 10) {
    iterations++;
    const expandedLines = expandPseudoInstructions(textLines, labels);
    let address = 0;
    const newLabels = new Map<string, number>();
    for (const [name, addr] of dataResult.dataLabels) newLabels.set(name, addr);

    finalLines = [];
    for (const { text, line } of expandedLines) {
      let remaining = text;
      let match;
      while ((match = remaining.match(/^(\w+):\s*/))) {
        if (!dataResult.dataLabels.has(match[1])) newLabels.set(match[1], address);
        remaining = remaining.substring(match[0].length);
      }
      if (remaining.trim()) { finalLines.push({ text: remaining.trim(), line }); address += 4; }
    }

    labelsStable = true;
    if (newLabels.size !== labels.size) labelsStable = false;
    else for (const [k, v] of newLabels) { if (labels.get(k) !== v) { labelsStable = false; break; } }
    labels.clear();
    for (const [k, v] of newLabels) labels.set(k, v);
  }

  // Step 8: Parse each instruction
  for (let i = 0; i < finalLines.length; i++) {
    const { text, line } = finalLines[i];
    const addr = i * 4;
    const opName = text.split(/\s+/)[0].toLowerCase();
    if (blockedSet.has(opName)) {
      errors.push({ line, message: `Instruction '${opName}' is blocked`, severity: 'error' });
      continue;
    }
    const parsed = parseSingleRVInstruction(text, line, addr, labels, errors);
    if (parsed) instructions.push(parsed);
  }

  return { instructions, errors, labels, dataSegment: dataResult.dataSegment, dataLabels: dataResult.dataLabels };
}

function parseSingleRVInstruction(
  text: string, line: number, address: number,
  labels: Map<string, number>, errors: ParseError[]
): ParsedInstruction | null {
  const parts = text.split(/\s+/);
  const op = parts[0].toLowerCase();
  const operandStr = parts.slice(1).join(' ');
  const operands = splitOperands(operandStr);

  const def = RV_INSTRUCTIONS[op];
  if (!def) { errors.push({ line, message: `Unknown instruction: '${op}'`, severity: 'error' }); return null; }

  let rd = -1, rs = -1, rt = -1, imm = 0, shamt = 0, targetAddress = -1;
  const readsRegs: number[] = [];

  try {
    switch (def.format) {
      case 'R': {
        // op rd, rs1, rs2
        rd = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        rt = requireReg(operands[2], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'I': {
        // op rd, rs1, imm  OR  jalr rd, rs1, offset
        rd = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        if (def.isJump && def.isJumpReg) {
          // jalr rd, rs1, offset
          imm = operands[2] ? requireImm(operands[2], line, errors) : 0;
          targetAddress = -1; // computed at runtime
        } else {
          imm = requireImm(operands[2], line, errors);
        }
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'I_SHIFT': {
        // op rd, rs1, shamt
        rd = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        shamt = requireImm(operands[2], line, errors) & 0x1F;
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'LOAD': {
        // op rd, offset(rs1)
        rd = requireReg(operands[0], line, errors);
        const mem = parseMemoryOperand(operands[1] || '');
        if (!mem) { errors.push({ line, message: `Invalid memory operand: '${operands[1]}'`, severity: 'error' }); }
        else { imm = mem.offset; rs = mem.reg; }
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'STORE': {
        // op rs2, offset(rs1)
        rt = requireReg(operands[0], line, errors); // source register
        const mem = parseMemoryOperand(operands[1] || '');
        if (!mem) { errors.push({ line, message: `Invalid memory operand: '${operands[1]}'`, severity: 'error' }); }
        else { imm = mem.offset; rs = mem.reg; }
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'BRANCH': {
        // op rs1, rs2, label
        rs = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        targetAddress = resolveLabel(operands[2], labels, line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'U': {
        // op rd, imm
        rd = requireReg(operands[0], line, errors);
        imm = requireImm(operands[1], line, errors);
        if (op === 'lui') {
          imm = (imm << 12) | 0; // Shift immediate for LUI
        } else if (op === 'auipc') {
          imm = (address + (imm << 12)) | 0; // PC + (imm << 12)
        }
        break;
      }
      case 'J': {
        // jal rd, label
        if (operands.length >= 2) {
          rd = requireReg(operands[0], line, errors);
          targetAddress = resolveLabel(operands[1], labels, line, errors);
        } else {
          rd = 1; // ra
          targetAddress = resolveLabel(operands[0], labels, line, errors);
        }
        break;
      }
      case 'ECALL':
        break;
      case 'NOP':
        break;
    }
  } catch (e) {
    errors.push({ line, message: `Parse error: ${e}`, severity: 'error' });
    return null;
  }

  const writesReg = def.writesRd && rd > 0 ? rd : (def.isJump && !def.isJumpReg && rd > 0 ? rd : -1);

  return {
    raw: text,
    op,
    rd,
    rs,
    rt,
    imm,
    shamt,
    line,
    address,
    targetAddress,
    writesReg: writesReg,
    readsRegs,
    isLoad: def.isLoad ?? false,
    isStore: def.isStore ?? false,
    isBranch: def.isBranch ?? false,
    isJump: def.isJump ?? false,
    isJumpReg: def.isJumpReg ?? false,
    isSyscall: def.isSyscall ?? false,
  };
}

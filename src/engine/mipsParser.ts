/**
 * MIPS Assembly Parser & Assembler
 * Parses MIPS assembly text into structured instructions for pipeline simulation.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface ParsedInstruction {
  raw: string;
  op: string;
  rd: number;
  rs: number;
  rt: number;
  imm: number;
  shamt: number;
  line: number;
  address: number;
  targetAddress: number;
  writesReg: number;
  readsRegs: number[];
  isLoad: boolean;
  isStore: boolean;
  isBranch: boolean;
  isJump: boolean;
  isJumpReg: boolean;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  instructions: ParsedInstruction[];
  errors: ParseError[];
  labels: Map<string, number>;
}

// ── Register Mapping ─────────────────────────────────────────────────────

const REG: Record<string, number> = {
  '$zero': 0, '$0': 0,
  '$at': 1, '$1': 1,
  '$v0': 2, '$2': 2, '$v1': 3, '$3': 3,
  '$a0': 4, '$4': 4, '$a1': 5, '$5': 5, '$a2': 6, '$6': 6, '$a3': 7, '$7': 7,
  '$t0': 8, '$8': 8, '$t1': 9, '$9': 9, '$t2': 10, '$10': 10, '$t3': 11, '$11': 11,
  '$t4': 12, '$12': 12, '$t5': 13, '$13': 13, '$t6': 14, '$14': 14, '$t7': 15, '$15': 15,
  '$s0': 16, '$16': 16, '$s1': 17, '$17': 17, '$s2': 18, '$18': 18, '$s3': 19, '$19': 19,
  '$s4': 20, '$20': 20, '$s5': 21, '$21': 21, '$s6': 22, '$22': 22, '$s7': 23, '$23': 23,
  '$t8': 24, '$24': 24, '$t9': 25, '$25': 25,
  '$k0': 26, '$26': 26, '$k1': 27, '$27': 27,
  '$gp': 28, '$28': 28, '$sp': 29, '$29': 29, '$fp': 30, '$30': 30, '$ra': 31, '$31': 31,
};

export const REG_NAMES = [
  '$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra',
];

// ── Instruction Format Definitions ───────────────────────────────────────

type Format = 'R3' | 'SHIFT' | 'SHIFTV' | 'R1S' | 'R1D' | 'R2' | 'JALR'
  | 'I3' | 'MEM' | 'BR2' | 'BR1' | 'LUI' | 'JUMP' | 'NONE';

interface InstructionDef {
  format: Format;
  writesRd?: boolean;
  writesRt?: boolean;
  writesRa?: boolean;
  isLoad?: boolean;
  isStore?: boolean;
  isBranch?: boolean;
  isJump?: boolean;
  isJumpReg?: boolean;
}

const INSTRUCTIONS: Record<string, InstructionDef> = {
  // R-type arithmetic/logic: op rd, rs, rt
  'add':   { format: 'R3', writesRd: true },
  'addu':  { format: 'R3', writesRd: true },
  'sub':   { format: 'R3', writesRd: true },
  'subu':  { format: 'R3', writesRd: true },
  'and':   { format: 'R3', writesRd: true },
  'or':    { format: 'R3', writesRd: true },
  'xor':   { format: 'R3', writesRd: true },
  'nor':   { format: 'R3', writesRd: true },
  'slt':   { format: 'R3', writesRd: true },
  'sltu':  { format: 'R3', writesRd: true },
  // Shifts: op rd, rt, shamt
  'sll':   { format: 'SHIFT', writesRd: true },
  'srl':   { format: 'SHIFT', writesRd: true },
  'sra':   { format: 'SHIFT', writesRd: true },
  // Variable shifts: op rd, rt, rs
  'sllv':  { format: 'SHIFTV', writesRd: true },
  'srlv':  { format: 'SHIFTV', writesRd: true },
  'srav':  { format: 'SHIFTV', writesRd: true },
  // Multiply/divide: op rs, rt
  'mult':  { format: 'R2' },
  'multu': { format: 'R2' },
  'div':   { format: 'R2' },
  'divu':  { format: 'R2' },
  // Move from HI/LO: op rd
  'mfhi':  { format: 'R1D', writesRd: true },
  'mflo':  { format: 'R1D', writesRd: true },
  // Jump register: jr rs
  'jr':    { format: 'R1S', isJump: true, isJumpReg: true },
  'jalr':  { format: 'JALR', writesRd: true, isJump: true, isJumpReg: true },
  // I-type arithmetic: op rt, rs, imm
  'addi':  { format: 'I3', writesRt: true },
  'addiu': { format: 'I3', writesRt: true },
  'andi':  { format: 'I3', writesRt: true },
  'ori':   { format: 'I3', writesRt: true },
  'xori':  { format: 'I3', writesRt: true },
  'slti':  { format: 'I3', writesRt: true },
  'sltiu': { format: 'I3', writesRt: true },
  // Load/Store: op rt, offset(rs)
  'lw':    { format: 'MEM', writesRt: true, isLoad: true },
  'sw':    { format: 'MEM', isStore: true },
  'lb':    { format: 'MEM', writesRt: true, isLoad: true },
  'lbu':   { format: 'MEM', writesRt: true, isLoad: true },
  'sb':    { format: 'MEM', isStore: true },
  'lh':    { format: 'MEM', writesRt: true, isLoad: true },
  'lhu':   { format: 'MEM', writesRt: true, isLoad: true },
  'sh':    { format: 'MEM', isStore: true },
  // LUI: op rt, imm
  'lui':   { format: 'LUI', writesRt: true },
  // Branch: op rs, rt, label
  'beq':   { format: 'BR2', isBranch: true },
  'bne':   { format: 'BR2', isBranch: true },
  // Branch: op rs, label
  'bgtz':  { format: 'BR1', isBranch: true },
  'blez':  { format: 'BR1', isBranch: true },
  'bgez':  { format: 'BR1', isBranch: true },
  'bltz':  { format: 'BR1', isBranch: true },
  // Jump: op label
  'j':     { format: 'JUMP', isJump: true },
  'jal':   { format: 'JUMP', writesRa: true, isJump: true },
  // System
  'syscall': { format: 'NONE' },
  'nop':     { format: 'NONE' },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function parseNumber(s: string): number | null {
  s = s.trim();
  if (s.startsWith('0x') || s.startsWith('0X')) {
    const v = parseInt(s, 16);
    return isNaN(v) ? null : v;
  }
  if (s.startsWith('0b') || s.startsWith('0B')) {
    const v = parseInt(s.substring(2), 2);
    return isNaN(v) ? null : v;
  }
  const v = parseInt(s, 10);
  return isNaN(v) ? null : v;
}

function parseRegister(s: string): number | null {
  s = s.trim().toLowerCase();
  if (!s.startsWith('$')) return null;
  return REG[s] ?? null;
}

function parseMemoryOperand(s: string): { offset: number; reg: number } | null {
  // Matches: offset($reg) or ($reg) or $reg
  const m = s.trim().match(/^(-?\d+|0x[\da-fA-F]+)?\s*\(\s*(\$\w+)\s*\)$/);
  if (!m) return null;
  const offset = m[1] ? (parseNumber(m[1]) ?? 0) : 0;
  const reg = parseRegister(m[2]);
  if (reg === null) return null;
  return { offset, reg };
}

function splitOperands(operandStr: string): string[] {
  // Split by comma, but be careful with offset($reg) patterns
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

// ── Pseudo-instruction Expansion ─────────────────────────────────────────

interface RawLine {
  text: string;
  line: number; // original source line
}

function expandPseudoInstructions(lines: RawLine[]): RawLine[] {
  const expanded: RawLine[] = [];
  for (const { text, line } of lines) {
    const stripped = text.replace(/#.*$/, '').trim();
    // Remove label prefix for checking
    const withoutLabel = stripped.replace(/^\w+:\s*/, '');
    if (!withoutLabel) { expanded.push({ text, line }); continue; }

    const labelPrefix = stripped.startsWith(withoutLabel) ? '' : stripped.substring(0, stripped.indexOf(withoutLabel));
    const parts = withoutLabel.split(/\s+/);
    const op = parts[0].toLowerCase();
    const operands = splitOperands(parts.slice(1).join(' '));

    switch (op) {
      case 'li': {
        // li $rd, imm
        const rd = operands[0];
        const imm = parseNumber(operands[1] || '0') ?? 0;
        if (imm >= -32768 && imm <= 32767) {
          expanded.push({ text: `${labelPrefix}addi ${rd}, $zero, ${imm}`, line });
        } else {
          const upper = (imm >>> 16) & 0xFFFF;
          const lower = imm & 0xFFFF;
          expanded.push({ text: `${labelPrefix}lui ${rd}, ${upper}`, line });
          if (lower !== 0) {
            expanded.push({ text: `ori ${rd}, ${rd}, ${lower}`, line });
          }
        }
        break;
      }
      case 'la': {
        // la $rd, label → treated as li with address (resolved later as label)
        // For simplicity, we'll keep it and resolve in second pass
        expanded.push({ text, line });
        break;
      }
      case 'move': {
        // move $rd, $rs → addu $rd, $zero, $rs
        expanded.push({ text: `${labelPrefix}addu ${operands[0]}, $zero, ${operands[1]}`, line });
        break;
      }
      case 'nop': {
        expanded.push({ text: `${labelPrefix}sll $zero, $zero, 0`, line });
        break;
      }
      case 'blt': {
        // blt $rs, $rt, label → slt $at, $rs, $rt; bne $at, $zero, label
        expanded.push({ text: `${labelPrefix}slt $at, ${operands[0]}, ${operands[1]}`, line });
        expanded.push({ text: `bne $at, $zero, ${operands[2]}`, line });
        break;
      }
      case 'bge': {
        expanded.push({ text: `${labelPrefix}slt $at, ${operands[0]}, ${operands[1]}`, line });
        expanded.push({ text: `beq $at, $zero, ${operands[2]}`, line });
        break;
      }
      case 'bgt': {
        expanded.push({ text: `${labelPrefix}slt $at, ${operands[1]}, ${operands[0]}`, line });
        expanded.push({ text: `bne $at, $zero, ${operands[2]}`, line });
        break;
      }
      case 'ble': {
        expanded.push({ text: `${labelPrefix}slt $at, ${operands[1]}, ${operands[0]}`, line });
        expanded.push({ text: `beq $at, $zero, ${operands[2]}`, line });
        break;
      }
      default:
        expanded.push({ text, line });
    }
  }
  return expanded;
}

// ── Main Assembler ───────────────────────────────────────────────────────

export function assemble(code: string): ParseResult {
  const errors: ParseError[] = [];
  const labels = new Map<string, number>();
  const instructions: ParsedInstruction[] = [];

  // Step 1: Split into raw lines, strip empties and pure comments
  const sourceLines = code.split('\n');
  let rawLines: RawLine[] = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const stripped = sourceLines[i].replace(/#.*$/, '').trim();
    if (stripped.length > 0) {
      rawLines.push({ text: stripped, line: i + 1 });
    }
  }

  // Step 1.5: Skip directives (.data, .text, .word, .globl, etc.)
  rawLines = rawLines.filter(({ text }) => {
    const t = text.replace(/^\w+:\s*/, '');
    if (t.startsWith('.')) {
      // Keep label if there is one, but remove the directive
      const labelMatch = text.match(/^(\w+):/);
      if (labelMatch) {
        // We'll handle this label in the label pass
      }
      return false;
    }
    return true;
  });

  // Step 2: Expand pseudo-instructions
  rawLines = expandPseudoInstructions(rawLines);

  // Step 3: First pass — find labels and compute addresses
  let address = 0;
  const linesAfterLabels: RawLine[] = [];
  for (const { text, line } of rawLines) {
    let remaining = text;
    // Extract labels (can have multiple on one line)
    const labelRegex = /^(\w+):\s*/;
    let match;
    while ((match = remaining.match(labelRegex))) {
      const label = match[1];
      if (labels.has(label)) {
        errors.push({ line, message: `Duplicate label: '${label}'` });
      } else {
        labels.set(label, address);
      }
      remaining = remaining.substring(match[0].length);
    }
    if (remaining.trim()) {
      linesAfterLabels.push({ text: remaining.trim(), line });
      address += 4;
    }
  }

  // Step 4: Second pass — parse each instruction
  for (let i = 0; i < linesAfterLabels.length; i++) {
    const { text, line } = linesAfterLabels[i];
    const addr = i * 4;
    const parsed = parseSingleInstruction(text, line, addr, labels, errors);
    if (parsed) {
      instructions.push(parsed);
    }
  }

  return { instructions, errors, labels };
}

function parseSingleInstruction(
  text: string,
  line: number,
  address: number,
  labels: Map<string, number>,
  errors: ParseError[],
): ParsedInstruction | null {
  const parts = text.split(/\s+/);
  const op = parts[0].toLowerCase();
  const operandStr = parts.slice(1).join(' ');
  const operands = splitOperands(operandStr);

  const def = INSTRUCTIONS[op];
  if (!def) {
    errors.push({ line, message: `Unknown instruction: '${op}'` });
    return null;
  }

  let rd = -1, rs = -1, rt = -1, imm = 0, shamt = 0, targetAddress = -1;
  const readsRegs: number[] = [];

  try {
    switch (def.format) {
      case 'R3': {
        // op rd, rs, rt
        rd = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        rt = requireReg(operands[2], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'SHIFT': {
        // op rd, rt, shamt
        rd = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        shamt = requireImm(operands[2], line, errors);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'SHIFTV': {
        // op rd, rt, rs
        rd = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        rs = requireReg(operands[2], line, errors);
        if (rt >= 0) readsRegs.push(rt);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'R1S': {
        // op rs
        rs = requireReg(operands[0], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'R1D': {
        // op rd
        rd = requireReg(operands[0], line, errors);
        break;
      }
      case 'R2': {
        // op rs, rt
        rs = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'JALR': {
        // jalr rd, rs OR jalr rs (rd defaults to $ra)
        if (operands.length >= 2) {
          rd = requireReg(operands[0], line, errors);
          rs = requireReg(operands[1], line, errors);
        } else {
          rd = 31; // $ra
          rs = requireReg(operands[0], line, errors);
        }
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'I3': {
        // op rt, rs, imm
        rt = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        imm = requireImm(operands[2], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'MEM': {
        // op rt, offset(rs)
        rt = requireReg(operands[0], line, errors);
        const mem = parseMemoryOperand(operands[1] || '');
        if (!mem) {
          errors.push({ line, message: `Invalid memory operand: '${operands[1]}'` });
        } else {
          imm = mem.offset;
          rs = mem.reg;
        }
        if (rs >= 0) readsRegs.push(rs);
        // For store, rt is also a source (data to store)
        if (def.isStore && rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'BR2': {
        // op rs, rt, label
        rs = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        targetAddress = resolveLabel(operands[2], labels, line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'BR1': {
        // op rs, label
        rs = requireReg(operands[0], line, errors);
        targetAddress = resolveLabel(operands[1], labels, line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'LUI': {
        // op rt, imm
        rt = requireReg(operands[0], line, errors);
        imm = requireImm(operands[1], line, errors);
        break;
      }
      case 'JUMP': {
        // op label
        targetAddress = resolveLabel(operands[0], labels, line, errors);
        break;
      }
      case 'NONE': {
        // No operands (syscall, nop)
        break;
      }
    }
  } catch {
    errors.push({ line, message: `Error parsing operands for '${op}'` });
    return null;
  }

  // Determine write register
  let writesReg = -1;
  if (def.writesRd && rd >= 0) writesReg = rd;
  else if (def.writesRt && rt >= 0) writesReg = rt;
  else if (def.writesRa) writesReg = 31;

  // $zero is never actually written
  if (writesReg === 0) writesReg = -1;

  return {
    raw: text,
    op,
    rd, rs, rt,
    imm, shamt,
    line, address,
    targetAddress,
    writesReg,
    readsRegs,
    isLoad: def.isLoad ?? false,
    isStore: def.isStore ?? false,
    isBranch: def.isBranch ?? false,
    isJump: def.isJump ?? false,
    isJumpReg: def.isJumpReg ?? false,
  };
}

function requireReg(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing register operand' }); return -1; }
  const r = parseRegister(s);
  if (r === null) { errors.push({ line, message: `Invalid register: '${s}'` }); return -1; }
  return r;
}

function requireImm(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing immediate operand' }); return 0; }
  const v = parseNumber(s);
  if (v === null) { errors.push({ line, message: `Invalid immediate value: '${s}'` }); return 0; }
  return v;
}

function resolveLabel(s: string | undefined, labels: Map<string, number>, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing label operand' }); return -1; }
  s = s.trim();
  // Could be a numeric address
  const num = parseNumber(s);
  if (num !== null) return num;
  // Resolve label
  const addr = labels.get(s);
  if (addr === undefined) {
    errors.push({ line, message: `Undefined label: '${s}'` });
    return -1;
  }
  return addr;
}

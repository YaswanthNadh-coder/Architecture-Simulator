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
  isSyscall: boolean;
}

export interface ParseError {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ParseResult {
  instructions: ParsedInstruction[];
  errors: ParseError[];
  labels: Map<string, number>;
  dataSegment: Map<number, number>;
  dataLabels: Map<string, number>;
}

const DATA_BASE = 0x10010000;

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
  isSyscall?: boolean;
}

const INSTRUCTIONS: Record<string, InstructionDef> = {
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
  'sll':   { format: 'SHIFT', writesRd: true },
  'srl':   { format: 'SHIFT', writesRd: true },
  'sra':   { format: 'SHIFT', writesRd: true },
  'sllv':  { format: 'SHIFTV', writesRd: true },
  'srlv':  { format: 'SHIFTV', writesRd: true },
  'srav':  { format: 'SHIFTV', writesRd: true },
  'mult':  { format: 'R2' },
  'multu': { format: 'R2' },
  'div':   { format: 'R2' },
  'divu':  { format: 'R2' },
  'mfhi':  { format: 'R1D', writesRd: true },
  'mflo':  { format: 'R1D', writesRd: true },
  'jr':    { format: 'R1S', isJump: true, isJumpReg: true },
  'jalr':  { format: 'JALR', writesRd: true, isJump: true, isJumpReg: true },
  'addi':  { format: 'I3', writesRt: true },
  'addiu': { format: 'I3', writesRt: true },
  'andi':  { format: 'I3', writesRt: true },
  'ori':   { format: 'I3', writesRt: true },
  'xori':  { format: 'I3', writesRt: true },
  'slti':  { format: 'I3', writesRt: true },
  'sltiu': { format: 'I3', writesRt: true },
  'lw':    { format: 'MEM', writesRt: true, isLoad: true },
  'sw':    { format: 'MEM', isStore: true },
  'lb':    { format: 'MEM', writesRt: true, isLoad: true },
  'lbu':   { format: 'MEM', writesRt: true, isLoad: true },
  'sb':    { format: 'MEM', isStore: true },
  'lh':    { format: 'MEM', writesRt: true, isLoad: true },
  'lhu':   { format: 'MEM', writesRt: true, isLoad: true },
  'sh':    { format: 'MEM', isStore: true },
  'lui':   { format: 'LUI', writesRt: true },
  'beq':   { format: 'BR2', isBranch: true },
  'bne':   { format: 'BR2', isBranch: true },
  'bgtz':  { format: 'BR1', isBranch: true },
  'blez':  { format: 'BR1', isBranch: true },
  'bgez':  { format: 'BR1', isBranch: true },
  'bltz':  { format: 'BR1', isBranch: true },
  'j':     { format: 'JUMP', isJump: true },
  'jal':   { format: 'JUMP', writesRa: true, isJump: true },
  'syscall': { format: 'NONE', isSyscall: true },
  'nop':     { format: 'NONE' },
};

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
  if (s.startsWith('-0x') || s.startsWith('-0X')) {
    const v = parseInt(s, 16);
    return isNaN(v) ? null : v;
  }
  const v = parseInt(s, 10);
  return isNaN(v) ? null : v;
}

export function parseRegister(s: string): number | null {
  s = s.trim().toLowerCase();
  if (!s.startsWith('$')) return null;
  return REG[s] ?? null;
}

function parseMemoryOperand(s: string): { offset: number; reg: number } | null {
  const m = s.trim().match(/^(-?\d+|0x[\da-fA-F]+)?\s*\(\s*(\$\w+)\s*\)$/);
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
            for (let i = 0; i < count; i++) {
              writeWord(dataSegment, address, val);
              address += 4;
            }
          } else {
            const val = parseNumber(vs);
            if (val === null) {
              errors.push({ line, message: `Invalid .word value: '${vs}'`, severity: 'error' });
            } else {
              writeWord(dataSegment, address, val);
              address += 4;
            }
          }
        }
        break;
      }
      case '.half': {
        const values = argStr.split(',').map(s => s.trim()).filter(Boolean);
        for (const vs of values) {
          const val = parseNumber(vs);
          if (val === null || val < -32768 || val > 65535) {
            errors.push({ line, message: `Invalid .half value: '${vs}'`, severity: 'error' });
          } else {
            dataSegment.set(address, (val >> 8) & 0xFF);
            dataSegment.set(address + 1, val & 0xFF);
            address += 2;
          }
        }
        break;
      }
      case '.byte': {
        const values = argStr.split(',').map(s => s.trim()).filter(Boolean);
        for (const vs of values) {
          const val = parseNumber(vs);
          if (val === null) {
            errors.push({ line, message: `Invalid .byte value: '${vs}'`, severity: 'error' });
          } else {
            dataSegment.set(address, val & 0xFF);
            address += 1;
          }
        }
        break;
      }
      case '.asciiz':
      case '.ascii': {
        const strMatch = argStr.match(/^"((?:[^"\\]|\\.)*)"/);
        if (!strMatch) {
          errors.push({ line, message: `Invalid string literal for ${directive}`, severity: 'error' });
          break;
        }
        const str = unescapeString(strMatch[1]);
        for (let i = 0; i < str.length; i++) {
          dataSegment.set(address, str.charCodeAt(i) & 0xFF);
          address += 1;
        }
        if (directive === '.asciiz') {
          dataSegment.set(address, 0);
          address += 1;
        }
        break;
      }
      case '.space': {
        const size = parseNumber(argStr.trim());
        if (size === null || size < 0) {
          errors.push({ line, message: `Invalid .space size: '${argStr}'`, severity: 'error' });
        } else {
          for (let i = 0; i < size; i++) {
            dataSegment.set(address, 0);
            address += 1;
          }
        }
        break;
      }
      case '.align': {
        const n = parseNumber(argStr.trim());
        if (n !== null && n >= 0 && n <= 3) {
          const alignment = 1 << n;
          while (address % alignment !== 0) address++;
        }
        break;
      }
      default:
        break;
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

function unescapeString(s: string): string {
  return s.replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\0/g, '\0')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}

interface RawLine {
  text: string;
  line: number;
}

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
        const rd = operands[0];
        const labelName = operands[1]?.trim();
        const addr = labelName ? allLabels.get(labelName) : undefined;
        if (addr !== undefined) {
          const upper = (addr >>> 16) & 0xFFFF;
          const lower = addr & 0xFFFF;
          expanded.push({ text: `${labelPrefix}lui ${rd}, ${upper}`, line });
          if (lower !== 0) {
            expanded.push({ text: `ori ${rd}, ${rd}, ${lower}`, line });
          }
        } else {
          expanded.push({ text, line });
        }
        break;
      }
      case 'move': {
        expanded.push({ text: `${labelPrefix}addu ${operands[0]}, $zero, ${operands[1]}`, line });
        break;
      }
      case 'nop': {
        expanded.push({ text: `${labelPrefix}sll $zero, $zero, 0`, line });
        break;
      }
      case 'blt': {
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
      case 'lw':
      case 'sw': {
        const memMatch = operands[1]?.trim().match(/^(-?\d+|0x[\da-fA-F]+)?\s*\(\s*(\$\w+)\s*\)$/);
        if (!memMatch) {
          const rt = operands[0];
          const labelName = operands[1]?.trim();
          const addr = labelName ? allLabels.get(labelName) : undefined;
          if (addr !== undefined) {
            const upper = (addr >>> 16) & 0xFFFF;
            const lower = addr & 0xFFFF;
            expanded.push({ text: `${labelPrefix}lui $at, ${upper}`, line });
            expanded.push({ text: `${op} ${rt}, ${lower}($at)`, line });
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

export interface AssembleOptions {
  blockedInstructions?: string[];
}

export function assemble(code: string, options?: AssembleOptions): ParseResult {
  const errors: ParseError[] = [];
  const labels = new Map<string, number>();
  const instructions: ParsedInstruction[] = [];
  const blockedSet = new Set(options?.blockedInstructions?.map(s => s.toLowerCase()) ?? []);

  const sourceLines = code.split(/\r?\n/);
  const allLines: RawLine[] = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const stripped = sourceLines[i].replace(/#.*$/, '').trim();
    if (stripped.length > 0) {
      allLines.push({ text: stripped, line: i + 1 });
    }
  }

  const dataLines: RawLine[] = [];
  const textLines: RawLine[] = [];
  let currentSection: 'text' | 'data' = 'text';

  for (const rawLine of allLines) {
    const withoutLabel = rawLine.text.replace(/^\w+:\s*/, '').trim().toLowerCase();
    if (withoutLabel === '.data') {
      const labelMatch = rawLine.text.match(/^(\w+):\s*/);
      if (labelMatch) {
        dataLines.push({ text: `${labelMatch[1]}:`, line: rawLine.line });
      }
      currentSection = 'data';
      continue;
    }
    if (withoutLabel === '.text') {
      const labelMatch = rawLine.text.match(/^(\w+):\s*/);
      if (labelMatch) {
        textLines.push({ text: `${labelMatch[1]}:`, line: rawLine.line });
      }
      currentSection = 'text';
      continue;
    }
    if (withoutLabel.startsWith('.globl')) {
      continue;
    }
    if (currentSection === 'data') {
      dataLines.push(rawLine);
    } else {
      textLines.push(rawLine);
    }
  }

  const dataResult = parseDataSection(dataLines);
  errors.push(...dataResult.errors);

  for (const [name, addr] of dataResult.dataLabels) {
    labels.set(name, addr);
  }

  let preAddress = 0;
  const preLabels = new Map<string, number>(labels);
  for (const { text } of textLines) {
    let remaining = text;
    const labelRegex = /^(\w+):\s*/;
    let match;
    while ((match = remaining.match(labelRegex))) {
      preLabels.set(match[1], preAddress);
      remaining = remaining.substring(match[0].length);
    }
    if (remaining.trim() && !remaining.trim().startsWith('.')) {
      preAddress += 4;
    }
  }

  for (const [k, v] of preLabels) {
    labels.set(k, v);
  }

  let labelsStable = false;
  let iterations = 0;
  let expandedLines: RawLine[] = [];
  let finalLines: RawLine[] = [];

  while (!labelsStable && iterations < 10) {
    iterations++;
    expandedLines = expandPseudoInstructions(textLines, labels);

    let address = 0;
    const newLabels = new Map<string, number>();
    for (const [name, addr] of dataResult.dataLabels) {
      newLabels.set(name, addr);
    }

    finalLines = [];

    for (const { text, line } of expandedLines) {
      let remaining = text;
      const labelRegex = /^(\w+):\s*/;
      let match;
      while ((match = remaining.match(labelRegex))) {
        const label = match[1];
        if (newLabels.has(label) && !dataResult.dataLabels.has(label)) {
          if (iterations === 1) {
            errors.push({ line, message: `Duplicate label: '${label}'`, severity: 'error' });
          }
        } else if (!dataResult.dataLabels.has(label)) {
          newLabels.set(label, address);
        }
        remaining = remaining.substring(match[0].length);
      }
      if (remaining.trim()) {
        finalLines.push({ text: remaining.trim(), line });
        address += 4;
      }
    }

    labelsStable = true;
    if (newLabels.size !== labels.size) {
      labelsStable = false;
    } else {
      for (const [k, v] of newLabels) {
        if (labels.get(k) !== v) {
          labelsStable = false;
          break;
        }
      }
    }

    labels.clear();
    for (const [k, v] of newLabels) {
      labels.set(k, v);
    }
  }

  for (let i = 0; i < finalLines.length; i++) {
    const { text, line } = finalLines[i];
    const addr = i * 4;

    const opName = text.split(/\s+/)[0].toLowerCase();
    if (blockedSet.has(opName)) {
      errors.push({ line, message: `Instruction '${opName}' is blocked for this assignment`, severity: 'error' });
      continue;
    }

    const parsed = parseSingleInstruction(text, line, addr, labels, errors);
    if (parsed) {
      instructions.push(parsed);
    }
  }

  return { instructions, errors, labels, dataSegment: dataResult.dataSegment, dataLabels: dataResult.dataLabels };
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
    errors.push({ line, message: `Unknown instruction: '${op}'`, severity: 'error' });
    return null;
  }

  let rd = -1, rs = -1, rt = -1, imm = 0, shamt = 0, targetAddress = -1;
  const readsRegs: number[] = [];

  try {
    switch (def.format) {
      case 'R3': {
        rd = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        rt = requireReg(operands[2], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'SHIFT': {
        rd = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        shamt = requireImm(operands[2], line, errors);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'SHIFTV': {
        rd = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        rs = requireReg(operands[2], line, errors);
        if (rt >= 0) readsRegs.push(rt);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'R1S': {
        rs = requireReg(operands[0], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'R1D': {
        rd = requireReg(operands[0], line, errors);
        break;
      }
      case 'R2': {
        rs = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'JALR': {
        if (operands.length >= 2) {
          rd = requireReg(operands[0], line, errors);
          rs = requireReg(operands[1], line, errors);
        } else {
          rd = 31;
          rs = requireReg(operands[0], line, errors);
        }
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'I3': {
        rt = requireReg(operands[0], line, errors);
        rs = requireReg(operands[1], line, errors);
        imm = requireImm(operands[2], line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'MEM': {
        rt = requireReg(operands[0], line, errors);
        const mem = parseMemoryOperand(operands[1] || '');
        if (!mem) {
          errors.push({ line, message: `Invalid memory operand: '${operands[1]}'`, severity: 'error' });
        } else {
          imm = mem.offset;
          rs = mem.reg;
        }
        if (rs >= 0) readsRegs.push(rs);
        if (def.isStore && rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'BR2': {
        rs = requireReg(operands[0], line, errors);
        rt = requireReg(operands[1], line, errors);
        targetAddress = resolveLabel(operands[2], labels, line, errors);
        if (rs >= 0) readsRegs.push(rs);
        if (rt >= 0) readsRegs.push(rt);
        break;
      }
      case 'BR1': {
        rs = requireReg(operands[0], line, errors);
        targetAddress = resolveLabel(operands[1], labels, line, errors);
        if (rs >= 0) readsRegs.push(rs);
        break;
      }
      case 'LUI': {
        rt = requireReg(operands[0], line, errors);
        imm = requireImm(operands[1], line, errors);
        break;
      }
      case 'JUMP': {
        targetAddress = resolveLabel(operands[0], labels, line, errors);
        break;
      }
      case 'NONE': {
        break;
      }
    }
  } catch {
    errors.push({ line, message: `Error parsing operands for '${op}'`, severity: 'error' });
    return null;
  }

  let writesReg = -1;
  if (def.writesRd && rd >= 0) writesReg = rd;
  else if (def.writesRt && rt >= 0) writesReg = rt;
  else if (def.writesRa) writesReg = 31;

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
    isSyscall: def.isSyscall ?? false,
  };
}

function requireReg(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing register operand', severity: 'error' }); return -1; }
  const r = parseRegister(s);
  if (r === null) { errors.push({ line, message: `Invalid register: '${s}'`, severity: 'error' }); return -1; }
  return r;
}

function requireImm(s: string | undefined, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing immediate operand', severity: 'error' }); return 0; }
  const v = parseNumber(s);
  if (v === null) { errors.push({ line, message: `Invalid immediate value: '${s}'`, severity: 'error' }); return 0; }
  return v;
}

function resolveLabel(s: string | undefined, labels: Map<string, number>, line: number, errors: ParseError[]): number {
  if (!s) { errors.push({ line, message: 'Missing label operand', severity: 'error' }); return -1; }
  s = s.trim();
  const num = parseNumber(s);
  if (num !== null) return num;
  const addr = labels.get(s);
  if (addr === undefined) {
    errors.push({ line, message: `Undefined label: '${s}'`, severity: 'error' });
    return -1;
  }
  return addr;
}

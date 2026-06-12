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
  format: 'R-type' | 'I-type' | 'J-type' | 'Unknown';
}

function toBin(val: number, bits: number): string {
  if (val < 0) {
    // Two's complement for negative numbers
    val = (1 << bits) + val;
  }
  return val.toString(2).padStart(bits, '0').slice(-bits);
}

function toHex(binary: string): string {
  const dec = parseInt(binary, 2);
  return '0x' + dec.toString(16).padStart(8, '0').toUpperCase();
}

export function encodeInstruction(inst: ParsedInstruction): EncodedInstruction {
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
      
      // Try to give a meaningful name
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
      // PC-relative pseudo-direct jump target: (targetAddress / 4)
      val = (inst.targetAddress >>> 2) & 0x03FFFFFF;
      const binStr = toBin(val, bits);
      binary += binStr;
      fields.push({ name: 'target', value: val, bits, binary: binStr });
    }
  }

  // Ensure it's exactly 32 bits, pad if not
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

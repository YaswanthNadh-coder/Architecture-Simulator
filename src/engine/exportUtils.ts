import type { ParsedInstruction } from './mipsParser';
import { encodeInstruction } from './encoder';

export function generateLogisimImage(
  instructions: ParsedInstruction[],
  dataSegment: Map<number, number>,
  isa: 'mips' | 'riscv' = 'mips'
): string {
  let out = 'v2.0 raw\n';
  
  // Header annotation for ISA
  out += `# Architecture: ${isa.toUpperCase()}\n`;
  out += '# Instruction Memory (starts at PC 0x00000000)\n';

  const instHex = instructions.map(inst => {
    const encoded = encodeInstruction(inst, isa);
    return encoded.hex.replace('0x', '').padStart(8, '0');
  });
  
  if (instHex.length > 0) {
    out += instHex.join(' ') + '\n';
  }

  out += '\n# Data Memory (Address: 8-bit hex bytes)\n';
  const sortedAddrs = Array.from(dataSegment.keys()).sort((a, b) => a - b);
  let currentAddr = -1;
  let line = '';
  
  for (const addr of sortedAddrs) {
    if (currentAddr === -1 || addr !== currentAddr + 1) {
      if (line) out += line + '\n';
      out += `${addr.toString(16).padStart(8, '0')}: `;
      line = '';
    }
    const val = dataSegment.get(addr)!;
    line += (val & 0xFF).toString(16).padStart(2, '0') + ' ';
    currentAddr = addr;
  }
  if (line) out += line + '\n';

  return out;
}

export function generateVerilogMem(
  instructions: ParsedInstruction[],
  dataSegment: Map<number, number>,
  isa: 'mips' | 'riscv' = 'mips'
): string {
  let out = `// Architecture: ${isa.toUpperCase()}\n`;
  out += '// Instruction Memory Initialization (Word-addressed 32-bit array)\n';
  out += 'initial begin\n';
  
  instructions.forEach((inst, idx) => {
    const encoded = encodeInstruction(inst, isa);
    const hexVal = encoded.hex.replace('0x', '').padStart(8, '0');
    out += `  imem[${idx}] = 32'h${hexVal}; // [0x${(idx * 4).toString(16).padStart(8, '0')}] ${inst.raw.trim()}\n`;
  });
  out += 'end\n\n';

  out += '// Data Memory Initialization (Byte-addressed array)\n';
  out += 'initial begin\n';
  const sortedAddrs = Array.from(dataSegment.keys()).sort((a, b) => a - b);
  for (const addr of sortedAddrs) {
    const val = dataSegment.get(addr)! & 0xFF;
    out += `  dmem[32'h${addr.toString(16).padStart(8, '0')}] = 8'h${val.toString(16).padStart(2, '0')};\n`;
  }
  out += 'end\n';

  return out;
}

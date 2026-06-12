import type { ParsedInstruction } from './mipsParser';
import { encodeInstruction } from './encoder';

export function generateLogisimImage(instructions: ParsedInstruction[], dataSegment: Map<number, number>): string {
  let out = 'v2.0 raw\n';
  
  // Add instructions (starts at 0x0)
  // Usually instructions are 32-bit (4 bytes).
  // Logisim memory images are space-separated hex values.
  const instHex = instructions.map(inst => {
    const encoded = encodeInstruction(inst);
    return encoded.hex.replace('0x', '');
  });
  
  out += '# Instruction Memory\n';
  if (instHex.length > 0) {
    out += instHex.join(' ') + '\n';
  }

  out += '\n# Data Memory\n';
  // If we need to export data segment to a separate file or offset it,
  // we can do that here. Logisim allows addressing blocks like so:
  // 0000: 01 02 03
  // Let's assume data starts at 0x10000000 in our simulator, which we can't easily map to Logisim directly without offsets.
  // We'll write the data segment with address markers.
  const sortedAddrs = Array.from(dataSegment.keys()).sort((a, b) => a - b);
  let currentAddr = -1;
  let line = '';
  
  for (const addr of sortedAddrs) {
    if (currentAddr === -1 || addr !== currentAddr + 1) {
      if (line) out += line + '\n';
      out += `${addr.toString(16)}: `;
      line = '';
    }
    const val = dataSegment.get(addr)!;
    line += val.toString(16).padStart(2, '0') + ' ';
    currentAddr = addr;
  }
  if (line) out += line + '\n';

  return out;
}

export function generateVerilogMem(instructions: ParsedInstruction[], dataSegment: Map<number, number>): string {
  let out = '// Instruction Memory Initialization\n';
  out += 'initial begin\n';
  
  instructions.forEach((inst, idx) => {
    const encoded = encodeInstruction(inst);
    out += `  imem[${idx}] = 32'h${encoded.hex.replace('0x', '')}; // ${inst.raw.trim()}\n`;
  });
  out += 'end\n\n';

  out += '// Data Memory Initialization\n';
  out += 'initial begin\n';
  const sortedAddrs = Array.from(dataSegment.keys()).sort((a, b) => a - b);
  for (const addr of sortedAddrs) {
    const val = dataSegment.get(addr)!;
    out += `  dmem[32'h${addr.toString(16).padStart(8, '0')}] = 8'h${val.toString(16).padStart(2, '0')};\n`;
  }
  out += 'end\n';

  return out;
}

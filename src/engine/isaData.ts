export interface InstructionDef {
  name: string;
  syntax: string;
  format: 'R-type' | 'I-type' | 'J-type' | 'Pseudo';
  category: 'Arithmetic' | 'Logical' | 'Memory' | 'Branch/Jump' | 'System';
  description: string;
  example: string;
  encoding?: string;
}

export const ISA_DATA: InstructionDef[] = [
  // ── Arithmetic ──────────────────────────────────────────────────────────
  {
    name: 'add',
    syntax: 'add $rd, $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Adds the contents of two registers, storing the result in a third. Traps on overflow.',
    example: 'add $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100000'
  },
  {
    name: 'addi',
    syntax: 'addi $rt, $rs, imm',
    format: 'I-type',
    category: 'Arithmetic',
    description: 'Adds a register and a sign-extended immediate value. Traps on overflow.',
    example: 'addi $t0, $t1, -50',
    encoding: '001000 rs rt immediate'
  },
  {
    name: 'addiu',
    syntax: 'addiu $rt, $rs, imm',
    format: 'I-type',
    category: 'Arithmetic',
    description: 'Adds a register and a sign-extended immediate value. Does not trap on overflow.',
    example: 'addiu $t0, $t1, 100',
    encoding: '001001 rs rt immediate'
  },
  {
    name: 'addu',
    syntax: 'addu $rd, $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Adds the contents of two registers. Does not trap on overflow.',
    example: 'addu $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100001'
  },
  {
    name: 'sub',
    syntax: 'sub $rd, $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Subtracts $rt from $rs. Traps on overflow.',
    example: 'sub $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100010'
  },
  {
    name: 'subu',
    syntax: 'subu $rd, $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Subtracts $rt from $rs. Does not trap on overflow.',
    example: 'subu $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100011'
  },
  {
    name: 'mult',
    syntax: 'mult $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Multiplies two registers. Stores 64-bit result in HI and LO registers.',
    example: 'mult $t0, $t1',
    encoding: '000000 rs rt 00000 00000 011000'
  },
  {
    name: 'div',
    syntax: 'div $rs, $rt',
    format: 'R-type',
    category: 'Arithmetic',
    description: 'Divides $rs by $rt. Quotient is stored in LO, remainder in HI.',
    example: 'div $t0, $t1',
    encoding: '000000 rs rt 00000 00000 011010'
  },
  
  // ── Logical ─────────────────────────────────────────────────────────────
  {
    name: 'and',
    syntax: 'and $rd, $rs, $rt',
    format: 'R-type',
    category: 'Logical',
    description: 'Bitwise AND of two registers.',
    example: 'and $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100100'
  },
  {
    name: 'andi',
    syntax: 'andi $rt, $rs, imm',
    format: 'I-type',
    category: 'Logical',
    description: 'Bitwise AND of a register and a zero-extended immediate.',
    example: 'andi $t0, $t1, 0xFF',
    encoding: '001100 rs rt immediate'
  },
  {
    name: 'or',
    syntax: 'or $rd, $rs, $rt',
    format: 'R-type',
    category: 'Logical',
    description: 'Bitwise OR of two registers.',
    example: 'or $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100101'
  },
  {
    name: 'ori',
    syntax: 'ori $rt, $rs, imm',
    format: 'I-type',
    category: 'Logical',
    description: 'Bitwise OR of a register and a zero-extended immediate.',
    example: 'ori $t0, $t1, 0xFFFF',
    encoding: '001101 rs rt immediate'
  },
  {
    name: 'xor',
    syntax: 'xor $rd, $rs, $rt',
    format: 'R-type',
    category: 'Logical',
    description: 'Bitwise XOR of two registers.',
    example: 'xor $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 100110'
  },
  {
    name: 'sll',
    syntax: 'sll $rd, $rt, shamt',
    format: 'R-type',
    category: 'Logical',
    description: 'Shift Left Logical. Shifts $rt left by shamt bits, filling with zeros.',
    example: 'sll $t0, $t1, 2',
    encoding: '000000 00000 rt rd shamt 000000'
  },
  {
    name: 'srl',
    syntax: 'srl $rd, $rt, shamt',
    format: 'R-type',
    category: 'Logical',
    description: 'Shift Right Logical. Shifts $rt right by shamt bits, filling with zeros.',
    example: 'srl $t0, $t1, 2',
    encoding: '000000 00000 rt rd shamt 000010'
  },
  {
    name: 'slt',
    syntax: 'slt $rd, $rs, $rt',
    format: 'R-type',
    category: 'Logical',
    description: 'Set on Less Than. If $rs < $rt, $rd = 1, else $rd = 0 (signed).',
    example: 'slt $t0, $t1, $t2',
    encoding: '000000 rs rt rd 00000 101010'
  },
  
  // ── Memory ──────────────────────────────────────────────────────────────
  {
    name: 'lw',
    syntax: 'lw $rt, offset($rs)',
    format: 'I-type',
    category: 'Memory',
    description: 'Load Word. Loads a 32-bit word from memory into $rt. Address must be word-aligned.',
    example: 'lw $t0, 4($sp)',
    encoding: '100011 rs rt offset'
  },
  {
    name: 'sw',
    syntax: 'sw $rt, offset($rs)',
    format: 'I-type',
    category: 'Memory',
    description: 'Store Word. Stores a 32-bit word from $rt into memory. Address must be word-aligned.',
    example: 'sw $t0, 0($sp)',
    encoding: '101011 rs rt offset'
  },
  {
    name: 'lb',
    syntax: 'lb $rt, offset($rs)',
    format: 'I-type',
    category: 'Memory',
    description: 'Load Byte. Loads a byte from memory and sign-extends it into $rt.',
    example: 'lb $t0, 0($t1)',
    encoding: '100000 rs rt offset'
  },
  {
    name: 'sb',
    syntax: 'sb $rt, offset($rs)',
    format: 'I-type',
    category: 'Memory',
    description: 'Store Byte. Stores the lowest byte of $rt into memory.',
    example: 'sb $t0, 0($t1)',
    encoding: '101000 rs rt offset'
  },
  {
    name: 'lui',
    syntax: 'lui $rt, imm',
    format: 'I-type',
    category: 'Memory',
    description: 'Load Upper Immediate. Loads a 16-bit immediate into the upper half of $rt, clearing the lower half.',
    example: 'lui $t0, 0x1001',
    encoding: '001111 00000 rt immediate'
  },

  // ── Branch/Jump ─────────────────────────────────────────────────────────
  {
    name: 'beq',
    syntax: 'beq $rs, $rt, label',
    format: 'I-type',
    category: 'Branch/Jump',
    description: 'Branch on Equal. Branches to target address if $rs == $rt.',
    example: 'beq $t0, $t1, loop',
    encoding: '000100 rs rt offset'
  },
  {
    name: 'bne',
    syntax: 'bne $rs, $rt, label',
    format: 'I-type',
    category: 'Branch/Jump',
    description: 'Branch on Not Equal. Branches to target address if $rs != $rt.',
    example: 'bne $t0, $zero, loop',
    encoding: '000101 rs rt offset'
  },
  {
    name: 'j',
    syntax: 'j label',
    format: 'J-type',
    category: 'Branch/Jump',
    description: 'Jump. Unconditionally jumps to the specified pseudo-direct address.',
    example: 'j main',
    encoding: '000010 target'
  },
  {
    name: 'jal',
    syntax: 'jal label',
    format: 'J-type',
    category: 'Branch/Jump',
    description: 'Jump and Link. Jumps to target and stores return address (PC+4) in $ra.',
    example: 'jal function',
    encoding: '000011 target'
  },
  {
    name: 'jr',
    syntax: 'jr $rs',
    format: 'R-type',
    category: 'Branch/Jump',
    description: 'Jump Register. Unconditionally jumps to the address stored in $rs.',
    example: 'jr $ra',
    encoding: '000000 rs 00000 00000 00000 001000'
  },

  // ── System ──────────────────────────────────────────────────────────────
  {
    name: 'syscall',
    syntax: 'syscall',
    format: 'R-type',
    category: 'System',
    description: 'System Call. Executes the OS service specified by the value in $v0.',
    example: 'syscall',
    encoding: '000000 00000 00000 00000 00000 001100'
  },
  {
    name: 'la',
    syntax: 'la $rd, label',
    format: 'Pseudo',
    category: 'System',
    description: 'Load Address. Pseudo-instruction that expands to lui and ori to load a 32-bit address.',
    example: 'la $a0, message',
  },
  {
    name: 'li',
    syntax: 'li $rd, imm',
    format: 'Pseudo',
    category: 'System',
    description: 'Load Immediate. Pseudo-instruction that loads a 32-bit constant into a register.',
    example: 'li $v0, 10',
  },
  {
    name: 'move',
    syntax: 'move $rd, $rs',
    format: 'Pseudo',
    category: 'System',
    description: 'Move. Pseudo-instruction that copies $rs to $rd (expands to addu $rd, $zero, $rs).',
    example: 'move $a0, $v0',
  },
  {
    name: 'nop',
    syntax: 'nop',
    format: 'Pseudo',
    category: 'System',
    description: 'No Operation. Does nothing. Expands to sll $zero, $zero, 0.',
    example: 'nop',
  }
];

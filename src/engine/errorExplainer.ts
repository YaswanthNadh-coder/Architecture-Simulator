// ── Error Explainer ─────────────────────────────────────────────────────────
// Maps assembler error messages to human-readable, teaching-oriented explanations.
// Used in the editor to help students understand and fix their mistakes.

interface ErrorPattern {
  pattern: RegExp;
  explain: (match: RegExpMatchArray, line: string) => string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /unknown instruction[:\s]*['"]?(\w+)['"]?/i,
    explain: (m, line) =>
      `"${m[1] || line.trim()}" is not a recognized MIPS instruction. ` +
      `Check your spelling — common instructions include: add, addi, sub, lw, sw, beq, bne, j, jal, jr, sll, srl, and, or, nor, slt, slti, mult, div, mflo, mfhi.`,
  },
  {
    pattern: /invalid register[:\s]*['"]?(\$?\w+)['"]?/i,
    explain: (m) =>
      `The register "${m[1]}" doesn't exist in MIPS. Valid registers are:\n` +
      `• $zero ($0) — always zero\n` +
      `• $at ($1) — assembler temporary (avoid using directly)\n` +
      `• $v0–$v1 ($2–$3) — function return values\n` +
      `• $a0–$a3 ($4–$7) — function arguments\n` +
      `• $t0–$t9 ($8–$15, $24–$25) — temporaries (caller-saved)\n` +
      `• $s0–$s7 ($16–$23) — saved registers (callee-saved)\n` +
      `• $sp ($29), $ra ($31) — stack pointer and return address`,
  },
  {
    pattern: /immediate.*out of range|immediate.*too large|immediate.*overflow/i,
    explain: () =>
      `The immediate value (the constant number) is outside the 16-bit signed range (-32768 to 32767). ` +
      `To load larger constants, use:\n` +
      `  lui $t0, upper16bits    # Load upper 16 bits\n` +
      `  ori $t0, $t0, lower16   # OR in lower 16 bits\n` +
      `Or use the pseudo-instruction: li $t0, large_value`,
  },
  {
    pattern: /unexpected token|syntax error/i,
    explain: (_, line) =>
      `There's a syntax error on this line: "${line.trim()}". ` +
      `Check for:\n` +
      `• Missing commas between operands (e.g., "add $t0, $t1, $t2" not "add $t0 $t1 $t2")\n` +
      `• Extra characters or misplaced parentheses\n` +
      `• Labels must end with a colon (e.g., "loop:")\n` +
      `• Comments start with # (e.g., "# this is a comment")`,
  },
  {
    pattern: /duplicate label[:\s]*['"]?(\w+)['"]?/i,
    explain: (m) =>
      `The label "${m[1]}" is defined more than once. Each label must be unique within your program. ` +
      `Rename one of them — for example, "${m[1]}_2" or use a more descriptive name.`,
  },
  {
    pattern: /undefined label[:\s]*['"]?(\w+)['"]?|label.*not found[:\s]*['"]?(\w+)['"]?/i,
    explain: (m) => {
      const label = m[1] || m[2];
      return (
        `The label "${label}" is used but never defined. Make sure:\n` +
        `• The label is spelled exactly the same (labels are case-sensitive)\n` +
        `• The label definition ends with a colon: "${label}:"\n` +
        `• The label appears somewhere in your program (before or after the branch/jump)`
      );
    },
  },
  {
    pattern: /too many operands|wrong number of operands|expected \d+ operands/i,
    explain: (_, line) => {
      const inst = line.trim().split(/\s+/)[0] || '';
      return (
        `Wrong number of operands for "${inst}". Common formats:\n` +
        `• R-type: add $rd, $rs, $rt (3 registers)\n` +
        `• I-type: addi $rt, $rs, imm (2 registers + immediate)\n` +
        `• Load/Store: lw $rt, offset($rs) (register + offset with base register)\n` +
        `• Branch: beq $rs, $rt, label (2 registers + label)\n` +
        `• Jump: j label (just a label)`
      );
    },
  },
  {
    pattern: /invalid offset|offset.*out of range/i,
    explain: () =>
      `The memory offset value is invalid. For load/store instructions, the offset must be a 16-bit signed value (-32768 to 32767). ` +
      `Format: lw $t0, offset($base) — for example: lw $t0, 0($sp) or sw $t1, -4($sp). ` +
      `If you need a larger offset, compute the address in a register first using lui/addi.`,
  },
  {
    pattern: /blocked instruction[:\s]*['"]?(\w+)['"]?|instruction.*not allowed/i,
    explain: (m) =>
      `The instruction "${m[1] || ''}" is blocked for this assignment. ` +
      `Your instructor has restricted certain instructions to challenge you to find alternative approaches. ` +
      `Try using different instructions to achieve the same result.`,
  },
  {
    pattern: /missing.*operand|expected.*register|expected.*immediate/i,
    explain: (_, line) =>
      `This instruction is missing one or more required operands: "${line.trim()}". ` +
      `Make sure each instruction has all its required arguments separated by commas.`,
  },
  {
    pattern: /invalid.*address|alignment|unaligned/i,
    explain: () =>
      `Memory alignment error. In MIPS:\n` +
      `• lw/sw (word) — addresses must be divisible by 4\n` +
      `• lh/sh (halfword) — addresses must be divisible by 2\n` +
      `• lb/sb (byte) — any address is fine\n` +
      `Make sure your stack pointer and data addresses stay word-aligned.`,
  },
  {
    pattern: /stack overflow|stack.*exceeded/i,
    explain: () =>
      `Stack overflow — the stack pointer ($sp) went below the allowed range. ` +
      `This usually means:\n` +
      `• A recursive function has no base case (infinite recursion)\n` +
      `• You're allocating too much stack space\n` +
      `• You forgot to restore $sp before returning (addi $sp, $sp, N)`,
  },
  {
    pattern: /data segment|\.data|\.text/i,
    explain: (_, line) =>
      `Directive error near "${line.trim()}". Remember:\n` +
      `• .data — starts the data segment (for variables, strings, arrays)\n` +
      `• .text — starts the code segment (for instructions)\n` +
      `• .word, .half, .byte — declare data values\n` +
      `• .asciiz — declare a null-terminated string\n` +
      `• .space N — reserve N bytes of uninitialized memory`,
  },
];

/**
 * Takes a raw assembler error message and the source line it refers to,
 * and returns a human-readable explanation with teaching guidance.
 */
export function explainError(errorMessage: string, sourceLine: string = ''): string {
  for (const entry of ERROR_PATTERNS) {
    const match = errorMessage.match(entry.pattern);
    if (match) {
      return entry.explain(match, sourceLine);
    }
  }
  // Fallback — return the original error with a generic tip
  return errorMessage;
}

/**
 * Wraps an error object to add an explanation field.
 */
export function enrichError(error: { message: string; line?: number; sourceLine?: string }): {
  message: string;
  explanation: string;
  line?: number;
  sourceLine?: string;
} {
  return {
    ...error,
    explanation: explainError(error.message, error.sourceLine || ''),
  };
}

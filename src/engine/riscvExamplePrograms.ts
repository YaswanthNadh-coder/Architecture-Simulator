/**
 * RISC-V RV32I Example Programs Library
 * Annotated programs demonstrating various pipeline concepts using RISC-V ISA.
 */

import type { ExampleProgram } from './examplePrograms';

export const RISCV_EXAMPLE_PROGRAMS: ExampleProgram[] = [
  {
    id: 'rv-hello-world',
    name: 'Hello World (RISC-V)',
    category: 'syscalls',
    description: 'Print a string using ecall. Demonstrates .data section and la pseudo-instruction.',
    difficulty: 'Beginner',
    tags: ['ecall', 'data-segment'],
    code: `# Hello World — RISC-V RV32I
# Uses ecall (a7=4) to print a string

.data
msg:    .string "Hello, World from RISC-V!\\n"

.text
main:
  li    a7, 4          # ecall 4 = print_string
  la    a0, msg        # a0 = address of string
  ecall

  li    a7, 10         # ecall 10 = exit
  ecall
`,
  },
  {
    id: 'rv-fibonacci',
    name: 'Fibonacci Loop (RISC-V)',
    category: 'basics',
    description: 'Compute Fibonacci numbers iteratively. Shows data hazards and forwarding paths.',
    difficulty: 'Intermediate',
    tags: ['loops', 'data-hazards', 'forwarding'],
    code: `# Fibonacci Loop — RISC-V RV32I
# Demonstrates data hazards & forwarding

.text
main:
  li    t0, 0          # fib(n-2) = 0
  li    t1, 1          # fib(n-1) = 1
  li    t3, 10         # compute 10 numbers

loop:
  add   t2, t0, t1     # fib = fib(n-2) + fib(n-1)
  mv    t0, t1         # advance fib(n-2)
  mv    t1, t2         # advance fib(n-1) — data hazard on t2
  addi  t3, t3, -1     # decrement counter
  bne   t3, zero, loop

  # Print result
  li    a7, 1
  mv    a0, t2
  ecall

  li    a7, 10
  ecall
`,
  },
  {
    id: 'rv-data-hazard',
    name: 'Data Hazard Showcase (RISC-V)',
    category: 'hazards',
    description: 'Demonstrates RAW data hazards in RISC-V. Toggle forwarding OFF to see stalls.',
    difficulty: 'Beginner',
    tags: ['data-hazards', 'stalls', 'load-use'],
    code: `# Data Hazard Showcase — RISC-V RV32I
# Toggle forwarding OFF to see stalls!

.text
main:
  # Back-to-back RAW hazard chain
  addi  t0, zero, 10   # t0 = 10
  addi  t1, t0, 20     # t1 = t0 + 20  — RAW on t0
  add   t2, t0, t1     # t2 = t0 + t1  — RAW on t1
  sub   t3, t2, t0     # t3 = t2 - t0  — RAW on t2

  # Load-use hazard (always causes 1 stall even with forwarding)
  sw    t3, 0(sp)       # store t3
  lw    t4, 0(sp)       # load from same address
  add   t5, t4, t0     # use t4 immediately — LOAD-USE HAZARD

  # No hazard (independent instructions)
  addi  s0, zero, 100
  addi  s1, zero, 200
  add   s2, s0, s1     # s0 and s1 are ready

  li    a7, 10
  ecall
`,
  },
  {
    id: 'rv-forwarding',
    name: 'Forwarding Demo (RISC-V)',
    category: 'hazards',
    description: 'Shows EX→EX and MEM→EX forwarding paths in RV32I.',
    difficulty: 'Intermediate',
    tags: ['forwarding', 'data-hazards'],
    code: `# Forwarding Path Demo — RISC-V RV32I
# Run with forwarding ON, then OFF, and compare cycles

.text
main:
  # EX→EX Forwarding (1 cycle gap)
  addi  t0, zero, 5    # t0 = 5
  add   t1, t0, t0     # needs t0 from previous EX stage

  # MEM→EX Forwarding (2 cycle gap)
  addi  t2, zero, 3
  nop                   # creates 1 cycle gap
  add   t3, t2, t2     # needs t2 from MEM stage

  # Load-Use: even forwarding can't help
  lw    t4, 0(sp)
  add   t5, t4, t0     # STALL! t4 not available until end of MEM

  # No stall: instruction between load and use
  lw    s0, 0(sp)
  addi  s1, zero, 42   # unrelated instruction fills the gap
  add   s2, s0, s1     # s0 ready via MEM→EX forwarding

  li    a7, 10
  ecall
`,
  },
  {
    id: 'rv-factorial',
    name: 'Factorial Recursive (RISC-V)',
    category: 'algorithms',
    description: 'Compute n! recursively using the stack. Demonstrates jal/jalr and stack frames.',
    difficulty: 'Advanced',
    tags: ['recursion', 'stack', 'functions'],
    code: `# Recursive Factorial — RISC-V RV32I
# Computes n! using recursive calls and the stack

.text
main:
  li    a0, 6          # compute 6!
  call  factorial
  mv    a0, a0         # result already in a0
  li    a7, 1          # print result (720)
  ecall
  li    a7, 10
  ecall

factorial:
  addi  sp, sp, -8     # push stack frame
  sw    ra, 4(sp)      # save return address
  sw    a0, 0(sp)      # save n

  li    t0, 2
  blt   a0, t0, base_case

  addi  a0, a0, -1     # n - 1
  call  factorial       # factorial(n-1) → result in a0

  lw    t0, 0(sp)      # restore n
  lw    ra, 4(sp)      # restore return address
  addi  sp, sp, 8      # pop stack

  # Multiply: a0 = a0 * t0 (simple loop multiplication)
  mv    t1, a0         # t1 = factorial(n-1)
  li    a0, 0          # result = 0
mul_loop:
  beq   t0, zero, mul_done
  add   a0, a0, t1     # result += factorial(n-1)
  addi  t0, t0, -1
  j     mul_loop
mul_done:
  ret

base_case:
  li    a0, 1          # return 1
  lw    ra, 4(sp)
  addi  sp, sp, 8
  ret
`,
  },
];

export const RISCV_CATEGORIES = [
  { id: 'basics', label: 'Basics', icon: '📘' },
  { id: 'algorithms', label: 'Algorithms', icon: '🧮' },
  { id: 'hazards', label: 'Pipeline Hazards', icon: '⚠️' },
  { id: 'syscalls', label: 'I/O & Ecall', icon: '💬' },
];

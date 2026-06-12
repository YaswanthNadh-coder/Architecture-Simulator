/**
 * Example MIPS Programs Library
 * Annotated programs demonstrating various pipeline concepts.
 */

export interface ExampleProgram {
  id: string;
  name: string;
  category: 'basics' | 'algorithms' | 'hazards' | 'syscalls';
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  code: string;
}

export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
  // ── Basics ──────────────────────────────────────────────────────────
  {
    id: 'hello-world',
    name: 'Hello World',
    category: 'syscalls',
    description: 'Print a string using syscall 4. Demonstrates .data section and la instruction.',
    difficulty: 'Beginner',
    tags: ['syscalls', 'data-segment'],
    code: `# Hello World — MIPS Syscall Demo
# Uses syscall 4 (print_string) to output a message

.data
msg:    .asciiz "Hello, World!\\n"

.text
main:
  li    $v0, 4          # syscall 4 = print_string
  la    $a0, msg        # $a0 = address of string
  syscall

  li    $v0, 10         # syscall 10 = exit
  syscall
`,
  },
  {
    id: 'fibonacci-loop',
    name: 'Fibonacci (Loop)',
    category: 'basics',
    description: 'Compute Fibonacci numbers iteratively. Shows data hazards and MEM→EX forwarding.',
    difficulty: 'Intermediate',
    tags: ['loops', 'data-hazards', 'forwarding'],
    code: `# Fibonacci Loop — Pipeline Demo
# Demonstrates data hazards & forwarding

.text
main:
  addi  $t0, $zero, 0   # fib(n-2) = 0
  addi  $t1, $zero, 1   # fib(n-1) = 1
  addi  $t3, $zero, 10  # compute 10 numbers

loop:
  add   $t2, $t0, $t1   # fib = fib(n-2) + fib(n-1)
  add   $t0, $t1, $zero # advance fib(n-2)
  add   $t1, $t2, $zero # advance fib(n-1)  ← data hazard on $t2
  addi  $t3, $t3, -1    # decrement counter
  bne   $t3, $zero, loop

  # Print result
  li    $v0, 1
  add   $a0, $t2, $zero
  syscall

  li    $v0, 10
  syscall
`,
  },
  {
    id: 'fibonacci-recursive',
    name: 'Fibonacci (Recursive)',
    category: 'algorithms',
    description: 'Recursive Fibonacci using the stack. Demonstrates jal/jr, stack frames, and $ra.',
    difficulty: 'Advanced',
    tags: ['recursion', 'stack', 'functions'],
    code: `# Recursive Fibonacci
# Demonstrates stack usage, jal/jr, and nested function calls

.text
main:
  addi  $a0, $zero, 7   # compute fib(7)
  jal   fib              # call fib
  add   $a0, $v0, $zero # move result to $a0
  li    $v0, 1           # print result
  syscall
  li    $v0, 10          # exit
  syscall

fib:
  # Base case: if n <= 1, return n
  addi  $sp, $sp, -12   # allocate stack frame
  sw    $ra, 8($sp)      # save return address
  sw    $s0, 4($sp)      # save $s0
  sw    $s1, 0($sp)      # save $s1

  add   $s0, $a0, $zero # $s0 = n
  slti  $t0, $s0, 2     # $t0 = (n < 2)
  beq   $t0, $zero, recurse

  add   $v0, $s0, $zero # return n
  j     fib_done

recurse:
  addi  $a0, $s0, -1    # fib(n-1)
  jal   fib
  add   $s1, $v0, $zero # $s1 = fib(n-1)

  addi  $a0, $s0, -2    # fib(n-2)
  jal   fib
  add   $v0, $v0, $s1   # return fib(n-2) + fib(n-1)

fib_done:
  lw    $s1, 0($sp)
  lw    $s0, 4($sp)
  lw    $ra, 8($sp)
  addi  $sp, $sp, 12
  jr    $ra
`,
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'algorithms',
    description: 'Sort an array using bubble sort. Heavy use of .data, lw/sw, and branch instructions.',
    difficulty: 'Intermediate',
    tags: ['arrays', 'loops', 'memory'],
    code: `# Bubble Sort
# Sorts an array of integers in ascending order

.data
array:  .word 64, 25, 12, 22, 11, 90, 45, 33
size:   .word 8
newline: .asciiz "\\n"

.text
main:
  la    $s0, array       # $s0 = base address
  lw    $s1, size        # $s1 = array size (label resolved)
  addi  $s1, $zero, 8   # size = 8

outer:
  addi  $t0, $zero, 0   # swapped = false
  addi  $t1, $zero, 0   # i = 0
  addi  $t2, $s1, -1    # limit = size - 1

inner:
  beq   $t1, $t2, check_swap

  # Load array[i] and array[i+1]
  sll   $t3, $t1, 2     # offset = i * 4
  add   $t3, $s0, $t3   # addr = base + offset
  lw    $t4, 0($t3)     # array[i]
  lw    $t5, 4($t3)     # array[i+1]

  # Compare and swap if needed
  slt   $t6, $t5, $t4   # if array[i+1] < array[i]
  beq   $t6, $zero, no_swap

  sw    $t5, 0($t3)     # swap: array[i] = array[i+1]
  sw    $t4, 4($t3)     # swap: array[i+1] = array[i]
  addi  $t0, $zero, 1   # swapped = true

no_swap:
  addi  $t1, $t1, 1     # i++
  j     inner

check_swap:
  bne   $t0, $zero, outer  # if swapped, repeat

  # Print sorted array
  addi  $t1, $zero, 0
print_loop:
  beq   $t1, $s1, done
  sll   $t3, $t1, 2
  add   $t3, $s0, $t3
  lw    $a0, 0($t3)
  li    $v0, 1
  syscall
  li    $v0, 11          # print space
  li    $a0, 32
  syscall
  addi  $t1, $t1, 1
  j     print_loop

done:
  li    $v0, 10
  syscall
`,
  },
  {
    id: 'factorial',
    name: 'Factorial (Recursive)',
    category: 'algorithms',
    description: 'Compute n! recursively. Demonstrates stack frame management and jal/jr.',
    difficulty: 'Advanced',
    tags: ['recursion', 'stack', 'math'],
    code: `# Recursive Factorial
# Computes n! using recursive calls and the stack

.text
main:
  addi  $a0, $zero, 6   # compute 6!
  jal   factorial
  add   $a0, $v0, $zero # result to $a0
  li    $v0, 1           # print result (720)
  syscall
  li    $v0, 10
  syscall

factorial:
  addi  $sp, $sp, -8    # push stack frame
  sw    $ra, 4($sp)     # save return address
  sw    $a0, 0($sp)     # save n

  slti  $t0, $a0, 2     # if n < 2
  beq   $t0, $zero, recurse_fact

  addi  $v0, $zero, 1   # base case: return 1
  addi  $sp, $sp, 8     # pop stack
  jr    $ra

recurse_fact:
  addi  $a0, $a0, -1    # n - 1
  jal   factorial        # factorial(n-1)

  lw    $a0, 0($sp)     # restore n
  lw    $ra, 4($sp)     # restore return address
  addi  $sp, $sp, 8     # pop stack

  mult  $a0, $v0        # n * factorial(n-1)
  mflo  $v0
  jr    $ra
`,
  },
  // ── Hazard Demos ────────────────────────────────────────────────────
  {
    id: 'data-hazard-demo',
    name: 'Data Hazard Showcase',
    category: 'hazards',
    description: 'Demonstrates RAW data hazards. Toggle forwarding to see the difference in stall cycles.',
    difficulty: 'Beginner',
    tags: ['data-hazards', 'stalls', 'load-use'],
    code: `# Data Hazard Showcase
# Toggle forwarding OFF to see stalls!

.text
main:
  # Back-to-back RAW hazard chain
  addi  $t0, $zero, 10  # $t0 = 10
  addi  $t1, $t0, 20    # $t1 = $t0 + 20  ← RAW on $t0
  add   $t2, $t0, $t1   # $t2 = $t0 + $t1 ← RAW on $t1
  sub   $t3, $t2, $t0   # $t3 = $t2 - $t0 ← RAW on $t2

  # Load-use hazard (always causes 1 stall even with forwarding)
  sw    $t3, 0($sp)      # store $t3
  lw    $t4, 0($sp)      # load from same address
  add   $t5, $t4, $t0   # use $t4 immediately ← LOAD-USE HAZARD

  # No hazard (independent instructions)
  addi  $s0, $zero, 100
  addi  $s1, $zero, 200
  add   $s2, $s0, $s1   # $s0 and $s1 are ready

  li    $v0, 10
  syscall
`,
  },
  {
    id: 'forwarding-demo',
    name: 'Forwarding Demo',
    category: 'hazards',
    description: 'Shows EX→EX and MEM→EX forwarding paths in action.',
    difficulty: 'Intermediate',
    tags: ['forwarding', 'data-hazards'],
    code: `# Forwarding Path Demo
# Run with forwarding ON, then OFF, and compare cycle counts

.text
main:
  # EX→EX Forwarding (1 cycle gap)
  addi  $t0, $zero, 5    # $t0 = 5
  add   $t1, $t0, $t0    # needs $t0 from previous EX stage

  # MEM→EX Forwarding (2 cycle gap)
  addi  $t2, $zero, 3
  nop                      # creates 1 cycle gap
  add   $t3, $t2, $t2    # needs $t2 from MEM stage

  # Load-Use: even forwarding can't help (data in MEM, needed in EX)
  lw    $t4, 0($sp)
  add   $t5, $t4, $t0    # STALL! $t4 not available until end of MEM

  # No stall: instruction between load and use
  lw    $t6, 0($sp)
  addi  $t7, $zero, 42   # unrelated instruction fills the gap
  add   $t8, $t6, $t7    # $t6 ready via MEM→EX forwarding

  li    $v0, 10
  syscall
`,
  },
  {
    id: 'branch-hazard',
    name: 'Branch Prediction Demo',
    category: 'hazards',
    description: 'Shows pipeline flushes caused by branch mispredictions (predict-not-taken).',
    difficulty: 'Intermediate',
    tags: ['control-hazards', 'branch-prediction', 'flushes'],
    code: `# Branch Prediction Demo
# Our pipeline uses predict-not-taken strategy

.text
main:
  addi  $t0, $zero, 3

loop:
  addi  $t0, $t0, -1
  bne   $t0, $zero, loop # Taken 2 times → 2 flushes
                          # Not taken 1 time → correct prediction

  # Watch the flush count in the Performance panel
  li    $v0, 10
  syscall
`,
  },
  // ── Syscall Demos ───────────────────────────────────────────────────
  {
    id: 'io-demo',
    name: 'Input/Output Demo',
    category: 'syscalls',
    description: 'Read an integer from the user, double it, and print the result.',
    difficulty: 'Beginner',
    tags: ['syscalls', 'io', 'math'],
    code: `# I/O Demo — Read, Compute, Print
# Uses syscalls 5 (read_int) and 1 (print_int)

.data
prompt: .asciiz "Enter a number: "
result: .asciiz "\\nDoubled: "

.text
main:
  # Print prompt
  li    $v0, 4
  la    $a0, prompt
  syscall

  # Read integer
  li    $v0, 5           # read_int
  syscall                # result in $v0

  # Double it
  add   $t0, $v0, $v0   # $t0 = input * 2

  # Print result label
  li    $v0, 4
  la    $a0, result
  syscall

  # Print doubled value
  li    $v0, 1
  add   $a0, $t0, $zero
  syscall

  li    $v0, 10
  syscall
`,
  },
  {
    id: 'gcd',
    name: 'GCD (Euclidean)',
    category: 'algorithms',
    description: 'Compute GCD of two numbers using the Euclidean algorithm.',
    difficulty: 'Intermediate',
    tags: ['math', 'loops', 'division'],
    code: `# GCD — Euclidean Algorithm
# Computes gcd(a, b) iteratively

.text
main:
  addi  $a0, $zero, 48  # a = 48
  addi  $a1, $zero, 18  # b = 18

gcd_loop:
  beq   $a1, $zero, gcd_done
  div   $a0, $a1        # a / b
  mfhi  $t0              # remainder = a % b
  add   $a0, $a1, $zero # a = b
  add   $a1, $t0, $zero # b = remainder
  j     gcd_loop

gcd_done:
  # Print GCD
  li    $v0, 1
  syscall                # prints $a0 = gcd (should be 6)

  li    $v0, 10
  syscall
`,
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'algorithms',
    description: 'Search for a value in a sorted array using binary search.',
    difficulty: 'Advanced',
    tags: ['algorithms', 'arrays', 'branching'],
    code: `# Binary Search
# Searches a sorted array for a target value

.data
sorted: .word 2, 5, 8, 12, 16, 23, 38, 56, 72, 91
size:   .word 10

.text
main:
  la    $s0, sorted      # base address
  addi  $s1, $zero, 10   # size
  addi  $s2, $zero, 23   # target to find

  addi  $t0, $zero, 0    # low = 0
  addi  $t1, $s1, -1     # high = size - 1

search:
  slt   $t5, $t1, $t0    # if high < low
  bne   $t5, $zero, not_found

  add   $t2, $t0, $t1    # mid = (low + high) / 2
  srl   $t2, $t2, 1

  sll   $t3, $t2, 2      # offset = mid * 4
  add   $t3, $s0, $t3
  lw    $t4, 0($t3)      # arr[mid]

  beq   $t4, $s2, found  # if arr[mid] == target

  slt   $t5, $t4, $s2    # if arr[mid] < target
  bne   $t5, $zero, go_right

  addi  $t1, $t2, -1     # high = mid - 1
  j     search

go_right:
  addi  $t0, $t2, 1      # low = mid + 1
  j     search

found:
  add   $a0, $t2, $zero  # print index
  li    $v0, 1
  syscall
  li    $v0, 10
  syscall

not_found:
  li    $a0, -1           # print -1
  li    $v0, 1
  syscall
  li    $v0, 10
  syscall
`,
  },
  {
    id: 'cache-locality',
    name: 'Cache Spatial Locality',
    category: 'algorithms',
    description: 'Demonstrates spatial locality by accessing an array sequentially. Turn on Cache Simulator to see high hit rates.',
    difficulty: 'Intermediate',
    tags: ['cache', 'memory', 'arrays'],
    code: `# Cache Spatial Locality Demo
# Accessing elements sequentially benefits from larger cache block sizes.

.data
array:  .word 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
size:   .word 16

.text
main:
  la    $s0, array        # $s0 = base address
  lw    $s1, size         # $s1 = size
  addi  $t0, $zero, 0     # i = 0
  addi  $t1, $zero, 0     # sum = 0

loop:
  beq   $t0, $s1, done    # if i == size, done
  
  sll   $t2, $t0, 2       # offset = i * 4
  add   $t3, $s0, $t2     # addr = base + offset
  lw    $t4, 0($t3)       # load array[i]
  
  add   $t1, $t1, $t4     # sum += array[i]
  addi  $t0, $t0, 1       # i++
  j     loop

done:
  # sum is in $t1 (should be 136)
  add   $a0, $t1, $zero
  li    $v0, 1
  syscall
  li    $v0, 10
  syscall
`,
  },
  {
    id: 'cache-thrashing',
    name: 'Cache Thrashing',
    category: 'hazards',
    description: 'Demonstrates cache thrashing in a direct-mapped cache by alternating accesses to addresses that map to the same set.',
    difficulty: 'Advanced',
    tags: ['cache', 'memory', 'performance'],
    code: `# Cache Thrashing Demo
# Configure cache to 256B Direct-Mapped.
# Addresses 0x10010000 and 0x10010100 will map to the same set (index 0).
# Alternating accesses cause 100% miss rate!

.text
main:
  lui   $s0, 0x1001       # Base address 1: 0x10010000
  lui   $s1, 0x1001
  ori   $s1, $s1, 0x0100  # Base address 2: 0x10010100 (256 bytes later)
  
  addi  $t0, $zero, 0     # counter = 0
  addi  $t1, $zero, 5     # loop 5 times (10 accesses)

loop:
  beq   $t0, $t1, done
  
  lw    $t2, 0($s0)       # Access 1 -> Miss (replaces block 0)
  lw    $t3, 0($s1)       # Access 2 -> Miss (replaces block 0 again!)
  
  addi  $t0, $t0, 1
  j     loop

done:
  li    $v0, 10
  syscall
`,
  }
];

export function getProgramsByCategory(category: string): ExampleProgram[] {
  return EXAMPLE_PROGRAMS.filter(p => p.category === category);
}

export const CATEGORIES = [
  { id: 'basics', label: 'Basics', icon: '📘' },
  { id: 'algorithms', label: 'Algorithms', icon: '🧮' },
  { id: 'hazards', label: 'Pipeline Hazards', icon: '⚠️' },
  { id: 'syscalls', label: 'I/O & Syscalls', icon: '💬' },
];

/**
 * Structured Tutorial Lessons
 * 10 interactive guided lessons for teaching pipeline concepts.
 * Each lesson loads a specific program, steps through it, and quizzes the student.
 */

export interface TutorialQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TutorialStep {
  type: 'instruction' | 'step-simulation' | 'question' | 'observe' | 'challenge';
  title: string;
  content: string;
  highlightStage?: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
  highlightLine?: number;
  autoStep?: number;
  question?: TutorialQuestion;
}

export interface TutorialLesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  steps: TutorialStep[];
  program: string;
  settings?: {
    forwarding?: boolean;
    branchPrediction?: 'not-taken' | 'always-taken';
  };
}

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  // ── Lesson 1: What is Pipelining? ──────────────────────────────────
  {
    id: 'what-is-pipelining',
    title: 'What is Pipelining?',
    description: 'Learn how processors execute instructions through a 5-stage pipeline, just like an assembly line in a factory.',
    icon: '🏭',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    program: `.text
main:
  addi $t0, $zero, 10
  addi $t1, $zero, 20
  addi $t2, $zero, 30
  addi $t3, $zero, 40
  addi $t4, $zero, 50
  li $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'Welcome to Pipelining!',
        content: 'A processor pipeline works like a factory assembly line. Instead of completing one instruction before starting the next, the processor overlaps them — each instruction moves through 5 stages:\n\n**IF** (Fetch) → **ID** (Decode) → **EX** (Execute) → **MEM** (Memory) → **WB** (Write Back)\n\nThis makes the processor much faster!',
      },
      {
        type: 'instruction',
        title: 'The 5 Pipeline Stages',
        content: '1. **IF (Instruction Fetch)** — Read the instruction from memory\n2. **ID (Instruction Decode)** — Figure out what the instruction does, read registers\n3. **EX (Execute)** — Perform the computation (ALU)\n4. **MEM (Memory Access)** — Read/write data memory (for loads/stores)\n5. **WB (Write Back)** — Write the result back to the register file',
      },
      {
        type: 'step-simulation',
        title: 'Watch the First Instruction',
        content: 'Press the step button or click **Next** to advance one cycle. Watch the first instruction (`addi $t0, $zero, 10`) enter the **IF** stage.',
        autoStep: 1,
        highlightStage: 'IF',
      },
      {
        type: 'observe',
        title: 'Two Instructions at Once!',
        content: 'Step again and notice: the first instruction moved to **ID**, while a *new* instruction entered **IF**. This is the magic of pipelining — multiple instructions are in-flight simultaneously!',
        autoStep: 1,
        highlightStage: 'ID',
      },
      {
        type: 'step-simulation',
        title: 'Fill the Pipeline',
        content: 'Step 3 more times to fill all 5 stages. Notice how each cycle, every instruction moves forward one stage.',
        autoStep: 3,
      },
      {
        type: 'question',
        title: 'Quick Check',
        content: 'You\'ve seen the pipeline fill up.',
        question: {
          prompt: 'How many instructions can be in the pipeline simultaneously when it\'s fully loaded?',
          options: ['1', '3', '5', '10'],
          correctIndex: 2,
          explanation: 'A 5-stage pipeline can hold up to 5 instructions at once — one in each stage. This is what makes pipelining so powerful!',
        },
      },
    ],
  },

  // ── Lesson 2: Your First MIPS Program ──────────────────────────────
  {
    id: 'first-mips-program',
    title: 'Your First MIPS Program',
    description: 'Write and run a simple MIPS program that adds two numbers and prints the result.',
    icon: '📝',
    difficulty: 'beginner',
    estimatedMinutes: 7,
    program: `.text
main:
  addi $t0, $zero, 5    # $t0 = 5
  addi $t1, $zero, 3    # $t1 = 3
  add  $t2, $t0, $t1    # $t2 = $t0 + $t1 = 8
  
  # Print the result
  addi $v0, $zero, 1    # syscall 1 = print_int
  add  $a0, $t2, $zero  # $a0 = result
  syscall
  
  addi $v0, $zero, 10   # syscall 10 = exit
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'Understanding MIPS Instructions',
        content: 'MIPS instructions follow a simple pattern:\n\n`operation destination, source1, source2`\n\nFor example: `add $t2, $t0, $t1` means: *add the values in $t0 and $t1, store result in $t2*.\n\nRegisters like `$t0`–`$t7` are temporary registers you can use freely.',
      },
      {
        type: 'instruction',
        title: 'Immediate Values',
        content: '`addi` stands for "add immediate" — it adds a constant number directly:\n\n`addi $t0, $zero, 5` means: *$t0 = $zero + 5 = 5*\n\nThe special register `$zero` always contains 0, so this is a common way to load a value into a register.',
      },
      {
        type: 'step-simulation',
        title: 'Run the Program',
        content: 'Let\'s step through the program. Watch the registers panel at the bottom — you\'ll see `$t0` change to 5 as the first instruction completes.',
        autoStep: 5,
        highlightLine: 3,
      },
      {
        type: 'observe',
        title: 'Check the Registers',
        content: 'Step a few more times. After the `add` instruction reaches WB, `$t2` should contain 8 (5 + 3). Watch the register file highlight modified values in blue.',
        autoStep: 3,
      },
      {
        type: 'question',
        title: 'Register Values',
        content: 'Think about what the program computes.',
        question: {
          prompt: 'After the program runs, what value will be in register $t2?',
          options: ['5', '3', '8', '15'],
          correctIndex: 2,
          explanation: '$t0 = 5, $t1 = 3, and add $t2, $t0, $t1 computes $t2 = 5 + 3 = 8.',
        },
      },
      {
        type: 'question',
        title: 'Syscalls',
        content: 'The program uses `syscall` to interact with the operating system.',
        question: {
          prompt: 'What does loading 1 into $v0 before syscall do?',
          options: ['Exits the program', 'Prints the integer in $a0', 'Reads input from the user', 'Prints a string'],
          correctIndex: 1,
          explanation: 'Syscall 1 (print_int) prints the integer value stored in $a0. Syscall 10 is for exiting the program.',
        },
      },
    ],
  },

  // ── Lesson 3: Syscalls & Output (Printing Values & Program Exit) ──
  {
    id: 'syscalls-and-output',
    title: 'Syscalls & Output: Printing Values & Program Exit',
    description: 'Learn how to use system calls (syscall) to print integers, print strings, read input, and cleanly terminate programs using $v0 and $a0.',
    icon: '🖥️',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    program: `# Syscall Demo — Printing Values & Clean Exit
.data
msg:     .asciiz "Computed Result: "
newline: .asciiz "\\n"

.text
main:
  # 1. Perform calculation
  addi $t0, $zero, 25   # $t0 = 25
  addi $t1, $zero, 17   # $t1 = 17
  add  $t2, $t0, $t1    # $t2 = 42

  # 2. Print label string ("Computed Result: ")
  li   $v0, 4           # syscall 4 = print_string
  la   $a0, msg        # $a0 = address of msg
  syscall

  # 3. Print integer value (42)
  li   $v0, 1           # syscall 1 = print_int
  add  $a0, $t2, $zero  # $a0 = value to print (42)
  syscall

  # 4. Print newline character
  li   $v0, 4           # syscall 4 = print_string
  la   $a0, newline     # $a0 = address of newline
  syscall

  # 5. Cleanly exit the program
  li   $v0, 10          # syscall 10 = exit
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'What is a System Call (syscall)?',
        content: 'Assembly code running on a CPU cannot directly access screen output or user input. Instead, it must ask the **Operating System** to perform these tasks using a `syscall` instruction.\n\nSystem calls use specific register conventions:\n• **`$v0`**: Holds the **Syscall Code** (tells OS what action to perform)\n• **`$a0`**: Holds the **Argument** (data or memory address to pass to OS)',
      },
      {
        type: 'instruction',
        title: 'Common Syscall Codes Table',
        content: 'Here are the standard system call codes you will use constantly:\n\n| $v0 Code | Function | Argument in $a0 |\n|---|---|---|\n| **1** | Print Integer | `$a0` = Integer value to print |\n| **4** | Print String | `$a0` = Memory address of `.asciiz` string |\n| **5** | Read Integer | Result returned in `$v0` |\n| **10** | Exit Program | *(No argument required)* |\n| **11** | Print Character | `$a0` = ASCII character code |',
      },
      {
        type: 'step-simulation',
        title: 'Step 1: Perform Calculation & Setup String',
        content: 'Step through the pipeline. Watch `$t2` compute $25 + 17 = 42$. Then watch `li $v0, 4` and `la $a0, msg` load the string address for printing.',
        autoStep: 6,
        highlightLine: 12,
      },
      {
        type: 'step-simulation',
        title: 'Step 2: Execute Syscall 4 (Print String)',
        content: 'Step through the first `syscall` instruction. Look at the **Console Panel** at the bottom of the simulator screen — you will see `"Computed Result: "` printed!',
        autoStep: 3,
        highlightLine: 14,
      },
      {
        type: 'step-simulation',
        title: 'Step 3: Execute Syscall 1 (Print Integer)',
        content: 'Next, `li $v0, 1` sets up the Print Integer syscall, and `add $a0, $t2, $zero` moves 42 into `$a0`. Step forward to execute the `syscall` — you will see `42` printed to the console!',
        autoStep: 3,
        highlightLine: 19,
      },
      {
        type: 'observe',
        title: 'Step 4: Exiting the Program (Syscall 10)',
        content: 'Finally, `li $v0, 10` followed by `syscall` tells the CPU to halt execution cleanly. Without `syscall 10`, the processor would continue executing random memory past the end of the program!',
        autoStep: 4,
        highlightLine: 28,
      },
      {
        type: 'question',
        title: 'Syscall Code Register',
        content: 'Check your understanding of system call conventions.',
        question: {
          prompt: 'Which register must hold the syscall function code before executing the `syscall` instruction?',
          options: ['$a0', '$v0', '$t0', '$sp'],
          correctIndex: 1,
          explanation: 'Register $v0 specifies the syscall service code (e.g. 1 for print int, 4 for print string, 10 for exit).',
        },
      },
      {
        type: 'question',
        title: 'Printing Integers vs Strings',
        content: 'Compare how integers and strings are passed to syscalls.',
        question: {
          prompt: 'To print an integer value, what goes into register $a0? What goes into $a0 to print a string?',
          options: [
            'Integer: The value itself; String: Memory address of the string',
            'Integer: Memory address; String: The string text',
            'Integer: Always 0; String: Always 1',
            'Integer: $v0; String: $v1'
          ],
          correctIndex: 0,
          explanation: 'For syscall 1 (print_int), $a0 holds the literal integer value (e.g., 42). For syscall 4 (print_string), $a0 holds the memory address of the .asciiz string (loaded via `la $a0, label`).',
        },
      },
      {
        type: 'question',
        title: 'Program Termination',
        content: 'Understand why syscall 10 is necessary.',
        question: {
          prompt: 'What happens if a program omits `li $v0, 10` and `syscall` at the end of execution?',
          options: [
            'The computer automatically turns off',
            'The processor pipeline continues fetching whatever bytes come next in memory as instructions',
            'The simulator throws a compilation error before running',
            'The program loops back to main automatically'
          ],
          correctIndex: 1,
          explanation: 'Hardware processors do not know where a program ends. Without an explicit exit syscall (or return instruction), the PC keeps incrementing into uninitialized memory.',
        },
      },
    ],
  },

  // ── Lesson 4: Data Hazards ─────────────────────────────────────────
  {
    id: 'data-hazards',
    title: 'Data Hazards',
    description: 'Discover what happens when one instruction depends on the result of the previous one — the dreaded RAW hazard!',
    icon: '⚡',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    program: `.text
main:
  addi $t0, $zero, 10   # $t0 = 10
  addi $t1, $t0, 20     # Needs $t0 — RAW hazard!
  add  $t2, $t0, $t1    # Needs $t1 — RAW hazard!
  sub  $t3, $t2, $t0    # Needs $t2 — RAW hazard!
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: false },
    steps: [
      {
        type: 'instruction',
        title: 'What is a Data Hazard?',
        content: 'A **data hazard** occurs when an instruction needs data that hasn\'t been computed yet.\n\nConsider:\n```\naddi $t0, $zero, 10\naddi $t1, $t0, 20\n```\n\nThe second instruction needs `$t0`, but the first instruction hasn\'t written it back yet! This is called a **Read-After-Write (RAW)** hazard.',
      },
      {
        type: 'instruction',
        title: 'Forwarding is OFF',
        content: '⚠️ For this lesson, **forwarding is disabled**. This means the pipeline must **stall** (wait) whenever there\'s a data hazard. Watch for yellow "stall" indicators in the pipeline view.',
      },
      {
        type: 'step-simulation',
        title: 'Watch the Stalls',
        content: 'Step through the pipeline. When the second instruction (`addi $t1, $t0, 20`) reaches ID, it will detect that `$t0` isn\'t ready yet. The pipeline will stall!',
        autoStep: 4,
        highlightStage: 'ID',
      },
      {
        type: 'observe',
        title: 'Count the Stall Cycles',
        content: 'Keep stepping and count how many stall cycles occur. Without forwarding, each dependent instruction causes 2 stall cycles (waiting for the result to reach WB).',
        autoStep: 6,
      },
      {
        type: 'question',
        title: 'Understanding Stalls',
        content: 'Stalls waste clock cycles. The pipeline is doing nothing useful during a stall.',
        question: {
          prompt: 'Without forwarding, how many stall cycles does a single RAW dependency typically cause?',
          options: ['0', '1', '2', '3'],
          correctIndex: 2,
          explanation: 'Without forwarding, the dependent instruction must wait 2 cycles for the producing instruction to reach WB and write the result back to the register file.',
        },
      },
      {
        type: 'question',
        title: 'Impact on Performance',
        content: 'Stalls increase the total cycle count, degrading CPI (Cycles Per Instruction).',
        question: {
          prompt: 'If ideal CPI is 1.0, what happens to CPI when stalls occur?',
          options: ['CPI stays at 1.0', 'CPI goes above 1.0', 'CPI goes below 1.0', 'CPI becomes 0'],
          correctIndex: 1,
          explanation: 'Each stall adds an extra cycle without completing an instruction, so CPI rises above the ideal 1.0. More stalls = worse performance.',
        },
      },
    ],
  },

  // ── Lesson 4: Load-Use Hazards ─────────────────────────────────────
  {
    id: 'load-use-hazards',
    title: 'Load-Use Hazards',
    description: 'Learn about the special case where even forwarding can\'t prevent a stall.',
    icon: '📥',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    program: `.text
main:
  addi $t0, $zero, 42
  sw   $t0, 0($sp)       # Store 42 to memory
  lw   $t1, 0($sp)       # Load from memory
  add  $t2, $t1, $t0     # Use $t1 immediately — LOAD-USE!
  
  # Fix: add unrelated instruction between load and use
  lw   $t3, 0($sp)       # Another load
  addi $t4, $zero, 99    # Unrelated work fills the gap
  add  $t5, $t3, $t4     # Now $t3 is ready — no stall!
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'The Load-Use Problem',
        content: 'Even with forwarding, there\'s one case that still causes a stall: the **load-use hazard**.\n\nWhen you `lw` (load from memory) and immediately use the result:\n```\nlw   $t1, 0($sp)\nadd  $t2, $t1, $t0  ← needs $t1!\n```\nThe data isn\'t available until the END of the MEM stage, but the next instruction needs it at the START of EX. Even forwarding can\'t time-travel!',
      },
      {
        type: 'step-simulation',
        title: 'See the Stall',
        content: 'Step through and watch for the stall when `add $t2` tries to use `$t1` right after the load.',
        autoStep: 7,
        highlightStage: 'EX',
      },
      {
        type: 'observe',
        title: 'The Fix: Instruction Reordering',
        content: 'Now look at the second part of the code. By placing `addi $t4, $zero, 99` between the load and the use, we fill the stall cycle with useful work. This is called **instruction scheduling**.',
        autoStep: 6,
      },
      {
        type: 'question',
        title: 'Key Concept',
        content: 'Understanding when stalls are unavoidable is crucial for writing efficient code.',
        question: {
          prompt: 'Why can\'t forwarding eliminate a load-use hazard?',
          options: [
            'Forwarding hardware is too slow',
            'The data is in the register file already',
            'The loaded data isn\'t available until the end of MEM, but EX needs it at the start',
            'MIPS doesn\'t support forwarding for loads',
          ],
          correctIndex: 2,
          explanation: 'The load instruction reads data from memory in the MEM stage. The result isn\'t available until the end of MEM, but the dependent instruction needs it at the beginning of EX — there\'s a 1-cycle timing gap that can\'t be bridged.',
        },
      },
    ],
  },

  // ── Lesson 5: Data Forwarding ──────────────────────────────────────
  {
    id: 'data-forwarding',
    title: 'Data Forwarding',
    description: 'See how forwarding paths (bypasses) eliminate most stalls by routing data directly between pipeline stages.',
    icon: '🔄',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    program: `.text
main:
  addi $t0, $zero, 5     # $t0 = 5
  add  $t1, $t0, $t0     # EX→EX forwarding
  add  $t2, $t1, $t0     # Another forward
  
  addi $t3, $zero, 3
  nop
  add  $t4, $t3, $t3     # MEM→EX forwarding
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'How Forwarding Works',
        content: 'Forwarding adds special **bypass paths** in the hardware:\n\n**EX→EX forwarding**: The ALU result from one instruction is routed directly to the next instruction\'s ALU input, without waiting for WB.\n\n**MEM→EX forwarding**: Data from the MEM stage is forwarded to an instruction entering EX.\n\nThese paths eliminate stalls for most data hazards!',
      },
      {
        type: 'step-simulation',
        title: 'Watch EX→EX Forwarding',
        content: 'Step through and watch the Datapath view. When `add $t1, $t0, $t0` enters EX, `$t0` is forwarded from the previous instruction\'s EX/MEM latch. Look for green "forward" indicators.',
        autoStep: 5,
        highlightStage: 'EX',
      },
      {
        type: 'observe',
        title: 'Zero Stalls!',
        content: 'Notice: with forwarding ON, this code executes with **zero stall cycles**! Without forwarding, each `add` would cause 2 stalls. Check the Performance panel to confirm.',
        autoStep: 5,
      },
      {
        type: 'question',
        title: 'Forwarding Paths',
        content: 'There are two main forwarding paths in a 5-stage pipeline.',
        question: {
          prompt: 'EX→EX forwarding routes data from which pipeline latch?',
          options: ['IF/ID latch', 'ID/EX latch', 'EX/MEM latch', 'MEM/WB latch'],
          correctIndex: 2,
          explanation: 'EX→EX forwarding takes the ALU result stored in the EX/MEM pipeline latch and routes it back to the ALU input of the next instruction in the EX stage.',
        },
      },
      {
        type: 'question',
        title: 'Compare Performance',
        content: 'Think about the performance difference.',
        question: {
          prompt: 'For a chain of 4 dependent instructions, how many stall cycles does forwarding save?',
          options: ['0', '3', '6', '12'],
          correctIndex: 2,
          explanation: '3 RAW dependencies × 2 stalls each = 6 stalls without forwarding. With forwarding, 0 stalls (assuming no load-use). That\'s 6 cycles saved!',
        },
      },
    ],
  },

  // ── Lesson 6: Branch Prediction ────────────────────────────────────
  {
    id: 'branch-prediction',
    title: 'Branch Prediction',
    description: 'Understand control hazards — what happens when the processor guesses wrong about a branch.',
    icon: '🎯',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    program: `.text
main:
  addi $t0, $zero, 3

loop:
  addi $t0, $t0, -1
  bne  $t0, $zero, loop
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: true, branchPrediction: 'not-taken' },
    steps: [
      {
        type: 'instruction',
        title: 'The Control Hazard Problem',
        content: 'When the processor fetches a **branch instruction** (`beq`, `bne`, etc.), it doesn\'t know yet whether the branch will be taken or not. It won\'t know until the branch reaches the EX stage.\n\nMeanwhile, the pipeline keeps fetching instructions. If the branch IS taken, those fetched instructions are wrong and must be **flushed** (discarded)!',
      },
      {
        type: 'instruction',
        title: 'Predict-Not-Taken Strategy',
        content: 'This simulator uses a **predict-not-taken** strategy: it always assumes branches won\'t be taken and fetches the next sequential instruction.\n\n- If the prediction is **correct** (branch not taken): no penalty\n- If the prediction is **wrong** (branch was taken): 1 cycle penalty to flush and re-fetch',
      },
      {
        type: 'step-simulation',
        title: 'Watch the Loop',
        content: 'Step through the loop. The branch `bne $t0, $zero, loop` is taken 2 times (when $t0=2 and $t0=1) and not taken once (when $t0=0). Watch for pipeline flushes!',
        autoStep: 12,
      },
      {
        type: 'question',
        title: 'Counting Flushes',
        content: 'Check the Performance panel for the flush count.',
        question: {
          prompt: 'With predict-not-taken, how many flushes should this loop cause?',
          options: ['0', '1', '2', '3'],
          correctIndex: 2,
          explanation: 'The branch is taken 2 times (mispredicted both times = 2 flushes) and not taken 1 time (correctly predicted = no flush). Total: 2 flushes.',
        },
      },
    ],
  },

  // ── Lesson 7: Pipeline Stalls Deep Dive ────────────────────────────
  {
    id: 'pipeline-stalls',
    title: 'Pipeline Stalls Deep Dive',
    description: 'Master the three types of pipeline stalls and learn to identify each one.',
    icon: '⏸️',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    program: `.text
main:
  # Type 1: Data stall (load-use)
  lw   $t0, 0($sp)
  add  $t1, $t0, $t0     # Data stall!
  
  # Type 2: Control stall (branch)
  addi $t2, $zero, 1
  bne  $t2, $zero, skip
  addi $t3, $zero, 99    # Flushed!
skip:
  
  # Type 3: No stall (well-scheduled)
  lw   $t4, 0($sp)
  addi $t5, $zero, 7     # Fills the gap
  add  $t6, $t4, $t5     # No stall!
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'Three Types of Pipeline Hazards',
        content: '1. **Data Hazards** — Instructions need results that aren\'t ready yet\n2. **Control Hazards** — Branch outcomes aren\'t known yet\n3. **Structural Hazards** — Two instructions need the same hardware\n\nIn our 5-stage pipeline, structural hazards don\'t occur (separate read/write ports on register file). Let\'s focus on data and control.',
      },
      {
        type: 'step-simulation',
        title: 'Observe All Types',
        content: 'Step through and observe: first a load-use stall, then a branch flush, then well-scheduled code with no stalls.',
        autoStep: 15,
      },
      {
        type: 'question',
        title: 'Stall Classification',
        content: 'Different stalls have different causes and solutions.',
        question: {
          prompt: 'Which type of stall can be eliminated by reordering instructions?',
          options: ['Control stalls only', 'Load-use data stalls only', 'Both data and control stalls', 'Neither'],
          correctIndex: 1,
          explanation: 'Load-use stalls can be eliminated by scheduling an independent instruction between the load and the use. Control stalls require branch prediction improvements.',
        },
      },
    ],
  },

  // ── Lesson 8: Memory & Caching ─────────────────────────────────────
  {
    id: 'memory-caching',
    title: 'Memory & Cache Hierarchy',
    description: 'Explore how cache memory speeds up data access and what happens on cache misses.',
    icon: '📦',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    program: `.data
array: .word 1, 2, 3, 4, 5, 6, 7, 8

.text
main:
  la   $s0, array
  addi $t0, $zero, 0    # i = 0
  addi $t1, $zero, 8    # size
  addi $t2, $zero, 0    # sum = 0

loop:
  beq  $t0, $t1, done
  sll  $t3, $t0, 2      # offset = i * 4
  add  $t3, $s0, $t3    # addr = base + offset
  lw   $t4, 0($t3)      # load array[i]
  add  $t2, $t2, $t4    # sum += array[i]
  addi $t0, $t0, 1      # i++
  j    loop

done:
  add  $a0, $t2, $zero
  li   $v0, 1
  syscall
  li   $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'The Memory Wall',
        content: 'Modern processors are MUCH faster than main memory. A CPU cycle takes ~0.3ns, but a memory access takes ~100ns — that\'s a 300x difference!\n\n**Cache memory** bridges this gap by storing recently-used data close to the processor. Cache hits take 1 cycle, but misses can cost 10-100 cycles.',
      },
      {
        type: 'instruction',
        title: 'Spatial Locality',
        content: 'This program accesses array elements sequentially: `array[0]`, `array[1]`, `array[2]`, etc.\n\nCaches load entire **blocks** of memory at once (e.g., 16 bytes = 4 words). So loading `array[0]` also brings `array[1]`, `array[2]`, `array[3]` into cache for free!\n\nThis is called **spatial locality** — nearby addresses are likely to be accessed soon.',
      },
      {
        type: 'step-simulation',
        title: 'Run the Loop',
        content: 'Step through the array summation loop. You can enable the Cache Simulator from the Architecture Settings panel to see hit/miss behavior.',
        autoStep: 10,
      },
      {
        type: 'question',
        title: 'Cache Concepts',
        content: 'Understanding cache behavior is key to writing fast code.',
        question: {
          prompt: 'If the cache block size is 16 bytes (4 words), how many cache misses will reading 8 sequential words cause?',
          options: ['0', '2', '4', '8'],
          correctIndex: 1,
          explanation: 'With 4 words per block, the first access to each block (words 0-3 and words 4-7) causes a miss. That\'s 2 misses for 8 words. The other 6 accesses are hits thanks to spatial locality!',
        },
      },
    ],
  },

  // ── Lesson 9: Putting It Together ──────────────────────────────────
  {
    id: 'code-optimization',
    title: 'Code Optimization',
    description: 'Apply everything you\'ve learned to optimize a real program and minimize CPI.',
    icon: '🚀',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    program: `.text
main:
  # Unoptimized code with hazards everywhere
  addi $t0, $zero, 5
  add  $t1, $t0, $t0     # RAW on $t0
  lw   $t2, 0($sp)
  add  $t3, $t2, $t1     # Load-use on $t2!
  
  addi $t4, $zero, 3
  bne  $t4, $zero, skip
  addi $t5, $zero, 99
skip:
  add  $t6, $t4, $t0     # RAW on $t4 (after branch)
  
  li $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: 'Optimization Strategies',
        content: 'You now know about:\n- ✅ Data forwarding (eliminates most RAW stalls)\n- ✅ Instruction scheduling (eliminates load-use stalls)\n- ✅ Branch prediction effects\n\nLet\'s put it all together. This program has multiple hazards — your goal is to understand where stalls occur.',
      },
      {
        type: 'step-simulation',
        title: 'Run and Observe',
        content: 'Step through the entire program. Count the stalls and note where they occur. Check the Performance panel for the final CPI.',
        autoStep: 15,
      },
      {
        type: 'question',
        title: 'Optimization Challenge',
        content: 'Think about how you could rewrite this code to reduce stalls.',
        question: {
          prompt: 'Which optimization would eliminate the load-use stall in this code?',
          options: [
            'Move the `lw` instruction to the end',
            'Insert `addi $t4, $zero, 3` between the `lw` and the `add`',
            'Remove the `lw` instruction',
            'Add more `nop` instructions',
          ],
          correctIndex: 1,
          explanation: 'By moving `addi $t4, $zero, 3` between the `lw $t2` and the `add $t3, $t2, $t1`, we fill the load-use stall cycle with useful work. The load result will be ready via MEM→EX forwarding.',
        },
      },
      {
        type: 'question',
        title: 'CPI Analysis',
        content: 'Think about what ideal CPI should be.',
        question: {
          prompt: 'What is the ideal CPI for a pipeline with no stalls?',
          options: ['0.5', '1.0', '2.0', '5.0'],
          correctIndex: 1,
          explanation: 'The ideal CPI is 1.0 — one cycle per instruction. In a perfect pipeline, one instruction completes every cycle. Any stalls push CPI above 1.0.',
        },
      },
    ],
  },

  // ── Lesson 10: Capstone Challenge ──────────────────────────────────
  {
    id: 'capstone-challenge',
    title: 'Capstone Challenge',
    description: 'Test your knowledge with a comprehensive challenge: write optimized code that meets strict performance requirements.',
    icon: '🏆',
    difficulty: 'advanced',
    estimatedMinutes: 12,
    program: `.text
# CHALLENGE: Compute the sum of 1+2+3+...+10
# Store the result in $v0
# Requirements:
#   - Result must be 55
#   - Use forwarding (ON)
#   - Minimize stalls: aim for 0 stalls
#   - Minimize total cycles

main:
  addi $t0, $zero, 0     # sum = 0
  addi $t1, $zero, 1     # i = 1
  addi $t2, $zero, 11    # limit = 11

loop:
  beq  $t1, $t2, done
  add  $t0, $t0, $t1     # sum += i
  addi $t1, $t1, 1       # i++
  j    loop

done:
  add  $v0, $t0, $zero   # result in $v0
  li   $v0, 1
  add  $a0, $t0, $zero
  syscall
  li   $v0, 10
  syscall
`,
    settings: { forwarding: true },
    steps: [
      {
        type: 'instruction',
        title: '🏆 Capstone Challenge',
        content: 'You\'ve learned about all the key pipeline concepts. Now it\'s time to prove it!\n\nThis program computes 1+2+3+...+10 = 55 using a loop. Run it, analyze its performance, and answer the questions.',
      },
      {
        type: 'step-simulation',
        title: 'Run to Completion',
        content: 'Step through the entire program or use auto-play. Once it finishes, check the Performance panel for: Total Cycles, Stalls, Forwards, Flushes, and CPI.',
        autoStep: 20,
      },
      {
        type: 'observe',
        title: 'Analyze Performance',
        content: 'Look at the Timing Diagram (Timing tab) to see exactly where stalls and flushes occurred. The branch `beq $t1, $t2, done` is taken only once (at the end), so with predict-not-taken, it should cause only 1 flush.',
        autoStep: 30,
      },
      {
        type: 'question',
        title: 'Final Question 1',
        content: 'Consider the loop body.',
        question: {
          prompt: 'In the loop body (beq, add, addi, j), which instruction causes a branch flush?',
          options: ['beq (when loop continues)', 'add (data hazard)', 'j (always taken)', 'No flushes in the loop body'],
          correctIndex: 2,
          explanation: 'The `j loop` instruction is an unconditional jump, which is always taken. With predict-not-taken, each `j` causes a flush because the processor fetched the wrong next instruction.',
        },
      },
      {
        type: 'question',
        title: 'Final Question 2',
        content: 'Think about optimization.',
        question: {
          prompt: 'How could you optimize this loop to reduce flushes?',
          options: [
            'Use `bne` instead of `beq` and restructure the loop so the branch at the bottom goes back to the top',
            'Add more nop instructions',
            'Remove the j instruction and use a longer loop body',
            'Use load instructions instead of add',
          ],
          correctIndex: 0,
          explanation: 'By restructuring as: loop body → bne $t1, $t2, loop, the branch goes back when the loop continues (taken = flush) and falls through when done (not taken = no flush). This removes the separate `j` instruction entirely, saving flushes AND instructions!',
        },
      },
    ],
  },
];

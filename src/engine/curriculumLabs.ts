// ── Curriculum Labs ──────────────────────────────────────────────────────────
// 15 structured labs covering the full Patterson & Hennessy MIPS syllabus.
// Each lab maps to specific concepts for ConceptMastery tracking.

export interface LabTestCase {
  id: string;
  name: string;
  register: string;
  expectedValue: number;
}

export interface CurriculumLab {
  id: string;
  module: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  concepts: string[];
  starterCode: string;
  instructions: string;
  hints: string[];
  sampleTestCases: LabTestCase[];
  learningObjective: string;
}

export const CURRICULUM_MODULES = [
  'Pipeline Basics',
  'Data Hazards',
  'Control Hazards',
  'Forwarding & Optimization',
  'Cache Memory',
] as const;

export const CURRICULUM_LABS: CurriculumLab[] = [
  // ════════════════════════════════════════════════════════════════════════
  // MODULE 1: Pipeline Basics
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lab-01-first-pipeline',
    module: 'Pipeline Basics',
    title: 'Your First Pipeline Execution',
    level: 'beginner',
    estimatedMinutes: 15,
    concepts: ['pipeline-stages', 'instruction-fetch', 'write-back'],
    starterCode: `# Lab 1: Your First Pipeline Execution
# Goal: Add two numbers and store the result in $t2.
#
# Watch all 5 pipeline stages execute:
#   IF (Instruction Fetch) → ID (Decode) → EX (Execute) → MEM (Memory) → WB (Write-Back)
#
# Click "Step" to advance one cycle at a time and observe each stage.

addi $t0, $zero, 5      # $t0 = 5
addi $t1, $zero, 10     # $t1 = 10
add  $t2, $t0, $t1      # $t2 = $t0 + $t1 = 15`,
    instructions: `## Goal
Watch all 5 pipeline stages execute for a simple program that adds two numbers.

## What to do
1. Click **Assemble** to load the program
2. Click **Step** to advance one cycle at a time
3. Watch the **Pipeline** view — each instruction flows through IF → ID → EX → MEM → WB
4. Notice how multiple instructions are "in flight" at the same time — that's pipelining!

## Key Concepts
- **IF (Instruction Fetch)**: CPU reads the next instruction from memory
- **ID (Instruction Decode)**: CPU reads register values and decodes the operation
- **EX (Execute)**: ALU performs the computation
- **MEM (Memory Access)**: Read/write data memory (only for lw/sw)
- **WB (Write-Back)**: Result is written back to the register file

## Check Your Understanding
After running all instructions, \`$t2\` should contain **15**.`,
    hints: [
      'Click "Step" to advance one cycle at a time',
      'Watch the IF stage — it fetches the next instruction every cycle',
      'Notice how cycle 3 has all 3 instructions in different stages simultaneously',
    ],
    sampleTestCases: [
      { id: 'lab01-tc1', name: '$t2 equals 15', register: '$t2', expectedValue: 15 },
    ],
    learningObjective: 'Student can trace a 3-instruction program through all 5 pipeline stages',
  },

  {
    id: 'lab-02-instruction-types',
    module: 'Pipeline Basics',
    title: 'R-Type, I-Type, and Memory Instructions',
    level: 'beginner',
    estimatedMinutes: 20,
    concepts: ['r-type', 'i-type', 'load-store', 'instruction-encoding'],
    starterCode: `# Lab 2: Instruction Types
# Explore the three main MIPS instruction formats.

.data
value: .word 42

.text
# R-type: register-to-register operations
add  $t0, $zero, $zero    # $t0 = 0
addi $t1, $zero, 7        # I-type: immediate value
sub  $t2, $t1, $t0        # R-type: $t2 = 7 - 0 = 7

# I-type: load from memory
lw   $t3, 0($zero)        # Load 'value' from address 0
# TODO: Store $t1 (7) to the memory location at address 0
# Hint: use sw (store word)

# R-type: logical operations
and  $t4, $t1, $t3         # $t4 = 7 AND 42
or   $t5, $t1, $t3         # $t5 = 7 OR 42`,
    instructions: `## Goal
Understand the three main MIPS instruction types and how they behave in the pipeline.

## What to do
1. **Assemble** and **Step** through the program
2. In the **Timing** view, notice how load/store instructions use the MEM stage differently
3. Complete the TODO: add a \`sw\` instruction to store \`$t1\` to memory
4. Verify the register values match expectations

## Instruction Types
| Type | Format | Example | Pipeline Use |
|------|--------|---------|-------------|
| R-type | op rd, rs, rt | add $t0, $t1, $t2 | EX does the work |
| I-type | op rt, rs, imm | addi $t0, $t1, 5 | EX with immediate |
| Load | lw rt, off(rs) | lw $t0, 0($sp) | MEM reads memory |
| Store | sw rt, off(rs) | sw $t0, 0($sp) | MEM writes memory |`,
    hints: [
      'sw instruction format: sw $register, offset($base)',
      'The data segment starts at address 0 in the simulator',
      'AND: both bits must be 1; OR: either bit can be 1',
    ],
    sampleTestCases: [
      { id: 'lab02-tc1', name: '$t2 equals 7', register: '$t2', expectedValue: 7 },
      { id: 'lab02-tc2', name: '$t3 equals 42', register: '$t3', expectedValue: 42 },
      { id: 'lab02-tc3', name: '$t5 equals 47 (7 OR 42)', register: '$t5', expectedValue: 47 },
    ],
    learningObjective: 'Student can identify R-type, I-type, and load/store instructions and predict their behavior',
  },

  {
    id: 'lab-03-pipeline-timing',
    module: 'Pipeline Basics',
    title: 'Understanding Pipeline Timing and CPI',
    level: 'beginner',
    estimatedMinutes: 20,
    concepts: ['cpi', 'throughput', 'latency', 'pipeline-speedup'],
    starterCode: `# Lab 3: Pipeline Timing and CPI
# This program has 8 instructions. In an ideal pipeline:
#   - Latency per instruction = 5 cycles
#   - But throughput = 1 instruction per cycle (after pipeline fills)
#   - Total cycles ≈ N + 4 (where N = number of instructions)
#   - Ideal CPI = Total cycles / N

addi $t0, $zero, 1
addi $t1, $zero, 2
addi $t2, $zero, 3
addi $t3, $zero, 4
add  $t4, $t0, $t1    # $t4 = 3
add  $t5, $t2, $t3    # $t5 = 7
add  $t6, $t4, $t5    # $t6 = 10
add  $t7, $t6, $t0    # $t7 = 11`,
    instructions: `## Goal
Understand how pipelining affects execution time, CPI (Cycles Per Instruction), and throughput.

## What to do
1. **Assemble** and **Run** the program
2. Open the **Timing** diagram view to see all 8 instructions executing
3. Check the **Stats** panel — note the total cycles and CPI
4. Compare: without pipelining, 8 instructions × 5 stages = 40 cycles. With pipelining?

## Key Formula
\`\`\`
CPI = Total Cycles / Number of Instructions
Speedup = CPI_unpipelined / CPI_pipelined
\`\`\`

## Questions to Answer
- What is the CPI? Is it close to 1.0?
- If there are stalls, what caused them?
- How does the Timing diagram show overlapping execution?`,
    hints: [
      'Ideal CPI with pipelining approaches 1.0',
      'Look at the Stats panel after running to see actual CPI',
      'Notice that the last instruction finishes long before 40 cycles',
    ],
    sampleTestCases: [
      { id: 'lab03-tc1', name: '$t4 equals 3', register: '$t4', expectedValue: 3 },
      { id: 'lab03-tc2', name: '$t6 equals 10', register: '$t6', expectedValue: 10 },
      { id: 'lab03-tc3', name: '$t7 equals 11', register: '$t7', expectedValue: 11 },
    ],
    learningObjective: 'Student can calculate CPI and explain pipelining speedup',
  },

  // ════════════════════════════════════════════════════════════════════════
  // MODULE 2: Data Hazards
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lab-04-raw-hazard',
    module: 'Data Hazards',
    title: 'Triggering a RAW Hazard',
    level: 'beginner',
    estimatedMinutes: 20,
    concepts: ['data-hazard', 'raw-hazard', 'pipeline-stall', 'read-after-write'],
    starterCode: `# Lab 4: Read-After-Write (RAW) Hazard
# IMPORTANT: Turn OFF forwarding in the Architecture Settings panel first!
#
# A RAW hazard occurs when an instruction reads a register
# that the previous instruction hasn't finished writing yet.

addi $t0, $zero, 10     # Writes $t0 in WB stage (cycle 5)
add  $t1, $t0, $t0      # Reads $t0 in ID stage (cycle 3) — HAZARD!
# $t0 isn't written yet when the add tries to read it.
# The pipeline must STALL (insert bubbles) to wait.

addi $t2, $zero, 20
add  $t3, $t2, $t0      # Another RAW hazard on $t2`,
    instructions: `## Goal
Observe a Read-After-Write (RAW) data hazard and understand why stalls are needed.

## Setup
⚠️ **Turn OFF forwarding** in the Architecture Settings panel (gear icon) before running.

## What to do
1. **Assemble** and **Step** through the program slowly
2. Watch the Pipeline view — you should see **stall bubbles** appear
3. Count the stall cycles inserted between the addi and the following add
4. Check the **Diff** view to compare: what happens with forwarding ON vs OFF?

## Why This Happens
\`\`\`
Cycle 1: addi $t0  → IF
Cycle 2: addi $t0  → ID  |  add $t1 → IF
Cycle 3: addi $t0  → EX  |  add $t1 → ID (NEEDS $t0 — not written yet!)
                               ↑ STALL: $t0 won't be in register file until cycle 5
\`\`\`

The pipeline inserts **2 stall cycles** (bubbles) so the add can read the correct value of $t0.`,
    hints: [
      'Turn OFF forwarding first — this lab is about understanding the problem before the solution',
      'Watch for "bubble" or "stall" markers in the pipeline diagram',
      'The Diff view lets you compare forwarding ON vs OFF side by side',
    ],
    sampleTestCases: [
      { id: 'lab04-tc1', name: '$t1 equals 20', register: '$t1', expectedValue: 20 },
      { id: 'lab04-tc2', name: '$t3 equals 30', register: '$t3', expectedValue: 30 },
    ],
    learningObjective: 'Student can identify RAW hazards and explain why stalls are needed',
  },

  {
    id: 'lab-05-forwarding',
    module: 'Data Hazards',
    title: 'Forwarding Eliminates Stalls',
    level: 'intermediate',
    estimatedMinutes: 25,
    concepts: ['forwarding', 'data-forwarding', 'ex-ex-forward', 'mem-ex-forward'],
    starterCode: `# Lab 5: Forwarding (Data Bypassing)
# IMPORTANT: Turn ON forwarding in the Architecture Settings panel!
#
# With forwarding, the result of one instruction can be
# "forwarded" to the next instruction's EX stage directly,
# without waiting for the WB stage.

# These have RAW dependencies but NO stalls with forwarding:
addi $t0, $zero, 5       # Produces $t0
add  $t1, $t0, $t0       # EX-EX forward: gets $t0 from previous EX output
add  $t2, $t1, $t0       # EX-EX forward: gets $t1 from previous EX output

# Compare the total cycles with forwarding ON vs OFF
addi $s0, $zero, 100
sub  $s1, $s0, $t0       # Needs $s0 — forwarded from addi's EX stage
add  $s2, $s1, $t1       # Needs $s1 — forwarded from sub's EX stage`,
    instructions: `## Goal
See how data forwarding eliminates stalls by bypassing the register file.

## Setup
✅ **Turn ON forwarding** in the Architecture Settings panel.

## What to do
1. **Assemble** and **Step** through — notice: NO stall bubbles!
2. Open the **Datapath** view — watch the forwarding paths light up
3. Open the **Diff** view to compare forwarding ON vs OFF
4. Check the CPI — it should be close to 1.0

## Forwarding Paths
| Path | From | To | When |
|------|------|----|------|
| EX→EX | Previous ALU output | Current ALU input | Back-to-back ALU ops |
| MEM→EX | Memory stage output | Current ALU input | One instruction gap |

## Key Insight
Without forwarding: CPI ≈ 2+ (many stalls).
With forwarding: CPI ≈ 1.0 (zero stalls for ALU→ALU chains).`,
    hints: [
      'The Datapath view shows forwarding paths as highlighted arrows',
      'Compare the Stats panel CPI with forwarding ON vs OFF',
      'EX-EX forwarding handles back-to-back dependent instructions',
    ],
    sampleTestCases: [
      { id: 'lab05-tc1', name: '$t1 equals 10', register: '$t1', expectedValue: 10 },
      { id: 'lab05-tc2', name: '$t2 equals 15', register: '$t2', expectedValue: 15 },
      { id: 'lab05-tc3', name: '$s1 equals 95', register: '$s1', expectedValue: 95 },
      { id: 'lab05-tc4', name: '$s2 equals 105', register: '$s2', expectedValue: 105 },
    ],
    learningObjective: 'Student can trace forwarding paths and explain EX-EX vs MEM-EX forwarding',
  },

  {
    id: 'lab-06-load-use-hazard',
    module: 'Data Hazards',
    title: 'The Load-Use Hazard (Forwarding Can\'t Fix Everything)',
    level: 'intermediate',
    estimatedMinutes: 25,
    concepts: ['load-use-hazard', 'pipeline-stall', 'lw-stall', 'instruction-scheduling'],
    starterCode: `# Lab 6: Load-Use Hazard
# Even WITH forwarding, this pattern causes a 1-cycle stall:

.data
value: .word 42

.text
lw   $t0, 0($zero)      # Load from memory (result available after MEM stage)
add  $t1, $t0, $t0      # Uses $t0 immediately — 1 STALL even with forwarding!

# Why? The lw result isn't available until the END of the MEM stage,
# but the add needs it at the START of the EX stage.
# Forwarding can bridge EX→EX and MEM→EX, but not MEM→EX-same-cycle.

# FIX: Reorder instructions to hide the latency
lw   $t2, 0($zero)      # Load starts
addi $t3, $zero, 99     # Independent work fills the slot!
add  $t4, $t2, $t3      # No stall — $t2 is ready by now (MEM→EX forward)`,
    instructions: `## Goal
Discover the one hazard that forwarding **cannot** fully eliminate, and learn to fix it.

## What to do
1. **Assemble** with forwarding ON and **Step** through
2. Watch the first lw→add pair: you'll see **1 stall bubble** inserted
3. Now look at the second sequence (lw→addi→add): **no stall!**
4. The independent \`addi\` instruction fills the "load delay slot"

## The Load-Use Hazard
\`\`\`
lw $t0, 0($zero)   →  IF  ID  EX  MEM  WB
add $t1, $t0, $t0  →      IF  ID  ●   EX  MEM  WB
                                   ↑ 1-cycle stall (bubble)
\`\`\`
The result of \`lw\` exits the MEM stage, but the \`add\` needs it entering EX — one cycle too early.

## The Fix: Instruction Scheduling
Move an independent instruction between the load and its consumer. Compilers do this automatically.`,
    hints: [
      'Look for exactly 1 stall bubble in the first lw→add pair',
      'The second sequence should execute with zero stalls',
      'This is why compilers reorder instructions — to hide load latency',
    ],
    sampleTestCases: [
      { id: 'lab06-tc1', name: '$t1 equals 84', register: '$t1', expectedValue: 84 },
      { id: 'lab06-tc2', name: '$t4 equals 141 (42 + 99)', register: '$t4', expectedValue: 141 },
    ],
    learningObjective: 'Student can identify load-use hazards and apply instruction scheduling to eliminate stalls',
  },

  // ════════════════════════════════════════════════════════════════════════
  // MODULE 3: Control Hazards
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lab-07-branch-hazard',
    module: 'Control Hazards',
    title: 'Branch Hazards and Pipeline Flushes',
    level: 'intermediate',
    estimatedMinutes: 25,
    concepts: ['control-hazard', 'branch-hazard', 'pipeline-flush', 'branch-penalty'],
    starterCode: `# Lab 7: Branch Hazards
# When a branch is taken, the pipeline has already fetched
# the wrong instructions. They must be FLUSHED (cancelled).

addi $t0, $zero, 5
addi $t1, $zero, 5
beq  $t0, $t1, target   # Branch is TAKEN ($t0 == $t1)
addi $t2, $zero, 999    # This is fetched but should NOT execute!
addi $t3, $zero, 888    # Also fetched — also flushed

target:
addi $t4, $zero, 42     # Execution continues here after the branch

# Check: $t2 should NOT be 999 (it was flushed)
# $t4 should be 42`,
    instructions: `## Goal
Observe what happens when a branch is taken — the pipeline must discard (flush) incorrectly fetched instructions.

## What to do
1. **Assemble** and **Step** through carefully
2. Watch the instructions after \`beq\` — they enter the pipeline but get **flushed**
3. In the Pipeline view, flushed instructions appear as cancelled/greyed out
4. Verify that \`$t2\` is NOT 999 — it was flushed before completing

## The Control Hazard
\`\`\`
beq → IF  ID  EX  (branch decision made here)
???  →     IF  ID  ←── FLUSHED (wrong path)
???  →         IF  ←── FLUSHED (wrong path)
target: →          IF  (correct path starts)
\`\`\`

The branch penalty = number of cycles wasted fetching wrong-path instructions.`,
    hints: [
      'Watch for instructions that get flushed/cancelled in the pipeline view',
      '$t2 should remain 0 (its default) — the addi that sets it was flushed',
      'The branch penalty is typically 1-2 cycles depending on when the branch resolves',
    ],
    sampleTestCases: [
      { id: 'lab07-tc1', name: '$t2 is 0 (flushed)', register: '$t2', expectedValue: 0 },
      { id: 'lab07-tc2', name: '$t4 equals 42', register: '$t4', expectedValue: 42 },
    ],
    learningObjective: 'Student can explain branch penalties and pipeline flushes',
  },

  {
    id: 'lab-08-branch-prediction',
    module: 'Control Hazards',
    title: 'Branch Prediction: Predict Taken vs Not-Taken',
    level: 'intermediate',
    estimatedMinutes: 30,
    concepts: ['branch-prediction', 'predict-taken', 'predict-not-taken', 'branch-history'],
    starterCode: `# Lab 8: Branch Prediction
# This loop iterates 5 times. Branch prediction tries to
# guess whether the branch will be taken BEFORE it's resolved.

addi $t0, $zero, 0       # i = 0
addi $t1, $zero, 5       # limit = 5
addi $t2, $zero, 0       # sum = 0

loop:
  beq  $t0, $t1, done    # if i == limit, exit loop
  add  $t2, $t2, $t0     # sum += i
  addi $t0, $t0, 1       # i++
  j    loop               # repeat

done:
# sum = 0 + 1 + 2 + 3 + 4 = 10
add $t3, $t2, $zero      # Copy sum to $t3 for verification`,
    instructions: `## Goal
See how branch prediction affects loop performance, and explore different prediction strategies.

## What to do
1. **Assemble** and **Run** the program
2. Open the **Branching** view to see the prediction table
3. Check the stats: how many correct vs mispredictions?
4. Try different prediction strategies in Architecture Settings:
   - **Always Not-Taken**: predicts branch is NOT taken (falls through)
   - **Always Taken**: predicts branch IS taken (jumps to target)
   - **1-bit predictor**: remembers last outcome
   - **2-bit predictor**: needs 2 mispredictions to change prediction

## Loop Behavior
The \`beq\` is NOT taken 5 times (loop continues) and TAKEN once (loop exits).
- "Predict Not-Taken" is correct 5/6 times = 83% accuracy
- "Predict Taken" is correct 1/6 times = 17% accuracy`,
    hints: [
      'The Branching view shows a table of branch addresses, predictions, and outcomes',
      'For loops, "predict not-taken" works well since most iterations continue the loop',
      'A 2-bit predictor needs 2 consecutive mispredictions to switch — great for loops',
    ],
    sampleTestCases: [
      { id: 'lab08-tc1', name: 'sum ($t2) equals 10', register: '$t2', expectedValue: 10 },
      { id: 'lab08-tc2', name: '$t3 equals 10', register: '$t3', expectedValue: 10 },
      { id: 'lab08-tc3', name: 'i ($t0) equals 5', register: '$t0', expectedValue: 5 },
    ],
    learningObjective: 'Student can compare prediction strategies and predict their accuracy for loop patterns',
  },

  {
    id: 'lab-09-loop-unrolling',
    module: 'Control Hazards',
    title: 'Loop Unrolling to Reduce Branch Overhead',
    level: 'advanced',
    estimatedMinutes: 30,
    concepts: ['loop-unrolling', 'branch-overhead', 'ilp', 'code-optimization'],
    starterCode: `# Lab 9: Loop Unrolling
# Original loop: adds 1 to $t2 eight times
# Each iteration has a branch + jump = overhead

# ORIGINAL (run this first to see CPI)
# addi $t0, $zero, 0
# addi $t1, $zero, 8
# addi $t2, $zero, 0
# loop:
#   beq  $t0, $t1, done
#   addi $t2, $t2, 1
#   addi $t0, $t0, 1
#   j    loop
# done:

# UNROLLED VERSION (2x unrolling — half the branches)
addi $t0, $zero, 0       # i = 0
addi $t1, $zero, 8       # limit = 8
addi $t2, $zero, 0       # sum = 0

loop_unrolled:
  beq  $t0, $t1, done
  addi $t2, $t2, 1       # Iteration 1
  addi $t0, $t0, 1
  addi $t2, $t2, 1       # Iteration 2 (unrolled)
  addi $t0, $t0, 1
  j    loop_unrolled

done:
add $t3, $t2, $zero      # Copy result`,
    instructions: `## Goal
Reduce branch overhead by unrolling a loop — doing more work per iteration.

## What to do
1. First, uncomment the ORIGINAL loop (and comment the unrolled version). **Run** and note the cycle count and CPI.
2. Then switch to the UNROLLED version. **Run** and compare cycle count and CPI.
3. The unrolled version does the same work but with **half the branches**.

## Why It Works
- Original: 8 iterations × (beq + addi + addi + j) = 32 instructions + 8 branches
- 2x Unrolled: 4 iterations × (beq + 2×addi + 2×addi + j) = 24 instructions + 4 branches
- Fewer branches = fewer potential mispredictions = fewer wasted cycles

## Trade-off
Unrolling increases code size. 4x unrolling is even faster but uses more instruction memory.`,
    hints: [
      'Note the cycle count difference between original and unrolled versions',
      'The unrolled version should have fewer stalls from branch mispredictions',
      'Loop unrolling is a standard compiler optimization (-O2 and above)',
    ],
    sampleTestCases: [
      { id: 'lab09-tc1', name: 'sum ($t2) equals 8', register: '$t2', expectedValue: 8 },
      { id: 'lab09-tc2', name: 'i ($t0) equals 8', register: '$t0', expectedValue: 8 },
    ],
    learningObjective: 'Student can apply loop unrolling and measure the performance improvement',
  },

  // ════════════════════════════════════════════════════════════════════════
  // MODULE 4: Forwarding & Optimization
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lab-10-forwarding-comparison',
    module: 'Forwarding & Optimization',
    title: 'Forwarding On vs Off: The Diff View',
    level: 'intermediate',
    estimatedMinutes: 20,
    concepts: ['forwarding-comparison', 'diff-view', 'stall-analysis', 'performance-impact'],
    starterCode: `# Lab 10: Forwarding Comparison
# This program has multiple dependent instruction chains.
# Use the Diff view to compare execution with and without forwarding.

addi $t0, $zero, 3
addi $t1, $zero, 7
add  $t2, $t0, $t1       # Depends on $t0, $t1
sub  $t3, $t2, $t0       # Depends on $t2
sll  $t4, $t3, 2         # Depends on $t3 (shift left = multiply by 4)
add  $t5, $t4, $t1       # Depends on $t4
addi $t6, $t5, 1         # Depends on $t5

# Final: $t6 = ((((3 + 7) - 3) << 2) + 7) + 1
#       = (((10 - 3) << 2) + 7) + 1
#       = ((7 << 2) + 7) + 1
#       = (28 + 7) + 1 = 36`,
    instructions: `## Goal
Use the simulator's **Diff View** to visually compare execution with forwarding ON vs OFF.

## What to do
1. Open the **Diff** tab in the simulator
2. The left side shows execution WITHOUT forwarding, the right WITH forwarding
3. Count the stall bubbles on each side
4. Compare the total cycle counts

## Analysis Questions
- How many stall cycles does forwarding eliminate?
- What is the CPI with forwarding? Without?
- Which specific forwarding path (EX→EX or MEM→EX) resolves each hazard?`,
    hints: [
      'The Diff view shows both pipelines side by side',
      'Every stall bubble adds 1 to the total cycle count',
      'This chain of 5 dependent instructions creates the worst case for stalls',
    ],
    sampleTestCases: [
      { id: 'lab10-tc1', name: '$t2 equals 10', register: '$t2', expectedValue: 10 },
      { id: 'lab10-tc2', name: '$t4 equals 28 (7 << 2)', register: '$t4', expectedValue: 28 },
      { id: 'lab10-tc3', name: '$t6 equals 36', register: '$t6', expectedValue: 36 },
    ],
    learningObjective: 'Student can use the Diff view and quantify forwarding\'s impact on CPI',
  },

  {
    id: 'lab-11-instruction-scheduling',
    module: 'Forwarding & Optimization',
    title: 'Manual Instruction Scheduling',
    level: 'advanced',
    estimatedMinutes: 30,
    concepts: ['instruction-scheduling', 'code-optimization', 'dependency-analysis', 'ilp'],
    starterCode: `# Lab 11: Instruction Scheduling
# This code has POOR scheduling — many avoidable stalls even with forwarding.
# Your job: reorder the instructions to minimize stalls.

.data
a: .word 10
b: .word 20
c: .word 30

.text
# POORLY SCHEDULED (load-use hazards everywhere):
lw   $t0, 0($zero)     # Load a
add  $t3, $t0, $t0     # Stall! Uses $t0 immediately after load

lw   $t1, 4($zero)     # Load b
add  $t4, $t1, $t1     # Stall! Uses $t1 immediately after load

lw   $t2, 8($zero)     # Load c
add  $t5, $t2, $t2     # Stall! Uses $t2 immediately after load

add  $t6, $t3, $t4     # $t6 = 2a + 2b
add  $t7, $t6, $t5     # $t7 = 2a + 2b + 2c = 2(a+b+c) = 120`,
    instructions: `## Goal
Reorder instructions to eliminate load-use stalls while preserving correctness.

## What to do
1. **Run** the original code — note the cycle count and stall count
2. Identify the load-use hazards (lw followed immediately by a dependent instruction)
3. **Rewrite** the code: interleave the loads and adds so that each load has time to complete
4. **Run** your optimized version — the stall count should drop to 0

## Optimization Strategy
Instead of:
\`\`\`
lw $t0, 0($zero)    # load a
add $t3, $t0, $t0   # STALL (needs $t0)
lw $t1, 4($zero)    # load b  
add $t4, $t1, $t1   # STALL (needs $t1)
\`\`\`

Try:
\`\`\`
lw $t0, 0($zero)    # load a
lw $t1, 4($zero)    # load b (independent — fills the slot!)
add $t3, $t0, $t0   # $t0 is ready (MEM→EX forward, no stall)
add $t4, $t1, $t1   # $t1 is ready
\`\`\``,
    hints: [
      'Move loads earlier and their dependent adds later',
      'lw takes 1 extra cycle — you need 1 independent instruction between lw and its consumer',
      'All three loads are independent of each other — perfect for interleaving',
    ],
    sampleTestCases: [
      { id: 'lab11-tc1', name: '$t3 equals 20 (2*a)', register: '$t3', expectedValue: 20 },
      { id: 'lab11-tc2', name: '$t4 equals 40 (2*b)', register: '$t4', expectedValue: 40 },
      { id: 'lab11-tc3', name: '$t7 equals 120 (2*(a+b+c))', register: '$t7', expectedValue: 120 },
    ],
    learningObjective: 'Student can reorder instructions to eliminate load-use stalls while preserving program semantics',
  },

  {
    id: 'lab-12-cpi-optimization',
    module: 'Forwarding & Optimization',
    title: 'CPI Optimization Challenge',
    level: 'advanced',
    estimatedMinutes: 35,
    concepts: ['cpi-optimization', 'performance-analysis', 'code-optimization', 'pipeline-efficiency'],
    starterCode: `# Lab 12: CPI Optimization Challenge
# Goal: Compute the sum 1+2+3+...+10 = 55
# Achieve the LOWEST possible CPI with forwarding ON.
#
# This naive version works but has poor CPI due to
# branch overhead and load-use hazards.

.data
numbers: .word 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

.text
addi $t0, $zero, 0       # sum = 0
addi $t1, $zero, 0       # index = 0 (byte offset)
addi $t2, $zero, 40      # limit = 10 * 4 bytes = 40

loop:
  beq  $t1, $t2, done
  lw   $t3, 0($t1)       # Load numbers[i]
  add  $t0, $t0, $t3     # sum += numbers[i]  (load-use stall!)
  addi $t1, $t1, 4       # index += 4
  j    loop

done:
# $t0 should be 55`,
    instructions: `## Goal
Optimize this loop to achieve the lowest possible CPI while computing the correct sum.

## What to do
1. **Run** the original — note cycles, stalls, and CPI
2. Apply optimizations:
   - Schedule instructions to avoid load-use stalls
   - Consider loop unrolling (2x or 4x)
   - Reorder instructions within the loop body
3. **Run** your optimized version and compare CPI

## Target
- Original CPI: ~1.5+
- Good optimization: CPI ~1.2
- Excellent optimization: CPI ~1.1

## Rules
- The final sum in \`$t0\` must be exactly 55
- You may change instruction order, unroll, or restructure — but no hardcoding the answer!`,
    hints: [
      'Move the addi $t1 between lw and add to fill the load delay slot',
      'Loop unrolling can reduce branch overhead significantly',
      'Try loading 2 values at once and adding them independently',
    ],
    sampleTestCases: [
      { id: 'lab12-tc1', name: 'sum ($t0) equals 55', register: '$t0', expectedValue: 55 },
    ],
    learningObjective: 'Student can apply multiple optimization techniques to minimize CPI in a real program',
  },

  // ════════════════════════════════════════════════════════════════════════
  // MODULE 5: Cache Memory
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lab-13-cache-basics',
    module: 'Cache Memory',
    title: 'Direct-Mapped Cache: Hits and Misses',
    level: 'intermediate',
    estimatedMinutes: 25,
    concepts: ['cache-basics', 'direct-mapped', 'cache-hit', 'cache-miss', 'spatial-locality'],
    starterCode: `# Lab 13: Direct-Mapped Cache
# Open the Cache view to watch hits and misses in real time.
#
# This program accesses memory sequentially — great spatial locality.

.data
array: .word 10, 20, 30, 40, 50, 60, 70, 80

.text
# Sequential access pattern (good cache behavior)
lw $t0, 0($zero)        # array[0] — MISS (cold miss)
lw $t1, 4($zero)        # array[1] — HIT (same cache line!)
lw $t2, 8($zero)        # array[2] — depends on line size...
lw $t3, 12($zero)       # array[3]

# Access the same locations again (temporal locality)
lw $t4, 0($zero)        # array[0] again — HIT (already cached!)
lw $t5, 4($zero)        # array[1] again — HIT

# Store the sum
add $t6, $t0, $t1       # 10 + 20 = 30
add $t6, $t6, $t2       # + 30 = 60
add $t6, $t6, $t3       # + 40 = 100`,
    instructions: `## Goal
Understand how a direct-mapped cache handles sequential memory accesses.

## Setup
Open the **Cache** view tab in the simulator.

## What to do
1. **Assemble** and **Step** through each load instruction
2. Watch the Cache view: each access shows HIT or MISS
3. Notice the first access to each cache line is a MISS (cold/compulsory miss)
4. Re-accessing the same addresses should be HITs (temporal locality)

## Key Concepts
- **Compulsory miss**: First access to a block — always a miss
- **Spatial locality**: Accessing nearby addresses → likely in the same cache line
- **Temporal locality**: Re-accessing the same address → cached from before
- **Hit rate** = Hits / Total accesses × 100%`,
    hints: [
      'The first lw is always a miss (cold miss)',
      'Adjacent words may be in the same cache line depending on block size',
      'Re-reading the same addresses should hit because they were cached',
    ],
    sampleTestCases: [
      { id: 'lab13-tc1', name: '$t0 equals 10', register: '$t0', expectedValue: 10 },
      { id: 'lab13-tc2', name: '$t4 equals 10 (re-read)', register: '$t4', expectedValue: 10 },
      { id: 'lab13-tc3', name: '$t6 equals 100', register: '$t6', expectedValue: 100 },
    ],
    learningObjective: 'Student can predict cache hits/misses for sequential access patterns in a direct-mapped cache',
  },

  {
    id: 'lab-14-cache-associativity',
    module: 'Cache Memory',
    title: 'Set-Associative vs Direct-Mapped Cache',
    level: 'advanced',
    estimatedMinutes: 30,
    concepts: ['set-associative', 'cache-conflict', 'associativity-tradeoff', 'lru-replacement'],
    starterCode: `# Lab 14: Cache Associativity
# This program creates CONFLICT MISSES in a direct-mapped cache
# but works well in a set-associative cache.

.data
# Two arrays that map to the SAME cache set in a direct-mapped cache
# (their addresses differ by a multiple of the cache size)
arrayA: .word 1, 2, 3, 4, 5, 6, 7, 8
arrayB: .word 10, 20, 30, 40, 50, 60, 70, 80

.text
# Alternating access pattern — causes thrashing in direct-mapped cache
addi $t7, $zero, 32       # Offset to arrayB (8 words × 4 bytes)

lw $t0, 0($zero)          # arrayA[0]
lw $t1, 0($t7)            # arrayB[0] — may EVICT arrayA[0]!
lw $t2, 0($zero)          # arrayA[0] again — MISS if evicted!
lw $t3, 0($t7)            # arrayB[0] again — MISS if evicted!

# Sum first elements of both arrays
add $t4, $t0, $t1         # 1 + 10 = 11

# Try this with different cache configurations:
# Direct-mapped: many conflict misses
# 2-way set-associative: both fit in the same set!`,
    instructions: `## Goal
Understand why cache associativity matters and how conflict misses occur.

## What to do
1. Set the cache to **Direct-Mapped** in Architecture Settings
2. **Run** and check the hit rate in the Cache view
3. Change to **2-way Set-Associative** and **Run** again
4. Compare hit rates — the set-associative cache should have fewer misses

## Conflict Misses
In a direct-mapped cache, each memory address maps to exactly ONE cache line.
If two addresses map to the same line, they **evict** each other — this is a conflict miss.

## Set-Associative Fix
A 2-way set-associative cache has 2 slots per set. Both arrayA[0] and arrayB[0] can coexist!

| Cache Type | Slots per Set | Conflict Misses |
|------------|---------------|-----------------|
| Direct-mapped | 1 | Many |
| 2-way SA | 2 | Fewer |
| 4-way SA | 4 | Even fewer |
| Fully assoc. | All | Zero (only capacity misses) |`,
    hints: [
      'In Architecture Settings, change the cache associativity',
      'Watch the conflict miss count in the Cache view stats',
      'Alternating between two addresses that map to the same set = worst case for direct-mapped',
    ],
    sampleTestCases: [
      { id: 'lab14-tc1', name: '$t0 equals 1 (arrayA[0])', register: '$t0', expectedValue: 1 },
      { id: 'lab14-tc2', name: '$t1 equals 10 (arrayB[0])', register: '$t1', expectedValue: 10 },
      { id: 'lab14-tc3', name: '$t4 equals 11', register: '$t4', expectedValue: 11 },
    ],
    learningObjective: 'Student can explain conflict misses and how set-associativity resolves them',
  },

  {
    id: 'lab-15-cache-friendly-code',
    module: 'Cache Memory',
    title: 'Writing Cache-Friendly Code',
    level: 'advanced',
    estimatedMinutes: 35,
    concepts: ['cache-optimization', 'stride-access', 'spatial-locality', 'row-major', 'performance-tuning'],
    starterCode: `# Lab 15: Cache-Friendly Code
# Compare sequential (stride-1) vs strided access patterns.
# Sequential access exploits spatial locality; strided access does not.

.data
# 16-element array (64 bytes)
data: .word 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16

.text
# === PATTERN 1: Sequential access (stride-1, cache-friendly) ===
addi $t0, $zero, 0       # sum1 = 0
addi $t1, $zero, 0       # index = 0
addi $t2, $zero, 64      # limit = 16 * 4

seq_loop:
  beq  $t1, $t2, seq_done
  lw   $t3, 0($t1)
  add  $t0, $t0, $t3
  addi $t1, $t1, 4       # Stride of 4 bytes = 1 word (sequential)
  j    seq_loop
seq_done:

# === PATTERN 2: Strided access (stride-4, cache-UNFRIENDLY) ===
addi $s0, $zero, 0       # sum2 = 0
addi $s1, $zero, 0       # index = 0
addi $s2, $zero, 64      # limit

stride_loop:
  beq  $s1, $s2, stride_done
  lw   $s3, 0($s1)
  add  $s0, $s0, $s3
  addi $s1, $s1, 16      # Stride of 16 bytes = 4 words (skipping 3!)
  j    stride_loop
stride_done:
# sum2 = 1 + 5 + 9 + 13 = 28`,
    instructions: `## Goal
Understand why sequential (stride-1) access patterns are dramatically faster than strided access.

## What to do
1. **Run** the program and check the Cache view statistics for both loops
2. Compare the hit rate of the sequential loop vs the strided loop
3. The sequential loop accesses words 0, 4, 8, 12... (adjacent in memory)
4. The strided loop accesses words 0, 16, 32, 48... (skipping 3 words each time)

## Why Sequential Wins
When the cache loads a block, it brings in multiple adjacent words.
- Sequential access uses ALL words in each cache line → high hit rate
- Strided access only uses ONE word per cache line → wastes the rest

## Real-World Impact
This is why iterating over a 2D array **row by row** (row-major) is faster than **column by column**:
\`\`\`
// C code — cache-friendly          // C code — cache-unfriendly
for (i=0; i<N; i++)                 for (j=0; j<N; j++)
  for (j=0; j<N; j++)                for (i=0; i<N; i++)
    sum += A[i][j];  // stride-1       sum += A[i][j];  // stride-N
\`\`\`

## Challenge
Can you modify the strided loop to achieve a higher hit rate without changing the stride? (Hint: prefetching)`,
    hints: [
      'Check the Cache view hit rate for each loop separately',
      'Sequential access should have a much higher hit rate',
      'Each cache line holds multiple words — stride-1 access uses all of them',
    ],
    sampleTestCases: [
      { id: 'lab15-tc1', name: 'sum1 ($t0) equals 136 (1+2+...+16)', register: '$t0', expectedValue: 136 },
      { id: 'lab15-tc2', name: 'sum2 ($s0) equals 28 (1+5+9+13)', register: '$s0', expectedValue: 28 },
    ],
    learningObjective: 'Student can explain spatial locality and write cache-friendly access patterns',
  },
];

/**
 * Get labs grouped by module
 */
export function getLabsByModule(): Record<string, CurriculumLab[]> {
  const grouped: Record<string, CurriculumLab[]> = {};
  for (const lab of CURRICULUM_LABS) {
    if (!grouped[lab.module]) grouped[lab.module] = [];
    grouped[lab.module].push(lab);
  }
  return grouped;
}

/**
 * Get a single lab by ID
 */
export function getLabById(labId: string): CurriculumLab | undefined {
  return CURRICULUM_LABS.find(lab => lab.id === labId);
}

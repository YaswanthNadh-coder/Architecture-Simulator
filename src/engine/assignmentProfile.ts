export interface TestCase {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  input?: {
    memory?: Record<number, number>;
    registers?: Record<string, number>;
    console?: string[];
    code?: string; // Optional input code to prepend
  };
  expected: {
    memory?: Record<number, number>;
    registers?: Record<string, number>;
    console?: string[];
    maxCycles?: number;
    maxStalls?: number;
  };
  weight: number;
}

export interface AssignmentProfile {
  id: string;
  title: string;
  description: string;
  specification?: string;          // Rich markdown specification text
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  starterCode: string;
  blockedInstructions?: string[];  // Instructions students cannot use
  dueDate?: string;                // ISO date string
  timeLimit?: number;              // Time limit in minutes
  isa?: 'mips' | 'riscv';          // Architecture strategy (default MIPS)
  testCases: TestCase[];
  rubric: {
    correctness: number;
    efficiency: number;
    style: number;
  };
  latePenaltyPct?: number;
  maxAttempts?: number;
  maxCyclesLimit?: number;
}

export const ASSIGNMENTS: AssignmentProfile[] = [
  {
    id: 'lab3-hazards',
    title: 'Lab 3: Pipeline Hazards & Forwarding',
    description: 'Optimize the given code to eliminate stalls when forwarding is enabled.',
    difficulty: 'Intermediate',
    starterCode: `# Optimize this code to minimize stalls
.text
main:
  addi $t0, $zero, 10
  addi $t1, $zero, 20
  add  $t2, $t0, $t1  # RAW hazard
  sub  $t3, $t2, $t0  # RAW hazard
  
  # TODO: Reorder or optimize instructions
  
  li $v0, 10
  syscall
`,
    testCases: [
      {
        id: 'tc1',
        name: 'Correctness: Result computation',
        description: 'Ensures $t3 contains the correct result (20)',
        expected: { registers: { '$t3': 20 } },
        weight: 50
      },
      {
        id: 'tc2',
        name: 'Efficiency: No Stalls (with forwarding)',
        description: 'Code should execute with 0 stalls when forwarding is enabled',
        expected: { maxStalls: 0 },
        weight: 50
      }
    ],
    rubric: { correctness: 50, efficiency: 50, style: 0 }
  },
  {
    id: 'lab4-arrays',
    title: 'Lab 4: Array Summation',
    description: 'Write a loop to sum an array of 5 integers. The array base address is in $a0. Store the result in $v0.',
    difficulty: 'Beginner',
    starterCode: `.data
array: .word 1, 2, 3, 4, 5

.text
main:
  la $a0, array
  
  # Your code here
  
  li $v0, 10
  syscall
`,
    testCases: [
      {
        id: 'tc1',
        name: 'Sum Validation',
        description: 'Calculates the sum of [1, 2, 3, 4, 5]',
        expected: { registers: { '$v0': 15 } },
        weight: 100
      }
    ],
    rubric: { correctness: 100, efficiency: 0, style: 0 }
  }
];

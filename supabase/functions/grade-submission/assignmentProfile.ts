export interface TestCase {
  id: string;
  name: string;
  description: string;
  input?: {
    memory?: Record<number, number>;
    registers?: Record<string, number>;
    console?: string[];
    code?: string;
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
  specification?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  starterCode: string;
  blockedInstructions?: string[];
  dueDate?: string;
  timeLimit?: number;
  testCases: TestCase[];
  rubric: {
    correctness: number;
    efficiency: number;
    style: number;
  };
}

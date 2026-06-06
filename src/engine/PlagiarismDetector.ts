import { assemble } from './mipsParser';

export interface PlagiarismReport {
  similarityScore: number;
  matchedSequences: { length: number; percent: number }[];
  isSuspicious: boolean;
  warnings: string[];
}

export class PlagiarismDetector {
  
  /**
   * Compares two MIPS source codes by normalizing them into sequences of opcodes,
   * stripping out registers, immediate values, and labels.
   * This defeats simple renaming, spacing, and immediate tweaks.
   */
  static compare(sourceA: string, sourceB: string): PlagiarismReport {
    const opcodesA = this.extractOpcodes(sourceA);
    const opcodesB = this.extractOpcodes(sourceB);

    if (opcodesA.length === 0 || opcodesB.length === 0) {
      return {
        similarityScore: 0,
        matchedSequences: [],
        isSuspicious: false,
        warnings: ['One or both programs have no executable instructions.']
      };
    }

    // Find Longest Common Subsequence (LCS) of opcodes
    const lcsLength = this.longestCommonSubsequence(opcodesA, opcodesB);
    
    // Calculate Jaccard-like structural similarity based on sequence length
    const maxLength = Math.max(opcodesA.length, opcodesB.length);
    const minLength = Math.min(opcodesA.length, opcodesB.length);
    
    const similarityScore = (lcsLength / maxLength) * 100;
    
    const warnings: string[] = [];
    let isSuspicious = false;

    if (similarityScore > 85) {
      isSuspicious = true;
      warnings.push(`Extremely high structural similarity (${similarityScore.toFixed(1)}%). Likely copied.`);
    } else if (similarityScore > 65) {
      isSuspicious = true;
      warnings.push(`High structural similarity (${similarityScore.toFixed(1)}%). Manual review recommended.`);
    }

    if (opcodesA.length > 20 && opcodesA.length === opcodesB.length && similarityScore > 95) {
      warnings.push('Instruction count and structure are identical. Only registers/values differ.');
    }

    return {
      similarityScore: Math.round(similarityScore),
      matchedSequences: [
        { length: lcsLength, percent: (lcsLength / minLength) * 100 }
      ],
      isSuspicious,
      warnings
    };
  }

  /**
   * Assembles the code and extracts just the bare opcodes,
   * ignoring registers, offsets, and labels.
   */
  private static extractOpcodes(code: string): string[] {
    const result = assemble(code);
    return result.instructions.map(inst => inst.opcode.toLowerCase());
  }

  /**
   * Standard Dynamic Programming LCS algorithm
   */
  private static longestCommonSubsequence(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }
}

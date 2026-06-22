import { assemble, type ParsedInstruction } from './mipsParser';

export interface PlagiarismReport {
  similarityScore: number;
  matchedSequences: { length: number; percent: number }[];
  isSuspicious: boolean;
  warnings: string[];
}

export class PlagiarismDetector {
  
  /**
   * Compares two MIPS source codes by normalizing them into sequences of opcodes,
   * checking register categories, comparing control flow graph sequences, and calculating a composite score.
   */
  static compare(sourceA: string, sourceB: string): PlagiarismReport {
    let assembledA;
    let assembledB;
    
    try {
      assembledA = assemble(sourceA);
    } catch (e) {
      return {
        similarityScore: 0,
        matchedSequences: [],
        isSuspicious: false,
        warnings: ['Program A failed to assemble. Plagiarism check aborted.']
      };
    }
    
    try {
      assembledB = assemble(sourceB);
    } catch (e) {
      return {
        similarityScore: 0,
        matchedSequences: [],
        isSuspicious: false,
        warnings: ['Program B failed to assemble. Plagiarism check aborted.']
      };
    }

    const rawInstructionsA = assembledA.instructions || [];
    const rawInstructionsB = assembledB.instructions || [];

    // Filter out NOPs and meaningless instructions (e.g. sll $0, $0, 0, or add $0, $0, $0)
    const nonNopsA = rawInstructionsA.filter(inst => !this.isNop(inst));
    const nonNopsB = rawInstructionsB.filter(inst => !this.isNop(inst));

    const totalA = rawInstructionsA.length;
    const totalB = rawInstructionsB.length;
    const nonNopCountA = nonNopsA.length;
    const nonNopCountB = nonNopsB.length;

    if (nonNopCountA === 0 || nonNopCountB === 0) {
      return {
        similarityScore: 0,
        matchedSequences: [],
        isSuspicious: false,
        warnings: ['One or both programs have no executable instructions after removing NOPs.']
      };
    }

    // Warnings array
    const warnings: string[] = [];

    // 1. Evasion check (high proportion of NOPs)
    const nopRatioA = (totalA - nonNopCountA) / (totalA || 1);
    const nopRatioB = (totalB - nonNopCountB) / (totalB || 1);
    if (nopRatioA > 0.2 && totalA > 10) {
      warnings.push(`Evasion warning: Program A contains a high ratio of NOP/meaningless instructions (${(nopRatioA * 100).toFixed(0)}%).`);
    }
    if (nopRatioB > 0.2 && totalB > 10) {
      warnings.push(`Evasion warning: Program B contains a high ratio of NOP/meaningless instructions (${(nopRatioB * 100).toFixed(0)}%).`);
    }

    // 2. Opcode LCS score
    const opcodesA = nonNopsA.map(inst => inst.op.toLowerCase());
    const opcodesB = nonNopsB.map(inst => inst.op.toLowerCase());
    const lcsOpcode = this.longestCommonSubsequence(opcodesA, opcodesB);
    const scoreOpcode = (lcsOpcode / Math.max(opcodesA.length, opcodesB.length)) * 100;

    // 3. Register Fingerprint LCS score
    const fingerprintsA = nonNopsA.map(inst => this.getInstructionFingerprint(inst));
    const fingerprintsB = nonNopsB.map(inst => this.getInstructionFingerprint(inst));
    const lcsFingerprint = this.longestCommonSubsequence(fingerprintsA, fingerprintsB);
    const scoreFingerprint = (lcsFingerprint / Math.max(fingerprintsA.length, fingerprintsB.length)) * 100;

    // 4. Control Flow Graph LCS score
    const cfgA = nonNopsA.filter(inst => inst.isBranch || inst.isJump || inst.isJumpReg).map(inst => this.getCfgSignature(inst));
    const cfgB = nonNopsB.filter(inst => inst.isBranch || inst.isJump || inst.isJumpReg).map(inst => this.getCfgSignature(inst));
    
    let scoreCfg = 100;
    let lcsCfg = 0;
    if (cfgA.length > 0 || cfgB.length > 0) {
      if (cfgA.length === 0 || cfgB.length === 0) {
        scoreCfg = 0;
      } else {
        lcsCfg = this.longestCommonSubsequence(cfgA, cfgB);
        scoreCfg = (lcsCfg / Math.max(cfgA.length, cfgB.length)) * 100;
      }
    }

    // 5. Instruction Count Ratio score
    const scoreCount = (Math.min(nonNopCountA, nonNopCountB) / Math.max(nonNopCountA, nonNopCountB)) * 100;

    // Composite similarity score
    // 35% Opcode-LCS, 40% Fingerprint-LCS, 20% CFG-LCS, 5% count ratio
    const similarityScore = Math.round(
      0.35 * scoreOpcode + 
      0.40 * scoreFingerprint + 
      0.20 * scoreCfg + 
      0.05 * scoreCount
    );

    let isSuspicious = false;
    if (similarityScore > 80) {
      isSuspicious = true;
      warnings.push(`Extremely high composite similarity (${similarityScore}%). Active plagiarism suspected.`);
    } else if (similarityScore > 60) {
      isSuspicious = true;
      warnings.push(`Moderate to high composite similarity (${similarityScore}%). Manual review recommended.`);
    }

    // Check if instructions are structurally identical but with different registers
    if (scoreOpcode > 90 && scoreFingerprint < 70) {
      warnings.push('Variable/register renaming pattern detected: Core instructions are identical but different register pools are used.');
    }

    return {
      similarityScore,
      matchedSequences: [
        { length: lcsOpcode, percent: Math.round(scoreOpcode) }
      ],
      isSuspicious,
      warnings
    };
  }

  /**
   * Helper to check if an instruction is a NOP or does nothing.
   */
  private static isNop(inst: ParsedInstruction): boolean {
    const op = inst.op.toLowerCase();
    if (op === 'nop') return true;
    if (op === 'sll' && inst.rd === 0 && inst.rt === 0 && inst.shamt === 0) return true;
    if ((op === 'add' || op === 'addu' || op === 'or' || op === 'xor' || op === 'sub' || op === 'subu') && inst.rd === 0 && inst.rs === 0 && inst.rt === 0) return true;
    return false;
  }

  /**
   * Maps a register number to its logical architectural category.
   */
  private static getRegClass(reg: number): string {
    if (reg === 0) return 'z'; // zero register
    if (reg === 1) return 'at'; // assembler temporary
    if (reg === 2 || reg === 3) return 'v'; // values / returns
    if (reg >= 4 && reg <= 7) return 'a'; // arguments
    if ((reg >= 8 && reg <= 15) || reg === 24 || reg === 25) return 't'; // temporaries
    if ((reg >= 16 && reg <= 23) || reg === 30) return 's'; // saved registers
    if (reg === 28) return 'gp'; // global pointer
    if (reg === 29) return 'sp'; // stack pointer
    if (reg === 31) return 'ra'; // return address
    return 'o'; // other / default
  }

  /**
   * Formats instruction fingerprint capturing opcode + register class layout.
   */
  private static getInstructionFingerprint(inst: ParsedInstruction): string {
    const op = inst.op.toLowerCase();
    const writeClass = inst.writesReg >= 0 ? this.getRegClass(inst.writesReg) : '_';
    const readClasses = (inst.readsRegs || [])
      .filter(r => r !== 0)
      .map(r => this.getRegClass(r))
      .sort()
      .join('');
    
    return `${op}:${writeClass}:${readClasses}`;
  }

  /**
   * Extracts CFG signature node representation for control flow elements.
   */
  private static getCfgSignature(inst: ParsedInstruction): string {
    const op = inst.op.toLowerCase();
    if (inst.isBranch) {
      const readClasses = (inst.readsRegs || [])
        .filter(r => r !== 0)
        .map(r => this.getRegClass(r))
        .sort()
        .join('');
      return `branch:${op}:${readClasses}`;
    }
    if (inst.isJumpReg) {
      const readClasses = (inst.readsRegs || [])
        .filter(r => r !== 0)
        .map(r => this.getRegClass(r))
        .sort()
        .join('');
      return `jumpreg:${op}:${readClasses}`;
    }
    if (inst.isJump) {
      return `jump:${op}`;
    }
    return `other:${op}`;
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


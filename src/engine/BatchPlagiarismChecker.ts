import { PlagiarismDetector } from './PlagiarismDetector';

export interface PairResult {
  studentA: string;
  studentB: string;
  nameA: string;
  nameB: string;
  score: number;
  isSuspicious: boolean;
  warnings: string[];
}

export class BatchPlagiarismChecker {
  /**
   * Compare all pairs of submissions. Returns pairs sorted by similarity descending.
   * Only pairs above the threshold are returned.
   */
  static compareAll(
    submissions: Array<{ student_id: string; name: string; code: string }>,
    threshold: number = 65
  ): PairResult[] {
    const results: PairResult[] = [];

    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const a = submissions[i];
        const b = submissions[j];
        
        // Skip comparing a student with themselves (shouldn't happen, but safety)
        if (a.student_id === b.student_id) continue;

        try {
          const report = PlagiarismDetector.compare(a.code, b.code);

          if (report.similarityScore >= threshold) {
            results.push({
              studentA: a.student_id,
              studentB: b.student_id,
              nameA: a.name,
              nameB: b.name,
              score: report.similarityScore,
              isSuspicious: report.isSuspicious,
              warnings: report.warnings,
            });
          }
        } catch (e) {
          console.error(`Plagiarism comparison failed between ${a.name} and ${b.name}:`, e);
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

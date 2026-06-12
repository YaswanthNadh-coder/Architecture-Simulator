/**
 * Hazard Explanation Generator — Feature #3
 * Produces natural-language explanations for pipeline hazards and stalls.
 */

import type { ParsedInstruction } from './mipsParser';
import { REG_NAMES } from './mipsParser';

export interface HazardExplanation {
  type: 'data-hazard' | 'load-use' | 'control-hazard' | 'structural' | 'forwarding';
  severity: 'stall' | 'forward' | 'flush' | 'info';
  title: string;
  explanation: string;
  involved: string[];  // instructions involved
  register?: string;   // conflicting register name
  cycle: number;
}

function regName(r: number): string {
  return REG_NAMES[r] || `$${r}`;
}

/**
 * Analyze the current pipeline state and produce hazard explanations.
 */
export function explainHazards(
  pipeline: {
    IF: { instruction: ParsedInstruction | null; status: string };
    ID: { instruction: ParsedInstruction | null; status: string };
    EX: { instruction: ParsedInstruction | null; status: string };
    MEM: { instruction: ParsedInstruction | null; status: string };
    WB: { instruction: ParsedInstruction | null; status: string };
  },
  cycle: number,
  forwardingEnabled: boolean,
): HazardExplanation[] {
  const explanations: HazardExplanation[] = [];

  const idInst = pipeline.ID.instruction;
  const exInst = pipeline.EX.instruction;
  const memInst = pipeline.MEM.instruction;

  // Check for stall in ID stage (load-use hazard or no-forwarding data hazard)
  if (pipeline.ID.status === 'stall' || pipeline.EX.status === 'stall') {
    // Load-use hazard: EX has a load, ID reads its destination
    if (exInst && exInst.isLoad && idInst) {
      const loadDest = exInst.writesReg;
      const conflictRegs = idInst.readsRegs.filter(r => r === loadDest && r > 0);
      if (conflictRegs.length > 0) {
        const reg = regName(conflictRegs[0]);
        explanations.push({
          type: 'load-use',
          severity: 'stall',
          title: 'Load-Use Hazard',
          explanation: `"${idInst.raw.trim()}" needs ${reg} which is being loaded by "${exInst.raw.trim()}" — the value won't be available until the end of MEM stage. ${forwardingEnabled ? 'Even with forwarding, a 1-cycle stall is needed.' : 'Without forwarding, a stall is inserted.'}`,
          involved: [exInst.raw.trim(), idInst.raw.trim()],
          register: reg,
          cycle,
        });
      }
    }

    // Without forwarding, any RAW dependency causes stalls
    if (!forwardingEnabled && idInst) {
      if (exInst && exInst.writesReg > 0) {
        const conflictRegs = idInst.readsRegs.filter(r => r === exInst.writesReg && r > 0);
        if (conflictRegs.length > 0 && !exInst.isLoad) {
          const reg = regName(conflictRegs[0]);
          explanations.push({
            type: 'data-hazard',
            severity: 'stall',
            title: 'RAW Data Hazard (No Forwarding)',
            explanation: `"${idInst.raw.trim()}" needs ${reg} from "${exInst.raw.trim()}" — without forwarding, the pipeline must stall until the value is written back.`,
            involved: [exInst.raw.trim(), idInst.raw.trim()],
            register: reg,
            cycle,
          });
        }
      }
      if (memInst && memInst.writesReg > 0) {
        const conflictRegs = idInst.readsRegs.filter(r => r === memInst.writesReg && r > 0);
        if (conflictRegs.length > 0) {
          const reg = regName(conflictRegs[0]);
          explanations.push({
            type: 'data-hazard',
            severity: 'stall',
            title: 'RAW Data Hazard (No Forwarding)',
            explanation: `"${idInst.raw.trim()}" needs ${reg} from "${memInst.raw.trim()}" — stalling because forwarding is disabled.`,
            involved: [memInst.raw.trim(), idInst.raw.trim()],
            register: reg,
            cycle,
          });
        }
      }
    }
  }

  // Check for forwarding in EX stage
  if (pipeline.EX.status === 'forward' && exInst && forwardingEnabled) {
    // Find which instruction produced the value being forwarded
    if (memInst && memInst.writesReg > 0) {
      const fwdRegs = exInst.readsRegs.filter(r => r === memInst.writesReg && r > 0);
      if (fwdRegs.length > 0) {
        const reg = regName(fwdRegs[0]);
        explanations.push({
          type: 'forwarding',
          severity: 'forward',
          title: 'EX→EX Forwarding',
          explanation: `${reg} is being forwarded from the EX/MEM latch ("${memInst.raw.trim()}") directly to the ALU input for "${exInst.raw.trim()}" — no stall needed!`,
          involved: [memInst.raw.trim(), exInst.raw.trim()],
          register: reg,
          cycle,
        });
      }
    }
  }

  // Check for control hazard (branch/jump in EX with flush)
  if (pipeline.ID.status === 'bubble' && exInst && (exInst.isBranch || exInst.isJump)) {
    explanations.push({
      type: 'control-hazard',
      severity: 'flush',
      title: 'Pipeline Flush (Branch Misprediction)',
      explanation: `A ${exInst.isBranch ? 'branch' : 'jump'} "${exInst.raw.trim()}" was resolved in EX — the speculatively fetched instruction was wrong and has been flushed from the pipeline.`,
      involved: [exInst.raw.trim()],
      cycle,
    });
  }

  return explanations;
}

export interface BHTEntry {
  address: number;
  instruction: string;
  state: BPState;
  predictions: PredictionRecord[];
  hitCount: number;
  missCount: number;
}

export interface BTBEntry {
  tag: number;
  target: number;
  valid: boolean;
  instruction: string;
}

export interface PredictionRecord {
  cycle: number;
  predicted: boolean;
  actual: boolean;
  correct: boolean;
  stateBeforePredict: BPState;
  stateAfterUpdate: BPState;
}

export type BPState = 'strongly-not-taken' | 'weakly-not-taken' | 'weakly-taken' | 'strongly-taken';

const STATE_ORDER: BPState[] = ['strongly-not-taken', 'weakly-not-taken', 'weakly-taken', 'strongly-taken'];

function stateIndex(s: BPState): number {
  return STATE_ORDER.indexOf(s);
}

function nextState(current: BPState, taken: boolean): BPState {
  const idx = stateIndex(current);
  const newIdx = taken ? Math.min(idx + 1, 3) : Math.max(idx - 1, 0);
  return STATE_ORDER[newIdx];
}

function statePredictsToken(s: BPState): boolean {
  return s === 'weakly-taken' || s === 'strongly-taken';
}

export class BranchPredictionTracker {
  private bht = new Map<number, BHTEntry>();
  private btb = new Map<number, BTBEntry>();
  private bhtSize: number;
  
  public totalPredictions = 0;
  public correctPredictions = 0;
  
  constructor(bhtSize = 16) {
    this.bhtSize = bhtSize;
  }
  
  reset(): void {
    this.bht.clear();
    this.btb.clear();
    this.totalPredictions = 0;
    this.correctPredictions = 0;
  }
  
  recordBranch(
    pc: number,
    instruction: string,
    actualTaken: boolean,
    targetAddress: number,
    cycle: number,
    strategy: 'not-taken' | 'always-taken',
  ): void {
    const bhtIndex = (pc >>> 2) % this.bhtSize;
    let entry = this.bht.get(bhtIndex);
    if (!entry) {
      const initialState: BPState = strategy === 'always-taken' ? 'weakly-taken' : 'weakly-not-taken';
      entry = {
        address: pc,
        instruction: instruction.trim(),
        state: initialState,
        predictions: [],
        hitCount: 0,
        missCount: 0,
      };
      this.bht.set(bhtIndex, entry);
    }
    
    const predicted = statePredictsToken(entry.state);
    const correct = predicted === actualTaken;
    
    const stateBeforePredict = entry.state;
    entry.state = nextState(entry.state, actualTaken);
    
    const record: PredictionRecord = {
      cycle,
      predicted,
      actual: actualTaken,
      correct,
      stateBeforePredict,
      stateAfterUpdate: entry.state,
    };
    
    entry.predictions.push(record);
    entry.address = pc;
    entry.instruction = instruction.trim();
    
    if (correct) {
      entry.hitCount++;
      this.correctPredictions++;
    } else {
      entry.missCount++;
    }
    this.totalPredictions++;
    
    if (actualTaken) {
      this.btb.set(pc, {
        tag: pc,
        target: targetAddress,
        valid: true,
        instruction: instruction.trim(),
      });
    }
  }
  
  getBHT(): BHTEntry[] {
    const entries: BHTEntry[] = [];
    for (let i = 0; i < this.bhtSize; i++) {
      const entry = this.bht.get(i);
      if (entry) {
        entries.push({ ...entry, predictions: [...entry.predictions] });
      }
    }
    return entries;
  }
  
  getBTB(): BTBEntry[] {
    return Array.from(this.btb.values());
  }
  
  getAccuracy(): number {
    if (this.totalPredictions === 0) return 0;
    return Math.round((this.correctPredictions / this.totalPredictions) * 10000) / 100;
  }
}

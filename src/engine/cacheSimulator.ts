export interface CacheConfig {
  enabled: boolean;
  cacheSize: number;    // in bytes
  blockSize: number;    // in bytes
  associativity: number; // 1 = Direct, N = N-way
  missPenalty: number;  // stall cycles on miss (latency to next level / memory)
  policy?: 'lru' | 'fifo' | 'random'; // Replacement policy
}

export interface CacheLine {
  valid: boolean;
  tag: number;
  lru: number; // For LRU/FIFO replacement policy (higher is more recently used / newer)
  dirty: boolean;
}

export interface CacheStats {
  accesses: number;
  hits: number;
  misses: number;
  reads: number;
  writes: number;
}

export type CacheLevel = 'L1' | 'L2' | 'L3';

export interface CacheHierarchyConfig {
  l1: CacheConfig;
  l2: CacheConfig;
  l3: CacheConfig;
}

export class CacheSimulator {
  public config: CacheConfig;
  public sets: CacheLine[][] = [];
  public stats: CacheStats = this.emptyStats();
  private lruCounter = 0;

  constructor(config: CacheConfig) {
    this.config = config;
    this.init();
  }

  public updateConfig(newConfig: CacheConfig) {
    this.config = newConfig;
    this.init();
  }

  public reset() {
    this.init();
    this.stats = this.emptyStats();
    this.lruCounter = 0;
  }

  private init() {
    if (!this.config.enabled) return;

    // Safety checks
    const size = Math.max(16, this.config.cacheSize);
    const block = Math.max(4, this.config.blockSize);
    const assoc = Math.max(1, this.config.associativity);

    const numBlocks = Math.floor(size / block);
    const numSets = Math.max(1, Math.floor(numBlocks / assoc));

    this.sets = Array.from({ length: numSets }, () =>
      Array.from({ length: assoc }, () => ({
        valid: false,
        tag: 0,
        lru: 0,
        dirty: false,
      }))
    );
  }

  private emptyStats(): CacheStats {
    return { accesses: 0, hits: 0, misses: 0, reads: 0, writes: 0 };
  }

  public access(address: number, isWrite: boolean): { hit: boolean; stallCycles: number } {
    if (!this.config.enabled) {
      return { hit: false, stallCycles: 0 };
    }

    this.stats.accesses++;
    if (isWrite) this.stats.writes++;
    else this.stats.reads++;

    this.lruCounter++;

    const numBlocks = Math.floor(this.config.cacheSize / this.config.blockSize);
    const numSets = Math.max(1, Math.floor(numBlocks / this.config.associativity));
    
    // Address decomposition
    const blockAddress = Math.floor(address / this.config.blockSize);
    const index = numSets > 1 ? blockAddress % numSets : 0;
    const tag = Math.floor(blockAddress / numSets);

    const set = this.sets[index];

    // Check for hit
    for (let i = 0; i < set.length; i++) {
      if (set[i].valid && set[i].tag === tag) {
        // Hit
        const policy = this.config.policy || 'lru';
        if (policy === 'lru') {
          set[i].lru = this.lruCounter;
        }
        if (isWrite) set[i].dirty = true;
        this.stats.hits++;
        return { hit: true, stallCycles: 0 };
      }
    }

    // Miss
    this.stats.misses++;
    
    // Find victim (LRU, FIFO, or Random)
    let victimIdx = 0;
    const policy = this.config.policy || 'lru';

    if (policy === 'random') {
      let foundInvalid = false;
      for (let i = 0; i < set.length; i++) {
        if (!set[i].valid) {
          victimIdx = i;
          foundInvalid = true;
          break;
        }
      }
      if (!foundInvalid) {
        victimIdx = Math.floor(Math.random() * set.length);
      }
    } else if (policy === 'fifo') {
      let minLru = Infinity;
      for (let i = 0; i < set.length; i++) {
        if (!set[i].valid) {
          victimIdx = i;
          break;
        }
        if (set[i].lru < minLru) {
          minLru = set[i].lru;
          victimIdx = i;
        }
      }
    } else {
      // LRU (default)
      let minLru = Infinity;
      for (let i = 0; i < set.length; i++) {
        if (!set[i].valid) {
          victimIdx = i;
          break;
        }
        if (set[i].lru < minLru) {
          minLru = set[i].lru;
          victimIdx = i;
        }
      }
    }

    // Replace
    set[victimIdx] = {
      valid: true,
      tag: tag,
      lru: this.lruCounter,
      dirty: isWrite,
    };

    return { hit: false, stallCycles: this.config.missPenalty };
  }
}

export class CacheHierarchy {
  public l1: CacheSimulator;
  public l2: CacheSimulator;
  public l3: CacheSimulator;

  constructor(config: CacheHierarchyConfig) {
    this.l1 = new CacheSimulator(config.l1);
    this.l2 = new CacheSimulator(config.l2);
    this.l3 = new CacheSimulator(config.l3);
  }

  public updateConfig(config: CacheHierarchyConfig) {
    this.l1.updateConfig(config.l1);
    this.l2.updateConfig(config.l2);
    this.l3.updateConfig(config.l3);
  }

  public reset() {
    this.l1.reset();
    this.l2.reset();
    this.l3.reset();
  }

  public access(address: number, isWrite: boolean): { hitLevel: CacheLevel | null; hit: boolean; stallCycles: number } {
    if (!this.l1.config.enabled) {
      return { hitLevel: null, hit: false, stallCycles: 0 };
    }

    // L1 Access
    const l1Result = this.l1.access(address, isWrite);
    if (l1Result.hit) {
      return { hitLevel: 'L1', hit: true, stallCycles: 0 };
    }

    // L1 Miss -> check L2
    if (!this.l2.config.enabled) {
      return { hitLevel: null, hit: false, stallCycles: this.l1.config.missPenalty };
    }

    const l2Result = this.l2.access(address, isWrite);
    if (l2Result.hit) {
      return { hitLevel: 'L2', hit: true, stallCycles: this.l1.config.missPenalty };
    }

    // L2 Miss -> check L3
    if (!this.l3.config.enabled) {
      return { hitLevel: null, hit: false, stallCycles: this.l1.config.missPenalty + this.l2.config.missPenalty };
    }

    const l3Result = this.l3.access(address, isWrite);
    if (l3Result.hit) {
      return { hitLevel: 'L3', hit: true, stallCycles: this.l1.config.missPenalty + this.l2.config.missPenalty };
    }

    // L3 Miss -> Memory access
    return {
      hitLevel: null,
      hit: false,
      stallCycles: this.l1.config.missPenalty + this.l2.config.missPenalty + this.l3.config.missPenalty,
    };
  }

  public getAMAT(): number {
    if (!this.l1.config.enabled) return 1;

    const l1HitTime = 1;
    const l1MissRate = this.l1.stats.accesses > 0 ? this.l1.stats.misses / this.l1.stats.accesses : 0;
    
    if (!this.l2.config.enabled) {
      return l1HitTime + l1MissRate * this.l1.config.missPenalty;
    }

    const l2HitTime = this.l1.config.missPenalty;
    const l2MissRate = this.l2.stats.accesses > 0 ? this.l2.stats.misses / this.l2.stats.accesses : 0;

    if (!this.l3.config.enabled) {
      return l1HitTime + l1MissRate * (l2HitTime + l2MissRate * this.l2.config.missPenalty);
    }

    const l3HitTime = this.l2.config.missPenalty;
    const l3MissRate = this.l3.stats.accesses > 0 ? this.l3.stats.misses / this.l3.stats.accesses : 0;
    const memPenalty = this.l3.config.missPenalty;

    return l1HitTime + l1MissRate * (l2HitTime + l2MissRate * (l3HitTime + l3MissRate * memPenalty));
  }
}

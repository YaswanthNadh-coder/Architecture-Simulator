export interface CacheConfig {
  enabled: boolean;
  cacheSize: number;    // in bytes
  blockSize: number;    // in bytes
  associativity: number; // 1 = Direct, N = N-way
  missPenalty: number;  // stall cycles on miss
}

export interface CacheLine {
  valid: boolean;
  tag: number;
  lru: number; // For LRU replacement policy (higher is more recently used)
  dirty: boolean;
}

export interface CacheStats {
  accesses: number;
  hits: number;
  misses: number;
  reads: number;
  writes: number;
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
    
    // Calculate offset, index, tag
    // offset bits = log2(blockSize)
    const offsetBits = Math.log2(this.config.blockSize);
    // index bits = log2(numSets)
    const indexBits = Math.log2(numSets);

    // Extract index and tag
    const blockAddress = Math.floor(address / this.config.blockSize);
    const index = numSets > 1 ? blockAddress % numSets : 0;
    const tag = Math.floor(blockAddress / numSets);

    const set = this.sets[index];

    // Check for hit
    for (let i = 0; i < set.length; i++) {
      if (set[i].valid && set[i].tag === tag) {
        // Hit
        set[i].lru = this.lruCounter;
        if (isWrite) set[i].dirty = true;
        this.stats.hits++;
        return { hit: true, stallCycles: 0 }; // L1 hit is usually 1 cycle (no stall)
      }
    }

    // Miss
    this.stats.misses++;
    
    // Find victim (LRU)
    let victimIdx = 0;
    let minLru = Infinity;

    for (let i = 0; i < set.length; i++) {
      if (!set[i].valid) {
        victimIdx = i;
        break; // Empty slot found
      }
      if (set[i].lru < minLru) {
        minLru = set[i].lru;
        victimIdx = i;
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

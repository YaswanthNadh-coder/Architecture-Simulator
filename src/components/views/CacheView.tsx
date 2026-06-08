import { useSimulatorStore } from '../../store/simulatorStore';
import { Database, Zap, Clock, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const CacheView = () => {
  const { cacheConfig, getEngine } = useSimulatorStore();
  
  // Note: we fetch directly from the engine. In a real app we might want to subscribe to cycle changes, 
  // but the parent SimulatorPage rerenders on every cycle anyway because it subscribes to pipeline state.
  const engine = getEngine();
  const cache = engine.cache;

  if (!cacheConfig.enabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-base">
        <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center mb-4 border border-border-subtle shadow-xl">
          <Database size={24} className="text-text-muted" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">L1 Cache Disabled</h2>
        <p className="text-sm text-text-muted max-w-sm mb-6">
          The memory hierarchy simulator is currently disabled. Enable it in the CPU Architecture Settings to see cache hits, misses, and block replacements.
        </p>
      </div>
    );
  }

  const { accesses, hits, misses, reads, writes } = cache.stats;
  const hitRate = accesses > 0 ? ((hits / accesses) * 100).toFixed(1) : '0.0';
  const missRate = accesses > 0 ? ((misses / accesses) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-base p-6">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Database size={20} className="text-brand-400" />
        <h2 className="text-lg font-bold text-white">L1 Data Cache</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 shrink-0">
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity size={14} /> Hit Rate
          </span>
          <span className="text-3xl font-bold text-emerald-400">{hitRate}%</span>
          <div className="mt-2 text-xs text-text-muted">
            <span className="text-white">{hits}</span> hits / <span className="text-white">{accesses}</span> accesses
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Miss Rate
          </span>
          <span className="text-3xl font-bold text-hazard">{missRate}%</span>
          <div className="mt-2 text-xs text-text-muted">
            <span className="text-white">{misses}</span> misses
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap size={14} /> Operations
          </span>
          <div className="flex gap-4 mt-1">
            <div>
              <div className="text-xl font-bold text-cyan-400">{reads}</div>
              <div className="text-[10px] text-text-muted uppercase">Reads</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-400">{writes}</div>
              <div className="text-[10px] text-text-muted uppercase">Writes</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={14} /> Config
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs text-text-muted">
            <span>Size:</span><span className="text-white font-mono text-right">{cacheConfig.cacheSize}B</span>
            <span>Block:</span><span className="text-white font-mono text-right">{cacheConfig.blockSize}B</span>
            <span>Assoc:</span><span className="text-white font-mono text-right">{cacheConfig.associativity}-way</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
        <h3 className="text-sm font-bold text-white mb-4">Cache Contents</h3>
        
        <div className="space-y-4">
          {cache.sets.map((set, setIndex) => (
            <div key={setIndex} className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-bg-panel px-4 py-2 border-b border-border-subtle flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted">SET</span>
                <span className="text-sm font-bold text-white font-mono">{setIndex.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
              
              <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {set.map((line, wayIndex) => (
                    <motion.div 
                      key={wayIndex}
                      layout
                      className={`relative border rounded-lg p-3 ${
                        line.valid 
                          ? 'bg-bg-panel border-border-subtle' 
                          : 'bg-bg-base border-dashed border-border-subtle/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          Way {wayIndex}
                        </span>
                        {line.valid && (
                          <div className="flex gap-1.5">
                            {line.dirty && (
                              <span className="w-2 h-2 rounded-full bg-hazard" title="Dirty" />
                            )}
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Valid" />
                          </div>
                        )}
                      </div>
                      
                      {line.valid ? (
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] text-text-muted">Tag</span>
                            <span className="text-xs font-mono text-brand-400 font-bold">
                              0x{line.tag.toString(16).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] text-text-muted">LRU</span>
                            <span className="text-xs font-mono text-white">{line.lru}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-10 flex items-center justify-center">
                          <span className="text-xs text-text-muted italic">Empty</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

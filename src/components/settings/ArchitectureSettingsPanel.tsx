import { useState } from 'react';
import { Cpu, X, HelpCircle, Download, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { generateReport } from '../../lib/reportGenerator';
import { MIPSPipelineEngine } from '../../engine/pipelineEngine';

const calculateCPIForForwarding = (instructions: any[], forwarding: boolean, isa: 'mips' | 'riscv'): number => {
  if (!instructions || instructions.length === 0) return 0;
  const testEngine = new MIPSPipelineEngine();
  testEngine.forwardingEnabled = forwarding;
  testEngine.isa = isa;
  testEngine.loadProgram(instructions);
  
  let cycles = 0;
  let finalStats = null;
  while (!testEngine.isFinished() && cycles < 1000) {
    const snap = testEngine.step();
    finalStats = snap.stats;
    cycles++;
  }
  if (!finalStats) return 0;
  return finalStats.instructionsCompleted > 0 ? finalStats.totalCycles / finalStats.instructionsCompleted : 0;
};

const ForwardingImpactWidget = () => {
  const { instructions } = useSimulatorStore();
  
  if (!instructions || instructions.length === 0) {
    return (
      <div className="bg-bg-panel border border-border-subtle rounded-xl p-3 text-center">
        <p className="text-[10px] text-text-muted">Assemble a MIPS program to see live forwarding CPI impact comparison.</p>
      </div>
    );
  }

  // Calculate CPI with forwarding
  const cpiWith = calculateCPIForForwarding(instructions, true, useSimulatorStore.getState().isa);
  // Calculate CPI without forwarding
  const cpiWithout = calculateCPIForForwarding(instructions, false, useSimulatorStore.getState().isa);

  const diffPercent = cpiWithout > 0 ? ((cpiWithout - cpiWith) / cpiWithout) * 100 : 0;

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-xl p-3 space-y-3 mt-2">
      <div>
        <h4 className="text-[11px] font-bold text-white mb-0.5">Data Forwarding CPI Impact</h4>
        <p className="text-[9px] text-text-muted">
          Compares execution cycles per instruction (CPI) with and without forwarding.
        </p>
      </div>

      <div className="space-y-2">
        {/* With Forwarding */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-emerald-400">With Forwarding (Active)</span>
            <span className="font-mono text-white">{cpiWith.toFixed(2)} CPI</span>
          </div>
          <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (cpiWith / Math.max(cpiWith, cpiWithout, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Without Forwarding */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-amber-400">Without Forwarding</span>
            <span className="font-mono text-white">{cpiWithout.toFixed(2)} CPI</span>
          </div>
          <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (cpiWithout / Math.max(cpiWith, cpiWithout, 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {diffPercent > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
          <p className="text-[10px] text-emerald-400 font-medium">
            Forwarding paths reduce CPI by <span className="font-bold">{diffPercent.toFixed(1)}%</span>!
          </p>
        </div>
      )}
    </div>
  );
};

export const ArchitectureSettingsPanel = () => {
  const { 
    forwardingEnabled, toggleForwarding,
    branchPrediction, setBranchPrediction,
    memoryLatency, setMemoryLatency,
    cacheHierarchyConfig, setCacheHierarchyConfig,
    isa, setISA
  } = useSimulatorStore();
  
  const { canAccess } = useSubscriptionStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCacheLevel, setActiveCacheLevel] = useState<'L1' | 'L2' | 'L3'>('L1');

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 text-text-muted hover:text-white hover:bg-white/5 border border-transparent hover:border-border-subtle"
        title="Architecture Settings"
      >
        <Cpu size={14} className="text-brand-500" />
        Settings
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-[380px] bg-bg-surface border-l border-border-subtle z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu size={18} className="text-brand-500" />
                  <h2 className="text-sm font-bold text-white">CPU Architecture</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Settings Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Data Forwarding */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Data Forwarding</h3>
                      <p className="text-xs text-text-muted pr-4">
                        Bypass paths that forward data from EX/MEM and MEM/WB latches directly to the ALU, resolving raw data hazards.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={forwardingEnabled}
                        onChange={toggleForwarding}
                      />
                      <div className="w-9 h-5 bg-bg-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-border-subtle"></div>
                    </label>
                  </div>
                  
                  {/* Side-by-side Forwarding CPI widget */}
                  <ForwardingImpactWidget />
                </div>

                {/* Branch Prediction */}
                <div className="space-y-3 pt-6 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Branch Prediction</h3>
                    <div className="group relative">
                      <HelpCircle size={14} className="text-text-muted cursor-help" />
                      <div className="absolute right-0 w-48 p-2 mt-2 text-[10px] text-white bg-bg-panel border border-border-subtle rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                        Affects how the Fetch and Decode stages handle branch instructions speculatively.
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBranchPrediction('not-taken')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        branchPrediction === 'not-taken'
                          ? 'bg-brand-500/10 border-brand-500/50 text-brand-400'
                          : 'bg-bg-panel border-border-subtle text-text-muted hover:border-border-subtle/80 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold">Assume Not Taken</span>
                    </button>
                    <button
                      onClick={() => setBranchPrediction('always-taken')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        branchPrediction === 'always-taken'
                          ? 'bg-brand-500/10 border-brand-500/50 text-brand-400'
                          : 'bg-bg-panel border-border-subtle text-text-muted hover:border-border-subtle/80 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold">Always Taken</span>
                    </button>
                  </div>
                </div>

                {/* Memory Latency */}
                <div className="space-y-3 pt-6 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Memory Latency</h3>
                    <span className="text-xs font-mono bg-bg-panel px-2 py-0.5 rounded text-brand-400">
                      {memoryLatency} {memoryLatency === 1 ? 'cycle' : 'cycles'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-4">
                    Simulate slower memory architectures. Every load or store will stall the MEM stage for this many cycles.
                  </p>
                  
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={memoryLatency}
                    onChange={(e) => setMemoryLatency(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-bg-panel rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono mt-2">
                    <span>0 (Ideal)</span>
                    <span>10 (Slow)</span>
                  </div>
                </div>

                {/* Instruction Set Architecture */}
                <div className="space-y-3 pt-6 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white">Instruction Set Architecture</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setISA('mips')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                        isa === 'mips'
                          ? 'bg-brand-500/10 border-brand-500/50 text-brand-400 font-bold'
                          : 'bg-bg-panel border-border-subtle text-text-muted hover:border-border-subtle/80 hover:text-white'
                      }`}
                    >
                      <span className="text-xs">MIPS I</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (canAccess('riscvSupport')) {
                          setISA('riscv');
                        } else {
                          alert('RISC-V Support requires a Pro, Institution, or Enterprise plan. Please upgrade to access this feature.');
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                        isa === 'riscv'
                          ? 'bg-brand-500/10 border-brand-500/50 text-brand-400 font-bold'
                          : 'bg-bg-panel border-border-subtle text-text-muted hover:border-border-subtle/80 hover:text-white'
                      } ${!canAccess('riscvSupport') ? 'opacity-65' : ''}`}
                    >
                      <span className="text-xs flex items-center gap-1 justify-center">
                        {!canAccess('riscvSupport') && <Lock size={11} className="text-text-muted shrink-0" />}
                        RISC-V (RV32I)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Cache Hierarchy Configuration */}
                <div className="space-y-4 pt-6 border-t border-border-subtle">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Cache Hierarchy Simulator</h3>
                      <p className="text-xs text-text-muted pr-4">
                        Configurable multi-level cache hierarchy (L1, L2, and L3).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={cacheHierarchyConfig.l1.enabled}
                        onChange={(e) => setCacheHierarchyConfig({
                          ...cacheHierarchyConfig,
                          l1: { ...cacheHierarchyConfig.l1, enabled: e.target.checked }
                        })}
                      />
                      <div className="w-9 h-5 bg-bg-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-border-subtle"></div>
                    </label>
                  </div>

                  {cacheHierarchyConfig.l1.enabled && (
                    <div className="space-y-3 bg-bg-panel p-4 rounded-xl border border-border-subtle">
                      {/* Level selector tabs */}
                      <div className="flex items-center gap-1 bg-bg-base p-1 rounded-lg border border-border-subtle">
                        {(['L1', 'L2', 'L3'] as const).map((lvl) => {
                          const lvlConfig = lvl === 'L1' ? cacheHierarchyConfig.l1 : lvl === 'L2' ? cacheHierarchyConfig.l2 : cacheHierarchyConfig.l3;
                          return (
                            <button
                              key={lvl}
                              onClick={() => setActiveCacheLevel(lvl)}
                              className={`flex-1 py-1 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                activeCacheLevel === lvl
                                  ? 'bg-brand-500 text-white shadow-md'
                                  : 'text-text-muted hover:text-white'
                              }`}
                            >
                              <span>{lvl} Cache</span>
                              {lvl !== 'L1' && (
                                <span className={`w-1.5 h-1.5 rounded-full ${lvlConfig.enabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Enable toggle for L2 / L3 */}
                      {activeCacheLevel !== 'L1' && (
                        <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
                          <span className="text-xs font-bold text-white">Enable {activeCacheLevel} Cache</span>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={activeCacheLevel === 'L2' ? cacheHierarchyConfig.l2.enabled : cacheHierarchyConfig.l3.enabled}
                              onChange={(e) => {
                                const key = activeCacheLevel === 'L2' ? 'l2' : 'l3';
                                setCacheHierarchyConfig({
                                  ...cacheHierarchyConfig,
                                  [key]: { ...cacheHierarchyConfig[key], enabled: e.target.checked }
                                });
                              }}
                            />
                            <div className="w-8 h-4 bg-bg-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 border border-border-subtle"></div>
                          </label>
                        </div>
                      )}

                      {/* Config fields for active level */}
                      {(() => {
                        const lvlKey = activeCacheLevel === 'L1' ? 'l1' : activeCacheLevel === 'L2' ? 'l2' : 'l3';
                        const cfg = cacheHierarchyConfig[lvlKey];
                        const isLevelActive = lvlKey === 'l1' ? true : cfg.enabled;

                        if (!isLevelActive) {
                          return (
                            <div className="py-4 text-center text-xs text-text-muted italic">
                              {activeCacheLevel} Cache is disabled. Turn on the switch above to configure.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">Cache Size</span>
                              <select 
                                value={cfg.cacheSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setCacheHierarchyConfig({
                                    ...cacheHierarchyConfig,
                                    [lvlKey]: { ...cfg, cacheSize: val }
                                  });
                                }}
                                className="bg-bg-base border border-border-subtle text-white text-xs rounded-lg px-2 py-1 outline-none font-mono"
                              >
                                {lvlKey === 'l1' && (
                                  <>
                                    <option value="64">64 B</option>
                                    <option value="128">128 B</option>
                                    <option value="256">256 B</option>
                                    <option value="512">512 B</option>
                                  </>
                                )}
                                {lvlKey === 'l2' && (
                                  <>
                                    <option value="512">512 B</option>
                                    <option value="1024">1 KB</option>
                                    <option value="2048">2 KB</option>
                                    <option value="4096">4 KB</option>
                                    <option value="8192">8 KB</option>
                                  </>
                                )}
                                {lvlKey === 'l3' && (
                                  <>
                                    <option value="4096">4 KB</option>
                                    <option value="8192">8 KB</option>
                                    <option value="16384">16 KB</option>
                                    <option value="32768">32 KB</option>
                                    <option value="65536">64 KB</option>
                                  </>
                                )}
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">Block Size</span>
                              <select 
                                value={cfg.blockSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setCacheHierarchyConfig({
                                    ...cacheHierarchyConfig,
                                    [lvlKey]: { ...cfg, blockSize: val }
                                  });
                                }}
                                className="bg-bg-base border border-border-subtle text-white text-xs rounded-lg px-2 py-1 outline-none font-mono"
                              >
                                <option value="4">4 B (1 word)</option>
                                <option value="8">8 B (2 words)</option>
                                <option value="16">16 B (4 words)</option>
                                <option value="32">32 B (8 words)</option>
                                <option value="64">64 B (16 words)</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">Associativity</span>
                              <select 
                                value={cfg.associativity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setCacheHierarchyConfig({
                                    ...cacheHierarchyConfig,
                                    [lvlKey]: { ...cfg, associativity: val }
                                  });
                                }}
                                className="bg-bg-base border border-border-subtle text-white text-xs rounded-lg px-2 py-1 outline-none font-mono"
                              >
                                <option value="1">Direct Mapped</option>
                                <option value="2">2-Way Set Assoc.</option>
                                <option value="4">4-Way Set Assoc.</option>
                                <option value="8">8-Way Set Assoc.</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">Replacement Policy</span>
                              <select 
                                value={cfg.policy || 'lru'}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setCacheHierarchyConfig({
                                    ...cacheHierarchyConfig,
                                    [lvlKey]: { ...cfg, policy: val }
                                  });
                                }}
                                className="bg-bg-base border border-border-subtle text-white text-xs rounded-lg px-2 py-1 outline-none font-mono"
                              >
                                <option value="lru">LRU (Least Recently Used)</option>
                                <option value="fifo">FIFO (First In First Out)</option>
                                <option value="random">Random</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">
                                {lvlKey === 'l1' ? 'L1 Miss Penalty (Cycles)' : lvlKey === 'l2' ? 'L2 Miss Penalty (Cycles)' : 'L3 Miss Penalty (Cycles)'}
                              </span>
                              <input
                                type="number"
                                min="1"
                                max="200"
                                value={cfg.missPenalty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setCacheHierarchyConfig({
                                    ...cacheHierarchyConfig,
                                    [lvlKey]: { ...cfg, missPenalty: val }
                                  });
                                }}
                                className="w-16 bg-bg-base border border-border-subtle text-white text-xs rounded-lg px-2 py-1 outline-none text-right font-mono"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Report Generation */}
                <div className="pt-6 border-t border-border-subtle pb-6">
                  <button
                    onClick={() => {
                      try {
                        generateReport();
                      } catch {
                        alert('Failed to generate report. Make sure you run the simulator first.');
                      }
                    }}
                    className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    <Download size={18} />
                    Download PDF Report
                  </button>
                  <p className="text-center text-[10px] text-text-muted mt-3">
                    Exports cycle stats, cache metrics, final register state, and source code.
                  </p>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

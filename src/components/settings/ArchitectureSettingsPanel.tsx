import { useState } from 'react';
import { Settings, Cpu, X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';

export const ArchitectureSettingsPanel = () => {
  const { 
    forwardingEnabled, toggleForwarding,
    branchPrediction, setBranchPrediction,
    memoryLatency, setMemoryLatency
  } = useSimulatorStore();
  
  const [isOpen, setIsOpen] = useState(false);

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

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

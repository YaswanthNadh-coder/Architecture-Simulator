import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Database, Zap, Clock, Activity, AlertTriangle, ShieldCheck, Flame, Layers, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CacheLevel } from '../../engine/cacheSimulator';

export const CacheView = () => {
  const { cacheHierarchyConfig, getEngine } = useSimulatorStore();
  const [activeTab, setActiveTab] = useState<CacheLevel>('L1');
  
  const engine = getEngine();
  const hierarchy = engine.cacheHierarchy;

  if (!cacheHierarchyConfig.l1.enabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-base animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center mb-4 border border-border-subtle shadow-xl">
          <Database size={24} className="text-text-muted" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2 font-display">Cache Simulator Disabled</h2>
        <p className="text-sm text-text-muted max-w-sm mb-6">
          The memory hierarchy simulator is currently disabled. Enable it in CPU Architecture Settings to see multi-level L1, L2, and L3 cache hits, misses, AMAT, and block replacements.
        </p>
      </div>
    );
  }

  const amat = hierarchy.getAMAT();

  // Active level simulator instance
  const currentSim = activeTab === 'L1' ? hierarchy.l1 : activeTab === 'L2' ? hierarchy.l2 : hierarchy.l3;
  const currentConfig = activeTab === 'L1' ? cacheHierarchyConfig.l1 : activeTab === 'L2' ? cacheHierarchyConfig.l2 : cacheHierarchyConfig.l3;

  const { accesses, hits, misses, reads, writes } = currentSim.stats;
  const hitRate = accesses > 0 ? ((hits / accesses) * 100).toFixed(1) : '0.0';
  const missRate = accesses > 0 ? ((misses / accesses) * 100).toFixed(1) : '0.0';
  const policyName = (currentConfig.policy || 'lru').toUpperCase();

  // Helper to determine victim rank in a set
  const getReplacementRanks = (set: any[]) => {
    const validBlocks = set
      .map((block, idx) => ({ block, idx }))
      .filter(item => item.block.valid);
    
    if (validBlocks.length === 0) return {};
    
    validBlocks.sort((a, b) => a.block.lru - b.block.lru);
    
    const ranks: { [key: number]: { rank: number; isVictim: boolean; isMRU: boolean } } = {};
    validBlocks.forEach((item, index) => {
      ranks[item.idx] = {
        rank: index + 1,
        isVictim: index === 0,
        isMRU: index === validBlocks.length - 1 && validBlocks.length === set.length
      };
    });
    return ranks;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-base p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-brand-400" />
          <h2 className="text-lg font-bold text-white font-display">Multi-Level Cache Hierarchy</h2>
        </div>
        
        {/* AMAT badge */}
        <div className="flex items-center gap-2 bg-bg-surface border border-border-subtle px-3 py-1.5 rounded-xl shadow-md">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">AMAT:</span>
          <span className="text-sm font-bold font-mono text-emerald-400">{amat.toFixed(2)} cycles</span>
        </div>
      </div>

      {/* ── Hierarchy Cascade Diagram ── */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 mb-6 shrink-0 flex items-center justify-around shadow-md flex-wrap gap-3">
        {/* CPU */}
        <div className="flex flex-col items-center">
          <span className="px-3 py-1 bg-brand-500/20 border border-brand-500/40 text-brand-400 font-bold text-xs rounded-lg">
            CPU Core
          </span>
        </div>

        <ArrowRight size={16} className="text-text-muted" />

        {/* L1 Cache */}
        <div className="flex flex-col items-center">
          <div className="px-3 py-1.5 bg-bg-panel border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-lg flex flex-col items-center">
            <span>L1 Cache</span>
            <span className="text-[9px] font-mono text-text-muted font-normal">
              {hierarchy.l1.stats.accesses > 0
                ? `${((hierarchy.l1.stats.hits / hierarchy.l1.stats.accesses) * 100).toFixed(0)}% Hit`
                : 'Active'}
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="text-text-muted" />

        {/* L2 Cache */}
        <div className="flex flex-col items-center">
          <div className={`px-3 py-1.5 border font-bold text-xs rounded-lg flex flex-col items-center ${
            cacheHierarchyConfig.l2.enabled
              ? 'bg-bg-panel border-cyan-500/40 text-cyan-400'
              : 'bg-bg-base border-dashed border-border-subtle text-text-muted opacity-50'
          }`}>
            <span>L2 Cache</span>
            <span className="text-[9px] font-mono text-text-muted font-normal">
              {cacheHierarchyConfig.l2.enabled
                ? (hierarchy.l2.stats.accesses > 0
                    ? `${((hierarchy.l2.stats.hits / hierarchy.l2.stats.accesses) * 100).toFixed(0)}% Hit`
                    : 'Active')
                : 'Bypassed'}
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="text-text-muted" />

        {/* L3 Cache */}
        <div className="flex flex-col items-center">
          <div className={`px-3 py-1.5 border font-bold text-xs rounded-lg flex flex-col items-center ${
            cacheHierarchyConfig.l3.enabled
              ? 'bg-bg-panel border-purple-500/40 text-purple-400'
              : 'bg-bg-base border-dashed border-border-subtle text-text-muted opacity-50'
          }`}>
            <span>L3 Cache</span>
            <span className="text-[9px] font-mono text-text-muted font-normal">
              {cacheHierarchyConfig.l3.enabled
                ? (hierarchy.l3.stats.accesses > 0
                    ? `${((hierarchy.l3.stats.hits / hierarchy.l3.stats.accesses) * 100).toFixed(0)}% Hit`
                    : 'Active')
                : 'Bypassed'}
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="text-text-muted" />

        {/* Main Memory */}
        <div className="flex flex-col items-center">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-lg">
            Main Memory
          </span>
        </div>
      </div>

      {/* ── Level Selector Tabs ── */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        {(['L1', 'L2', 'L3'] as const).map((lvl) => {
          const enabled = lvl === 'L1' ? true : lvl === 'L2' ? cacheHierarchyConfig.l2.enabled : cacheHierarchyConfig.l3.enabled;
          return (
            <button
              key={lvl}
              disabled={!enabled}
              onClick={() => setActiveTab(lvl)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === lvl
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : enabled
                  ? 'bg-bg-surface text-text-muted hover:text-white hover:bg-white/5 border border-border-subtle'
                  : 'bg-bg-base text-text-muted/40 border border-border-subtle/30 cursor-not-allowed'
              }`}
            >
              <span>{lvl} Cache</span>
              {!enabled && <span className="text-[9px] text-text-muted font-normal">(Disabled)</span>}
            </button>
          );
        })}
      </div>

      {/* Cache metrics dashboard for selected level */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col shadow-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-400" /> {activeTab} Hit Rate
          </span>
          <span className="text-3xl font-bold text-emerald-400 font-display">{hitRate}%</span>
          <div className="mt-2 text-xs text-text-muted">
            <span className="text-white font-mono">{hits}</span> hits / <span className="text-white font-mono">{accesses}</span> total
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col shadow-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-hazard" /> {activeTab} Miss Rate
          </span>
          <span className="text-3xl font-bold text-hazard font-display">{missRate}%</span>
          <div className="mt-2 text-xs text-text-muted">
            <span className="text-white font-mono">{misses}</span> misses
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col shadow-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap size={14} className="text-cyan-400" /> Operations
          </span>
          <div className="flex gap-6 mt-1">
            <div>
              <div className="text-xl font-bold text-cyan-400 font-mono">{reads}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Reads</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-400 font-mono">{writes}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Writes</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col shadow-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={14} className="text-brand-400" /> Config & Policy
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs text-text-muted font-mono">
            <span>Size:</span><span className="text-white text-right">{currentConfig.cacheSize}B</span>
            <span>Block:</span><span className="text-white text-right">{currentConfig.blockSize}B</span>
            <span>Assoc:</span><span className="text-white text-right">{currentConfig.associativity}-way</span>
            <span>Policy:</span><span className="text-brand-400 text-right font-bold">{policyName}</span>
          </div>
        </div>
      </div>

      {/* Hit / Miss visual proportion bar */}
      {accesses > 0 && (
        <div className="mb-6 shrink-0 bg-bg-surface border border-border-subtle p-3 rounded-xl flex items-center gap-3">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider shrink-0">{activeTab} Ratio:</span>
          <div className="flex-1 h-3 bg-bg-panel rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${hitRate}%` }} 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              title={`Hits: ${hitRate}%`}
            />
            <div 
              style={{ width: `${missRate}%` }} 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              title={`Misses: ${missRate}%`}
            />
          </div>
        </div>
      )}

      {/* Sets and blocks Grid representation */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
        <h3 className="text-sm font-bold text-white mb-4 tracking-wider uppercase text-text-muted flex items-center gap-1.5">
          <Database size={14} /> {activeTab} Sets View
        </h3>
        
        <div className="space-y-4">
          {currentSim.sets.map((set, setIndex) => {
            const ranks = getReplacementRanks(set);
            return (
              <div key={setIndex} className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden hover:border-border-hover transition-colors shadow-md">
                <div className="bg-bg-panel px-4 py-2 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-widest">SET INDEX</span>
                    <span className="text-xs font-bold text-white font-mono bg-bg-base px-2 py-0.5 rounded border border-border-subtle">
                      0x{setIndex.toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono italic">
                    {set.length}-way associativity
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {set.map((line, wayIndex) => {
                      const blockRank = ranks[wayIndex];
                      return (
                        <motion.div 
                          key={wayIndex}
                          layout
                          className={`relative border rounded-xl p-3 flex flex-col justify-between transition-all duration-200 ${
                            line.valid 
                              ? 'bg-bg-panel border-border-subtle hover:bg-bg-panel/85' 
                              : 'bg-bg-base border-dashed border-border-subtle/50 opacity-40 hover:opacity-55'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono text-text-muted font-bold uppercase">
                              Way {wayIndex}
                            </span>
                            {line.valid ? (
                              <div className="flex gap-1.5">
                                {line.dirty && (
                                  <span className="px-1.5 py-0.5 text-[8px] bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded flex items-center gap-0.5">
                                    <Flame size={8} /> DIRTY
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded flex items-center gap-0.5">
                                  <ShieldCheck size={8} /> VALID
                                </span>
                              </div>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[8px] bg-bg-panel border border-border-subtle/40 text-text-muted rounded font-mono">
                                EMPTY
                              </span>
                            )}
                          </div>
                          
                          {line.valid ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                                <span className="text-[10px] text-text-muted font-medium">Tag</span>
                                <span className="text-xs font-mono text-brand-400 font-bold bg-bg-base px-1.5 py-0.5 rounded border border-border-subtle">
                                  0x{line.tag.toString(16).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-[10px] text-text-muted font-medium">Replacement</span>
                                {blockRank ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    blockRank.isVictim 
                                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                                      : blockRank.isMRU 
                                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                                      : 'bg-bg-base border border-border-subtle text-white'
                                  }`}>
                                    {blockRank.isVictim ? 'Victim' : `Rank ${blockRank.rank}`}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-white">{line.lru}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 flex items-center justify-center">
                              <span className="text-xs text-text-muted italic font-mono">Unallocated Block</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

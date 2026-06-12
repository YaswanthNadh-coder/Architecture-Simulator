import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { encodeInstruction } from '../../engine/encoder';
import { Binary, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstructionEncodingViewer = () => {
  const { pipeline } = useSimulatorStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // We'll show the encoding for the instruction currently in the ID stage (or IF if ID is bubble)
  const activeStage = pipeline.ID.instruction && pipeline.ID.status !== 'bubble' 
    ? pipeline.ID 
    : pipeline.IF;

  if (!activeStage.instruction) return null;

  // We need to parse the raw instruction string from pipeline state.
  // Wait, pipeline state only has `instruction: string | null`. 
  // We need the ParsedInstruction object!
  // I will get it from the store's instructions list based on the line number.
  const store = useSimulatorStore.getState();
  const parsedInst = store.instructions.find(i => i.line === activeStage.line);

  if (!parsedInst) return null;

  const encoded = encodeInstruction(parsedInst);

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-xl overflow-hidden mt-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Binary size={14} className="text-brand-400" />
          <span className="text-xs font-semibold text-white">Instruction Encoding</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-muted">{encoded.hex}</span>
          {isExpanded ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border-subtle"
          >
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Format:</span>
                <span className="font-semibold text-brand-400">{encoded.format}</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {encoded.fields.map((field, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted font-mono">{field.name} ({field.bits}b)</span>
                      <span className="text-white font-mono">{field.value}</span>
                    </div>
                    <div className="w-full h-4 rounded bg-bg-surface border border-border-subtle flex overflow-hidden">
                      <div className="w-full h-full bg-brand-500/20 text-brand-400 font-mono text-[10px] flex items-center justify-center tracking-[0.2em]">
                        {field.binary}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full 32-bit visualizer */}
              <div className="mt-2 pt-3 border-t border-border-subtle">
                <div className="flex items-center justify-between text-[10px] text-text-muted mb-1.5">
                  <span>31</span>
                  <span>0</span>
                </div>
                <div className="flex h-6 rounded-md overflow-hidden border border-border-subtle gap-px bg-bg-surface">
                  {encoded.fields.map((field, idx) => {
                    const colors = [
                      'bg-emerald-500/20 text-emerald-400',
                      'bg-blue-500/20 text-blue-400',
                      'bg-purple-500/20 text-purple-400',
                      'bg-orange-500/20 text-orange-400',
                      'bg-pink-500/20 text-pink-400',
                      'bg-yellow-500/20 text-yellow-400'
                    ];
                    return (
                      <div 
                        key={idx}
                        style={{ flexGrow: field.bits }}
                        className={`h-full ${colors[idx % colors.length]} flex items-center justify-center text-[8px] font-mono border-r border-bg-base last:border-0`}
                        title={`${field.name}: ${field.binary}`}
                      >
                        {field.bits >= 4 ? field.name : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

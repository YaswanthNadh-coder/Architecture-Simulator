import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { EXAMPLE_PROGRAMS, CATEGORIES, type ExampleProgram } from '../../engine/examplePrograms';
import { BookOpen, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ExamplesDrawer = () => {
  const { setCode } = useSimulatorStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basics');
  const [preview, setPreview] = useState<ExampleProgram | null>(null);

  const filteredPrograms = EXAMPLE_PROGRAMS.filter(p => p.category === selectedCategory);

  const handleLoad = (program: ExampleProgram) => {
    setCode(program.code);
    setIsOpen(false);
    setPreview(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-brand-400 bg-bg-surface hover:bg-brand-500/10 border border-border-subtle hover:border-brand-500/30 px-3 py-1.5 rounded-lg transition-all"
        title="Browse example programs"
      >
        <BookOpen size={13} />
        Examples
      </button>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => { setIsOpen(false); setPreview(null); }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-[480px] bg-bg-surface border-l border-border-subtle z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-brand-500" />
                  <h2 className="text-sm font-bold text-white">Example Programs</h2>
                </div>
                <button
                  onClick={() => { setIsOpen(false); setPreview(null); }}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Categories */}
              <div className="flex gap-1 px-6 py-3 border-b border-border-subtle overflow-x-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setPreview(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Program List or Preview */}
              <div className="flex-1 overflow-y-auto">
                {preview ? (
                  /* Code Preview */
                  <div className="p-6">
                    <button
                      onClick={() => setPreview(null)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-white mb-4 transition-colors"
                    >
                      ← Back to list
                    </button>
                    <h3 className="text-white font-bold mb-1">{preview.name}</h3>
                    <p className="text-text-muted text-xs mb-4">{preview.description}</p>
                    <pre className="bg-[#0b1121] rounded-lg p-4 text-[11px] text-text-main font-mono overflow-auto max-h-[400px] border border-border-subtle leading-relaxed">
                      {preview.code}
                    </pre>
                    <button
                      onClick={() => handleLoad(preview)}
                      className="mt-4 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20"
                    >
                      Load into Editor
                    </button>
                  </div>
                ) : (
                  /* Program Cards */
                  <div className="p-4 flex flex-col gap-2">
                    {filteredPrograms.map(program => (
                      <div
                        key={program.id}
                        className="group bg-bg-panel border border-border-subtle rounded-xl p-4 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all cursor-pointer"
                        onClick={() => setPreview(program)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm group-hover:text-brand-400 transition-colors">
                              {program.name}
                            </h4>
                            <p className="text-text-muted text-xs mt-1 leading-relaxed">
                              {program.description}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-text-muted group-hover:text-brand-400 shrink-0 mt-0.5 transition-colors" />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLoad(program); }}
                            className="text-[10px] px-2.5 py-1 bg-brand-500/15 text-brand-400 rounded-md hover:bg-brand-500/25 transition-colors font-medium"
                          >
                            Load
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreview(program); }}
                            className="text-[10px] px-2.5 py-1 bg-white/5 text-text-muted rounded-md hover:bg-white/10 transition-colors font-medium"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

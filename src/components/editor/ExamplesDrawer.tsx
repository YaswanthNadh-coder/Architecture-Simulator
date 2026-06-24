import { useState, useMemo } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { EXAMPLE_PROGRAMS, CATEGORIES, type ExampleProgram } from '../../engine/examplePrograms';
import { RISCV_EXAMPLE_PROGRAMS, RISCV_CATEGORIES } from '../../engine/riscvExamplePrograms';
import { BookOpen, X, Search, Tag, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ExamplesDrawer = () => {
  const { setCode, isa } = useSimulatorStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basics');
  const [searchQuery, setSearchQuery] = useState('');
  const [preview, setPreview] = useState<ExampleProgram | null>(null);

  const programsList = isa === 'riscv' ? RISCV_EXAMPLE_PROGRAMS : EXAMPLE_PROGRAMS;
  const categoriesList = isa === 'riscv' ? RISCV_CATEGORIES : CATEGORIES;

  const filteredPrograms = useMemo(() => {
    return programsList.filter(p => {
      const matchesCategory = p.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleLoad = (program: ExampleProgram) => {
    setCode(program.code);
    setIsOpen(false);
    setPreview(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'Advanced': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-text-muted bg-white/5 border-border-subtle';
    }
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
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

              {/* Search Bar */}
              {!preview && (
                <div className="px-6 py-3 border-b border-border-subtle shrink-0 bg-bg-base">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search by name, description, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-surface border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-500/50 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Categories */}
              {!preview && (
                <div className="flex gap-1 px-6 py-3 border-b border-border-subtle overflow-x-auto shrink-0">
                  {categoriesList.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
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
              )}

              {/* Program List or Preview */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {preview ? (
                  /* Code Preview */
                  <div className="p-6">
                    <button
                      onClick={() => setPreview(null)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-white mb-4 transition-colors"
                    >
                      ← Back to list
                    </button>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold">{preview.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${getDifficultyColor(preview.difficulty)} font-semibold flex items-center gap-1`}>
                        <BarChart size={10} />
                        {preview.difficulty}
                      </span>
                    </div>
                    <p className="text-text-muted text-xs mb-4">{preview.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {preview.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-bg-base border border-border-subtle rounded text-text-muted">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <pre className="bg-[#0b1121] rounded-lg p-4 text-[11px] text-text-main font-mono overflow-auto max-h-[400px] border border-border-subtle leading-relaxed custom-scrollbar">
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
                  <div className="p-4 flex flex-col gap-3">
                    {filteredPrograms.length === 0 ? (
                      <div className="text-center py-8 text-text-muted text-xs">
                        No programs found matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredPrograms.map(program => (
                        <div
                          key={program.id}
                          className="group bg-bg-panel border border-border-subtle rounded-xl p-4 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all cursor-pointer flex flex-col h-full"
                          onClick={() => setPreview(program)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white font-semibold text-sm group-hover:text-brand-400 transition-colors">
                              {program.name}
                            </h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getDifficultyColor(program.difficulty)}`}>
                              {program.difficulty}
                            </span>
                          </div>
                          
                          <p className="text-text-muted text-xs leading-relaxed mb-3 flex-1">
                            {program.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {program.tags.map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-bg-base rounded text-text-muted whitespace-nowrap">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2 mt-auto pt-3 border-t border-border-subtle/50">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLoad(program); }}
                              className="flex-1 text-[10px] px-2.5 py-1.5 bg-brand-500/15 text-brand-400 rounded-md hover:bg-brand-500/25 transition-colors font-medium"
                            >
                              Load
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreview(program); }}
                              className="flex-1 text-[10px] px-2.5 py-1.5 bg-white/5 text-text-muted rounded-md hover:bg-white/10 transition-colors font-medium"
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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

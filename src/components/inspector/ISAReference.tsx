import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { ISA_DATA, type InstructionDef } from '../../engine/isaData';

export const ISAReference = () => {
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    Arithmetic: true,
    Logical: true,
    Memory: false,
    'Branch/Jump': false,
    System: false,
  });

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = ['Arithmetic', 'Logical', 'Memory', 'Branch/Jump', 'System'];

  const filteredData = ISA_DATA.filter(inst => 
    inst.name.toLowerCase().includes(search.toLowerCase()) || 
    inst.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg-surface border-border-subtle border-t">
      {/* Search Header */}
      <div className="p-3 border-b border-border-subtle shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search instructions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-panel border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-muted/50 outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Instruction List */}
      <div className="flex-1 overflow-y-auto p-2">
        {categories.map(cat => {
          const insts = filteredData.filter(i => i.category === cat);
          if (insts.length === 0) return null;

          const isExpanded = expandedCats[cat] || search !== '';

          return (
            <div key={cat} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-text-muted uppercase tracking-wider hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {cat}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="flex flex-col gap-1 mt-1 pl-2">
                  {insts.map(inst => (
                    <InstructionCard key={inst.name} inst={inst} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="text-center text-text-muted text-xs p-4 italic">
            No instructions found.
          </div>
        )}
      </div>
    </div>
  );
};

const InstructionCard = ({ inst }: { inst: InstructionDef }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-lg overflow-hidden group">
      {/* Header - Click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-brand-400 font-bold text-xs font-mono">{inst.name}</span>
          <span className="text-text-muted text-[10px] hidden sm:inline">{inst.format}</span>
        </div>
        <span className="text-text-muted/50 text-xs font-mono truncate max-w-[120px] xl:max-w-[140px] opacity-0 group-hover:opacity-100 transition-opacity">
          {inst.syntax}
        </span>
      </button>

      {/* Details (Expanded) */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border-subtle/50 bg-bg-surface/30">
          <div className="mb-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5">Syntax</span>
            <code className="text-xs text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">
              {inst.syntax}
            </code>
          </div>
          
          <div className="mb-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5">Description</span>
            <p className="text-[11px] text-text-main leading-relaxed">
              {inst.description}
            </p>
          </div>

          <div className="mb-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5">Example</span>
            <code className="text-[11px] text-text-muted font-mono block bg-black/20 p-1.5 rounded border border-border-subtle">
              {inst.example}
            </code>
          </div>

          {inst.encoding && (
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <Hash size={10} /> Encoding
              </span>
              <div className="flex gap-1 flex-wrap">
                {inst.encoding.split(' ').map((part, i) => (
                  <span key={i} className="text-[9px] font-mono px-1 py-0.5 bg-brand-500/10 text-brand-400 rounded">
                    {part}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

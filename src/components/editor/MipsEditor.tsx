import Editor, { type OnMount } from '@monaco-editor/react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';

const MIPS_KEYWORDS = [
  'add','addi','addiu','addu','sub','subu','mult','multu','div','divu',
  'and','andi','or','ori','nor','xor','xori','slt','slti','sltiu','sltu',
  'sll','srl','sra','sllv','srlv','srav',
  'lw','lh','lb','lhu','lbu','sw','sh','sb',
  'beq','bne','blez','bgtz','bltz','bgez','j','jal','jr','jalr',
  'mfhi','mflo','mthi','mtlo','lui','la','li','move','nop',
  'syscall','break','.data','.text','.word','.byte','.asciiz','.space','.globl',
];

const handleEditorMount: OnMount = (_editor, monaco) => {
  monaco.languages.register({ id: 'mips' });
  monaco.languages.setMonarchTokensProvider('mips', {
    keywords: MIPS_KEYWORDS,
    tokenizer: {
      root: [
        [/[a-zA-Z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          }
        }],
        [/#.*$/, 'comment'],
        [/\$[\w]+/, 'variable'],
        [/\b\d+\b/, 'number'],
        [/0x[0-9a-fA-F]+/, 'number.hex'],
        [/[:\.,\(\)]/, 'punctuation'],
      ]
    }
  });

  monaco.editor.defineTheme('mips-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',    foreground: '60a5fa', fontStyle: 'bold' },
      { token: 'variable',   foreground: 'a78bfa' },
      { token: 'number',     foreground: 'fbbf24' },
      { token: 'number.hex', foreground: 'fbbf24' },
      { token: 'comment',    foreground: '475569', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'f8fafc' },
      { token: 'punctuation',foreground: '64748b' },
      { token: 'string',     foreground: '34d399' },
    ],
    colors: {
      'editor.background':          '#0b1121',
      'editor.foreground':          '#f8fafc',
      'editorLineNumber.foreground':'#334155',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editor.lineHighlightBackground':   '#1e293b',
      'editorCursor.foreground':    '#60a5fa',
      'editor.selectionBackground': '#3b82f640',
    }
  });
  monaco.editor.setTheme('mips-dark');
};

export const MipsEditor = () => {
  const { code, setCode, cycle, nextCycle, prevCycle, isPlaying, togglePlay, reset, assemble, parseErrors } = useSimulatorStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance cycles when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        nextCycle();
      }, 800);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, nextCycle]);

  return (
    <div className="flex flex-col h-full bg-bg-surface border-r border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface shrink-0">
        <h2 className="text-xs font-bold tracking-[0.15em] text-text-muted uppercase">Editor</h2>
        <button className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 px-2 py-1 rounded transition-colors">
          <Plus size={13} /> New
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="mips"
          theme="mips-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorMount}
          options={{
            readOnly: isPlaying,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'phase',
            bracketPairColorization: { enabled: true },
            guides: { indentation: false },
            overviewRulerLanes: 0,
            scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
          }}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center justify-between">
          {/* Playback controls */}
          <div className="flex items-center bg-bg-base rounded-xl border border-border-subtle p-1 gap-0.5">
            <ControlBtn onClick={assemble} title="Assemble (Run)">
              <Play size={16} className="text-emerald-500" />
            </ControlBtn>
            <ControlBtn onClick={reset} title="Reset">
              <RotateCcw size={16} />
            </ControlBtn>
            <ControlBtn onClick={prevCycle} title="Previous cycle">
              <SkipBack size={16} />
            </ControlBtn>
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              className={`p-2 rounded-lg transition-all duration-150 mx-0.5
                ${isPlaying
                  ? 'bg-brand-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-brand-500 hover:bg-brand-500/10'}
              `}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <ControlBtn onClick={nextCycle} title="Next cycle">
              <SkipForward size={16} />
            </ControlBtn>
          </div>

          {/* Cycle counter */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted tracking-wider uppercase">Cycle</span>
            <span className="text-xl font-mono font-bold text-brand-500 leading-none"
              style={{ textShadow: '0 0 12px rgba(59,130,246,0.6)' }}>
              {String(cycle).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full h-1 bg-bg-panel rounded-full overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((cycle / 20) * 100, 100)}%`, // Approximate progress since we don't know total cycles perfectly
              boxShadow: '0 0 8px rgba(59,130,246,0.6)',
            }}
          />
        </div>
        {parseErrors.length > 0 && (
          <div className="mt-2 text-xs text-red-500">
            {parseErrors[0].message} at line {parseErrors[0].line}
          </div>
        )}
        <div className="flex justify-between mt-1">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={`text-[9px] font-mono ${cycle > 0 && (cycle % 7 === i) ? 'text-brand-500' : 'text-text-muted/40'}`}>{cycle > 0 ? cycle - (cycle % 7) + i : i}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const ControlBtn = ({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) => (
  <button
    onClick={onClick}
    title={title}
    className="p-2 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all duration-150"
  >
    {children}
  </button>
);

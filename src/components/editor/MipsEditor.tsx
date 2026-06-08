import Editor, { type OnMount } from '@monaco-editor/react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { assemble } from '../../engine/mipsParser';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import { ExamplesDrawer } from './ExamplesDrawer';

// ── MIPS Language Data ───────────────────────────────────────────────────

const MIPS_KEYWORDS = [
  'add','addi','addiu','addu','sub','subu','mult','multu','div','divu',
  'and','andi','or','ori','nor','xor','xori','slt','slti','sltiu','sltu',
  'sll','srl','sra','sllv','srlv','srav',
  'lw','lh','lb','lhu','lbu','sw','sh','sb',
  'beq','bne','blez','bgtz','bltz','bgez','j','jal','jr','jalr',
  'mfhi','mflo','lui','la','li','move','nop',
  'syscall','break',
  'blt','bge','bgt','ble',
];

const DIRECTIVES = ['.data','.text','.word','.byte','.half','.asciiz','.ascii','.space','.globl','.align'];

const REGISTERS = [
  '$zero','$at','$v0','$v1','$a0','$a1','$a2','$a3',
  '$t0','$t1','$t2','$t3','$t4','$t5','$t6','$t7',
  '$s0','$s1','$s2','$s3','$s4','$s5','$s6','$s7',
  '$t8','$t9','$k0','$k1','$gp','$sp','$fp','$ra',
];

const INSTRUCTION_DOCS: Record<string, { syntax: string; desc: string; format: string }> = {
  'add':    { syntax: 'add $rd, $rs, $rt',  desc: 'Add: $rd = $rs + $rt (signed, overflow trap)', format: 'R-type' },
  'addi':   { syntax: 'addi $rt, $rs, imm', desc: 'Add Immediate: $rt = $rs + imm (signed)', format: 'I-type' },
  'addiu':  { syntax: 'addiu $rt, $rs, imm',desc: 'Add Immediate Unsigned: $rt = $rs + imm (no overflow)', format: 'I-type' },
  'addu':   { syntax: 'addu $rd, $rs, $rt', desc: 'Add Unsigned: $rd = $rs + $rt (no overflow)', format: 'R-type' },
  'sub':    { syntax: 'sub $rd, $rs, $rt',  desc: 'Subtract: $rd = $rs - $rt (signed)', format: 'R-type' },
  'subu':   { syntax: 'subu $rd, $rs, $rt', desc: 'Subtract Unsigned: $rd = $rs - $rt', format: 'R-type' },
  'mult':   { syntax: 'mult $rs, $rt',      desc: 'Multiply: HI:LO = $rs × $rt (signed)', format: 'R-type' },
  'multu':  { syntax: 'multu $rs, $rt',     desc: 'Multiply Unsigned: HI:LO = $rs × $rt', format: 'R-type' },
  'div':    { syntax: 'div $rs, $rt',       desc: 'Divide: LO = $rs / $rt, HI = $rs % $rt', format: 'R-type' },
  'divu':   { syntax: 'divu $rs, $rt',      desc: 'Divide Unsigned: LO = $rs / $rt, HI = $rs % $rt', format: 'R-type' },
  'and':    { syntax: 'and $rd, $rs, $rt',  desc: 'Bitwise AND: $rd = $rs & $rt', format: 'R-type' },
  'andi':   { syntax: 'andi $rt, $rs, imm', desc: 'AND Immediate: $rt = $rs & imm', format: 'I-type' },
  'or':     { syntax: 'or $rd, $rs, $rt',   desc: 'Bitwise OR: $rd = $rs | $rt', format: 'R-type' },
  'ori':    { syntax: 'ori $rt, $rs, imm',  desc: 'OR Immediate: $rt = $rs | imm', format: 'I-type' },
  'xor':    { syntax: 'xor $rd, $rs, $rt',  desc: 'Bitwise XOR: $rd = $rs ^ $rt', format: 'R-type' },
  'xori':   { syntax: 'xori $rt, $rs, imm', desc: 'XOR Immediate: $rt = $rs ^ imm', format: 'I-type' },
  'nor':    { syntax: 'nor $rd, $rs, $rt',  desc: 'Bitwise NOR: $rd = ~($rs | $rt)', format: 'R-type' },
  'slt':    { syntax: 'slt $rd, $rs, $rt',  desc: 'Set Less Than: $rd = ($rs < $rt) ? 1 : 0', format: 'R-type' },
  'slti':   { syntax: 'slti $rt, $rs, imm', desc: 'Set Less Than Immediate: $rt = ($rs < imm) ? 1 : 0', format: 'I-type' },
  'sltiu':  { syntax: 'sltiu $rt, $rs, imm',desc: 'Set Less Than Immediate Unsigned', format: 'I-type' },
  'sltu':   { syntax: 'sltu $rd, $rs, $rt', desc: 'Set Less Than Unsigned', format: 'R-type' },
  'sll':    { syntax: 'sll $rd, $rt, shamt',desc: 'Shift Left Logical: $rd = $rt << shamt', format: 'R-type' },
  'srl':    { syntax: 'srl $rd, $rt, shamt',desc: 'Shift Right Logical: $rd = $rt >>> shamt', format: 'R-type' },
  'sra':    { syntax: 'sra $rd, $rt, shamt',desc: 'Shift Right Arithmetic: $rd = $rt >> shamt', format: 'R-type' },
  'sllv':   { syntax: 'sllv $rd, $rt, $rs', desc: 'Shift Left Logical Variable: $rd = $rt << $rs', format: 'R-type' },
  'srlv':   { syntax: 'srlv $rd, $rt, $rs', desc: 'Shift Right Logical Variable', format: 'R-type' },
  'srav':   { syntax: 'srav $rd, $rt, $rs', desc: 'Shift Right Arithmetic Variable', format: 'R-type' },
  'lw':     { syntax: 'lw $rt, offset($rs)',desc: 'Load Word: $rt = Memory[$rs + offset]', format: 'I-type' },
  'sw':     { syntax: 'sw $rt, offset($rs)',desc: 'Store Word: Memory[$rs + offset] = $rt', format: 'I-type' },
  'lb':     { syntax: 'lb $rt, offset($rs)',desc: 'Load Byte (sign-extended)', format: 'I-type' },
  'lbu':    { syntax: 'lbu $rt, offset($rs)',desc: 'Load Byte Unsigned', format: 'I-type' },
  'lh':     { syntax: 'lh $rt, offset($rs)',desc: 'Load Halfword (sign-extended)', format: 'I-type' },
  'lhu':    { syntax: 'lhu $rt, offset($rs)',desc: 'Load Halfword Unsigned', format: 'I-type' },
  'sb':     { syntax: 'sb $rt, offset($rs)',desc: 'Store Byte', format: 'I-type' },
  'sh':     { syntax: 'sh $rt, offset($rs)',desc: 'Store Halfword', format: 'I-type' },
  'lui':    { syntax: 'lui $rt, imm',       desc: 'Load Upper Immediate: $rt = imm << 16', format: 'I-type' },
  'beq':    { syntax: 'beq $rs, $rt, label',desc: 'Branch if Equal: if ($rs == $rt) goto label', format: 'I-type' },
  'bne':    { syntax: 'bne $rs, $rt, label',desc: 'Branch if Not Equal: if ($rs != $rt) goto label', format: 'I-type' },
  'bgtz':   { syntax: 'bgtz $rs, label',    desc: 'Branch if Greater Than Zero', format: 'I-type' },
  'blez':   { syntax: 'blez $rs, label',    desc: 'Branch if Less/Equal to Zero', format: 'I-type' },
  'bltz':   { syntax: 'bltz $rs, label',    desc: 'Branch if Less Than Zero', format: 'I-type' },
  'bgez':   { syntax: 'bgez $rs, label',    desc: 'Branch if Greater/Equal to Zero', format: 'I-type' },
  'j':      { syntax: 'j label',            desc: 'Jump: PC = label', format: 'J-type' },
  'jal':    { syntax: 'jal label',          desc: 'Jump and Link: $ra = PC+4, PC = label', format: 'J-type' },
  'jr':     { syntax: 'jr $rs',             desc: 'Jump Register: PC = $rs', format: 'R-type' },
  'jalr':   { syntax: 'jalr $rd, $rs',      desc: 'Jump and Link Register: $rd = PC+4, PC = $rs', format: 'R-type' },
  'mfhi':   { syntax: 'mfhi $rd',           desc: 'Move From HI: $rd = HI', format: 'R-type' },
  'mflo':   { syntax: 'mflo $rd',           desc: 'Move From LO: $rd = LO', format: 'R-type' },
  'la':     { syntax: 'la $rd, label',      desc: 'Load Address (pseudo): $rd = address of label', format: 'Pseudo' },
  'li':     { syntax: 'li $rd, imm',        desc: 'Load Immediate (pseudo): $rd = imm', format: 'Pseudo' },
  'move':   { syntax: 'move $rd, $rs',      desc: 'Move (pseudo): $rd = $rs', format: 'Pseudo' },
  'nop':    { syntax: 'nop',                desc: 'No Operation (pseudo): sll $zero, $zero, 0', format: 'Pseudo' },
  'syscall':{ syntax: 'syscall',            desc: 'System Call: execute service in $v0', format: 'R-type' },
  'blt':    { syntax: 'blt $rs, $rt, label',desc: 'Branch if Less Than (pseudo)', format: 'Pseudo' },
  'bge':    { syntax: 'bge $rs, $rt, label',desc: 'Branch if Greater/Equal (pseudo)', format: 'Pseudo' },
  'bgt':    { syntax: 'bgt $rs, $rt, label',desc: 'Branch if Greater Than (pseudo)', format: 'Pseudo' },
  'ble':    { syntax: 'ble $rs, $rt, label',desc: 'Branch if Less/Equal (pseudo)', format: 'Pseudo' },
};

// ── Monaco Setup ─────────────────────────────────────────────────────────

let monacoInstance: typeof Monaco | null = null;
let editorInstance: Monaco.editor.IStandaloneCodeEditor | null = null;

const handleEditorMount: OnMount = (_editor, monaco) => {
  monacoInstance = monaco;
  editorInstance = _editor;

  monaco.languages.register({ id: 'mips' });
  monaco.languages.setMonarchTokensProvider('mips', {
    keywords: MIPS_KEYWORDS,
    directives: DIRECTIVES,
    tokenizer: {
      root: [
        [/"(?:[^"\\]|\\.)*"/, 'string'],
        [/#.*$/, 'comment'],
        [/\$[\w]+/, 'variable'],
        [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
        [/\b0b[01]+\b/, 'number.binary'],
        [/\b\d+\b/, 'number'],
        [/\.[a-zA-Z]+/, {
          cases: {
            '@directives': 'keyword.directive',
            '@default': 'identifier',
          }
        }],
        [/[a-zA-Z_]\w*:/, 'type.identifier'], // labels
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          }
        }],
        [/[:\.,\(\)]/, 'punctuation'],
      ]
    }
  });

  monaco.editor.defineTheme('mips-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',           foreground: '60a5fa', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'c084fc', fontStyle: 'bold' },
      { token: 'variable',          foreground: 'a78bfa' },
      { token: 'number',            foreground: 'fbbf24' },
      { token: 'number.hex',        foreground: 'fbbf24' },
      { token: 'number.binary',     foreground: 'fbbf24' },
      { token: 'comment',           foreground: '475569', fontStyle: 'italic' },
      { token: 'identifier',        foreground: 'f8fafc' },
      { token: 'type.identifier',   foreground: '34d399', fontStyle: 'bold' }, // labels
      { token: 'punctuation',       foreground: '64748b' },
      { token: 'string',            foreground: '34d399' },
    ],
    colors: {
      'editor.background':                '#0b1121',
      'editor.foreground':                '#f8fafc',
      'editorLineNumber.foreground':      '#334155',
      'editorLineNumber.activeForeground':'#94a3b8',
      'editor.lineHighlightBackground':   '#1e293b',
      'editorCursor.foreground':          '#60a5fa',
      'editor.selectionBackground':       '#3b82f640',
    }
  });
  monaco.editor.setTheme('mips-dark');

  // ── Autocompletion ──────────────────────────────────────────────
  monaco.languages.registerCompletionItemProvider('mips', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [];

      // Instruction completions
      for (const kw of MIPS_KEYWORDS) {
        const doc = INSTRUCTION_DOCS[kw];
        suggestions.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: doc ? doc.syntax.replace(kw + ' ', kw + '  ').replace(/\$/g, '\\$') : kw,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: doc ? `${doc.format} — ${doc.desc}` : undefined,
          range,
        });
      }

      // Register completions
      for (const reg of REGISTERS) {
        suggestions.push({
          label: reg,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: reg,
          detail: `Register ${reg}`,
          range,
        });
      }

      // Directive completions
      for (const dir of DIRECTIVES) {
        suggestions.push({
          label: dir,
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: dir + ' ',
          detail: 'Assembler directive',
          range,
        });
      }

      return { suggestions };
    },
    triggerCharacters: ['.', '$'],
  });

  // ── Hover Documentation ─────────────────────────────────────────
  monaco.languages.registerHoverProvider('mips', {
    provideHover: (model: any, position: any) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const text = word.word.toLowerCase();
      const doc = INSTRUCTION_DOCS[text];
      if (doc) {
        return {
          range: new monaco.Range(
            position.lineNumber, word.startColumn,
            position.lineNumber, word.endColumn,
          ),
          contents: [
            { value: `**${text}** — ${doc.format}` },
            { value: `\`${doc.syntax}\`` },
            { value: doc.desc },
          ],
        };
      }

      // Register hover
      if (text.startsWith('$') || REGISTERS.includes('$' + text)) {
        const regName = text.startsWith('$') ? text : '$' + text;
        const regIdx = REGISTERS.indexOf(regName);
        if (regIdx >= 0) {
          const descriptions: Record<string, string> = {
            '$zero': 'Constant 0 — always reads as 0',
            '$at': 'Assembler temporary — reserved',
            '$v0': 'Return value / syscall number',
            '$v1': 'Return value 2',
            '$a0': 'Argument 0 / syscall argument',
            '$a1': 'Argument 1',
            '$a2': 'Argument 2',
            '$a3': 'Argument 3',
            '$sp': 'Stack pointer',
            '$fp': 'Frame pointer',
            '$ra': 'Return address',
            '$gp': 'Global pointer',
          };
          return {
            range: new monaco.Range(
              position.lineNumber, word.startColumn,
              position.lineNumber, word.endColumn,
            ),
            contents: [
              { value: `**${regName}** — Register ${regIdx}` },
              { value: descriptions[regName] || `General purpose register` },
            ],
          };
        }
      }

      return null;
    },
  });
};

// ── Real-time Linting ────────────────────────────────────────────────────

function runLinting(code: string) {
  if (!monacoInstance || !editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;

  const result = assemble(code);
  const markers: Monaco.editor.IMarkerData[] = result.errors.map(err => ({
    severity: err.severity === 'error'
      ? monacoInstance!.MarkerSeverity.Error
      : err.severity === 'warning'
      ? monacoInstance!.MarkerSeverity.Warning
      : monacoInstance!.MarkerSeverity.Info,
    startLineNumber: err.line,
    startColumn: 1,
    endLineNumber: err.line,
    endColumn: model.getLineMaxColumn(err.line),
    message: err.message,
    source: 'MIPS Assembler',
  }));

  monacoInstance.editor.setModelMarkers(model, 'mips-linter', markers);
}

// ── Component ────────────────────────────────────────────────────────────

export const MipsEditor = () => {
  const {
    code, setCode, cycle, nextCycle, prevCycle, isPlaying, togglePlay,
    reset, assemble: doAssemble, parseErrors, isAssembled, isFinished, speed, setSpeed
  } = useSimulatorStore();

  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced linting
  const handleCodeChange = useCallback((val: string | undefined) => {
    const newCode = val || '';
    setCode(newCode);

    if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    lintTimerRef.current = setTimeout(() => {
      runLinting(newCode);
    }, 400);
  }, [setCode]);

  // Clean up lint timer
  useEffect(() => {
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    };
  }, []);

  // Initial lint on mount
  useEffect(() => {
    const timer = setTimeout(() => runLinting(code), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg-surface border-r border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface shrink-0">
        <h2 className="text-xs font-bold tracking-[0.15em] text-text-muted uppercase">Editor</h2>
        <div className="flex items-center gap-2">
          <ExamplesDrawer />
          <button
            onClick={doAssemble}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              isAssembled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 border border-brand-500/30'
            }`}
          >
            <Zap size={12} />
            {isAssembled ? 'Assembled ✓' : 'Assemble'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="mips"
          theme="mips-dark"
          value={code}
          onChange={handleCodeChange}
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
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center justify-between">
          {/* Playback controls */}
          <div className="flex items-center bg-bg-base rounded-xl border border-border-subtle p-1 gap-0.5">
            <ControlBtn onClick={reset} title="Reset">
              <RotateCcw size={15} />
            </ControlBtn>
            <ControlBtn onClick={prevCycle} title="Previous cycle">
              <SkipBack size={15} />
            </ControlBtn>
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Auto-play'}
              disabled={isFinished}
              className={`p-2 rounded-lg transition-all duration-150 mx-0.5 ${
                isFinished
                  ? 'text-text-muted/30 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-brand-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-brand-500 hover:bg-brand-500/10'
              }`}
            >
              {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
            <ControlBtn onClick={nextCycle} title="Next cycle">
              <SkipForward size={15} />
            </ControlBtn>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Speed</span>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={2100 - speed}
              onChange={(e) => setSpeed(2100 - parseInt(e.target.value))}
              className="w-16 h-1 accent-brand-500 cursor-pointer"
              title={`${speed}ms per cycle`}
            />
          </div>

          {/* Cycle counter */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-text-muted tracking-wider uppercase">Cycle</span>
            <span className="text-xl font-mono font-bold text-brand-500 leading-none"
              style={{ textShadow: '0 0 12px rgba(59,130,246,0.6)' }}>
              {String(cycle).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Error display */}
        {parseErrors.filter(e => e.severity === 'error').length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-xs text-red-400 font-medium mb-1">Assembly Errors</div>
            {parseErrors.filter(e => e.severity === 'error').slice(0, 3).map((err, i) => (
              <div key={i} className="text-[11px] text-red-300/80 font-mono">
                Line {err.line}: {err.message}
              </div>
            ))}
            {parseErrors.filter(e => e.severity === 'error').length > 3 && (
              <div className="text-[10px] text-red-400/60 mt-1">
                +{parseErrors.filter(e => e.severity === 'error').length - 3} more errors
              </div>
            )}
          </div>
        )}

        {/* Finished indicator */}
        {isFinished && (
          <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 text-center font-medium">
            ✓ Program execution complete — {cycle} cycles
          </div>
        )}
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

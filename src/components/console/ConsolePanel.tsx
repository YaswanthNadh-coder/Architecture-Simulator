import { useState, useRef, useEffect } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Terminal, Trash2, ArrowRight } from 'lucide-react';

export const ConsolePanel = () => {
  const { consoleOutput, waitingForInput, submitConsoleInput, clearConsole, isAssembled } = useSimulatorStore();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleOutput, waitingForInput]);

  // Auto-focus input when waiting
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingForInput) return;
    submitConsoleInput(inputValue);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e18] border-t border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-emerald-500" />
          <h2 className="text-xs font-bold tracking-[0.15em] text-text-muted uppercase">Console</h2>
          {waitingForInput && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium animate-pulse">
              Awaiting Input
            </span>
          )}
        </div>
        <button
          onClick={clearConsole}
          title="Clear console"
          className="p-1.5 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed min-h-0"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      >
        {!isAssembled && consoleOutput.length === 0 ? (
          <div className="text-text-muted/40 italic">
            Program output will appear here...
          </div>
        ) : (
          consoleOutput.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${line.startsWith('>') ? 'text-brand-400' : line.startsWith('[') ? 'text-yellow-500' : 'text-emerald-400'}`}>
              {line}
            </div>
          ))
        )}
        {/* Blinking cursor when waiting for input */}
        {waitingForInput && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-400">{'>'}</span>
            <span className="w-2 h-4 bg-yellow-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-2 px-3 py-2 border-t transition-colors ${
          waitingForInput ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border-subtle bg-bg-surface/50'
        }`}
      >
        <span className="text-text-muted text-xs font-mono">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!waitingForInput}
          placeholder={waitingForInput ? 'Enter input and press Enter...' : 'Waiting for syscall read...'}
          className="flex-1 bg-transparent border-none outline-none text-xs text-white font-mono placeholder-text-muted/40 disabled:opacity-30"
        />
        <button
          type="submit"
          disabled={!waitingForInput}
          className={`p-1.5 rounded-lg transition-all ${
            waitingForInput
              ? 'text-yellow-400 hover:bg-yellow-500/10 cursor-pointer'
              : 'text-text-muted/30 cursor-not-allowed'
          }`}
        >
          <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
};

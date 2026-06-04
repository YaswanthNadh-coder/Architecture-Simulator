import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Search, ChevronDown } from 'lucide-react';

type DisplayFormat = 'hex' | 'decimal' | 'binary' | 'ascii';

export const MemoryView = () => {
  const { memory, modifiedAddresses, dataLabels, registers } = useSimulatorStore();
  const [addressInput, setAddressInput] = useState('');
  const [baseAddress, setBaseAddress] = useState(0x10010000); // .data segment default
  const [format, setFormat] = useState<DisplayFormat>('hex');
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Get SP value from register display
  const spHex = registers['$sp'] || '0x7FFFFFFC';
  const spValue = parseInt(spHex, 16);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput) return;
    const input = addressInput.trim();
    // Try label lookup first
    for (const [label, addr] of dataLabels) {
      if (label === input) {
        setBaseAddress(Math.floor(addr / 4) * 4);
        return;
      }
    }
    // Try hex address
    let addr = parseInt(input.replace(/^0x/i, ''), 16);
    if (!isNaN(addr)) {
      addr = Math.max(0, Math.floor(addr / 4) * 4);
      setBaseAddress(addr);
    }
  };

  // Build reverse label map: address → label name
  const addressLabels = new Map<number, string>();
  for (const [label, addr] of dataLabels) {
    addressLabels.set(addr, label);
  }

  // Generate 32 words (128 bytes) starting from baseAddress
  const ROWS = 32;
  const words: { address: number; value: number; label?: string; isSp: boolean; isModified: boolean }[] = [];
  for (let i = 0; i < ROWS; i++) {
    const addr = baseAddress + i * 4;
    // Read word from memory (big-endian)
    const b0 = memory.get(addr) ?? 0;
    const b1 = memory.get(addr + 1) ?? 0;
    const b2 = memory.get(addr + 2) ?? 0;
    const b3 = memory.get(addr + 3) ?? 0;
    const value = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) | 0;

    const isModified = modifiedAddresses.has(addr) || modifiedAddresses.has(addr + 1) ||
      modifiedAddresses.has(addr + 2) || modifiedAddresses.has(addr + 3);

    words.push({
      address: addr,
      value,
      label: addressLabels.get(addr),
      isSp: Math.abs(addr - spValue) < 4,
      isModified,
    });
  }

  const formatHex = (val: number, len = 8) => '0x' + (val >>> 0).toString(16).toUpperCase().padStart(len, '0');

  const formatValue = (val: number): string => {
    switch (format) {
      case 'hex': return formatHex(val);
      case 'decimal': return String(val);
      case 'binary': return '0b' + (val >>> 0).toString(2).padStart(32, '0');
      case 'ascii': {
        const chars = [
          (val >> 24) & 0xFF,
          (val >> 16) & 0xFF,
          (val >> 8) & 0xFF,
          val & 0xFF,
        ].map(c => (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.').join('');
        return chars;
      }
      default: return formatHex(val);
    }
  };

  const getByteChar = (val: number) => {
    if (val >= 32 && val <= 126) return String.fromCharCode(val);
    return '.';
  };

  const segments = [
    { label: '.data', addr: 0x10010000 },
    { label: 'stack', addr: Math.max(0, (spValue & ~0xF) - 32) },
    { label: 'heap', addr: 0x10040000 },
  ];

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Memory Viewer</h2>

        <div className="flex items-center gap-3">
          {/* Format selector */}
          <div className="relative">
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border-subtle rounded-lg text-xs text-text-main hover:bg-white/5 transition-colors"
            >
              {format.charAt(0).toUpperCase() + format.slice(1)}
              <ChevronDown size={12} />
            </button>
            {showFormatMenu && (
              <div className="absolute right-0 top-full mt-1 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden z-30 shadow-xl">
                {(['hex', 'decimal', 'binary', 'ascii'] as DisplayFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setFormat(f); setShowFormatMenu(false); }}
                    className={`block w-full text-left px-4 py-2 text-xs transition-colors ${
                      f === format ? 'bg-brand-500/15 text-brand-400' : 'text-text-main hover:bg-white/5'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-52">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Address or label..."
              className="w-full bg-bg-surface border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-muted/50 outline-none focus:border-brand-500 transition-colors font-mono"
            />
          </form>
        </div>
      </div>

      {/* Segment quick-jump buttons */}
      <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
        {segments.map(({ label, addr }) => (
          <button
            key={label}
            onClick={() => setBaseAddress(addr)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-mono transition-colors ${
              baseAddress === addr
                ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                : 'bg-bg-surface border-border-subtle hover:bg-white/5 text-text-muted'
            }`}
          >
            {label} ({formatHex(addr)})
          </button>
        ))}
        {/* Data label buttons */}
        {Array.from(dataLabels).slice(0, 6).map(([label, addr]) => (
          <button
            key={label}
            onClick={() => setBaseAddress(Math.floor(addr / 4) * 4)}
            className="px-3 py-1.5 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded-lg text-xs text-emerald-400 transition-colors font-mono"
          >
            {label}:
          </button>
        ))}
      </div>

      {/* Memory table */}
      <div className="flex-1 overflow-auto bg-bg-surface border border-border-subtle rounded-xl font-mono text-xs">
        {/* Table header */}
        <div className="grid gap-0 px-3 py-2.5 border-b border-border-subtle bg-bg-panel text-text-muted font-bold tracking-wider text-[10px] uppercase sticky top-0 z-10"
          style={{ gridTemplateColumns: '80px 80px 1fr 120px 60px' }}
        >
          <div>Label</div>
          <div>Address</div>
          <div>Value ({format})</div>
          <div>Bytes</div>
          <div>ASCII</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-subtle/30">
          {words.map(({ address, value, label, isSp, isModified }) => {
            const b0 = (value >>> 24) & 0xFF;
            const b1 = (value >>> 16) & 0xFF;
            const b2 = (value >>> 8) & 0xFF;
            const b3 = value & 0xFF;
            const hasData = value !== 0 || memory.has(address);

            return (
              <div
                key={address}
                className={`grid gap-0 px-3 py-2 items-center group transition-colors ${
                  isModified ? 'bg-emerald-500/5' : isSp ? 'bg-brand-500/5' : 'hover:bg-white/[0.02]'
                }`}
                style={{ gridTemplateColumns: '80px 80px 1fr 120px 60px' }}
              >
                {/* Label */}
                <div className="flex items-center gap-1">
                  {label && (
                    <span className="text-emerald-400 text-[10px] font-semibold">{label}:</span>
                  )}
                  {isSp && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">$sp</span>
                  )}
                </div>

                {/* Address */}
                <div className={`transition-colors ${
                  isModified ? 'text-emerald-400' : 'text-text-muted group-hover:text-brand-400'
                }`}>
                  {formatHex(address)}
                </div>

                {/* Value */}
                <div className={`font-semibold ${
                  isModified ? 'text-emerald-300' : hasData ? 'text-white' : 'text-text-muted/40'
                }`}>
                  {formatValue(value)}
                </div>

                {/* Byte view */}
                <div className="flex gap-2 text-text-main/70">
                  <span className={`w-6 text-center ${isModified && modifiedAddresses.has(address) ? 'text-emerald-400' : ''}`}>
                    {b0.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                  <span className={`w-6 text-center ${isModified && modifiedAddresses.has(address + 1) ? 'text-emerald-400' : ''}`}>
                    {b1.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                  <span className={`w-6 text-center ${isModified && modifiedAddresses.has(address + 2) ? 'text-emerald-400' : ''}`}>
                    {b2.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                  <span className={`w-6 text-center ${isModified && modifiedAddresses.has(address + 3) ? 'text-emerald-400' : ''}`}>
                    {b3.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </div>

                {/* ASCII */}
                <div className="text-text-muted/60">
                  {getByteChar(b0)}{getByteChar(b1)}{getByteChar(b2)}{getByteChar(b3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-3 shrink-0">
        <button
          onClick={() => setBaseAddress(Math.max(0, baseAddress - ROWS * 4))}
          className="px-4 py-1.5 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded-lg text-xs text-text-main transition-colors"
        >
          ← Previous {ROWS * 4} bytes
        </button>
        <span className="text-[10px] text-text-muted font-mono self-center">
          {formatHex(baseAddress)} — {formatHex(baseAddress + ROWS * 4 - 1)}
        </span>
        <button
          onClick={() => setBaseAddress(baseAddress + ROWS * 4)}
          className="px-4 py-1.5 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded-lg text-xs text-text-main transition-colors"
        >
          Next {ROWS * 4} bytes →
        </button>
      </div>
    </div>
  );
};

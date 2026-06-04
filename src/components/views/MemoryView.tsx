import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Search } from 'lucide-react';

export const MemoryView = () => {
  const { memory } = useSimulatorStore();
  const [addressInput, setAddressInput] = useState('');
  const [baseAddress, setBaseAddress] = useState(0x10010000); // .data segment default

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput) return;
    let addr = parseInt(addressInput, 16);
    if (!isNaN(addr)) {
      addr = Math.max(0, Math.floor(addr / 4) * 4); // align to word
      setBaseAddress(addr);
    }
  };

  // Generate 16 words (64 bytes) starting from baseAddress
  const words: { address: number; value: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const addr = baseAddress + i * 4;
    words.push({ address: addr, value: memory.get(addr) || 0 });
  }

  const formatHex = (val: number, len = 8) => '0x' + (val >>> 0).toString(16).toUpperCase().padStart(len, '0');

  const getChar = (val: number) => {
    if (val >= 32 && val <= 126) return String.fromCharCode(val);
    return '.';
  };

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Memory Dump</h2>
        
        <form onSubmit={handleSearch} className="relative w-48">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Go to hex address..."
            className="w-full bg-bg-surface border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-muted/50 outline-none focus:border-brand-500 transition-colors font-mono"
          />
        </form>
      </div>

      <div className="flex gap-2 mb-4 shrink-0">
        <button onClick={() => setBaseAddress(0x10010000)} className="px-3 py-1 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded text-xs text-text-muted transition-colors font-mono">.data (0x10010000)</button>
        <button onClick={() => setBaseAddress(0x7FFFFFE0)} className="px-3 py-1 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded text-xs text-text-muted transition-colors font-mono">stack (0x7FFFFFFC)</button>
      </div>

      <div className="flex-1 overflow-auto bg-bg-surface border border-border-subtle rounded-xl font-mono text-xs">
        <div className="grid grid-cols-[100px_1fr_100px] gap-4 px-4 py-2 border-b border-border-subtle bg-bg-panel text-text-muted font-bold tracking-wider">
          <div>Address</div>
          <div>Hex Value (+0, +1, +2, +3)</div>
          <div>ASCII</div>
        </div>
        <div className="p-2">
          {words.map(({ address, value }) => {
            const b0 = (value >>> 24) & 0xFF;
            const b1 = (value >>> 16) & 0xFF;
            const b2 = (value >>> 8) & 0xFF;
            const b3 = value & 0xFF;

            return (
              <div key={address} className="grid grid-cols-[100px_1fr_100px] gap-4 px-2 py-1.5 hover:bg-white/5 rounded group text-text-main">
                <div className="text-text-muted group-hover:text-brand-400 transition-colors">{formatHex(address)}</div>
                <div className="flex gap-2">
                  <span className="w-6 text-center">{formatHex(b0, 2).slice(2)}</span>
                  <span className="w-6 text-center">{formatHex(b1, 2).slice(2)}</span>
                  <span className="w-6 text-center">{formatHex(b2, 2).slice(2)}</span>
                  <span className="w-6 text-center">{formatHex(b3, 2).slice(2)}</span>
                </div>
                <div className="text-text-muted flex gap-1">
                  <span>{getChar(b0)}</span>
                  <span>{getChar(b1)}</span>
                  <span>{getChar(b2)}</span>
                  <span>{getChar(b3)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between mt-4">
        <button onClick={() => setBaseAddress(Math.max(0, baseAddress - 64))} className="px-3 py-1 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded text-xs text-text-main transition-colors">Previous 64 bytes</button>
        <button onClick={() => setBaseAddress(baseAddress + 64)} className="px-3 py-1 bg-bg-surface border border-border-subtle hover:bg-white/5 rounded text-xs text-text-main transition-colors">Next 64 bytes</button>
      </div>
    </div>
  );
};

import { useSimulatorStore, type InstructionStatus } from '../../store/simulatorStore';

export const DatapathView = () => {
  const { pipeline } = useSimulatorStore();

  const getStageColor = (status: InstructionStatus) => {
    switch (status) {
      case 'normal': return '#10b981'; // emerald-500
      case 'hazard': return '#ef4444'; // red-500
      case 'forward': return '#eab308'; // yellow-500
      case 'stall': return '#64748b'; // slate-500
      default: return '#1e293b'; // slate-800
    }
  };

  const getStageGlow = (status: InstructionStatus, color: string) => {
    return status !== 'bubble' && status !== 'stall' ? `drop-shadow(0 0 8px ${color}80)` : 'none';
  };

  const ifColor = getStageColor(pipeline.IF.status);
  const idColor = getStageColor(pipeline.ID.status);
  const exColor = getStageColor(pipeline.EX.status);
  const memColor = getStageColor(pipeline.MEM.status);
  const wbColor = getStageColor(pipeline.WB.status);

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-hidden relative p-4">
      <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-4 absolute top-6 left-6 z-10">MIPS Datapath</h2>
      <div className="flex-1 relative min-h-[400px] w-full max-w-[800px] mx-auto flex items-center justify-center">
        <svg viewBox="0 0 800 400" className="w-full h-full font-mono text-[10px]">
          {/* Defs for gradients/markers */}
          <defs>
            <marker id="arrow-if" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ifColor} />
            </marker>
            <marker id="arrow-id" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={idColor} />
            </marker>
            <marker id="arrow-ex" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={exColor} />
            </marker>
            <marker id="arrow-mem" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={memColor} />
            </marker>
            <marker id="arrow-wb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={wbColor} />
            </marker>
          </defs>

          {/* PC Block */}
          <g transform="translate(50, 180)" style={{ filter: getStageGlow(pipeline.IF.status, ifColor) }}>
            <rect width="40" height="60" fill="#0f1e33" stroke={ifColor} strokeWidth="2" rx="4" />
            <text x="20" y="34" fill="white" textAnchor="middle" className="font-bold">PC</text>
          </g>

          {/* Instruction Memory Block */}
          <g transform="translate(150, 150)" style={{ filter: getStageGlow(pipeline.IF.status, ifColor) }}>
            <rect width="80" height="120" fill="#0f1e33" stroke={ifColor} strokeWidth="2" rx="4" />
            <text x="40" y="60" fill="white" textAnchor="middle" className="font-bold">Instruction</text>
            <text x="40" y="75" fill="white" textAnchor="middle" className="font-bold">Memory</text>
          </g>

          {/* Register File Block */}
          <g transform="translate(300, 150)" style={{ filter: getStageGlow(pipeline.ID.status, idColor) }}>
            <rect width="80" height="120" fill="#0f1e33" stroke={idColor} strokeWidth="2" rx="4" />
            <text x="40" y="60" fill="white" textAnchor="middle" className="font-bold">Registers</text>
          </g>

          {/* ALU Block (polygon) */}
          <g transform="translate(450, 170)" style={{ filter: getStageGlow(pipeline.EX.status, exColor) }}>
            <polygon points="0,0 30,20 30,60 0,80 0,50 10,40 0,30" fill="#0f1e33" stroke={exColor} strokeWidth="2" />
            <text x="18" y="44" fill="white" textAnchor="middle" className="font-bold">ALU</text>
          </g>

          {/* Data Memory Block */}
          <g transform="translate(550, 150)" style={{ filter: getStageGlow(pipeline.MEM.status, memColor) }}>
            <rect width="80" height="120" fill="#0f1e33" stroke={memColor} strokeWidth="2" rx="4" />
            <text x="40" y="60" fill="white" textAnchor="middle" className="font-bold">Data</text>
            <text x="40" y="75" fill="white" textAnchor="middle" className="font-bold">Memory</text>
          </g>

          {/* Data Lines */}
          <path d="M 90 210 L 140 210" stroke={ifColor} strokeWidth="2" markerEnd="url(#arrow-if)" />
          <path d="M 230 210 L 290 210" stroke={idColor} strokeWidth="2" markerEnd="url(#arrow-id)" />
          
          <path d="M 380 180 L 440 180" stroke={exColor} strokeWidth="2" markerEnd="url(#arrow-ex)" />
          <path d="M 380 240 L 440 240" stroke={exColor} strokeWidth="2" markerEnd="url(#arrow-ex)" />
          
          <path d="M 480 210 L 540 210" stroke={memColor} strokeWidth="2" markerEnd="url(#arrow-mem)" />
          
          {/* Writeback line */}
          <path d="M 630 210 L 660 210 L 660 320 L 340 320 L 340 280" stroke={wbColor} strokeWidth="2" markerEnd="url(#arrow-wb)" fill="none" />

          {/* Forwarding lines (if applicable) */}
          {pipeline.ID.status === 'forward' && (
            <path d="M 500 210 L 500 130 L 430 130 L 430 170" stroke="#eab308" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrow-ex)" fill="none" />
          )}

          {/* Status Text Overlays */}
          <text x="70" y="170" fill={ifColor}>{pipeline.IF.instruction || ''}</text>
          <text x="340" y="140" fill={idColor} textAnchor="middle">{pipeline.ID.instruction || ''}</text>
          <text x="470" y="150" fill={exColor} textAnchor="middle">{pipeline.EX.instruction || ''}</text>
          <text x="590" y="140" fill={memColor} textAnchor="middle">{pipeline.MEM.instruction || ''}</text>
          <text x="650" y="340" fill={wbColor} textAnchor="middle">{pipeline.WB.instruction || ''}</text>
        </svg>
      </div>
    </div>
  );
};

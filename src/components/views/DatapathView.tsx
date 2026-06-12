import { useSimulatorStore, type InstructionStatus } from '../../store/simulatorStore';
import { motion } from 'framer-motion';
import {
  VIEWBOX, COMPONENTS, WIRES, LATCHES, CONTROL_SIGNALS,
  STAGE_COLORS, STATUS_COLORS,
  type ComponentDef,
} from './datapathLayout';

// ── Helper: get stage activity color ─────────────────────────────────

function getStageActive(pipelineStage: { instruction: string | null; status: InstructionStatus }) {
  if (!pipelineStage.instruction) return false;
  return pipelineStage.status !== 'bubble';
}

function getStatusColor(status: InstructionStatus): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.normal;
}

// ── Component Renderers ──────────────────────────────────────────────

const HardwareBlock = ({ comp, isActive, statusColor }: {
  comp: ComponentDef; isActive: boolean; statusColor: string;
}) => {
  const stageColor = STAGE_COLORS[comp.stage];
  const fill = isActive ? `${stageColor.active}15` : '#0f1e33';
  const stroke = isActive ? statusColor : stageColor.dim;
  const glowFilter = isActive ? `drop-shadow(0 0 6px ${stageColor.glow})` : 'none';

  if (comp.shape === 'alu') {
    // ALU trapezoid shape
    const { x, y, w, h } = comp;
    const points = [
      `${x},${y}`,
      `${x + w},${y + h * 0.25}`,
      `${x + w},${y + h * 0.75}`,
      `${x},${y + h}`,
      `${x},${y + h * 0.65}`,
      `${x + 10},${y + h * 0.5}`,
      `${x},${y + h * 0.35}`,
    ].join(' ');
    return (
      <g style={{ filter: glowFilter }}>
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <text
          x={x + w * 0.4} y={y + h * 0.55}
          fill="white" textAnchor="middle"
          className="text-[10px] font-bold"
        >
          {comp.label}
        </text>
      </g>
    );
  }

  if (comp.shape === 'mux') {
    // MUX trapezoid
    const { x, y, w, h } = comp;
    const points = [
      `${x + 3},${y}`,
      `${x + w - 3},${y + 5}`,
      `${x + w - 3},${y + h - 5}`,
      `${x + 3},${y + h}`,
    ].join(' ');
    return (
      <g style={{ filter: glowFilter }}>
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={isActive ? 1.5 : 1}
          rx={2}
        />
        <text
          x={x + w / 2} y={y + h / 2 + 3}
          fill={isActive ? 'white' : '#475569'}
          textAnchor="middle"
          className="text-[7px]"
        >
          M
        </text>
      </g>
    );
  }

  if (comp.shape === 'circle') {
    const { x, y, w, h } = comp;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    return (
      <g style={{ filter: glowFilter }}>
        <circle
          cx={cx} cy={cy} r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={isActive ? 1.5 : 1}
        />
        <text
          x={cx} y={cy + 3}
          fill="white" textAnchor="middle"
          className="text-[8px] font-bold"
        >
          {comp.label}
        </text>
      </g>
    );
  }

  // Default rectangle
  const { x, y, w, h } = comp;
  return (
    <g style={{ filter: glowFilter }}>
      <rect
        x={x} y={y} width={w} height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={isActive ? 2 : 1.5}
        rx={4}
      />
      <text
        x={x + w / 2} y={y + h / 2 + (comp.sublabel ? -4 : 3)}
        fill="white" textAnchor="middle"
        className="text-[10px] font-bold"
      >
        {comp.label}
      </text>
      {comp.sublabel && (
        <text
          x={x + w / 2} y={y + h / 2 + 10}
          fill="white" textAnchor="middle"
          className="text-[10px] font-bold"
        >
          {comp.sublabel}
        </text>
      )}
    </g>
  );
};

// ── Main Component ───────────────────────────────────────────────────

export const DatapathView = () => {
  const { pipeline, forwardingEnabled, cycle, datapathValues } = useSimulatorStore();

  const getWireValue = (wireId: string, values: any) => {
    switch (wireId) {
      case 'pc-to-imem': return `0x${values.pc.toString(16).toUpperCase()}`;
      case 'idex-to-alua': return values.rsVal;
      case 'idex-to-alub': return values.rtVal;
      case 'idex-imm-to-mux': return values.imm;
      case 'alu-out': return values.aluResult;
      case 'exmem-to-dmem-addr': return values.aluResult;
      case 'dmem-out': return values.memData;
      case 'mux-to-regfile': return values.writeData;
      default: return null;
    }
  };

  // Determine which stages are active
  const stageActive: Record<string, boolean> = {
    IF: getStageActive(pipeline.IF),
    ID: getStageActive(pipeline.ID),
    EX: getStageActive(pipeline.EX),
    MEM: getStageActive(pipeline.MEM),
    WB: getStageActive(pipeline.WB),
    CTRL: getStageActive(pipeline.ID),
    FWD: pipeline.ID.status === 'forward' || pipeline.EX.status === 'forward',
  };

  const stageStatus: Record<string, InstructionStatus> = {
    IF: pipeline.IF.status,
    ID: pipeline.ID.status,
    EX: pipeline.EX.status,
    MEM: pipeline.MEM.status,
    WB: pipeline.WB.status,
    CTRL: pipeline.ID.status,
    FWD: 'forward',
  };

  return (
    <div className="flex-1 h-full bg-bg-base flex flex-col overflow-hidden relative">
      {/* Title & Info */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-4">
        <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase">MIPS Datapath</h2>
        <div className="flex items-center gap-3 text-[10px]">
          {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map(stage => {
            const color = STAGE_COLORS[stage];
            const active = stageActive[stage];
            return (
              <div key={stage} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: active ? color.active : color.dim,
                    boxShadow: active ? `0 0 6px ${color.glow}` : 'none',
                  }}
                />
                <span className={active ? 'text-white' : 'text-text-muted/50'}>{stage}</span>
              </div>
            );
          })}
          {forwardingEnabled && (
            <>
              <div className="w-px h-3 bg-border-subtle" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS.FWD.active }} />
                <span className="text-yellow-400">Forwarding</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SVG Datapath */}
      <div className="flex-1 min-h-0 p-4 pt-12">
        <svg
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          className="w-full h-full"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <defs>
            {/* Arrow markers for each stage */}
            {Object.entries(STAGE_COLORS).map(([stage, colors]) => (
              <marker
                key={`arrow-${stage}`}
                id={`arrow-${stage}`}
                viewBox="0 0 10 10"
                refX="9" refY="5"
                markerWidth="5" markerHeight="5"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.active} />
              </marker>
            ))}
            {/* Forwarding dashed arrow */}
            <marker
              id="arrow-fwd"
              viewBox="0 0 10 10"
              refX="9" refY="5"
              markerWidth="5" markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#eab308" />
            </marker>
          </defs>

          {/* Background grid (subtle) */}
          <pattern id="dp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dp-grid)" opacity={0.3} />

          {/* Pipeline Register Latches */}
          {LATCHES.map(latch => (
            <g key={latch.label}>
              <rect
                x={latch.x - 3} y={latch.y}
                width={6} height={latch.h}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={1}
                rx={3}
              />
              <text
                x={latch.x} y={latch.y - 8}
                fill="#64748b"
                textAnchor="middle"
                className="text-[8px] font-bold"
              >
                {latch.label}
              </text>
            </g>
          ))}

          {/* Data Wires */}
          {WIRES.map(wire => {
            const active = stageActive[wire.stage];
            const color = active
              ? (wire.stage === 'FWD' ? STAGE_COLORS.FWD.active : getStatusColor(stageStatus[wire.stage]))
              : '#1e3052';
            const isDashed = wire.stage === 'FWD';

            // Don't show forwarding wires if forwarding is off or no forwarding happening
            if (wire.stage === 'FWD' && (!forwardingEnabled || !stageActive.FWD)) {
              return null;
            }

            return (
              <g key={wire.id}>
                <motion.path
                  d={wire.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={isDashed ? '4,3' : undefined}
                  markerEnd={active ? `url(#arrow-${wire.stage === 'FWD' ? 'fwd' : wire.stage})` : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: active ? 1 : 0.3,
                    stroke: color,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                {wire.label && active && (
                  <text
                    x={0} y={0}
                    fill={color}
                    className="text-[6px]"
                    opacity={0.8}
                  >
                    <textPath href={`#${wire.id}-path`} startOffset="50%" textAnchor="middle">
                      {wire.label}
                    </textPath>
                  </text>
                )}
              </g>
            );
          })}

          {/* Control Signals (thin colored lines) */}
          {CONTROL_SIGNALS.map(signal => {
            const active = stageActive[signal.stage] || stageActive.ID;
            return (
              <g key={signal.id}>
                <path
                  d={signal.path}
                  fill="none"
                  stroke={active ? '#f472b680' : '#1e3052'}
                  strokeWidth={active ? 1 : 0.5}
                  strokeDasharray="2,2"
                  opacity={active ? 0.6 : 0.15}
                />
                {active && (
                  <text
                    x={0} y={0}
                    fill="#f472b6"
                    className="text-[6px]"
                    opacity={0.7}
                  >
                    {signal.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Hardware Components */}
          {COMPONENTS.map((comp, idx) => (
            <HardwareBlock
              key={idx}
              comp={comp}
              isActive={stageActive[comp.stage]}
              statusColor={getStatusColor(stageStatus[comp.stage])}
            />
          ))}

          {/* Instruction Text Overlays */}
          {([
            { stage: 'IF',  inst: pipeline.IF,  x: 125, y: 108 },
            { stage: 'ID',  inst: pipeline.ID,  x: 265, y: 108 },
            { stage: 'EX',  inst: pipeline.EX,  x: 480, y: 148 },
            { stage: 'MEM', inst: pipeline.MEM, x: 685, y: 138 },
            { stage: 'WB',  inst: pipeline.WB,  x: 860, y: 188 },
          ] as const).map(({ stage, inst, x, y }) => (
            inst.instruction && (
              <motion.text
                key={`label-${stage}-${cycle}`}
                x={x} y={y}
                fill={getStatusColor(inst.status)}
                textAnchor="middle"
                className="text-[8px] font-semibold"
                initial={{ opacity: 0, y: y - 5 }}
                animate={{ opacity: 1, y }}
                transition={{ duration: 0.3 }}
              >
                {inst.instruction.length > 20 ? inst.instruction.substring(0, 18) + '…' : inst.instruction}
              </motion.text>
            )
          ))}

          {/* Animated data chips traveling along active wires */}
          {WIRES.filter(w => stageActive[w.stage] && w.stage !== 'FWD').map(wire => {
            const color = STAGE_COLORS[wire.stage]?.active ?? '#60a5fa';
            const value = getWireValue(wire.id, datapathValues);
            return (
              <motion.g
                key={`chip-${wire.id}-${cycle}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              >
                <animateMotion
                  dur="0.8s"
                  repeatCount="1"
                  path={wire.path}
                  fill="freeze"
                />
                {value !== null ? (
                  <g transform="translate(0, -6)">
                    <rect x={-15} y={-5} width={30} height={10} rx={5} fill={color} opacity={0.9} />
                    <text x={0} y={2.5} fill="#fff" textAnchor="middle" className="text-[6px] font-mono font-bold">
                      {value}
                    </text>
                  </g>
                ) : (
                  <circle r={2.5} fill={color} opacity={0.8} />
                )}
              </motion.g>
            );
          })}

          {/* Status badges */}
          {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map((stage, idx) => {
            const inst = pipeline[stage];
            if (inst.status === 'bubble' || inst.status === 'normal') return null;
            const x = 125 + idx * 185;
            const y = 455;
            const color = getStatusColor(inst.status);
            return (
              <g key={`status-${stage}`}>
                <rect
                  x={x - 25} y={y - 8}
                  width={50} height={16}
                  rx={8}
                  fill={`${color}20`}
                  stroke={`${color}50`}
                  strokeWidth={1}
                />
                <text
                  x={x} y={y + 3}
                  fill={color}
                  textAnchor="middle"
                  className="text-[7px] font-bold uppercase"
                >
                  {inst.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

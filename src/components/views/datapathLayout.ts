/**
 * Datapath Layout Constants
 * Defines SVG coordinates, wire paths, and component positions
 * for the Patterson & Hennessy 5-stage MIPS datapath diagram.
 */

export interface ComponentDef {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel?: string;
  stage: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB' | 'CTRL';
  shape?: 'rect' | 'alu' | 'mux' | 'circle';
}

export interface WireDef {
  id: string;
  path: string;
  label?: string;
  stage: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB' | 'FWD';
  isControl?: boolean;
}

export interface LatchDef {
  x: number;
  y: number;
  h: number;
  label: string;
}

// ── Viewbox: 1000 x 500 ──────────────────────────────────────────────

export const VIEWBOX = { w: 1000, h: 500 };

// ── Pipeline Register Latches ────────────────────────────────────────

export const LATCHES: LatchDef[] = [
  { x: 185, y: 60, h: 380, label: 'IF/ID' },
  { x: 370, y: 60, h: 380, label: 'ID/EX' },
  { x: 600, y: 60, h: 380, label: 'EX/MEM' },
  { x: 800, y: 60, h: 380, label: 'MEM/WB' },
];

// ── Hardware Components ──────────────────────────────────────────────

export const COMPONENTS: ComponentDef[] = [
  // IF Stage
  { x: 20,  y: 200, w: 40,  h: 60,  label: 'PC',       stage: 'IF', shape: 'rect' },
  { x: 85,  y: 120, w: 80,  h: 160, label: 'Instruction', sublabel: 'Memory', stage: 'IF', shape: 'rect' },
  { x: 85,  y: 310, w: 35,  h: 35,  label: '+4',       stage: 'IF', shape: 'circle' },

  // ID Stage
  { x: 220, y: 120, w: 90,  h: 120, label: 'Register', sublabel: 'File',    stage: 'ID', shape: 'rect' },
  { x: 220, y: 270, w: 90,  h: 50,  label: 'Sign',     sublabel: 'Extend',  stage: 'ID', shape: 'rect' },

  // Control
  { x: 240, y: 70,  w: 60,  h: 40,  label: 'Control',   stage: 'CTRL', shape: 'rect' },

  // EX Stage
  { x: 410, y: 135, w: 25,  h: 50,  label: '',          stage: 'EX', shape: 'mux' }, // ALUSrc top MUX
  { x: 460, y: 160, w: 45,  h: 80,  label: 'ALU',       stage: 'EX', shape: 'alu' },
  { x: 410, y: 300, w: 25,  h: 50,  label: '',          stage: 'EX', shape: 'mux' }, // ALUSrc bottom MUX
  { x: 530, y: 80,  w: 40,  h: 35,  label: '+',         stage: 'EX', shape: 'circle' }, // Branch add
  { x: 500, y: 300, w: 25,  h: 50,  label: '',          stage: 'EX', shape: 'mux' }, // RegDst MUX

  // MEM Stage
  { x: 640, y: 150, w: 90,  h: 130, label: 'Data',     sublabel: 'Memory',  stage: 'MEM', shape: 'rect' },
  { x: 660, y: 320, w: 30,  h: 30,  label: 'AND',      stage: 'MEM', shape: 'circle' },

  // WB Stage
  { x: 850, y: 200, w: 25,  h: 50,  label: '',          stage: 'WB', shape: 'mux' }, // MemToReg MUX
];

// ── Data Wires ───────────────────────────────────────────────────────

export const WIRES: WireDef[] = [
  // IF Stage wires
  { id: 'pc-to-imem',     path: 'M 60 230 L 85 230',    stage: 'IF', label: 'Address' },
  { id: 'pc-to-add4',     path: 'M 60 240 L 70 240 L 70 327 L 85 327', stage: 'IF' },
  { id: 'imem-to-ifid',   path: 'M 165 200 L 185 200',  stage: 'IF', label: 'Instruction' },
  { id: 'add4-to-pcmux',  path: 'M 120 327 L 140 327 L 140 390 L 15 390 L 15 245 L 20 245', stage: 'IF' },

  // ID Stage wires
  { id: 'ifid-to-regfile-r1', path: 'M 195 170 L 220 170', stage: 'ID', label: 'rs' },
  { id: 'ifid-to-regfile-r2', path: 'M 195 200 L 220 200', stage: 'ID', label: 'rt' },
  { id: 'ifid-to-signext',    path: 'M 195 290 L 220 290', stage: 'ID', label: 'imm[15:0]' },
  { id: 'ifid-to-ctrl',       path: 'M 195 130 L 210 130 L 210 90 L 240 90', stage: 'ID', label: 'opcode', isControl: true },
  { id: 'regfile-rd1',        path: 'M 310 160 L 370 160', stage: 'ID', label: 'Read Data 1' },
  { id: 'regfile-rd2',        path: 'M 310 200 L 370 200', stage: 'ID', label: 'Read Data 2' },
  { id: 'signext-out',        path: 'M 310 295 L 370 295', stage: 'ID', label: 'Sign-extended' },

  // EX Stage wires
  { id: 'idex-to-alua',   path: 'M 380 160 L 410 160',  stage: 'EX' },
  { id: 'mux-to-alu-a',   path: 'M 435 160 L 460 180',  stage: 'EX' },
  { id: 'idex-to-alub',   path: 'M 380 200 L 390 200 L 390 315 L 410 315', stage: 'EX' },
  { id: 'idex-imm-to-mux',path: 'M 380 295 L 400 295 L 400 335 L 410 335', stage: 'EX' },
  { id: 'mux-to-alu-b',   path: 'M 435 325 L 450 325 L 450 220 L 460 220', stage: 'EX' },
  { id: 'alu-out',         path: 'M 505 200 L 600 200',  stage: 'EX', label: 'ALU Result' },
  { id: 'alu-to-branch',  path: 'M 505 185 L 520 185 L 520 97 L 530 97', stage: 'EX' },
  { id: 'branch-target',  path: 'M 570 97 L 580 97 L 580 410 L 15 410 L 15 255 L 20 255', stage: 'EX' },

  // MEM Stage wires
  { id: 'exmem-to-dmem-addr', path: 'M 610 200 L 640 200', stage: 'MEM', label: 'Address' },
  { id: 'exmem-to-dmem-data', path: 'M 610 250 L 625 250 L 625 240 L 640 240', stage: 'MEM', label: 'Write Data' },
  { id: 'dmem-out',           path: 'M 730 200 L 800 200', stage: 'MEM', label: 'Read Data' },
  { id: 'exmem-passthru',     path: 'M 610 180 L 620 180 L 620 160 L 770 160 L 770 220 L 800 220', stage: 'MEM' },

  // WB Stage wires
  { id: 'memwb-to-mux',   path: 'M 810 210 L 850 210',  stage: 'WB' },
  { id: 'mux-to-regfile',  path: 'M 875 225 L 920 225 L 920 440 L 290 440 L 290 240 L 310 240', stage: 'WB', label: 'Write Data' },

  // Forwarding paths
  { id: 'fwd-ex-to-alu-a', path: 'M 610 190 L 620 190 L 620 130 L 425 130 L 425 135', stage: 'FWD', label: 'EX→EX Fwd' },
  { id: 'fwd-mem-to-alu-a',path: 'M 810 200 L 820 200 L 820 120 L 420 120 L 420 135', stage: 'FWD', label: 'MEM→EX Fwd' },
];

// ── Control Signals ──────────────────────────────────────────────────

export interface ControlSignalDef {
  id: string;
  label: string;
  path: string;
  stage: 'ID' | 'EX' | 'MEM' | 'WB';
}

export const CONTROL_SIGNALS: ControlSignalDef[] = [
  { id: 'RegDst',    label: 'RegDst',    path: 'M 270 70 L 270 55 L 500 55 L 500 300', stage: 'EX' },
  { id: 'ALUSrc',    label: 'ALUSrc',    path: 'M 280 70 L 280 50 L 420 50 L 420 135',  stage: 'EX' },
  { id: 'MemToReg',  label: 'MemToReg',  path: 'M 290 70 L 290 45 L 860 45 L 860 200',  stage: 'WB' },
  { id: 'RegWrite',  label: 'RegWrite',  path: 'M 300 90 L 330 90 L 330 60 L 930 60 L 930 440', stage: 'WB' },
  { id: 'MemRead',   label: 'MemRead',   path: 'M 270 110 L 270 115 L 650 115 L 650 150', stage: 'MEM' },
  { id: 'MemWrite',  label: 'MemWrite',  path: 'M 280 110 L 280 118 L 660 118 L 660 150', stage: 'MEM' },
  { id: 'Branch',    label: 'Branch',    path: 'M 290 110 L 290 121 L 670 121 L 670 320', stage: 'MEM' },
];

// ── Stage Color Map ──────────────────────────────────────────────────

export const STAGE_COLORS: Record<string, { active: string; dim: string; glow: string }> = {
  IF:   { active: '#818cf8', dim: '#818cf830', glow: '#818cf840' },
  ID:   { active: '#a78bfa', dim: '#a78bfa30', glow: '#a78bfa40' },
  EX:   { active: '#60a5fa', dim: '#60a5fa30', glow: '#60a5fa40' },
  MEM:  { active: '#34d399', dim: '#34d39930', glow: '#34d39940' },
  WB:   { active: '#fb923c', dim: '#fb923c30', glow: '#fb923c40' },
  CTRL: { active: '#f472b6', dim: '#f472b630', glow: '#f472b640' },
  FWD:  { active: '#eab308', dim: '#eab30830', glow: '#eab30840' },
};

export const STATUS_COLORS: Record<string, string> = {
  normal:  '#10b981',
  hazard:  '#ef4444',
  forward: '#eab308',
  stall:   '#64748b',
  bubble:  '#1e293b',
};

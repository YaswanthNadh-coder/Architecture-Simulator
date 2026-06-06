import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MipsEditor } from '../editor/MipsEditor';
import { PipelineCanvas } from '../pipeline/PipelineCanvas';
import { RegisterFile } from '../inspector/RegisterFile';
import { RightPanel } from '../inspector/RightPanel';
import { ConsolePanel } from '../console/ConsolePanel';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';

// Views
import { DatapathView } from './DatapathView';
import { TimingView } from './TimingView';
import { MemoryView } from './MemoryView';
import { DiffView } from './DiffView';
import { GradingView } from './GradingView';
import { WorkspacePanel } from './WorkspacePanel';

type TabView = 'Pipeline' | 'Datapath' | 'Timing' | 'Memory' | 'Diff' | 'Grading';

export const SimulatorPage = () => {
  const { cycle, waitingForInput } = useSimulatorStore();
  const [activeTab, setActiveTab] = useState<TabView>('Pipeline');
  const [showConsole, setShowConsole] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <header
        className="h-12 flex items-center justify-between px-6 shrink-0 z-10"
        style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span onClick={() => navigate('/')} className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors cursor-pointer">
            <GraduationCap size={15} className="text-brand-500" />
            CS301
          </span>
          <ChevronRight size={13} className="text-border-subtle" />
          <span className="text-white font-medium">Lab 3: Hazards & Forwarding</span>
          {cycle > 0 && (
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 font-mono">
              cycle {cycle}
            </span>
          )}
          {waitingForInput && (
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-mono animate-pulse">
              input required
            </span>
          )}
        </div>

        {/* View tabs */}
        <nav className="flex items-center gap-1">
          {(['Pipeline', 'Datapath', 'Timing', 'Memory', 'Diff', 'Grading'] as TabView[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                activeTab === tab
                  ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
          {/* Console toggle */}
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
              showConsole
                ? 'bg-emerald-500/15 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)]'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Console
          </button>
          
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <WorkspacePanel />
        </nav>
      </header>

      {/* Main Dashboard Grid */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — MIPS IDE + Console */}
        <div
          className="w-[320px] xl:w-[380px] shrink-0 flex flex-col"
          style={{ borderRight: '1px solid var(--color-border-subtle)' }}
        >
          <div className={`flex-1 min-h-0 flex flex-col ${showConsole ? 'max-h-[calc(100%-180px)]' : ''}`}>
            <MipsEditor />
          </div>
          {/* Console panel — persistent below editor */}
          {showConsole && (
            <div className="h-[180px] shrink-0">
              <ConsolePanel />
            </div>
          )}
        </div>

        {/* Center column — Multi-View Canvas + Register File */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Visual View */}
          <div className={`flex-1 min-h-0 ${activeTab === 'Pipeline' ? 'pipeline-bg' : 'bg-bg-base'}`}>
            {activeTab === 'Pipeline' && <PipelineCanvas />}
            {activeTab === 'Datapath' && <DatapathView />}
            {activeTab === 'Timing' && <TimingView />}
            {activeTab === 'Memory' && <MemoryView />}
            {activeTab === 'Diff' && <DiffView />}
            {activeTab === 'Grading' && <GradingView />}
          </div>

          {/* Register File (Always visible) */}
          <div className="h-[220px] shrink-0">
            <RegisterFile />
          </div>
        </div>

        {/* Right panel */}
        <RightPanel />
      </div>
    </div>
  );
};

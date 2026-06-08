import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MipsEditor } from '../editor/MipsEditor';
import { PipelineCanvas } from '../pipeline/PipelineCanvas';
import { RegisterFile } from '../inspector/RegisterFile';
import { RightPanel } from '../inspector/RightPanel';
import { ConsolePanel } from '../console/ConsolePanel';
import { ChevronRight, GraduationCap, Sparkles, FileCode2 } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { UpgradeBanner } from '../monetization/UpgradeBanner';

// Views
import { DatapathView } from './DatapathView';
import { TimingView } from './TimingView';
import { MemoryView } from './MemoryView';
import { DiffView } from './DiffView';
import { GradingView } from './GradingView';
import { ArchitectureSettingsPanel } from '../settings/ArchitectureSettingsPanel';

type TabView = 'Pipeline' | 'Datapath' | 'Timing' | 'Memory' | 'Diff' | 'Grading';

const STORAGE_KEY = 'archsim_projects';

interface Project {
  id: string;
  name: string;
  code: string;
  modified: string;
}

export const SimulatorPage = () => {
  const { code, setCode, cycle, waitingForInput, stats, isFinished } = useSimulatorStore();
  const { tier } = useSubscriptionStore();
  const [activeTab, setActiveTab] = useState<TabView>('Pipeline');
  const [showConsole, setShowConsole] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  
  const [projectName, setProjectName] = useState('Scratchpad');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      try {
        const projects: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const proj = projects.find(p => p.id === projectId);
        if (proj) {
          setProjectName(proj.name);
          setCode(proj.code);
          setActiveProjectId(projectId);
        } else {
          setProjectName('Unknown Project');
          setActiveProjectId(null);
        }
      } catch {
        setProjectName('Error loading project');
        setActiveProjectId(null);
      }
    } else {
      setProjectName('Scratchpad');
      setActiveProjectId(null);
    }
  }, [projectId, setProjectName, setCode, setActiveProjectId]);

  useEffect(() => {
    if (activeProjectId === projectId && projectId) {
      try {
        const projects: Project[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const projIndex = projects.findIndex(p => p.id === projectId);
        if (projIndex !== -1 && projects[projIndex].code !== code) {
          projects[projIndex].code = code;
          projects[projIndex].modified = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        }
      } catch (e) {
        console.error('Failed to save project to localStorage:', e);
      }
    }
  }, [code, activeProjectId, projectId]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <header
        className="h-12 flex items-center justify-between px-6 shrink-0 z-10"
        style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span onClick={() => navigate('/files')} className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors cursor-pointer">
            <FileCode2 size={15} className="text-brand-500" />
            Projects
          </span>
          <ChevronRight size={13} className="text-border-subtle" />
          <span className="text-white font-medium">{projectName}</span>
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
          {tier === 'free' && (
            <span className="ml-3 text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-text-muted border border-border-subtle font-medium uppercase tracking-wider flex items-center gap-1">
              Free Plan
            </span>
          )}
          {(tier === 'pro' || tier === 'institution' || tier === 'enterprise') && (
            <span className="ml-3 text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={8} /> {tier.charAt(0).toUpperCase() + tier.slice(1)}
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
          <ArchitectureSettingsPanel />
        </nav>
      </header>

      {/* CPI Upgrade Banner for Free users */}
      {isFinished && stats.cpi > 0 && (
        <UpgradeBanner cpi={stats.cpi} />
      )}

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

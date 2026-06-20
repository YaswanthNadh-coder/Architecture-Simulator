import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MipsEditor } from '../editor/MipsEditor';
import { PipelineCanvas } from '../pipeline/PipelineCanvas';
import { RegisterFile } from '../inspector/RegisterFile';
import { RightPanel } from '../inspector/RightPanel';
import { ConsolePanel } from '../console/ConsolePanel';
import { ChevronRight, Sparkles, FileCode2, Download, GraduationCap, Share2 } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { assemble } from '../../engine/mipsParser';
import { generateLogisimImage, generateVerilogMem } from '../../engine/exportUtils';
import { detectShareParams, decodeFromURL, loadFromSupabase } from '../../engine/permalinkEncoder';
import { TutorialSystem } from './TutorialSystem';
import { ShareDialog } from './ShareDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { UpgradeBanner } from '../monetization/UpgradeBanner';

// Views
import { DatapathView } from './DatapathView';
import { TimingView } from './TimingView';
import { MemoryView } from './MemoryView';
import { DiffView } from './DiffView';

import { CacheView } from './CacheView';
import { BranchPredictionView } from './BranchPredictionView';
import { ArchitectureSettingsPanel } from '../settings/ArchitectureSettingsPanel';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

type TabView = 'Pipeline' | 'Datapath' | 'Timing' | 'Memory' | 'Cache' | 'Diff' | 'Branching';

const STORAGE_KEY = 'archsim_projects';

interface Project {
  id: string;
  name: string;
  code: string;
  modified: string;
}

export const SimulatorPage = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  const {
    code, setCode, cycle, waitingForInput, stats, isFinished,
    setForwardingEnabled, setBranchPrediction, setISA, assemble: runAssemble
  } = useSimulatorStore();
  const { tier } = useSubscriptionStore();
  const [activeTab, setActiveTab] = useState<TabView>('Pipeline');
  const [showConsole, setShowConsole] = useState(true);
  const { showHelp, setShowHelp } = useKeyboardShortcuts((tab) => setActiveTab(tab));
  const navigate = useNavigate();
  
  const [projectName, setProjectName] = useState('Scratchpad');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleExport = (format: 'logisim' | 'verilog') => {
    const result = assemble(code);
    if (result.errors.length > 0) {
      alert('Fix assembly errors before exporting.');
      return;
    }
    let content = '';
    let filename = '';
    if (format === 'logisim') {
      content = generateLogisimImage(result.instructions, result.dataSegment);
      filename = 'mem.txt';
    } else {
      content = generateVerilogMem(result.instructions, result.dataSegment);
      filename = 'mem.v';
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  useEffect(() => {
    // 1. Check for share links
    const shareParams = detectShareParams(searchParams);
    
    if (shareParams.type === 'code') {
      const decoded = decodeFromURL(shareParams.value);
      if (decoded) {
        setProjectName('Shared Program (URL)');
        setCode(decoded.code);
        if (decoded.settings?.forwarding !== undefined) setForwardingEnabled(decoded.settings.forwarding);
        if (decoded.settings?.branchPrediction) setBranchPrediction(decoded.settings.branchPrediction as 'always-taken' | 'not-taken');
        if (decoded.settings?.isa) setISA(decoded.settings.isa);
        setTimeout(() => runAssemble(), 100);
      }
      return;
    }
    
    if (shareParams.type === 'share') {
      loadFromSupabase(shareParams.value).then(program => {
        if (program) {
          setProjectName(program.title || `Shared by ${program.authorName || 'Unknown'}`);
          setCode(program.code);
          if (program.settings?.forwarding !== undefined) setForwardingEnabled(program.settings.forwarding);
          if (program.settings?.branchPrediction) setBranchPrediction(program.settings.branchPrediction as 'always-taken' | 'not-taken');
          if (program.settings?.isa) setISA(program.settings.isa);
          setTimeout(() => runAssemble(), 100);
        } else {
          setProjectName('Shared Program (Not Found)');
        }
      });
      return;
    }

    // 2. Load regular project
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
  }, [projectId, searchParams, setProjectName, setCode, setActiveProjectId, setForwardingEnabled, setBranchPrediction, setISA, runAssemble]);

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

        {/* Navigation actions */}
        <nav className="flex items-center gap-1">
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

          {/* Share Button */}
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 transition-all"
          >
            <Share2 size={13} /> Share
          </button>
          
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button
            onClick={() => navigate('/learn')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <GraduationCap size={13} /> Tutorial
          </button>

          {/* Export Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Download size={13} /> Export
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-bg-panel border border-border-subtle rounded-lg shadow-xl z-50 overflow-hidden py-1">
                  <button
                    onClick={() => handleExport('logisim')}
                    className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-brand-500/10 hover:text-brand-400"
                  >
                    Logisim Image (.txt)
                  </button>
                  <button
                    onClick={() => handleExport('verilog')}
                    className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-brand-500/10 hover:text-brand-400"
                  >
                    Verilog Mem (.v)
                  </button>
                </div>
              </>
            )}
          </div>
          
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
        <div className="flex-1 flex flex-col min-w-0 bg-bg-surface">
          {/* View Tabs Bar (Moved from header to avoid clutter) */}
          <div className="h-10 border-b border-border-subtle flex items-center px-6 shrink-0 bg-bg-surface">
            <div className="flex items-center gap-1">
              {(['Pipeline', 'Datapath', 'Timing', 'Memory', 'Cache', 'Diff', 'Branching'] as TabView[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                    activeTab === tab
                      ? 'bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)] font-bold'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visual View */}
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${activeTab === 'Pipeline' ? 'pipeline-bg' : 'bg-bg-base'}`}>
            {activeTab === 'Pipeline' && <PipelineCanvas />}
            {activeTab === 'Datapath' && <DatapathView />}
            {activeTab === 'Timing' && <TimingView />}
            {activeTab === 'Memory' && <MemoryView />}
            {activeTab === 'Cache' && <CacheView />}
            {activeTab === 'Diff' && <DiffView />}

            {activeTab === 'Branching' && <BranchPredictionView />}
          </div>

          {/* Lower Register File / Execution Controls panel */}
          <div className="h-[220px] shrink-0">
            <RegisterFile />
          </div>
        </div>

        {/* Right panel */}
        <RightPanel />
      </div>

      {/* Shortcuts Help Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 bg-bg-surface border border-border-subtle rounded-xl p-4 shadow-2xl z-50 w-72"
          >
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded text-[10px]">?</span>
                Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-text-muted hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Playback</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Step forward</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">Space</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Toggle auto-play</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">Shift+Space</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Step backward</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">Ctrl+Z</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Reset</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">R</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Assemble</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">Ctrl+Enter</span>
              </div>
              
              <div className="text-[10px] text-text-muted uppercase tracking-wider mt-3 mb-1 font-bold">Views</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-main">Switch Tabs</span>
                <span className="font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">1-7</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-text-muted text-center italic">
              Shortcuts are disabled while typing in the editor.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TutorialSystem />
      {showShareDialog && <ShareDialog onClose={() => setShowShareDialog(false)} />}
    </div>
  );
};

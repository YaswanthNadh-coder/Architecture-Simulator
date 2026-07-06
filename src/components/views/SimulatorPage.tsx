import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MipsEditor } from '../editor/MipsEditor';
import { PipelineCanvas } from '../pipeline/PipelineCanvas';
import { RegisterFile } from '../inspector/RegisterFile';
import { RightPanel } from '../inspector/RightPanel';
import { ConsolePanel } from '../console/ConsolePanel';
import { ChevronRight, Sparkles, FileCode2, Download, GraduationCap, Share2, ShieldAlert, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { assemble } from '../../engine/mipsParser';
import { generateLogisimImage, generateVerilogMem } from '../../engine/exportUtils';
import { detectShareParams, decodeFromURL, loadFromSupabase } from '../../engine/permalinkEncoder';
import { TutorialSystem } from './TutorialSystem';
import { ShareDialog } from './ShareDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { UpgradeBanner } from '../monetization/UpgradeBanner';
import { localProjectService } from '../../services/localProjectService';
import { assignmentService } from '../../services/courseService';
import { submissionService } from '../../services/submissionService';

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

// Project loading/saving uses Supabase via projectService
// (previously used localStorage with STORAGE_KEY = 'archsim_projects')

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

  // Assignment states
  const assignmentId = searchParams.get('assignment');
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'grading' | 'success' | 'error'>('idle');
  const [gradeReport, setGradeReport] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const { setBlockedInstructions } = useSimulatorStore();

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

  // Load assignment data
  useEffect(() => {
    if (assignmentId) {
      assignmentService.getAssignment(assignmentId).then((assign) => {
        if (assign) {
          setActiveAssignment(assign);
          setProjectName(assign.title);
          setBlockedInstructions(assign.blocked_instructions || []);
          // Load starter code if editor has no code or placeholder code
          if (!code || code.trim() === '' || code.includes('# Write your MIPS code here')) {
            setCode(assign.starter_code || '');
          }
        }
      }).catch((e) => {
        console.error('Failed to load assignment details:', e);
      });
    }
  }, [assignmentId, setBlockedInstructions, setCode]);

  // Load remaining attempt details when submitting
  useEffect(() => {
    if (assignmentId && isSubmitting) {
      submissionService.getMySubmissions(assignmentId).then(({ data }) => {
        if (data) {
          setAttemptsCount(data.length);
        }
      });
    }
  }, [assignmentId, isSubmitting]);

  const handleSubmitConfirm = async () => {
    if (!activeAssignment) return;
    setSubmitStatus('submitting');
    
    // Check if the current editor code has compile errors
    const result = assemble(code);
    const hasErrors = result.errors.some(e => e.severity === 'error');
    if (hasErrors) {
      setSubmitStatus('error');
      setSubmitError('Your code has assembly errors. Please fix all errors before submitting.');
      return;
    }

    try {
      const { submissionId, error } = await submissionService.submit({
        assignmentId: activeAssignment.id,
        courseId: activeAssignment.course_id,
        code: code,
        dueAt: activeAssignment.due_at,
      });

      if (error || !submissionId) {
        setSubmitStatus('error');
        setSubmitError(error || 'Failed to initialize grading session.');
        return;
      }

      setSubmitStatus('grading');
      
      // Start polling
      const cleanup = submissionService.pollGrade(submissionId, (status, report) => {
        if (status === 'graded') {
          setSubmitStatus('success');
          setGradeReport(report);
          cleanup();
        } else if (status === 'error') {
          setSubmitStatus('error');
          setSubmitError(report?.error || 'Grading run encountered an internal execution error.');
          cleanup();
        }
      });
    } catch (e: any) {
      setSubmitStatus('error');
      setSubmitError(e.message || 'Network error occurred during submission.');
    }
  };

  const isAttemptsExceeded = activeAssignment?.max_attempts && attemptsCount >= activeAssignment.max_attempts;

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

    // 2. Load regular project from Supabase
    if (projectId) {
      localProjectService.getById(projectId).then(({ data: proj }) => {
        if (proj) {
          setProjectName(proj.name);
          setCode(proj.code);
          setActiveProjectId(projectId);
        } else {
          setProjectName('Unknown Project');
          setActiveProjectId(null);
        }
      }).catch(() => {
        setProjectName('Error loading project');
        setActiveProjectId(null);
      });
    } else {
      setProjectName('Scratchpad');
      setActiveProjectId(null);
    }
  }, [projectId, searchParams, setProjectName, setCode, setActiveProjectId, setForwardingEnabled, setBranchPrediction, setISA, runAssemble]);

  // Auto-save project code to Supabase (debounced by React's batching)
  useEffect(() => {
    if (activeProjectId === projectId && projectId) {
      // Use a debounce timer to avoid saving on every keystroke
      const timer = setTimeout(() => {
        localProjectService.update(projectId, { code }).catch((e) => {
          console.error('Failed to save project:', e);
        });
      }, 1000);
      return () => clearTimeout(timer);
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

          {activeAssignment && (
            <>
              <div className="w-px h-4 bg-border-subtle mx-1" />
              <button
                onClick={() => {
                  setSubmitStatus('idle');
                  setGradeReport(null);
                  setSubmitError(null);
                  setIsSubmitting(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all shrink-0"
              >
                <GraduationCap size={13} /> Submit Assignment
              </button>
            </>
          )}

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

      {/* Assignment Submit Modal */}
      <AnimatePresence>
        {isSubmitting && activeAssignment && (
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-bg-surface border border-border-subtle rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border-subtle bg-bg-panel flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-emerald-500" size={20} />
                  <h3 className="text-sm font-bold text-white">
                    Submit Solution — {activeAssignment.title}
                  </h3>
                </div>
                {(submitStatus !== 'submitting' && submitStatus !== 'grading') && (
                  <button 
                    onClick={() => setIsSubmitting(false)}
                    className="text-text-muted hover:text-white transition-colors text-xs font-mono px-2 py-1 rounded bg-white/5"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {submitStatus === 'idle' && (
                  <div className="space-y-4">
                    <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Assignment Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs text-text-muted font-mono">
                        <div>
                          Difficulty: <span className="text-brand-400 font-bold">{activeAssignment.difficulty}</span>
                        </div>
                        <div>
                          Attempts used: <span className="text-white font-bold">{attemptsCount}</span> / <span className="text-white font-bold">{activeAssignment.max_attempts || 'Unlimited'}</span>
                        </div>
                        <div>
                          Due Date: <span className="text-white font-bold">{activeAssignment.due_at ? new Date(activeAssignment.due_at).toLocaleString() : 'No limit'}</span>
                        </div>
                        <div>
                          Max Cycle Limit: <span className="text-white font-bold">{activeAssignment.max_cycles_limit || 'No limit'}</span>
                        </div>
                      </div>
                    </div>

                    {activeAssignment.blocked_instructions?.length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ShieldAlert size={14} /> Blocked Instructions
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAssignment.blocked_instructions.map((inst: string) => (
                            <span key={inst} className="px-2 py-0.5 bg-red-500/15 border border-red-500/20 text-red-400 font-mono text-[10px] rounded">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {activeAssignment.due_at && new Date() > new Date(activeAssignment.due_at) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 text-xs flex gap-2">
                        <AlertTriangle className="shrink-0" size={16} />
                        <div>
                          <span className="font-bold">Late Penalty Active:</span> Submitting now will incur a late penalty of <span className="font-bold">{activeAssignment.late_penalty_pct || 0}%</span>.
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-text-muted leading-relaxed">
                      Ready to grade? Your code will be assembled and simulated headlessly against all visibility-gated tests inside our cloud sandbox. Once grading completes, you will receive a score breakdown based on accuracy, style constraints, and execution cycles.
                    </div>
                  </div>
                )}

                {(submitStatus === 'submitting' || submitStatus === 'grading') && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <RefreshCw className="text-emerald-500 animate-spin" size={32} />
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {submitStatus === 'submitting' ? 'Submitting Code...' : 'Evaluating Solution...'}
                      </h4>
                      <p className="text-xs text-text-muted max-w-sm">
                        {submitStatus === 'submitting' 
                          ? 'Sending your program to secure cloud environment...'
                          : 'Running test cases headlessly on the Supabase Edge Function sandbox. This normally takes 3-5 seconds.'}
                      </p>
                    </div>
                  </div>
                )}

                {submitStatus === 'success' && gradeReport && (
                  <div className="space-y-6">
                    {/* Overall score banner */}
                    <div className="bg-bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-400" />
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Grading Score</span>
                      <span className="text-4xl font-black text-emerald-400 font-display">
                        {gradeReport.totalScore !== undefined ? gradeReport.totalScore : gradeReport.total_score} <span className="text-sm text-text-muted">/ 100</span>
                      </span>
                      
                      {gradeReport.latePenaltyApplied > 0 && (
                        <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold font-mono">
                          Late penalty applied: -{gradeReport.latePenaltyApplied}%
                        </span>
                      )}
                    </div>

                    {/* Rubric scores */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 text-center">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Correctness</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {gradeReport.correctnessScore ?? 0} / {activeAssignment.rubric_correctness || 60}
                        </span>
                      </div>
                      <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 text-center">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Efficiency</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {gradeReport.efficiencyScore ?? 0} / {activeAssignment.rubric_efficiency || 20}
                        </span>
                        {gradeReport.maxCyclesObserved !== undefined && (
                          <span className="text-[9px] text-text-muted block mt-1 font-mono">
                            Max cycles: {gradeReport.maxCyclesObserved}
                          </span>
                        )}
                      </div>
                      <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 text-center">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Style</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {gradeReport.styleScore ?? 0} / {activeAssignment.rubric_style || 20}
                        </span>
                      </div>
                    </div>

                    {/* Test cases list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Test Suite Results</h4>
                      <div className="bg-bg-panel border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle/50">
                        {gradeReport.testResults?.map((test: any, index: number) => (
                          <div key={index} className="px-4 py-3 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white">{test.name}</span>
                              {test.message && (
                                <p className="text-[10px] text-text-muted font-mono leading-tight">{test.message}</p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${
                              test.passed 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {test.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto text-red-500">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Grading Run Error</h4>
                      <p className="text-xs text-red-400 font-mono leading-relaxed bg-black/30 p-3 rounded-lg text-left overflow-x-auto whitespace-pre-wrap max-h-40">
                        {submitError}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border-subtle bg-bg-panel flex justify-end gap-3 shrink-0">
                {submitStatus === 'idle' && (
                  <>
                    <button
                      onClick={() => setIsSubmitting(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitConfirm}
                      disabled={isAttemptsExceeded}
                      className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-all flex items-center gap-1.5 ${
                        isAttemptsExceeded
                          ? 'bg-neutral-700 cursor-not-allowed opacity-50'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle2 size={13} /> Confirm Submission
                    </button>
                  </>
                )}

                {submitStatus === 'success' && (
                  <button
                    onClick={() => setIsSubmitting(false)}
                    className="px-6 py-2 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20 transition-colors"
                  >
                    Close Window
                  </button>
                )}

                {submitStatus === 'error' && (
                  <>
                    <button
                      onClick={() => setIsSubmitting(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setSubmitStatus('idle');
                        setSubmitError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-400 text-white transition-colors"
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TutorialSystem />
      {showShareDialog && <ShareDialog onClose={() => setShowShareDialog(false)} />}
    </div>
  );
};

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ASSIGNMENTS } from '../../engine/assignmentProfile';
import { AutoGrader, type GradingReport } from '../../engine/AutoGrader';
import { PlagiarismDetector, type PlagiarismReport } from '../../engine/PlagiarismDetector';
import {
  CheckCircle2, XCircle, AlertTriangle, Play, ShieldAlert, Cpu,
  ArrowLeft, Upload, FileCode2, Trash2, Download, ChevronDown, ChevronRight, Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssignmentStore } from '../../store/assignmentStore';
import { useAuthStore } from '../../store/authStore';
import { AssignmentBuilder } from './AssignmentBuilder';
import { useEffect } from 'react';

interface BatchEntry {
  filename: string;
  code: string;
  report: GradingReport | null;
  isGrading: boolean;
}

export const GradingPage = () => {
  const navigate = useNavigate();
  const [selectedAssignment, setSelectedAssignment] = useState(ASSIGNMENTS[0].id);

  // Single-file mode
  const [singleCode, setSingleCode] = useState('');
  const [singleReport, setSingleReport] = useState<GradingReport | null>(null);
  const [isGradingSingle, setIsGradingSingle] = useState(false);

  // Batch mode
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [isBatchGrading, setIsBatchGrading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Plagiarism
  const [compareCodeA, setCompareCodeA] = useState('');
  const [compareCodeB, setCompareCodeB] = useState('');
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReport | null>(null);

  // Active tab
  const [activeSection, setActiveSection] = useState<'single' | 'batch' | 'plagiarism' | 'builder'>('single');
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  const { profile } = useAuthStore();
  const { 
    customAssignments, addAssignment, updateAssignment, deleteAssignment, duplicateAssignment, 
    syncing, lastSyncError, loadFromSupabase 
  } = useAssignmentStore();
  
  useEffect(() => {
    if (profile) {
      loadFromSupabase();
    }
  }, [profile, loadFromSupabase]);

  const allAssignments = [...ASSIGNMENTS, ...customAssignments];
  const assignment = allAssignments.find(a => a.id === selectedAssignment) || allAssignments[0];

  const handleGradeSingle = () => {
    if (!singleCode.trim()) return;
    setIsGradingSingle(true);
    setTimeout(() => {
      const result = AutoGrader.grade(singleCode, assignment, true);
      setSingleReport(result);
      setIsGradingSingle(false);
    }, 400);
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.s') || f.name.endsWith('.asm') || f.name.endsWith('.txt')
    );
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const code = ev.target?.result as string;
        setBatchEntries(prev => [...prev, { filename: file.name, code, report: null, isGrading: false }]);
      };
      reader.readAsText(file);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const code = ev.target?.result as string;
        setBatchEntries(prev => [...prev, { filename: file.name, code, report: null, isGrading: false }]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleBatchGrade = async () => {
    setIsBatchGrading(true);
    const updated = [...batchEntries];
    for (let i = 0; i < updated.length; i++) {
      updated[i].isGrading = true;
      setBatchEntries([...updated]);
      await new Promise(r => setTimeout(r, 100));
      updated[i].report = AutoGrader.grade(updated[i].code, assignment, true);
      updated[i].isGrading = false;
      setBatchEntries([...updated]);
    }
    setIsBatchGrading(false);
  };

  const removeBatchEntry = (filename: string) => {
    setBatchEntries(prev => prev.filter(e => e.filename !== filename));
  };

  const exportCSV = () => {
    const header = 'Filename,Score,Max Score,Compiled,Cycles,Stalls,CPI\n';
    const rows = batchEntries.map(e => {
      const r = e.report;
      if (!r) return `${e.filename},—,100,—,—,—,—`;
      return `${e.filename},${r.totalScore},${r.maxScore},${r.compileError ? 'No' : 'Yes'},${r.cycles},${r.stalls},${r.cpi.toFixed(2)}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading_${assignment.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCheckPlagiarism = () => {
    const result = PlagiarismDetector.compare(compareCodeA, compareCodeB);
    setPlagiarismReport(result);
  };

  return (
    <div className="flex-1 overflow-auto bg-bg-base">
      {/* Header */}
      <header
        className="sticky top-0 z-10 h-14 flex items-center justify-between px-8 border-b border-border-subtle"
        style={{ background: 'var(--color-bg-surface)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="w-px h-6 bg-border-subtle" />
          <h1 className="text-white font-bold text-lg">Professor Tools</h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Assignment:</label>
          <select
            value={selectedAssignment}
            onChange={(e) => {
              setSelectedAssignment(e.target.value);
              setSingleReport(null);
              setBatchEntries(prev => prev.map(entry => ({ ...entry, report: null })));
            }}
            className="bg-bg-panel border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 transition-colors min-w-[240px]"
          >
            <optgroup label="Built-in Assignments">
              {ASSIGNMENTS.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </optgroup>
            {customAssignments.length > 0 && (
              <optgroup label="My Custom Library">
                {customAssignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title} (Custom)</option>
                ))}
              </optgroup>
            )}
          </select>

          {profile && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {syncing ? (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" /> Syncing...</span>
              ) : lastSyncError ? (
                <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={12} /> Sync Error</span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> Synced</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Assignment Info Bar */}
      <div className="px-8 py-4 border-b border-border-subtle bg-bg-surface/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-white font-bold text-sm">{assignment.title}</h2>
              <p className="text-text-muted text-xs mt-0.5">{assignment.description}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
              assignment.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-400' :
              assignment.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {assignment.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 border-r border-border-subtle pr-6">
              <RubricBadge label="Correctness" weight={assignment.rubric.correctness} />
              <RubricBadge label="Efficiency" weight={assignment.rubric.efficiency} />
              <RubricBadge label="Style" weight={assignment.rubric.style} />
            </div>

            <div className="flex items-center gap-2">
              {customAssignments.some(a => a.id === selectedAssignment) ? (
                <>
                  <button
                    onClick={() => {
                      setEditingAssignmentId(selectedAssignment);
                      setActiveSection('builder');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 transition-all cursor-pointer"
                  >
                    <Wrench size={12} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this custom assignment?')) {
                        deleteAssignment(selectedAssignment);
                        setSelectedAssignment(ASSIGNMENTS[0].id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              ) : null}

              <button
                onClick={() => {
                  duplicateAssignment(selectedAssignment);
                  alert('Assignment duplicated! You can find it under "My Custom Library" in the dropdown menu at the top.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-text-muted hover:text-white bg-white/5 border border-border-subtle hover:border-text-muted transition-all cursor-pointer"
              >
                <Upload size={12} className="rotate-180" /> Duplicate / Customize
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="px-8 border-b border-border-subtle bg-bg-surface/30">
        <div className="max-w-7xl mx-auto flex gap-1">
          {([
            { id: 'single', label: 'Single File', icon: <FileCode2 size={14} /> },
            { id: 'batch', label: 'Batch Grading', icon: <Upload size={14} /> },
            { id: 'plagiarism', label: 'Plagiarism Detector', icon: <ShieldAlert size={14} /> },
            { id: 'builder', label: 'Assignment Builder', icon: <Wrench size={14} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                if (tab.id === 'builder') {
                  setEditingAssignmentId(null);
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                activeSection === tab.id
                  ? 'text-brand-400 border-brand-500'
                  : 'text-text-muted border-transparent hover:text-white hover:border-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeSection === 'single' && (
            <motion.div key="single" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SingleFileGrader
                code={singleCode}
                setCode={setSingleCode}
                report={singleReport}
                isGrading={isGradingSingle}
                onGrade={handleGradeSingle}
                assignment={assignment}
              />
            </motion.div>
          )}

          {activeSection === 'batch' && (
            <motion.div key="batch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <BatchGrader
                entries={batchEntries}
                isBatchGrading={isBatchGrading}
                expandedEntry={expandedEntry}
                setExpandedEntry={setExpandedEntry}
                onFileDrop={handleFileDrop}
                onFileSelect={handleFileSelect}
                onGradeAll={handleBatchGrade}
                onRemoveEntry={removeBatchEntry}
                onExportCSV={exportCSV}
              />
            </motion.div>
          )}

          {activeSection === 'plagiarism' && (
            <motion.div key="plagiarism" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PlagiarismSection
                codeA={compareCodeA}
                setCodeA={setCompareCodeA}
                codeB={compareCodeB}
                setCodeB={setCompareCodeB}
                report={plagiarismReport}
                onCompare={handleCheckPlagiarism}
                onReset={() => setPlagiarismReport(null)}
              />
            </motion.div>
          )}

          {activeSection === 'builder' && (
            <motion.div key="builder" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AssignmentBuilder 
                initial={editingAssignmentId ? allAssignments.find(a => a.id === editingAssignmentId) : undefined}
                onSave={(newAssig) => {
                  const exists = customAssignments.some(a => a.id === newAssig.id);
                  if (exists) updateAssignment(newAssig);
                  else addAssignment(newAssig);
                  setSelectedAssignment(newAssig.id);
                  setActiveSection('single');
                  setEditingAssignmentId(null);
                }}
                onCancel={() => {
                  setActiveSection('single');
                  setEditingAssignmentId(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Single File Grader ────────────────────────────────────────── */

const SingleFileGrader = ({
  code, setCode, report, isGrading, onGrade, assignment
}: {
  code: string;
  setCode: (v: string) => void;
  report: GradingReport | null;
  isGrading: boolean;
  onGrade: () => void;
  assignment: typeof ASSIGNMENTS[number];
}) => (
  <div className="grid grid-cols-2 gap-8">
    {/* Left: Code Input */}
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Student Submission</label>
        <button
          onClick={() => setCode(assignment.starterCode)}
          className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          Load Starter Code
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 min-h-[420px] bg-bg-surface border border-border-subtle rounded-xl p-4 text-[12px] text-text-main font-mono outline-none focus:border-brand-500 transition-colors resize-none custom-scrollbar"
        placeholder="Paste student's MIPS assembly code here..."
        spellCheck={false}
      />
      <button
        onClick={onGrade}
        disabled={isGrading || !code.trim()}
        className="mt-4 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGrading ? (
          <span className="animate-pulse">Evaluating...</span>
        ) : (
          <><Play size={14} fill="currentColor" /> Run Auto-Grader</>
        )}
      </button>
    </div>

    {/* Right: Results */}
    <div>
      <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold block mb-3">Results</label>
      {!report ? (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-12 text-center h-[420px] flex flex-col items-center justify-center">
          <Cpu size={40} className="text-text-muted/20 mb-4" />
          <p className="text-text-muted text-sm">Paste code and run the auto-grader to see results.</p>
        </div>
      ) : (
        <GradeResultDisplay report={report} />
      )}
    </div>
  </div>
);

/* ── Batch Grader ──────────────────────────────────────────────── */

const BatchGrader = ({
  entries, isBatchGrading, expandedEntry, setExpandedEntry,
  onFileDrop, onFileSelect, onGradeAll, onRemoveEntry, onExportCSV
}: {
  entries: BatchEntry[];
  isBatchGrading: boolean;
  expandedEntry: string | null;
  setExpandedEntry: (v: string | null) => void;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGradeAll: () => void;
  onRemoveEntry: (filename: string) => void;
  onExportCSV: () => void;
}) => (
  <div>
    {/* Dropzone */}
    <div
      onDrop={onFileDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-border-subtle rounded-2xl p-10 text-center hover:border-brand-500/50 hover:bg-brand-500/5 transition-all cursor-pointer group mb-6"
    >
      <Upload size={36} className="mx-auto text-text-muted/30 mb-3 group-hover:text-brand-400 transition-colors" />
      <p className="text-text-muted text-sm mb-2">Drag & drop <code className="text-brand-400">.s</code> / <code className="text-brand-400">.asm</code> files here</p>
      <p className="text-text-muted/50 text-xs mb-4">or</p>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-400 text-xs font-bold rounded-lg border border-brand-500/20 hover:bg-brand-500/20 transition-colors cursor-pointer">
        <FileCode2 size={14} /> Browse Files
        <input type="file" multiple accept=".s,.asm,.txt" onChange={onFileSelect} className="hidden" />
      </label>
    </div>

    {entries.length > 0 && (
      <>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-text-muted font-medium">{entries.length} file{entries.length !== 1 ? 's' : ''} loaded</span>
          <div className="flex items-center gap-3">
            {entries.some(e => e.report) && (
              <button
                onClick={onExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors font-medium"
              >
                <Download size={13} /> Export CSV
              </button>
            )}
            <button
              onClick={onGradeAll}
              disabled={isBatchGrading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            >
              {isBatchGrading ? <span className="animate-pulse">Grading...</span> : <><Play size={13} fill="currentColor" /> Grade All</>}
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] text-text-muted uppercase tracking-wider font-bold border-b border-border-subtle bg-bg-panel/50">
            <span>Filename</span>
            <span className="text-center">Score</span>
            <span className="text-center">Compiled</span>
            <span className="text-center">Cycles</span>
            <span className="text-center">Stalls</span>
            <span className="text-center">CPI</span>
            <span></span>
          </div>

          {entries.map(entry => (
            <div key={entry.filename} className="border-b border-border-subtle/50 last:border-0">
              <div
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setExpandedEntry(expandedEntry === entry.filename ? null : entry.filename)}
              >
                <div className="flex items-center gap-2">
                  {entry.report ? (
                    expandedEntry === entry.filename ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />
                  ) : (
                    <FileCode2 size={14} className="text-text-muted" />
                  )}
                  <span className="text-xs text-white font-medium truncate">{entry.filename}</span>
                  {entry.isGrading && <div className="w-3 h-3 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />}
                </div>
                <span className={`text-sm font-mono font-black text-center ${
                  !entry.report ? 'text-text-muted' :
                  entry.report.totalScore >= 80 ? 'text-emerald-400' :
                  entry.report.totalScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {entry.report ? entry.report.totalScore : '—'}
                </span>
                <div className="flex justify-center">
                  {entry.report ? (
                    entry.report.compileError
                      ? <XCircle size={16} className="text-red-400" />
                      : <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : <span className="text-text-muted text-xs">—</span>}
                </div>
                <span className="text-xs text-text-main text-center font-mono">{entry.report ? entry.report.cycles : '—'}</span>
                <span className={`text-xs text-center font-mono ${entry.report && entry.report.stalls > 0 ? 'text-yellow-400' : 'text-text-main'}`}>
                  {entry.report ? entry.report.stalls : '—'}
                </span>
                <span className="text-xs text-text-main text-center font-mono">{entry.report ? entry.report.cpi.toFixed(2) : '—'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveEntry(entry.filename); }}
                  className="p-1 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded Test Case Details */}
              <AnimatePresence>
                {expandedEntry === entry.filename && entry.report && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 py-4 bg-bg-panel/30 border-t border-border-subtle/30">
                      <div className="space-y-2">
                        {entry.report.testResults.map(tr => (
                          <div key={tr.testCaseId} className="flex items-start gap-3 py-1">
                            {tr.passed ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />}
                            <div>
                              <span className="text-xs text-white font-medium">{tr.name}</span>
                              <span className={`ml-2 text-[10px] font-mono ${tr.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tr.score}/{tr.maxScore}
                              </span>
                              {tr.feedback.map((fb, i) => (
                                <p key={i} className="text-[10px] text-text-muted">{fb}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

/* ── Plagiarism Detector ───────────────────────────────────────── */

const PlagiarismSection = ({
  codeA, setCodeA, codeB, setCodeB, report, onCompare, onReset
}: {
  codeA: string;
  setCodeA: (v: string) => void;
  codeB: string;
  setCodeB: (v: string) => void;
  report: PlagiarismReport | null;
  onCompare: () => void;
  onReset: () => void;
}) => (
  <div>
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
        <ShieldAlert size={20} className="text-brand-500" />
        Structural Plagiarism Detector
      </h2>
      <p className="text-text-muted text-xs">
        Compare two MIPS submissions. The detector strips registers, immediate values, and labels to compare pure opcode-sequence similarity using LCS.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-6 mb-6">
      <div>
        <label className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block font-bold">Submission A</label>
        <textarea
          value={codeA}
          onChange={(e) => setCodeA(e.target.value)}
          className="w-full h-56 bg-bg-surface border border-border-subtle rounded-xl p-4 text-[11px] text-text-main font-mono outline-none focus:border-brand-500 transition-colors resize-none"
          placeholder="Paste first student's code..."
          spellCheck={false}
        />
      </div>
      <div>
        <label className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block font-bold">Submission B</label>
        <textarea
          value={codeB}
          onChange={(e) => setCodeB(e.target.value)}
          className="w-full h-56 bg-bg-surface border border-border-subtle rounded-xl p-4 text-[11px] text-text-main font-mono outline-none focus:border-brand-500 transition-colors resize-none"
          placeholder="Paste second student's code..."
          spellCheck={false}
        />
      </div>
    </div>

    {!report ? (
      <button
        onClick={onCompare}
        disabled={!codeA.trim() || !codeB.trim()}
        className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      >
        Run Structural Comparison
      </button>
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 rounded-2xl border ${report.isSuspicious ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex items-center gap-8`}
      >
        {/* Score Ring */}
        <div className="relative shrink-0">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-bg-panel" />
            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="289" strokeDashoffset={289 - (289 * report.similarityScore) / 100} className={report.isSuspicious ? 'text-red-500' : 'text-emerald-500'} strokeLinecap="round" />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-3xl font-black ${report.isSuspicious ? 'text-red-400' : 'text-emerald-400'}`}>
            {report.similarityScore}%
          </span>
        </div>

        <div className="flex-1">
          <h3 className={`font-bold text-lg mb-2 ${report.isSuspicious ? 'text-red-300' : 'text-emerald-300'}`}>
            {report.isSuspicious ? 'Suspicious Similarity' : 'Looks Original'}
          </h3>
          {report.warnings.map((w, i) => (
            <p key={i} className={`text-sm mb-1 ${report.isSuspicious ? 'text-red-200/80' : 'text-text-main'}`}>
              {w}
            </p>
          ))}
          {report.warnings.length === 0 && (
            <p className="text-sm text-text-main">Low structural similarity. Submissions appear independently authored.</p>
          )}
          <button
            onClick={onReset}
            className="mt-4 text-[10px] text-text-muted hover:text-white uppercase tracking-wider font-bold transition-colors"
          >
            Reset Comparison
          </button>
        </div>
      </motion.div>
    )}
  </div>
);

/* ── Shared Components ─────────────────────────────────────────── */

const GradeResultDisplay = ({ report }: { report: GradingReport }) => (
  <div className="space-y-4">
    {/* Score Card */}
    <div className={`p-5 rounded-2xl border flex items-center justify-between ${
      report.totalScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' :
      report.totalScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' :
      'bg-red-500/10 border-red-500/30'
    }`}>
      <div>
        <h3 className="text-white font-bold text-base">Final Grade</h3>
        <p className="text-text-muted text-[10px]">Normalized to 100 points</p>
      </div>
      <div className="text-right">
        <span className={`text-4xl font-black ${
          report.totalScore >= 80 ? 'text-emerald-400' :
          report.totalScore >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {report.totalScore}
        </span>
        <span className="text-text-muted text-lg font-bold">/100</span>
      </div>
    </div>

    {report.compileError && (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-400" />
        <span className="text-red-300 text-xs font-medium">Compilation Failed.</span>
      </div>
    )}

    {/* Test Cases */}
    <div className="space-y-2">
      <h4 className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Test Cases</h4>
      {report.testResults.map(tr => (
        <div key={tr.testCaseId} className="bg-bg-surface border border-border-subtle rounded-xl p-3">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              {tr.passed ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
              <span className="text-xs font-bold text-white">{tr.name}</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${tr.passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {tr.score}/{tr.maxScore}
            </span>
          </div>
          <ul className="list-disc list-inside text-[10px] text-text-muted ml-5">
            {tr.feedback.map((fb, i) => <li key={i}>{fb}</li>)}
          </ul>
        </div>
      ))}
    </div>

    {/* Metrics */}
    <div className="grid grid-cols-3 gap-3">
      <MetricCard label="Cycles" value={report.cycles} />
      <MetricCard label="Stalls" value={report.stalls} highlight={report.stalls > 0} />
      <MetricCard label="CPI" value={Number(report.cpi.toFixed(2))} />
    </div>
  </div>
);

const RubricBadge = ({ label, weight }: { label: string; weight: number }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
    <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">{weight}%</span>
  </div>
);

const MetricCard = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 text-center">
    <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5 font-bold">{label}</span>
    <span className={`text-xl font-black font-mono ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
  </div>
);

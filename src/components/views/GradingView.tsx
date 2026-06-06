import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { ASSIGNMENTS } from '../../engine/assignmentProfile';
import { AutoGrader, type GradingReport } from '../../engine/AutoGrader';
import { PlagiarismDetector, type PlagiarismReport } from '../../engine/PlagiarismDetector';
import { CheckCircle2, XCircle, AlertTriangle, Play, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GradingView = () => {
  const { code, setCode } = useSimulatorStore();
  const [selectedAssignment, setSelectedAssignment] = useState(ASSIGNMENTS[0].id);
  
  const [report, setReport] = useState<GradingReport | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  // Plagiarism states
  const [compareCode, setCompareCode] = useState('');
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReport | null>(null);

  const assignment = ASSIGNMENTS.find(a => a.id === selectedAssignment)!;

  const handleGrade = () => {
    setIsGrading(true);
    // Slight delay to allow UI to show loading state
    setTimeout(() => {
      const result = AutoGrader.grade(code, assignment, true); // Assuming forwarding enabled
      setReport(result);
      setIsGrading(false);
    }, 400);
  };

  const handleCheckPlagiarism = () => {
    const result = PlagiarismDetector.compare(code, compareCode);
    setPlagiarismReport(result);
  };

  const loadStarterCode = () => {
    if (window.confirm("Overwrite current editor code with starter code?")) {
      setCode(assignment.starterCode);
    }
  };

  return (
    <div className="flex-1 h-full bg-bg-base flex overflow-hidden">
      
      {/* Left Column: Assignment Selection & Rubric */}
      <div className="w-[380px] border-r border-border-subtle bg-bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-border-subtle">
          <h2 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-4">Professor Tools</h2>
          <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Select Assignment</label>
          <select 
            value={selectedAssignment}
            onChange={(e) => {
              setSelectedAssignment(e.target.value);
              setReport(null);
            }}
            className="w-full bg-bg-panel border border-border-subtle rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition-colors"
          >
            {ASSIGNMENTS.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-white font-bold text-sm mb-1">{assignment.title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
              assignment.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-400' :
              assignment.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {assignment.difficulty}
            </span>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-6">
            {assignment.description}
          </p>

          <button 
            onClick={loadStarterCode}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors border border-border-subtle mb-6"
          >
            Load Starter Code
          </button>

          <div className="mb-6">
            <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-3 font-bold">Grading Rubric</h4>
            <div className="bg-bg-panel rounded-lg border border-border-subtle p-3 flex flex-col gap-2">
              <RubricRow label="Correctness (Test Cases)" weight={assignment.rubric.correctness} />
              <RubricRow label="Efficiency (Cycles/Stalls)" weight={assignment.rubric.efficiency} />
              <RubricRow label="Code Style" weight={assignment.rubric.style} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-3 font-bold">Test Cases ({assignment.testCases.length})</h4>
            <div className="flex flex-col gap-2">
              {assignment.testCases.map(tc => (
                <div key={tc.id} className="bg-bg-panel rounded-lg border border-border-subtle p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-white">{tc.name}</span>
                    <span className="text-[10px] text-brand-400 font-mono">{tc.weight} pts</span>
                  </div>
                  <p className="text-[10px] text-text-muted">{tc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-border-subtle bg-bg-panel">
          <button 
            onClick={handleGrade}
            disabled={isGrading}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
          >
            {isGrading ? (
              <span className="animate-pulse">Grading...</span>
            ) : (
              <><Play size={14} fill="currentColor" /> Run Auto-Grader</>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Grading Results & Plagiarism */}
      <div className="flex-1 flex flex-col bg-bg-base overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto w-full">
          
          {/* Grading Report */}
          <section className="mb-12">
            <h2 className="text-xl font-black text-white mb-6">Auto-Grader Results</h2>
            
            {!report ? (
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 text-center">
                <Cpu size={32} className="mx-auto text-text-muted/30 mb-3" />
                <p className="text-text-muted text-sm">Run the auto-grader to evaluate the current code.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <div className={`p-6 rounded-2xl border ${report.totalScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : report.totalScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'} flex items-center justify-between`}>
                    <div>
                      <h3 className="text-white font-bold text-lg">Final Grade</h3>
                      <p className="text-text-muted text-xs mt-1">Normalized to 100 points</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-5xl font-black ${report.totalScore >= 80 ? 'text-emerald-400' : report.totalScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {report.totalScore}
                      </span>
                      <span className="text-text-muted text-lg font-bold">/100</span>
                    </div>
                  </div>

                  {report.compileError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                      <AlertTriangle size={18} className="text-red-400" />
                      <span className="text-red-300 text-sm font-medium">Compilation Failed. Cannot grade execution.</span>
                    </div>
                  )}

                  {/* Test Cases */}
                  <div className="space-y-3">
                    <h4 className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2">Test Case Results</h4>
                    {report.testResults.map(tr => (
                      <div key={tr.testCaseId} className="bg-bg-surface border border-border-subtle rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {tr.passed ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                            <span className="text-sm font-bold text-white">{tr.name}</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${tr.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tr.score} / {tr.maxScore}
                          </span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-text-muted ml-6">
                          {tr.feedback.map((fb, i) => <li key={i}>{fb}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                     <MetricCard label="Cycles" value={report.cycles} />
                     <MetricCard label="Stalls" value={report.stalls} highlight={report.stalls > 0} />
                     <MetricCard label="CPI" value={report.cpi} />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </section>

          {/* Plagiarism Detector */}
          <section>
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <ShieldAlert size={20} className="text-brand-500" />
              Structural Plagiarism Detector
            </h2>
            <p className="text-text-muted text-xs mb-6">
              Compare the current editor code against another submission. This tool strips registers, values, and labels to compare pure AST structural similarity.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block font-bold">Compare Against (Paste Code)</label>
                <textarea 
                  value={compareCode}
                  onChange={(e) => setCompareCode(e.target.value)}
                  className="w-full h-48 bg-bg-surface border border-border-subtle rounded-xl p-3 text-[11px] text-text-main font-mono outline-none focus:border-brand-500 transition-colors resize-none"
                  placeholder="Paste student submission B here..."
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block font-bold">Report</label>
                <div className="flex-1 bg-bg-surface border border-border-subtle rounded-xl p-5 flex flex-col justify-center">
                  {!plagiarismReport ? (
                    <div className="text-center">
                      <button 
                        onClick={handleCheckPlagiarism}
                        disabled={!compareCode.trim() || !code.trim()}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Run Structural Comparison
                      </button>
                    </div>
                  ) : (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-bg-panel" />
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * plagiarismReport.similarityScore) / 100} className={plagiarismReport.isSuspicious ? 'text-red-500' : 'text-emerald-500'} />
                        </svg>
                        <span className={`absolute text-2xl font-black ${plagiarismReport.isSuspicious ? 'text-red-400' : 'text-emerald-400'}`}>
                          {plagiarismReport.similarityScore}%
                        </span>
                      </div>
                      
                      {plagiarismReport.warnings.map((w, i) => (
                        <p key={i} className={`text-xs font-medium mb-1 ${plagiarismReport.isSuspicious ? 'text-red-400' : 'text-text-main'}`}>
                          {w}
                        </p>
                      ))}

                      <button 
                        onClick={() => setPlagiarismReport(null)}
                        className="mt-4 text-[10px] text-text-muted hover:text-white uppercase tracking-wider font-bold transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

    </div>
  );
};

const RubricRow = ({ label, weight }: { label: string; weight: number }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-text-main">{label}</span>
    <span className="text-xs font-mono font-bold text-brand-400">{weight}%</span>
  </div>
);

const MetricCard = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
    <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1 font-bold">{label}</span>
    <span className={`text-2xl font-black font-mono ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
  </div>
);

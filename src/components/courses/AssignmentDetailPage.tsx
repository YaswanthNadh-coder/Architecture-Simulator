import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { courseService, assignmentService } from '../../services/courseService';
import { BatchPlagiarismChecker, type PairResult } from '../../engine/BatchPlagiarismChecker';
import {
  ArrowLeft, Users, CheckCircle2,
  XCircle, AlertTriangle, ShieldAlert,
  Clock, Check, FileCode2, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AssignmentDetailPage = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions' | 'plagiarism'>('submissions');

  // Selected Submission Modal State
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [manualScore, setManualScore] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Plagiarism state
  const [plagiarismPairs, setPlagiarismPairs] = useState<PairResult[]>([]);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(65);
  const [isScanningPlag, setIsScanningPlag] = useState(false);

  const loadData = async () => {
    if (!assignmentId || !courseId) return;
    setLoading(true);

    // Fetch assignment & course details
    const assignData = await assignmentService.getAssignment(assignmentId);
    setAssignment(assignData);

    await courseService.getCourseWithRoster(courseId);

    // Fetch submissions
    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id,
        submitted_at,
        attempt_number,
        grading_status,
        total_score,
        is_late,
        code,
        grade_report,
        manual_score,
        instructor_note,
        reviewed_at,
        student:student_id(
          id,
          full_name,
          email
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    setSubmissions(subs || []);
    setLoading(false);
  };

  useEffect(() => {
    if (assignmentId && courseId) {
      loadData();
    }
  }, [assignmentId, courseId]);

  const handleOpenSubmission = (sub: any) => {
    setSelectedSub(sub);
    setManualScore(sub.manual_score !== null ? String(sub.manual_score) : '');
    setFeedbackNote(sub.instructor_note || '');
  };

  const handleSaveOverride = async () => {
    if (!selectedSub) return;
    setIsSavingOverride(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Not authenticated.');
      setIsSavingOverride(false);
      return;
    }

    const { error } = await supabase
      .from('submissions')
      .update({
        manual_score: manualScore !== '' ? parseFloat(manualScore) : null,
        instructor_note: feedbackNote.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', selectedSub.id);

    setIsSavingOverride(false);

    if (error) {
      alert(`Error updating grade: ${error.message}`);
    } else {
      setSelectedSub(null);
      loadData();
    }
  };

  const handleRunPlagiarism = () => {
    if (submissions.length < 2) {
      alert('Need at least 2 submissions to run a plagiarism scan.');
      return;
    }
    setIsScanningPlag(true);
    setPlagiarismPairs([]);

    setTimeout(() => {
      // Map submissions for detector
      const formatted = submissions.map(sub => ({
        student_id: sub.student?.id || '',
        name: sub.student?.full_name || 'Anonymous Student',
        code: sub.code
      }));

      const results = BatchPlagiarismChecker.compareAll(formatted, plagiarismThreshold);
      setPlagiarismPairs(results);
      setIsScanningPlag(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-base">
        <div className="w-8 h-8 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-base text-center">
        <AlertTriangle size={48} className="text-text-muted/30 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Assignment Not Found</h2>
        <button onClick={() => navigate(`/courses/${courseId}`)} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl">Back to Course</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-auto custom-scrollbar">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 flex items-center justify-between px-8 border-b border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            Course Dashboard
          </button>
          <div className="w-px h-6 bg-border-subtle" />
          <h1 className="text-white font-bold text-base flex items-center gap-2">
            Grading Inbox: {assignment.title}
          </h1>
        </div>

        <div className="text-xs text-text-muted">
          {submissions.length} total submissions
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="px-8 border-b border-border-subtle bg-bg-surface/30 shrink-0">
        <div className="max-w-7xl mx-auto flex gap-1">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'submissions' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
            }`}
          >
            <Users size={14} />
            Student Submissions
          </button>
          <button
            onClick={() => setActiveTab('plagiarism')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'plagiarism' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
            }`}
          >
            <ShieldAlert size={14} />
            Plagiarism Scan
          </button>
        </div>
      </div>

      {/* Main Inbox */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* TAB 1: Submissions list */}
          {activeTab === 'submissions' && (
            <motion.div key="submissions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-16 bg-bg-surface border border-border-subtle rounded-2xl shadow-xl">
                  <Clock size={36} className="mx-auto text-text-muted/30 mb-3" />
                  <p className="text-sm text-text-muted">No student has submitted this exercise yet.</p>
                </div>
              ) : (
                <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
                  <div className="grid grid-cols-[3fr_1.2fr_1.5fr_1.2fr_1.2fr_auto] gap-4 px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle bg-bg-panel/50">
                    <span>Student</span>
                    <span className="text-center">Attempt</span>
                    <span>Submitted On</span>
                    <span className="text-center">Score</span>
                    <span className="text-center">Status</span>
                    <span></span>
                  </div>

                  {submissions.map((sub: any) => {
                    const studentName = sub.student?.full_name || 'Anonymous Student';
                    const studentEmail = sub.student?.email || '';
                    const finalScore = sub.manual_score !== null ? sub.manual_score : sub.total_score;
                    const isOverridden = sub.manual_score !== null;

                    return (
                      <div
                        key={sub.id}
                        className="grid grid-cols-[3fr_1.2fr_1.5fr_1.2fr_1.2fr_auto] gap-4 px-6 py-4 items-center border-b border-border-subtle/50 last:border-0 hover:bg-white/[0.01] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500/10 to-brand-500/20 flex items-center justify-center text-brand-400 font-black text-xs border border-brand-500/10">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white block">{studentName}</span>
                            <span className="text-[10px] text-text-muted font-mono block mt-0.5">{studentEmail}</span>
                          </div>
                        </div>

                        <span className="text-xs text-white text-center font-mono">{sub.attempt_number}</span>
                        
                        <div className="text-xs text-text-muted flex flex-col">
                          <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          <span className="text-[9px] font-mono text-text-muted/60 mt-0.5">{new Date(sub.submitted_at).toLocaleTimeString()}</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold font-mono ${
                            finalScore >= 80 ? 'text-emerald-400' :
                            finalScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {finalScore !== null ? finalScore : '—'}
                          </span>
                          {isOverridden && (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-purple-400 mt-0.5 bg-purple-500/10 px-1 rounded">override</span>
                          )}
                          {sub.is_late && (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-red-400 mt-0.5 bg-red-500/10 px-1 rounded">late</span>
                          )}
                        </div>

                        <div className="flex justify-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                            sub.grading_status === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            sub.grading_status === 'grading' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {sub.grading_status}
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenSubmission(sub)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-bold rounded-lg border border-brand-500/20 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Plagiarism checker */}
          {activeTab === 'plagiarism' && (
            <motion.div key="plagiarism" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm">Cohort Structural Plagiarism Check</h3>
                  <p className="text-xs text-text-muted mt-1">Strips registers and tags to run pure opcode & structure similarity scans across all student submissions.</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Threshold:</span>
                    <input
                      type="number"
                      min="40"
                      max="100"
                      value={plagiarismThreshold}
                      onChange={(e) => setPlagiarismThreshold(parseInt(e.target.value) || 65)}
                      className="w-14 px-2 py-1 bg-bg-panel border border-border-subtle rounded text-white text-xs text-center"
                    />
                    <span className="text-xs text-text-muted">%</span>
                  </div>

                  <button
                    onClick={handleRunPlagiarism}
                    disabled={isScanningPlag || submissions.length < 2}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/10 cursor-pointer"
                  >
                    {isScanningPlag ? 'Scanning...' : 'Run Scan'}
                  </button>
                </div>
              </div>

              {isScanningPlag && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin mb-4" />
                  <p className="text-sm text-text-muted">Performing pairwise LCS, CFG, and normalized register matching...</p>
                </div>
              )}

              {!isScanningPlag && plagiarismPairs.length === 0 && (
                <div className="text-center py-16 bg-bg-surface border border-border-subtle rounded-2xl shadow-xl">
                  <ShieldAlert size={36} className="mx-auto text-text-muted/30 mb-3" />
                  <p className="text-sm text-text-muted">No suspicious similarity pairs found matching current threshold.</p>
                </div>
              )}

              {!isScanningPlag && plagiarismPairs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Flagged Collaborations ({plagiarismPairs.length})</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {plagiarismPairs.map((pair, idx) => (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border ${
                          pair.score > 80 
                            ? 'bg-red-500/5 border-red-500/20' 
                            : 'bg-amber-500/5 border-amber-500/20'
                        } flex items-center justify-between shadow-lg`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{pair.nameA}</span>
                            <span className="text-xs text-text-muted">&amp;</span>
                            <span className="text-sm font-bold text-white">{pair.nameB}</span>
                          </div>

                          <div className="space-y-1">
                            {pair.warnings.map((w, wIdx) => (
                              <p key={wIdx} className="text-xs text-red-300 flex items-center gap-1.5">
                                <AlertTriangle size={12} className="text-red-400 shrink-0" />
                                {w}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-3xl font-black font-mono ${
                            pair.score > 80 ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {pair.score}%
                          </span>
                          <span className="text-[10px] text-text-muted block mt-0.5">Similarity Composite</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grade override detailed split-pane modal */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm overflow-hidden">
            <div className="w-full h-full max-h-[92vh] max-w-7xl bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border-subtle bg-bg-panel flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <FileCode2 size={18} className="text-brand-500" />
                  <div>
                    <h2 className="text-sm font-bold text-white">Grading Workspace — {selectedSub.student?.full_name}</h2>
                    <span className="text-[10px] text-text-muted mt-0.5 block">Attempt #{selectedSub.attempt_number} · Submitted on {new Date(selectedSub.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1 text-text-muted hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Split-Pane Content */}
              <div className="flex-1 flex min-h-0 bg-bg-base">
                {/* Left: Code Viewer */}
                <div className="flex-1 border-r border-border-subtle flex flex-col p-6 min-w-0">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2.5">Assembly Code Source</span>
                  <textarea
                    readOnly
                    value={selectedSub.code}
                    className="flex-1 bg-bg-panel border border-border-subtle rounded-xl p-4 font-mono text-[12px] text-text-main leading-relaxed outline-none resize-none custom-scrollbar"
                  />
                </div>

                {/* Right: Autograding results and Override Panel */}
                <div className="w-[420px] xl:w-[480px] shrink-0 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between bg-bg-surface/50">
                  <div className="space-y-6">
                    {/* Grade report header */}
                    <div className="flex items-center justify-between border-b border-border-subtle/50 pb-4">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Scale size={14} className="text-brand-500" /> Auto-Grader Score
                      </span>
                      
                      <div className="text-right">
                        <span className={`text-3xl font-black font-mono ${
                          selectedSub.total_score >= 80 ? 'text-emerald-400' :
                          selectedSub.total_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {selectedSub.total_score !== null ? selectedSub.total_score : '—'}
                        </span>
                        <span className="text-text-muted font-bold text-sm">/100</span>
                      </div>
                    </div>

                    {/* Stalls & Cycles stats */}
                    {selectedSub.grade_report && (
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-bg-panel border border-border-subtle rounded-xl p-3 text-center">
                          <span className="text-[9px] text-text-muted uppercase font-bold block mb-0.5">Cycles</span>
                          <span className="text-base font-bold text-white font-mono">{selectedSub.grade_report.cycles}</span>
                        </div>
                        <div className="bg-bg-panel border border-border-subtle rounded-xl p-3 text-center">
                          <span className="text-[9px] text-text-muted uppercase font-bold block mb-0.5">Stalls</span>
                          <span className="text-base font-bold text-white font-mono">{selectedSub.grade_report.stalls}</span>
                        </div>
                        <div className="bg-bg-panel border border-border-subtle rounded-xl p-3 text-center">
                          <span className="text-[9px] text-text-muted uppercase font-bold block mb-0.5">CPI</span>
                          <span className="text-base font-bold text-white font-mono">{Number(selectedSub.grade_report.cpi || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Test Case results details */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Test Assertions Detail</span>
                      
                      {selectedSub.grade_report?.testResults ? (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                          {selectedSub.grade_report.testResults.map((tr: any) => (
                            <div key={tr.testCaseId} className="bg-bg-panel/40 border border-border-subtle rounded-xl p-3 flex flex-col">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1.5">
                                  {tr.passed ? (
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle size={13} className="text-red-400 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-white truncate max-w-[240px]">{tr.name}</span>
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${tr.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {tr.score}/{tr.maxScore}
                                </span>
                              </div>
                              {tr.feedback && tr.feedback.length > 0 && (
                                <ul className="list-disc list-inside text-[9px] text-text-muted ml-4 space-y-0.5 mt-1">
                                  {tr.feedback.map((fb: string, fbIdx: number) => <li key={fbIdx}>{fb}</li>)}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed border-border-subtle rounded-xl text-xs text-text-muted">
                          No report feedback object generated.
                        </div>
                      )}
                    </div>

                    {/* Manual override form */}
                    <div className="bg-bg-panel border border-border-subtle rounded-2xl p-4.5 space-y-4">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Grade Overrides & Feedback</span>

                      <div>
                        <label className="text-[10px] text-text-muted block mb-1.5">Manual Score Override (0 - 100)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={manualScore}
                          onChange={(e) => setManualScore(e.target.value)}
                          placeholder="e.g., 85"
                          className="w-28 px-3 py-1.5 bg-bg-base border border-border-subtle rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                        />
                        <span className="text-[9px] text-text-muted block mt-1">Leave empty to use autograded score.</span>
                      </div>

                      <div>
                        <label className="text-[10px] text-text-muted block mb-1.5">Feedback Note for Student</label>
                        <textarea
                          rows={3}
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          placeholder="Type constructive pointers on RAW hazard reduction, layout, etc."
                          className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                    <button
                      onClick={() => setSelectedSub(null)}
                      className="flex-1 py-2.5 border border-border-subtle rounded-xl text-text-muted text-xs font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveOverride}
                      disabled={isSavingOverride}
                      className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} />
                      {isSavingOverride ? 'Saving...' : 'Confirm Grade'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

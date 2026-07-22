import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, assignmentService } from '../../services/courseService';
import { useAuthStore } from '../../store/authStore';
import { AssignmentBuilder } from '../grading/AssignmentBuilder';
import {
  Users, Award, Trash2,
  FolderOpen, Plus, BarChart3, ArrowLeft,
  Clock, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CourseDashboardPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isInstructor = profile?.role === 'instructor';

  const [course, setCourse] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'roster' | 'analytics'>('assignments');
  
  // Assignment Builder modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const loadData = async () => {
    if (!courseId) return;
    setLoading(true);
    
    // Fetch course details
    const { data: courseData, error: courseError } = await courseService.getCourseWithRoster(courseId);
    if (courseError) {
      console.error(courseError);
      setLoading(false);
      return;
    }
    setCourse(courseData);

    // Fetch course assignments
    const assignData = await assignmentService.getCourseAssignments(courseId);
    setAssignments(assignData);

    // If instructor, fetch cohort stats for each assignment
    if (profile?.role === 'instructor') {
      const statsObj: Record<string, any> = {};
      for (const assig of assignData) {
        const { data: stats } = await courseService.getAssignmentStats(courseId, assig.id);
        if (stats) {
          statsObj[assig.id] = stats;
        }
      }
      setAssignmentStats(statsObj);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile && courseId) {
      queueMicrotask(() => {
        loadData();
      });
    }
  }, [profile, courseId]);

  const handleRemoveStudent = async (studentId: string, name: string) => {
    if (!courseId || !confirm(`Are you sure you want to remove "${name}" from this course?`)) return;
    const { error } = await courseService.removeStudent(courseId, studentId);
    if (error) {
      alert(`Error removing student: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleCreateOrUpdateAssignment = async (assig: any) => {
    if (!courseId) return;
    
    const params = {
      courseId,
      title: assig.title,
      description: assig.description,
      difficulty: assig.difficulty,
      starterCode: assig.starterCode,
      blockedInstructions: assig.blockedInstructions || [],
      visibleTestCases: assig.testCases.filter((tc: any) => !tc.hidden),
      hiddenTestCases: assig.testCases.filter((tc: any) => !!tc.hidden),
      rubricCorrectness: assig.rubric.correctness,
      rubricEfficiency: assig.rubric.efficiency,
      rubricStyle: assig.rubric.style,
      dueDate: assig.dueDate || null,
      latePenaltyPct: assig.latePenaltyPct || 0,
      maxAttempts: assig.maxAttempts || -1,
      maxCyclesLimit: assig.maxCyclesLimit || 10000
    };

    let response;
    if (editingAssignment) {
      response = await assignmentService.update(editingAssignment.id, params);
    } else {
      response = await assignmentService.create(params);
    }

    if (response.error) {
      const errorMsg = typeof response.error === 'string' ? response.error : (response.error as any).message || 'Unknown error';
      alert(`Error saving assignment: ${errorMsg}`);
    } else {
      setIsBuilderOpen(false);
      setEditingAssignment(null);
      loadData();
    }
  };

  const handleDeleteAssignment = async (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this assignment? All student grades for it will be lost.')) return;
    const { error } = await assignmentService.delete(assignmentId);
    if (error) {
      alert(`Error deleting assignment: ${error.message}`);
    } else {
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-base">
        <div className="w-8 h-8 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-base text-center">
        <FolderOpen size={48} className="text-text-muted/30 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Classroom Not Found</h2>
        <button onClick={() => navigate('/courses')} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl">Back to Courses</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-auto custom-scrollbar">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 flex items-center justify-between px-8 border-b border-border-subtle bg-bg-surface shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            Institutional Portal
          </button>
          <div className="w-px h-6 bg-border-subtle" />
          <h1 className="text-white font-bold text-base flex items-center gap-2">
            {course.title}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-panel border border-border-subtle text-text-muted">{course.semester}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isInstructor && (
            <div className="text-xs bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg text-brand-400 font-bold">
              Join Code: <code className="text-white font-black tracking-widest">{course.join_code}</code>
            </div>
          )}
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="px-8 border-b border-border-subtle bg-bg-surface/30 shrink-0">
        <div className="max-w-7xl mx-auto flex gap-1">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'assignments' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
            }`}
          >
            <FolderOpen size={14} />
            Assignments
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'roster' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
            }`}
          >
            <Users size={14} />
            Roster
          </button>
          {isInstructor && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'text-brand-400 border-brand-500' : 'text-text-muted border-transparent hover:text-white'
              }`}
            >
              <BarChart3 size={14} />
              Cohort Analytics
            </button>
          )}
        </div>
      </div>

      {/* Main Dashboard body */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* TAB 1: Assignments */}
          {activeTab === 'assignments' && (
            <motion.div key="assignments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-white font-bold text-sm">Course Exercises</h2>
                {isInstructor && (
                  <button
                    onClick={() => {
                      setEditingAssignment(null);
                      setIsBuilderOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Add Assignment
                  </button>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-16 bg-bg-surface border border-border-subtle rounded-2xl">
                  <FolderOpen size={36} className="mx-auto text-text-muted/30 mb-3" />
                  <p className="text-sm text-text-muted">No assignments listed yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignments.map(a => {
                    const stats = assignmentStats[a.id];
                    const visibleCount = a.visible_test_cases?.length ?? 0;
                    const hiddenCount = a.hidden_test_cases?.length ?? 0;
                    
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          if (isInstructor) {
                            navigate(`/courses/${courseId}/assignments/${a.id}`);
                          } else {
                            navigate(`/simulator?assignment=${a.id}`);
                          }
                        }}
                        className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between hover:border-brand-500/40 hover:bg-white/[0.01] transition-all cursor-pointer group shadow-xl"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">{a.title}</h3>
                              <p className="text-text-muted text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                                {a.difficulty} · {visibleCount + hiddenCount} Tests ({hiddenCount} Hidden)
                              </p>
                            </div>
                            
                            {/* Submission donut charts for instructors */}
                            {isInstructor && stats && (
                              <SubmissionRingChart submitted={stats.submitted} total={stats.totalEnrolled} />
                            )}
                          </div>

                          <p className="text-text-muted text-xs line-clamp-2 min-h-[32px] leading-relaxed mb-6">
                            {a.description || 'No description provided.'}
                          </p>

                          {/* Stat summary bars for instructors */}
                          {isInstructor && stats && (
                            <div className="space-y-4 mb-6">
                              <div>
                                <div className="flex justify-between text-[10px] text-text-muted mb-1 font-semibold">
                                  <span>Passing Cohort (&ge;60%)</span>
                                  <span className={stats.passRate >= 70 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                    {stats.passRate.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-bg-panel rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${stats.passRate >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${stats.passRate}%` }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-bg-panel rounded-lg py-2 border border-border-subtle/50">
                                  <div className="text-sm font-bold text-white">{stats.avgScore.toFixed(0)}</div>
                                  <div className="text-[9px] text-text-muted uppercase">Avg</div>
                                </div>
                                <div className="bg-bg-panel rounded-lg py-2 border border-border-subtle/50">
                                  <div className="text-sm font-bold text-emerald-400">{stats.maxScore.toFixed(0)}</div>
                                  <div className="text-[9px] text-text-muted uppercase">Max</div>
                                </div>
                                <div className="bg-bg-panel rounded-lg py-2 border border-border-subtle/50">
                                  <div className="text-sm font-bold text-red-400">{stats.minScore.toFixed(0)}</div>
                                  <div className="text-[9px] text-text-muted uppercase">Min</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center border-t border-border-subtle/50 pt-4 text-xs text-text-muted font-medium mt-auto">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-brand-500" />
                            {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : 'No deadline'}
                          </span>
                          
                          <div className="flex gap-2">
                            {isInstructor && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const testCases = [
                                      ...(a.visible_test_cases || []),
                                      ...(a.hidden_test_cases || []).map((tc: any) => ({ ...tc, hidden: true }))
                                    ];
                                    setEditingAssignment({
                                      ...a,
                                      starterCode: a.starter_code,
                                      blockedInstructions: a.blocked_instructions,
                                      dueDate: a.due_at,
                                      testCases,
                                      rubric: {
                                        correctness: a.rubric_correctness,
                                        efficiency: a.rubric_efficiency,
                                        style: a.rubric_style
                                      }
                                    });
                                    setIsBuilderOpen(true);
                                  }}
                                  className="p-1.5 text-text-muted hover:text-white bg-bg-panel hover:bg-white/5 rounded-lg border border-border-subtle transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDeleteAssignment(e, a.id)}
                                  className="p-1.5 text-red-400/80 hover:text-red-400 bg-red-500/10 rounded-lg border border-red-500/20 transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            
                            {!isInstructor && (
                              <span className="flex items-center gap-0.5 text-brand-400 font-bold group-hover:translate-x-1 transition-transform">
                                Solve Code <ChevronRight size={14} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Roster */}
          {activeTab === 'roster' && (
            <motion.div key="roster" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-sm">Classroom Roster ({course.roster?.length || 0} Students)</h2>
              </div>

              {course.roster?.length === 0 ? (
                <div className="text-center py-16 bg-bg-surface border border-border-subtle rounded-2xl">
                  <Users size={36} className="mx-auto text-text-muted/30 mb-3" />
                  <p className="text-sm text-text-muted">No students enrolled yet.</p>
                </div>
              ) : (
                <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
                  <div className="grid grid-cols-[3fr_2fr_1fr_auto] gap-4 px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle bg-bg-panel/50">
                    <span>Name</span>
                    <span>Email Address</span>
                    <span>Enrolled On</span>
                    <span></span>
                  </div>
                  {course.roster.map((student: any) => (
                    <div key={student.student_id} className="grid grid-cols-[3fr_2fr_1fr_auto] gap-4 px-6 py-4 items-center border-b border-border-subtle/50 last:border-0 hover:bg-white/[0.01] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500/10 to-brand-500/20 flex items-center justify-center text-brand-400 font-black text-xs border border-brand-500/10">
                          {student.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-white">{student.full_name}</span>
                      </div>
                      <span className="text-xs text-text-muted font-mono">{student.email}</span>
                      <span className="text-xs text-text-muted">{new Date(student.joined_at).toLocaleDateString()}</span>
                      <div>
                        {isInstructor && (
                          <button
                            onClick={() => handleRemoveStudent(student.student_id, student.full_name)}
                            className="p-1.5 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Student"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Analytics */}
          {activeTab === 'analytics' && isInstructor && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <h2 className="text-white font-bold text-sm">Cohort Metrics</h2>

              {/* Roster-wide distribution stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
                  <h3 className="text-white font-bold text-sm mb-4">Cohort Performance Overview</h3>
                  <div className="text-xs text-text-muted space-y-4">
                    <p>This panel shows structural data aggregate points for the class. Check most common failed assertions and adjust syllabus focus accordingly.</p>
                    <div className="bg-bg-panel border border-border-subtle rounded-xl p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Total Assignments Issued:</span>
                        <span className="text-white font-bold">{assignments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Roster Students:</span>
                        <span className="text-white font-bold">{course.roster?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
                  <h3 className="text-white font-bold text-sm mb-4">Common Failures Heatmap</h3>
                  <div className="space-y-3">
                    {assignments.map(a => {
                      const stats = assignmentStats[a.id];
                      if (!stats || stats.topFailingTestCases.length === 0) return null;
                      return (
                        <div key={a.id} className="bg-bg-panel p-3 border border-border-subtle rounded-xl text-xs">
                          <span className="font-bold text-white block mb-2">{a.title}</span>
                          {stats.topFailingTestCases.map((tc: any) => (
                            <div key={tc.name} className="flex justify-between items-center py-1 border-b border-border-subtle/30 last:border-0">
                              <span className="text-text-secondary truncate pr-4">{tc.name}</span>
                              <span className="text-red-400 font-bold shrink-0">{tc.pct.toFixed(0)}% failing</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {assignments.every(a => !assignmentStats[a.id]?.topFailingTestCases.length) && (
                      <p className="text-xs text-text-muted italic">No grading failure history available.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assignment Builder Wizard Modal */}
      <AnimatePresence>
        {isBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-hidden">
            <div className="w-full max-w-5xl bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
              <div className="px-6 py-4 border-b border-border-subtle bg-bg-panel flex items-center justify-between shrink-0">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award size={16} className="text-brand-500" />
                  {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
                </h2>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="text-text-muted hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 bg-bg-base">
                <AssignmentBuilder
                  initial={editingAssignment}
                  onSave={handleCreateOrUpdateAssignment}
                  onCancel={() => setIsBuilderOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SubmissionRingChart = ({ submitted, total }: { submitted: number; total: number }) => {
  const pct = total > 0 ? (submitted / total) * 100 : 0;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="24" cy="24" r="20" stroke="var(--color-bg-panel)" strokeWidth="3" fill="transparent" />
        <circle cx="24" cy="24" r="20" stroke="var(--color-brand-500)" strokeWidth="3" fill="transparent"
          strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * pct) / 100} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[10px] font-black text-white">{submitted}/{total}</span>
    </div>
  );
};

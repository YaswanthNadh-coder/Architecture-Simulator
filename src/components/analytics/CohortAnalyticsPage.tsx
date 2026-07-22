import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, assignmentService } from '../../services/courseService';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';

// ── Custom tooltip styling for Recharts ──────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Score Distribution Histogram ─────────────────────────────────────────────

function ScoreDistribution({ submissions }: { submissions: any[] }) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}–${i * 10 + 9}`,
    count: 0,
  }));
  // Special case: 100 goes in the last bucket
  buckets.push({ range: '100', count: 0 });

  for (const sub of submissions) {
    const score = sub.manual_score ?? sub.total_score;
    if (score == null) continue;
    const bucket = Math.min(Math.floor(score / 10), 9);
    if (score === 100) {
      buckets[10].count++;
    } else {
      buckets[bucket].count++;
    }
  }

  // Merge 100 into 90-99 for cleaner display
  buckets[9].count += buckets[10].count;
  buckets[9].range = '90–100';
  buckets.pop();

  const getBarColor = (range: string) => {
    const start = parseInt(range);
    if (start >= 80) return '#10b981';
    if (start >= 60) return '#f59e0b';
    if (start >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6">
      <h3 className="text-white font-bold text-sm mb-1">Score Distribution</h3>
      <p className="text-white/40 text-xs mb-6">Grade distribution across all graded submissions</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={buckets} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
            {buckets.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Submission Timeline ──────────────────────────────────────────────────────

function SubmissionTimeline({ submissions, dueDate }: { submissions: any[]; dueDate: string | null }) {
  // Group submissions by date
  const byDate: Record<string, number> = {};
  for (const sub of submissions) {
    const date = new Date(sub.submitted_at).toLocaleDateString();
    byDate[date] = (byDate[date] || 0) + 1;
  }

  // Build cumulative timeline
  const dates = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const data = dates.map((date, index) => {
    const cumulative = dates.slice(0, index + 1).reduce((sum, d) => sum + byDate[d], 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: byDate[date],
      cumulative,
      isDue: dueDate ? new Date(date).toDateString() === new Date(dueDate).toDateString() : false,
    };
  });

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6">
      <h3 className="text-white font-bold text-sm mb-1">Submission Timeline</h3>
      <p className="text-white/40 text-xs mb-6">
        Cumulative submissions over time
        {dueDate && <span> · Due: {new Date(dueDate).toLocaleDateString()}</span>}
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cumulative"
            name="Total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
          />
          <Line
            type="monotone"
            dataKey="submissions"
            name="Per Day"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ r: 2, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Concept Heatmap ──────────────────────────────────────────────────────────

function ConceptHeatmap({ assignments, statsMap }: { assignments: any[]; statsMap: Record<string, any> }) {
  if (assignments.length === 0) return null;

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6">
      <h3 className="text-white font-bold text-sm mb-1">Common Failure Heatmap</h3>
      <p className="text-white/40 text-xs mb-6">Top failing test cases across all assignments</p>
      <div className="space-y-4">
        {assignments.map(a => {
          const stats = statsMap[a.id];
          if (!stats?.topFailingTestCases?.length) return null;

          return (
            <div key={a.id} className="space-y-2">
              <span className="text-xs font-bold text-white/70">{a.title}</span>
              <div className="grid gap-1.5">
                {stats.topFailingTestCases.map((tc: any) => {
                  const pct = tc.pct || tc.failCount;
                  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={tc.name} className="flex items-center gap-3">
                      <span className="text-[11px] text-white/50 truncate flex-1 min-w-0">{tc.name}</span>
                      <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold shrink-0 w-10 text-right" style={{ color }}>
                        {typeof pct === 'number' ? pct.toFixed(0) : pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Pass Rate Summary ────────────────────────────────────────────────────────

function PassRateSummary({ assignments, statsMap }: { assignments: any[]; statsMap: Record<string, any> }) {
  const data = assignments
    .map(a => ({
      name: a.title.length > 20 ? a.title.slice(0, 18) + '…' : a.title,
      passRate: statsMap[a.id]?.passRate ?? 0,
      avgScore: statsMap[a.id]?.avgScore ?? 0,
    }))
    .filter(d => d.passRate > 0 || d.avgScore > 0);

  if (data.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <AlertTriangle size={28} className="text-white/10 mb-3" />
        <p className="text-xs text-white/30">No graded submissions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6">
      <h3 className="text-white font-bold text-sm mb-1">Pass Rate by Assignment</h3>
      <p className="text-white/40 text-xs mb-6">Percentage of students scoring ≥ 60%</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="passRate" name="Pass Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avgScore" name="Avg Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export const CohortAnalyticsPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    const load = async () => {
      setLoading(true);

      // Load course
      const { data: courseData } = await courseService.getCourseWithRoster(courseId);
      setCourse(courseData);

      // Load assignments
      const assignData = await assignmentService.getCourseAssignments(courseId);
      setAssignments(assignData);

      // Load all submissions for the course
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, student_id, assignment_id, total_score, grading_status, submitted_at, is_late, grade_report, manual_score')
        .eq('course_id', courseId)
        .order('submitted_at', { ascending: true });
      setAllSubmissions(subs || []);

      // Load stats per assignment
      const stats: Record<string, any> = {};
      for (const a of assignData) {
        const { data: s } = await courseService.getAssignmentStats(courseId, a.id);
        if (s) stats[a.id] = s;
      }
      setStatsMap(stats);

      setLoading(false);
    };

    load();
  }, [courseId]);

  // Summary stats
  const gradedSubs = allSubmissions.filter(s => s.grading_status === 'graded');
  const scores = gradedSubs.map(s => s.manual_score ?? s.total_score).filter(Boolean) as number[];
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  const lateSubs = allSubmissions.filter(s => s.is_late).length;
  const uniqueStudents = new Set(allSubmissions.map(s => s.student_id)).size;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-base">
        <div className="w-8 h-8 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
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
            <BarChart3 size={16} className="text-brand-500" />
            Cohort Analytics
            {course && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-panel border border-border-subtle text-text-muted">
                {course.title}
              </span>
            )}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Submissions', value: allSubmissions.length, icon: <BarChart3 size={16} />, color: 'brand' },
            { label: 'Active Students', value: uniqueStudents, icon: <Users size={16} />, color: 'emerald' },
            { label: 'Avg Score', value: avgScore.toFixed(1), icon: <TrendingUp size={16} />, color: 'blue' },
            { label: 'Late Submissions', value: lateSubs, icon: <AlertTriangle size={16} />, color: 'amber' },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-bg-surface border border-border-subtle rounded-2xl p-5 flex items-center gap-4`}
            >
              <div className={`w-10 h-10 rounded-xl bg-${card.color}-500/10 border border-${card.color}-500/20 flex items-center justify-center text-${card.color}-400`}>
                {card.icon}
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">{card.label}</span>
                <span className="text-xl font-bold text-white block">{card.value}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreDistribution submissions={gradedSubs} />
          <PassRateSummary assignments={assignments} statsMap={statsMap} />
          <SubmissionTimeline
            submissions={allSubmissions}
            dueDate={assignments[0]?.due_at || null}
          />
          <ConceptHeatmap assignments={assignments} statsMap={statsMap} />
        </div>
      </div>
    </div>
  );
};

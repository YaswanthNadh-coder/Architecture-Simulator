import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { EngineStats } from '../engine/pipelineEngine';

const EVENTS_LOCAL_STORAGE_KEY = 'architecture_simulator_events';

const getLocalEvents = (): any[] => {
  try {
    const raw = localStorage.getItem(EVENTS_LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read events from localStorage', e);
    return [];
  }
};

const saveLocalEvents = (events: any[]) => {
  try {
    localStorage.setItem(EVENTS_LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to write events to localStorage', e);
  }
};

const isSchemaError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  const code = error.code || '';
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205'
  );
};

// ── Event Logging ────────────────────────────────────────────────────────

export const logSimulationEvent = async (eventType: 'assemble' | 'step') => {
  const user = useAuthStore.getState().profile;
  if (!user) return; // User must be logged in

  try {
    const { error } = await supabase
      .from('simulation_events')
      .insert([
        {
          user_id: user.id,
          event_type: eventType,
        },
      ]);
    
    if (error) {
      if (isSchemaError(error)) {
        const local = getLocalEvents();
        local.push({
          id: self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2),
          user_id: user.id,
          event_type: eventType,
          created_at: new Date().toISOString(),
        });
        saveLocalEvents(local);
        return;
      }
      console.error('Failed to log simulation event:', error);
    }
  } catch (err) {
    console.error('Error logging simulation event:', err);
  }
};

/**
 * Log a rich simulation completion event with full performance stats.
 * Called when a simulation finishes running (isFinished = true).
 */
export const logSimulationCompletion = async (
  stats: EngineStats,
  forwardingEnabled: boolean,
  programHash?: string
) => {
  const user = useAuthStore.getState().profile;
  if (!user) return;

  try {
    const cpi = stats.instructionsCompleted > 0
      ? stats.totalCycles / stats.instructionsCompleted
      : 0;

    const { error } = await supabase
      .from('simulation_events')
      .insert([{
        user_id: user.id,
        event_type: 'assemble',
        data_hazards: stats.dataStallCycles,
        control_hazards: stats.controlStallCycles,
        memory_stalls: stats.memoryStallCycles,
        forward_count: stats.forwardCount,
        stall_count: stats.stallCycles,
        cpi: Math.round(cpi * 1000) / 1000,
        cycles: stats.totalCycles,
        instructions_completed: stats.instructionsCompleted,
        forwarding_enabled: forwardingEnabled,
        program_hash: programHash || null,
      }]);

    if (error) {
      if (isSchemaError(error)) {
        const local = getLocalEvents();
        local.push({
          id: self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2),
          user_id: user.id,
          event_type: 'assemble',
          data_hazards: stats.dataStallCycles,
          control_hazards: stats.controlStallCycles,
          memory_stalls: stats.memoryStallCycles,
          forward_count: stats.forwardCount,
          stall_count: stats.stallCycles,
          cpi: Math.round(cpi * 1000) / 1000,
          cycles: stats.totalCycles,
          instructions_completed: stats.instructionsCompleted,
          forwarding_enabled: forwardingEnabled,
          program_hash: programHash || null,
          created_at: new Date().toISOString(),
        });
        saveLocalEvents(local);
        return;
      }
      console.error('Failed to log simulation completion:', error);
    }
  } catch (err) {
    console.error('Error logging simulation completion:', err);
  }
};

// ── Activity Metrics ─────────────────────────────────────────────────────

export interface ActivityMetrics {
  currentStreak: number;
  simulationsRun: number;
  hazardsFound: number;
  heatmapData: number[][];
}

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getUserActivityMetrics = async (userId: string): Promise<{ metrics: ActivityMetrics | null, error: string | null }> => {
  try {
    const { data: events, error } = await supabase
      .from('simulation_events')
      .select('event_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    let finalEvents = events;
    if (error) {
      if (isSchemaError(error)) {
        console.warn('Supabase simulation_events table not found, falling back to localStorage');
        finalEvents = getLocalEvents()
          .filter((e) => e.user_id === userId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        console.error('Error fetching activity events:', error);
        return { metrics: null, error: error.message };
      }
    }

    if (!finalEvents) return { metrics: null, error: 'No events array returned' };

    const simulationsRun = finalEvents.filter(e => e.event_type === 'assemble').length;
    const eventsByDate = new Map<string, number>();
    
    finalEvents.forEach(event => {
      const date = new Date(event.created_at);
      const dateString = getLocalDateString(date);
      eventsByDate.set(dateString, (eventsByDate.get(dateString) || 0) + 1);
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);
    
    const todayString = getLocalDateString(checkDate);
    if (!eventsByDate.has(todayString)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let dateString = getLocalDateString(checkDate);
    while (eventsByDate.has(dateString)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      dateString = getLocalDateString(checkDate);
    }

    let maxEventsPerDay = 1;
    for (const count of eventsByDate.values()) {
      if (count > maxEventsPerDay) maxEventsPerDay = count;
    }

    const heatmapData: number[][] = [];
    const oneDay = 24 * 60 * 60 * 1000;
    const startDate = new Date(today.getTime() - 364 * oneDay);
    let currentDateIterator = new Date(startDate);

    for (let w = 0; w < 52; w++) {
      const week: number[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = getLocalDateString(currentDateIterator);
        const count = eventsByDate.get(ds) || 0;
        week.push(count / maxEventsPerDay);
        currentDateIterator = new Date(currentDateIterator.getTime() + oneDay);
      }
      heatmapData.push(week);
    }

    return {
      metrics: {
        currentStreak,
        simulationsRun,
        hazardsFound: 0,
        heatmapData,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to calculate user metrics:', message);
    return { metrics: null, error: message };
  }
};

// ── Analytics Data (Real) ────────────────────────────────────────────────

export interface AnalyticsSession {
  id: string;
  date: string;
  cpi: number;
  stallRate: number;
  hazards: { data: number; control: number; structural: number };
  cycles: number;
  instructions: number;
  forwardingEnabled: boolean;
}

export const getAnalyticsData = async (userId: string): Promise<{
  sessions: AnalyticsSession[];
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('simulation_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'assemble')
      .not('cpi', 'is', null)
      .order('created_at', { ascending: true })
      .limit(100);

    let finalData = data;
    if (error) {
      if (isSchemaError(error)) {
        console.warn('Supabase simulation_events table not found, falling back to localStorage');
        finalData = getLocalEvents()
          .filter((e) => e.user_id === userId && e.event_type === 'assemble' && e.cpi !== null && e.cpi !== undefined)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(0, 100);
      } else {
        return { sessions: [], error: error.message };
      }
    }

    if (!finalData || finalData.length === 0) return { sessions: [], error: null };

    const sessions: AnalyticsSession[] = finalData.map((row, i) => ({
      id: `s${i}`,
      date: row.created_at,
      cpi: Number(row.cpi) || 1,
      stallRate: row.cycles > 0 ? Math.round((row.stall_count / row.cycles) * 100) : 0,
      hazards: {
        data: row.data_hazards || 0,
        control: row.control_hazards || 0,
        structural: 0,
      },
      cycles: row.cycles || 0,
      instructions: row.instructions_completed || 0,
      forwardingEnabled: row.forwarding_enabled ?? true,
    }));

    return { sessions, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { sessions: [], error: message };
  }
};

// ── Concept Mastery (Real) ───────────────────────────────────────────────

export interface ConceptMasteryData {
  id: string;
  name: string;
  description: string;
  exercised: number;
  mastered: boolean;
  icon: string;
  weakSpot?: string;
}

export const getConceptMasteryData = async (userId: string): Promise<{
  concepts: ConceptMasteryData[];
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('simulation_events')
      .select('data_hazards, control_hazards, memory_stalls, forward_count, stall_count, cpi, forwarding_enabled')
      .eq('user_id', userId)
      .eq('event_type', 'assemble')
      .not('cpi', 'is', null);

    let finalData = data;
    if (error) {
      if (isSchemaError(error)) {
        console.warn('Supabase simulation_events table not found, falling back to localStorage');
        finalData = getLocalEvents()
          .filter((e) => e.user_id === userId && e.event_type === 'assemble' && e.cpi !== null && e.cpi !== undefined);
      } else {
        return { concepts: getDefaultConcepts(), error: error.message };
      }
    }

    if (!finalData || finalData.length === 0) return { concepts: getDefaultConcepts(), error: null };

    // Aggregate counts
    let totalDataHazards = 0;
    let totalControlHazards = 0;
    let totalMemoryStalls = 0;
    let totalForwards = 0;
    let forwardingOnCount = 0;
    let forwardingOffCount = 0;
    let totalCpiSum = 0;
    const recentCpis: number[] = [];

    finalData.forEach(row => {
      totalDataHazards += row.data_hazards || 0;
      totalControlHazards += row.control_hazards || 0;
      totalMemoryStalls += row.memory_stalls || 0;
      totalForwards += row.forward_count || 0;
      if (row.forwarding_enabled) forwardingOnCount++;
      else forwardingOffCount++;
      const cpi = Number(row.cpi) || 0;
      totalCpiSum += cpi;
      recentCpis.push(cpi);
    });

    // Sessions where each concept was exercised
    const dataHazardSessions = finalData.filter(r => (r.data_hazards || 0) > 0).length;
    const controlHazardSessions = finalData.filter(r => (r.control_hazards || 0) > 0).length;
    const forwardingSessions = finalData.filter(r => (r.forward_count || 0) > 0).length;
    const memSessions = finalData.filter(r => (r.memory_stalls || 0) > 0).length;
    const loadUseSessions = finalData.filter(r => (r.data_hazards || 0) > 0 && (r.stall_count || 0) > 0).length;

    // Check if CPI is improving over time (last 5 sessions)
    const last5 = recentCpis.slice(-5);
    const cpiImproving = last5.length >= 3 && last5[last5.length - 1] < last5[0];

    const concepts: ConceptMasteryData[] = [
      {
        id: 'data_hazards',
        name: 'Data Hazards',
        description: 'Read-After-Write (RAW) dependencies between instructions',
        exercised: dataHazardSessions,
        mastered: dataHazardSessions >= 15,
        icon: '⚡',
        weakSpot: dataHazardSessions < 5
          ? 'Run more programs with dependent instructions to explore data hazards.'
          : undefined,
      },
      {
        id: 'forwarding',
        name: 'Data Forwarding',
        description: 'Bypass paths that eliminate stalls from data hazards',
        exercised: forwardingSessions,
        mastered: forwardingSessions >= 10 && forwardingOffCount >= 2,
        icon: '🔄',
        weakSpot: forwardingOffCount < 2
          ? 'Try running programs with forwarding OFF to see the difference in stall counts.'
          : undefined,
      },
      {
        id: 'branch_penalties',
        name: 'Branch Penalties',
        description: 'Pipeline flushes caused by mispredicted branches',
        exercised: controlHazardSessions,
        mastered: controlHazardSessions >= 8,
        icon: '🎯',
        weakSpot: controlHazardSessions < 5
          ? 'Your branch-heavy code hasn\'t been explored much. Try programs with loops and conditional branches.'
          : undefined,
      },
      {
        id: 'cache_misses',
        name: 'Cache Miss Penalties',
        description: 'Memory stalls from cache misses in the hierarchy',
        exercised: memSessions,
        mastered: memSessions >= 5,
        icon: '📦',
        weakSpot: memSessions < 3
          ? 'Enable the Cache Simulator and try varying cache size and associativity to see the impact on CPI.'
          : undefined,
      },
      {
        id: 'load_use',
        name: 'Load-Use Dependencies',
        description: 'Stalls caused by using data immediately after a load instruction',
        exercised: loadUseSessions,
        mastered: loadUseSessions >= 10,
        icon: '📥',
      },
      {
        id: 'optimization',
        name: 'Code Optimization',
        description: 'Writing efficient code that minimizes CPI and stalls',
        exercised: finalData.length,
        mastered: cpiImproving && finalData.length >= 10,
        icon: '🚀',
        weakSpot: !cpiImproving && finalData.length >= 5
          ? 'Your CPI trend is flat or increasing. Try reordering instructions to reduce stalls and improve efficiency.'
          : undefined,
      },
    ];

    return { concepts, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { concepts: getDefaultConcepts(), error: message };
  }
};

function getDefaultConcepts(): ConceptMasteryData[] {
  return [
    { id: 'data_hazards', name: 'Data Hazards', description: 'Read-After-Write (RAW) dependencies', exercised: 0, mastered: false, icon: '⚡', weakSpot: 'Run some simulations to start tracking your progress!' },
    { id: 'forwarding', name: 'Data Forwarding', description: 'Bypass paths that eliminate stalls', exercised: 0, mastered: false, icon: '🔄' },
    { id: 'branch_penalties', name: 'Branch Penalties', description: 'Pipeline flushes from mispredictions', exercised: 0, mastered: false, icon: '🎯' },
    { id: 'cache_misses', name: 'Cache Miss Penalties', description: 'Memory stalls from cache misses', exercised: 0, mastered: false, icon: '📦' },
    { id: 'load_use', name: 'Load-Use Dependencies', description: 'Stalls from immediate load usage', exercised: 0, mastered: false, icon: '📥' },
    { id: 'optimization', name: 'Code Optimization', description: 'Writing efficient low-CPI code', exercised: 0, mastered: false, icon: '🚀' },
  ];
}

// ── Assignment Persistence (Supabase) ────────────────────────────────────

import type { AssignmentProfile } from '../engine/assignmentProfile';

export const saveAssignmentToSupabase = async (assignment: AssignmentProfile, userId: string): Promise<{ error: string | null }> => {
  try {
    const visibleTestCases = assignment.testCases.filter(tc => !tc.hidden);
    const hiddenTestCases = assignment.testCases.filter(tc => !!tc.hidden);

    const { error } = await supabase
      .from('assignments')
      .upsert([{
        id: assignment.id,
        instructor_id: userId,
        title: assignment.title,
        description: assignment.description,
        difficulty: assignment.difficulty,
        starter_code: assignment.starterCode,
        blocked_instructions: assignment.blockedInstructions || [],
        due_at: assignment.dueDate || null,
        rubric_correctness: assignment.rubric.correctness,
        rubric_efficiency: assignment.rubric.efficiency,
        rubric_style: assignment.rubric.style,
        visible_test_cases: visibleTestCases,
        hidden_test_cases: hiddenTestCases,
        late_penalty_pct: assignment.latePenaltyPct || 0,
        max_attempts: assignment.maxAttempts || -1,
        max_cycles_limit: assignment.maxCyclesLimit || 10000,
        updated_at: new Date().toISOString(),
      }]);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
};

export const loadAssignmentsFromSupabase = async (userId: string): Promise<{
  assignments: AssignmentProfile[];
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('instructor_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return { assignments: [], error: error.message };
    if (!data) return { assignments: [], error: null };

    const assignments: AssignmentProfile[] = data.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      difficulty: row.difficulty || 'Intermediate',
      starterCode: row.starter_code || '',
      blockedInstructions: row.blocked_instructions || [],
      dueDate: row.due_at || undefined,
      rubric: {
        correctness: row.rubric_correctness ?? 70,
        efficiency: row.rubric_efficiency ?? 20,
        style: row.rubric_style ?? 10
      },
      testCases: [
        ...(row.visible_test_cases || []),
        ...(row.hidden_test_cases || []).map((tc: any) => ({ ...tc, hidden: true }))
      ],
      latePenaltyPct: row.late_penalty_pct || 0,
      maxAttempts: row.max_attempts || -1,
      maxCyclesLimit: row.max_cycles_limit || 10000,
    }));

    return { assignments, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { assignments: [], error: message };
  }
};

export const deleteAssignmentFromSupabase = async (assignmentId: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
};

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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
      console.error('Failed to log simulation event:', error);
    }
  } catch (err) {
    console.error('Error logging simulation event:', err);
  }
};

export interface ActivityMetrics {
  currentStreak: number;
  simulationsRun: number;
  hazardsFound: number; // Placeholder for now, could be fetched from ActivityRecord
  heatmapData: number[][]; // 52x7 array for GitHub-style heatmap
}

export const getUserActivityMetrics = async (userId: string): Promise<{ metrics: ActivityMetrics | null, error: string | null }> => {
  try {
    // 1. Fetch simulation events
    const { data: events, error } = await supabase
      .from('simulation_events')
      .select('event_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activity events:', error);
      return { metrics: null, error: error.message };
    }

    if (!events) return { metrics: null, error: 'No events array returned' };

    // Calculate simulationsRun (count of 'assemble' events)
    const simulationsRun = events.filter(e => e.event_type === 'assemble').length;

    // Map events by Date string (YYYY-MM-DD)
    const eventsByDate = new Map<string, number>();
    
    events.forEach(event => {
      const date = new Date(event.created_at);
      const dateString = date.toISOString().split('T')[0];
      eventsByDate.set(dateString, (eventsByDate.get(dateString) || 0) + 1);
    });

    // Calculate Current Streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start checking from today or yesterday
    let checkDate = new Date(today);
    
    // If there is no activity today, check if streak continued from yesterday
    const todayString = checkDate.toISOString().split('T')[0];
    if (!eventsByDate.has(todayString)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let dateString = checkDate.toISOString().split('T')[0];
    while (eventsByDate.has(dateString)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      dateString = checkDate.toISOString().split('T')[0];
    }

    // Generate Heatmap Data (52 weeks, 7 days)
    // Find the max value to normalize between 0 and 1
    let maxEventsPerDay = 1;
    for (const count of eventsByDate.values()) {
      if (count > maxEventsPerDay) maxEventsPerDay = count;
    }

    const heatmapData: number[][] = [];
    const oneDay = 24 * 60 * 60 * 1000;
    
    // We want the last day to be today.
    // That means the matrix ends at today.
    // 52 weeks * 7 days = 364 days ago is the start.
    const startDate = new Date(today.getTime() - 364 * oneDay);
    // Align startDate to a Sunday if needed, or just let it be a 52x7 grid ending today.
    // To match GitHub style exactly (7 rows = S M T W T F S), it's more complex.
    // For simplicity, we just build a 52x7 array representing the last 364 days.
    
    let currentDateIterator = new Date(startDate);

    for (let w = 0; w < 52; w++) {
      const week: number[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = currentDateIterator.toISOString().split('T')[0];
        const count = eventsByDate.get(ds) || 0;
        week.push(count / maxEventsPerDay); // Normalize to 0-1
        currentDateIterator = new Date(currentDateIterator.getTime() + oneDay);
      }
      heatmapData.push(week);
    }

    return {
      metrics: {
        currentStreak,
        simulationsRun,
        hazardsFound: 0, // Mocked for now until we query ActivityRecord
        heatmapData,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Failed to calculate user metrics:', err);
    return { metrics: null, error: err.message || 'Unknown error' };
  }
};

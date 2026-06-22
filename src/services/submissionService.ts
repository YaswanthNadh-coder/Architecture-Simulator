import { supabase } from '../lib/supabase';

export const submissionService = {
  /**
   * Submit code for an assignment. Returns submission ID for polling.
   */
  async submit(params: {
    assignmentId: string;
    courseId: string;
    code: string;
    dueAt: string | null;
  }): Promise<{ submissionId: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { submissionId: null, error: 'Not authenticated' };

    // Count existing attempts
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', params.assignmentId)
      .eq('student_id', user.id);

    const isLate = params.dueAt ? new Date() > new Date(params.dueAt) : false;

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        assignment_id: params.assignmentId,
        course_id: params.courseId,
        student_id: user.id,
        code: params.code,
        attempt_number: (count ?? 0) + 1,
        is_late: isLate,
        grading_status: 'pending',
      })
      .select('id')
      .single();

    if (error) return { submissionId: null, error: error.message };

    // Trigger the grading Edge Function asynchronously
    supabase.functions.invoke('grade-submission', {
      body: { submission_id: data.id },
    }).catch(err => {
      console.error('Failed to trigger grading edge function:', err);
    });

    return { submissionId: data.id, error: null };
  },

  /**
   * Poll a submission until grading is complete.
   * Uses both Supabase Realtime changes and a standard interval fallback.
   */
  pollGrade(submissionId: string, onUpdate: (status: string, report: any) => void) {
    const channel = supabase
      .channel(`submission-poll:${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          onUpdate(payload.new.grading_status, payload.new.grade_report);
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('grading_status, grade_report')
        .eq('id', submissionId)
        .single();
      if (!error && data) {
        onUpdate(data.grading_status, data.grade_report);
        if (data.grading_status === 'graded' || data.grading_status === 'error') {
          clearInterval(interval);
        }
      }
    }, 2000);

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  },

  /**
   * Get all submissions for a student on a given assignment.
   */
  async getMySubmissions(assignmentId: string) {
    return supabase
      .from('submissions')
      .select('id, submitted_at, attempt_number, grading_status, total_score, grade_report, is_late')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
  },

  /**
   * Get all submissions for a course assignment (Instructor View).
   */
  async getAssignmentSubmissions(assignmentId: string) {
    return supabase
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
  }
};

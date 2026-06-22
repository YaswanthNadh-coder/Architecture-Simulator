import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized - Missing Authorization Header', { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { submission_id } = body;

    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller identity using their Auth token
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response('Unauthorized - Invalid User Session', { status: 401, headers: corsHeaders });
    }

    // Admin client (service_role) to bypass RLS and read hidden columns / update submissions
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch the submission details
    const { data: submission, error: subError } = await admin
      .from('submissions')
      .select('*, assignments(*)')
      .eq('id', submission_id)
      .eq('student_id', user.id) // Ensure student only runs their own submission
      .single();

    if (subError || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as grading
    await admin
      .from('submissions')
      .update({ grading_status: 'grading' })
      .eq('id', submission_id);

    const assignment = submission.assignments;
    const allTestCases = [
      ...(assignment.visible_test_cases ?? []),
      ...(assignment.hidden_test_cases ?? []),
    ];

    const fullAssignment = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      difficulty: assignment.difficulty,
      starterCode: assignment.starter_code,
      testCases: allTestCases,
      rubric: {
        correctness: assignment.rubric_correctness,
        efficiency: assignment.rubric_efficiency,
        style: assignment.rubric_style,
      },
    };

    // Load auto-grader dynamically
    const { AutoGrader } = await import('./autoGrader.ts');
    
    // Evaluate program
    const report = AutoGrader.grade(
      submission.code,
      fullAssignment,
      assignment.forwarding_enabled
    );

    // Calculate late penalty
    let finalScore = report.totalScore;
    let latePenaltyApplied = 0;
    if (submission.is_late && assignment.late_penalty_pct > 0 && assignment.due_at) {
      const hoursLate = (Date.now() - new Date(assignment.due_at).getTime()) / 3_600_000;
      const daysLate = Math.ceil(hoursLate / 24);
      latePenaltyApplied = Math.min(daysLate * assignment.late_penalty_pct, 100);
      finalScore = Math.max(0, finalScore * (1 - latePenaltyApplied / 100));
    }

    // Write final results to Supabase (service role)
    const { error: updateError } = await admin
      .from('submissions')
      .update({
        grading_status: 'graded',
        total_score: finalScore,
        max_score: 100,
        grade_report: { ...report, latePenaltyApplied },
        graded_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (updateError) {
      console.error('Failed to update submission score:', updateError.message);
    }

    // Return the report but STRIP the individual hidden test case details before sending to client
    const visibleTCs = assignment.visible_test_cases ?? [];
    const hiddenTCs = assignment.hidden_test_cases ?? [];

    const clientReport = {
      ...report,
      testResults: report.testResults.filter(r =>
        visibleTCs.some((tc: any) => tc.id === r.testCaseId)
      ),
      hiddenTestsPassed: report.testResults
        .filter(r => hiddenTCs.some((tc: any) => tc.id === r.testCaseId))
        .filter(r => r.passed).length,
      hiddenTestsTotal: hiddenTCs.length,
      totalScore: finalScore,
      latePenaltyApplied,
    };

    return new Response(JSON.stringify(clientReport), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Grading function exception:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

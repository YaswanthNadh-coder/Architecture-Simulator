-- ═══════════════════════════════════════════════════════════════════════
-- Analytics Enhancement Migration
-- Extends simulation_events with rich performance data
-- ═══════════════════════════════════════════════════════════════════════

-- Add performance columns to simulation_events
ALTER TABLE public.simulation_events
  ADD COLUMN IF NOT EXISTS data_hazards integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS control_hazards integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memory_stalls integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forward_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stall_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpi numeric(6,3),
  ADD COLUMN IF NOT EXISTS cycles integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instructions_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forwarding_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS program_hash text;

-- ═══════════════════════════════════════════════════════════════════════
-- Assignments Table (for LMS-ready Supabase persistence)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.assignments (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    specification text,
    difficulty text CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    starter_code text DEFAULT '',
    blocked_instructions text[] DEFAULT '{}',
    due_date timestamp with time zone,
    time_limit integer,
    rubric jsonb NOT NULL DEFAULT '{"correctness": 50, "efficiency": 30, "style": 20}',
    test_cases jsonb NOT NULL DEFAULT '[]',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Instructors can manage their own assignments
CREATE POLICY "Users can manage their own assignments"
ON public.assignments FOR ALL
USING (auth.uid() = user_id);

-- Index for fetching user's assignments
CREATE INDEX IF NOT EXISTS assignments_user_id_idx ON public.assignments (user_id);

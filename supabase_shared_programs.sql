-- ═══════════════════════════════════════════════════════════════════════
-- Shared Programs Table (Feature: Shareable Permalinks)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.shared_programs (
    id text PRIMARY KEY,                              -- short hash (8 chars)
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    code text NOT NULL,
    title text,
    description text,
    settings jsonb,                                    -- forwarding, branch prediction, ISA
    view_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shared_programs ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared programs (they are public)
CREATE POLICY "Shared programs are publicly readable"
ON public.shared_programs FOR SELECT USING (true);

-- Only authenticated users can create shared programs
CREATE POLICY "Authenticated users can create shared programs"
ON public.shared_programs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared programs
CREATE POLICY "Users can update their own shared programs"
ON public.shared_programs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shared programs
CREATE POLICY "Users can delete their own shared programs"
ON public.shared_programs FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX shared_programs_user_id_idx ON public.shared_programs (user_id);

-- Function to increment view count atomically
CREATE OR REPLACE FUNCTION public.increment_view_count(share_id text)
RETURNS void AS $$
BEGIN
    UPDATE public.shared_programs
    SET view_count = view_count + 1
    WHERE id = share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

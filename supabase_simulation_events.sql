-- Create the simulation_events table
CREATE TABLE public.simulation_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('assemble', 'step')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own events
CREATE POLICY "Users can insert their own events"
ON public.simulation_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to view their own events
CREATE POLICY "Users can view their own events"
ON public.simulation_events
FOR SELECT
USING (auth.uid() = user_id);

-- Add an index to make fetching recent events faster
CREATE INDEX simulation_events_user_id_created_at_idx ON public.simulation_events (user_id, created_at DESC);

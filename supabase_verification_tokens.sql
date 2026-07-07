-- ============================================================
-- Verification Tokens table for custom Resend email verification
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Table to store email verification tokens
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by token
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token
  ON public.verification_tokens(token);

-- Fast lookup by user (for cleanup / resend)
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id
  ON public.verification_tokens(user_id);

-- RLS: only service_role can access (edge functions use service role key)
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies = no access for anon/authenticated roles.
-- Edge functions use the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.

-- Cleanup function: delete expired tokens (run periodically or on insert)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.verification_tokens
  WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup on every new insert
CREATE OR REPLACE TRIGGER trg_cleanup_expired_tokens
  BEFORE INSERT ON public.verification_tokens
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_verification_tokens();

-- ============================================================================
-- Authorization & Security Migration
-- ============================================================================
-- This file contains all SQL statements needed to secure the Architecture
-- Simulator's Supabase database. Run this in the Supabase SQL editor.
--
-- IMPORTANT: Run this AFTER any existing tables have been created.
-- This migration is idempotent — safe to run multiple times.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ════════════════════════════════════════════════════════════════════════════
-- This blocks ALL access until policies are added, which is the safest default.

ALTER TABLE IF EXISTS profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments       ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. CREATE PROJECTS TABLE (if it doesn't exist yet — migrating from localStorage)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  template    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. PROFILES TABLE — RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- Users can only read their own profile
DO $$ BEGIN
  CREATE POLICY "profiles: own read"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users SHOULD NOT update their own profile directly. 
-- RLS denies by default. We explicitly drop any old permissive policies.
-- Safe fields must be updated via the `update_own_profile()` RPC function.
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles: own update safe fields" ON profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Service role gets full access (for Edge Functions)
DO $$ BEGIN
  CREATE POLICY "profiles: service role full access"
    ON profiles FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4. PROJECTS TABLE — RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "projects: own read"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects: own insert"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects: own update"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects: own delete"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 5. ACTIVITY & SIMULATION_EVENTS TABLE — RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- Activity (if the table exists)
DO $$ BEGIN
  CREATE POLICY "activity: own read"
    ON activity FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "activity: own insert"
    ON activity FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;

-- Simulation events
DO $$ BEGIN
  CREATE POLICY "simulation_events: own read"
    ON simulation_events FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "simulation_events: own insert"
    ON simulation_events FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. ASSIGNMENTS TABLE — RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- Assignments: full CRUD for the instructor who owns them
DO $$ BEGIN
  CREATE POLICY "assignments: instructor CRUD"
    ON assignments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 7. SAFE PROFILE UPDATE FUNCTION (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════════════
-- Only allows updating display name and avatar — tier, role, and subscription
-- fields are NOT included, preventing client-side self-promotion.

CREATE OR REPLACE FUNCTION update_own_profile(
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    full_name  = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url)
    -- tier, role, subscription_status, etc. are NOT updatable here
  WHERE id = auth.uid();
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 7b. SAFE PROFILE CREATION FUNCTION (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════════════
-- Creates a safe default profile for users who signed up before the trigger
-- was active, preventing the "Loading profile..." infinite state.

CREATE OR REPLACE FUNCTION create_my_profile(
  p_full_name TEXT DEFAULT NULL
)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_profile profiles;
BEGIN
  INSERT INTO public.profiles (id, full_name, role, tier, subscription_status, program_count)
  VALUES (
    auth.uid(),
    p_full_name,
    'student',
    'free',
    'active',
    0
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING * INTO new_profile;
  
  RETURN new_profile;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 8. PROGRAM COUNT LIMIT TRIGGER (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════════════
-- Enforces tier-based program limits server-side automatically on insert/delete.
-- This replaces the vulnerable client-callable RPCs.

CREATE OR REPLACE FUNCTION maintain_program_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_tier TEXT;
  current_count INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check limit
    SELECT tier INTO user_tier FROM profiles WHERE id = NEW.user_id;
    IF user_tier = 'free' THEN
      SELECT COUNT(*) INTO current_count FROM projects WHERE user_id = NEW.user_id;
      IF current_count >= 10 THEN
        RAISE EXCEPTION 'program_limit_reached';
      END IF;
    END IF;
    -- Update profile count
    UPDATE profiles SET program_count = program_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Safely decrement count, never below 0
    UPDATE profiles SET program_count = GREATEST(0, program_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS projects_limit_trigger ON projects;
CREATE TRIGGER projects_limit_trigger
  BEFORE INSERT OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION maintain_program_count();

-- Clean up any old vulnerable RPCs if they exist
DROP FUNCTION IF EXISTS increment_program_count();
DROP FUNCTION IF EXISTS decrement_program_count();


-- ════════════════════════════════════════════════════════════════════════════
-- 9. FEATURE ACCESS CHECK (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════════════
-- Server-side feature gating for use with FeatureGateStrict component.

CREATE OR REPLACE FUNCTION check_feature_access(feature_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier INTO user_tier FROM profiles WHERE id = auth.uid();

  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Map feature name to required tier
  RETURN CASE feature_name
    WHEN 'analyticsDashboard'   THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'cacheSimulation'      THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'stepBackDebugger'     THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'timingDiagramExport'  THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'pdfExport'            THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'permalinkSharing'     THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'riscvSupport'         THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'courseManagement'     THEN user_tier IN ('institution', 'enterprise')
    WHEN 'autoGrader'           THEN user_tier IN ('institution', 'enterprise')
    WHEN 'plagiarismDetection'  THEN user_tier IN ('institution', 'enterprise')
    WHEN 'lmsIntegration'       THEN user_tier IN ('institution', 'enterprise')
    WHEN 'institutionAdmin'     THEN user_tier IN ('institution', 'enterprise')
    WHEN 'apiAccess'            THEN user_tier = 'enterprise'
    WHEN 'customBranding'       THEN user_tier = 'enterprise'
    WHEN 'privateCloud'         THEN user_tier = 'enterprise'
    ELSE FALSE
  END;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 10. AUTO-CREATE PROFILE ON NEW USER SIGNUP (Google OAuth fix)
-- ════════════════════════════════════════════════════════════════════════════
-- When a user signs up via Google OAuth, the register() function in authStore.ts
-- is never called, so the profile row is never created. This trigger fixes that.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, tier, subscription_status, program_count)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Default to student; can be upgraded to instructor via the app
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'free',
    'active',
    0
  )
  ON CONFLICT (id) DO NOTHING; -- Idempotent — safe to run multiple times
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ════════════════════════════════════════════════════════════════════════════
-- 11. AUTO-UPDATE updated_at TRIGGER FOR PROJECTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- 12. INSTRUCTOR REQUESTS TABLE (for role upgrade flow)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS instructor_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  institution TEXT NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS instructor_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "instructor_requests: own read"
    ON instructor_requests FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "instructor_requests: own insert"
    ON instructor_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only service_role can approve/reject
DO $$ BEGIN
  CREATE POLICY "instructor_requests: service role full"
    ON instructor_requests FOR ALL USING (auth.jwt()->>'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Deploy Edge Functions (start-trial, create-checkout-session, etc.)
-- 2. Test RLS by querying from a client with different user roles
-- 3. Verify Google OAuth signup creates a profile row automatically

-- ============================================================================
-- Architecture Simulator — Additional Schema (Program Limits, Feature Gate, Onboarding)
-- Run AFTER schema_setup.sql + supabase_auth_migration.sql + supabase_institutional_features.sql
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES TABLE — Add onboarding_completed_at column
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. SERVER-SIDE PROGRAM LIMIT ENFORCEMENT
-- ════════════════════════════════════════════════════════════════════════════
-- Free-tier users are capped at 10 programs. Pro+ is unlimited.
-- Called by the frontend before creating a project.

CREATE OR REPLACE FUNCTION increment_program_count()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET program_count = program_count + 1
  WHERE id = auth.uid()
    AND (
      tier IN ('pro', 'institution', 'enterprise')
      OR (tier = 'free' AND program_count < 10)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'program_limit_reached';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_program_count()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET program_count = GREATEST(0, program_count - 1)
  WHERE id = auth.uid();
END;
$$;

-- Auto-maintain program_count via triggers on the projects table
CREATE OR REPLACE FUNCTION maintain_program_count_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check tier-based limits
  PERFORM 1 FROM profiles
  WHERE id = NEW.user_id
    AND (
      tier IN ('pro', 'institution', 'enterprise')
      OR (tier = 'free' AND program_count < 10)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'program_limit_reached';
  END IF;

  UPDATE profiles
  SET program_count = program_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION maintain_program_count_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET program_count = GREATEST(0, program_count - 1)
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$;

-- Drop existing triggers if any, then create fresh
DROP TRIGGER IF EXISTS projects_increment_count ON projects;
CREATE TRIGGER projects_increment_count
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION maintain_program_count_on_insert();

DROP TRIGGER IF EXISTS projects_decrement_count ON projects;
CREATE TRIGGER projects_decrement_count
  AFTER DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION maintain_program_count_on_delete();


-- ════════════════════════════════════════════════════════════════════════════
-- 3. FEATURE ACCESS CHECK (Server-side FeatureGateStrict)
-- ════════════════════════════════════════════════════════════════════════════
-- Returns TRUE if the current user's tier allows access to the named feature.

CREATE OR REPLACE FUNCTION check_feature_access(feature_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier INTO user_tier FROM profiles WHERE id = auth.uid();

  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN CASE feature_name
    WHEN 'analyticsDashboard'  THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'cacheSimulation'     THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'stepBackDebugger'    THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'timingDiagramExport' THEN user_tier IN ('pro', 'institution', 'enterprise')
    WHEN 'courseManagement'    THEN user_tier IN ('institution', 'enterprise')
    WHEN 'autoGrader'          THEN user_tier IN ('institution', 'enterprise')
    WHEN 'plagiarismDetection' THEN user_tier IN ('institution', 'enterprise')
    WHEN 'apiAccess'           THEN user_tier = 'enterprise'
    ELSE FALSE
  END;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4. AUTO-UPDATE updated_at TRIGGER (if not already present)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_touch_updated ON projects;
CREATE TRIGGER projects_touch_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS courses_touch_updated ON courses;
CREATE TRIGGER courses_touch_updated
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS assignments_touch_updated ON assignments;
CREATE TRIGGER assignments_touch_updated
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

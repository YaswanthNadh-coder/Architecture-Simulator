-- DROP existing assignments table to rewrite it with proper institutional relations
DROP VIEW IF EXISTS assignments_student_view;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- 1. COURSES TABLE
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  join_code       TEXT NOT NULL UNIQUE,  -- 6-char alphanumeric, e.g. "CS301A"
  semester        TEXT NOT NULL,         -- e.g. "Fall 2026"
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX courses_join_code_idx ON courses(join_code);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "courses: instructor CRUD"
  ON courses FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "courses: public read active"
  ON courses FOR SELECT
  USING (is_active = TRUE);

-- Join code generation - Postgres function
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous chars (0/O, 1/I)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-generate join code on insert if not provided
CREATE OR REPLACE FUNCTION set_join_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    LOOP
      NEW.join_code := generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM courses WHERE join_code = NEW.join_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_set_join_code
  BEFORE INSERT ON courses
  FOR EACH ROW EXECUTE FUNCTION set_join_code();


-- 2. COURSE ENROLLMENTS TABLE
CREATE TABLE course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)  -- One enrollment per student per course
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for course enrollments
CREATE POLICY "enrollments: student enroll"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "enrollments: student read own"
  ON course_enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "enrollments: instructor reads roster"
  ON course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "enrollments: instructor delete"
  ON course_enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );


-- 3. ASSIGNMENTS TABLE
CREATE TABLE assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id       UUID NOT NULL REFERENCES auth.users(id),
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  difficulty          TEXT DEFAULT 'Intermediate'
                        CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  starter_code        TEXT DEFAULT '',
  blocked_instructions JSONB DEFAULT '[]',
  
  -- Visible test cases: sent to students so they can self-check locally
  visible_test_cases  JSONB DEFAULT '[]',
  
  -- Hidden test cases: ONLY read server-side by the grading Edge Function.
  -- Students NEVER see these. This column must be excluded from all student-facing RLS.
  hidden_test_cases   JSONB DEFAULT '[]',
  
  -- Rubric weights
  rubric_correctness  INT DEFAULT 70,
  rubric_efficiency   INT DEFAULT 20,
  rubric_style        INT DEFAULT 10,
  
  -- Scheduling
  opens_at            TIMESTAMPTZ DEFAULT NOW(),
  due_at              TIMESTAMPTZ,
  late_penalty_pct    INT DEFAULT 0,  -- % penalty per day late (0 = no late submissions)
  
  -- Grading config
  max_attempts        INT DEFAULT -1,  -- -1 = unlimited
  forwarding_enabled  BOOLEAN DEFAULT TRUE,
  max_cycles_limit    INT DEFAULT 10000,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policies for assignments
CREATE POLICY "assignments: instructor CRUD"
  ON assignments FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "assignments: enrolled student read"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
        AND course_enrollments.student_id = auth.uid()
    )
    AND NOW() >= opens_at  -- Assignment must be open
  );


-- Student safe view excluding hidden_test_cases
CREATE OR REPLACE VIEW assignments_student_view AS
SELECT
  id, course_id, instructor_id, title, description, difficulty,
  starter_code, blocked_instructions, visible_test_cases,
  rubric_correctness, rubric_efficiency, rubric_style,
  opens_at, due_at, late_penalty_pct, max_attempts, forwarding_enabled,
  max_cycles_limit, created_at, updated_at
FROM assignments;

GRANT SELECT ON assignments_student_view TO authenticated;


-- 4. SUBMISSIONS TABLE
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  code            TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  attempt_number  INT NOT NULL DEFAULT 1,
  is_late         BOOLEAN DEFAULT FALSE,
  
  -- Grading results (written by Edge Function, not client)
  grading_status  TEXT DEFAULT 'pending'
                    CHECK (grading_status IN ('pending', 'grading', 'graded', 'error')),
  total_score     NUMERIC(5,2),
  max_score       NUMERIC(5,2) DEFAULT 100,
  grade_report    JSONB,      -- Full GradingReport object from AutoGrader
  graded_at       TIMESTAMPTZ,
  
  -- Instructor override
  manual_score    NUMERIC(5,2),
  instructor_note TEXT,
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX submissions_assignment_student_idx ON submissions(assignment_id, student_id);
CREATE INDEX submissions_course_idx ON submissions(course_id);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policies for submissions
CREATE POLICY "submissions: student insert"
  ON submissions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_id = submissions.course_id
        AND student_id = auth.uid()
    )
  );

CREATE POLICY "submissions: student read own"
  ON submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "submissions: instructor read all"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = submissions.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Only Edge Functions or service_role can update submissions (for grading results)
CREATE POLICY "submissions: service_role full"
  ON submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

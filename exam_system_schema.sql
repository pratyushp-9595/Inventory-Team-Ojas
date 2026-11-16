-- ============================================================
-- 11. EXAMINATION SYSTEM MODULE — schemas & RLS policies
-- ============================================================

-- 1. Exams configuration table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'Formula Student Electric Engineering Recruitment Exam',
    description TEXT DEFAULT 'Official Team Ojas Technical Examination',
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    is_active BOOLEAN DEFAULT TRUE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Exam submissions table (stores answers and prevents retakes)
CREATE TABLE IF NOT EXISTS public.exam_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID,
    username TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    time_spent_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Submitted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a candidate username can only submit once
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_submissions_unique_user 
    ON public.exam_submissions (lower(username));

-- 3. Whitelisted candidates table (allows team members to add examinees dynamically)
CREATE TABLE IF NOT EXISTS public.exam_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    has_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_candidates ENABLE ROW LEVEL SECURITY;

-- 4b. Login & Session Activity Log Table
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'AUTHENTICATED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read login logs" ON public.login_logs;
CREATE POLICY "Allow read login logs" ON public.login_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert login logs" ON public.login_logs;
CREATE POLICY "Allow insert login logs" ON public.login_logs FOR INSERT WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_logs;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Allow read exams" ON public.exams;
CREATE POLICY "Allow read exams" ON public.exams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow manage exams" ON public.exams;
CREATE POLICY "Allow manage exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read exam submissions" ON public.exam_submissions;
CREATE POLICY "Allow read exam submissions" ON public.exam_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert exam submissions" ON public.exam_submissions;
CREATE POLICY "Allow insert exam submissions" ON public.exam_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read exam candidates" ON public.exam_candidates;
CREATE POLICY "Allow read exam candidates" ON public.exam_candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow manage exam candidates" ON public.exam_candidates;
CREATE POLICY "Allow manage exam candidates" ON public.exam_candidates FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_candidates;

-- 6. Insert Default Initial Active Exam if table empty
INSERT INTO public.exams (title, description, duration_minutes, is_active, questions)
VALUES (
  'Formula Student Electric Engineering Recruitment Exam',
  'Technical examination covering high voltage powertrain safety, vehicle kinematics, and telemetry systems.',
  45,
  true,
  '[
    {
      "id": 1,
      "topic": "Powertrain & High-Voltage Safety",
      "prompt": "Explain the core operational principle and safety compliance of an accumulator tractive system pre-charge circuit and active discharge circuit (Rule EV 4.11). What specific electrical hazards are mitigated?"
    },
    {
      "id": 2,
      "topic": "Vehicle Dynamics & Suspension Kinematics",
      "prompt": "How does roll center migration influence dynamic lateral load transfer distribution during cornering? Detail how you would tune front vs. rear anti-roll stiffness to alter steady-state understeer gradient."
    },
    {
      "id": 3,
      "topic": "Systems Diagnostics & Telemetry",
      "prompt": "During track testing, telemetry logs intermittent CAN bus error frames followed by unexpected shutdown under peak regenerative braking. Walk through your step-by-step diagnostic workflow."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

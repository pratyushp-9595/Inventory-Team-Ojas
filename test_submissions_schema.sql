-- ============================================================
-- 10. TEST SUBMISSIONS MODULE — test_submissions table & RLS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_name TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting submissions by creation date
CREATE INDEX IF NOT EXISTS idx_test_submissions_created_at 
    ON public.test_submissions (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

-- Policy allowing anonymous applicants to insert their test submissions
DROP POLICY IF EXISTS "Allow anonymous test submissions" ON public.test_submissions;
CREATE POLICY "Allow anonymous test submissions"
    ON public.test_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy allowing authenticated members/staff to read all submissions
DROP POLICY IF EXISTS "Allow read test submissions" ON public.test_submissions;
CREATE POLICY "Allow read test submissions"
    ON public.test_submissions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Enable Realtime for test submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_submissions;
NOTIFY pgrst, 'reload schema';

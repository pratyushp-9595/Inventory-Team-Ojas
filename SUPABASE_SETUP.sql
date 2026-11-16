-- ============================================================
--  SUPABASE SETUP SQL — Team Ojas Racing Inventory
-- ============================================================
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project -> Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query", paste everything below, and click "Run"
-- ============================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'items' table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    system TEXT NOT NULL,
    subsystem TEXT DEFAULT '',
    status TEXT DEFAULT 'free',
    quantity INTEGER DEFAULT 1,
    location TEXT DEFAULT '',
    sublocation TEXT DEFAULT '',
    condition TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    -- Restocking Tracker & Vendor Fields
    in_restock BOOLEAN DEFAULT FALSE,
    restock_qty INTEGER DEFAULT 1,
    vendor_name TEXT DEFAULT '',
    vendor_phone TEXT DEFAULT '',
    vendor_location TEXT DEFAULT '',
    vendor_email TEXT DEFAULT '',
    vendor_notes TEXT DEFAULT '',
    restock_status TEXT DEFAULT 'Pending',
    updated_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS in_restock BOOLEAN DEFAULT FALSE;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS restock_qty INTEGER DEFAULT 1;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS vendor_name TEXT DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS vendor_phone TEXT DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS vendor_location TEXT DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS vendor_email TEXT DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS vendor_notes TEXT DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS restock_status TEXT DEFAULT 'Pending';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT '';

-- Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

-- 3. Create 'subsystems' table
CREATE TABLE IF NOT EXISTS public.subsystems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 'locations' table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create 'sublocations' table
CREATE TABLE IF NOT EXISTS public.sublocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) & allow public access for team inventory
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sublocations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous / authenticated read/write on tables
DROP POLICY IF EXISTS "Public access to items" ON public.items;
CREATE POLICY "Public access to items" ON public.items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to subsystems" ON public.subsystems;
CREATE POLICY "Public access to subsystems" ON public.subsystems FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to locations" ON public.locations;
CREATE POLICY "Public access to locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to sublocations" ON public.sublocations;
CREATE POLICY "Public access to sublocations" ON public.sublocations FOR ALL USING (true) WITH CHECK (true);

-- 7. Realtime setup: Enable publication for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subsystems;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sublocations;

-- 8. Storage bucket setup for item-images
-- In Supabase dashboard: Go to Storage -> Create bucket named "item-images" and toggle "Public bucket" ON.
-- Or run:
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow anyone with anon key to upload and view images in 'item-images'
DROP POLICY IF EXISTS "Public item images read" ON storage.objects;
CREATE POLICY "Public item images read" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Public item images insert" ON storage.objects;
CREATE POLICY "Public item images insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Public item images delete" ON storage.objects;
CREATE POLICY "Public item images delete" ON storage.objects
FOR DELETE USING (bucket_id = 'item-images');

-- ============================================================
-- 9. HANDBOOK MODULE — handbook_tasks table & RLS policies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.handbook_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL,
    task_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    questions TEXT NOT NULL,
    links TEXT,
    is_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handbook_tasks_dept_order 
    ON public.handbook_tasks (department, task_number ASC);

ALTER TABLE public.handbook_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to handbook_tasks" ON public.handbook_tasks;
CREATE POLICY "Allow anonymous read access to handbook_tasks" 
    ON public.handbook_tasks
    FOR SELECT 
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow public write access to handbook_tasks" ON public.handbook_tasks;
CREATE POLICY "Allow public write access to handbook_tasks" 
    ON public.handbook_tasks
    FOR ALL 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.handbook_tasks;

-- ============================================================
-- 10. TEST SUBMISSIONS MODULE — test_submissions table & RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_name TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_submissions_created_at 
    ON public.test_submissions (created_at DESC);

ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous test submissions" ON public.test_submissions;
CREATE POLICY "Allow anonymous test submissions"
    ON public.test_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read test submissions" ON public.test_submissions;
CREATE POLICY "Allow read test submissions"
    ON public.test_submissions
    FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.test_submissions;

-- ============================================================
-- 11. EXAMINATION SYSTEM MODULE — schemas & RLS policies
-- ============================================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_submissions_unique_user 
    ON public.exam_submissions (lower(username));

CREATE TABLE IF NOT EXISTS public.exam_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    has_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_candidates ENABLE ROW LEVEL SECURITY;

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

ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_candidates;




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

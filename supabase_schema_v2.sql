-- -------------------------------------------------------------
-- UPDATE SCHEMA SIMAGANG V2
-- -------------------------------------------------------------

-- 1. Tabel Manajemen Mitra (partners)
CREATE TABLE public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  quota INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Policy Partners: Semua bisa melihat, hanya admin yang bisa kelola
CREATE POLICY "Anyone can view partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Admin can completely manage partners" ON public.partners FOR ALL USING (public.is_admin());


-- 2. Update tabel internships
-- Menambahkan relasi ke tabel partners (opsional, untuk sementara company_name tetap dipertahankan atau bisa menggunakan partner_id)
ALTER TABLE public.internships ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;


-- 3. Tabel Presensi (attendances)
CREATE TABLE public.attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Policy Attendances
CREATE POLICY "Students can view and insert their own attendance" 
ON public.attendances FOR ALL 
USING (student_id = auth.uid()) 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Dosen can view assigned student attendances" 
ON public.attendances FOR SELECT 
USING (
  student_id IN (
    SELECT student_id FROM public.internships WHERE dosen_id = auth.uid() AND status IN ('approved', 'finished')
  )
);

CREATE POLICY "Admin can view all attendances" ON public.attendances FOR SELECT USING (public.is_admin());


-- 4. Tabel Laporan Bulanan (monthly_reports)
CREATE TABLE public.monthly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  month_number INTEGER CHECK (month_number >= 1 AND month_number <= 6) NOT NULL,
  file_url TEXT NOT NULL,
  note_dosen TEXT,
  status TEXT CHECK (status IN ('submitted', 'approved', 'revision')) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, month_number) -- Mahasiswa hanya bisa submit 1 laporan per bulan ke-n
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Policy Monthly Reports
CREATE POLICY "Students can manage their own monthly reports" 
ON public.monthly_reports FOR ALL 
USING (student_id = auth.uid()) 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Dosen can manage assigned student monthly reports" 
ON public.monthly_reports FOR ALL 
USING (
  student_id IN (
    SELECT student_id FROM public.internships WHERE dosen_id = auth.uid() AND status IN ('approved', 'finished')
  )
);

CREATE POLICY "Admin can view all monthly reports" ON public.monthly_reports FOR SELECT USING (public.is_admin());


-- 5. Tabel Laporan Akhir (final_reports)
CREATE TABLE public.final_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  note_dosen TEXT,
  status TEXT CHECK (status IN ('submitted', 'approved', 'revision')) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id) -- Hanya 1 laporan akhir per mahasiswa
);

ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

-- Policy Final Reports
CREATE POLICY "Students can manage their own final reports" 
ON public.final_reports FOR ALL 
USING (student_id = auth.uid()) 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Dosen can manage assigned student final reports" 
ON public.final_reports FOR ALL 
USING (
  student_id IN (
    SELECT student_id FROM public.internships WHERE dosen_id = auth.uid() AND status IN ('approved', 'finished')
  )
);

CREATE POLICY "Admin can view all final reports" ON public.final_reports FOR SELECT USING (public.is_admin());

-- -------------------------------------------------------------
-- PENTING UNTUK STORAGE:
-- Anda perlu membuat Bucket secara manual di antarmuka Supabase 
-- bernama "simagang-files" dan atur agar "Public" atau buat 
-- RLS Policy Storage secara manual.
-- -------------------------------------------------------------

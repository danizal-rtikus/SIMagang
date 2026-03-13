-- Eksekusi kode ini di SQL Editor Supabase Anda

-- 1. Buat tabel users_profile
CREATE TABLE public.users_profile (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'dosen', 'mahasiswa')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mengaktifkan RLS
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk users_profile
-- - Setiap user bisa melihat datanya sendiri
CREATE POLICY "Users can view their own profile" 
ON public.users_profile FOR SELECT 
USING (auth.uid() = id);
-- - Admin dapat melihat semua data
CREATE POLICY "Admin can view all profiles" 
ON public.users_profile FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'admin'
  )
);
-- - Insert dari trigger saat registrasi (dimungkinkan melalui trigger bypass RLS di auth, ini hanya optional jika dari client)
CREATE POLICY "Users can insert their own profile" 
ON public.users_profile FOR INSERT 
WITH CHECK (auth.uid() = id);


-- 2. Buat tabel internships
CREATE TABLE public.internships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  dosen_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'finished')) DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk internships
-- - Student bisa melihat pengajuannya sendiri
CREATE POLICY "Students can view their own internships" 
ON public.internships FOR SELECT 
USING (student_id = auth.uid());
-- - Dosen dapat melihat pengajuan mahasiswa bimbingannya
CREATE POLICY "Dosen can view assigned internships" 
ON public.internships FOR SELECT 
USING (dosen_id = auth.uid());
-- - Admin dapat melihat dan mengelola semua pengajuan
CREATE POLICY "Admin can completely manage internships" 
ON public.internships FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'admin'
  )
);
-- - Student dapat insert
CREATE POLICY "Students can insert internships" 
ON public.internships FOR INSERT 
WITH CHECK (student_id = auth.uid());


-- 3. Buat tabel logbooks
CREATE TABLE public.logbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id UUID REFERENCES public.internships(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'revision')) DEFAULT 'draft',
  dosen_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.logbooks ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk logbooks
-- (Asumsi: policy yang lebih kompleks bisa ditambahkan sesuai use case, ini dasar yang cukup aman)
CREATE POLICY "Student can manage their logbooks" 
ON public.logbooks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.internships 
    WHERE id = logbooks.internship_id AND student_id = auth.uid()
  )
);

CREATE POLICY "Dosen can manage their assigned logbooks" 
ON public.logbooks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.internships 
    WHERE id = logbooks.internship_id AND dosen_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all logbooks" 
ON public.logbooks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger untuk sync auth.users dengan users_profile akan disiapkan secara custom jika dibutuhkan, 
-- namun untuk awal, pendaftaran bisa langsung insert ke users_profile secara bersamaan dari client 
-- dengan bantuan auth function atau prosedur.

-- ==========================================================
-- SCRIPT PERBAIKAN DATABASE SIMAGANG 
-- (Jalankan ini di Supabase SQL Editor Anda)
-- ==========================================================

-- 1. PERBAIKAN RLS TABEL ATTENDANCES
-- Menghapus policy FOR ALL yang menyebabkan error sat Insert
DROP POLICY IF EXISTS "Students can view and insert their own attendance" ON public.attendances;

-- Membuat policy spesifik untuk SELECT dan INSERT 
CREATE POLICY "Students can insert their own attendance" 
ON public.attendances FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own attendance" 
ON public.attendances FOR SELECT 
USING (student_id = auth.uid());

-- 2. MEMBUAT TABEL DAILY REPORTS (Logbook Harian Mahasiswa)
-- Tabel ini digunakan oleh komponen DailyReports.jsx (Mahasiswa & Dosen) 
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity TEXT NOT NULL,
  status TEXT CHECK (status IN ('submitted', 'approved', 'revision')) DEFAULT 'submitted',
  note_dosen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mengaktifkan RLS untuk daily_reports
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Policy untuk daily_reports
CREATE POLICY "Students can manage their own daily reports" 
ON public.daily_reports FOR ALL 
USING (student_id = auth.uid()) 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Dosen can view and review assigned daily reports" 
ON public.daily_reports FOR ALL 
USING (
  student_id IN (
    SELECT student_id FROM public.internships WHERE dosen_id = auth.uid() AND status IN ('approved', 'finished')
  )
);

CREATE POLICY "Admin can view all daily reports" 
ON public.daily_reports FOR SELECT 
USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V11 – Ploting Prodi Mahasiswa & Pengaturan Kaprodi
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tambahkan kolom prodi ke tabel users_profile
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS prodi TEXT DEFAULT 'Sistem Informasi';

-- 2. Buat tabel prodi_settings untuk menyimpan Nama & NIDN Kaprodi per Prodi
CREATE TABLE IF NOT EXISTS public.prodi_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prodi_name TEXT UNIQUE NOT NULL,
    kaprodi_name TEXT DEFAULT '',
    kaprodi_nidn TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policy untuk prodi_settings
ALTER TABLE public.prodi_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view prodi_settings" ON public.prodi_settings;
CREATE POLICY "Public view prodi_settings" ON public.prodi_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin modify prodi_settings" ON public.prodi_settings;
CREATE POLICY "Admin modify prodi_settings" ON public.prodi_settings FOR ALL TO authenticated USING (true);

-- 4. Seed data awal untuk 4 Program Studi
INSERT INTO public.prodi_settings (prodi_name, kaprodi_name, kaprodi_nidn) VALUES
    ('Sistem Informasi', 'Kaprodi Sistem Informasi', '0601018801'),
    ('Teknik Informatika', 'Kaprodi Teknik Informatika', '0602028802'),
    ('Desain Komunikasi Visual', 'Kaprodi DKV', '0603038803'),
    ('Komputerisasi Akuntansi', 'Kaprodi Komputerisasi Akuntansi', '0604048804')
ON CONFLICT (prodi_name) DO NOTHING;

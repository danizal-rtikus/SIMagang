-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V12 – Fix Role Constraint (Mitra Support) & User Profile Columns
-- Jalankan kode ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Perbarui Constraint CHECK 'role' agar mendukung role 'mitra' (Pendamping Lapangan)
ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE public.users_profile ADD CONSTRAINT users_profile_role_check CHECK (role IN ('admin', 'dosen', 'mahasiswa', 'mitra'));

-- 2. Pastikan kolom 'email' dan 'prodi' ada di tabel users_profile
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS prodi TEXT DEFAULT 'Sistem Informasi';

-- 3. Sinkronkan email dari auth.users ke users_profile (Opsional)
DO $$
BEGIN
    UPDATE public.users_profile up
    SET email = au.email
    FROM auth.users au
    WHERE up.id = au.id AND (up.email IS NULL OR up.email = '');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

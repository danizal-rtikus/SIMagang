-- -------------------------------------------------------------
-- UPDATE SCHEMA SIMAGANG V4 (Profile)
-- -------------------------------------------------------------

-- Menambahkan kolom URL foto profil di tabel users_profile
ALTER TABLE public.users_profile 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

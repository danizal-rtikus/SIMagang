-- Script untuk menambahkan kolom 'identifier' ke pengguna
-- Berfungsi untuk menyimpan NIM (Mahasiswa) atau NIDN/NUPTK (Dosen)

ALTER TABLE public.users_profile 
ADD COLUMN IF NOT EXISTS identifier TEXT;

-- Anda dapat mengeksekusi ini di SQL Editor Supabase Anda

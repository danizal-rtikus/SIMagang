-- Solusi untuk masalah "infinite recursion detected in policy for relation 'users_profile'"

-- 1. Buat fungsi bantuan (helper) untuk memeriksa apakah user saat ini adalah admin
-- Fungsi ini menggunakan SECURITY DEFINER sehingga mengabaikan RLS saat mengeksekusi isinya
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Hapus kebijakan (policy) lama yang menyebabkan rekursi
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.users_profile;

-- 3. Ganti dengan kebijakan baru yang menggunakan fungsi bantuan tersebut
CREATE POLICY "Admin can view all profiles" 
ON public.users_profile FOR ALL 
USING ( public.is_admin() );

-- 4. Opsional, tetapi disarankan: Perbarui juga tabel lain agar konsisten menghindari masalah serupa
DROP POLICY IF EXISTS "Admin can completely manage internships" ON public.internships;
CREATE POLICY "Admin can completely manage internships" 
ON public.internships FOR ALL 
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admin can manage all logbooks" ON public.logbooks;
CREATE POLICY "Admin can manage all logbooks" 
ON public.logbooks FOR ALL 
USING ( public.is_admin() );

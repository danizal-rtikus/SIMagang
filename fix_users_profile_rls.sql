-- Solusi Isu "Tanpa Nama" karena RLS pada users_profile terlalu ketat
-- Sebelumnya: "Users can view their own profile"
-- Akibatnya, Dosen kesulitan mengambil field full_name milik mahasiswa dari hasil relasi JOIN.

-- Hapus kebijakan yang lama
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_profile;

-- Buat kebijakan baru agar setiap pengguna (Authenticated) bebas melihat ringkasan profil pengguna lain
CREATE POLICY "Authenticated users can view all profiles for SELECT" 
ON public.users_profile FOR SELECT 
USING (auth.role() = 'authenticated');

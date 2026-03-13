-- ==========================================================
-- SCRIPT PERBAIKAN STORAGE BUCKET SIMAGANG 
-- (Jalankan ini di Supabase SQL Editor Anda)
-- ==========================================================

-- 1. Membuat Bucket "simagang-files" (jika belum ada) dan set menjadi Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('simagang-files', 'simagang-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Menghapus Policy Storage lama (jika ada) untuk menghindari duplikasi
DROP POLICY IF EXISTS "Public View Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Storage" ON storage.objects;

-- 3. Membuat Policy untuk Membaca (SELECT) -> Semua orang bisa membaca file public
CREATE POLICY "Public View Storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'simagang-files');

-- 4. Membuat Policy untuk Menambah (INSERT) -> User yang login bisa mengupload file
CREATE POLICY "Authenticated Insert Storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'simagang-files' 
  AND auth.role() = 'authenticated'
);

-- 5. Membuat Policy untuk Mengubah (UPDATE) -> User yang login bisa mengubah file mereka
CREATE POLICY "Authenticated Update Storage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'simagang-files' 
  AND auth.role() = 'authenticated'
);

-- 6. Membuat Policy untuk Menghapus (DELETE) -> User bisa menghapus file
CREATE POLICY "Authenticated Delete Storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'simagang-files' 
  AND auth.role() = 'authenticated'
);

-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V9 – Fitur Sesi Penilaian & Pembatasan Akses Nilai
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tambahkan kolom penilaian_status ke tabel internships (jika belum ada)
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS penilaian_status TEXT DEFAULT 'open' CHECK (penilaian_status IN ('open', 'closed'));

-- 2. Tambahkan policy untuk mengizinkan Dosen memperbarui status penilaian di internships bimbingannya
DROP POLICY IF EXISTS "Dosen can update internship penilaian_status" ON public.internships;
CREATE POLICY "Dosen can update internship penilaian_status" ON public.internships
    FOR UPDATE TO authenticated
    USING (dosen_id = auth.uid())
    WITH CHECK (dosen_id = auth.uid());

-- 3. Perbarui RLS pada penilaian_magang agar tidak bisa di-insert/update jika statusnya sudah closed
DROP POLICY IF EXISTS "dosen insert nilai" ON public.penilaian_magang;
DROP POLICY IF EXISTS "dosen update nilai" ON public.penilaian_magang;

CREATE POLICY "dosen insert nilai" ON public.penilaian_magang 
    FOR INSERT TO authenticated
    WITH CHECK (
        dosen_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.internships 
            WHERE id = internship_id AND penilaian_status = 'open'
        )
    );

CREATE POLICY "dosen update nilai" ON public.penilaian_magang 
    FOR UPDATE TO authenticated
    USING (dosen_id = auth.uid())
    WITH CHECK (
        dosen_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.internships 
            WHERE id = internship_id AND penilaian_status = 'open'
        )
    );

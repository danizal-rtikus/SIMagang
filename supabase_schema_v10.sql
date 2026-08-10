-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V10 – Dual Mentor, Pembobotan 60:40 & 5/8 Skala Grading
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tambahkan mitra_id (Pendamping Lapangan) ke tabel internships
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS mitra_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL;

-- 2. Tambahkan skala_penilaian ke tabel periode_akademik (default '5')
ALTER TABLE public.periode_akademik ADD COLUMN IF NOT EXISTS skala_penilaian TEXT DEFAULT '5' CHECK (skala_penilaian IN ('5', '8'));

-- 3. Tambahkan evaluator_role ke tabel penilaian_magang ('dosen' atau 'mitra')
ALTER TABLE public.penilaian_magang ADD COLUMN IF NOT EXISTS evaluator_role TEXT DEFAULT 'dosen' CHECK (evaluator_role IN ('dosen', 'mitra'));

-- 4. Hapus unique constraint lama jika ada dan buat unique constraint baru untuk (internship_id, butir_id, evaluator_role)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'penilaian_magang_internship_id_butir_id_key'
    ) THEN
        ALTER TABLE public.penilaian_magang DROP CONSTRAINT penilaian_magang_internship_id_butir_id_key;
    END IF;
END $$;

ALTER TABLE public.penilaian_magang DROP CONSTRAINT IF EXISTS penilaian_magang_unique;
ALTER TABLE public.penilaian_magang ADD CONSTRAINT penilaian_magang_unique UNIQUE (internship_id, butir_id, evaluator_role);

-- 5. RLS Policy untuk Mitra pada internships
DROP POLICY IF EXISTS "Mitra can view assigned internships" ON public.internships;
CREATE POLICY "Mitra can view assigned internships" ON public.internships FOR SELECT
    USING (mitra_id = auth.uid());

-- 6. RLS Policy untuk Mitra & Dosen pada penilaian_magang
DROP POLICY IF EXISTS "dosen insert nilai" ON public.penilaian_magang;
DROP POLICY IF EXISTS "dosen update nilai" ON public.penilaian_magang;
DROP POLICY IF EXISTS "evaluator insert nilai" ON public.penilaian_magang;
DROP POLICY IF EXISTS "evaluator update nilai" ON public.penilaian_magang;

CREATE POLICY "evaluator insert nilai" ON public.penilaian_magang
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            (evaluator_role = 'dosen' AND dosen_id = auth.uid()) OR
            (evaluator_role = 'mitra' AND EXISTS (SELECT 1 FROM public.internships WHERE id = internship_id AND mitra_id = auth.uid()))
        ) AND
        EXISTS (
            SELECT 1 FROM public.internships
            WHERE id = internship_id AND penilaian_status = 'open'
        )
    );

CREATE POLICY "evaluator update nilai" ON public.penilaian_magang
    FOR UPDATE TO authenticated
    USING (
        (evaluator_role = 'dosen' AND dosen_id = auth.uid()) OR
        (evaluator_role = 'mitra' AND EXISTS (SELECT 1 FROM public.internships WHERE id = internship_id AND mitra_id = auth.uid()))
    )
    WITH CHECK (
        (
            (evaluator_role = 'dosen' AND dosen_id = auth.uid()) OR
            (evaluator_role = 'mitra' AND EXISTS (SELECT 1 FROM public.internships WHERE id = internship_id AND mitra_id = auth.uid()))
        ) AND
        EXISTS (
            SELECT 1 FROM public.internships
            WHERE id = internship_id AND penilaian_status = 'open'
        )
    );

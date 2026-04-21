-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V8 – Sistem Periode Akademik (Ganjil / Genap)
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabel Periode Akademik
CREATE TABLE IF NOT EXISTS periode_akademik (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama             text NOT NULL,            -- "Ganjil 2024/2025"
    tahun_akademik   text NOT NULL,            -- "2024/2025"
    semester         text NOT NULL CHECK (semester IN ('ganjil','genap')),
    status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    tanggal_mulai    date,
    tanggal_selesai  date,
    keterangan       text,
    created_at       timestamptz DEFAULT now(),
    archived_at      timestamptz
);

-- Pastikan hanya 1 periode aktif dalam satu waktu
CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_active_periode
    ON periode_akademik (status)
    WHERE status = 'active';

-- 2. Tambah kolom periode_id ke internships (jika belum ada)
ALTER TABLE internships ADD COLUMN IF NOT EXISTS periode_id uuid REFERENCES periode_akademik(id);

-- 3. Migrasi data lama: buat periode default lalu assign ke internships lama
DO $$
DECLARE
    default_periode_id uuid;
BEGIN
    -- Buat periode default untuk data lama (hanya jika belum ada data di periode_akademik)
    IF NOT EXISTS (SELECT 1 FROM periode_akademik LIMIT 1) THEN
        INSERT INTO periode_akademik (nama, tahun_akademik, semester, status, tanggal_mulai)
        VALUES ('Ganjil 2024/2025', '2024/2025', 'ganjil', 'active', '2024-09-01')
        RETURNING id INTO default_periode_id;

        -- Assign semua internship lama ke periode default ini
        UPDATE internships SET periode_id = default_periode_id WHERE periode_id IS NULL;
    END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE periode_akademik ENABLE ROW LEVEL SECURITY;

-- Semua user bisa baca periode
CREATE POLICY "read periode"
    ON periode_akademik FOR SELECT TO authenticated USING (true);

-- Hanya admin bisa CRUD
CREATE POLICY "admin manage periode"
    ON periode_akademik FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

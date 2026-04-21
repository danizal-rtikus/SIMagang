-- ═══════════════════════════════════════════════════════════
-- SCHEMA V7 – Sistem Penilaian Magang
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Aspek Penilaian (kategori / kelompok penilaian)
CREATE TABLE IF NOT EXISTS aspek_penilaian (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor       text NOT NULL,          -- "I", "II", "III", dst.
    nama        text NOT NULL,          -- "Aspek Personal", dst.
    urutan      int  NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);

-- 2. Butir Penilaian (item di dalam setiap aspek)
CREATE TABLE IF NOT EXISTS butir_penilaian (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aspek_id    uuid NOT NULL REFERENCES aspek_penilaian(id) ON DELETE CASCADE,
    nomor       int  NOT NULL DEFAULT 1,    -- 1, 2, 3 ...
    deskripsi   text NOT NULL,
    urutan      int  NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);

-- 3. Nilai per-butir per-mahasiswa (diisi oleh Dosen)
CREATE TABLE IF NOT EXISTS penilaian_magang (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id   uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    student_id      uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    dosen_id        uuid NOT NULL REFERENCES users_profile(id),
    butir_id        uuid NOT NULL REFERENCES butir_penilaian(id) ON DELETE CASCADE,
    nilai           int  NOT NULL CHECK (nilai BETWEEN 1 AND 5),   -- 1=SK 2=K 3=C 4=B 5=BS
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (internship_id, butir_id)   -- satu nilai per butir per penempatan
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE aspek_penilaian  ENABLE ROW LEVEL SECURITY;
ALTER TABLE butir_penilaian  ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_magang ENABLE ROW LEVEL SECURITY;

-- Semua user terauthentikasi boleh baca aspek & butir
CREATE POLICY "read aspek"  ON aspek_penilaian  FOR SELECT TO authenticated USING (true);
CREATE POLICY "read butir"  ON butir_penilaian  FOR SELECT TO authenticated USING (true);

-- Hanya admin yang bisa CRUD aspek & butir
CREATE POLICY "admin aspek" ON aspek_penilaian  FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin butir" ON butir_penilaian  FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

-- Dosen bisa insert/update nilai untuk mahasiswa bimbingannya
CREATE POLICY "dosen insert nilai" ON penilaian_magang FOR INSERT TO authenticated
    WITH CHECK (dosen_id = auth.uid());

CREATE POLICY "dosen update nilai" ON penilaian_magang FOR UPDATE TO authenticated
    USING (dosen_id = auth.uid())
    WITH CHECK (dosen_id = auth.uid());

-- Semua user terauthentikasi bisa baca nilai (filter di aplikasi)
CREATE POLICY "read nilai" ON penilaian_magang FOR SELECT TO authenticated USING (true);

-- Admin bisa hapus
CREATE POLICY "admin delete nilai" ON penilaian_magang FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

-- ── Seed Data Default (sesuai gambar) ────────────────────────
INSERT INTO aspek_penilaian (nomor, nama, urutan) VALUES
    ('I',   'Aspek Personal',                 1),
    ('II',  'Aspek Sosial',                   2),
    ('III', 'Aspek Persiapan Kerja',           3),
    ('IV',  'Aspek Pelaksanaan Kerja',         4),
    ('V',   'Aspek Pemaparan dan Presentasi', 5)
ON CONFLICT DO NOTHING;

-- Butir untuk setiap aspek (diisi manual setelah aspek disisipkan)
-- Jalankan blok ini setelah seed aspek di atas berhasil
DO $$
DECLARE
    asp1 uuid; asp2 uuid; asp3 uuid; asp4 uuid; asp5 uuid;
BEGIN
    SELECT id INTO asp1 FROM aspek_penilaian WHERE nomor = 'I'   LIMIT 1;
    SELECT id INTO asp2 FROM aspek_penilaian WHERE nomor = 'II'  LIMIT 1;
    SELECT id INTO asp3 FROM aspek_penilaian WHERE nomor = 'III' LIMIT 1;
    SELECT id INTO asp4 FROM aspek_penilaian WHERE nomor = 'IV'  LIMIT 1;
    SELECT id INTO asp5 FROM aspek_penilaian WHERE nomor = 'V'   LIMIT 1;

    INSERT INTO butir_penilaian (aspek_id, nomor, deskripsi, urutan) VALUES
        (asp1, 1, 'Kedisiplinan (ketaatan pada aturan/prosedur instansi)', 1),
        (asp1, 2, 'Kejujuran dalam bekerja', 2),
        (asp1, 3, 'Tanggung jawab terhadap pekerjaan', 3),
        (asp1, 4, 'Ketelitian/kecermatan dalam bekerja', 4),
        (asp1, 5, 'Kepemimpinan/inisiatif', 5),
        (asp2, 1, 'Komunikasi dengan pimpinan dan pembimbing lapangan', 1),
        (asp2, 2, 'Komunikasi dan kerjasama dengan karyawan instansi setempat', 2),
        (asp2, 3, 'Kerjasama dengan karyawan instansi', 3),
        (asp2, 4, 'Kerjasama dengan rekan sekelompok', 4),
        (asp3, 1, 'Pemahaman terhadap petunjuk kerja', 1),
        (asp3, 2, 'Kemampuan menyusun rencana kerja secara berkala sesuai dengan prosedur', 2),
        (asp4, 1, 'Kemampuan melaksanakan pekerjaan', 1),
        (asp4, 2, 'Kesesuaian hasil pekerjaan yang dicapai dengan perencanaan hasil kerja', 2),
        (asp4, 3, 'Keterampilan dalam menggunakan alat bantu/perangkat keras dalam bekerja', 3),
        (asp4, 4, 'Keterampilan memecahkan masalah dalam bekerja', 4),
        (asp4, 5, 'Keterampilan membuat analisis terhadap hasil kerja', 5),
        (asp5, 1, 'Sikap', 1),
        (asp5, 2, 'Materi Presentasi', 2),
        (asp5, 3, 'Penguasaan Materi', 3),
        (asp5, 4, 'Cara Penyampaian Materi', 4)
    ON CONFLICT DO NOTHING;
END $$;

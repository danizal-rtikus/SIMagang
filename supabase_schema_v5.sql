-- Tabel untuk template laporan (dikelola admin)
CREATE TABLE IF NOT EXISTS report_templates (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type        varchar(20) NOT NULL CHECK (type IN ('monthly', 'final')),
    title       varchar(255) NOT NULL,
    description text,
    file_url    text,
    created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Semua user yang login bisa BACA template
CREATE POLICY "semua user bisa baca template"
    ON report_templates FOR SELECT
    TO authenticated USING (true);

-- Hanya admin (berdasarkan users_profile.role) yang bisa INSERT/UPDATE/DELETE
CREATE POLICY "admin bisa kelola template"
    ON report_templates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users_profile
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

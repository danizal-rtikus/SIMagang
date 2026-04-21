-- Tambah kolom project_link ke tabel daily_reports
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS project_link text;

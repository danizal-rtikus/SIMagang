-- ═══════════════════════════════════════════════════════════════
-- SCHEMA V8b – History Revisi Laporan
-- Jalankan di Supabase SQL Editor setelah v8
-- ═══════════════════════════════════════════════════════════════

-- Tambah kolom revision_history ke monthly_reports dan final_reports
-- Format: [{ round: 1, note: "...", date: "2024-10-01T..." }, ...]
ALTER TABLE monthly_reports ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE final_reports    ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb;

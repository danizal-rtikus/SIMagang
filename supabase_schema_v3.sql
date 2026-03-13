-- -------------------------------------------------------------
-- UPDATE SCHEMA SIMAGANG V3 - FITUR PENGUMUMAN
-- -------------------------------------------------------------

CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'mahasiswa', 'dosen')) DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy Announcements
-- Hanya admin yang bisa mengubah dan membuat
CREATE POLICY "Admin can completely manage announcements" 
ON public.announcements FOR ALL 
USING (public.is_admin());

-- Dosen & Mahasiswa hanya bisa melihat pengumuman yang aktif
-- Serta hanya melihat sesuai role masing-masing (atau yang 'all')
CREATE POLICY "Users can view active announcements for their role" 
ON public.announcements FOR SELECT 
USING (
  is_active = true 
  AND (
    target_role = 'all' 
    OR target_role = (SELECT role FROM public.users_profile WHERE id = auth.uid())
  )
);

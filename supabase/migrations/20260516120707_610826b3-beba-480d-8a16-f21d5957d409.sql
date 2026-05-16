-- Create members table for board of directors and executive members
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('board','executive')),
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT,
  position_ar TEXT NOT NULL,
  position_en TEXT,
  bio_ar TEXT,
  bio_en TEXT,
  photo_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public can read members
CREATE POLICY "Members are publicly readable"
ON public.members FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can manage members
CREATE POLICY "Admins can insert members"
ON public.members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update members"
ON public.members FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER members_set_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_members_category_order ON public.members(category, display_order);
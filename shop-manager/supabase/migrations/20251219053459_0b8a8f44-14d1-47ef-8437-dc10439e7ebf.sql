-- Create inspection_deficiencies table for storing deficiency details
CREATE TABLE public.inspection_deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.equipment_inspections(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status INTEGER NOT NULL CHECK (status IN (1, 2, 3)), -- 1=Red/Urgent, 2=Yellow/Attention, 3=Green/OK
  reason TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}',
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_inspection_deficiencies_inspection_id ON public.inspection_deficiencies(inspection_id);
CREATE INDEX idx_inspection_deficiencies_shop_id ON public.inspection_deficiencies(shop_id);

-- Enable RLS
ALTER TABLE public.inspection_deficiencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view deficiencies in their shop"
ON public.inspection_deficiencies FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create deficiencies in their shop"
ON public.inspection_deficiencies FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update deficiencies in their shop"
ON public.inspection_deficiencies FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete deficiencies in their shop"
ON public.inspection_deficiencies FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create storage bucket for deficiency media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-deficiency-media',
  'inspection-deficiency-media',
  true,
  52428800, -- 50MB limit for videos
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- Storage policies for deficiency media
CREATE POLICY "Anyone can view deficiency media"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-deficiency-media');

CREATE POLICY "Authenticated users can upload deficiency media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-deficiency-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own deficiency media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'inspection-deficiency-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own deficiency media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspection-deficiency-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger for updated_at
CREATE TRIGGER update_inspection_deficiencies_updated_at
BEFORE UPDATE ON public.inspection_deficiencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
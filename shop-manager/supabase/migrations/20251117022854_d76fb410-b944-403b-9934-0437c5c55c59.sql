-- Create storage bucket for boat inspection photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'boat-inspection-photos',
  'boat-inspection-photos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for boat-inspection-photos bucket
CREATE POLICY "Users can view boat inspection photos from their shop"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'boat-inspection-photos' AND
    auth.uid() IN (
      SELECT p.id FROM public.profiles p
      JOIN public.boat_inspections bi ON bi.shop_id = p.shop_id
      WHERE (storage.foldername(name))[1] = bi.id::text
    )
  );

CREATE POLICY "Users can upload boat inspection photos for their shop"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'boat-inspection-photos' AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE shop_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update their shop's boat inspection photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'boat-inspection-photos' AND
    auth.uid() IN (
      SELECT p.id FROM public.profiles p
      JOIN public.boat_inspections bi ON bi.shop_id = p.shop_id
      WHERE (storage.foldername(name))[1] = bi.id::text
    )
  );

CREATE POLICY "Users can delete their shop's boat inspection photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'boat-inspection-photos' AND
    auth.uid() IN (
      SELECT p.id FROM public.profiles p
      JOIN public.boat_inspections bi ON bi.shop_id = p.shop_id
      WHERE (storage.foldername(name))[1] = bi.id::text
    )
  );
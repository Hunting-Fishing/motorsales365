-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true);

-- Create policies for logo uploads
CREATE POLICY "Anyone can view logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
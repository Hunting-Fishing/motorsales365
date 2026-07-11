-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true);

-- Create storage policies for company assets
CREATE POLICY "Authenticated users can upload company assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Company assets are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update their company assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their company assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);
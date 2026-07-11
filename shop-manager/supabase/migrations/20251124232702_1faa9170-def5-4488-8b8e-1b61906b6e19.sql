-- Drop any existing policies from previous attempts
DROP POLICY IF EXISTS "Users can view their chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their chat rooms" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can view media in their chat rooms" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload media to their chat rooms" ON storage.objects;

-- Delete bucket if exists to start fresh
DELETE FROM storage.buckets WHERE id = 'chat-media';

-- Create storage bucket for chat media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'application/pdf'
  ]
);

-- RLS policies for chat media bucket
CREATE POLICY "Chat participants can view room media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.user_id = auth.uid()::text
    AND cp.room_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Chat participants can upload room media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.user_id = auth.uid()::text
    AND cp.room_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "File owners can update their uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-media' AND
  owner = auth.uid()
);

CREATE POLICY "File owners can delete their uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-media' AND
  owner = auth.uid()
);
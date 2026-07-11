-- Update existing documents to use proper user names instead of emails
UPDATE public.documents
SET created_by_name = (
  SELECT CASE 
    WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
    THEN TRIM(p.first_name || ' ' || p.last_name)
    WHEN p.first_name IS NOT NULL 
    THEN p.first_name
    WHEN p.last_name IS NOT NULL 
    THEN p.last_name
    ELSE documents.created_by_name -- fallback to current value (email)
  END
  FROM public.profiles p
  WHERE p.id::text = documents.created_by
)
WHERE documents.created_by IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id::text = documents.created_by
);

-- Check if the bucket exists and create it if it doesn't
DO $$
BEGIN
    -- Check if the bucket already exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'shop_logos'
    ) THEN
        -- Create the bucket if it doesn't exist
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('shop_logos', 'Shop Logos', true);

        -- Create a policy to allow authenticated users to select objects
        INSERT INTO storage.policies (name, bucket_id, definition)
        VALUES ('Shop logos are publicly accessible', 'shop_logos', '(bucket_id = ''shop_logos''::text)');

        -- Create a policy to allow authenticated users to insert their own objects
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES (
            'Users can upload shop logos', 
            'shop_logos', 
            'INSERT', 
            '(bucket_id = ''shop_logos''::text AND auth.role() = ''authenticated''::text)'
        );

        -- Create a policy to allow authenticated users to update their own objects
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES (
            'Users can update shop logos', 
            'shop_logos', 
            'UPDATE', 
            '(bucket_id = ''shop_logos''::text AND auth.role() = ''authenticated''::text)'
        );
    END IF;
END
$$;

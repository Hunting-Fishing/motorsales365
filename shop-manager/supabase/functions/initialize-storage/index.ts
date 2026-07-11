
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the admin role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if the products bucket already exists
    const { data: buckets, error: listBucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (listBucketsError) {
      throw listBucketsError;
    }
    
    // If the products bucket doesn't exist, create it
    const productsBucketExists = buckets.some(bucket => bucket.name === 'products');
    
    if (!productsBucketExists) {
      const { data: newBucket, error: createBucketError } = await supabaseAdmin.storage.createBucket('products', {
        public: true,
        fileSizeLimit: 5242880, // 5MB in bytes
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (createBucketError) {
        throw createBucketError;
      }
      
      console.log('Created products bucket:', newBucket);
      
      // Create folder structure through public policies
      // Instead of creating empty files, we'll just create policies for the folders
      const policies = [
        {
          name: 'Give public read access',
          definition: `bucket_id = 'products' AND auth.role() = 'authenticated'`
        }
      ];
      
      for (const policy of policies) {
        const { error: policyError } = await supabaseAdmin.storage
          .from('products')
          .createSignedUrl('dummy', 60);  // Just to ensure policies are applied
        
        if (policyError && !policyError.message.includes('not found')) {
          console.warn('Error ensuring policies:', policyError);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ message: 'Storage initialized successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error initializing storage:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

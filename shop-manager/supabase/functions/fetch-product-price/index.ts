import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching price from URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              price: { 
                type: 'number',
                description: 'The current price of the product in USD (just the number, no currency symbol)'
              },
              originalPrice: {
                type: 'number',
                description: 'The original/list price if there is a sale, otherwise null'
              },
              title: { 
                type: 'string',
                description: 'The product title/name'
              },
              availability: { 
                type: 'string',
                description: 'Product availability status (in stock, out of stock, etc.)'
              },
              imageUrl: {
                type: 'string',
                description: 'The main product image URL'
              }
            },
            required: ['price', 'title']
          },
          prompt: 'Extract the product price (as a number without currency symbol), title, availability status, original price if on sale, and main image URL from this product page.'
        },
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the data from response - for 'extract' format, data is in data.extract
    const extractedData = data.data?.extract || data.extract || data.data?.json || data.json;
    const metadata = data.data?.metadata || data.metadata;

    console.log('Extracted product data:', extractedData);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          price: extractedData?.price,
          originalPrice: extractedData?.originalPrice,
          title: extractedData?.title,
          availability: extractedData?.availability,
          imageUrl: extractedData?.imageUrl,
          sourceUrl: metadata?.sourceURL || formattedUrl,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch price';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

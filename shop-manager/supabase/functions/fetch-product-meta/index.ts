const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMeta(html: string, property: string): string | null {
  // Try og: and name= variants
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractPrice(html: string): number | null {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonContent = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const data = JSON.parse(jsonContent);
        const price = findPrice(data);
        if (price) return price;
      } catch { /* ignore */ }
    }
  }

  // Try meta tags
  const priceMeta = extractMeta(html, 'product:price:amount') || extractMeta(html, 'og:price:amount');
  if (priceMeta) {
    const p = parseFloat(priceMeta);
    if (!isNaN(p)) return p;
  }

  // Try common price patterns
  const pricePattern = /\$\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/;
  const m = html.match(pricePattern);
  if (m) {
    const p = parseFloat(m[1].replace(',', ''));
    if (!isNaN(p)) return p;
  }

  return null;
}

function findPrice(obj: any): number | null {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.offers) {
    const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offers?.price) {
      const p = parseFloat(String(offers.price));
      if (!isNaN(p)) return p;
    }
  }
  if (obj.price) {
    const p = parseFloat(String(obj.price));
    if (!isNaN(p)) return p;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = findPrice(item);
      if (r) return r;
    }
  }
  return null;
}

Deno.serve(async (req) => {
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching product meta from:', formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || null;
    const imageUrl = extractMeta(html, 'og:image') || null;
    const title = extractMeta(html, 'og:title') || null;
    const price = extractPrice(html);

    console.log('Extracted meta:', { title, description: description?.substring(0, 50), imageUrl: !!imageUrl, price });

    return new Response(
      JSON.stringify({
        success: true,
        data: { title, description, imageUrl, price },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching product meta:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch metadata' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

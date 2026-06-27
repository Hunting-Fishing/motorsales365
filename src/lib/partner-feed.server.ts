/**
 * Partner product feed ingestion (Involve Asia datafeed).
 *
 * Pulls per-merchant SKUs from the Involve Asia datafeed endpoint, upserts
 * into `partner_products`, and records sync status on `partner_product_feeds`.
 *
 * Docs: https://api.involve.asia/  (Datafeed endpoint).
 */

const IA_BASE = "https://api.involve.asia";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function authenticate(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;
  const key = process.env.INVOLVE_ASIA_API_KEY_NAME;
  const secret = process.env.INVOLVE_ASIA_API_SECRET;
  if (!key || !secret) throw new Error("Involve Asia credentials not configured");
  const res = await fetch(`${IA_BASE}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ key, secret }),
  });
  if (!res.ok) throw new Error(`Involve Asia auth failed: ${res.status}`);
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json?.data?.token;
  if (!token) throw new Error("Involve Asia auth: no token");
  cachedToken = { token, expiresAt: now + 23 * 60 * 60 * 1000 };
  return token;
}

type FeedItem = {
  sku: string;
  title: string;
  brand?: string | null;
  category_path?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  deeplink: string;
  raw: any;
};

/** Fetch one merchant's datafeed (paginated). Returns up to `maxItems` items. */
async function fetchInvolveAsiaFeed(
  merchantSlug: string,
  maxItems = 500,
): Promise<FeedItem[]> {
  const token = await authenticate();
  const items: FeedItem[] = [];
  let page = 1;
  const perPage = 100;
  while (items.length < maxItems && page <= 20) {
    const res = await fetch(`${IA_BASE}/api/datafeeds/feed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        page: String(page),
        limit: String(perPage),
        merchant: merchantSlug,
      }),
    });
    if (!res.ok) throw new Error(`Datafeed ${merchantSlug} page ${page}: ${res.status}`);
    const json: any = await res.json();
    const data: any[] = json?.data?.data ?? json?.data ?? [];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const r of data) {
      items.push({
        sku: String(r.sku ?? r.item_id ?? r.product_id ?? r.id ?? r.unique_name ?? ""),
        title: String(r.item_name ?? r.title ?? r.name ?? ""),
        brand: r.brand ?? r.merchant_name ?? null,
        category_path: r.categories ?? r.category ?? null,
        price: r.price != null ? Number(r.price) : null,
        currency: r.currency ?? "PHP",
        image_url: r.image_url ?? r.image ?? null,
        deeplink: String(r.aff_link ?? r.product_link ?? r.url ?? r.link ?? ""),
        raw: r,
      });
    }
    if (data.length < perPage) break;
    page += 1;
  }
  return items.filter((i) => i.sku && i.title && i.deeplink).slice(0, maxItems);
}

/** Run one feed: fetch + upsert + log status. */
export async function syncFeed(feedId: string): Promise<{ ok: boolean; count: number; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: feed, error: feedErr } = await supabaseAdmin
    .from("partner_product_feeds" as any)
    .select("*")
    .eq("id", feedId)
    .single();
  if (feedErr || !feed) return { ok: false, count: 0, error: feedErr?.message ?? "Feed not found" };
  if (!(feed as any).is_enabled) return { ok: false, count: 0, error: "Feed disabled" };

  try {
    const items = await fetchInvolveAsiaFeed((feed as any).merchant_slug);
    if (items.length > 0) {
      const rows = items.map((i) => ({
        network: (feed as any).network,
        merchant_slug: (feed as any).merchant_slug,
        sku: i.sku,
        title: i.title.slice(0, 500),
        brand: i.brand?.slice(0, 120) ?? null,
        category_path: i.category_path?.slice(0, 300) ?? null,
        price: i.price,
        currency: i.currency ?? "PHP",
        image_url: i.image_url,
        deeplink: i.deeplink,
        country: (feed as any).country,
        raw: i.raw,
      }));
      // Chunk upserts to keep payloads small.
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error: upErr } = await supabaseAdmin
          .from("partner_products" as any)
          .upsert(chunk, { onConflict: "network,sku" });
        if (upErr) throw upErr;
      }
    }
    await supabaseAdmin
      .from("partner_product_feeds" as any)
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: "ok",
        last_error: null,
        item_count: items.length,
      })
      .eq("id", feedId);
    return { ok: true, count: items.length };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabaseAdmin
      .from("partner_product_feeds" as any)
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: "error",
        last_error: msg.slice(0, 500),
      })
      .eq("id", feedId);
    return { ok: false, count: 0, error: msg };
  }
}

/** Run all enabled feeds whose country is in the active markets (used by cron). */
export async function syncAllEnabledFeeds() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Active markets: only sync feeds for countries we actively serve.
  // Defaults to ['PH'] when the parts_countries table is empty/unavailable.
  let activeCountries: string[] = ["PH"];
  try {
    const { data: countries } = await supabaseAdmin
      .from("parts_countries" as any)
      .select("code")
      .eq("is_active", true);
    const codes = ((countries as any[]) ?? [])
      .map((c) => String(c.code).toUpperCase())
      .filter(Boolean);
    if (codes.length > 0) activeCountries = codes;
  } catch {
    /* fall back to PH */
  }

  const { data, error } = await supabaseAdmin
    .from("partner_product_feeds" as any)
    .select("id,country,merchant_slug")
    .eq("is_enabled", true)
    .in("country", activeCountries);
  if (error) throw error;

  const results: Array<{ id: string; merchant_slug: string; country: string } & Awaited<ReturnType<typeof syncFeed>>> = [];
  for (const row of (data as any[]) ?? []) {
    const r = await syncFeed(row.id);
    results.push({ id: row.id, merchant_slug: row.merchant_slug, country: row.country, ...r });
  }
  return { activeCountries, results };
}


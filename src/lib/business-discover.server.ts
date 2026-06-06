// Server-only helpers for the unified admin "Discover Businesses" flow.
// Adds Facebook Page scraping + a thin wrapper around our existing geocoder
// that returns a confidence flag the UI can use to gate imports.

import { firecrawlScrape } from "./facebook-import.server";
import { geocodeAddress, type GeocodeResult } from "./places.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FbPageData = {
  pageId: string;
  pageUrl: string;
  name: string;
  category: string | null;
  about: string | null;
  addressText: string | null;
  phone: string | null;
  website: string | null;
  hoursRaw: string | null;
  coverImage: string | null;
  profileImage: string | null;
};

const FB_HOST_RE = /(^|\.)facebook\.com$/i;

export function isFacebookPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!FB_HOST_RE.test(u.hostname)) return false;
    const p = u.pathname.split("/").filter(Boolean);
    if (p.length === 0) return false;
    if (["marketplace", "groups", "watch", "share", "login", "help"].includes(p[0])) return false;
    return true;
  } catch {
    return false;
  }
}

export function extractFbPageId(url: string): string {
  try {
    const u = new URL(url);
    const idParam = u.searchParams.get("id");
    if (idParam && /^\d+$/.test(idParam)) return `id:${idParam}`;
    const parts = u.pathname.split("/").filter(Boolean);
    const slug = parts[0] ?? "";
    return `page:${slug.toLowerCase()}`;
  } catch {
    return `page:${url.slice(-32)}`;
  }
}

function meta(metadata: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = metadata[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/** Scrape a Facebook Page (About / main) and extract business-relevant fields. */
export async function scrapeFbPage(url: string): Promise<FbPageData> {
  const cleanUrl = url.replace(/\/$/, "");
  // Prefer /about/ for richer structured data; fall back to base page if needed.
  const aboutUrl = cleanUrl.includes("/about") ? cleanUrl : `${cleanUrl}/about`;
  let scraped = await firecrawlScrape(aboutUrl).catch(() => null);
  if (!scraped || !scraped.markdown) {
    scraped = await firecrawlScrape(cleanUrl);
  }

  const m = scraped.metadata;
  const ogTitle = meta(m, "ogTitle", "og:title");
  const ogDescription = meta(m, "ogDescription", "og:description");
  const ogImage = meta(m, "ogImage", "og:image");
  const title = meta(m, "title") ?? ogTitle ?? "Facebook Page";
  const name = title.replace(/\s*\|\s*Facebook\s*$/i, "").trim();

  const md = scraped.markdown;
  // Heuristics — FB about pages render labels like "Address", "Phone", "Website".
  const addressText =
    firstMatch(md, /Address\s*\n+([^\n]+)/i) ??
    firstMatch(md, /Location\s*\n+([^\n]+)/i) ??
    firstMatch(md, /Listed in ([^\n]+)/i);
  const phone =
    firstMatch(md, /(?:Phone|Mobile|Contact)\s*\n+([+\d][\d\s\-()]{5,})/i) ??
    firstMatch(md, /(\+?63[\d\s\-]{7,}|0\d{10})/);
  const website =
    firstMatch(md, /Website\s*\n+(https?:\/\/[^\s)]+)/i) ??
    firstMatch(md, /(https?:\/\/(?!www\.facebook\.com)[^\s)]+)/);
  const category =
    firstMatch(md, /Category\s*\n+([^\n]+)/i) ??
    firstMatch(md, /Page\s*[·•]\s*([^\n]+)/i);
  const about =
    firstMatch(md, /About\s*\n+([\s\S]{20,400}?)\n\n/i) ?? ogDescription ?? null;
  const hoursRaw = firstMatch(md, /Hours\s*\n+([\s\S]{0,300}?)\n\n/i);

  // Cover image: prefer a scontent FB image, then og:image.
  const imgRe = /https:\/\/scontent[^\s"')]+\.(?:jpg|jpeg|png|webp)[^\s"')]*/i;
  const cover = scraped.html.match(imgRe)?.[0] ?? ogImage ?? null;

  return {
    pageId: extractFbPageId(cleanUrl),
    pageUrl: cleanUrl,
    name,
    category,
    about,
    addressText,
    phone,
    website,
    hoursRaw,
    coverImage: cover,
    profileImage: ogImage,
  };
}

/** Search Facebook pages via Firecrawl web search (site:facebook.com). */
export async function searchFbPages(opts: {
  query: string;
  city?: string;
}): Promise<{ url: string; title: string; snippet: string }[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  const q = [opts.query, opts.city, "site:facebook.com -inurl:marketplace -inurl:groups -inurl:posts"]
    .filter(Boolean)
    .join(" ");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, limit: 20 }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { web?: Array<{ url: string; title: string; description?: string }> };
  };
  if (!res.ok || !json.success) {
    throw new Error(`Firecrawl search failed (${res.status}): ${json.error ?? "no data"}`);
  }
  const out = (json.data?.web ?? [])
    .filter((r) => isFacebookPageUrl(r.url))
    .map((r) => ({ url: r.url.replace(/\/$/, ""), title: r.title, snippet: r.description ?? "" }));
  // Dedupe by extracted page id
  const seen = new Set<string>();
  return out.filter((r) => {
    const id = extractFbPageId(r.url);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export type GeocodedAddress = {
  lat: number | null;
  lng: number | null;
  label: string | null;
  confidence: "high" | "low" | "none";
};

/** Geocode with a confidence hint. Empty input → none, no match → none, short input → low. */
export async function geocodeWithConfidence(address: string | null | undefined): Promise<GeocodedAddress> {
  if (!address || address.trim().length < 4) {
    return { lat: null, lng: null, label: null, confidence: "none" };
  }
  let res: GeocodeResult | null = null;
  try {
    res = await geocodeAddress(address);
  } catch {
    res = null;
  }
  if (!res) return { lat: null, lng: null, label: null, confidence: "none" };
  // Cheap confidence heuristic: an address string with at least 3 comma-segments
  // (street, city, region) usually resolves to a precise point in Nominatim.
  const segs = address.split(",").filter((s) => s.trim().length > 0).length;
  const confidence: "high" | "low" = segs >= 3 ? "high" : "low";
  return { lat: res.lat, lng: res.lng, label: res.label, confidence };
}

/** Download a remote image and stash it in the businesses bucket. */
export async function downloadBusinessPhoto(opts: {
  businessSlug: string;
  imageUrl: string;
}): Promise<{ publicUrl: string; path: string } | null> {
  try {
    const res = await fetch(opts.imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 motorsales365-discover" },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1024) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `imported/${opts.businessSlug}/${Date.now()}.${ext}`;
    const bucket = "business-photos";
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buf, { contentType: ct, upsert: false });
    if (error) return null;
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: pub.publicUrl, path };
  } catch {
    return null;
  }
}

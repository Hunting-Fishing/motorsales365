// Server-only helpers for Facebook import (Firecrawl + parsing + storage).
// Never import from client code — use *.server suffix so the bundler enforces it.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export type FbScrapeResult = {
  markdown: string;
  html: string;
  title?: string;
  description?: string;
  priceText?: string;
  images: string[];
  sellerProfileUrl?: string;
  sellerName?: string;
  locationText?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  sourceUrl: string;
};

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  return key;
}

export async function firecrawlScrape(url: string): Promise<{
  markdown: string;
  html: string;
  metadata: Record<string, unknown>;
  links: string[];
}> {
  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "links"],
      onlyMainContent: false,
      waitFor: 2500,
    }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: {
      markdown?: string;
      html?: string;
      metadata?: Record<string, unknown>;
      links?: string[];
    };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(`Firecrawl scrape failed (${res.status}): ${json.error ?? "no data"}`);
  }
  return {
    markdown: json.data.markdown ?? "",
    html: json.data.html ?? "",
    metadata: json.data.metadata ?? {},
    links: json.data.links ?? [],
  };
}

/** Extract the Facebook profile slug or numeric id from a profile URL. */
export function extractFbProfileId(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)facebook\.com$/i.test(u.hostname)) return null;
    // profile.php?id=12345
    const idParam = u.searchParams.get("id");
    if (idParam && /^\d+$/.test(idParam)) return `id:${idParam}`;
    // /username or /people/Name/12345
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "people" && parts[2] && /^\d+$/.test(parts[2])) return `id:${parts[2]}`;
    if (parts[0] && !["marketplace", "groups", "pages", "watch", "share"].includes(parts[0])) {
      return `user:${parts[0].toLowerCase()}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function isFacebookMarketplaceUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)facebook\.com$/i.test(u.hostname) && u.pathname.includes("/marketplace/item");
  } catch {
    return false;
  }
}

export function isFacebookProfileUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)facebook\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Extract structured listing data from a scraped FB Marketplace item page. */
export function parseMarketplaceItem(
  sourceUrl: string,
  scraped: Awaited<ReturnType<typeof firecrawlScrape>>,
): FbScrapeResult {
  const meta = scraped.metadata;
  const ogTitle = (meta["ogTitle"] ?? meta["og:title"]) as string | undefined;
  const ogDescription = (meta["ogDescription"] ?? meta["og:description"]) as string | undefined;
  const ogImage = (meta["ogImage"] ?? meta["og:image"]) as string | undefined;
  const title = (meta["title"] as string) ?? ogTitle;

  // Price often appears as "₱350,000" or "PHP 350,000" or "$3,500" in markdown / og:description.
  const text = `${ogTitle ?? ""}\n${ogDescription ?? ""}\n${scraped.markdown}`;
  const priceMatch =
    text.match(/(?:₱|PHP|Php|P)\s?([\d,]+(?:\.\d{1,2})?)/) ??
    text.match(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)/);
  const priceText = priceMatch ? priceMatch[0] : undefined;

  // Pull image URLs that look like FB CDN images.
  const imageSet = new Set<string>();
  if (ogImage) imageSet.add(ogImage);
  const imgRegex = /https:\/\/scontent[^\s"')]+\.(?:jpg|jpeg|png|webp)[^\s"')]*/gi;
  for (const m of scraped.html.matchAll(imgRegex)) imageSet.add(m[0]);
  for (const m of scraped.markdown.matchAll(imgRegex)) imageSet.add(m[0]);
  const images = Array.from(imageSet).slice(0, 12);

  // Seller profile link — first /<user> or /people/ link in scraped links.
  let sellerProfileUrl: string | undefined;
  for (const link of scraped.links) {
    try {
      const u = new URL(link);
      if (!/(^|\.)facebook\.com$/i.test(u.hostname)) continue;
      const p = u.pathname;
      if (
        p.startsWith("/marketplace") ||
        p.startsWith("/groups") ||
        p === "/" ||
        p.startsWith("/login")
      )
        continue;
      if (p.startsWith("/people/") || /^\/[a-z0-9.\-_]+\/?$/i.test(p) || p === "/profile.php") {
        sellerProfileUrl = `https://www.facebook.com${p}${u.search}`;
        break;
      }
    } catch {
      // ignore
    }
  }

  // Location string heuristic: "Listed in Quezon City"
  const locMatch = scraped.markdown.match(/Listed in ([^\n]+)/i);
  const locationText = locMatch ? locMatch[1].trim() : undefined;

  return {
    markdown: scraped.markdown,
    html: scraped.html,
    title,
    description: ogDescription,
    priceText,
    images,
    sellerProfileUrl,
    sellerName: undefined,
    locationText,
    ogTitle,
    ogDescription,
    ogImage,
    sourceUrl,
  };
}

/** Re-scrape a FB profile and check if the verification code appears anywhere on the page. */
export async function profilePageContainsCode(profileUrl: string, code: string): Promise<boolean> {
  const scraped = await firecrawlScrape(profileUrl);
  const haystack = `${scraped.markdown}\n${scraped.html}`.toUpperCase();
  return haystack.includes(code.toUpperCase());
}

/** Generate a short verification code like MS365-AB12CD. */
export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MS365-${s}`;
}

/** Download an image URL and upload it to listing-photos. Returns public url + storage path. */
export async function downloadAndStorePhoto(opts: {
  userId: string;
  listingId: string;
  imageUrl: string;
  index: number;
}): Promise<{ publicUrl: string; path: string } | null> {
  try {
    const res = await fetch(opts.imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 motorsales365-import" },
    });
    if (!res.ok) return null;
    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.byteLength < 1024) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `${opts.userId}/${opts.listingId}/fb-${Date.now()}-${opts.index}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("listing-photos")
      .upload(path, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data: pub } = supabaseAdmin.storage.from("listing-photos").getPublicUrl(path);
    return { publicUrl: pub.publicUrl, path };
  } catch {
    return null;
  }
}

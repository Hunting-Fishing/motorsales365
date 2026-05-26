// Utilities to detect affiliate network from a marketplace URL and strip
// tracking junk before storing the canonical link.

const HOST_PATTERNS: Array<{ slug: string; test: (host: string, url: URL) => boolean }> = [
  { slug: "shopee",   test: (h) => /(^|\.)shopee\.(ph|com|sg|com\.my|co\.th|vn|co\.id|com\.br)$/i.test(h) },
  { slug: "lazada",   test: (h) => /(^|\.)lazada\.(com\.ph|com\.my|sg|co\.th|vn|co\.id)$/i.test(h) },
  { slug: "tiktok",   test: (h, u) => /(^|\.)tiktok\.com$/i.test(h) && /\/shop|\/product/.test(u.pathname) },
  { slug: "tiktok",   test: (h) => /(^|\.)(vt|vm)\.tiktok\.com$/i.test(h) },
  { slug: "amazon",   test: (h) => /(^|\.)amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au|sg|ae|in|co\.jp|nl|se|pl)$/i.test(h) },
  { slug: "amazon",   test: (h) => /(^|\.)amzn\.(to|asia)$/i.test(h) },
  { slug: "carousell", test: (h) => /(^|\.)carousell\.(ph|com|sg|com\.my|com\.hk)$/i.test(h) },
  { slug: "aliexpress", test: (h) => /(^|\.)aliexpress\.(com|us|ru)$/i.test(h) },
  { slug: "ebay",     test: (h) => /(^|\.)ebay\.(com|ph|co\.uk|de|com\.au)$/i.test(h) },
  { slug: "zalora",   test: (h) => /(^|\.)zalora\.(com\.ph|com\.my|sg|co\.id|com\.hk)$/i.test(h) },
];

// Marketplace-specific noise to drop from query strings.
const TRACKING_PARAMS = new Set([
  // generic
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "fbclid", "mc_cid", "mc_eid", "ref", "ref_src", "ref_url", "from",
  // shopee
  "sp_atk", "xptdk", "deep_and_deferred", "is_from_login", "publish_id", "smtt",
  // lazada
  "spm", "scm", "pvid", "search", "clickTrackInfo", "mp", "trafficSource",
  "exlaz", "wh_pid", "sourceType",
  // tiktok
  "_t", "_r", "share_app_id", "share_link_id", "checksum", "tt_from",
  "u_code", "share_iid", "social_share_type", "share_iid", "timestamp",
  // amazon
  "tag", "linkCode", "linkId", "ref_", "psc", "th", "qid", "sr", "keywords",
  "pd_rd_w", "pf_rd_p", "pf_rd_r", "pd_rd_r", "pd_rd_wg", "content-id",
  // aliexpress
  "algo_pvid", "algo_exp_id", "pdp_npi", "aem_p4p_detail", "gatewayAdapt",
]);

export function detectNetworkSlug(input: string): string | null {
  const url = safeParseUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  for (const p of HOST_PATTERNS) if (p.test(host, url)) return p.slug;
  return null;
}

export function cleanShopUrl(input: string): string {
  const url = safeParseUrl(input);
  if (!url) return input.trim();
  // Drop tracking params
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
  }
  // Amazon: collapse to /dp/<ASIN> when present
  if (/(^|\.)amazon\./i.test(url.hostname)) {
    const m = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (m) url.pathname = `/dp/${m[1].toUpperCase()}`;
    url.search = "";
  }
  // Drop trailing empty query/fragment
  if ([...url.searchParams.keys()].length === 0) url.search = "";
  url.hash = "";
  // Normalize trailing slash off (except root)
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

export function urlMatchesNetwork(url: string, networkSlug: string): boolean {
  const detected = detectNetworkSlug(url);
  if (!detected) return true; // unknown host — don't block
  return detected === networkSlug;
}

function safeParseUrl(input: string): URL | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

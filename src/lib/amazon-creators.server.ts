// Official Amazon Associates Creators API (PA-API 5 retired May 2026).
// Docs: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
// GetItems: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-items

const PARTNER_TAG = "366industries-20";
const RESOURCES = [
  "images.primary.large",
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.features",
  "offersV2.listings.price",
  "offersV2.listings.isBuyBoxWinner",
];

export type AmazonCatalogItem = {
  asin: string;
  title: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  detailPageURL: string;
};

type Creds = {
  id: string;
  secret: string;
  version: string;
  tag: string;
  marketplace: string;
};

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

export function amazonCreatorsConfigured(): boolean {
  return !!creds();
}

function creds(): Creds | null {
  const id = process.env.AMAZON_CREATORS_CREDENTIAL_ID?.trim();
  const secret = process.env.AMAZON_CREATORS_CREDENTIAL_SECRET?.trim();
  if (!id || !secret) return null;
  return {
    id,
    secret,
    version: process.env.AMAZON_CREATORS_VERSION?.trim() || "3.1",
    tag: process.env.AMAZON_PARTNER_TAG?.trim() || PARTNER_TAG,
    marketplace: process.env.AMAZON_MARKETPLACE?.trim() || "www.amazon.com",
  };
}

function tokenEndpoint(version: string): string {
  if (version === "3.2" || version === "2.2") return "https://api.amazon.co.uk/auth/o2/token";
  if (version === "3.3" || version === "2.3") return "https://api.amazon.co.jp/auth/o2/token";
  return "https://api.amazon.com/auth/o2/token";
}

export function extractAmazonAsin(input: string): string | null {
  try {
    const u = new URL(input);
    const m = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (m) return m[1].toUpperCase();
    const q = u.searchParams.get("asin");
    if (q && /^[A-Z0-9]{10}$/i.test(q)) return q.toUpperCase();
  } catch {
    /* not a url */
  }
  return null;
}

export function amazonDetailUrl(asin: string, tag = PARTNER_TAG): string {
  const u = new URL(`https://www.amazon.com/dp/${asin}`);
  u.searchParams.set("tag", tag);
  u.searchParams.set("linkCode", "ogi");
  return u.toString();
}

const SETUP_ERROR =
  "Amazon details have to come from the Creators API, not from the product page. In Associates Central open Tools, then Creators API, and add a credential. Amazon only unlocks that after 10 qualifying sales in 30 days. Then set AMAZON_CREATORS_CREDENTIAL_ID, AMAZON_CREATORS_CREDENTIAL_SECRET, and AMAZON_CREATORS_VERSION on the server. The partner tag stays 366industries-20.";

async function accessToken(c: Creds): Promise<string> {
  const key = `${c.id}:${c.version}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const res = await fetch(tokenEndpoint(c.version), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: c.id,
      client_secret: c.secret,
      scope: "creatorsapi::default",
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Amazon did not issue a Creators API token. Check the credential id, secret, and version.",
    );
  }
  tokenCache = {
    key,
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

async function creatorsPost(path: string, body: Record<string, unknown>, c: Creds): Promise<any> {
  const token = await accessToken(c);
  const res = await fetch(`https://creatorsapi.amazon${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-marketplace": c.marketplace,
    },
    body: JSON.stringify({ ...body, marketplace: c.marketplace, partnerTag: c.tag }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.errors?.[0]?.message ||
      json?.error?.message ||
      `Amazon Creators API returned ${res.status}`;
    throw new Error(String(msg));
  }
  return json;
}

function mapItem(raw: any, tag: string): AmazonCatalogItem | null {
  const asin = String(raw?.asin ?? "").toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) return null;
  const listings = raw?.offersV2?.listings ?? raw?.offers?.listings ?? [];
  const list = Array.isArray(listings) ? listings : [];
  const winner = list.find((l: any) => l?.isBuyBoxWinner) ?? list[0];
  const money = winner?.price?.money ?? winner?.price?.Money ?? winner?.price;
  const amount = Number(money?.amount ?? money?.Amount);
  const features = raw?.itemInfo?.features?.displayValues;
  const description = Array.isArray(features) ? features.slice(0, 4).join(" ") : null;
  const image =
    raw?.images?.primary?.large?.url ||
    raw?.images?.primary?.medium?.url ||
    raw?.images?.primary?.small?.url ||
    null;
  const given = typeof raw?.detailPageURL === "string" ? raw.detailPageURL : "";
  return {
    asin,
    title: raw?.itemInfo?.title?.displayValue ?? null,
    brand: raw?.itemInfo?.byLineInfo?.brand?.displayValue ?? null,
    description,
    image,
    price: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: money?.currency ?? money?.Currency ?? null,
    detailPageURL: given.includes("tag=") ? given : amazonDetailUrl(asin, tag),
  };
}

function firstOf(json: any): any | null {
  return (
    json?.itemResults?.items?.[0] ??
    json?.itemsResult?.items?.[0] ??
    json?.searchResult?.items?.[0] ??
    null
  );
}

export async function getAmazonItem(input: string): Promise<
  | { configured: false; error: string }
  | { configured: true; item: AmazonCatalogItem | null; error?: string }
> {
  const c = creds();
  if (!c) return { configured: false, error: SETUP_ERROR };
  const asin = /^[A-Z0-9]{10}$/i.test(input) ? input.toUpperCase() : extractAmazonAsin(input);
  if (!asin) {
    return {
      configured: true,
      item: null,
      error:
        "Paste an Amazon product page. The link needs /dp/ and a 10-character ASIN. A search page is not one product.",
    };
  }
  try {
    const json = await creatorsPost(
      "/catalog/v1/getItems",
      { itemIds: [asin], itemIdType: "ASIN", resources: RESOURCES },
      c,
    );
    const err = json?.errors?.[0]?.message;
    const item = mapItem(firstOf(json), c.tag);
    if (!item) {
      return {
        configured: true,
        item: null,
        error: err || "Amazon did not return that product. Check the ASIN and marketplace.",
      };
    }
    return { configured: true, item };
  } catch (e: any) {
    return { configured: true, item: null, error: e?.message ?? "Amazon Creators API failed" };
  }
}

export async function searchAmazonItem(
  keywords: string,
  sortLowPrice = false,
): Promise<{ configured: false } | { configured: true; item: AmazonCatalogItem | null; error?: string }> {
  const c = creds();
  if (!c) return { configured: false };
  const body: Record<string, unknown> = {
    keywords: keywords.slice(0, 200),
    itemCount: 1,
    searchIndex: "All",
    resources: RESOURCES,
  };
  if (sortLowPrice) body.sortBy = "Price:LowToHigh";
  try {
    let json = await creatorsPost("/catalog/v1/searchItems", body, c);
    if (sortLowPrice && !firstOf(json)) {
      delete body.sortBy;
      json = await creatorsPost("/catalog/v1/searchItems", body, c);
    }
    return { configured: true, item: mapItem(firstOf(json), c.tag) };
  } catch (e: any) {
    if (sortLowPrice) {
      try {
        delete body.sortBy;
        const json = await creatorsPost("/catalog/v1/searchItems", body, c);
        return { configured: true, item: mapItem(firstOf(json), c.tag) };
      } catch (err: any) {
        return { configured: true, item: null, error: err?.message ?? e?.message };
      }
    }
    return { configured: true, item: null, error: e?.message ?? "Amazon search failed" };
  }
}

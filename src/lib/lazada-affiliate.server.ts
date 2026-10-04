// Lazada Affiliate Open API (Philippines gateway).
// Credentials: Lazada Affiliate → Integration → Open API (App Key, App Secret, User Token).
// Link: GET /marketing/getlink
// Product: GET /marketing/product/feed with productIds

import { createHmac } from "node:crypto";

const SETUP_ERROR =
  "Lazada did not fill this from the affiliate API yet. In Lazada Affiliate open Integration, then Open API, and copy the App Key, App Secret, and User Token. Set LAZADA_AFFILIATE_APP_KEY, LAZADA_AFFILIATE_APP_SECRET, and LAZADA_AFFILIATE_USER_TOKEN on the server. Until then, type the title and price. The click is not a Lazada tracking link until those are set.";

export type LazadaCatalogItem = {
  productId: string | null;
  title: string | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  promotionUrl: string | null;
  seller: string | null;
};

type Creds = { appKey: string; appSecret: string; userToken: string; gateway: string };

export function lazadaAffiliateConfigured(): boolean {
  return !!creds();
}

function creds(): Creds | null {
  const appKey = process.env.LAZADA_AFFILIATE_APP_KEY?.trim();
  const appSecret = process.env.LAZADA_AFFILIATE_APP_SECRET?.trim();
  const userToken = process.env.LAZADA_AFFILIATE_USER_TOKEN?.trim();
  if (!appKey || !appSecret || !userToken) return null;
  const gateway = (process.env.LAZADA_AFFILIATE_GATEWAY?.trim() || "https://api.lazada.com.ph/rest").replace(
    /\/$/,
    "",
  );
  return { appKey, appSecret, userToken, gateway };
}

export function extractLazadaProductId(input: string): string | null {
  const m = input.match(/-i(\d+)(?:-s\d+)?/i) || input.match(/[?&]itemId=(\d+)/i);
  return m?.[1] ?? null;
}

function sign(apiPath: string, params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params).sort();
  let message = apiPath;
  for (const key of keys) message += key + params[key];
  return createHmac("sha256", secret).update(message).digest("hex").toUpperCase();
}

async function callApi(apiPath: string, apiParams: Record<string, string>, c: Creds): Promise<any> {
  const params: Record<string, string> = {
    app_key: c.appKey,
    sign_method: "sha256",
    timestamp: String(Date.now()),
    ...apiParams,
  };
  params.sign = sign(apiPath, params, c.appSecret);
  const url = new URL(c.gateway + apiPath);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Lazada Affiliate API returned ${res.status}`);
  }
  const code = String(json?.code ?? "");
  if (code && code !== "0") {
    throw new Error(json?.message || json?.error_msg || `Lazada Affiliate API code ${code}`);
  }
  return json;
}

function linkRow(json: any): any | null {
  const data = json?.result?.data ?? json?.data ?? null;
  if (!data) return null;
  const list =
    data.urlBatchGetLinkInfoList ||
    data.productBatchGetLinkInfoList ||
    data.offerBatchGetLinkInfoList ||
    [];
  if (Array.isArray(list) && list[0]) return list[0];
  if (data.regularPromotionLink || data.productName) return data;
  const err = data.errorInfoList?.[0];
  if (err?.errorMsg || err?.errorCode) {
    throw new Error(err.errorMsg || err.errorCode);
  }
  return null;
}

function feedRow(json: any): any | null {
  const data = json?.result?.data ?? json?.data;
  if (Array.isArray(data)) return data[0] ?? null;
  return null;
}

export async function trackLazadaUrl(input: string): Promise<
  | { configured: false; error: string }
  | { configured: true; promotionUrl: string | null; productName: string | null; productId: string | null; error?: string }
> {
  const c = creds();
  if (!c) return { configured: false, error: SETUP_ERROR };
  try {
    const json = await callApi(
      "/marketing/getlink",
      {
        userToken: c.userToken,
        inputType: "url",
        inputValue: input,
        sub1: "365motorsales",
      },
      c,
    );
    const row = linkRow(json);
    return {
      configured: true,
      promotionUrl: row?.regularPromotionLink || row?.offerPromotionLink || null,
      productName: row?.productName || row?.skuName || null,
      productId: row?.productId ? String(row.productId) : extractLazadaProductId(input),
    };
  } catch (e: any) {
    return { configured: true, promotionUrl: null, productName: null, productId: null, error: e?.message };
  }
}

export async function getLazadaProduct(input: string): Promise<
  | { configured: false; error: string }
  | { configured: true; item: LazadaCatalogItem | null; error?: string }
> {
  const tracked = await trackLazadaUrl(input);
  if (!tracked.configured) return tracked;
  if (tracked.error && !tracked.promotionUrl && !tracked.productName) {
    return { configured: true, item: null, error: tracked.error };
  }
  const productId = tracked.productId || extractLazadaProductId(input);
  let feed: any = null;
  const c = creds();
  if (c && productId) {
    try {
      const json = await callApi(
        "/marketing/product/feed",
        {
          userToken: c.userToken,
          offerType: "1",
          productIds: `[${productId}]`,
          page: "1",
          limit: "1",
        },
        c,
      );
      feed = feedRow(json);
    } catch {
      feed = null;
    }
  }
  const price = Number(feed?.discountPrice);
  const pictures = Array.isArray(feed?.pictures) ? feed.pictures : [];
  const item: LazadaCatalogItem = {
    productId,
    title: feed?.productName || tracked.productName,
    brand: feed?.brandName || null,
    image: pictures[0] || null,
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: feed?.currency || (Number.isFinite(price) ? "PHP" : null),
    promotionUrl: tracked.promotionUrl,
    seller: feed?.sellerName || null,
  };
  if (!item.title && !item.promotionUrl) {
    return { configured: true, item: null, error: tracked.error || "Lazada did not return that product." };
  }
  return { configured: true, item };
}

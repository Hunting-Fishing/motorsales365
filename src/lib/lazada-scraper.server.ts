/**
 * Dedicated Lazada scraper. Server-only.
 *
 * Strategy chain (first one that returns a strict match wins):
 *   A) Mobile mtop gsearch API — fast, JSON, but matches by itemId.
 *   B) PDP HTML fetch — extracts `__moduleData__` / window.runParams.data
 *      (the product detail page embeds its own JSON state).
 *   C) JSON-LD Product fallback from the same HTML.
 *
 * All strategies are STRICT — they return null rather than a wrong product,
 * so callers can safely fall back to Firecrawl.
 *
 * Used by:
 *   - admin "Import from URL" flow (src/lib/shop.functions.ts)
 *   - scheduled price refresh (src/routes/api/public/hooks/refresh-lazada.ts)
 */
import { createHash } from "crypto";

export type LazadaProductData = {
  title?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  /** Original / list price (before promo). */
  price?: number;
  /** Promo / sale price if currently discounted. */
  sale_price?: number;
  currency?: string;
  category_hint?: string;
  url?: string;
  itemId?: string;
  skuId?: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const REGION_HOST: Record<string, string> = {
  PH: "lazada.com.ph",
  SG: "lazada.sg",
  MY: "lazada.com.my",
  TH: "lazada.co.th",
  VN: "lazada.vn",
  ID: "lazada.co.id",
};

const VALID_IMG_RE = /(lzcdn\.com|slatic\.net|lazcdn\.com)/i;

export function extractLazadaIds(
  input: string,
): { itemId: string; skuId?: string; region: string } | null {
  try {
    const url = new URL(input);
    if (!/(^|\.)lazada\./i.test(url.hostname)) return null;
    const region = url.hostname.endsWith(".sg")
      ? "SG"
      : url.hostname.endsWith(".my")
        ? "MY"
        : url.hostname.endsWith(".co.th")
          ? "TH"
          : url.hostname.endsWith(".vn")
            ? "VN"
            : url.hostname.endsWith(".co.id")
              ? "ID"
              : "PH";
    const pathMatch = url.pathname.match(/(?:^|-)i(\d+)(?:-s(\d+))?\.html/i);
    const itemId =
      pathMatch?.[1] ?? url.searchParams.get("itemId") ?? url.searchParams.get("item_id");
    const skuId =
      pathMatch?.[2] ??
      url.searchParams.get("skuId") ??
      url.searchParams.get("sku_id") ??
      undefined;
    return itemId ? { itemId, skuId: skuId ?? undefined, region } : null;
  } catch {
    return null;
  }
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Strategy A — mtop gsearch (mobile JSON API). */
async function fetchViaMtop(
  ids: { itemId: string; skuId?: string; region: string },
  referer: string,
): Promise<LazadaProductData | null> {
  const api = "mtop.lazada.gsearch.appsearch";
  const appKey = "12574478";
  const host = REGION_HOST[ids.region] ?? REGION_HOST.PH;
  const data = JSON.stringify({
    q: ids.itemId,
    m: "search",
    regionID: ids.region,
    language: "en",
  });
  const makeUrl = (t: string, sign: string) => {
    const qs = new URLSearchParams({
      jsv: "2.6.1",
      appKey,
      t,
      sign,
      api,
      v: "1.0",
      type: "jsonp",
      dataType: "jsonp",
      callback: "mtopjsonp1",
      data,
    });
    return `https://acs-m.${host}/h5/${api}/1.0/?${qs.toString()}`;
  };
  const headers = {
    "user-agent": UA,
    accept: "application/json,text/javascript,*/*;q=0.1",
    referer,
  };
  try {
    const first = await fetch(makeUrl(String(Date.now()), ""), {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    const cookie = first.headers.get("set-cookie") ?? "";
    const tokenValue = cookie.match(/_m_h5_tk=([^;]+)/)?.[1];
    const tokenEnc = cookie.match(/_m_h5_tk_enc=([^;]+)/)?.[1];
    const token = tokenValue?.split("_")[0];
    if (!token) return null;
    const t = String(Date.now());
    const sign = createHash("md5").update(`${token}&${t}&${appKey}&${data}`).digest("hex");
    const cookieHeader = `_m_h5_tk=${tokenValue}${tokenEnc ? `; _m_h5_tk_enc=${tokenEnc}` : ""}`;
    const second = await fetch(makeUrl(t, sign), {
      headers: { ...headers, cookie: cookieHeader },
      signal: AbortSignal.timeout(8_000),
    });
    const text = await second.text();
    const jsonText = text.replace(/^\s*mtopjsonp1\(/, "").replace(/\)\s*$/, "");
    const payload = JSON.parse(jsonText);
    const items: any[] = payload?.data?.mods?.listItems ?? [];
    const item =
      items.find(
        (row) =>
          String(row.itemId ?? row.nid) === ids.itemId &&
          (!ids.skuId || String(row.skuId ?? "") === ids.skuId),
      ) ?? items.find((row) => String(row.itemId ?? row.nid) === ids.itemId);
    if (!item) return null;
    const img = String(item.image ?? "");
    if (img && !VALID_IMG_RE.test(img)) return null;
    const productUrl = item.productUrl
      ? new URL(String(item.productUrl), `https://www.${host}`).toString()
      : referer;
    const description = Array.isArray(item.description)
      ? item.description.filter(Boolean).join("\n")
      : String(item.description ?? "").trim();
    const categoryHint = payload?.data?.mods?.filter?.filterItems?.find(
      (f: any) => f?.name === "category",
    )?.options?.[0]?.title;
    const list = num(item.originalPrice ?? item.priceOrigin ?? item.price);
    const sale = num(item.price ?? item.priceShow);
    return {
      title: item.name,
      brand: item.brandName,
      description: description || undefined,
      image_url: img || undefined,
      price: list,
      sale_price: sale && list && sale < list ? sale : undefined,
      currency: "PHP",
      category_hint: categoryHint,
      url: productUrl,
      itemId: ids.itemId,
      skuId: ids.skuId,
    };
  } catch {
    return null;
  }
}

/** Strategy B — PDP HTML embedded JSON (`__moduleData__`/`runParams`). */
async function fetchViaPdpHtml(
  ids: { itemId: string; skuId?: string; region: string },
  url: string,
): Promise<LazadaProductData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Lazada PDPs embed product data as JSON in a script. Try the common keys.
    const blobMatch =
      html.match(/window\.runParams\s*=\s*({[\s\S]*?});\s*<\/script>/i) ??
      html.match(/__moduleData__\s*=\s*({[\s\S]*?});\s*<\/script>/i);
    let data: any = null;
    if (blobMatch?.[1]) {
      try {
        const parsed = JSON.parse(blobMatch[1]);
        data = parsed?.data ?? parsed;
      } catch {
        data = null;
      }
    }

    if (data) {
      const item = data.item ?? data.product ?? {};
      const skuBase = data.skuBase ?? {};
      const skus = Array.isArray(skuBase.skus) ? skuBase.skus : [];
      const matchedSku =
        skus.find((s: any) => String(s.skuId ?? "") === (ids.skuId ?? "")) ?? skus[0] ?? null;
      const priceInfo =
        data.skuInfos?.[matchedSku?.skuId]?.price ?? data.price ?? matchedSku?.price ?? {};
      const list = num(priceInfo?.originalPrice ?? priceInfo?.priceWithTax);
      const sale = num(priceInfo?.salePrice ?? priceInfo?.price);

      const image =
        (Array.isArray(item.images) && item.images[0]) ||
        skuBase?.props?.[0]?.values?.[0]?.image ||
        data?.image ||
        undefined;

      if (image && !VALID_IMG_RE.test(String(image))) {
        // Not a real Lazada image — bail to avoid pollution.
        return null;
      }

      const title = item?.title ?? data?.title;
      if (!title) return null;

      const category =
        data?.breadcrumb?.[data.breadcrumb.length - 1]?.title ?? data?.category?.name;

      return {
        title: String(title),
        brand: data?.brand?.name ?? item?.brand,
        description:
          typeof data?.desc === "string"
            ? data.desc
            : typeof item?.attributes === "object"
              ? Object.values(item.attributes as Record<string, string>)
                  .filter((v) => typeof v === "string")
                  .join("\n")
              : undefined,
        image_url: image ? String(image) : undefined,
        price: list,
        sale_price: sale && list && sale < list ? sale : sale,
        currency: priceInfo?.currency ?? "PHP",
        category_hint: category,
        url,
        itemId: ids.itemId,
        skuId: ids.skuId,
      };
    }

    // Fallback C — JSON-LD Product inside the same HTML.
    return extractJsonLdFromHtml(html, url, ids);
  } catch {
    return null;
  }
}

function extractJsonLdFromHtml(
  html: string,
  url: string,
  ids: { itemId: string; skuId?: string; region: string },
): LazadaProductData | null {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );
  for (const m of blocks) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidates: any[] = Array.isArray(parsed) ? parsed : (parsed["@graph"] ?? [parsed]);
    for (const node of candidates) {
      if (!node || typeof node !== "object") continue;
      const t = node["@type"];
      const isProduct = t === "Product" || (Array.isArray(t) && t.includes("Product"));
      if (!isProduct) continue;
      const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      const image = Array.isArray(node.image) ? node.image[0] : node.image;
      const imgStr = typeof image === "string" ? image : image?.url;
      if (imgStr && !VALID_IMG_RE.test(imgStr)) return null;
      const brandRaw = node.brand;
      const brand = typeof brandRaw === "string" ? brandRaw : brandRaw?.name;
      const list = num(offer?.priceSpecification?.price ?? offer?.highPrice);
      const sale = num(offer?.price ?? offer?.lowPrice);
      return {
        title: typeof node.name === "string" ? node.name : undefined,
        brand: typeof brand === "string" ? brand : undefined,
        description: typeof node.description === "string" ? node.description : undefined,
        image_url: imgStr ?? undefined,
        price: list ?? sale,
        sale_price: list && sale && sale < list ? sale : undefined,
        currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : "PHP",
        url,
        itemId: ids.itemId,
        skuId: ids.skuId,
      };
    }
  }
  return null;
}

/**
 * Public entry point. Tries strategies in order and returns the first strict
 * match. Returns `null` to signal "fall back to Firecrawl".
 */
export async function scrapeLazadaProduct(input: string): Promise<LazadaProductData | null> {
  const ids = extractLazadaIds(input);
  if (!ids) return null;

  // A) mobile API
  const fromMtop = await fetchViaMtop(ids, input);
  if (fromMtop) return fromMtop;

  // B) PDP HTML + embedded JSON, with JSON-LD fallback
  const fromHtml = await fetchViaPdpHtml(ids, input);
  if (fromHtml) return fromHtml;

  return null;
}

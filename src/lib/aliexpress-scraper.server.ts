/**
 * AliExpress product scraper. Server-only.
 *
 * Strategy chain:
 *   A) PDP HTML fetch → parse `window.runParams.data` (the main embedded
 *      product state on AliExpress detail pages).
 *   B) JSON-LD Product fallback from the same HTML.
 *
 * Currency: AliExpress prices are usually returned in USD/EUR/etc.
 * We surface the original price + currency code; the caller is responsible
 * for FX conversion to PHP using the `currencies` table.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const VALID_IMG_RE = /(alicdn\.com|aliexpress-media|ae01\.alicdn|ae04\.alicdn)/i;

export type AliExpressProductData = {
  title?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  /** Original / list price in source currency. */
  price?: number;
  /** Promo / sale price in source currency. */
  sale_price?: number;
  /** Source currency code (USD, EUR, PHP, etc.). */
  currency?: string;
  category_hint?: string;
  url?: string;
  itemId?: string;
};

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function extractAliExpressId(input: string): string | null {
  try {
    const url = new URL(input);
    if (!/aliexpress\./i.test(url.hostname)) return null;
    const m =
      url.pathname.match(/\/item\/(\d+)/) ??
      url.pathname.match(/\/(\d{8,})\.html/) ??
      url.pathname.match(/i(\d{8,})\.html/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchViaPdpHtml(
  itemId: string,
  url: string,
): Promise<AliExpressProductData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        // Hint AliExpress to serve us PHP pricing when possible.
        cookie: "aep_usuc_f=site=glo&c_tp=PHP&region=PH&b_locale=en_US",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // AliExpress PDPs embed `window.runParams = { data: {...} }` in a script.
    const blobMatch =
      html.match(/window\.runParams\s*=\s*\{[\s\S]*?data:\s*(\{[\s\S]*?\})\s*\}\s*;?/i) ??
      html.match(/window\._dida_config_\._init_data_\s*=\s*\{[\s\S]*?data:\s*(\{[\s\S]*?\})\s*\}/i);

    let data: any = null;
    if (blobMatch?.[1]) {
      try {
        data = JSON.parse(blobMatch[1]);
      } catch {
        data = null;
      }
    }

    if (data) {
      const pm = data.priceModule ?? data.webPriceModule ?? {};
      const titleObj = data.titleModule ?? data.productInfoComponent ?? {};
      const imageMod = data.imageModule ?? data.imageComponent ?? {};
      const storeMod = data.storeModule ?? data.shopComponent ?? {};
      const specsMod = data.specsModule ?? data.productPropComponent ?? {};

      const title: string | undefined =
        titleObj?.subject ?? titleObj?.subjectTrans ?? titleObj?.title ?? data?.subject;

      const minPrice =
        num(pm?.minActivityAmount?.value) ??
        num(pm?.minAmount?.value) ??
        num(pm?.formatedActivityPrice) ??
        num(pm?.formatedPrice);
      const maxPrice = num(pm?.maxActivityAmount?.value) ?? num(pm?.maxAmount?.value);
      const listMin = num(pm?.minAmount?.value);
      const currency: string =
        pm?.minActivityAmount?.currency ??
        pm?.minAmount?.currency ??
        pm?.currencyCode ??
        "USD";

      // Use the higher of (max activity) and (list min) as list; sale = min activity.
      const list = listMin && minPrice && listMin > minPrice ? listMin : (maxPrice ?? minPrice);
      const sale = minPrice && listMin && minPrice < listMin ? minPrice : undefined;

      const image: string | undefined =
        (Array.isArray(imageMod?.imagePathList) && imageMod.imagePathList[0]) ||
        (Array.isArray(imageMod?.summImagePathList) && imageMod.summImagePathList[0]) ||
        imageMod?.imagePath ||
        undefined;

      const cleanedImage = image
        ? image.startsWith("//")
          ? `https:${image}`
          : image
        : undefined;

      if (cleanedImage && !VALID_IMG_RE.test(cleanedImage)) {
        // Not a real AliExpress image — try JSON-LD before giving up.
        return extractJsonLdFromHtml(html, url, itemId);
      }

      const description: string | undefined =
        (Array.isArray(specsMod?.props) &&
          specsMod.props
            .map((p: any) => (p?.attrName && p?.attrValue ? `${p.attrName}: ${p.attrValue}` : null))
            .filter(Boolean)
            .join("\n")) ||
        undefined;

      const category_hint: string | undefined =
        data?.crossLinkModule?.breadCrumbPathList?.slice(-1)?.[0]?.cateName ??
        data?.productCategory?.cateName;

      const brand: string | undefined =
        storeMod?.storeName ??
        specsMod?.props?.find((p: any) =>
          /^(brand|brand name)$/i.test(String(p?.attrName ?? "")),
        )?.attrValue;

      const result: AliExpressProductData = {
        title: title ? String(title).trim() : undefined,
        brand: brand ? String(brand).trim() : undefined,
        description,
        image_url: cleanedImage,
        price: list,
        sale_price: sale,
        currency,
        category_hint,
        url,
        itemId,
      };

      if (!result.title) {
        return extractJsonLdFromHtml(html, url, itemId);
      }
      if (result.price == null) {
        const ld = extractJsonLdFromHtml(html, url, itemId);
        if (ld?.price != null) {
          result.price = ld.price;
          result.sale_price = ld.sale_price;
          result.currency = ld.currency ?? result.currency;
        }
      }
      if (result.price == null) {
        console.warn("[aliexpress-scraper] PDP found product but no price", itemId);
      }
      return result;
    }

    return extractJsonLdFromHtml(html, url, itemId);
  } catch (e) {
    console.warn("[aliexpress-scraper] PDP failed", itemId, (e as any)?.message);
    return null;
  }
}

function extractJsonLdFromHtml(
  html: string,
  url: string,
  itemId: string,
): AliExpressProductData | null {
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
        currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : "USD",
        url,
        itemId,
      };
    }
  }
  return null;
}

export async function scrapeAliExpressProduct(
  input: string,
): Promise<AliExpressProductData | null> {
  const itemId = extractAliExpressId(input);
  if (!itemId) return null;
  return fetchViaPdpHtml(itemId, input);
}

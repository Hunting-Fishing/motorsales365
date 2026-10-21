import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function applyTag(url: string, network: any): string {
  try {
    if (network?.slug === "lazada" && /(^|\.)c\.lazada\./i.test(new URL(url).hostname)) {
      return url;
    }
    if (network?.deeplink_template && network?.tag_value) {
      return network.deeplink_template
        .replace("{{url}}", encodeURIComponent(url))
        .replace("{{tag}}", encodeURIComponent(network.tag_value));
    }
    if (network?.tag_param && network?.tag_value) {
      const u = new URL(url);
      u.searchParams.set(network.tag_param, network.tag_value);
      if (network?.slug === "amazon" && !u.searchParams.get("linkCode")) {
        u.searchParams.set("linkCode", "ogi");
      }
      return u.toString();
    }
  } catch {
    return url;
  }
  return url;
}

async function monetizeMarketplaceUrl(url: string, network: any): Promise<string> {
  const slug = String(network?.slug ?? "").toLowerCase();

  // Lazada direct Affiliate Open API is the preferred path when configured.
  // It returns a tracked promotion URL bound to the 365 affiliate account.
  if (slug === "lazada") {
    try {
      const { trackLazadaUrl } = await import("@/lib/lazada-affiliate.server");
      const tracked = await trackLazadaUrl(url);
      if (tracked.configured && tracked.promotionUrl) return tracked.promotionUrl;
    } catch {
      // Fall through to other configured tracking strategies.
    }
  }

  // Explicit per-network tag/deeplink configuration wins over a fallback
  // affiliate network. This lets the admin choose a direct merchant account.
  const explicitlyTagged = applyTag(url, network);
  if (explicitlyTagged !== url) return explicitlyTagged;

  // Shopee does not have an equivalent direct helper in this project yet.
  // Involve Asia is already wired server-side and can monetize approved
  // Shopee/Lazada offers with a tracked deeplink.
  if (
    (slug === "shopee" || slug === "lazada") &&
    process.env.INVOLVE_ASIA_API_KEY_NAME &&
    process.env.INVOLVE_ASIA_API_SECRET
  ) {
    try {
      const { generateInvolveAsiaDeeplink } = await import("@/lib/involve-asia.server");
      const tracked = await generateInvolveAsiaDeeplink(url);
      if (tracked && tracked !== url) return tracked;
    } catch {
      // Fail open: the buyer still reaches the merchant.
    }
  }

  return explicitlyTagged;
}

export const resolveShopRedirect = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        networkSlug: z
          .string()
          .min(1)
          .max(60)
          .regex(/^[a-z0-9_-]+$/i)
          .optional(),
        visitorId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: product } = await supabaseAdmin
      .from("shop_products")
      .select("id, active")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product || !product.active) return { url: null as string | null };

    const { data: links } = await supabaseAdmin
      .from("shop_product_links")
      .select(
        "url, network:affiliate_networks(id, slug, tag_param, tag_value, deeplink_template, active)",
      )
      .eq("product_id", data.productId);

    const candidates = (links ?? []).filter((l: any) => l.network?.active);
    const pick = candidates.find((l: any) => l.network?.slug === data.networkSlug) ?? candidates[0];
    if (!pick) return { url: null };

    const finalUrl = await monetizeMarketplaceUrl(pick.url, pick.network);

    try {
      const vid = data.visitorId;
      await supabaseAdmin.from("shop_clicks").insert({
        product_id: data.productId,
        network_id: pick.network?.id ?? null,
        visitor_id: vid && /^[0-9a-f-]{36}$/i.test(vid) ? vid : null,
      });
    } catch {
      /* ignore */
    }

    return { url: finalUrl };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function applyTag(url: string, network: any): string {
  try {
    if (network?.deeplink_template && network?.tag_value) {
      return network.deeplink_template
        .replace("{{url}}", encodeURIComponent(url))
        .replace("{{tag}}", encodeURIComponent(network.tag_value));
    }
    if (network?.tag_param && network?.tag_value) {
      const u = new URL(url);
      u.searchParams.set(network.tag_param, network.tag_value);
      return u.toString();
    }
  } catch {
    return url;
  }
  return url;
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

    const finalUrl = applyTag(pick.url, pick.network);

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

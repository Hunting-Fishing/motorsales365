import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Apply affiliate tag using the network's deeplink template.
// {{url}} = original target; {{tag}} = tag_value
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

export const Route = createFileRoute("/go/$productId")({
  loader: async ({ params, location }) => {
    const search = new URLSearchParams(location.searchStr ?? "");
    const networkSlug = search.get("n") ?? "";
    const visitorId = search.get("v") || null;

    const { data: product } = await supabaseAdmin
      .from("shop_products")
      .select("id, active")
      .eq("id", params.productId)
      .maybeSingle();
    if (!product || !product.active) {
      throw redirect({ to: "/shop" });
    }

    let linkQuery = supabaseAdmin
      .from("shop_product_links")
      .select("url, network:affiliate_networks(id, slug, tag_param, tag_value, deeplink_template, active)")
      .eq("product_id", params.productId);

    const { data: links } = await linkQuery;
    const candidates = (links ?? []).filter((l: any) => l.network?.active);
    const pick =
      candidates.find((l: any) => l.network?.slug === networkSlug) ??
      candidates[0];
    if (!pick) throw redirect({ to: "/shop" });

    const finalUrl = applyTag(pick.url, pick.network);

    // Log click (non-blocking failure)
    try {
      await supabaseAdmin.from("shop_clicks").insert({
        product_id: params.productId,
        network_id: pick.network?.id ?? null,
        visitor_id: visitorId && /^[0-9a-f-]{36}$/i.test(visitorId) ? visitorId : null,
      });
    } catch { /* ignore */ }

    throw redirect({ href: finalUrl });
  },
  component: () => null,
});

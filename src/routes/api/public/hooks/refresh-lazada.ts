/**
 * Cron endpoint: re-scrape Lazada-linked products to pick up price / sale
 * changes. Called by pg_cron every 6 hours.
 *
 * Auth: requires the project's anon/publishable key in the `apikey` header
 * (matches `SUPABASE_ANON_KEY`). Bypasses Lovable's published-site auth via
 * the `/api/public/` prefix, then enforces the header check below.
 *
 * Body (optional): { "limit": number } — defaults to 25, capped at 100.
 *   Keeping batches small protects against Lazada rate-limiting and Worker
 *   timeouts. The job picks products with the oldest `last_checked_at` first.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scrapeLazadaProduct } from "@/lib/lazada-scraper.server";

export const Route = createFileRoute("/api/public/hooks/refresh-lazada")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let limit = 25;
        try {
          const body = (await request.json().catch(() => ({}))) as { limit?: number };
          if (typeof body.limit === "number" && body.limit > 0) {
            limit = Math.min(100, Math.floor(body.limit));
          }
        } catch {
          /* empty body OK */
        }

        // Pull the lazada network row.
        const { data: net } = await supabaseAdmin
          .from("affiliate_networks")
          .select("id")
          .eq("slug", "lazada")
          .eq("active", true)
          .maybeSingle();
        if (!net) {
          return Response.json({ ok: true, scanned: 0, updated: 0, reason: "no lazada network" });
        }

        // Oldest-checked-first, joined with product.
        const { data: links, error } = await supabaseAdmin
          .from("shop_product_links")
          .select(
            "id, url, product_id, last_checked_at, price_php, sale_price_php, product:shop_products(id, price_php, deal_price_php, is_deal, active)",
          )
          .eq("network_id", net.id)
          .order("last_checked_at", { ascending: true, nullsFirst: true })
          .limit(limit);
        if (error) {
          console.error("refresh-lazada: select failed", error);
          return new Response(error.message, { status: 500 });
        }

        let scanned = 0;
        let updated = 0;
        const failures: string[] = [];
        const now = new Date().toISOString();

        for (const link of links ?? []) {
          const product = (link as any).product;
          if (!product?.active) continue;
          scanned++;
          try {
            const data = await scrapeLazadaProduct(link.url);

            if (!data || (!data.price && !data.sale_price)) {
              await supabaseAdmin
                .from("shop_product_links")
                .update({ last_checked_at: now })
                .eq("id", link.id);
              continue;
            }

            const list = data.price ?? null;
            const sale = data.sale_price ?? null;
            const isDeal = !!(sale && list && sale < list);

            await supabaseAdmin
              .from("shop_product_links")
              .update({ last_checked_at: now, price_php: list, sale_price_php: sale })
              .eq("id", link.id);

            const prevList =
              (link as any).price_php != null ? Number((link as any).price_php) : null;
            const prevSale =
              (link as any).sale_price_php != null ? Number((link as any).sale_price_php) : null;
            const newList = list != null ? Number(list) : null;
            const newSale = sale != null ? Number(sale) : null;
            if (prevList !== newList || prevSale !== newSale) {
              await supabaseAdmin.from("shop_price_history").insert({
                product_id: product.id,
                network_id: net.id,
                price_php: list,
                sale_price_php: sale,
              });
            }

            const patch: {
              price_php?: number | null;
              deal_price_php?: number | null;
              is_deal?: boolean;
              updated_at?: string;
            } = {};
            if (list != null && Number(list) !== Number(product.price_php ?? 0))
              patch.price_php = list;
            const newDealPrice = isDeal ? sale : null;
            if (Number(newDealPrice ?? 0) !== Number(product.deal_price_php ?? 0))
              patch.deal_price_php = newDealPrice;
            if (Boolean(isDeal) !== Boolean(product.is_deal)) patch.is_deal = isDeal;
            if (Object.keys(patch).length > 0) {
              patch.updated_at = now;
              const { error: upErr } = await supabaseAdmin
                .from("shop_products")
                .update(patch)
                .eq("id", product.id);
              if (upErr) failures.push(`${product.id}: ${upErr.message}`);
              else updated++;
            }
          } catch (e: any) {
            failures.push(`${link.id}: ${e?.message ?? "scrape failed"}`);
          }
        }

        return Response.json({
          ok: true,
          scanned,
          updated,
          failures: failures.slice(0, 10),
          at: now,
        });
      },
    },
  },
});

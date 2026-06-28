import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Outbound affiliate redirect:
 *   /api/public/go/<supplier-slug>?q=<query>&lid=<listingId>&mk=&md=&yr=
 *
 * Looks up the active template, substitutes {QUERY} and the affiliate id
 * (pulled from server env via affiliate_id_env), logs the click, and
 * 302-redirects to the supplier.
 */
export const Route = createFileRoute("/api/public/go/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const slug = params.slug;
        const query = (url.searchParams.get("q") ?? "").trim();
        const listingId = url.searchParams.get("lid");
        const make = url.searchParams.get("mk");
        const model = url.searchParams.get("md");
        const yearRaw = url.searchParams.get("yr");
        const year = yearRaw ? Number(yearRaw) : null;
        const partnerSku = url.searchParams.get("sku");
        const productTitle = url.searchParams.get("t");


        const sb = publicClient();

        // Partner storefronts: slug = "partner-<storefront_slug>"
        if (slug.startsWith("partner-")) {
          const storefrontSlug = slug.slice("partner-".length);
          const { data: app } = await sb
            .from("parts_supplier_applications" as any)
            .select("website,storefront_slug,storefront_published")
            .eq("storefront_slug", storefrontSlug)
            .eq("storefront_published", true)
            .maybeSingle();
          const partnerTarget = (app as any)?.website;
          if (!partnerTarget) {
            return new Response("Partner storefront not found", { status: 404 });
          }
          try {
            await sb.from("affiliate_clicks" as any).insert({
              supplier_slug: slug,
              query: query || null,
              listing_id: listingId,
              vehicle_make: make,
              vehicle_model: model,
              vehicle_year: Number.isFinite(year as number) ? year : null,
              partner_sku: partnerSku,
              product_title: productTitle,
              referrer: request.headers.get("referer"),
              user_agent: request.headers.get("user-agent"),
            });
          } catch { /* ignore */ }

          return new Response(null, {
            status: 302,
            headers: { Location: partnerTarget, "Cache-Control": "no-store" },
          });
        }

        // affiliate_id_env is restricted from anon/authenticated reads — use admin client.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin
          .from("affiliate_links" as any)
          .select("supplier_slug,url_template,affiliate_id_env,is_active,allowed_countries")
          .eq("supplier_slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (!link) {
          return new Response("Supplier not found", { status: 404 });
        }

        // Region gate: only redirect when visitor's country is allowed for this partner.
        // Visitor country comes from Cloudflare's CF-IPCountry header; falls back to PH
        // (our default active market). Empty/null allowed_countries = available everywhere.
        const visitorCountry = (
          request.headers.get("cf-ipcountry") ||
          request.headers.get("x-vercel-ip-country") ||
          "PH"
        ).toUpperCase();
        const allowed = (link as any).allowed_countries as string[] | null;
        if (allowed && allowed.length > 0 && !allowed.includes(visitorCountry)) {
          return new Response(
            `This partner is not available in ${visitorCountry}. Try a regional partner instead.`,
            { status: 451, headers: { "Cache-Control": "no-store" } },
          );
        }


        const l = link as any;
        const useInvolveAsia = l.affiliate_id_env === "INVOLVE_ASIA";
        const affiliateId = !useInvolveAsia && l.affiliate_id_env
          ? (process.env[l.affiliate_id_env as string] ?? "")
          : "";

        // Pre-built deeplink (from ingested partner_products tiles): take it as-is.
        // Country gate above still applies; Involve Asia deeplinks are already tracked.
        const prebuiltDeeplink = url.searchParams.get("dl");
        let target: string;
        if (prebuiltDeeplink) {
          try {
            target = decodeURIComponent(prebuiltDeeplink);
          } catch {
            target = prebuiltDeeplink;
          }
        } else {
          target = String(l.url_template)
            .replaceAll("{QUERY}", encodeURIComponent(query))
            .replaceAll("{AFFILIATE_ID}", encodeURIComponent(affiliateId));

          if (useInvolveAsia) {
            // Mint a tracked deeplink via Involve Asia (Shopee/Lazada/etc.)
            const { generateInvolveAsiaDeeplink } = await import("@/lib/involve-asia.server");
            target = await generateInvolveAsiaDeeplink(target);
          } else if (affiliateId && !target.includes(affiliateId)) {
            // Append affiliate id as a tracking param if the template doesn't bake it in.
            const sep = target.includes("?") ? "&" : "?";
            const param =
              slug.startsWith("amazon")
                ? "tag"
                : slug.startsWith("ebay")
                  ? "campid"
                  : "aff_id";
            target += `${sep}${param}=${encodeURIComponent(affiliateId)}`;
          }
        }


        // Fire-and-forget click log (don't block redirect on failure).
        try {
          await sb.from("affiliate_clicks" as any).insert({
            supplier_slug: slug,
            query: query || null,
            listing_id: listingId,
            vehicle_make: make,
            vehicle_model: model,
            vehicle_year: Number.isFinite(year as number) ? year : null,
            partner_sku: partnerSku,
            product_title: productTitle,
            referrer: request.headers.get("referer"),
            user_agent: request.headers.get("user-agent"),
          });
        } catch {
          /* ignore */
        }


        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

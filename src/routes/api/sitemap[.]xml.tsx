import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const STATIC_PATHS = [
  "/", "/about", "/contact", "/pricing", "/sell", "/tow", "/advertise",
  "/terms", "/privacy", "/guidelines", "/refund-policy",
  "/browse/car", "/browse/motorcycle", "/browse/boat", "/browse/airplane",
  "/browse/equipment", "/browse/towing", "/browse/carwash", "/browse/parts",
  "/browse/drone", "/browse/repair", "/browse/bodyshop", "/browse/salvage",
];

export const Route = createFileRoute("/api/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        let listings: { id: string; updated_at: string | null }[] = [];
        if (url && key) {
          try {
            const sb = createClient(url, key);
            const { data } = await sb
              .from("listings")
              .select("id,updated_at")
              .in("status", ["active", "pending_sale"])
              .order("updated_at", { ascending: false })
              .limit(5000);
            listings = data ?? [];
          } catch {
            // best-effort: fall back to static-only sitemap
          }
        }

        const today = new Date().toISOString().slice(0, 10);
        const urls = [
          ...STATIC_PATHS.map((p) =>
            `<url><loc>${origin}${p}</loc><lastmod>${today}</lastmod><changefreq>${p === "/" ? "daily" : "weekly"}</changefreq></url>`,
          ),
          ...listings.map((l) =>
            `<url><loc>${origin}/listing/${l.id}</loc><lastmod>${(l.updated_at ?? new Date().toISOString()).slice(0, 10)}</lastmod></url>`,
          ),
        ].join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});

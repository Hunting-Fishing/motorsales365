import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.365motorsales.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/support/buying", changefreq: "monthly", priority: "0.5" },
  { path: "/support/selling", changefreq: "monthly", priority: "0.5" },
  { path: "/support/account", changefreq: "monthly", priority: "0.5" },
  { path: "/support/business", changefreq: "monthly", priority: "0.5" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/payments", changefreq: "monthly", priority: "0.4" },
  { path: "/advertise", changefreq: "monthly", priority: "0.5" },
  { path: "/sell", changefreq: "monthly", priority: "0.6" },
  { path: "/tow", changefreq: "monthly", priority: "0.6" },
  { path: "/map", changefreq: "weekly", priority: "0.6" },
  { path: "/export", changefreq: "monthly", priority: "0.5" },
  { path: "/businesses", changefreq: "daily", priority: "0.8" },
  { path: "/rides", changefreq: "daily", priority: "0.7" },
  { path: "/businesses/submit", changefreq: "monthly", priority: "0.5" },
  { path: "/shop", changefreq: "daily", priority: "0.8" },
  { path: "/shop/categories", changefreq: "weekly", priority: "0.6" },
  { path: "/learn", changefreq: "weekly", priority: "0.7" },
  { path: "/partner-training", changefreq: "weekly", priority: "0.5" },
  // /my-qr is user-private (noindex); excluded from sitemap.
  { path: "/guidelines", changefreq: "monthly", priority: "0.3" },
  { path: "/affiliate-disclosure", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.2" },
  { path: "/signup", changefreq: "yearly", priority: "0.2" },
];

const CATEGORIES = [
  "car",
  "motorcycle",
  "boat",
  "airplane",
  "equipment",
  "towing",
  "carwash",
  "parts",
  "drone",
  "repair",
  "bodyshop",
  "salvage",
  "other",
];

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_ENTRIES];

        for (const c of CATEGORIES) {
          entries.push({ path: `/browse/${c}`, changefreq: "daily", priority: "0.7" });
        }

        // Parts category landing pages
        const { PARTS_CATEGORIES } = await import("@/data/parts-categories");
        entries.push({ path: "/parts/categories", changefreq: "weekly", priority: "0.7" });
        for (const pc of PARTS_CATEGORIES) {
          entries.push({ path: `/parts/c/${pc.slug}`, changefreq: "daily", priority: "0.7" });
        }


        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const key =
            process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const sb = createClient(url, key, { auth: { persistSession: false } });

            const { data: listings } = await sb
              .from("listings")
              .select("id, updated_at")
              .in("status", ["active", "pending_sale"])
              .order("updated_at", { ascending: false })
              .limit(5000);
            for (const l of listings ?? []) {
              entries.push({
                path: `/listing/${(l as any).id}`,
                lastmod: (l as any).updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.6",
              });
            }

            const { data: businesses } = await (sb as any)
              .from("businesses")
              .select("slug, vanity_slug, updated_at")
              .eq("status", "active")
              .order("updated_at", { ascending: false })
              .limit(5000);
            for (const b of businesses ?? []) {
              // Prefer vanity short URL as canonical when set
              const path = b.vanity_slug ? `/b/${b.vanity_slug}` : `/businesses/${b.slug}`;
              entries.push({
                path,
                lastmod: b.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.6",
              });
            }

            const { data: rides } = await (sb as any)
              .from("rides")
              .select("slug, updated_at")
              .eq("status", "published")
              .order("updated_at", { ascending: false })
              .limit(5000);
            for (const r of rides ?? []) {
              entries.push({
                path: `/rides/${r.slug}`,
                lastmod: r.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.5",
              });
            }

            const { data: departments } = await (sb as any)
              .from("shop_departments")
              .select("slug, updated_at")
              .eq("active", true);
            for (const d of departments ?? []) {
              entries.push({
                path: `/shop/department/${d.slug}`,
                lastmod: d.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.6",
              });
            }

            const { data: shopCats } = await (sb as any)
              .from("shop_categories")
              .select("slug")
              .eq("active", true);
            for (const c of shopCats ?? []) {
              entries.push({
                path: `/shop/${c.slug}`,
                changefreq: "weekly",
                priority: "0.5",
              });
            }

            const { data: products } = await (sb as any)
              .from("shop_products")
              .select("slug, updated_at")
              .eq("active", true)
              .order("updated_at", { ascending: false })
              .limit(5000);
            for (const p of products ?? []) {
              entries.push({
                path: `/shop/p/${p.slug}`,
                lastmod: p.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.5",
              });
            }

            const { data: courses } = await (sb as any)
              .from("courses")
              .select("slug, updated_at")
              .eq("status", "published")
              .order("updated_at", { ascending: false })
              .limit(2000);
            for (const c of courses ?? []) {
              entries.push({
                path: `/learn/${c.slug}`,
                lastmod: c.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.6",
              });
            }
            const { data: partnerProducts } = await (sb as any)
              .from("partner_products")
              .select("network, sku, updated_at")
              .order("updated_at", { ascending: false })
              .limit(2000);
            for (const pp of partnerProducts ?? []) {
              entries.push({
                path: `/parts/p/${encodeURIComponent(pp.network)}/${encodeURIComponent(pp.sku)}`,
                lastmod: pp.updated_at?.slice(0, 10),
                changefreq: "weekly",
                priority: "0.4",
              });
            }
          }
        } catch (err) {
          console.warn("[sitemap] dynamic entries failed", err);
        }


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${escape(BASE_URL + e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

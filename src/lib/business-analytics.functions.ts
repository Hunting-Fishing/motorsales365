import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EVENT_KINDS = [
  "view",
  "call_click",
  "whatsapp_click",
  "messenger_click",
  "website_click",
  "contact_click",
  "share_click",
  "book_click",
  "book_created",
  "book_confirmed",
  "inquiry_submitted",
  "gallery_view",
  "video_play",
] as const;

function classifyDevice(
  ua: string | null | undefined,
): "mobile" | "tablet" | "desktop" | "bot" | "unknown" {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|wget|curl/.test(s))
    return "bot";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/.test(s)) return "mobile";
  return "desktop";
}

/** Public — anyone (incl. guests) can record an event from a mini-site. */
export const recordBusinessEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        kind: z.enum(EVENT_KINDS),
        meta: z.record(z.string(), z.any()).optional().nullable(),
        sessionHash: z.string().max(64).optional().nullable(),
        referrer: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Enrich meta with device + geo derived from request headers (server-only).
    let enrichedMeta: Record<string, any> = { ...(data.meta ?? {}) };
    try {
      const ua = getRequestHeader("user-agent") ?? null;
      const device = classifyDevice(ua);
      // Cloudflare workers expose geo via these headers (and the cf object, not always available via getRequestHeader).
      const city =
        (getRequestHeader("cf-ipcity") || getRequestHeader("x-vercel-ip-city") || "").trim() ||
        null;
      const region =
        (
          getRequestHeader("cf-region") ||
          getRequestHeader("cf-region-code") ||
          getRequestHeader("x-vercel-ip-country-region") ||
          ""
        ).trim() || null;
      const country =
        (
          getRequestHeader("cf-ipcountry") ||
          getRequestHeader("x-vercel-ip-country") ||
          ""
        ).trim() || null;
      enrichedMeta = {
        ...enrichedMeta,
        device,
        city: city ? city.slice(0, 64) : null,
        region: region ? region.slice(0, 64) : null,
        country: country ? country.slice(0, 4) : null,
      };
    } catch {
      /* headers unavailable — fall back to raw meta */
    }

    await supabaseAdmin.from("business_page_events").insert({
      business_id: data.businessId,
      kind: data.kind,
      meta: enrichedMeta,
      session_hash: data.sessionHash ?? null,
      referrer: data.referrer ?? null,
    } as any);
    return { ok: true };
  });

async function assertEditor(supabase: any, userId: string, businessId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id, owner_id, organization_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!data) throw new Error("Business not found");
  if ((data as any).owner_id === userId) return;
  if ((data as any).organization_id) {
    const { data: m } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", (data as any).organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (m) return;
  }
  throw new Error("Not authorized");
}

/** Owner — aggregate stats over the last N days (default 30). */
export const getBusinessAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        days: z.number().int().min(1).max(180).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);

    const since = new Date(Date.now() - data.days * 86400000);
    const { data: events, error } = await supabaseAdmin
      .from("business_page_events")
      .select("kind, occurred_at, meta")
      .eq("business_id", data.businessId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);

    const byKind: Record<string, number> = {};
    const byDay: Record<string, { views: number; clicks: number; bookings: number }> = {};
    const bySource: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const topQueries: Record<string, number> = {};

    for (const e of events ?? []) {
      const kind = (e as any).kind as string;
      const meta = ((e as any).meta ?? {}) as Record<string, any>;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      const day = new Date((e as any).occurred_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { views: 0, clicks: 0, bookings: 0 };
      if (kind === "view") {
        byDay[day].views += 1;
        const src = typeof meta.source === "string" && meta.source ? meta.source : "direct";
        bySource[src] = (bySource[src] ?? 0) + 1;
        const device = typeof meta.device === "string" && meta.device ? meta.device : "unknown";
        byDevice[device] = (byDevice[device] ?? 0) + 1;
        const city = typeof meta.city === "string" && meta.city.trim() ? meta.city.trim() : null;
        if (city) byCity[city] = (byCity[city] ?? 0) + 1;
        const region =
          typeof meta.region === "string" && meta.region.trim() ? meta.region.trim() : null;
        if (region) byRegion[region] = (byRegion[region] ?? 0) + 1;
        const country =
          typeof meta.country === "string" && meta.country.trim()
            ? meta.country.trim().toUpperCase()
            : null;
        if (country) byCountry[country] = (byCountry[country] ?? 0) + 1;
        if (typeof meta.query === "string" && meta.query.trim()) {
          const q = meta.query.trim().toLowerCase().slice(0, 64);
          topQueries[q] = (topQueries[q] ?? 0) + 1;
        }
      } else if (kind === "book_created" || kind === "book_confirmed") byDay[day].bookings += 1;
      else if (kind.endsWith("_click")) byDay[day].clicks += 1;
    }

    const series: Array<{ date: string; views: number; clicks: number; bookings: number }> = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      series.push({ date: d, ...(byDay[d] ?? { views: 0, clicks: 0, bookings: 0 }) });
    }

    const totalViews = byKind.view ?? 0;
    const totalBookings = (byKind.book_created ?? 0) + (byKind.book_confirmed ?? 0);
    const conversion = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;

    const queries = Object.entries(topQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    const topCities = Object.entries(byCity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    const topRegions = Object.entries(byRegion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    const topCountries = Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalEvents: events?.length ?? 0,
      totalViews,
      totalBookings,
      conversionRate: Number(conversion.toFixed(2)),
      byKind,
      bySource,
      byDevice,
      topCities,
      topRegions,
      topCountries,
      topQueries: queries,
      series,
    };
  });

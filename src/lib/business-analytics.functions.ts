import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EVENT_KINDS = [
  "view", "call_click", "whatsapp_click", "messenger_click", "website_click",
  "contact_click", "share_click", "book_click", "book_created", "book_confirmed",
  "inquiry_submitted", "gallery_view", "video_play",
] as const;

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
    await supabaseAdmin.from("business_page_events").insert({
      business_id: data.businessId,
      kind: data.kind,
      meta: data.meta ?? null,
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

    for (const e of events ?? []) {
      const kind = (e as any).kind as string;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      const day = new Date((e as any).occurred_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { views: 0, clicks: 0, bookings: 0 };
      if (kind === "view") byDay[day].views += 1;
      else if (kind === "book_created" || kind === "book_confirmed") byDay[day].bookings += 1;
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

    return {
      totalEvents: events?.length ?? 0,
      totalViews,
      totalBookings,
      conversionRate: Number(conversion.toFixed(2)),
      byKind,
      series,
    };
  });

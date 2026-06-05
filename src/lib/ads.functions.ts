import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const placementSchema = z.enum([
  "home_carousel",
  "browse_top",
  "rides_top",
  "listing_sidebar",
  "export_top",
  "shop_top",
  "shop_sidebar",
]);
const statusSchema = z.enum(["draft", "scheduled", "active", "paused", "ended"]);

// PUBLIC: fetch active ads for a placement
export const getActiveAds = createServerFn({ method: "GET" })
  .inputValidator((input: { placement: string; limit?: number }) =>
    z
      .object({ placement: placementSchema, limit: z.number().int().min(1).max(20).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("active_ads_public")
      .select("id, title, caption, image_url, target_url, placement")
      .eq("placement", data.placement)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 6);
    if (error) throw new Error(error.message);
    return { ads: rows ?? [] };
  });

// PUBLIC: fetch all currently-active ads across placements (for staff/internal views)
export const getAllActiveAds = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("active_ads_public")
      .select("id, title, caption, image_url, target_url, placement")
      .order("placement", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { ads: rows ?? [] };
  });

// PUBLIC: track ad impression / click
export const trackAdEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { adId: string; eventType: "impression" | "click"; visitorId?: string }) =>
    z
      .object({
        adId: z.string().uuid(),
        eventType: z.enum(["impression", "click"]),
        visitorId: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const col = data.eventType === "impression" ? "impression_count" : "click_count";
    await supabaseAdmin.rpc("increment_ad_metric" as any, {
      _ad_id: data.adId,
      _column: col,
    });
    return { ok: true };
  });

// ADMIN: list all ads (ads_manager role)
export const listAds = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("ads_manager", "ads.listAds")])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { ads: data ?? [] };
  });

// ADMIN: upsert ad
export const upsertAd = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("ads_manager", "ads.upsertAd")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(200),
        advertiser_name: z.string().max(200).optional().nullable(),
        advertiser_email: z.string().email().max(255).optional().nullable(),
        image_url: z.string().url().max(2000),
        target_url: z.string().url().max(2000),
        placement: placementSchema,
        caption: z.string().max(500).optional().nullable(),
        starts_at: z.string().optional().nullable(),
        ends_at: z.string().optional().nullable(),
        priority: z.number().int().min(0).max(1000).default(0),
        status: statusSchema.default("draft"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { error } = await supabase.from("advertisements").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("advertisements")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("ads_manager", "ads.deleteAd")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("advertisements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

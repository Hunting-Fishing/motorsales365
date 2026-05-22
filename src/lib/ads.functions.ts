import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const placementSchema = z.enum(["home_carousel", "browse_top", "rides_top", "listing_sidebar", "export_top"]);
const statusSchema = z.enum(["draft", "scheduled", "active", "paused", "ended"]);

// PUBLIC: fetch active ads for a placement
export const getActiveAds = createServerFn({ method: "GET" })
  .inputValidator((input: { placement: string; limit?: number }) =>
    z.object({ placement: placementSchema, limit: z.number().int().min(1).max(20).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("advertisements")
      .select("id, title, caption, image_url, target_url, placement, advertiser_name")
      .eq("placement", data.placement)
      .eq("status", "active")
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
      .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 6);
    if (error) throw new Error(error.message);
    return { ads: rows ?? [] };
  });

// PUBLIC: record impression / click
export const trackAdEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { adId: string; eventType: "impression" | "click"; visitorId?: string }) =>
    z.object({
      adId: z.string().uuid(),
      eventType: z.enum(["impression", "click"]),
      visitorId: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("ad_events").insert({
      ad_id: data.adId,
      event_type: data.eventType,
      visitor_id: data.visitorId ?? null,
    });
    return { ok: true };
  });

// ADMIN: list all ads
export const listAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: canManage } = await supabase.rpc("can_manage_ads", { _user_id: userId });
    if (!canManage) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { ads: data ?? [] };
  });

// ADMIN: upsert ad
export const upsertAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
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
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { error } = await supabase.from("advertisements").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("advertisements").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("advertisements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

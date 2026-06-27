import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

export const adminListFeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_product_feeds" as any)
      .select("*")
      .order("country", { ascending: true })
      .order("merchant_label", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminToggleFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_enabled: boolean }) =>
    z.object({ id: z.string().uuid(), is_enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_product_feeds" as any)
      .update({ is_enabled: data.is_enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSyncFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { syncFeed } = await import("@/lib/partner-feed.server");
    return syncFeed(data.id);
  });

/** Public: search ingested partner products by free text + country. */
export const searchPartnerProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q?: string; country?: string; limit?: number } | undefined) =>
    z
      .object({
        q: z.string().trim().max(200).optional(),
        country: z.string().trim().length(2).optional(),
        limit: z.number().int().min(1).max(48).default(12),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const country = (data.country ?? "PH").toUpperCase();
    let q = supabaseAdmin
      .from("partner_products" as any)
      .select("network,merchant_slug,sku,title,brand,price,currency,image_url,deeplink,country")
      .eq("country", country)
      .limit(data.limit);
    if (data.q && data.q.trim()) {
      // simple ILIKE; trigram index speeds it up
      q = q.ilike("title", `%${data.q.trim()}%`);
    }
    const { data: rows, error } = await q;
    if (error) return [];
    return (rows as any[]) ?? [];
  });

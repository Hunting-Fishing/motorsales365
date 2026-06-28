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

/** Public: search ingested partner products by free text + vehicle filters + country. */
export const searchPartnerProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { q?: string; country?: string; limit?: number; make?: string; model?: string; year?: string | number } | undefined) =>
      z
        .object({
          q: z.string().trim().max(200).optional(),
          country: z.string().trim().length(2).optional(),
          limit: z.number().int().min(1).max(48).default(12),
          make: z.string().trim().max(40).optional(),
          model: z.string().trim().max(40).optional(),
          year: z.union([z.string(), z.number()]).optional(),
        })
        .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const country = (data.country ?? "PH").toUpperCase();

    // Build AND-ed token list: structured vehicle filters first, then free-text fallback.
    const tokens: string[] = [];
    if (data.make) tokens.push(data.make.trim());
    if (data.model) tokens.push(data.model.trim());
    if (data.year != null) {
      const y = String(data.year).trim();
      if (/^\d{4}$/.test(y)) tokens.push(y);
    }
    // Only use free-text q if no structured filters — avoids double-matching the same words.
    if (tokens.length === 0 && data.q && data.q.trim()) tokens.push(data.q.trim());

    let q = supabaseAdmin
      .from("partner_products" as any)
      .select("network,merchant_slug,sku,title,brand,price,currency,image_url,deeplink,country")
      .eq("country", country)
      .limit(data.limit);

    for (const t of tokens) {
      // Escape PostgREST ILIKE wildcards in user input.
      const safe = t.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.ilike("title", `%${safe}%`);
    }

    const { data: rows, error } = await q;
    if (error) return [];
    return (rows as any[]) ?? [];
  });


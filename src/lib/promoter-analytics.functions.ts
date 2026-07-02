/**
 * Promoter/partner engagement analytics.
 * Fire-and-forget inserts into promoter_analytics_events.
 * Public: anyone (incl. anon visitors) may log an event.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  surface: z.string().min(1).max(64),
  event: z.string().min(1).max(64),
  cta_id: z.string().max(64).nullable().optional(),
  variant: z.string().max(32).nullable().optional(),
  partner_code: z.string().max(64).nullable().optional(),
  session_hash: z.string().max(128).nullable().optional(),
  path: z.string().max(256).nullable().optional(),
  referrer: z.string().max(512).nullable().optional(),
  meta: z.record(z.string(), z.any()).nullable().optional(),
});


export const recordPromoterEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Best-effort insert; never throw to the caller.
    try {
      await supabaseAdmin.from("promoter_analytics_events").insert({
        surface: data.surface,
        event: data.event,
        cta_id: data.cta_id ?? null,
        variant: data.variant ?? null,
        partner_code: data.partner_code ?? null,
        session_hash: data.session_hash ?? null,
        path: data.path ?? null,
        referrer: data.referrer ?? null,
        meta: (data.meta ?? null) as never,
      });
    } catch {
      /* swallow — analytics must never break the UI */
    }
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LayoutOverride = { cx: number; cy: number; size: number };
export type LayoutMap = Record<string, LayoutOverride>;

const upsertSchema = z.object({
  templateId: z.string().min(1).max(100).regex(/^[a-z0-9_:-]+$/i),
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  size: z.number().min(0.05).max(0.8),
});

const deleteSchema = z.object({
  templateId: z.string().min(1).max(100).regex(/^[a-z0-9_:-]+$/i),
});

type Row = { template_id: string; cx: number; cy: number; size: number };

export const listQrAdLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("qr_ad_layouts")
      .select("template_id, cx, cy, size")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const map: LayoutMap = {};
    for (const r of (data ?? []) as Row[]) {
      map[r.template_id] = { cx: Number(r.cx), cy: Number(r.cy), size: Number(r.size) };
    }
    return map;
  });

export const upsertQrAdLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("qr_ad_layouts")
      .upsert(
        {
          user_id: userId,
          template_id: data.templateId,
          cx: data.cx,
          cy: data.cy,
          size: data.size,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,template_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShareKitLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("qr_ad_layouts")
      .delete()
      .eq("user_id", userId)
      .eq("template_id", data.templateId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

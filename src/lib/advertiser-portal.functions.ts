import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const placementSchema = z.enum([
  "home_carousel",
  "browse_top",
  "rides_top",
  "listing_sidebar",
  "export_top",
  "shop_top",
  "shop_sidebar",
  "category_banner",
]);

const submitSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  caption: z.string().max(500).optional().nullable(),
  image_url: z.string().url().max(2000),
  target_url: z.string().url().max(2000),
  placement: placementSchema,
  category_slug: z.string().max(64).regex(/^[a-z0-9_-]+$/).optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
});

// LIST: my submitted campaigns
export const listMyAdvertisements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { ads: data ?? [] };
  });

// SUBMIT: insert as draft (admin approves before going live)
export const submitMyAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.id) {
      // Update only if owned + still draft/paused (cannot edit while approved/active)
      const { data: existing } = await supabaseAdmin
        .from("advertisements")
        .select("created_by, status")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing || (existing as any).created_by !== userId) {
        throw new Error("Not authorized to edit this campaign.");
      }
      if (!["draft", "paused"].includes((existing as any).status)) {
        throw new Error("Campaign is live — pause it first to edit.");
      }
      const payload: any = { ...data };
      delete payload.id;
      payload.status = "draft"; // re-submission needs re-approval
      const { error } = await supabaseAdmin
        .from("advertisements")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, status: "draft" };
    }
    const { data: row, error } = await supabaseAdmin
      .from("advertisements")
      .insert({ ...data, status: "draft", created_by: userId, priority: 0 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id, status: "draft" };
  });

// PAUSE: owner can pause their own running ad
export const pauseMyAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("advertisements")
      .select("created_by, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing || (existing as any).created_by !== userId) {
      throw new Error("Not authorized.");
    }
    const { error } = await supabaseAdmin
      .from("advertisements")
      .update({ status: "paused" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

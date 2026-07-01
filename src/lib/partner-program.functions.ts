import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const ApplySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  channel_type: z.enum(["individual", "influencer", "shop", "community", "other"]),
  platforms: z.array(z.string().max(40)).max(10).default([]),
  audience_band: z.string().trim().max(40).optional().nullable(),
  pitch: z.string().trim().max(500).optional().nullable(),
  agreed_terms: z.literal(true),
  agreed_not_employee: z.literal(true),
});

export const submitPartnerProgramApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApplySchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb.from("partner_program_applications" as any).insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      city: data.city || null,
      region: data.region || null,
      channel_type: data.channel_type,
      platforms: data.platforms,
      audience_band: data.audience_band || null,
      pitch: data.pitch || null,
      agreed_terms: true,
      agreed_terms_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const adminListPartnerProgramApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("partner_program_applications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data as any[]) ?? [];
  });

export const adminUpdatePartnerProgramApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      status?: "pending" | "approved" | "rejected";
      admin_notes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = {};
    if (data.status) {
      patch.status = data.status;
      patch.reviewer_id = context.userId;
      patch.reviewed_at = new Date().toISOString();
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await context.supabase
      .from("partner_program_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getMyPartnerProgramProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: partner } = await context.supabase
      .from("partner_program_partners" as any)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!partner) return { partner: null, events: [], totals: null };
    const { data: events } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("*")
      .eq("partner_id", (partner as any).id)
      .order("event_at", { ascending: false })
      .limit(200);
    const list = (events as any[]) ?? [];
    const totals = {
      pending: list.filter((e) => e.status === "pending").reduce((a, e) => a + Number(e.commission_php), 0),
      approved: list.filter((e) => e.status === "approved").reduce((a, e) => a + Number(e.commission_php), 0),
      paid: list.filter((e) => e.status === "paid").reduce((a, e) => a + Number(e.commission_php), 0),
      clawed_back: list.filter((e) => e.status === "clawed_back").reduce((a, e) => a + Number(e.commission_php), 0),
    };
    return { partner, events: list, totals };
  });

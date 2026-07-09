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

export type FranchiseTier = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  monthly_fee_cents: number;
  setup_fee_cents: number;
  parts_discount_bps: number;
  ad_discount_bps: number;
  includes_shop_manager: boolean;
  includes_inventory: boolean;
  includes_shared_crm: boolean;
  branding_rights: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
};

export type FranchiseApplication = {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  business_name: string;
  business_id: string | null;
  city: string | null;
  province: string | null;
  tier_slug: string;
  shop_type: string | null;
  years_in_business: number | null;
  staff_count: number | null;
  monthly_parts_spend_cents: number | null;
  existing_brands: string[] | null;
  website_url: string | null;
  notes: string | null;
  status: "pending" | "in_review" | "info_requested" | "approved" | "rejected";
  assigned_tier_slug: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FranchiseMembership = {
  id: string;
  user_id: string;
  business_id: string | null;
  application_id: string | null;
  tier_slug: string;
  pending_tier_slug: string | null;
  member_number: string;
  status: "pending_payment" | "active" | "past_due" | "suspended" | "cancelled";
  started_at: string;
  renews_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  ad_discount_code: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
};


export type FranchiseAppMessage = {
  id: string;
  application_id: string;
  sender_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

// -------- Public --------

export const listActiveTiers = createServerFn({ method: "GET" }).handler(
  async (): Promise<FranchiseTier[]> => {
    const sb = publicClient();
    const { data, error } = await sb
      .from("franchise_tiers" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return ((data as any[]) ?? []) as FranchiseTier[];
  },
);

const ApplySchema = z.object({
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  business_name: z.string().trim().min(2).max(200),
  city: z.string().trim().max(80).optional().nullable(),
  province: z.string().trim().max(80).optional().nullable(),
  tier_slug: z.enum(["partner", "franchise"]),
  shop_type: z.string().trim().max(80).optional().nullable(),
  years_in_business: z.number().int().min(0).max(200).optional().nullable(),
  staff_count: z.number().int().min(0).max(10000).optional().nullable(),
  monthly_parts_spend_cents: z.number().int().min(0).optional().nullable(),
  existing_brands: z.array(z.string().max(60)).max(20).default([]),
  website_url: z.string().trim().url().max(300).optional().or(z.literal("")).nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  agreed_terms: z.literal(true),
});

export const submitFranchiseApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApplySchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const payload: any = {
      contact_name: data.contact_name,
      contact_email: data.contact_email.toLowerCase(),
      contact_phone: data.contact_phone || null,
      business_name: data.business_name,
      city: data.city || null,
      province: data.province || null,
      tier_slug: data.tier_slug,
      shop_type: data.shop_type || null,
      years_in_business: data.years_in_business ?? null,
      staff_count: data.staff_count ?? null,
      monthly_parts_spend_cents: data.monthly_parts_spend_cents ?? null,
      existing_brands: data.existing_brands ?? [],
      website_url: data.website_url || null,
      notes: data.notes || null,
      status: "pending",
    };
    const { data: row, error } = await sb
      .from("franchise_applications" as any)
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id };
  });

// -------- Authenticated (applicant) --------

export const getMyApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      application: FranchiseApplication | null;
      messages: FranchiseAppMessage[];
      membership: FranchiseMembership | null;
    }> => {
      const { supabase, userId, claims } = context;
      const email = ((claims?.email as string | undefined) ?? "").toLowerCase();

      let query = supabase
        .from("franchise_applications" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (email) {
        query = query.or(`user_id.eq.${userId},contact_email.eq.${email}`);
      } else {
        query = query.eq("user_id", userId);
      }

      const { data: apps } = await query;
      const application = ((apps as any[]) ?? [])[0] ?? null;

      let messages: FranchiseAppMessage[] = [];
      if (application) {
        const { data: msgs } = await supabase
          .from("franchise_application_messages" as any)
          .select("*")
          .eq("application_id", application.id)
          .eq("is_internal", false)
          .order("created_at", { ascending: true });
        messages = ((msgs as any[]) ?? []) as FranchiseAppMessage[];
      }

      const { data: memRow } = await supabase
        .from("franchise_memberships" as any)
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending_payment", "active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();


      return {
        application: application as FranchiseApplication | null,
        messages,
        membership: (memRow as FranchiseMembership | null) ?? null,
      };
    },
  );

export const postApplicationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string; body: string }) => ({
    applicationId: z.string().uuid().parse(d.applicationId),
    body: z.string().trim().min(1).max(2000).parse(d.body),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("franchise_application_messages" as any)
      .insert({
        application_id: data.applicationId,
        sender_id: context.userId,
        body: data.body,
        is_internal: false,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Admin --------

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const adminListApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { status?: string | null; search?: string | null; limit?: number } | undefined) => ({
      status: d?.status ?? null,
      search: (d?.search ?? "").trim() || null,
      limit: Math.max(1, Math.min(500, Number(d?.limit ?? 200))),
    }),
  )
  .handler(async ({ data, context }): Promise<FranchiseApplication[]> => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("franchise_applications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, " ");
      q = q.or(
        `business_name.ilike.%${s}%,contact_name.ilike.%${s}%,contact_email.ilike.%${s}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return ((rows as any[]) ?? []) as FranchiseApplication[];
  });

export const adminGetApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: app, error } = await context.supabase
      .from("franchise_applications" as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    const { data: msgs } = await context.supabase
      .from("franchise_application_messages" as any)
      .select("*")
      .eq("application_id", data.id)
      .order("created_at", { ascending: true });
    return {
      application: (app as FranchiseApplication | null) ?? null,
      messages: ((msgs as any[]) ?? []) as FranchiseAppMessage[],
    };
  });

export const adminDecideApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      decision: "approve" | "reject" | "request_info" | "in_review";
      assigned_tier_slug?: string | null;
      reviewer_notes?: string | null;
      message_to_applicant?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const { data: app, error: aErr } = await context.supabase
      .from("franchise_applications" as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!app) throw new Error("Application not found");

    const statusMap: Record<typeof data.decision, FranchiseApplication["status"]> = {
      approve: "approved",
      reject: "rejected",
      request_info: "info_requested",
      in_review: "in_review",
    };

    const nextStatus = statusMap[data.decision];
    const updates: any = {
      status: nextStatus,
      reviewer_id: context.userId,
      reviewer_notes: data.reviewer_notes ?? (app as any).reviewer_notes ?? null,
      decided_at:
        data.decision === "approve" || data.decision === "reject" ? new Date().toISOString() : null,
    };
    if (data.decision === "approve") {
      updates.assigned_tier_slug = data.assigned_tier_slug ?? (app as any).tier_slug;
    }

    const { error: uErr } = await context.supabase
      .from("franchise_applications" as any)
      .update(updates)
      .eq("id", data.id);
    if (uErr) throw uErr;

    let membershipId: string | null = null;
    if (data.decision === "approve" && (app as any).user_id) {
      const assignedTier = updates.assigned_tier_slug as string;
      // Create membership in pending_payment state; ad_discount_code and
      // active status are set by the Stripe webhook after checkout completes.
      const { data: mem, error: mErr } = await context.supabase
        .from("franchise_memberships" as any)
        .insert({
          user_id: (app as any).user_id,
          business_id: (app as any).business_id,
          application_id: data.id,
          tier_slug: assignedTier,
          pending_tier_slug: assignedTier,
          status: "pending_payment",
        })
        .select("id")
        .single();
      if (mErr) throw mErr;
      membershipId = (mem as any).id;
    }


    if (data.message_to_applicant && data.message_to_applicant.trim()) {
      await context.supabase.from("franchise_application_messages" as any).insert({
        application_id: data.id,
        sender_id: context.userId,
        body: data.message_to_applicant.trim(),
        is_internal: false,
      });
    }

    return { ok: true, membershipId };
  });

export const adminPostInternalNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("franchise_application_messages" as any)
      .insert({
        application_id: data.applicationId,
        sender_id: context.userId,
        body: data.body,
        is_internal: true,
      });
    if (error) throw error;
    return { ok: true };
  });

// -------- Admin: tier config --------

export const adminListTiers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FranchiseTier[]> => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("franchise_tiers" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data as any[]) ?? []) as FranchiseTier[];
  });

export const adminUpsertTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<FranchiseTier> & { slug: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload: any = {
      slug: data.slug,
      name: data.name,
      tagline: data.tagline ?? null,
      monthly_fee_cents: Math.max(0, Number(data.monthly_fee_cents ?? 0)),
      setup_fee_cents: Math.max(0, Number(data.setup_fee_cents ?? 0)),
      parts_discount_bps: Math.max(0, Math.min(10000, Number(data.parts_discount_bps ?? 0))),
      ad_discount_bps: Math.max(0, Math.min(10000, Number(data.ad_discount_bps ?? 0))),
      includes_shop_manager: !!data.includes_shop_manager,
      includes_inventory: !!data.includes_inventory,
      includes_shared_crm: !!data.includes_shared_crm,
      branding_rights: data.branding_rights ?? null,
      features: Array.isArray(data.features) ? data.features : [],
      is_active: data.is_active ?? true,
      sort_order: Number(data.sort_order ?? 0),
    };
    const { error } = await context.supabase
      .from("franchise_tiers" as any)
      .upsert(payload, { onConflict: "slug" });
    if (error) throw error;
    return { ok: true };
  });

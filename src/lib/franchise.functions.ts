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

export type FranchiseApplicationCounts = {
  pending: number;
  inReview: number;
  infoRequested: number;
  total: number;
};

export const adminCountFranchiseApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FranchiseApplicationCounts> => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("franchise_applications" as any)
      .select("status", { count: "exact" })
      .in("status", ["pending", "in_review", "info_requested"]);
    if (error) throw error;
    const rows = (data as any[]) ?? [];
    const counts = { pending: 0, inReview: 0, infoRequested: 0 };
    for (const r of rows) {
      if (r.status === "pending") counts.pending++;
      else if (r.status === "in_review") counts.inReview++;
      else if (r.status === "info_requested") counts.infoRequested++;
    }
    return {
      ...counts,
      total: counts.pending + counts.inReview + counts.infoRequested,
    };
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

    // Audit log — record the action, transitions, notes, and message.
    await context.supabase.from("franchise_application_audit" as any).insert({
      application_id: data.id,
      actor_id: context.userId,
      action: data.decision,
      from_status: (app as any).status ?? null,
      to_status: nextStatus,
      from_tier: (app as any).assigned_tier_slug ?? null,
      to_tier: updates.assigned_tier_slug ?? (app as any).assigned_tier_slug ?? null,
      reviewer_notes: data.reviewer_notes?.trim() || null,
      message_to_applicant: data.message_to_applicant?.trim() || null,
      metadata: membershipId ? { membership_id: membershipId } : {},
    });

    return { ok: true, membershipId };
  });

export type BulkApproveItem = { id: string; assigned_tier_slug: string };
export type BulkApproveResult = {
  id: string;
  ok: boolean;
  membershipId: string | null;
  error: string | null;
};

export const adminBulkApproveApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      items: BulkApproveItem[];
      reviewer_notes?: string | null;
      message_to_applicant?: string | null;
    }) => {
      if (!Array.isArray(d?.items) || d.items.length === 0) throw new Error("No items provided");
      if (d.items.length > 100) throw new Error("Too many items (max 100)");
      const items = d.items.map((it) => {
        if (!/^[0-9a-f-]{36}$/i.test(it.id)) throw new Error("Invalid application id");
        const slug = (it.assigned_tier_slug ?? "").trim();
        if (!slug) throw new Error("Every selected application needs an assigned tier");
        return { id: it.id, assigned_tier_slug: slug };
      });
      return {
        items,
        reviewer_notes: d.reviewer_notes ?? null,
        message_to_applicant: d.message_to_applicant ?? null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ results: BulkApproveResult[] }> => {
    await ensureAdmin(context);

    // Validate every tier slug is active up-front.
    const uniqueSlugs = Array.from(new Set(data.items.map((i) => i.assigned_tier_slug)));
    const { data: activeTiers, error: tErr } = await context.supabase
      .from("franchise_tiers" as any)
      .select("slug,is_active")
      .in("slug", uniqueSlugs);
    if (tErr) throw tErr;
    const activeSet = new Set(
      ((activeTiers as any[]) ?? []).filter((t) => t.is_active).map((t) => t.slug as string),
    );

    const results: BulkApproveResult[] = [];
    for (const item of data.items) {
      try {
        if (!activeSet.has(item.assigned_tier_slug)) {
          results.push({
            id: item.id,
            ok: false,
            membershipId: null,
            error: `Tier "${item.assigned_tier_slug}" is not active`,
          });
          continue;
        }

        const { data: app, error: aErr } = await context.supabase
          .from("franchise_applications" as any)
          .select("*")
          .eq("id", item.id)
          .maybeSingle();
        if (aErr) throw aErr;
        if (!app) {
          results.push({ id: item.id, ok: false, membershipId: null, error: "Not found" });
          continue;
        }
        if ((app as any).status === "approved") {
          results.push({
            id: item.id,
            ok: false,
            membershipId: null,
            error: "Already approved",
          });
          continue;
        }

        const { error: uErr } = await context.supabase
          .from("franchise_applications" as any)
          .update({
            status: "approved",
            reviewer_id: context.userId,
            reviewer_notes: data.reviewer_notes ?? (app as any).reviewer_notes ?? null,
            decided_at: new Date().toISOString(),
            assigned_tier_slug: item.assigned_tier_slug,
          })
          .eq("id", item.id);
        if (uErr) throw uErr;

        let membershipId: string | null = null;
        if ((app as any).user_id) {
          const { data: mem, error: mErr } = await context.supabase
            .from("franchise_memberships" as any)
            .insert({
              user_id: (app as any).user_id,
              business_id: (app as any).business_id,
              application_id: item.id,
              tier_slug: item.assigned_tier_slug,
              pending_tier_slug: item.assigned_tier_slug,
              status: "pending_payment",
            })
            .select("id")
            .single();
          if (mErr) throw mErr;
          membershipId = (mem as any).id;
        }

        if (data.message_to_applicant && data.message_to_applicant.trim()) {
          await context.supabase.from("franchise_application_messages" as any).insert({
            application_id: item.id,
            sender_id: context.userId,
            body: data.message_to_applicant.trim(),
            is_internal: false,
          });
        }

        await context.supabase.from("franchise_application_audit" as any).insert({
          application_id: item.id,
          actor_id: context.userId,
          action: "bulk_approve",
          from_status: (app as any).status ?? null,
          to_status: "approved",
          from_tier: (app as any).assigned_tier_slug ?? null,
          to_tier: item.assigned_tier_slug,
          reviewer_notes: data.reviewer_notes?.trim() || null,
          message_to_applicant: data.message_to_applicant?.trim() || null,
          metadata: membershipId ? { membership_id: membershipId } : {},
        });

        results.push({ id: item.id, ok: true, membershipId, error: null });
      } catch (e: any) {
        results.push({
          id: item.id,
          ok: false,
          membershipId: null,
          error: e?.message ?? "Failed",
        });
      }
    }

    return { results };
  });

export type FranchiseAuditEntry = {
  id: string;
  application_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: "approve" | "reject" | "request_info" | "in_review" | "bulk_approve" | "tier_change" | "note_update";
  from_status: string | null;
  to_status: string | null;
  from_tier: string | null;
  to_tier: string | null;
  reviewer_notes: string | null;
  message_to_applicant: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
};

export const listApplicationAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.applicationId)) throw new Error("Invalid application id");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ entries: FranchiseAuditEntry[] }> => {
    // RLS restricts to admins or the applicant themselves.
    const { data: rows, error } = await context.supabase
      .from("franchise_application_audit" as any)
      .select("*")
      .eq("application_id", data.applicationId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const actorIds = Array.from(
      new Set(((rows as any[]) ?? []).map((r) => r.actor_id).filter(Boolean)),
    ) as string[];
    let nameMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles" as any)
        .select("id, full_name, display_name, contact_email")
        .in("id", actorIds);
      for (const p of (profiles as any[]) ?? []) {
        nameMap[p.id] =
          p.full_name || p.display_name || p.contact_email || `User ${String(p.id).slice(0, 8)}`;
      }
    }

    const entries: FranchiseAuditEntry[] = ((rows as any[]) ?? []).map((r) => ({
      id: r.id,
      application_id: r.application_id,
      actor_id: r.actor_id,
      actor_name: r.actor_id ? nameMap[r.actor_id] ?? null : null,
      action: r.action,
      from_status: r.from_status,
      to_status: r.to_status,
      from_tier: r.from_tier,
      to_tier: r.to_tier,
      reviewer_notes: r.reviewer_notes,
      message_to_applicant: r.message_to_applicant,
      metadata: r.metadata ?? {},
      created_at: r.created_at,
    }));

    return { entries };
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

// -------- Public partner directory --------

export type PublicPartner = {
  membership_id: string;
  tier_slug: string;
  tier_name: string | null;
  member_number: string;
  started_at: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  city: string | null;
  province: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

export const listPublicPartners = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { tier?: string | null; province?: string | null; limit?: number } | undefined) => ({
      tier: d?.tier?.trim() || null,
      province: d?.province?.trim() || null,
      limit: Math.max(1, Math.min(200, Number(d?.limit ?? 60))),
    }),
  )
  .handler(async ({ data }): Promise<PublicPartner[]> => {
    const sb = publicClient();
    const { data: rows, error } = await (sb as any).rpc("list_public_partners", {
      _tier_slug: data.tier,
      _province: data.province,
      _limit: data.limit,
    });
    if (error) return [];
    return ((rows as any[]) ?? []) as PublicPartner[];
  });

// -------- Presence (for site header/menu) --------

export const getMyFranchisePresence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      hasApplication: boolean;
      applicationStatus: FranchiseApplication["status"] | null;
      hasMembership: boolean;
      membershipStatus: FranchiseMembership["status"] | null;
    }> => {
      const { supabase, userId, claims } = context;
      const email = ((claims?.email as string | undefined) ?? "").toLowerCase();
      let q = supabase
        .from("franchise_applications" as any)
        .select("status")
        .order("created_at", { ascending: false })
        .limit(1);
      q = email ? q.or(`user_id.eq.${userId},contact_email.eq.${email}`) : q.eq("user_id", userId);
      const { data: apps } = await q;
      const app = ((apps as any[]) ?? [])[0] ?? null;

      const { data: mem } = await supabase
        .from("franchise_memberships" as any)
        .select("status")
        .eq("user_id", userId)
        .in("status", ["pending_payment", "active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        hasApplication: !!app,
        applicationStatus: ((app as any)?.status ?? null) as any,
        hasMembership: !!mem,
        membershipStatus: ((mem as any)?.status ?? null) as any,
      };

    },
  );

// -------- Stripe: membership checkout & portal --------

export const createFranchiseCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { membershipId: string; returnUrl: string; environment: "sandbox" | "live" }) => {
      if (!/^[0-9a-f-]{36}$/i.test(d.membershipId)) throw new Error("Invalid membershipId");
      if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid env");
      return d;
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { supabase, userId, claims } = context;
    const { data: mem, error: mErr } = await supabase
      .from("franchise_memberships" as any)
      .select("*")
      .eq("id", data.membershipId)
      .maybeSingle();
    if (mErr || !mem) return { error: "Membership not found" };
    if ((mem as any).user_id !== userId) return { error: "Not your membership" };
    if ((mem as any).status === "active") return { error: "Already active" };

    const tierSlug = ((mem as any).pending_tier_slug ?? (mem as any).tier_slug) as string;
    const { data: tier } = await supabase
      .from("franchise_tiers" as any)
      .select("*")
      .eq("slug", tierSlug)
      .maybeSingle();
    if (!tier) return { error: "Tier not found" };
    const t = tier as any;
    if (!t.stripe_monthly_price_id) {
      return { error: "This tier isn't wired to Stripe yet. An admin needs to sync it." };
    }

    try {
      const { createStripeClient, getStripeErrorMessage, validateReturnUrl } = await import(
        "@/lib/stripe.server"
      );
      validateReturnUrl(data.returnUrl);
      const stripe = createStripeClient(data.environment);
      const email = (claims as any)?.email as string | undefined;

      // Resolve/create customer with userId metadata.
      let customerId: string | null = (mem as any).stripe_customer_id ?? null;
      if (!customerId) {
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });
        if (found.data.length) customerId = found.data[0].id;
      }
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(email && { email }),
          metadata: { userId },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        line_items: [{ price: t.stripe_monthly_price_id as string, quantity: 1 }],
        ...(t.stripe_setup_price_id
          ? {
              subscription_data: {
                description: `${t.name} membership`,
                metadata: {
                  userId,
                  kind: "franchise",
                  franchise_membership_id: data.membershipId,
                  tier_slug: tierSlug,
                },
                add_invoice_items: [{ price: t.stripe_setup_price_id as string, quantity: 1 }],
              },
            }
          : {
              subscription_data: {
                description: `${t.name} membership`,
                metadata: {
                  userId,
                  kind: "franchise",
                  franchise_membership_id: data.membershipId,
                  tier_slug: tierSlug,
                },
              },
            }),
        metadata: {
          userId,
          kind: "franchise",
          franchise_membership_id: data.membershipId,
          tier_slug: tierSlug,
        },
      } as any);

      // Persist customer for portal + resume flows.
      await supabase
        .from("franchise_memberships" as any)
        .update({ stripe_customer_id: customerId })
        .eq("id", data.membershipId);

      return { clientSecret: session.client_secret ?? "" };
    } catch (err) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(err) };
    }
  });

export const createFranchisePortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { returnUrl: string; environment: "sandbox" | "live" }) => {
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid env");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: mem } = await supabase
      .from("franchise_memberships" as any)
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const customerId = (mem as any)?.stripe_customer_id;
    if (!customerId) return { error: "No billing account yet" };
    try {
      const { createStripeClient, getStripeErrorMessage, validateReturnUrl } = await import(
        "@/lib/stripe.server"
      );
      validateReturnUrl(data.returnUrl);
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (err) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(err) };
    }
  });

// -------- Admin: sync a tier's product/prices into Stripe --------

export const adminSyncTierToStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; environment: "sandbox" | "live" }) => {
    if (!/^[a-z0-9_-]+$/.test(d.slug)) throw new Error("Invalid slug");
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid env");
    return d;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: tier, error } = await context.supabase
      .from("franchise_tiers" as any)
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !tier) throw new Error("Tier not found");
    const t = tier as any;

    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(data.environment);

    // Upsert product
    let productId: string | null = t.stripe_product_id ?? null;
    if (productId) {
      await stripe.products.update(productId, {
        name: `365 ${t.name} Membership`,
        description: t.tagline ?? undefined,
        active: !!t.is_active,
      });
    } else {
      const p = await stripe.products.create({
        name: `365 ${t.name} Membership`,
        description: t.tagline ?? undefined,
        active: !!t.is_active,
        metadata: { kind: "franchise_tier", tier_slug: t.slug },
      });
      productId = p.id;
    }

    // Monthly recurring price (create new when amount differs; Stripe prices are immutable)
    const monthlyLookup = `franchise_${t.slug}_monthly`;
    const setupLookup = `franchise_${t.slug}_setup`;

    async function upsertPrice(
      lookupKey: string,
      unitAmount: number,
      recurring: boolean,
    ): Promise<string | null> {
      if (unitAmount <= 0) return null;
      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const current = existing.data[0];
      if (
        current &&
        current.unit_amount === unitAmount &&
        current.product === productId &&
        (recurring ? current.recurring?.interval === "month" : !current.recurring)
      ) {
        return current.id;
      }
      // Deactivate old + create new with same lookup_key (Stripe transfers key).
      if (current) {
        await stripe.prices.update(current.id, { active: false, lookup_key: null as any } as any).catch(() => {});
      }
      const created = await stripe.prices.create({
        product: productId!,
        currency: "php",
        unit_amount: unitAmount,
        lookup_key: lookupKey,
        nickname: `365 ${t.name} — ${recurring ? "monthly" : "setup"}`,
        ...(recurring ? { recurring: { interval: "month" } } : {}),
      });
      return created.id;
    }

    const monthlyId = await upsertPrice(monthlyLookup, Number(t.monthly_fee_cents ?? 0), true);
    const setupId = await upsertPrice(setupLookup, Number(t.setup_fee_cents ?? 0), false);

    await context.supabase
      .from("franchise_tiers" as any)
      .update({
        stripe_product_id: productId,
        stripe_monthly_price_id: monthlyId,
        stripe_setup_price_id: setupId,
        stripe_synced_at: new Date().toISOString(),
      })
      .eq("slug", data.slug);

    return {
      ok: true,
      stripe_product_id: productId,
      stripe_monthly_price_id: monthlyId,
      stripe_setup_price_id: setupId,
    };
  });

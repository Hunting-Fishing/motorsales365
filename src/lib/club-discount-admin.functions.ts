import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getClubDiscountConfig, type ClubDiscountConfig } from "@/lib/club-discount.server";

const SCOPES = ["ad_order", "boost", "bundle", "subscription", "passport_premium", "promotion"] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Read the current club-discount config (admin only). */
export const getClubDiscountAdminConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClubDiscountConfig> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    return getClubDiscountConfig(supabase);
  });

const UpdateConfigSchema = z.object({
  enabled: z.boolean(),
  pct: z.number().min(0).max(100),
  couponDuration: z.enum(["auto", "once", "forever"]),
  requireVerified: z.boolean(),
  includePendingClubs: z.boolean(),
  includePendingMembers: z.boolean(),
});

const COUPON_DURATION_VALUE: Record<"auto" | "once" | "forever", number> = {
  auto: 0,
  once: 1,
  forever: 2,
};

/** Persist config knobs to pricing_settings (admin only). */
export const updateClubDiscountAdminConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateConfigSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const updates: Array<{ key: string; value: number }> = [
      { key: "club_member_discount_enabled", value: data.enabled ? 1 : 0 },
      { key: "club_member_discount_pct", value: Math.round(data.pct * 100) / 100 },
      { key: "club_member_discount_coupon_duration", value: COUPON_DURATION_VALUE[data.couponDuration] },
      { key: "club_member_discount_require_verified", value: data.requireVerified ? 1 : 0 },
      { key: "club_member_discount_include_pending_clubs", value: data.includePendingClubs ? 1 : 0 },
      { key: "club_member_discount_include_pending_members", value: data.includePendingMembers ? 1 : 0 },
    ];
    for (const u of updates) {
      const { error } = await supabase
        .from("pricing_settings")
        .update({ value: u.value, updated_at: new Date().toISOString() })
        .eq("key", u.key);
      if (error) throw new Error(`Failed to update ${u.key}: ${error.message}`);
    }
    return getClubDiscountConfig(supabase);
  });

const FiltersSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  clubId: z.string().uuid().optional().nullable(),
  scope: z.enum(SCOPES).optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  search: z.string().trim().max(200).optional().nullable(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type DiscountGrantRow = {
  id: string;
  applied_at: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  club_id: string | null;
  club_name: string | null;
  club_slug: string | null;
  scope: string;
  discount_pct: number;
  original_amount_php: number;
  discount_amount_php: number;
  payment_id: string | null;
  payment_status: string | null;
  line_item_id: string | null;
};

export type DiscountGrantSummary = {
  totalRows: number;
  totalDiscount: number;
  totalOriginal: number;
};

export const listClubDiscountGrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FiltersSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    let query = supabase
      .from("club_member_discount_grants")
      .select(
        "id,applied_at,user_id,club_id,scope,discount_pct,original_amount_php,discount_amount_php,payment_id,line_item_id,club:clubs(name,slug),payment:payments(status)",
        { count: "exact" },
      );

    if (data.userId) query = query.eq("user_id", data.userId);
    if (data.clubId) query = query.eq("club_id", data.clubId);
    if (data.scope) query = query.eq("scope", data.scope);
    if (data.from) query = query.gte("applied_at", data.from);
    if (data.to) query = query.lte("applied_at", data.to);

    const { data: rows, count, error } = await query
      .order("applied_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const profileById = new Map<string, { full_name: string | null; email: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,first_name,last_name,personal_email")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) {
        const fullName =
          p.full_name ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          null;
        profileById.set(p.id, { full_name: fullName, email: p.personal_email ?? null });
      }
    }

    let mapped: DiscountGrantRow[] = (rows ?? []).map((r: any) => {
      const prof = profileById.get(r.user_id);
      return {
        id: r.id,
        applied_at: r.applied_at,
        user_id: r.user_id,
        user_email: prof?.email ?? null,
        user_name: prof?.full_name ?? null,
        club_id: r.club_id,
        club_name: r.club?.name ?? null,
        club_slug: r.club?.slug ?? null,
        scope: r.scope,
        discount_pct: Number(r.discount_pct ?? 0),
        original_amount_php: Number(r.original_amount_php ?? 0),
        discount_amount_php: Number(r.discount_amount_php ?? 0),
        payment_id: r.payment_id,
        payment_status: r.payment?.status ?? null,
        line_item_id: r.line_item_id,
      };
    });

    // Search across email / name / club name — applied client-side after
    // fetch because it spans joined tables. Admin-only + capped page size.
    if (data.search) {
      const q = data.search.toLowerCase();
      mapped = mapped.filter(
        (r) =>
          (r.user_email ?? "").toLowerCase().includes(q) ||
          (r.user_name ?? "").toLowerCase().includes(q) ||
          (r.club_name ?? "").toLowerCase().includes(q),
      );
    }

    const summary: DiscountGrantSummary = {
      totalRows: count ?? mapped.length,
      totalDiscount: mapped.reduce((s, r) => s + r.discount_amount_php, 0),
      totalOriginal: mapped.reduce((s, r) => s + r.original_amount_php, 0),
    };

    return { rows: mapped, summary };
  });

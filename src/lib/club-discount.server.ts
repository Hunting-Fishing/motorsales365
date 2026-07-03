/**
 * Club Member Discount helpers (server-only).
 *
 * Verified-club members get a percentage discount on internal, 365-controlled
 * purchases (ad packages, listing boosts, bundles, subscription tiers,
 * passport premium). Config lives in `pricing_settings` so the rate and
 * eligibility knobs can be tuned without a redeploy. Eligibility is
 * determined by the SQL helper `public.user_has_verified_club` OR, when
 * relaxed via config, by a direct join against `club_members` + `clubs`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClubCouponDuration = "auto" | "once" | "forever";

export type ClubDiscountConfig = {
  enabled: boolean;
  pct: number;
  couponDuration: ClubCouponDuration;
  requireVerified: boolean;
  includePendingClubs: boolean;
  includePendingMembers: boolean;
};

export type ClubDiscountStatus = ClubDiscountConfig & {
  eligible: boolean;
  /** First qualifying club the user is a member of, if any. */
  clubId: string | null;
  clubName: string | null;
  clubSlug: string | null;
};

export type ClubDiscountScope =
  | "ad_order"
  | "boost"
  | "bundle"
  | "subscription"
  | "passport_premium"
  | "promotion";

const CONFIG_KEYS = [
  "club_member_discount_pct",
  "club_member_discount_enabled",
  "club_member_discount_coupon_duration",
  "club_member_discount_require_verified",
  "club_member_discount_include_pending_clubs",
  "club_member_discount_include_pending_members",
] as const;

function couponDurationFromValue(v: number | undefined): ClubCouponDuration {
  if (v === 1) return "once";
  if (v === 2) return "forever";
  return "auto";
}

export async function getClubDiscountConfig(
  supabase: SupabaseClient<any, any, any>,
): Promise<ClubDiscountConfig> {
  const fallback: ClubDiscountConfig = {
    enabled: false,
    pct: 0,
    couponDuration: "auto",
    requireVerified: true,
    includePendingClubs: false,
    includePendingMembers: false,
  };
  const { data, error } = await supabase
    .from("pricing_settings")
    .select("key, value")
    .in("key", CONFIG_KEYS as unknown as string[]);
  if (error) return fallback;
  const map = new Map<string, number>((data ?? []).map((r: any) => [r.key, Number(r.value)]));
  const pct = Math.max(0, Math.min(100, map.get("club_member_discount_pct") ?? 0));
  const enabled = (map.get("club_member_discount_enabled") ?? 0) > 0 && pct > 0;
  return {
    enabled,
    pct,
    couponDuration: couponDurationFromValue(map.get("club_member_discount_coupon_duration")),
    requireVerified: (map.get("club_member_discount_require_verified") ?? 1) > 0,
    includePendingClubs: (map.get("club_member_discount_include_pending_clubs") ?? 0) > 0,
    includePendingMembers: (map.get("club_member_discount_include_pending_members") ?? 0) > 0,
  };
}

/**
 * Resolve the Stripe coupon `duration` for a given checkout mode using the
 * admin config. `auto` means "once for one-time, forever for subscriptions".
 */
export function resolveClubCouponDuration(
  isRecurring: boolean,
  config: Pick<ClubDiscountConfig, "couponDuration">,
): "once" | "forever" {
  if (config.couponDuration === "once") return "once";
  if (config.couponDuration === "forever") return "forever";
  return isRecurring ? "forever" : "once";
}

/**
 * Look up the user's discount status. Returns `eligible=false` when disabled
 * globally or when the user has no qualifying club membership per the current
 * config.
 */
export async function computeClubDiscountStatus(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<ClubDiscountStatus> {
  const cfg = await getClubDiscountConfig(supabase);
  const empty = { eligible: false, clubId: null, clubName: null, clubSlug: null };
  if (!cfg.enabled || !userId) return { ...cfg, ...empty };

  const memberStatuses = cfg.includePendingMembers ? ["active", "pending"] : ["active"];
  const clubStatuses = cfg.includePendingClubs ? ["active", "pending"] : ["active"];

  let query = supabase
    .from("club_members")
    .select("club_id, status, clubs!inner(id, name, slug, status, verified)")
    .eq("user_id", userId)
    .in("status", memberStatuses)
    .in("clubs.status", clubStatuses);
  if (cfg.requireVerified) query = query.eq("clubs.verified", true);

  const { data: rows } = await query.limit(1);
  const row: any = rows?.[0];
  if (!row) return { ...cfg, ...empty };
  const club = row.clubs;
  return {
    ...cfg,
    eligible: true,
    clubId: club?.id ?? row.club_id ?? null,
    clubName: club?.name ?? null,
    clubSlug: club?.slug ?? null,
  };
}

/**
 * Compute a peso discount amount from a subtotal + percent.
 * Rounds to 2 decimals (matches other pricing rounding in the app).
 */
export function computeDiscountAmountPhp(subtotalPhp: number, pct: number): number {
  if (!subtotalPhp || !pct || pct <= 0) return 0;
  const raw = (subtotalPhp * pct) / 100;
  return Math.round(raw * 100) / 100;
}

/**
 * Insert an audit row into `club_member_discount_grants`. Best-effort — never
 * throws, since we don't want an audit-log write to block a checkout.
 */
export async function logClubDiscountGrant(
  admin: SupabaseClient<any, any, any>,
  args: {
    userId: string;
    clubId: string | null;
    scope: ClubDiscountScope;
    originalAmountPhp: number;
    discountAmountPhp: number;
    discountPct: number;
    paymentId?: string | null;
    lineItemId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await admin.from("club_member_discount_grants").insert({
      user_id: args.userId,
      club_id: args.clubId,
      scope: args.scope,
      payment_id: args.paymentId ?? null,
      line_item_id: args.lineItemId ?? null,
      original_amount_php: args.originalAmountPhp,
      discount_amount_php: args.discountAmountPhp,
      discount_pct: args.discountPct,
      metadata: args.metadata ?? {},
    });
  } catch {
    // best-effort audit log
  }
}

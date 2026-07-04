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
 * Human-readable error thrown when a purchase was initiated expecting the
 * club-member discount but the user is no longer eligible at the moment of
 * checkout (membership ended, club unverified, config toggled off, etc).
 */
export const CLUB_DISCOUNT_INELIGIBLE_MESSAGE =
  "You're no longer eligible for the club-member discount. This can happen if your membership ended, your club lost verified status, or the discount was turned off. Refresh the page and try again — the current price will be shown without the discount.";

/**
 * Throw `CLUB_DISCOUNT_INELIGIBLE_MESSAGE` when the caller expected the club
 * discount but the server-side re-check disagrees. No-op when the caller
 * didn't claim eligibility, so this is safe to call unconditionally.
 */
export function assertClubDiscountEligibility(
  expected: boolean | undefined,
  status: Pick<ClubDiscountStatus, "eligible">,
): void {
  if (expected && !status.eligible) {
    throw new Error(CLUB_DISCOUNT_INELIGIBLE_MESSAGE);
  }
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
 * Insert an audit row into `club_member_discount_grants` and best-effort
 * notify the user by email. Never throws — audit/email failures must not
 * block a checkout.
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
    productLabel?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const appliedAt = new Date().toISOString();
  const finalAmountPhp = Math.max(0, args.originalAmountPhp - args.discountAmountPhp);
  const clubName = args.clubId ? await lookupClubName(admin, args.clubId) : null;
  const clubSlug = args.clubId ? await lookupClubSlug(admin, args.clubId) : null;

  let grantId: string | null = null;
  try {
    const { data: grantRow } = await admin
      .from("club_member_discount_grants")
      .insert({
        user_id: args.userId,
        club_id: args.clubId,
        scope: args.scope,
        payment_id: args.paymentId ?? null,
        line_item_id: args.lineItemId ?? null,
        original_amount_php: args.originalAmountPhp,
        discount_amount_php: args.discountAmountPhp,
        discount_pct: args.discountPct,
        metadata: args.metadata ?? {},
      })
      .select("id")
      .maybeSingle();
    grantId = (grantRow as { id?: string } | null)?.id ?? null;
  } catch {
    // best-effort audit log
  }

  // Snapshot the discount metadata onto the payment record itself so the
  // receipt keeps rendering the correct eligibility reason and club
  // attribution even if the buyer later leaves the club, the club is
  // unverified, or its name/slug changes.
  if (args.paymentId) {
    try {
      const snapshot = {
        club_id: args.clubId,
        club_name: clubName,
        club_slug: clubSlug,
        scope: args.scope,
        scope_label: SCOPE_LABEL[args.scope] ?? args.scope,
        product_label: args.productLabel ?? null,
        discount_pct: args.discountPct,
        discount_amount_php: args.discountAmountPhp,
        original_amount_php: args.originalAmountPhp,
        final_amount_php: finalAmountPhp,
        applied_at: appliedAt,
        eligibility_reason: "verified_club_membership",
        grant_id: grantId,
      };
      await admin
        .from("payments")
        .update({ club_discount: snapshot })
        .eq("id", args.paymentId);
    } catch {
      // best-effort snapshot
    }
  }

  // Best-effort user notification. Never let email failures bubble up.
  try {
    const { enqueueTransactionalEmailServer } = await import("@/lib/email/server-enqueue.server");
    const recipient = await lookupUserEmail(admin, args.userId);
    if (!recipient) return;
    const { email, fullName } = recipient;
    const clubName = args.clubId ? await lookupClubName(admin, args.clubId) : null;
    const final = Math.max(0, args.originalAmountPhp - args.discountAmountPhp);
    await enqueueTransactionalEmailServer({
      templateName: "club-discount-applied",
      recipientEmail: email,
      idempotencyKey: `club-disc-applied-${args.userId}-${args.scope}-${args.paymentId ?? Date.now()}`,
      templateData: {
        name: fullName ?? undefined,
        clubName: clubName ?? undefined,
        pct: args.discountPct,
        scopeLabel: SCOPE_LABEL[args.scope] ?? args.scope,
        productLabel: args.productLabel ?? undefined,
        originalAmountPhp: args.originalAmountPhp,
        discountAmountPhp: args.discountAmountPhp,
        finalAmountPhp: final,
      },
    });
  } catch {
    // best-effort email
  }
}

const SCOPE_LABEL: Record<ClubDiscountScope, string> = {
  ad_order: "ad order",
  boost: "listing boost",
  bundle: "listing bundle",
  subscription: "subscription",
  passport_premium: "Passport Premium",
  promotion: "promotion",
};

async function lookupUserEmail(
  admin: SupabaseClient<any, any, any>,
  userId: string,
): Promise<{ email: string; fullName: string | null } | null> {
  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const fullName = (prof as any)?.full_name ?? null;
    const { data: userRes, error } = await (admin as any).auth.admin.getUserById(userId);
    if (error) return null;
    const email = userRes?.user?.email ?? null;
    if (!email) return null;
    return { email, fullName };
  } catch {
    return null;
  }
}

async function lookupClubName(
  admin: SupabaseClient<any, any, any>,
  clubId: string,
): Promise<string | null> {
  try {
    const { data } = await admin
      .from("clubs" as never)
      .select("name")
      .eq("id", clubId)
      .maybeSingle();
    return (data as any)?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Notify a single user that they've become eligible for the club discount.
 * Best-effort. Skipped when the user isn't currently eligible per config,
 * so it's safe to call after membership/club approval regardless of order.
 */
export async function notifyClubDiscountEligible(
  admin: SupabaseClient<any, any, any>,
  userId: string,
  reason: "club_verified" | "membership_approved",
  opts?: { clubId?: string | null },
): Promise<void> {
  try {
    const status = await computeClubDiscountStatus(admin, userId);
    if (!status.eligible || !status.enabled) return;
    const recipient = await lookupUserEmail(admin, userId);
    if (!recipient) return;
    const clubName = status.clubName ?? (opts?.clubId ? await lookupClubName(admin, opts.clubId) : null);
    const clubKey = opts?.clubId ?? status.clubId ?? "none";
    const { enqueueTransactionalEmailServer } = await import("@/lib/email/server-enqueue.server");
    await enqueueTransactionalEmailServer({
      templateName: "club-discount-eligible",
      recipientEmail: recipient.email,
      idempotencyKey: `club-disc-eligible-${userId}-${clubKey}-${reason}`,
      templateData: {
        name: recipient.fullName ?? undefined,
        clubName: clubName ?? undefined,
        pct: status.pct,
        reason,
      },
    });
  } catch {
    // best-effort
  }
}

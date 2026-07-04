import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Normalized club-discount snapshot exposed on every billing payment row.
 * Sourced from the immutable `payments.club_discount` JSON so the eligibility
 * reason and applied timestamp always reflect the state at time of purchase,
 * even if the buyer's club membership later changes. Backfilled from
 * `club_member_discount_grants` for payments that predate the snapshot column.
 */
export type BillingClubDiscount = {
  grant_id: string | null;
  club_id: string | null;
  club_name: string | null;
  club_slug: string | null;
  scope: string;
  discount_pct: number;
  discount_amount_php: number;
  original_amount_php: number;
  /** Always present when a discount was applied. */
  applied_at: string | null;
  /** Always present when a discount was applied (defaults to `verified_club_membership`). */
  eligibility_reason: string | null;
};

export type BillingPayment = Record<string, any> & {
  id: string;
  /** Always present at the top level; `null` when no club discount was applied. */
  eligibility_reason: string | null;
  applied_at: string | null;
  club_discount: BillingClubDiscount | null;
};

/**
 * List the signed-in user's payment history for the dashboard billing page.
 *
 * The response ALWAYS includes top-level `eligibility_reason` and `applied_at`
 * fields on every payment row (both `null` when no club discount was applied),
 * sourced from `payments.club_discount` and backfilled from
 * `club_member_discount_grants` for legacy rows. Consumers can rely on these
 * fields being present without needing to reach into nested JSON.
 */
export const listMyBillingPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingPayment[]> => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as any[];

    // Legacy rows: no snapshot on the payment. Backfill from grants table.
    const missing = rows
      .filter((p) => !p?.club_discount || !p.club_discount.discount_pct)
      .map((p) => p.id as string);
    let grantsByPayment: Record<string, any> = {};
    if (missing.length > 0) {
      const { data: grants } = await supabase
        .from("club_member_discount_grants")
        .select(
          "id,payment_id,club_id,scope,discount_pct,discount_amount_php,original_amount_php,applied_at,club:clubs(name,slug)",
        )
        .in("payment_id", missing)
        .order("applied_at", { ascending: false });
      for (const g of (grants ?? []) as any[]) {
        if (g.payment_id && !grantsByPayment[g.payment_id]) grantsByPayment[g.payment_id] = g;
      }
    }

    return rows.map((p) => {
      const snap = p?.club_discount;
      let club_discount: BillingClubDiscount | null = null;

      if (snap && snap.discount_pct) {
        club_discount = {
          grant_id: snap.grant_id ?? null,
          club_id: snap.club_id ?? null,
          club_name: snap.club_name ?? null,
          club_slug: snap.club_slug ?? null,
          scope: snap.scope,
          discount_pct: Number(snap.discount_pct),
          discount_amount_php: Number(snap.discount_amount_php ?? 0),
          original_amount_php: Number(snap.original_amount_php ?? 0),
          applied_at: snap.applied_at ?? null,
          eligibility_reason: snap.eligibility_reason ?? "verified_club_membership",
        };
      } else {
        const g = grantsByPayment[p.id];
        if (g) {
          club_discount = {
            grant_id: g.id ?? null,
            club_id: g.club_id ?? null,
            club_name: g.club?.name ?? null,
            club_slug: g.club?.slug ?? null,
            scope: g.scope,
            discount_pct: Number(g.discount_pct),
            discount_amount_php: Number(g.discount_amount_php ?? 0),
            original_amount_php: Number(g.original_amount_php ?? 0),
            applied_at: g.applied_at ?? null,
            eligibility_reason: "verified_club_membership",
          };
        }
      }

      return {
        ...p,
        club_discount,
        // Always-present top-level normalization sourced from club_discount.
        eligibility_reason: club_discount?.eligibility_reason ?? null,
        applied_at: club_discount?.applied_at ?? null,
      } as BillingPayment;
    });
  });

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgePercent, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/format";

export type ClubGrant = {
  id: string;
  club_id: string | null;
  scope: string;
  discount_pct: number;
  discount_amount_php: number;
  original_amount_php: number;
  payment_id: string | null;
  applied_at: string;
  club?: { name: string | null; slug: string | null } | null;
};

const scopeLabel: Record<string, string> = {
  ad_order: "ad order",
  boost: "listing boost",
  bundle: "listing bundle",
  subscription: "subscription",
  passport_premium: "Passport Premium",
  promotion: "promotion",
};

/**
 * Emerald note used on checkout confirmation + receipts.
 * Explains WHY the discount applied (verified club membership).
 */
export function ClubDiscountAppliedNote({ grant }: { grant: ClubGrant }) {
  const clubName = grant.club?.name ?? "your verified club";
  const scope = scopeLabel[grant.scope] ?? grant.scope.replace(/_/g, " ");
  return (
    <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
      <div>
        <div className="font-medium text-emerald-700">
          Club member {grant.discount_pct}% off applied · saved{" "}
          {formatPHP(grant.discount_amount_php)}
        </div>
        <div className="text-xs text-muted-foreground">
          Eligible as an active member of{" "}
          {grant.club?.slug ? (
            <Link
              to="/clubs/$slug"
              params={{ slug: grant.club.slug }}
              className="underline hover:text-foreground"
            >
              {clubName}
            </Link>
          ) : (
            clubName
          )}{" "}
          — applied to this {scope}. Original {formatPHP(grant.original_amount_php)}.
        </div>
      </div>
    </div>
  );
}

/** Fetches a single grant for a specific payment id (own row via RLS). */
export function ClubDiscountForPayment({ paymentId }: { paymentId: string }) {
  const [grant, setGrant] = useState<ClubGrant | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("club_member_discount_grants")
      .select(
        "id,club_id,scope,discount_pct,discount_amount_php,original_amount_php,payment_id,applied_at,club:clubs(name,slug)",
      )
      .eq("payment_id", paymentId)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setGrant((data as ClubGrant | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);
  if (!grant) return null;
  return <ClubDiscountAppliedNote grant={grant} />;
}

/** Compact badge for row-level display in tables. */
export function ClubDiscountBadgeForPayment({ paymentId }: { paymentId: string }) {
  const [grant, setGrant] = useState<ClubGrant | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("club_member_discount_grants")
      .select("id,discount_pct,discount_amount_php,club:clubs(name,slug)")
      .eq("payment_id", paymentId)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setGrant((data as unknown as ClubGrant | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);
  if (!grant) return null;
  const label = grant.club?.name
    ? `Club ${grant.discount_pct}% off · ${grant.club.name}`
    : `Club ${grant.discount_pct}% off`;
  return (
    <Badge
      variant="outline"
      className="mt-1 gap-1 border-emerald-500/40 text-emerald-700"
      title={`Saved ${formatPHP(grant.discount_amount_php)} via verified club membership`}
    >
      <BadgePercent className="h-3 w-3" />
      {label} · −{formatPHP(grant.discount_amount_php)}
    </Badge>
  );
}

/**
 * For /checkout/return — looks up the most recent grant for the current user
 * within the last N minutes so we can show "your club discount was applied".
 */
export function RecentClubDiscountNote({ withinMinutes = 15 }: { withinMinutes?: number }) {
  const { user } = useAuth();
  const [grant, setGrant] = useState<ClubGrant | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
    supabase
      .from("club_member_discount_grants")
      .select(
        "id,club_id,scope,discount_pct,discount_amount_php,original_amount_php,payment_id,applied_at,club:clubs(name,slug)",
      )
      .eq("user_id", user.id)
      .gte("applied_at", since)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setGrant((data as ClubGrant | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, withinMinutes]);
  if (!grant) return null;
  return <ClubDiscountAppliedNote grant={grant} />;
}

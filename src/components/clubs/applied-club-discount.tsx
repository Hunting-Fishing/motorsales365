import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgePercent, Sparkles, ShieldCheck, Clock, Calculator, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  club?: { name: string | null; slug: string | null; verified?: boolean | null } | null;
};

const scopeLabel: Record<string, string> = {
  ad_order: "ad order",
  boost: "listing boost",
  bundle: "listing bundle",
  subscription: "subscription",
  passport_premium: "Passport Premium",
  promotion: "promotion",
};

function formatAppliedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Emerald note used on checkout confirmation + receipts.
 * Explains WHY the discount applied (verified club membership)
 * and WHEN it was applied.
 */
export function ClubDiscountAppliedNote({ grant }: { grant: ClubGrant }) {
  const clubName = grant.club?.name ?? "your verified club";
  const scope = scopeLabel[grant.scope] ?? grant.scope.replace(/_/g, " ");
  const appliedAt = formatAppliedAt(grant.applied_at);
  const finalAmount = Math.max(0, grant.original_amount_php - grant.discount_amount_php);
  return (
    <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-emerald-700">
          Club member {grant.discount_pct}% off applied · saved{" "}
          {formatPHP(grant.discount_amount_php)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>
              Eligibility: verified club membership in{" "}
              {grant.club?.slug ? (
                <Link
                  to="/clubs/$slug"
                  params={{ slug: grant.club.slug }}
                  className="font-medium underline hover:text-foreground"
                >
                  {clubName}
                </Link>
              ) : (
                <span className="font-medium">{clubName}</span>
              )}
              .
            </span>
          </div>
          <div className="mt-0.5">
            Applied to this {scope}. Original amount{" "}
            {formatPHP(grant.original_amount_php)}.
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Applied {appliedAt}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded text-xs font-medium text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="See how this discount was calculated"
                >
                  <Calculator className="h-3 w-3" />
                  See calculation
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 p-3 text-xs">
                <div className="mb-2 flex items-center gap-1 font-semibold text-foreground">
                  <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                  Discount breakdown
                </div>
                <div className="mb-2 text-muted-foreground">
                  Granted by{" "}
                  {grant.club?.slug ? (
                    <Link
                      to="/clubs/$slug"
                      params={{ slug: grant.club.slug }}
                      className="font-medium text-foreground underline"
                    >
                      {clubName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{clubName}</span>
                  )}{" "}
                  (verified club membership).
                </div>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Original ({scope})</dt>
                    <dd className="font-mono text-foreground">
                      {formatPHP(grant.original_amount_php)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount rate</dt>
                    <dd className="font-mono text-foreground">−{grant.discount_pct}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Calculation</dt>
                    <dd className="font-mono text-foreground">
                      {formatPHP(grant.original_amount_php)} × {grant.discount_pct}%
                    </dd>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <dt>You saved</dt>
                    <dd className="font-mono font-semibold">
                      −{formatPHP(grant.discount_amount_php)}
                    </dd>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-1 font-semibold text-foreground">
                    <dt>Final amount</dt>
                    <dd className="font-mono">{formatPHP(finalAmount)}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Applied {appliedAt}
                </div>
              </PopoverContent>
            </Popover>
            <EligibilityDetailsDialog
              grant={grant}
              clubName={clubName}
              scope={scope}
              appliedAt={appliedAt}
              finalAmount={finalAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EligibilityDetailsDialog({
  grant,
  clubName,
  scope,
  appliedAt,
  finalAmount,
}: {
  grant: ClubGrant;
  clubName: string;
  scope: string;
  appliedAt: string;
  finalAmount: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded text-xs font-medium text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="View eligibility details for this discount"
        >
          <Info className="h-3 w-3" />
          View eligibility details
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Discount eligibility
          </DialogTitle>
          <DialogDescription>
            Why the club member discount was applied to this purchase.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Eligibility reason
            </dt>
            <dd className="mt-0.5 flex items-center gap-1 text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified club membership
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verified club
            </dt>
            <dd className="mt-0.5 text-foreground">
              {grant.club?.slug ? (
                <Link
                  to="/clubs/$slug"
                  params={{ slug: grant.club.slug }}
                  className="font-medium underline hover:text-foreground"
                >
                  {clubName}
                </Link>
              ) : (
                <span className="font-medium">{clubName}</span>
              )}
              <Badge
                variant="outline"
                className="ml-2 border-emerald-500/40 text-[10px] uppercase tracking-wide text-emerald-700"
              >
                Verified
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Applied to
            </dt>
            <dd className="mt-0.5 capitalize text-foreground">{scope}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Applied at
            </dt>
            <dd className="mt-0.5 flex items-center gap-1 text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {appliedAt}
            </dd>
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Original</span>
              <span className="font-mono">{formatPHP(grant.original_amount_php)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-700">
              <span>Discount ({grant.discount_pct}%)</span>
              <span className="font-mono font-semibold">
                −{formatPHP(grant.discount_amount_php)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm font-semibold">
              <span>Final</span>
              <span className="font-mono">{formatPHP(finalAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This eligibility record is stored with your payment. It won't change if your club
            status or membership changes later.
          </p>
        </dl>
        <DialogFooter className="sm:justify-between">
          {grant.club?.slug ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/clubs/$slug" params={{ slug: grant.club.slug }}>
                View club
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/** Fetches a single grant for a specific payment id (own row via RLS). */
export function ClubDiscountForPayment({ paymentId }: { paymentId: string }) {
  const [grant, setGrant] = useState<ClubGrant | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Prefer the snapshot stored on the payment record — it survives
      // club deletion, renames, and membership changes.
      const { data: pay } = await supabase
        .from("payments")
        .select("id,club_discount")
        .eq("id", paymentId)
        .maybeSingle();
      const snap = (pay as any)?.club_discount;
      if (snap && snap.discount_pct) {
        if (!cancelled) {
          setGrant({
            id: snap.grant_id ?? paymentId,
            club_id: snap.club_id ?? null,
            scope: snap.scope,
            discount_pct: snap.discount_pct,
            discount_amount_php: snap.discount_amount_php,
            original_amount_php: snap.original_amount_php,
            payment_id: paymentId,
            applied_at: snap.applied_at,
            club: snap.club_id
              ? { name: snap.club_name, slug: snap.club_slug, verified: null }
              : null,
          });
        }
        return;
      }
      const { data } = await supabase
        .from("club_member_discount_grants")
        .select(
          "id,club_id,scope,discount_pct,discount_amount_php,original_amount_php,payment_id,applied_at,club:clubs(name,slug)",
        )
        .eq("payment_id", paymentId)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setGrant((data as ClubGrant | null) ?? null);
    })();
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

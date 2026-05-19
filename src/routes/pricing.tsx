import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ArrowRight, ArrowDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & plans — 365 MotorSales Philippines" },
      { name: "description", content: "Listing fees, upgrades, boosts, and monthly subscriptions for sellers in the Philippines." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  id: string;
  name: string;
  price_php: number;
  listings_per_month: number | null;
  max_photos_per_listing: number | null;
  features: string[] | null;
  sort_order?: number | null;
};

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<any | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Record<string, any>>({});

  const [lastPayment, setLastPayment] = useState<any | null>(null);

  const loadSub = async (uid: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setMySub(data ?? null);

    // Latest paid subscription payment — source of truth for proration inputs
    if (data?.id) {
      const { data: pay } = await supabase
        .from("payments")
        .select("period_start, period_end, paid_at, credit_calculated_at, plan_price_php")
        .eq("user_id", uid)
        .eq("kind", "subscription" as any)
        .eq("status", "paid" as any)
        .not("period_end", "is", null)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastPayment(pay ?? null);
    } else {
      setLastPayment(null);
    }
  };

  useEffect(() => {
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = Number(r.value); });
      setSettings(m);
    });
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPlans((data as any) ?? []));
    if (user?.id) loadSub(user.id);
  }, [user?.id]);

  // Preview discounts per plan once we have plans + a signed-in user
  useEffect(() => {
    if (!user?.id || plans.length === 0) return;
    (async () => {
      const out: Record<string, any> = {};
      await Promise.all(plans.map(async (p) => {
        const { data } = await (supabase as any).rpc("preview_referral_discount", {
          _kind: "subscription",
          _base_amount: Number(p.price_php) || 0,
        });
        if (data?.ok) out[p.id] = data;
      }));
      setDiscounts(out);
    })();
  }, [user?.id, plans]);

  const currentPlan = useMemo<Plan | null>(() => {
    if (!mySub || !["active", "paused"].includes(mySub.status)) return null;
    return plans.find((p) => p.id === mySub.plan_id) ?? null;
  }, [mySub, plans]);

  // Prorated credit from current plan for unused remainder of the cycle.
  // Fallback: assume a 30-day cycle ending at current_period_end.
  const proratedCredit = useMemo(() => {
    if (!currentPlan || (currentPlan.price_php ?? 0) <= 0) return 0;
    const endRaw = (mySub as any)?.current_period_end;
    if (!endRaw) return 0;
    const end = new Date(endRaw).getTime();
    const startRaw = (mySub as any)?.current_period_start;
    const start = startRaw ? new Date(startRaw).getTime() : end - 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const totalMs = end - start;
    const remainingMs = Math.max(0, end - now);
    if (totalMs <= 0) return 0;
    return Math.round((currentPlan.price_php * remainingMs) / totalMs);
  }, [mySub, currentPlan]);

  const submitPlanChange = async (planId: string, kind: "new" | "upgrade" | "downgrade" | "switch") => {
    if (!user) {
      navigate({ to: "/signup" });
      return;
    }
    setRequesting(planId);
    const plan = plans.find((p) => p.id === planId);
    const base = Number(plan?.price_php) || 0;
    const note =
      kind === "new"
        ? null
        : kind === "upgrade"
          ? `Upgrade from ${currentPlan?.name ?? "current plan"} — prorated credit ₱${proratedCredit}`
          : kind === "downgrade"
            ? `Downgrade from ${currentPlan?.name ?? "current plan"} — takes effect next renewal`
            : `Switch from ${currentPlan?.name ?? "current plan"}`;
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .insert({ user_id: user.id, plan_id: planId, status: "pending", notes: note })
      .select("id")
      .maybeSingle();
    if (error) { setRequesting(null); return toast.error(error.message); }

    const { data: redemption } = await (supabase as any).rpc("apply_referral_redemption", {
      _kind: "subscription",
      _base_amount: base,
      _subscription_id: sub?.id ?? null,
    });
    setRequesting(null);
    if (redemption?.ok) {
      toast.success(`Referral discount applied — ₱${redemption.discount_amount_php} off. Final: ₱${redemption.final_amount_php}.`);
    } else if (kind === "upgrade") {
      toast.success(`Upgrade requested — pay ₱${Math.max(0, base - proratedCredit)} now (₱${proratedCredit} prorated credit applied).`);
    } else if (kind === "downgrade") {
      toast.success(`Downgrade to ${plan?.name} requested — takes effect at next renewal.`);
    } else if (kind === "switch") {
      toast.success(`Switch to ${plan?.name} requested — our team will reach out.`);
    } else {
      toast.success("Subscription requested — our team will reach out shortly.");
    }
    loadSub(user.id);
  };

  return (
    <SiteLayout>
      <section className="bg-secondary/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold">Simple pricing</h1>
          <p className="mt-2 text-muted-foreground">Pay per listing, or subscribe monthly. All prices in ₱ PHP.</p>
        </div>
      </section>

      <section className="container mx-auto grid gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Free listing", p: 0, d: "1 photo, no video. 1 free listing per week." },
          { t: "Standard listing", p: settings.listing_fee_php ?? 20, d: "5 photos, 1 video. Stays live for 60 days." },
          { t: "Upgraded listing", p: (settings.listing_fee_php ?? 20) + (settings.upgrade_fee_php ?? 100), d: "20 photos, 3 videos. Stand out from the crowd." },
          { t: "Boost", p: settings.boost_fee_php ?? 150, d: `Pin to top of search and renew the ad every ${settings.boost_renewal_days ?? 14} days.` },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-muted-foreground">{c.t}</div>
            <div className="mt-2 font-display text-3xl font-bold text-primary">{c.p === 0 ? "Free" : formatPHP(c.p)}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-2 text-center font-display text-2xl font-bold">Business subscriptions</h2>
        {mySub && (
          <p className="mb-6 text-center text-sm text-muted-foreground">
            You have a <span className="font-semibold uppercase">{mySub.status}</span> subscription on file.{" "}
            <Link to="/dashboard/billing" className="text-primary underline">View billing →</Link>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id;
            const isPendingThis = mySub?.status === "pending" && mySub?.plan_id === p.id;
            const d = discounts[p.id];

            // Comparison vs current plan
            const cmp = currentPlan && !isCurrent ? (() => {
              const curListings = currentPlan.listings_per_month;
              const newListings = p.listings_per_month;
              const listingDelta =
                curListings === null && newListings === null
                  ? 0
                  : newListings === null
                    ? Number.POSITIVE_INFINITY
                    : curListings === null
                      ? Number.NEGATIVE_INFINITY
                      : newListings - curListings;
              const photoDelta = (p.max_photos_per_listing ?? 0) - (currentPlan.max_photos_per_listing ?? 0);
              const priceDelta = (p.price_php ?? 0) - (currentPlan.price_php ?? 0);
              return { listingDelta, photoDelta, priceDelta };
            })() : null;

            const kind: "new" | "upgrade" | "downgrade" | "switch" = !currentPlan
              ? "new"
              : (cmp?.priceDelta ?? 0) > 0
                ? "upgrade"
                : (cmp?.priceDelta ?? 0) < 0
                  ? "downgrade"
                  : "switch";

            const upgradeNet = kind === "upgrade" ? Math.max(0, (p.price_php ?? 0) - proratedCredit) : 0;

            const ctaLabel = isCurrent
              ? `Current (${mySub?.status ?? "active"})`
              : isPendingThis
                ? "Pending review"
                : !user
                  ? "Sign up to subscribe"
                  : kind === "upgrade"
                    ? `Upgrade — pay ${formatPHP(upgradeNet)} now`
                    : kind === "downgrade"
                      ? `Switch to ${p.name}`
                      : kind === "switch"
                        ? `Switch to ${p.name}`
                        : "Request this plan";

            return (
              <div
                key={p.id}
                aria-current={isCurrent ? "true" : undefined}
                className={`flex flex-col rounded-xl border bg-card p-6 ${isCurrent ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-semibold">{p.name}</div>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Your plan
                    </span>
                  )}
                </div>
                {d ? (
                  <div className="mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-primary">{formatPHP(d.final_amount_php)}</span>
                      <span className="text-sm text-muted-foreground line-through">{formatPHP(p.price_php)}</span>
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Referral discount: −{formatPHP(d.discount_amount_php)}
                      {d.percent_off ? ` (${d.percent_off}% off)` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 font-display text-3xl font-bold">
                    {formatPHP(p.price_php)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                )}
                <div className="mt-1 text-sm text-muted-foreground">
                  {p.listings_per_month ?? "Unlimited"} listings/month
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  {(p.features ?? []).map((f: string) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />{f}
                    </li>
                  ))}
                </ul>

                {cmp && (
                  <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs">
                    <div className="mb-1.5 font-medium uppercase tracking-wide text-muted-foreground">
                      vs your {currentPlan!.name}
                    </div>
                    <ul className="space-y-1">
                      <DeltaRow
                        label="Listings/mo"
                        delta={cmp.listingDelta}
                        suffix=""
                        positiveGood
                      />
                      <DeltaRow
                        label="Photos/listing"
                        delta={cmp.photoDelta}
                        suffix=""
                        positiveGood
                      />
                      <DeltaRow
                        label="Monthly price"
                        delta={cmp.priceDelta}
                        suffix=""
                        currency
                        positiveGood={false}
                      />
                      {kind === "upgrade" && proratedCredit > 0 && (
                        <li className="flex items-center justify-between border-t border-border pt-1 text-emerald-600">
                          <span>Prorated credit</span>
                          <span className="font-medium">− {formatPHP(proratedCredit)}</span>
                        </li>
                      )}
                      {kind === "upgrade" && (
                        <li className="flex items-center justify-between font-semibold text-foreground">
                          <span>You pay now</span>
                          <span>{formatPHP(upgradeNet)}</span>
                        </li>
                      )}
                      {kind === "downgrade" && (
                        <li className="border-t border-border pt-1 text-muted-foreground">
                          Takes effect at next renewal — no charge today.
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <Button
                  className="mt-6"
                  disabled={requesting === p.id || isCurrent || isPendingThis}
                  onClick={() => submitPlanChange(p.id, kind)}
                >
                  {ctaLabel}
                </Button>
                {currentPlan && !isCurrent && (
                  <Link
                    to="/dashboard/billing"
                    className="mt-2 text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    View billing details →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Requests are reviewed manually by our sales team — you'll receive an email once it's activated. Live card payments are coming soon.
        </p>
      </section>
    </SiteLayout>
  );
}

function DeltaRow({
  label,
  delta,
  currency = false,
  positiveGood = true,
}: {
  label: string;
  delta: number;
  suffix?: string;
  currency?: boolean;
  positiveGood?: boolean;
}) {
  const isUnlimited = delta === Number.POSITIVE_INFINITY;
  const isLessUnlimited = delta === Number.NEGATIVE_INFINITY;
  const isZero = delta === 0;
  const good = isUnlimited || (positiveGood ? delta > 0 : delta < 0);
  const tone = isZero
    ? "text-muted-foreground"
    : good
      ? "text-emerald-600"
      : "text-amber-600";
  const Icon = isZero ? Minus : good ? ArrowRight : ArrowDown;
  const value = isUnlimited
    ? "→ Unlimited"
    : isLessUnlimited
      ? "↓ Capped"
      : isZero
        ? "Same"
        : `${delta > 0 ? "+" : ""}${currency ? formatPHP(Math.abs(delta)).replace(/^/, delta < 0 ? "−" : "") : delta}`;
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="h-3 w-3" />
        {value}
      </span>
    </li>
  );
}

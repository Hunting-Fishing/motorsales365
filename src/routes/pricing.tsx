import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ArrowRight, ArrowDown, Minus, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPHP } from "@/lib/format";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { updateSubscriptionPlan } from "@/utils/payments.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";


type UsageMonth = { key: string; label: string; count: number };

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
  stripe_lookup_key?: string | null;
};

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, closeCheckout, isOpen: checkoutOpen, checkoutElement } = useStripeCheckout();
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<any | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{
    plan: Plan;
    kind: "new" | "upgrade" | "downgrade" | "switch";
    upgradeNet: number;
  } | null>(null);
  const [discounts, setDiscounts] = useState<Record<string, any>>({});

  const [lastPayment, setLastPayment] = useState<any | null>(null);
  const [usage, setUsage] = useState<UsageMonth[]>([]);

  const loadSub = async (uid: string) => {
    const env = getStripeEnvironment();
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", uid)
      .or(`environment.eq.${env},environment.is.null`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setMySub(data ?? null);


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

  // Last 6 months of listing activity (published_at, falling back to created_at)
  const loadUsage = async (uid: string) => {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - 5);
    sinceDate.setDate(1);
    sinceDate.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("listings")
      .select("created_at, published_at")
      .eq("user_id", uid)
      .gte("created_at", sinceDate.toISOString());
    const buckets = new Map<string, UsageMonth>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
      buckets.set(key, { key, label, count: 0 });
    }
    (data ?? []).forEach((row: any) => {
      const ts = row.published_at ?? row.created_at;
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key);
      if (b) b.count++;
    });
    setUsage(Array.from(buckets.values()));
  };

  useEffect(() => {
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = Number(r.value); });
      setSettings(m);
    });
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPlans((data as any) ?? []));
    if (user?.id) {
      loadSub(user.id);
      loadUsage(user.id);
    }
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

  // Prorated credit from the user's current paid subscription period.
  // Prefer the exact period_start/period_end + credit_calculated_at on the latest
  // paid payment row. Fall back to the subscription's own created_at →
  // current_period_end window (with now() as reference) when no payment row
  // exists — e.g. admin-approved or complimentary subs that never recorded
  // a payment.
  const proratedCredit = useMemo(() => {
    if (!currentPlan) return 0;
    if (mySub?.complimentary) return 0;

    const planPrice = Number(lastPayment?.plan_price_php ?? currentPlan.price_php ?? 0);
    if (planPrice <= 0) return 0;

    const startRaw = lastPayment?.period_start ?? mySub?.created_at ?? null;
    const endRaw = lastPayment?.period_end ?? mySub?.current_period_end ?? null;
    if (!startRaw || !endRaw) return 0;

    const start = new Date(startRaw).getTime();
    const end = new Date(endRaw).getTime();
    const totalMs = end - start;
    if (totalMs <= 0) return 0;

    const refRaw =
      lastPayment?.credit_calculated_at ?? lastPayment?.paid_at ?? new Date().toISOString();
    const ref = new Date(refRaw).getTime();
    const remainingMs = Math.max(0, Math.min(totalMs, end - ref));
    return Math.round((planPrice * remainingMs) / totalMs);
  }, [currentPlan, lastPayment, mySub]);

  const submitPlanChange = async (planId: string, kind: "new" | "upgrade" | "downgrade" | "switch") => {
    if (!user) {
      navigate({ to: "/signup" });
      return;
    }
    setRequesting(planId);
    const plan = plans.find((p) => p.id === planId);
    const base = Number(plan?.price_php) || 0;

    const { data: result, error } = await (supabase as any).rpc("self_serve_change_plan", {
      _plan_id: planId,
    });
    if (error) { setRequesting(null); return toast.error(error.message); }
    if (!result?.ok) {
      setRequesting(null);
      return toast.info(result?.reason === "already_on_plan" ? "You're already on this plan." : "Could not change plan.");
    }

    // Best-effort referral discount application on the new payment
    await (supabase as any).rpc("apply_referral_redemption", {
      _kind: "subscription",
      _base_amount: base,
      _subscription_id: result.subscription_id ?? null,
    });

    setRequesting(null);
    const net = Number(result.net_php ?? base);
    const credit = Number(result.credit_php ?? 0);
    toast.success(
      kind === "upgrade" && credit > 0
        ? `${plan?.name} activated — ${formatPHP(net)} due now (${formatPHP(credit)} prorated credit applied).`
        : kind === "downgrade"
          ? `Switched to ${plan?.name} — ${formatPHP(net)} due now, takes effect immediately.`
          : `${plan?.name} activated — ${formatPHP(net)} due now.`,
    );
    loadSub(user.id);
  };

  // Usage helpers — current month vs current plan limit
  const thisMonthCount = usage.length ? usage[usage.length - 1].count : 0;
  const monthMax = Math.max(1, ...usage.map((u) => u.count));
  const planLimit = currentPlan?.listings_per_month ?? null;
  const usagePct = planLimit ? Math.min(100, Math.round((thisMonthCount / planLimit) * 100)) : 0;

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

        {user && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">Your listing usage</h3>
              <span className="text-xs text-muted-foreground">
                {currentPlan ? `On ${currentPlan.name}` : "On Free plan"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">{thisMonthCount}</span>
              <span className="text-sm text-muted-foreground">
                listing{thisMonthCount === 1 ? "" : "s"} this month
                {planLimit !== null ? ` of ${planLimit} included` : " — unlimited on your plan"}
              </span>
            </div>
            {planLimit !== null && (
              <Progress value={usagePct} className="mt-2 h-2" />
            )}

            <div className="mt-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last 6 months
              </div>
              <div className="flex items-end gap-2 h-24">
                {usage.map((m) => {
                  const h = monthMax > 0 ? Math.max(6, Math.round((m.count / monthMax) * 88)) : 6;
                  const over = planLimit !== null && m.count > planLimit;
                  return (
                    <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t ${over ? "bg-amber-500" : "bg-primary/70"}`}
                        style={{ height: `${h}px` }}
                        title={`${m.label}: ${m.count}`}
                      />
                      <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      <div className="text-[11px] font-semibold">{m.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              const silver = plans.find((p) => /silver/i.test(p.name));
              if (!silver) return null;
              const silverLimit = silver.listings_per_month;
              const isCurrentSilver = currentPlan?.id === silver.id;
              if (isCurrentSilver) return null;
              const overran = usage.some(
                (m) => planLimit !== null && m.count > (planLimit ?? 0),
              );
              const wouldFitSilver =
                silverLimit === null ||
                usage.every((m) => m.count <= silverLimit);
              if (!overran && (silverLimit === null || thisMonthCount * 2 <= silverLimit)) return null;
              return (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">
                      {silver.name} fits your activity{wouldFitSilver ? " every month" : " better"}.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      You'd get {silverLimit ?? "unlimited"} listings/mo and up to{" "}
                      {silver.max_photos_per_listing ?? "more"} photos per listing for {formatPHP(silver.price_php)}/mo.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
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
                    ? `Upgrade now — ${formatPHP(upgradeNet)}`
                    : kind === "downgrade"
                      ? `Switch to ${p.name} — ${formatPHP(p.price_php)}`
                      : kind === "switch"
                        ? `Switch to ${p.name}`
                        : `Activate ${p.name} — ${formatPHP(p.price_php)}`;

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
                          Takes effect immediately — your next bill matches the new plan.
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <Button
                  className="mt-6"
                  disabled={requesting === p.id || isCurrent || isPendingThis}
                  onClick={() => {
                    if (!user) {
                      navigate({ to: "/signup" });
                      return;
                    }
                    setConfirmPlan({ plan: p, kind, upgradeNet });
                  }}
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
          Plan changes activate instantly. Any unused portion of your current plan is applied as a prorated credit on your next invoice. Live card payments are coming soon.
        </p>
      </section>

      <Dialog open={!!confirmPlan} onOpenChange={(o) => !o && setConfirmPlan(null)}>
        <DialogContent>
          {confirmPlan && (() => {
            const { plan, kind, upgradeNet } = confirmPlan;
            const due =
              kind === "upgrade"
                ? upgradeNet
                : Number(plan.price_php) || 0;
            const title =
              kind === "upgrade"
                ? `Upgrade to ${plan.name}?`
                : kind === "downgrade"
                  ? `Switch down to ${plan.name}?`
                  : kind === "switch"
                    ? `Switch to ${plan.name}?`
                    : `Activate ${plan.name}?`;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>
                    {currentPlan
                      ? `You're currently on ${currentPlan.name} (${formatPHP(currentPlan.price_php)}/mo).`
                      : "Review the plan details before activating."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">New plan</span>
                    <span className="font-semibold">{plan.name} — {formatPHP(plan.price_php)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Listings / month</span>
                    <span className="font-medium">{plan.listings_per_month ?? "Unlimited"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Photos / listing</span>
                    <span className="font-medium">{plan.max_photos_per_listing ?? "—"}</span>
                  </div>

                  {kind === "upgrade" && proratedCredit > 0 && (
                    <div className="flex items-center justify-between border-t border-border pt-2 text-emerald-600">
                      <span>Prorated credit from {currentPlan?.name}</span>
                      <span className="font-medium">− {formatPHP(proratedCredit)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                    <span className="font-semibold">You pay now</span>
                    <span className="font-display text-xl font-bold text-primary">{formatPHP(due)}</span>
                  </div>

                  {kind === "downgrade" && (
                    <p className="text-xs text-muted-foreground">
                      Takes effect immediately. Any unused portion of your current plan is credited to your account.
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => setConfirmPlan(null)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={requesting === plan.id}
                    onClick={async () => {
                      const hasStripeSub = !!mySub?.stripe_subscription_id &&
                        ["active", "trialing", "past_due"].includes(mySub?.status);
                      const isPaid = Number(plan.price_php) > 0 && !!plan.stripe_lookup_key;

                      // Existing Stripe subscriber switching to another paid plan →
                      // modify the sub server-side (Stripe charges prorated diff for
                      // upgrades, credits the balance for downgrades). No new checkout.
                      if (isPaid && hasStripeSub && kind !== "new") {
                        try {
                          setRequesting(plan.id);
                          await updateSubscriptionPlan({
                            data: {
                              priceId: plan.stripe_lookup_key!,
                              environment: getStripeEnvironment(),
                              mode: kind,
                            },
                          });
                          toast.success(
                            kind === "upgrade"
                              ? `Upgraded to ${plan.name} — prorated charge applied to your saved card.`
                              : kind === "downgrade"
                                ? `Switched to ${plan.name} — credit will apply to your next invoice.`
                                : `Switched to ${plan.name}.`
                          );
                          setConfirmPlan(null);
                          if (user?.id) loadSub(user.id);
                        } catch (err: any) {
                          toast.error(err?.message ?? "Could not update subscription");
                        } finally {
                          setRequesting(null);
                        }
                        return;
                      }

                      // New paid subscriber → embedded Stripe checkout (saves card)
                      if (isPaid) {
                        setConfirmPlan(null);
                        openCheckout({
                          priceId: plan.stripe_lookup_key!,
                          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
                        });
                        return;
                      }

                      // Free plan or complimentary path
                      await submitPlanChange(plan.id, kind);
                      setConfirmPlan(null);
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {requesting === plan.id
                      ? "Processing…"
                      : mySub?.stripe_subscription_id && Number(plan.price_php) > 0 && kind !== "new"
                        ? kind === "upgrade"
                          ? `Charge ${formatPHP(due)} prorated`
                          : kind === "downgrade"
                            ? `Switch — credit ${formatPHP(proratedCredit)} applied`
                            : `Switch to ${plan.name}`
                        : Number(plan.price_php) > 0
                          ? `Continue to payment — ${formatPHP(plan.price_php)}`
                          : kind === "upgrade"
                            ? `Confirm upgrade — ${formatPHP(due)}`
                            : kind === "downgrade"
                              ? `Confirm switch — ${formatPHP(due)}`
                              : `Confirm — ${formatPHP(due)}`}
                  </Button>

                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={(o) => !o && closeCheckout()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete your payment</DialogTitle>
            <DialogDescription>
              Your card will be saved securely for future renewals. You can manage it any time from billing.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">{checkoutElement}</div>
        </DialogContent>
      </Dialog>
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

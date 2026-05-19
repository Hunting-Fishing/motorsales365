import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPHP, formatDate } from "@/lib/format";
import { CheckCircle2, AlertTriangle, ArrowUpRight, TrendingUp, Calendar, Check } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

type Listing = {
  id: string;
  title: string;
  status: string;
  plan: string;
  price_php: number;
  view_count: number;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  boost_until: string | null;
};

type Plan = {
  id: string;
  name: string;
  price_php: number;
  listings_per_month: number | null;
  max_photos_per_listing: number;
  features: string[];
  sort_order: number;
  active: boolean;
};

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function BillingPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansById, setPlansById] = useState<Record<string, Plan>>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [mediaCounts, setMediaCounts] = useState<Record<string, { photo: number; video: number }>>({});
  const [chartRange, setChartRange] = useState<"daily" | "weekly">("daily");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setSubs(data ?? []));
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => {
        const list = (data ?? []) as Plan[];
        setPlans(list);
        const m: Record<string, Plan> = {};
        list.forEach((p) => { m[p.id] = p; });
        setPlansById(m);
      });
    supabase.from("listings")
      .select("id,title,status,plan,price_php,view_count,created_at,published_at,expires_at,boost_until")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(async ({ data }) => {
        const rows = (data ?? []) as Listing[];
        setListings(rows);
        if (rows.length === 0) return;
        const ids = rows.map((r) => r.id);
        const { data: media } = await supabase
          .from("listing_media")
          .select("listing_id,type")
          .in("listing_id", ids);
        const counts: Record<string, { photo: number; video: number }> = {};
        (media ?? []).forEach((m: any) => {
          if (!counts[m.listing_id]) counts[m.listing_id] = { photo: 0, video: 0 };
          if (m.type === "video") counts[m.listing_id].video += 1;
          else counts[m.listing_id].photo += 1;
        });
        setMediaCounts(counts);
      });
  }, [user]);

  const activeSub = useMemo(
    () => subs.find((s) => ["active", "pending", "paused"].includes(s.status)) ?? null,
    [subs]
  );
  const currentPlan: Plan | null = activeSub ? plansById[activeSub.plan_id] ?? null : null;

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const monthStart = startOfMonth(now);

  const thisMonthListings = useMemo(
    () => listings.filter((l) => new Date(l.created_at) >= monthStart),
    [listings, monthStart]
  );
  const activeListings = useMemo(() => listings.filter((l) => l.status === "active"), [listings]);
  const totalViews = useMemo(() => listings.reduce((s, l) => s + (l.view_count ?? 0), 0), [listings]);
  const boostedCount = useMemo(
    () => listings.filter((l) => l.boost_until && new Date(l.boost_until) > now).length,
    [listings, now]
  );

  // Renewal countdown
  const renewalMs = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end).getTime() - now.getTime()
    : null;
  const renewalDays = activeSub?.current_period_end
    ? daysBetween(now, new Date(activeSub.current_period_end))
    : null;
  const countdown = useMemo(() => {
    if (renewalMs === null) return null;
    const ms = Math.max(0, renewalMs);
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return { d, h, m, s, due: ms === 0 };
  }, [renewalMs]);

  // Plan usage percentage
  const monthlyCap = currentPlan?.listings_per_month ?? null;
  const usedPct = monthlyCap ? Math.min(100, Math.round((thisMonthListings.length / monthlyCap) * 100)) : null;
  const overCap = monthlyCap !== null && thisMonthListings.length > monthlyCap;
  const nearCap = monthlyCap !== null && !overCap && thisMonthListings.length / monthlyCap >= 0.8;

  // Max photos used on any listing this month (signals media-limit pressure)
  const maxPhotosUsed = useMemo(() => {
    let max = 0;
    for (const l of thisMonthListings) {
      const c = mediaCounts[l.id]?.photo ?? 0;
      if (c > max) max = c;
    }
    return max;
  }, [thisMonthListings, mediaCounts]);

  // Prorated credit from current paid plan for the unused remainder of the billing cycle
  const proratedCredit = useMemo(() => {
    if (!activeSub || !currentPlan || (currentPlan.price_php ?? 0) <= 0) return 0;
    const start = activeSub.current_period_start ? new Date(activeSub.current_period_start) : null;
    const end = activeSub.current_period_end ? new Date(activeSub.current_period_end) : null;
    if (!start || !end || end <= start) return 0;
    const totalMs = end.getTime() - start.getTime();
    const remainingMs = Math.max(0, end.getTime() - now.getTime());
    return Math.round((currentPlan.price_php * remainingMs) / totalMs);
  }, [activeSub, currentPlan, now]);

  // Score-based recommendation considering listings, boosted listings, and photo limits
  const recommendation = useMemo(() => {
    if (plans.length === 0) return null;
    const usage = thisMonthListings.length;
    // Boosts indicate the user wants visibility — target a plan with at least 25% extra room
    const listingTarget = Math.max(1, Math.ceil((usage + boostedCount * 0.5) * 1.25));
    const photoTarget = Math.max(3, maxPhotosUsed);

    const scored = plans
      .map((p) => {
        const listingCap = p.listings_per_month ?? Number.POSITIVE_INFINITY;
        const photoCap = p.max_photos_per_listing ?? 3;
        const listingFit = listingCap >= listingTarget;
        const photoFit = photoCap >= photoTarget;
        return { plan: p, listingCap, photoCap, listingFit, photoFit, fits: listingFit && photoFit };
      })
      .sort((a, b) => a.plan.price_php - b.plan.price_php);

    const fit = scored.find((s) => s.fits) ?? scored[scored.length - 1];
    if (!fit) return null;

    const usagePieces: string[] = [`${usage} listing${usage === 1 ? "" : "s"} this month`];
    if (boostedCount > 0) usagePieces.push(`${boostedCount} boosted`);
    if (maxPhotosUsed > 0) usagePieces.push(`up to ${maxPhotosUsed} photos/listing`);
    const usageSummary = usagePieces.join(" · ");

    if (!currentPlan) {
      return {
        plan: fit.plan,
        reason: `Based on ${usageSummary}, ${fit.plan.name} fits your usage.`,
        upgradeNet: fit.plan.price_php,
        proratedCredit: 0,
      };
    }

    if (fit.plan.id === currentPlan.id) {
      return {
        plan: fit.plan,
        reason: `Your current plan covers your usage (${usageSummary}).`,
        matches: true,
        upgradeNet: 0,
        proratedCredit: 0,
      };
    }

    if (fit.plan.price_php < currentPlan.price_php) {
      return {
        plan: fit.plan,
        reason: `You're under-using ${currentPlan.name}. ${fit.plan.name} still covers ${usageSummary} and saves ${formatPHP(currentPlan.price_php - fit.plan.price_php)}/mo.`,
        downgrade: true,
        upgradeNet: 0,
        proratedCredit: 0,
      };
    }

    // Upgrade — explain why and apply prorated credit
    const reasons: string[] = [];
    const curListingCap = currentPlan.listings_per_month ?? Number.POSITIVE_INFINITY;
    const curPhotoCap = currentPlan.max_photos_per_listing ?? 3;
    if (usage > curListingCap) reasons.push(`you're over your ${curListingCap}/mo listing cap`);
    else if (usage + boostedCount * 0.5 >= curListingCap * 0.8) reasons.push("you're nearing your monthly listing cap");
    if (maxPhotosUsed > curPhotoCap) reasons.push(`some listings need more than ${curPhotoCap} photos`);
    if (boostedCount > 0 && fit.listingCap > curListingCap) reasons.push(`${boostedCount} boosted listing${boostedCount === 1 ? "" : "s"} suggest you want more reach`);
    if (reasons.length === 0) reasons.push(`${fit.plan.name} better matches your activity (${usageSummary})`);

    const upgradeNet = Math.max(0, fit.plan.price_php - proratedCredit);
    return {
      plan: fit.plan,
      reason: `${reasons.join(", ")}.`,
      upgrade: true,
      upgradeNet,
      proratedCredit,
    };
  }, [plans, currentPlan, thisMonthListings.length, boostedCount, maxPhotosUsed, proratedCredit]);


  const subTone = (s: string) =>
    s === "active" ? "default" : s === "pending" ? "secondary" : s === "paused" ? "outline" : "secondary";

  const listingStatusTone = (s: string) =>
    s === "active" ? "default" : s === "sold" || s === "pending_sale" ? "secondary" : s === "expired" ? "outline" : "secondary";

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold">Billing & usage</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Track your subscription, posting activity, and see whether your plan still fits.
      </p>

      {/* Usage overview */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Listings this month</div>
          <div className="mt-1 font-display text-2xl font-bold">
            {thisMonthListings.length}
            {monthlyCap !== null && <span className="text-sm font-normal text-muted-foreground"> / {monthlyCap}</span>}
            {monthlyCap === null && currentPlan && <span className="text-sm font-normal text-muted-foreground"> / ∞</span>}
          </div>
          {usedPct !== null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-secondary">
              <div
                className={`h-full ${overCap ? "bg-destructive" : nearCap ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Active listings</div>
          <div className="mt-1 font-display text-2xl font-bold">{activeListings.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">{boostedCount} boosted</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Total views</div>
          <div className="mt-1 font-display text-2xl font-bold">{totalViews.toLocaleString()}</div>
          <div className="mt-1 text-xs text-muted-foreground">across all your listings</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-muted-foreground">Renewal countdown</div>
            {proratedCredit > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                {formatPHP(proratedCredit)} credit
              </span>
            )}
          </div>
          {countdown ? (
            <>
              <div
                className="mt-1 flex items-baseline gap-1 font-display text-2xl font-bold tabular-nums"
                aria-live="polite"
                title={`Renews ${formatDate(activeSub.current_period_end)}`}
              >
                {countdown.due ? (
                  <span>Due now</span>
                ) : (
                  <>
                    <span>{countdown.d}</span><span className="text-sm font-medium text-muted-foreground">d</span>
                    <span className="ml-1">{String(countdown.h).padStart(2, "0")}</span><span className="text-sm font-medium text-muted-foreground">h</span>
                    <span className="ml-1">{String(countdown.m).padStart(2, "0")}</span><span className="text-sm font-medium text-muted-foreground">m</span>
                    <span className="ml-1">{String(countdown.s).padStart(2, "0")}</span><span className="text-sm font-medium text-muted-foreground">s</span>
                  </>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3" />
                Renews {formatDate(activeSub.current_period_end)}
                {proratedCredit > 0 && (
                  <> · Upgrade now to get back <span className="font-medium text-emerald-600">{formatPHP(proratedCredit)}</span></>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 font-display text-2xl font-bold">—</div>
              <div className="mt-1 text-xs text-muted-foreground">No renewal date on file</div>
            </>
          )}
        </div>
      </section>

      {/* Recommendation banner */}
      {recommendation && (
        <section className="mb-8">
          <div className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
            recommendation.matches
              ? "border-emerald-500/30 bg-emerald-500/5"
              : recommendation.upgrade
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-primary/30 bg-primary/5"
          }`}>
            <div className="flex items-start gap-3">
              {recommendation.matches ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : recommendation.upgrade ? (
                <TrendingUp className="mt-0.5 h-5 w-5 text-amber-600" />
              ) : (
                <ArrowUpRight className="mt-0.5 h-5 w-5 text-primary" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {recommendation.matches ? "Your plan is a good fit" : `Suggested plan: ${recommendation.plan.name}`}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{recommendation.reason}</div>
                {recommendation.upgrade && currentPlan && (
                  <div className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-xs">
                    <div className="mb-1 font-medium uppercase tracking-wide text-muted-foreground">Prorated upgrade</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>{recommendation.plan.name}: <span className="font-medium text-foreground">{formatPHP(recommendation.plan.price_php)}</span>/mo</span>
                      {recommendation.proratedCredit > 0 && (
                        <span className="text-emerald-600">
                          − {formatPHP(recommendation.proratedCredit)} credit from {currentPlan.name}
                          {renewalDays !== null && renewalDays > 0 ? ` (${renewalDays} day${renewalDays === 1 ? "" : "s"} unused)` : ""}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">
                        = Pay now: {formatPHP(recommendation.upgradeNet)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!recommendation.matches && (
              recommendation.upgrade && currentPlan ? (
                <Button size="sm" onClick={() => setConfirmOpen(true)}>Review upgrade</Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/pricing">View plans</Link>
                </Button>
              )
            )}
          </div>
        </section>
      )}

      {/* Upgrade confirmation dialog */}
      {recommendation?.upgrade && currentPlan && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm upgrade to {recommendation.plan.name}</DialogTitle>
              <DialogDescription>
                Review the prorated charge and what changes on your account immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prorated charge today
                </div>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{recommendation.plan.name} (monthly)</dt>
                    <dd className="font-medium">{formatPHP(recommendation.plan.price_php)}</dd>
                  </div>
                  {recommendation.proratedCredit > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <dt>
                        Credit for unused {currentPlan.name}
                        {renewalDays !== null && renewalDays > 0
                          ? ` (${renewalDays} day${renewalDays === 1 ? "" : "s"} left)`
                          : ""}
                      </dt>
                      <dd className="font-medium">− {formatPHP(recommendation.proratedCredit)}</dd>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
                    <dt className="font-semibold">Due now</dt>
                    <dd className="font-semibold">{formatPHP(recommendation.upgradeNet)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What changes immediately
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Listing cap increases to{" "}
                      <span className="font-medium">
                        {recommendation.plan.listings_per_month ?? "unlimited"}
                      </span>{" "}
                      /month (from {currentPlan.listings_per_month ?? "unlimited"}).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Photo limit increases to{" "}
                      <span className="font-medium">{recommendation.plan.max_photos_per_listing}</span> per listing
                      (from {currentPlan.max_photos_per_listing}).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>New billing cycle starts today; next renewal in 30 days.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Active listings and boosts stay live — no relisting needed.</span>
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button asChild>
                <Link to="/pricing">Continue to checkout</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Posting activity chart */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Posting activity</h2>
          <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartRange("daily")}
              className={`rounded px-3 py-1 ${chartRange === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Daily · 30d
            </button>
            <button
              type="button"
              onClick={() => setChartRange("weekly")}
              className={`rounded px-3 py-1 ${chartRange === "weekly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Weekly · 12w
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          {(() => {
            const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
            if (chartRange === "daily") {
              for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - i);
                const end = new Date(d);
                end.setDate(end.getDate() + 1);
                buckets.push({
                  key: d.toISOString().slice(0, 10),
                  label: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                  start: d,
                  end,
                });
              }
            } else {
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              start.setDate(start.getDate() - start.getDay()); // Sunday
              for (let i = 11; i >= 0; i--) {
                const s = new Date(start);
                s.setDate(s.getDate() - i * 7);
                const e = new Date(s);
                e.setDate(e.getDate() + 7);
                buckets.push({
                  key: s.toISOString().slice(0, 10),
                  label: s.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                  start: s,
                  end: e,
                });
              }
            }
            const data = buckets.map((b) => ({
              label: b.label,
              posted: listings.filter((l) => {
                const t = new Date(l.created_at).getTime();
                return t >= b.start.getTime() && t < b.end.getTime();
              }).length,
            }));
            const capLine =
              monthlyCap !== null
                ? chartRange === "daily"
                  ? monthlyCap / 30
                  : (monthlyCap / 30) * 7
                : null;
            const maxY = Math.max(1, ...data.map((d) => d.posted), capLine ?? 0);
            return (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        interval={chartRange === "daily" ? 4 : 0}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, Math.ceil(maxY * 1.1)]}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [`${v} listing${v === 1 ? "" : "s"}`, "Posted"]}
                      />
                      <Bar dataKey="posted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      {capLine !== null && (
                        <ReferenceLine
                          y={capLine}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="4 4"
                          label={{
                            value: `Cap ~${capLine.toFixed(1)}/${chartRange === "daily" ? "day" : "wk"}`,
                            position: "insideTopRight",
                            fill: "hsl(var(--destructive))",
                            fontSize: 10,
                          }}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {monthlyCap !== null
                    ? `Dashed line shows your plan's average cap of ${monthlyCap} listings/month, prorated ${chartRange === "daily" ? "per day" : "per week"}.`
                    : currentPlan
                      ? "Your current plan has no monthly cap."
                      : "Start a plan to see your posting cap on this chart."}
                </div>
              </>
            );
          })()}
        </div>
      </section>


      {/* Subscriptions */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Subscriptions</h2>
          <Button asChild size="sm" variant="outline"><Link to="/pricing">Browse plans</Link></Button>
        </div>
        {subs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No subscription yet. <Link to="/pricing" className="text-primary underline">View plans</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => {
              const plan = plansById[s.plan_id];
              const days = s.current_period_end ? daysBetween(now, new Date(s.current_period_end)) : null;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium">{plan?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan ? formatPHP(plan.price_php) + "/mo · " : ""}requested {formatDate(s.created_at)}
                      {s.current_period_end ? ` · renews ${formatDate(s.current_period_end)}` : ""}
                      {days !== null && days >= 0 && s.status === "active" ? ` · ${days} day${days === 1 ? "" : "s"} left` : ""}
                    </div>
                  </div>
                  <Badge variant={subTone(s.status) as any} className="uppercase">{s.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent listings */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent listings</h2>
          <Button asChild size="sm" variant="outline"><Link to="/dashboard">My listings</Link></Button>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No listings posted yet. <Link to="/sell" className="text-primary underline">Post one</Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="p-3">Listing</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Media</th>
                  <th className="p-3">Posted</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Views</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 20).map((l) => {
                  const expDays = l.expires_at ? daysBetween(now, new Date(l.expires_at)) : null;
                  const photoCap = currentPlan?.max_photos_per_listing ?? 3;
                  const mc = mediaCounts[l.id] ?? { photo: 0, video: 0 };
                  const overPhoto = mc.photo > photoCap;
                  const nearPhoto = !overPhoto && photoCap > 0 && mc.photo / photoCap >= 0.8;
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="p-3">
                        <Link to="/listing/$id" params={{ id: l.id }} className="font-medium text-primary hover:underline">
                          {l.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">{formatPHP(l.price_php)}</div>
                      </td>
                      <td className="p-3 capitalize">
                        {l.plan}
                        {l.boost_until && new Date(l.boost_until) > now && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">BOOST</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className={`text-xs font-medium ${overPhoto ? "text-destructive" : nearPhoto ? "text-amber-600" : ""}`}>
                          {mc.photo} / {photoCap} photos
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mc.video} video{mc.video === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(l.published_at ?? l.created_at)}</td>
                      <td className="p-3 text-muted-foreground">
                        {l.expires_at ? (
                          <>
                            {formatDate(l.expires_at)}
                            {expDays !== null && expDays >= 0 && l.status === "active" && (
                              <div className={`text-xs ${expDays <= 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {expDays} day{expDays === 1 ? "" : "s"} left
                              </div>
                            )}
                          </>
                        ) : "—"}
                      </td>
                      <td className="p-3">{l.view_count.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={listingStatusTone(l.status) as any} className="capitalize">
                          {l.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payments */}
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Listing</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const linked = p.listing_id ? listings.find((l) => l.id === p.listing_id) : null;
                  const docLabel = p.status === "paid" ? "Receipt" : "Invoice";
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3">{formatDate(p.created_at)}</td>
                      <td className="p-3 capitalize">{p.kind}</td>
                      <td className="p-3">
                        {linked ? (
                          <Link to="/listing/$id" params={{ id: linked.id }} className="text-primary hover:underline">
                            {linked.title}
                          </Link>
                        ) : p.listing_id ? (
                          <span className="text-muted-foreground">Listing</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">{formatPHP(p.amount_php)}</td>
                      <td className="p-3">
                        <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Link
                          to="/payments/$id/receipt"
                          params={{ id: p.id }}
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          {docLabel} ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {overCap && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            You've posted {thisMonthListings.length} listings this month, above your {currentPlan?.name} cap of {monthlyCap}.{" "}
            <Link to="/pricing" className="text-primary underline">Upgrade your plan</Link> to keep posting without limits.
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPHP, formatDate } from "@/lib/format";
import { CheckCircle2, AlertTriangle, ArrowUpRight, TrendingUp, Calendar } from "lucide-react";

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

  const now = new Date();
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
  const renewalDays = activeSub?.current_period_end
    ? daysBetween(now, new Date(activeSub.current_period_end))
    : null;

  // Plan usage percentage
  const monthlyCap = currentPlan?.listings_per_month ?? null;
  const usedPct = monthlyCap ? Math.min(100, Math.round((thisMonthListings.length / monthlyCap) * 100)) : null;
  const overCap = monthlyCap !== null && thisMonthListings.length > monthlyCap;
  const nearCap = monthlyCap !== null && !overCap && thisMonthListings.length / monthlyCap >= 0.8;

  // Recommendation
  const recommendation = useMemo(() => {
    if (plans.length === 0) return null;
    const usage = thisMonthListings.length;
    // Find smallest plan that comfortably covers usage (cap >= usage * 1.25, or unlimited)
    const target = usage === 0 ? 1 : Math.ceil(usage * 1.25);
    const sorted = [...plans].sort((a, b) => a.price_php - b.price_php);
    const fit = sorted.find((p) => p.listings_per_month === null || p.listings_per_month >= target);
    if (!fit) return null;
    if (!currentPlan) return { plan: fit, reason: `Based on ${usage} listing${usage === 1 ? "" : "s"} this month, ${fit.name} fits your usage.` };
    if (fit.id === currentPlan.id) {
      return { plan: fit, reason: "Your current plan matches your usage well.", matches: true };
    }
    if (fit.price_php < currentPlan.price_php) {
      return { plan: fit, reason: `You're using less than your plan allows. ${fit.name} could save you ${formatPHP(currentPlan.price_php - fit.price_php)}/mo.`, downgrade: true };
    }
    return { plan: fit, reason: `You're close to or over your plan cap. ${fit.name} gives you more room.`, upgrade: true };
  }, [plans, currentPlan, thisMonthListings.length]);

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
          <div className="text-xs uppercase text-muted-foreground">Renewal</div>
          {renewalDays !== null ? (
            <>
              <div className="mt-1 font-display text-2xl font-bold">
                {renewalDays > 0 ? `${renewalDays}d` : "Due"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3" />
                {formatDate(activeSub.current_period_end)}
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
              <div>
                <div className="font-semibold">
                  {recommendation.matches ? "Your plan is a good fit" : `Suggested plan: ${recommendation.plan.name}`}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{recommendation.reason}</div>
              </div>
            </div>
            {!recommendation.matches && (
              <Button asChild size="sm">
                <Link to="/pricing">View plans</Link>
              </Button>
            )}
          </div>
        </section>
      )}

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
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const linked = p.listing_id ? listings.find((l) => l.id === p.listing_id) : null;
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

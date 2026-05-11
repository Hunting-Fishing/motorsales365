import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/format";
import { BarChart3, MapPin, Users, Tag, CreditCard, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

type Bucket = { key: string; count: number; extra?: string };

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </div>
      {children}
    </div>
  );
}

function BarList({ items, total, valueLabel }: { items: Bucket[]; total: number; valueLabel?: (n: number) => string }) {
  if (!items.length) return <div className="text-sm text-muted-foreground">No data yet.</div>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((i) => {
        const pct = (i.count / max) * 100;
        const share = total > 0 ? Math.round((i.count / total) * 100) : 0;
        return (
          <div key={i.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate pr-2">{i.key}</span>
              <span className="tabular-nums text-muted-foreground">
                {valueLabel ? valueLabel(i.count) : i.count} <span className="opacity-60">· {share}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            {i.extra && <div className="mt-0.5 text-xs text-muted-foreground">{i.extra}</div>}
          </div>
        );
      })}
    </div>
  );
}

function tally<T>(rows: T[], key: (r: T) => string | null | undefined, fallback = "Unknown"): Bucket[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = (key(r) || fallback).toString();
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [l, p, pay, s, pl, c] = await Promise.all([
        supabase.from("listings").select("id,user_id,category_slug,region,province,city,status,plan,seller_type,view_count,price_php,created_at").limit(5000),
        supabase.from("profiles").select("id,seller_type,business_kind,verification_status,business_region,created_at").limit(5000),
        supabase.from("payments").select("amount_php,status,kind,created_at").limit(5000),
        supabase.from("subscriptions").select("plan_id,status,created_at").limit(5000),
        supabase.from("subscription_plans").select("id,name,price_php"),
        supabase.from("categories").select("slug,name"),
      ]);
      setListings(l.data ?? []);
      setProfiles(p.data ?? []);
      setPayments(pay.data ?? []);
      setSubs(s.data ?? []);
      setPlans(pl.data ?? []);
      setCategories(c.data ?? []);
      setLoading(false);
    })();
  }, []);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.name])), [categories]);
  const planMap = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  // Top-line stats
  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.status === "active").length;
  const totalUsers = profiles.length;
  const businessUsers = profiles.filter((p) => p.seller_type === "business").length;
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount_php || 0), 0);

  // Listings by category
  const byCategory = useMemo(
    () => tally(listings, (l) => catMap[l.category_slug] || l.category_slug),
    [listings, catMap],
  );

  // Listings by region
  const byRegion = useMemo(() => tally(listings, (l) => l.region), [listings]);
  const byProvince = useMemo(() => tally(listings, (l) => l.province).slice(0, 12), [listings]);
  const byCity = useMemo(() => tally(listings, (l) => l.city).slice(0, 12), [listings]);

  // Plan tiers (free vs paid listings)
  const byPlan = useMemo(() => tally(listings, (l) => l.plan || "free"), [listings]);

  // Subscriptions per plan
  const subsByPlan = useMemo(
    () => tally(subs, (s) => planMap[s.plan_id]?.name || "Unknown"),
    [subs, planMap],
  );
  const freeUsers = totalUsers - subs.filter((s) => s.status === "active").length;

  // Business kinds (multi-service trends)
  const byBusinessKind = useMemo(
    () => tally(profiles.filter((p) => p.seller_type === "business"), (p) => p.business_kind),
    [profiles],
  );

  // Top business users by listing count + views
  const topBusinesses = useMemo(() => {
    const m = new Map<string, { count: number; views: number }>();
    for (const l of listings) {
      const cur = m.get(l.user_id) || { count: 0, views: 0 };
      cur.count += 1;
      cur.views += l.view_count || 0;
      m.set(l.user_id, cur);
    }
    const profMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    return [...m.entries()]
      .map(([uid, v]) => ({
        key: profMap[uid]?.business_kind
          ? `${profMap[uid]?.business_kind} · ${uid.slice(0, 6)}`
          : uid.slice(0, 8),
        count: v.count,
        extra: `${v.views} total views`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [listings, profiles]);

  // Region × Category heat (top 5 markets per top region)
  const regionCategory = useMemo(() => {
    const top5Regions = byRegion.slice(0, 5).map((r) => r.key);
    return top5Regions.map((r) => {
      const subset = listings.filter((l) => (l.region || "Unknown") === r);
      return { region: r, total: subset.length, cats: tally(subset, (l) => catMap[l.category_slug] || l.category_slug).slice(0, 5) };
    });
  }, [byRegion, listings, catMap]);

  // Signups trend (30 days)
  const signups30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400_000;
    return profiles.filter((p) => new Date(p.created_at).getTime() > cutoff).length;
  }, [profiles]);
  const listings30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400_000;
    return listings.filter((l) => new Date(l.created_at).getTime() > cutoff).length;
  }, [listings]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading analytics…</div>;

  const top = [
    { label: "Total listings", value: totalListings, sub: `${activeListings} active` },
    { label: "Total users", value: totalUsers, sub: `${businessUsers} businesses` },
    { label: "Total ad views", value: totalViews.toLocaleString(), sub: `${listings30} listings · 30d` },
    { label: "Revenue", value: formatPHP(totalRevenue), sub: `${signups30} signups · 30d` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Site analytics</h1>
        <p className="text-sm text-muted-foreground">Market insights — categories, regions, business activity, and tier usage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {top.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Listings by category" icon={Tag}>
          <BarList items={byCategory} total={totalListings} />
        </Card>
        <Card title="Listings by region" icon={MapPin}>
          <BarList items={byRegion} total={totalListings} />
        </Card>
        <Card title="Top provinces" icon={MapPin}>
          <BarList items={byProvince} total={totalListings} />
        </Card>
        <Card title="Top cities" icon={MapPin}>
          <BarList items={byCity} total={totalListings} />
        </Card>

        <Card title="Listing plan tiers" icon={CreditCard}>
          <BarList items={byPlan} total={totalListings} />
        </Card>
        <Card title="Active subscription tiers" icon={CreditCard}>
          <BarList items={subsByPlan} total={subs.length} />
          <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            ~{Math.max(0, freeUsers)} users on free tier (no active paid subscription).
          </div>
        </Card>

        <Card title="Business kinds" icon={Users}>
          <BarList items={byBusinessKind} total={businessUsers} />
        </Card>
        <Card title="Top businesses by activity" icon={TrendingUp}>
          <BarList items={topBusinesses} total={totalListings} />
        </Card>
      </div>

      <Card title="Top markets — region × category" icon={BarChart3}>
        {regionCategory.length === 0 ? (
          <div className="text-sm text-muted-foreground">No regional data yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regionCategory.map((r) => (
              <div key={r.region} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold">{r.region}</div>
                  <div className="text-xs text-muted-foreground">{r.total} listings</div>
                </div>
                <BarList items={r.cats} total={r.total} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground">Sales & promotion insights</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>High-opportunity regions appear at the top of "Listings by region" — target promotions where supply is dense.</li>
          <li>Low-activity regions (bottom of region/province lists) are growth markets — consider outreach campaigns.</li>
          <li>Business kinds with high listing counts but low subscription conversion are upsell candidates.</li>
          <li>Track multi-service businesses via "Top businesses by activity" combined with their tag mix on each listing.</li>
        </ul>
      </div>
    </div>
  );
}

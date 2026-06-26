import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ScanLine, UserPlus, Ticket, Inbox, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type DrillStage = "scans" | "signups" | "listings";
type DrillTarget = { day: string; stage: DrillStage } | null;

export const Route = createFileRoute("/admin/advertisements/analytics/$code")({
  component: QrCodeDrilldownPage,
  head: ({ params }) => ({
    meta: [
      { title: `QR ${params.code} — Drilldown` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const RANGES = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "365", label: "Last 12 months" },
  { id: "all", label: "All time" },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

function rangeSince(id: RangeId): string | null {
  if (id === "all") return null;
  return new Date(Date.now() - Number(id) * 86400000).toISOString();
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function QrCodeDrilldownPage() {
  const { code } = Route.useParams();
  const [range, setRange] = useState<RangeId>("30");
  const [drill, setDrill] = useState<DrillTarget>(null);
  const since = useMemo(() => rangeSince(range), [range]);

  const ownerQ = useQuery({
    queryKey: ["qr-drill", "owner", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_referrals")
        .select("full_name, email, phone, active, created_at")
        .eq("referral_code", code)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const scansQ = useQuery({
    queryKey: ["qr-drill", "scans", code, since],
    queryFn: async () => {
      let q = supabase
        .from("qr_scans")
        .select("id, scanned_at, device_type, browser, country, visitor_id")
        .eq("referral_code", code);
      if (since) q = q.gte("scanned_at", since);
      const { data, error } = await q.order("scanned_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const signupsQ = useQuery({
    queryKey: ["qr-drill", "signups", code, since],
    queryFn: async () => {
      let q = supabase
        .from("user_referrals")
        .select("id, user_id, signup_date, first_referral_code, last_referral_code, credited_referral_code, referred_by_staff_id")
        .eq("credited_referral_code", code);
      if (since) q = q.gte("signup_date", since);
      const { data, error } = await q.order("signup_date", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Best-effort profile attribution lookup for the credited signups
  const userIds = useMemo(() => (signupsQ.data ?? []).map((r) => r.user_id).filter(Boolean), [signupsQ.data]);
  const profilesQ = useQuery({
    queryKey: ["qr-drill", "profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      if (error) throw error;
      const m = new Map<string, { full_name: string | null; phone: string | null }>();
      for (const p of data ?? []) m.set(p.id, p as never);
      return m;
    },
  });

  // Activated listings = listings published by users credited to this code
  const listingsQ = useQuery({
    queryKey: ["qr-drill", "listings", userIds, since],
    enabled: userIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("id, user_id, published_at, status, created_at")
        .in("user_id", userIds)
        .not("published_at", "is", null);
      if (since) q = q.gte("published_at", since);
      const { data, error } = await q.order("published_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Daily funnel: scans -> signups -> activated listings
  const byDay = useMemo(() => {
    const m = new Map<string, { scans: number; signups: number; listings: number }>();
    const ensure = (k: string) => {
      const v = m.get(k) ?? { scans: 0, signups: 0, listings: 0 };
      m.set(k, v);
      return v;
    };
    for (const s of scansQ.data ?? []) ensure(dayKey(s.scanned_at)).scans += 1;
    for (const s of signupsQ.data ?? []) ensure(dayKey(s.signup_date)).signups += 1;
    for (const l of listingsQ.data ?? []) {
      if (!l.published_at) continue;
      ensure(dayKey(l.published_at)).listings += 1;
    }
    return Array.from(m.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [scansQ.data, signupsQ.data, listingsQ.data]);

  const maxBar = Math.max(1, ...byDay.map((d) => d.scans + d.signups + d.listings));

  const totals = {
    scans: scansQ.data?.length ?? 0,
    signups: signupsQ.data?.length ?? 0,
    listings: listingsQ.data?.length ?? 0,
    uniqueVisitors: new Set((scansQ.data ?? []).map((s) => s.visitor_id).filter(Boolean)).size,
  };

  const convRate = totals.uniqueVisitors > 0 ? (totals.signups / totals.uniqueVisitors) * 100 : 0;
  const listingRate = totals.signups > 0 ? (totals.listings / totals.signups) * 100 : 0;

  type BreakdownRow = { key: string; scans: number; visitors: number; share: number };
  const breakdowns = useMemo(() => {
    function build(field: "device_type" | "browser" | "country"): BreakdownRow[] {
      const m = new Map<string, { scans: number; visitors: Set<string> }>();
      for (const s of scansQ.data ?? []) {
        const key = ((s as never)[field] as string | null) || "Unknown";
        const v = m.get(key) ?? { scans: 0, visitors: new Set<string>() };
        v.scans += 1;
        if (s.visitor_id) v.visitors.add(s.visitor_id);
        m.set(key, v);
      }
      const total = totals.scans || 1;
      return Array.from(m.entries())
        .map(([key, v]) => ({ key, scans: v.scans, visitors: v.visitors.size, share: (v.scans / total) * 100 }))
        .sort((a, b) => b.scans - a.scans);
    }
    return {
      device: build("device_type"),
      browser: build("browser"),
      country: build("country"),
    };
  }, [scansQ.data, totals.scans]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/admin/advertisements/analytics">
              <ArrowLeft className="h-4 w-4" /> Back to analytics
            </Link>
          </Button>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <QrCode className="h-5 w-5" />
            <span className="font-mono">{code}</span>
            {ownerQ.data?.full_name && (
              <span className="text-muted-foreground">— {ownerQ.data.full_name}</span>
            )}
            {ownerQ.data && (
              <Badge variant={ownerQ.data.active ? "default" : "secondary"}>
                {ownerQ.data.active ? "Active" : "Inactive"}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Day-by-day scans and credited signups with full attribution details.
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeId)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={ScanLine} label="Scans" value={totals.scans} loading={scansQ.isLoading} />
        <Stat icon={Inbox} label="Unique visitors" value={totals.uniqueVisitors} loading={scansQ.isLoading} />
        <Stat icon={UserPlus} label="Credited signups" value={totals.signups} loading={signupsQ.isLoading} />
        <Stat icon={Ticket} label="Activated listings" value={totals.listings} loading={listingsQ.isLoading} />
        <Stat
          icon={Ticket}
          label="Visitor → Signup → Listing"
          value={`${convRate.toFixed(1)}% · ${listingRate.toFixed(1)}%`}
          loading={scansQ.isLoading || signupsQ.isLoading || listingsQ.isLoading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownCard title="By device" rows={breakdowns.device} loading={scansQ.isLoading} emptyLabel="No device data." />
        <BreakdownCard title="By browser" rows={breakdowns.browser} loading={scansQ.isLoading} emptyLabel="No browser data." />
        <BreakdownCard title="By country" rows={breakdowns.country} loading={scansQ.isLoading} emptyLabel="No location data." />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funnel timeline</CardTitle>
          <CardDescription>
            Scans → credited signups → activated listings per day, with stage-by-stage conversion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {byDay.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No activity yet for this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Scans</th>
                    <th className="px-4 py-2 text-right">Signups</th>
                    <th className="px-4 py-2 text-right">Listings</th>
                    <th className="px-4 py-2 text-right" title="Signups ÷ Scans">S→U</th>
                    <th className="px-4 py-2 text-right" title="Listings ÷ Signups">U→L</th>
                    <th className="px-4 py-2 text-left w-2/5">Funnel</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((d) => {
                    const su = d.scans > 0 ? (d.signups / d.scans) * 100 : 0;
                    const ul = d.signups > 0 ? (d.listings / d.signups) * 100 : 0;
                    return (
                      <tr key={d.day} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{d.day}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{d.scans}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{d.signups}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{d.listings}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {d.scans > 0 ? `${su.toFixed(0)}%` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {d.signups > 0 ? `${ul.toFixed(0)}%` : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex h-3 items-center gap-px overflow-hidden rounded bg-muted">
                            <div
                              className="h-full bg-primary/70"
                              style={{ width: `${(d.scans / maxBar) * 100}%` }}
                              aria-label={`${d.scans} scans`}
                            />
                            <div
                              className="h-full bg-emerald-500/80"
                              style={{ width: `${(d.signups / maxBar) * 100}%` }}
                              aria-label={`${d.signups} signups`}
                            />
                            <div
                              className="h-full bg-amber-500/80"
                              style={{ width: `${(d.listings / maxBar) * 100}%` }}
                              aria-label={`${d.listings} activated listings`}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Credited signups — attribution</CardTitle>
          <CardDescription>
            Each signup credited to this QR code with first/last touch and basic profile data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {signupsQ.isLoading ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
          ) : (signupsQ.data?.length ?? 0) === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No credited signups in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Signed up</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">User ID</th>
                    <th className="px-4 py-2 text-left">First touch</th>
                    <th className="px-4 py-2 text-left">Last touch</th>
                  </tr>
                </thead>
                <tbody>
                  {(signupsQ.data ?? []).map((r) => {
                    const p = profilesQ.data?.get(r.user_id);
                    return (
                      <tr key={r.id} className="border-t align-top">
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(r.signup_date).toLocaleString()}</td>
                        <td className="px-4 py-2">{p?.full_name ?? "—"}</td>
                        <td className="px-4 py-2">{p?.phone ?? "—"}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">{r.user_id?.slice(0, 8) ?? "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.first_referral_code ?? "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.last_referral_code ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent scans</CardTitle>
          <CardDescription>Most recent 2,000 scans of this QR code in the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scansQ.isLoading ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
          ) : (scansQ.data?.length ?? 0) === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No scans in this range.</p>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">When</th>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">Browser</th>
                    <th className="px-4 py-2 text-left">Country</th>
                    <th className="px-4 py-2 text-left">Visitor</th>
                  </tr>
                </thead>
                <tbody>
                  {(scansQ.data ?? []).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(s.scanned_at).toLocaleString()}</td>
                      <td className="px-4 py-2">{s.device_type ?? "—"}</td>
                      <td className="px-4 py-2">{s.browser ?? "—"}</td>
                      <td className="px-4 py-2">{s.country ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                        {s.visitor_id ? s.visitor_id.slice(0, 8) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof QrCode;
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">
            {loading ? "—" : typeof value === "number" ? value.toLocaleString() : value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  loading,
  emptyLabel,
}: {
  title: string;
  rows: { key: string; scans: number; visitors: number; share: number }[];
  loading: boolean;
  emptyLabel: string;
}) {
  const top = rows.slice(0, 8);
  const maxScans = Math.max(1, ...top.map((r) => r.scans));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Scans and unique visitors by segment.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : top.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Segment</th>
                <th className="px-4 py-2 text-right">Scans</th>
                <th className="px-4 py-2 text-right">Visitors</th>
                <th className="px-4 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-4 py-2">
                    <div className="truncate">{r.key}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary/70"
                        style={{ width: `${(r.scans / maxScans) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.scans}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.visitors}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {r.share.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

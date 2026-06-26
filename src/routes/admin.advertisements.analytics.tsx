import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QrCode, ScanLine, UserPlus, Ticket, Inbox, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/advertisements/analytics")({
  component: QrAnalyticsPage,
  head: () => ({
    meta: [
      { title: "QR Analytics — Admin" },
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
  const days = Number(id);
  return new Date(Date.now() - days * 86400000).toISOString();
}

function QrAnalyticsPage() {
  const { user, isAdvertising, isAdmin, isSales } = useAuth();
  const [range, setRange] = useState<RangeId>("30");
  const since = useMemo(() => rangeSince(range), [range]);

  const isAllScope = isAdmin || isAdvertising;

  // Load this user's own QR codes (always; staff-policy scoped). Advertising/admin can also see all.
  const myCodesQ = useQuery({
    queryKey: ["qr-analytics", "my-codes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_referrals")
        .select("id, referral_code, full_name, active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [codeFilter, setCodeFilter] = useState<string>("__all");
  const filterCode = codeFilter === "__all" ? null : codeFilter;

  const scansQ = useQuery({
    queryKey: ["qr-analytics", "scans", since, filterCode, isAllScope],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("qr_scans")
        .select("id, referral_code, scanned_at, device_type, country", { count: "exact" });
      if (since) q = q.gte("scanned_at", since);
      if (filterCode) q = q.eq("referral_code", filterCode);
      const { data, count, error } = await q
        .order("scanned_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const signupsQ = useQuery({
    queryKey: ["qr-analytics", "signups", since, filterCode],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("user_referrals")
        .select("id, user_id, credited_referral_code, first_referral_code, signup_date", { count: "exact" })
        .not("credited_referral_code", "is", null);
      if (since) q = q.gte("signup_date", since);
      if (filterCode) q = q.eq("credited_referral_code", filterCode);
      const { data, count, error } = await q.order("signup_date", { ascending: false }).limit(500);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const redemptionsQ = useQuery({
    queryKey: ["qr-analytics", "redemptions", since, filterCode],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("referral_redemptions")
        .select("id, referral_code, kind, applies_to, final_amount_php, discount_amount_php, created_at", { count: "exact" });
      if (since) q = q.gte("created_at", since);
      if (filterCode) q = q.eq("referral_code", filterCode);
      const { data, count, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const leadsQ = useQuery({
    queryKey: ["qr-analytics", "leads", since, filterCode],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("qr_lead_captures")
        .select("id, referral_code, name, contact, interest_type, status, created_at", { count: "exact" });
      if (since) q = q.gte("created_at", since);
      if (filterCode) q = q.eq("referral_code", filterCode);
      const { data, count, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  // Per-code rollup (computed from loaded scan rows + signup rows + redemption rows).
  const rollup = useMemo(() => {
    const m = new Map<string, { scans: number; signups: number; redemptions: number; leads: number }>();
    const inc = (code: string | null | undefined, k: "scans" | "signups" | "redemptions" | "leads") => {
      if (!code) return;
      const v = m.get(code) ?? { scans: 0, signups: 0, redemptions: 0, leads: 0 };
      v[k] += 1;
      m.set(code, v);
    };
    for (const r of scansQ.data?.rows ?? []) inc(r.referral_code, "scans");
    for (const r of signupsQ.data?.rows ?? []) inc(r.credited_referral_code, "signups");
    for (const r of redemptionsQ.data?.rows ?? []) inc(r.referral_code, "redemptions");
    for (const r of leadsQ.data?.rows ?? []) inc(r.referral_code, "leads");
    return Array.from(m.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.scans + b.signups - (a.scans + a.signups));
  }, [scansQ.data, signupsQ.data, redemptionsQ.data, leadsQ.data]);

  const codeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of myCodesQ.data ?? []) m.set(c.referral_code, c.full_name);
    return m;
  }, [myCodesQ.data]);

  const totals = {
    scans: scansQ.data?.count ?? 0,
    signups: signupsQ.data?.count ?? 0,
    redemptions: redemptionsQ.data?.count ?? 0,
    leads: leadsQ.data?.count ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">QR Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {isAllScope
              ? "All QR scans, signups, redemptions and lead captures across every code."
              : "Scans, signups, redemptions and lead captures from your QR codes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={codeFilter} onValueChange={setCodeFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All QR codes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All QR codes</SelectItem>
              {(myCodesQ.data ?? []).map((c) => (
                <SelectItem key={c.referral_code} value={c.referral_code}>
                  {c.referral_code} — {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ScanLine} label="QR scans" value={totals.scans} loading={scansQ.isLoading} />
        <StatCard icon={UserPlus} label="Signups credited" value={totals.signups} loading={signupsQ.isLoading} />
        <StatCard icon={Ticket} label="Promo redemptions" value={totals.redemptions} loading={redemptionsQ.isLoading} />
        <StatCard icon={Inbox} label="Lead captures" value={totals.leads} loading={leadsQ.isLoading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4" /> Performance by QR code
          </CardTitle>
          <CardDescription>Aggregated from the most recent activity in the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rollup.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No activity yet for this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-right">Scans</th>
                    <th className="px-4 py-2 text-right">Signups</th>
                    <th className="px-4 py-2 text-right">Redemptions</th>
                    <th className="px-4 py-2 text-right">Leads</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rollup.map((r) => (
                    <tr key={r.code} className="border-t">
                      <td className="px-4 py-2 font-mono">{r.code}</td>
                      <td className="px-4 py-2">{codeNameMap.get(r.code) ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{r.scans}</td>
                      <td className="px-4 py-2 text-right">{r.signups}</td>
                      <td className="px-4 py-2 text-right">{r.redemptions}</td>
                      <td className="px-4 py-2 text-right">{r.leads}</td>
                      <td className="px-4 py-2 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/r/$code" params={{ code: r.code }} target="_blank">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="scans" className="space-y-3">
        <TabsList>
          <TabsTrigger value="scans">Scans</TabsTrigger>
          <TabsTrigger value="signups">Signups</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="scans">
          <RecentTable
            loading={scansQ.isLoading}
            columns={["When", "Code", "Device", "Country"]}
            rows={(scansQ.data?.rows ?? []).map((r) => [
              new Date(r.scanned_at).toLocaleString(),
              r.referral_code,
              r.device_type ?? "—",
              r.country ?? "—",
            ])}
          />
        </TabsContent>
        <TabsContent value="signups">
          <RecentTable
            loading={signupsQ.isLoading}
            columns={["When", "Code", "First seen via"]}
            rows={(signupsQ.data?.rows ?? []).map((r) => [
              new Date(r.signup_date).toLocaleString(),
              r.credited_referral_code ?? "—",
              r.first_referral_code ?? "—",
            ])}
          />
        </TabsContent>
        <TabsContent value="redemptions">
          <RecentTable
            loading={redemptionsQ.isLoading}
            columns={["When", "Code", "Kind", "Applies to", "Discount ₱", "Final ₱"]}
            rows={(redemptionsQ.data?.rows ?? []).map((r) => [
              new Date(r.created_at).toLocaleString(),
              r.referral_code,
              r.kind,
              r.applies_to,
              Number(r.discount_amount_php ?? 0).toLocaleString(),
              Number(r.final_amount_php ?? 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="leads">
          <RecentTable
            loading={leadsQ.isLoading}
            columns={["When", "Code", "Name", "Contact", "Interest", "Status"]}
            rows={(leadsQ.data?.rows ?? []).map((r) => [
              new Date(r.created_at).toLocaleString(),
              r.referral_code ?? "—",
              r.name,
              r.contact,
              r.interest_type,
              <Badge key="s" variant="secondary">{r.status}</Badge>,
            ])}
          />
        </TabsContent>
      </Tabs>

      {!isAllScope && !isSales && (myCodesQ.data?.length ?? 0) === 0 && (
        <p className="rounded border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You don't have a QR referral code assigned yet. Ask an admin to set one up.
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof QrCode;
  label: string;
  value: number;
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
            {loading ? "—" : value.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTable({
  columns,
  rows,
  loading,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-2 text-left">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 align-top">{cell as React.ReactNode}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

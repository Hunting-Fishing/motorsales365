import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Ticket, Percent, Coins, Users } from "lucide-react";
import { formatPHP } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/redemptions")({
  component: AdminRedemptions,
});

const sb = supabase as any;

type Row = {
  id: string;
  user_id: string;
  staff_referral_id: string;
  promotion_id: string;
  referral_code: string;
  kind: string;
  applies_to: string;
  subscription_id: string | null;
  payment_id: string | null;
  listing_id: string | null;
  base_amount_php: number;
  discount_amount_php: number;
  final_amount_php: number;
  percent_off: number | null;
  flat_amount_php: number | null;
  created_at: string;
};

type Staff = { id: string; full_name: string; referral_code: string };
type Promo = { id: string; title: string };
type Profile = { id: string; full_name: string | null };

const KINDS = ["all", "subscription", "listing", "upgrade", "boost", "other"] as const;
type Kind = (typeof KINDS)[number];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function AdminRedemptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, Staff>>({});
  const [promoMap, setPromoMap] = useState<Record<string, Promo>>({});
  const [userMap, setUserMap] = useState<Record<string, Profile>>({});
  const [staffOptions, setStaffOptions] = useState<Staff[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<Kind>("all");
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(isoDaysAgo(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from("staff_referrals")
      .select("id,full_name,referral_code")
      .order("full_name")
      .then(({ data }: any) => {
        const list = (data || []) as Staff[];
        setStaffOptions(list);
        setStaffMap(Object.fromEntries(list.map((s) => [s.id, s])));
      });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = sb.from("referral_redemptions").select("*").order("created_at", { ascending: false }).limit(1000);
      if (staffFilter !== "all") q = q.eq("staff_referral_id", staffFilter);
      if (kindFilter !== "all") q = q.eq("kind", kindFilter);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());

      const { data } = await q;
      const list = (data || []) as Row[];
      setRows(list);

      // Fetch related promos and user profiles
      const promoIds = Array.from(new Set(list.map((r) => r.promotion_id))).filter(Boolean);
      const userIds = Array.from(new Set(list.map((r) => r.user_id))).filter(Boolean);
      const [{ data: pr }, { data: pf }] = await Promise.all([
        promoIds.length
          ? sb.from("staff_promotions").select("id,title").in("id", promoIds)
          : Promise.resolve({ data: [] as Promo[] }),
        userIds.length
          ? sb.from("profiles").select("id,full_name").in("id", userIds)
          : Promise.resolve({ data: [] as Profile[] }),
      ]);
      setPromoMap(Object.fromEntries(((pr as Promo[]) || []).map((p) => [p.id, p])));
      setUserMap(Object.fromEntries(((pf as Profile[]) || []).map((u) => [u.id, u])));
      setLoading(false);
    })();
  }, [staffFilter, kindFilter, from, to]);

  const totals = useMemo(() => {
    const base = rows.reduce((s, r) => s + Number(r.base_amount_php || 0), 0);
    const disc = rows.reduce((s, r) => s + Number(r.discount_amount_php || 0), 0);
    const fin = rows.reduce((s, r) => s + Number(r.final_amount_php || 0), 0);
    const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
    return { base, disc, fin, uniqueUsers };
  }, [rows]);

  const byKindChart = useMemo(() => {
    const buckets = ["subscription", "listing", "upgrade", "boost", "other"] as const;
    const map = new Map<string, { count: number; discount: number }>();
    buckets.forEach((b) => map.set(b, { count: 0, discount: 0 }));
    rows.forEach((r) => {
      const k = (buckets as readonly string[]).includes(r.kind) ? r.kind : "other";
      const cur = map.get(k)!;
      cur.count += 1;
      cur.discount += Number(r.discount_amount_php || 0);
    });
    return buckets
      .map((k) => ({ kind: k, count: map.get(k)!.count, discount: Math.round(map.get(k)!.discount) }))
      .filter((d) => d.count > 0 || d.discount > 0);
  }, [rows]);

  const exportCsv = () => {
    const headers = [
      "created_at","staff_name","referral_code","user_name","user_id",
      "kind","applies_to","promotion","percent_off","flat_amount_php",
      "base_amount_php","discount_amount_php","final_amount_php",
      "subscription_id","payment_id","listing_id","redemption_id",
    ];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const s = staffMap[r.staff_referral_id];
      lines.push([
        r.created_at,
        s?.full_name ?? "",
        r.referral_code,
        userMap[r.user_id]?.full_name ?? "",
        r.user_id,
        r.kind,
        r.applies_to,
        promoMap[r.promotion_id]?.title ?? "",
        r.percent_off ?? "",
        r.flat_amount_php ?? "",
        r.base_amount_php,
        r.discount_amount_php,
        r.final_amount_php,
        r.subscription_id ?? "",
        r.payment_id ?? "",
        r.listing_id ?? "",
        r.id,
      ].map(esc).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral-redemptions-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Referral redemptions</h1>
          <p className="text-sm text-muted-foreground">
            Every discount applied via a staff QR referral. Filter by staff, plan kind, and date.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </header>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Staff</label>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="all">All staff</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.referral_code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Kind</label>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as Kind)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Ticket className="h-4 w-4" />} label="Redemptions" value={rows.length.toLocaleString()} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Unique users" value={totals.uniqueUsers.toLocaleString()} />
        <Kpi icon={<Percent className="h-4 w-4" />} label="Total discounted" value={formatPHP(totals.disc)} />
        <Kpi icon={<Coins className="h-4 w-4" />} label="Final billed" value={formatPHP(totals.fin)} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
            Breakdown by kind
          </h2>
          <span className="text-xs text-muted-foreground">
            Counts (bars) and total discount (₱) for current filters
          </span>
        </div>
        {byKindChart.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No data in this range.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byKindChart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="kind" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: any) =>
                    name === "discount"
                      ? [formatPHP(Number(value)), "Discount"]
                      : [Number(value).toLocaleString(), "Redemptions"]
                  }
                />
                <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="discount" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {byKindChart.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2 text-right">Redemptions</th>
                  <th className="px-3 py-2 text-right">Share</th>
                  <th className="px-3 py-2 text-right">Total discount</th>
                </tr>
              </thead>
              <tbody>
                {byKindChart.map((d) => {
                  const share = rows.length ? (d.count / rows.length) * 100 : 0;
                  return (
                    <tr key={d.kind} className="border-t border-border">
                      <td className="px-3 py-2">
                        <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">{d.kind}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {share.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">
                        −{formatPHP(d.discount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rows.length.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">100%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-primary">
                    −{formatPHP(totals.disc)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Promo</th>
                <th className="px-3 py-2 text-right">Base</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2 text-right">Final</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No redemptions in this range.</td></tr>
              ) : rows.map((r) => {
                const s = staffMap[r.staff_referral_id];
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <Link
                        to="/admin/redemptions/$staffId"
                        params={{ staffId: r.staff_referral_id }}
                        className="block hover:underline"
                      >
                        <div className="font-medium text-primary">{s?.full_name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.referral_code}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{userMap[r.user_id]?.full_name ?? "—"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">{r.kind}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div>{promoMap[r.promotion_id]?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.percent_off ? `${r.percent_off}% off` : ""}
                        {r.flat_amount_php ? ` ₱${r.flat_amount_php} flat` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{formatPHP(r.base_amount_php)}</td>
                    <td className="px-3 py-2 text-right text-primary">−{formatPHP(r.discount_amount_php)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatPHP(r.final_amount_php)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Ticket, Percent, Coins, Users } from "lucide-react";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/admin/redemptions_/$staffId")({
  component: StaffRedemptionDetail,
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

type Staff = { id: string; full_name: string; referral_code: string; email: string; active: boolean };
type Promo = { id: string; title: string };
type Profile = { id: string; full_name: string | null };

const KINDS = ["all", "subscription", "listing", "upgrade", "boost", "other"] as const;
type Kind = (typeof KINDS)[number];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function StaffRedemptionDetail() {
  const { staffId } = Route.useParams();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [promoMap, setPromoMap] = useState<Record<string, Promo>>({});
  const [userMap, setUserMap] = useState<Record<string, Profile>>({});
  const [kindFilter, setKindFilter] = useState<Kind>("all");
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(isoDaysAgo(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from("staff_referrals")
      .select("id,full_name,referral_code,email,active")
      .eq("id", staffId)
      .maybeSingle()
      .then(({ data }: any) => setStaff(data));
  }, [staffId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = sb
        .from("referral_redemptions")
        .select("*")
        .eq("staff_referral_id", staffId)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (kindFilter !== "all") q = q.eq("kind", kindFilter);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());

      const { data } = await q;
      const list = (data || []) as Row[];
      setRows(list);

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
  }, [staffId, kindFilter, from, to]);

  const totals = useMemo(() => {
    const base = rows.reduce((s, r) => s + Number(r.base_amount_php || 0), 0);
    const disc = rows.reduce((s, r) => s + Number(r.discount_amount_php || 0), 0);
    const fin = rows.reduce((s, r) => s + Number(r.final_amount_php || 0), 0);
    const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
    return { base, disc, fin, uniqueUsers };
  }, [rows]);

  const byKind = useMemo(() => {
    const m = new Map<string, { count: number; disc: number; fin: number }>();
    rows.forEach((r) => {
      const k = r.kind || "other";
      const cur = m.get(k) || { count: 0, disc: 0, fin: 0 };
      cur.count += 1;
      cur.disc += Number(r.discount_amount_php || 0);
      cur.fin += Number(r.final_amount_php || 0);
      m.set(k, cur);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].fin - a[1].fin);
  }, [rows]);

  const topUsers = useMemo(() => {
    const m = new Map<string, { count: number; disc: number; fin: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.user_id) || { count: 0, disc: 0, fin: 0 };
      cur.count += 1;
      cur.disc += Number(r.discount_amount_php || 0);
      cur.fin += Number(r.final_amount_php || 0);
      m.set(r.user_id, cur);
    });
    return Array.from(m.entries())
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.fin - a.fin)
      .slice(0, 10);
  }, [rows]);

  const exportCsv = () => {
    const headers = [
      "created_at","referral_code","user_name","user_id","kind","applies_to","promotion",
      "percent_off","flat_amount_php","base_amount_php","discount_amount_php","final_amount_php",
      "subscription_id","payment_id","listing_id","redemption_id",
    ];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push([
        r.created_at, r.referral_code, userMap[r.user_id]?.full_name ?? "", r.user_id,
        r.kind, r.applies_to, promoMap[r.promotion_id]?.title ?? "",
        r.percent_off ?? "", r.flat_amount_php ?? "",
        r.base_amount_php, r.discount_amount_php, r.final_amount_php,
        r.subscription_id ?? "", r.payment_id ?? "", r.listing_id ?? "", r.id,
      ].map(esc).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-${staff?.referral_code ?? staffId}-redemptions-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/admin/redemptions"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to redemptions
          </Link>
          <h1 className="font-display text-2xl font-bold">
            {staff?.full_name ?? "Staff"}{" "}
            {staff && (
              <span className="ml-2 rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                {staff.referral_code}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {staff?.email} {staff && !staff.active && <span className="text-destructive">· inactive</span>}
          </p>
        </div>
        <Button onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </header>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">By plan kind</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {byKind.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
                ) : byKind.map(([k, v]) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-3 py-2"><span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">{k}</span></td>
                    <td className="px-3 py-2 text-right">{v.count}</td>
                    <td className="px-3 py-2 text-right text-primary">−{formatPHP(v.disc)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatPHP(v.fin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">Top users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 text-right">Redemptions</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
                ) : topUsers.map((u) => (
                  <tr key={u.user_id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{userMap[u.user_id]?.full_name ?? "—"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-2 text-right">{u.count}</td>
                    <td className="px-3 py-2 text-right text-primary">−{formatPHP(u.disc)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatPHP(u.fin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider">All redemptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
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
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No redemptions in this range.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{userMap[r.user_id]?.full_name ?? "—"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{r.user_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-2"><span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">{r.kind}</span></td>
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
              ))}
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

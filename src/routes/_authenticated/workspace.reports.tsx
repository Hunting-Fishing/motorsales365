import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Loader2, TrendingUp, Receipt, Wrench, Boxes, Users2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Shop Manager" },
      { name: "description", content: "Revenue, work order throughput, inventory value, and top customers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

const RANGES: Record<string, { label: string; days: number }> = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  "365d": { label: "Last 12 months", days: 365 },
};

function since(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function peso(n: number) {
  return `₱${Math.round(n).toLocaleString()}`;
}

function ReportsPage() {
  const [range, setRange] = useState<keyof typeof RANGES>("30d");
  const fromISO = useMemo(() => since(RANGES[range].days), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "reports", range],
    queryFn: async () => {
      const sm = smSupabase as any;
      const [invc, wo, pay, inv, cust, timeEntries, techs, ratesRow] = await Promise.all([
        sm.from("invoices").select("id,total,status,created_at,customer_id").gte("created_at", fromISO).limit(2000),
        sm.from("work_orders").select("id,status,created_at,total_cost").gte("created_at", fromISO).limit(2000),
        sm.from("payments").select("id,amount,created_at").gte("created_at", fromISO).limit(2000),
        sm.from("inventory_items").select("id,quantity,unit_price,cost,reorder_point").limit(2000),
        sm.from("customers").select("id,first_name,last_name").limit(2000),
        sm.from("work_order_time_entries").select("employee_id,duration,billable,hourly_rate,start_time").gte("start_time", fromISO).limit(10000),
        sm.from("profiles").select("id,full_name,first_name,last_name,hourly_rate,cost_rate").limit(1000),
        sm.from("labor_rates").select("standard_rate").limit(1).maybeSingle(),
      ]);

      const invoices = invc.data ?? [];
      const workOrders = wo.data ?? [];
      const payments = pay.data ?? [];
      const inventory = inv.data ?? [];
      const customers = cust.data ?? [];

      const invoiced = invoices.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
      const collected = payments.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const outstanding = invoices
        .filter((i: any) => !["paid", "void", "cancelled"].includes(String(i.status ?? "").toLowerCase()))
        .reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);

      const woCounts: Record<string, number> = workOrders.reduce((m: Record<string, number>, w: any) => {
        const s = String(w.status ?? "unknown").toLowerCase();
        m[s] = (m[s] ?? 0) + 1;
        return m;
      }, {});
      const woCompleted = (woCounts["completed"] ?? 0) + (woCounts["closed"] ?? 0);
      const woOpen = workOrders.length - woCompleted;
      const avgTicket = woCompleted ? workOrders
        .filter((w: any) => ["completed", "closed"].includes(String(w.status ?? "").toLowerCase()))
        .reduce((s: number, w: any) => s + Number(w.total_cost ?? 0), 0) / woCompleted : 0;

      const invValueRetail = inventory.reduce((s: number, i: any) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0), 0);
      const invValueCost = inventory.reduce((s: number, i: any) => s + Number(i.quantity ?? 0) * Number(i.cost ?? 0), 0);
      const lowStock = inventory.filter((i: any) => Number(i.quantity ?? 0) <= Number(i.reorder_point ?? 0)).length;

      // Top customers by invoiced total
      const byCust: Record<string, number> = {};
      for (const i of invoices) {
        if (!i.customer_id) continue;
        byCust[i.customer_id] = (byCust[i.customer_id] ?? 0) + Number(i.total ?? 0);
      }
      const custName = new Map<string, string>(customers.map((c: any) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id.slice(0, 8)]));
      const topCustomers = Object.entries(byCust)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, total]) => ({ id, name: custName.get(id) ?? id.slice(0, 8), total }));

      // Revenue by day
      const bucket = new Map<string, number>();
      const days = RANGES[range].days;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        bucket.set(d.toISOString().slice(0, 10), 0);
      }
      for (const p of payments) {
        const k = String(p.created_at ?? "").slice(0, 10);
        if (bucket.has(k)) bucket.set(k, (bucket.get(k) ?? 0) + Number(p.amount ?? 0));
      }
      const series = Array.from(bucket.entries()).map(([date, amt]) => ({ date, amt }));
      const maxAmt = Math.max(1, ...series.map((s) => s.amt));

      // Per-technician contribution
      const defaultBill = Number((ratesRow.data as any)?.standard_rate ?? 0);
      const techMap = new Map<string, any>((techs.data ?? []).map((t: any) => [t.id, t]));
      const techAgg: Record<string, { revenue: number; cost: number; sec: number; billableSec: number }> = {};
      for (const e of timeEntries.data ?? []) {
        if (!e.employee_id) continue;
        const t = techMap.get(e.employee_id);
        const bill = Number(e.hourly_rate ?? t?.hourly_rate ?? defaultBill) || 0;
        const cost = Number(t?.cost_rate ?? 0) || 0;
        const dur = Number(e.duration ?? 0);
        const a = (techAgg[e.employee_id] ||= { revenue: 0, cost: 0, sec: 0, billableSec: 0 });
        a.sec += dur;
        a.cost += (dur / 3600) * cost;
        if (e.billable) {
          a.billableSec += dur;
          a.revenue += (dur / 3600) * bill;
        }
      }
      const technicianPnl = Object.entries(techAgg)
        .map(([id, v]) => {
          const t = techMap.get(id);
          const name =
            t?.full_name ||
            [t?.first_name, t?.last_name].filter(Boolean).join(" ") ||
            id.slice(0, 8);
          return { id, name, ...v, net: v.revenue - v.cost };
        })
        .sort((a, b) => b.net - a.net)
        .slice(0, 10);

      return {
        totals: { invoiced, collected, outstanding, avgTicket, invValueRetail, invValueCost, lowStock, woOpen, woCompleted },
        woCounts,
        topCustomers,
        series,
        maxAmt,
        technicianPnl,
      };
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground">Revenue, throughput, and inventory health.</p>
            </div>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Crunching numbers…</div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={Receipt} label="Invoiced" value={peso(data.totals.invoiced)} sub={`${peso(data.totals.outstanding)} outstanding`} />
              <Kpi icon={TrendingUp} label="Collected" value={peso(data.totals.collected)} sub="payments received" />
              <Kpi icon={Wrench} label="Work Orders" value={`${data.totals.woCompleted} done`} sub={`${data.totals.woOpen} open`} />
              <Kpi icon={Boxes} label="Inventory Value" value={peso(data.totals.invValueRetail)} sub={`cost ${peso(data.totals.invValueCost)} · ${data.totals.lowStock} low`} />
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Payments collected</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-40">
                    {data.series.map((s) => (
                      <div key={s.date} className="flex-1 flex flex-col items-center gap-1" title={`${s.date}: ${peso(s.amt)}`}>
                        <div
                          className="w-full bg-primary/70 rounded-sm"
                          style={{ height: `${(s.amt / data.maxAmt) * 100}%`, minHeight: s.amt > 0 ? 2 : 0 }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{data.series[0]?.date}</span>
                    <span>{data.series[data.series.length - 1]?.date}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Work orders by status</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(data.woCounts).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No work orders in this range.</p>
                  ) : Object.entries(data.woCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{s.replace(/_/g, " ")}</span>
                        <Badge variant="outline">{n}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2"><Users2 className="h-4 w-4 text-primary" /> Top customers by invoiced</CardTitle>
                <Button asChild size="sm" variant="ghost"><Link to="/workspace/customers">All customers</Link></Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoiced customers in this range.</p>
                ) : data.topCustomers.map((c) => (
                  <Link
                    key={c.id}
                    to="/workspace/customers/$id"
                    params={{ id: c.id }}
                    className="flex items-center justify-between rounded border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono">{peso(c.total)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Contribution by technician</CardTitle>
                <Button asChild size="sm" variant="ghost"><Link to="/workspace/technicians">All technicians</Link></Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {(data.technicianPnl ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logged time in this range.</p>
                ) : (data.technicianPnl ?? []).map((t: any) => (
                  <Link
                    key={t.id}
                    to="/workspace/reports/technician/$id"
                    params={{ id: t.id }}
                    className="flex items-center justify-between gap-3 rounded border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate flex-1">{t.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{(t.sec / 3600).toFixed(1)}h</span>
                    <span className="text-xs text-muted-foreground tabular-nums">rev {peso(t.revenue)}</span>
                    <span className={"font-mono tabular-nums " + (t.net >= 0 ? "text-emerald-600" : "text-rose-600")}>{peso(t.net)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm"><Link to="/workspace/reports/ltv">Customer LTV</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/workspace/reports/parts-margin">Parts margin</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/workspace/automation/logs">Automation health</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/workspace/accounting/pnl">P&amp;L drilldown</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/workspace/leave-requests">Leave requests</Link></Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Totals reflect data scoped to your shop. Averages exclude cancelled or void records.
            </p>

          </>
        )}
      </div>
    </SiteLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="h-4 w-4" /> {label}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

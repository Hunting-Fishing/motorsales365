import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users2, Loader2, TrendingUp, ArrowLeft, Download } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/reports/ltv")({
  head: () => ({
    meta: [
      { title: "Customer LTV — Shop Manager" },
      { name: "description", content: "Lifetime value per customer: total spend, visits, avg ticket, first & last order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LtvReport,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Customer LTV</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function peso(n: number) {
  return `₱${Math.round(n).toLocaleString()}`;
}

type Row = {
  id: string;
  name: string;
  total: number;
  visits: number;
  avgTicket: number;
  firstAt: string | null;
  lastAt: string | null;
  daysSinceLast: number | null;
};

function LtvReport() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "visits" | "avg" | "recent">("total");

  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "reports", "ltv"],
    queryFn: async () => {
      const sm = smSupabase as any;
      const [invc, cust] = await Promise.all([
        sm.from("invoices").select("id,total,status,created_at,customer_id").limit(20000),
        sm.from("customers").select("id,first_name,last_name,email,phone").limit(20000),
      ]);
      const invoices = (invc.data ?? []).filter((i: any) =>
        !["void", "cancelled", "canceled"].includes(String(i.status ?? "").toLowerCase()),
      );
      const custMap = new Map<string, any>((cust.data ?? []).map((c: any) => [c.id, c]));
      const agg: Record<string, { total: number; visits: number; first: number; last: number }> = {};
      for (const i of invoices) {
        if (!i.customer_id) continue;
        const a = (agg[i.customer_id] ||= { total: 0, visits: 0, first: Infinity, last: 0 });
        a.total += Number(i.total ?? 0);
        a.visits += 1;
        const t = new Date(i.created_at ?? 0).getTime();
        if (t < a.first) a.first = t;
        if (t > a.last) a.last = t;
      }
      const rows: Row[] = Object.entries(agg).map(([id, v]) => {
        const c = custMap.get(id);
        const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || c.phone || id.slice(0, 8) : id.slice(0, 8);
        const lastAt = v.last ? new Date(v.last).toISOString() : null;
        return {
          id,
          name,
          total: v.total,
          visits: v.visits,
          avgTicket: v.visits ? v.total / v.visits : 0,
          firstAt: v.first !== Infinity ? new Date(v.first).toISOString() : null,
          lastAt,
          daysSinceLast: lastAt ? Math.floor((Date.now() - v.last) / 86_400_000) : null,
        };
      });
      const totalRevenue = rows.reduce((s, r) => s + r.total, 0);
      const avgLtv = rows.length ? totalRevenue / rows.length : 0;
      return { rows, totalRevenue, avgLtv, customerCount: rows.length };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as Row[];
    const q = search.trim().toLowerCase();
    let rows = q ? data.rows.filter((r) => r.name.toLowerCase().includes(q)) : data.rows.slice();
    rows.sort((a, b) => {
      if (sortBy === "visits") return b.visits - a.visits;
      if (sortBy === "avg") return b.avgTicket - a.avgTicket;
      if (sortBy === "recent") return (a.daysSinceLast ?? 9e9) - (b.daysSinceLast ?? 9e9);
      return b.total - a.total;
    });
    return rows;
  }, [data, search, sortBy]);

  function exportCsv() {
    if (!filtered.length) return;
    const header = ["Customer", "Total spent", "Visits", "Avg ticket", "First order", "Last order", "Days since last"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        `"${r.name.replace(/"/g, '""')}"`,
        r.total.toFixed(2),
        r.visits,
        r.avgTicket.toFixed(2),
        r.firstAt ?? "",
        r.lastAt ?? "",
        r.daysSinceLast ?? "",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-ltv-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/shop/reports"><ArrowLeft className="mr-1 h-4 w-4" /> Back to reports</Link>
          </Button>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <Users2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Customer lifetime value</h1>
            <p className="text-muted-foreground">Total invoiced per customer across all time. Void/cancelled excluded.</p>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing LTV…</div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-2"><Users2 className="h-4 w-4" /> Customers with orders</div>
                <div className="mt-2 text-2xl font-bold">{data.customerCount.toLocaleString()}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Lifetime revenue</div>
                <div className="mt-2 text-2xl font-bold">{peso(data.totalRevenue)}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Average LTV</div>
                <div className="mt-2 text-2xl font-bold">{peso(data.avgLtv)}</div>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <CardTitle className="text-base flex-1">Customers</CardTitle>
                <Input
                  placeholder="Search…"
                  className="w-56 h-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total spent</SelectItem>
                    <SelectItem value="visits">Visits</SelectItem>
                    <SelectItem value="avg">Avg ticket</SelectItem>
                    <SelectItem value="recent">Most recent</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                  <Download className="mr-1 h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Avg ticket</TableHead>
                      <TableHead className="text-right">Last order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link to="/shop/customers/$id" params={{ id: r.id }} className="hover:underline">
                            {r.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{peso(r.total)}</TableCell>
                        <TableCell className="text-right">{r.visits}</TableCell>
                        <TableCell className="text-right font-mono">{peso(r.avgTicket)}</TableCell>
                        <TableCell className="text-right">
                          {r.daysSinceLast == null ? "—" : r.daysSinceLast > 180 ? (
                            <Badge variant="destructive">{r.daysSinceLast}d ago</Badge>
                          ) : r.daysSinceLast > 90 ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">{r.daysSinceLast}d ago</Badge>
                          ) : (
                            <Badge variant="outline">{r.daysSinceLast}d ago</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <p className="mt-2 text-xs text-muted-foreground">Showing first 200 of {filtered.length}. Refine with search.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

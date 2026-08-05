import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Boxes, Loader2, ArrowLeft, Download, TrendingUp, AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/reports/parts-margin")({
  head: () => ({
    meta: [
      { title: "Parts margin — Shop Manager" },
      { name: "description", content: "Margin per part: cost, retail, stock value, sold quantity and realized profit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartsMargin,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Parts margin</h1>
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
  sku: string | null;
  cost: number;
  price: number;
  qty: number;
  marginUnit: number;
  marginPct: number;
  stockValueCost: number;
  stockValueRetail: number;
  qtySold: number;
  realizedRevenue: number;
  realizedProfit: number;
};

function PartsMargin() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"realized" | "marginPct" | "stock" | "sold">("realized");

  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "reports", "parts-margin"],
    queryFn: async () => {
      const sm = smSupabase as any;
      const [inv, sold] = await Promise.all([
        sm.from("inventory_items").select("id,name,sku,part_number,quantity,unit_price,cost").limit(10000),
        sm.from("work_order_parts").select("part_name,part_number,quantity,customer_price").limit(20000),
      ]);
      const items = inv.data ?? [];
      // Match sold rows to inventory by part_number (case-insensitive), fall back to name.
      const bySku = new Map<string, any>();
      const byName = new Map<string, any>();
      for (const it of items) {
        const key = String(it.part_number ?? it.sku ?? "").trim().toLowerCase();
        if (key) bySku.set(key, it);
        const nk = String(it.name ?? "").trim().toLowerCase();
        if (nk) byName.set(nk, it);
      }
      const soldAgg: Record<string, { qty: number; rev: number }> = {};
      for (const p of sold.data ?? []) {
        const key = String(p.part_number ?? "").trim().toLowerCase();
        const match = (key && bySku.get(key)) || byName.get(String(p.part_name ?? "").trim().toLowerCase());
        if (!match) continue;
        const a = (soldAgg[match.id] ||= { qty: 0, rev: 0 });
        a.qty += Number(p.quantity ?? 0);
        a.rev += Number(p.quantity ?? 0) * Number(p.customer_price ?? 0);
      }
      const rows: Row[] = items.map((it: any) => {
        const cost = Number(it.cost ?? 0);
        const price = Number(it.unit_price ?? 0);
        const qty = Number(it.quantity ?? 0);
        const marginUnit = price - cost;
        const marginPct = price > 0 ? (marginUnit / price) * 100 : 0;
        const s = soldAgg[it.id] ?? { qty: 0, rev: 0 };
        return {
          id: it.id,
          name: it.name ?? it.sku ?? "—",
          sku: it.part_number ?? it.sku ?? null,
          cost,
          price,
          qty,
          marginUnit,
          marginPct,
          stockValueCost: qty * cost,
          stockValueRetail: qty * price,
          qtySold: s.qty,
          realizedRevenue: s.rev,
          realizedProfit: s.rev - s.qty * cost,
        };
      });
      const totalStockCost = rows.reduce((s, r) => s + r.stockValueCost, 0);
      const totalStockRetail = rows.reduce((s, r) => s + r.stockValueRetail, 0);
      const totalRealizedRev = rows.reduce((s, r) => s + r.realizedRevenue, 0);
      const totalRealizedProfit = rows.reduce((s, r) => s + r.realizedProfit, 0);
      const avgMarginPct = rows.length
        ? rows.filter((r) => r.price > 0).reduce((s, r) => s + r.marginPct, 0) /
            Math.max(1, rows.filter((r) => r.price > 0).length)
        : 0;
      const noCost = rows.filter((r) => r.cost === 0 && r.qty > 0).length;
      return {
        rows,
        totalStockCost,
        totalStockRetail,
        totalRealizedRev,
        totalRealizedProfit,
        avgMarginPct,
        noCost,
      };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as Row[];
    const q = search.trim().toLowerCase();
    let rows = q
      ? data.rows.filter((r) => r.name.toLowerCase().includes(q) || (r.sku ?? "").toLowerCase().includes(q))
      : data.rows.slice();
    rows.sort((a, b) => {
      if (sortBy === "marginPct") return b.marginPct - a.marginPct;
      if (sortBy === "stock") return b.stockValueCost - a.stockValueCost;
      if (sortBy === "sold") return b.qtySold - a.qtySold;
      return b.realizedProfit - a.realizedProfit;
    });
    return rows;
  }, [data, search, sortBy]);

  function exportCsv() {
    if (!filtered.length) return;
    const header = ["Part", "SKU", "Cost", "Price", "Margin %", "Stock qty", "Stock cost", "Sold qty", "Revenue", "Realized profit"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(r.sku ?? "").replace(/"/g, '""')}"`,
        r.cost.toFixed(2),
        r.price.toFixed(2),
        r.marginPct.toFixed(1),
        r.qty,
        r.stockValueCost.toFixed(2),
        r.qtySold,
        r.realizedRevenue.toFixed(2),
        r.realizedProfit.toFixed(2),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parts-margin-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <Boxes className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Parts margin</h1>
            <p className="text-muted-foreground">Margin per part with realized profit from work orders.</p>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing margins…</div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Stock at cost</div>
                <div className="mt-2 text-2xl font-bold">{peso(data.totalStockCost)}</div>
                <div className="text-xs text-muted-foreground mt-1">retail {peso(data.totalStockRetail)}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Avg margin %</div>
                <div className="mt-2 text-2xl font-bold">{data.avgMarginPct.toFixed(1)}%</div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Realized revenue</div>
                <div className="mt-2 text-2xl font-bold">{peso(data.totalRealizedRev)}</div>
                <div className="text-xs text-emerald-600 mt-1">profit {peso(data.totalRealizedProfit)}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Missing cost</div>
                <div className="mt-2 text-2xl font-bold">{data.noCost}</div>
                <div className="text-xs text-muted-foreground mt-1">items with stock but no cost</div>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <CardTitle className="text-base flex-1">Parts</CardTitle>
                <Input placeholder="Search…" className="w-56 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realized">Realized profit</SelectItem>
                    <SelectItem value="marginPct">Margin %</SelectItem>
                    <SelectItem value="stock">Stock value</SelectItem>
                    <SelectItem value="sold">Units sold</SelectItem>
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
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 300).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link to="/shop/inventory" className="hover:underline">
                            {r.name}
                          </Link>
                          {r.sku && <div className="text-xs text-muted-foreground font-mono">{r.sku}</div>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{peso(r.cost)}</TableCell>
                        <TableCell className="text-right font-mono">{peso(r.price)}</TableCell>
                        <TableCell className="text-right">
                          {r.price === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : r.marginPct < 15 ? (
                            <Badge variant="destructive">{r.marginPct.toFixed(0)}%</Badge>
                          ) : r.marginPct < 30 ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">{r.marginPct.toFixed(0)}%</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-600">{r.marginPct.toFixed(0)}%</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.qty}</TableCell>
                        <TableCell className="text-right">{r.qtySold || "—"}</TableCell>
                        <TableCell className={"text-right font-mono " + (r.realizedProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {r.qtySold ? peso(r.realizedProfit) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 300 && (
                  <p className="mt-2 text-xs text-muted-foreground">Showing first 300 of {filtered.length}. Refine with search.</p>
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-xs text-muted-foreground">
              Realized profit = revenue from work-order parts matched by part number or name, minus (qty × inventory cost).
              Items sold that don't match an inventory record are excluded.
            </p>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

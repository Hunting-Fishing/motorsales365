import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2, TrendingUp } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/accounting/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: PnLPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Profit & Loss</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found</div></SiteLayout>,
});

async function fetchPnl(from: string, to: string) {
  const [{ data: accts }, { data: lines }] = await Promise.all([
    (smSupabase as any).from("chart_of_accounts").select("*").in("account_type", ["revenue", "expense"]),
    (smSupabase as any).from("journal_entry_lines").select("account_id,debit,credit,journal_entry:journal_entries(entry_date,status)"),
  ]);
  const filtered = (lines ?? []).filter((l: any) => l.journal_entry?.status !== "void" && l.journal_entry?.entry_date >= from && l.journal_entry?.entry_date <= to);
  const byAcct = new Map<string, number>();
  for (const l of filtered) {
    const acct = (accts ?? []).find((a: any) => a.id === l.account_id);
    if (!acct) continue;
    const amt = acct.account_type === "revenue" ? Number(l.credit || 0) - Number(l.debit || 0) : Number(l.debit || 0) - Number(l.credit || 0);
    byAcct.set(l.account_id, (byAcct.get(l.account_id) ?? 0) + amt);
  }
  return { accounts: accts ?? [], byAcct };
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const firstOfMonth = () => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth(), 1)); };
const today = () => toISO(new Date());
const fmt = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// COGS accounts start with 5, operating expenses with 6 (per seeded chart of accounts)
const isCogs = (code: string) => (code || "").startsWith("5");

function PnLPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useQuery({ queryKey: ["shop-manager", "pnl", from, to], queryFn: () => fetchPnl(from, to) });

  const applyPreset = (preset: string) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (preset === "this-month") { setFrom(toISO(new Date(y, m, 1))); setTo(today()); }
    else if (preset === "last-month") { setFrom(toISO(new Date(y, m - 1, 1))); setTo(toISO(new Date(y, m, 0))); }
    else if (preset === "last-30") { const d = new Date(); d.setDate(d.getDate() - 29); setFrom(toISO(d)); setTo(today()); }
    else if (preset === "qtd") { const qStart = Math.floor(m / 3) * 3; setFrom(toISO(new Date(y, qStart, 1))); setTo(today()); }
    else if (preset === "ytd") { setFrom(toISO(new Date(y, 0, 1))); setTo(today()); }
    else if (preset === "last-year") { setFrom(toISO(new Date(y - 1, 0, 1))); setTo(toISO(new Date(y - 1, 11, 31))); }
  };

  const totals = useMemo(() => {
    const withAmt = (a: any) => ({ ...a, amount: data?.byAcct.get(a.id) ?? 0 });
    const nonZero = (a: any) => a.amount !== 0;
    const revenue = (data?.accounts ?? []).filter((a: any) => a.account_type === "revenue").map(withAmt).filter(nonZero);
    const expenses = (data?.accounts ?? []).filter((a: any) => a.account_type === "expense").map(withAmt).filter(nonZero);
    const cogs = expenses.filter((a: any) => isCogs(a.code));
    const opex = expenses.filter((a: any) => !isCogs(a.code));
    const revenueTotal = revenue.reduce((s: number, a: any) => s + a.amount, 0);
    const cogsTotal = cogs.reduce((s: number, a: any) => s + a.amount, 0);
    const opexTotal = opex.reduce((s: number, a: any) => s + a.amount, 0);
    const grossProfit = revenueTotal - cogsTotal;
    const grossMargin = revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0;
    const net = grossProfit - opexTotal;
    return { revenue, cogs, opex, revenueTotal, cogsTotal, opexTotal, grossProfit, grossMargin, net };
  }, [data]);

  const exportCsv = () => {
    const rows: string[][] = [["Section", "Code", "Account", "Amount"]];
    totals.revenue.forEach((a: any) => rows.push(["Revenue", a.code, a.name, a.amount.toFixed(2)]));
    rows.push(["", "", "Total Revenue", totals.revenueTotal.toFixed(2)]);
    totals.cogs.forEach((a: any) => rows.push(["Cost of Goods Sold", a.code, a.name, a.amount.toFixed(2)]));
    rows.push(["", "", "Total COGS", totals.cogsTotal.toFixed(2)]);
    rows.push(["", "", "Gross Profit", totals.grossProfit.toFixed(2)]);
    totals.opex.forEach((a: any) => rows.push(["Operating Expenses", a.code, a.name, a.amount.toFixed(2)]));
    rows.push(["", "", "Total Operating Expenses", totals.opexTotal.toFixed(2)]);
    rows.push(["", "", "Net Income", totals.net.toFixed(2)]);
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pnl-${from}-${to}.csv`; a.click();
  };

  const Section = ({ title, items, total, tone }: { title: string; items: any[]; total: number; tone?: string }) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 && <div className="text-sm text-muted-foreground">No activity in period.</div>}
        {items.map((a: any) => (
          <div key={a.id} className="flex justify-between text-sm py-1 border-b last:border-0">
            <Link to="/shop/journal/$accountId" params={{ accountId: a.id }} className="hover:underline">
              <span className="font-mono text-xs mr-2 text-muted-foreground">{a.code}</span>{a.name}
            </Link>
            <span className="tabular-nums">{fmt(a.amount)}</span>
          </div>
        ))}
        <div className={"flex justify-between font-bold text-sm pt-2 border-t " + (tone ?? "")}>
          <span>Total {title}</span><span className="tabular-nums">{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4">
          <Link to="/shop/accounting" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Accounting
          </Link>
        </div>
        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Profit & Loss</h1>
            <p className="text-sm text-muted-foreground">Income statement — click any account or invoice link to drill down.</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["this-month", "This Month"],
            ["last-month", "Last Month"],
            ["last-30", "Last 30 days"],
            ["qtd", "Quarter to Date"],
            ["ytd", "Year to Date"],
            ["last-year", "Last Year"],
          ].map(([k, label]) => (
            <Button key={k} size="sm" variant="secondary" onClick={() => applyPreset(k)}>{label}</Button>
          ))}
        </div>

        {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="space-y-4">
            <Section title="Revenue" items={totals.revenue} total={totals.revenueTotal} />
            <Section title="Cost of Goods Sold" items={totals.cogs} total={totals.cogsTotal} />

            <Card className="border-primary/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Gross Profit</div>
                  <div className="text-xs text-muted-foreground">Revenue − COGS · Margin {totals.grossMargin.toFixed(1)}%</div>
                </div>
                <div className={"text-2xl font-bold tabular-nums " + (totals.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {fmt(totals.grossProfit)}
                </div>
              </CardContent>
            </Card>

            <Section title="Operating Expenses" items={totals.opex} total={totals.opexTotal} />

            <Card className={totals.net >= 0 ? "border-emerald-500/50" : "border-rose-500/50"}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div className="text-xs text-muted-foreground">{from} → {to} · Gross Profit − Operating Expenses</div>
                </div>
                <div className={"text-3xl font-bold tabular-nums " + (totals.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {fmt(totals.net)}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground pt-2">
              Tip: click any account name above to open its ledger, and each ledger row links to the originating invoice, payment, bill, or work order.
            </p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

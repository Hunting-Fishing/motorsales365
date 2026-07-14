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

export const Route = createFileRoute("/_authenticated/shop/accounting/pnl")({
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
    // Revenue: credit increases; Expense: debit increases
    const amt = acct.account_type === "revenue" ? Number(l.credit || 0) - Number(l.debit || 0) : Number(l.debit || 0) - Number(l.credit || 0);
    byAcct.set(l.account_id, (byAcct.get(l.account_id) ?? 0) + amt);
  }
  return { accounts: accts ?? [], byAcct };
}

const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

function PnLPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useQuery({ queryKey: ["shop-manager", "pnl", from, to], queryFn: () => fetchPnl(from, to) });

  const { revenue, expense, revenueTotal, expenseTotal, net } = useMemo(() => {
    const rev = (data?.accounts ?? []).filter((a: any) => a.account_type === "revenue").map((a: any) => ({ ...a, amount: data?.byAcct.get(a.id) ?? 0 })).filter((a: any) => a.amount !== 0);
    const exp = (data?.accounts ?? []).filter((a: any) => a.account_type === "expense").map((a: any) => ({ ...a, amount: data?.byAcct.get(a.id) ?? 0 })).filter((a: any) => a.amount !== 0);
    const rT = rev.reduce((s: number, a: any) => s + a.amount, 0);
    const eT = exp.reduce((s: number, a: any) => s + a.amount, 0);
    return { revenue: rev, expense: exp, revenueTotal: rT, expenseTotal: eT, net: rT - eT };
  }, [data]);

  const exportCsv = () => {
    const rows = [["Type", "Code", "Account", "Amount"]];
    revenue.forEach((a: any) => rows.push(["Revenue", a.code, a.name, String(a.amount)]));
    rows.push(["", "", "Total Revenue", String(revenueTotal)]);
    expense.forEach((a: any) => rows.push(["Expense", a.code, a.name, String(a.amount)]));
    rows.push(["", "", "Total Expense", String(expenseTotal)]);
    rows.push(["", "", "Net Income", String(net)]);
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pnl-${from}-${to}.csv`; a.click();
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4">
          <Link to="/shop/accounting" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Accounting
          </Link>
        </div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Profit & Loss</h1>
            <p className="text-sm text-muted-foreground">Income statement from posted journal entries.</p>
          </div>
          <div className="flex gap-2 items-end">
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
          </div>
        </div>

        {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {revenue.length === 0 && <div className="text-sm text-muted-foreground">No revenue in period.</div>}
                {revenue.map((a: any) => (
                  <div key={a.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <Link to="/shop/journal/$accountId" params={{ accountId: a.id }} className="hover:underline"><span className="font-mono text-xs mr-2">{a.code}</span>{a.name}</Link>
                    <span className="tabular-nums">₱{a.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm pt-2 border-t"><span>Total Revenue</span><span className="tabular-nums">₱{revenueTotal.toLocaleString()}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {expense.length === 0 && <div className="text-sm text-muted-foreground">No expenses in period.</div>}
                {expense.map((a: any) => (
                  <div key={a.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <Link to="/shop/journal/$accountId" params={{ accountId: a.id }} className="hover:underline"><span className="font-mono text-xs mr-2">{a.code}</span>{a.name}</Link>
                    <span className="tabular-nums">₱{a.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm pt-2 border-t"><span>Total Expenses</span><span className="tabular-nums">₱{expenseTotal.toLocaleString()}</span></div>
              </CardContent>
            </Card>

            <Card className={net >= 0 ? "border-emerald-500/50" : "border-rose-500/50"}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div className="text-xs text-muted-foreground">{from} → {to}</div>
                </div>
                <div className={"text-3xl font-bold tabular-nums " + (net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  ₱{net.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

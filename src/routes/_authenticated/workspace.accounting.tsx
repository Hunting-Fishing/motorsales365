import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  BarChart3,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting — Shop Manager" },
      { name: "description", content: "Revenue, expenses, cash flow and profit summary." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountingPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Accounting</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

type Range = "mtd" | "30d" | "90d" | "ytd";

function rangeStart(r: Range): Date {
  const now = new Date();
  if (r === "mtd") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (r === "30d") return new Date(Date.now() - 30 * 86400000);
  if (r === "90d") return new Date(Date.now() - 90 * 86400000);
  return new Date(now.getFullYear(), 0, 1);
}

const fmt = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function AccountingPage() {
  const [range, setRange] = useState<Range>("mtd");
  const startISO = rangeStart(range).toISOString();
  const startDate = rangeStart(range).toISOString().slice(0, 10);

  const q = useQuery({
    queryKey: ["shop-manager", "accounting", range],
    queryFn: async () => {
      const [inv, pay, exp, vpay, expBreak] = await Promise.all([
        (smSupabase as any).from("invoices").select("id,total,status,created_at").gte("created_at", startISO).limit(5000),
        (smSupabase as any).from("payments").select("id,amount,transaction_date,status").gte("transaction_date", startISO).limit(5000),
        (smSupabase as any).from("expenses").select("id,amount,expense_date,category_id").gte("expense_date", startDate).limit(5000),
        (smSupabase as any).from("vendor_payments").select("id,amount,payment_date").gte("payment_date", startDate).limit(5000),
        (smSupabase as any).from("expense_categories").select("id,name").limit(500),
      ]);
      if (inv.error) throw inv.error;
      if (pay.error) throw pay.error;
      if (exp.error) throw exp.error;
      if (vpay.error) throw vpay.error;

      const invoicesTotal = (inv.data ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
      const outstanding = (inv.data ?? []).filter((r: any) =>
        !["paid", "void", "cancelled"].includes(String(r.status ?? "").toLowerCase())
      ).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
      const cashIn = (pay.data ?? [])
        .filter((r: any) => String(r.status ?? "completed").toLowerCase() !== "failed")
        .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const expensesTotal = (exp.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const vendorPaid = (vpay.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

      // Expenses by category
      const catMap = new Map<string, string>();
      for (const c of expBreak.data ?? []) catMap.set(c.id, c.name);
      const byCat = new Map<string, number>();
      for (const e of exp.data ?? []) {
        const key = catMap.get(e.category_id) ?? "Uncategorized";
        byCat.set(key, (byCat.get(key) ?? 0) + Number(e.amount ?? 0));
      }
      const byCatSorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

      return {
        invoicesTotal,
        outstanding,
        cashIn,
        expensesTotal,
        vendorPaid,
        cashOut: expensesTotal + vendorPaid,
        gross: invoicesTotal - expensesTotal,
        netCash: cashIn - (expensesTotal + vendorPaid),
        byCat: byCatSorted,
      };
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/shop"><ArrowLeft className="h-4 w-4 mr-1" /> Shop</Link>
        </Button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Accounting</h1>
              <p className="text-muted-foreground">Revenue, expenses, cash flow and profit summary.</p>
            </div>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mtd">Month to date</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {q.isLoading || !q.data ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={TrendingUp} label="Revenue (invoiced)" value={fmt(q.data.invoicesTotal)} sub={`${fmt(q.data.outstanding)} outstanding`} tone="up" />
              <Kpi icon={Wallet} label="Cash in (payments)" value={fmt(q.data.cashIn)} tone="up" />
              <Kpi icon={TrendingDown} label="Expenses + vendor pay" value={fmt(q.data.cashOut)} sub={`Expenses ${fmt(q.data.expensesTotal)} · Vendor ${fmt(q.data.vendorPaid)}`} tone="down" />
              <Kpi icon={Receipt} label="Net cash flow" value={fmt(q.data.netCash)} tone={q.data.netCash >= 0 ? "up" : "down"} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Gross profit (revenue − expenses)</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${q.data.gross >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {fmt(q.data.gross)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue is total invoiced value in this period. Add COGS journal to refine.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Expenses by category</CardTitle></CardHeader>
              <CardContent>
                {q.data.byCat.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses in this period.</p>
                ) : (
                  <ul className="space-y-1">
                    {q.data.byCat.map(([name, amt]) => {
                      const pct = q.data.expensesTotal > 0 ? (amt / q.data.expensesTotal) * 100 : 0;
                      return (
                        <li key={name} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span>{name}</span>
                            <span className="font-mono">{fmt(amt)}</span>
                          </div>
                          <div className="h-1.5 rounded bg-muted overflow-hidden mt-1">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone: "up" | "down" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="h-4 w-4" /> {label}</div>
        <div className={`mt-2 text-2xl font-bold ${tone === "down" ? "text-destructive" : ""}`}>{value}</div>
        {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

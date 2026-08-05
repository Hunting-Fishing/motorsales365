import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Download, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/journal/$accountId")({
  head: () => ({ meta: [{ title: "Account Ledger — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: AccountLedgerPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Account Ledger</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found</div></SiteLayout>,
});

async function fetchLedger(accountId: string) {
  const { data: acct } = await (smSupabase as any).from("chart_of_accounts").select("*").eq("id", accountId).maybeSingle();
  const { data: lines } = await (smSupabase as any).from("journal_entry_lines")
    .select("id,debit,credit,description,journal_entry:journal_entries(id,entry_date,reference,memo,status,source_type,source_id)")
    .eq("account_id", accountId);
  const rows = (lines ?? []).filter((l: any) => l.journal_entry?.status !== "void");
  rows.sort((a: any, b: any) => (a.journal_entry?.entry_date ?? "").localeCompare(b.journal_entry?.entry_date ?? ""));
  return { account: acct, lines: rows };
}

function fmt(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sourceLink(src: string | null, id: string | null): { to: string; label: string } | null {
  if (!src || !id) return null;
  const s = src.toLowerCase();
  if (s.includes("invoice")) return { to: `/shop/invoices/${id}`, label: "Invoice" };
  if (s.includes("payment")) return { to: `/shop/payments`, label: "Payment" };
  if (s.includes("bill")) return { to: `/shop/bills/${id}`, label: "Bill" };
  if (s.includes("work") || s.includes("ro")) return { to: `/shop/work-orders/${id}`, label: "Work Order" };
  return { to: "#", label: src };
}

function AccountLedgerPage() {
  const { accountId } = Route.useParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "journal", accountId],
    queryFn: () => fetchLedger(accountId),
  });

  const computed = useMemo(() => {
    const all = data?.lines ?? [];
    let opening = 0;
    let periodDr = 0, periodCr = 0;
    const running: any[] = [];
    let run = 0;
    for (const l of all) {
      const d = Number(l.debit || 0), c = Number(l.credit || 0);
      const date = l.journal_entry?.entry_date ?? "";
      const beforePeriod = from && date < from;
      const afterPeriod = to && date > to;
      if (beforePeriod) {
        opening += d - c;
        continue;
      }
      if (afterPeriod) continue;
      periodDr += d; periodCr += c;
      run = (running.length === 0 ? opening : running[running.length - 1].running) + d - c;
      running.push({ ...l, running: run });
    }
    return { opening, periodDr, periodCr, net: periodDr - periodCr, closing: opening + periodDr - periodCr, rows: running };
  }, [data, from, to]);

  const exportCsv = () => {
    const header = ["Date", "Reference", "Source", "Memo", "Debit", "Credit", "Running"];
    const rows = computed.rows.map((l: any) => [
      l.journal_entry?.entry_date ?? "",
      l.journal_entry?.reference ?? "",
      l.journal_entry?.source_type ?? "",
      (l.description || l.journal_entry?.memo || "").replace(/"/g, '""'),
      Number(l.debit || 0).toFixed(2),
      Number(l.credit || 0).toFixed(2),
      Number(l.running).toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${data?.account?.code ?? accountId}-${from || "all"}-${to || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <Link to="/workspace/journal" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to General Ledger
          </Link>
        </div>
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> {data?.account?.code} — {data?.account?.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{data?.account?.account_type}</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={computed.rows.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Opening balance</div><div className="text-lg font-bold">{fmt(computed.opening)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Debits (period)</div><div className="text-lg font-bold">{fmt(computed.periodDr)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credits (period)</div><div className="text-lg font-bold">{fmt(computed.periodCr)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net (period)</div><div className={"text-lg font-bold " + (computed.net >= 0 ? "text-emerald-600" : "text-rose-600")}>{fmt(computed.net)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Closing balance</div><div className="text-lg font-bold">{fmt(computed.closing)}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Transactions {from || to ? <span className="text-xs font-normal text-muted-foreground">({from || "…"} → {to || "…"})</span> : null}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : computed.rows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No transactions in this period.</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Source</TableHead><TableHead>Memo</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Running</TableHead></TableRow></TableHeader>
                <TableBody>
                  {computed.rows.map((l: any) => {
                    const src = sourceLink(l.journal_entry?.source_type, l.journal_entry?.source_id);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">{l.journal_entry?.entry_date}</TableCell>
                        <TableCell className="text-xs font-mono">{l.journal_entry?.reference || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {src ? <Link to={src.to} className="text-primary hover:underline">{src.label}</Link> : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{l.description || l.journal_entry?.memo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{Number(l.debit) > 0 ? fmt(Number(l.debit)) : ""}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{Number(l.credit) > 0 ? fmt(Number(l.credit)) : ""}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-medium">{fmt(Number(l.running))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

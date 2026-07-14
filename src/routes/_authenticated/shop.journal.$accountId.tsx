import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/journal/$accountId")({
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

async function fetchLedger(accountId: string, from?: string, to?: string) {
  const { data: acct } = await (smSupabase as any).from("chart_of_accounts").select("*").eq("id", accountId).maybeSingle();
  let q = (smSupabase as any).from("journal_entry_lines")
    .select("id,debit,credit,description,journal_entry:journal_entries(id,entry_date,reference,memo,status)")
    .eq("account_id", accountId);
  const { data: lines } = await q;
  let rows = (lines ?? []).filter((l: any) => l.journal_entry?.status !== "void");
  if (from) rows = rows.filter((l: any) => l.journal_entry?.entry_date >= from);
  if (to) rows = rows.filter((l: any) => l.journal_entry?.entry_date <= to);
  rows.sort((a: any, b: any) => (a.journal_entry?.entry_date ?? "").localeCompare(b.journal_entry?.entry_date ?? ""));
  return { account: acct, lines: rows };
}

function AccountLedgerPage() {
  const { accountId } = Route.useParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "journal", accountId, from, to],
    queryFn: () => fetchLedger(accountId, from || undefined, to || undefined),
  });

  const totals = useMemo(() => {
    let dr = 0, cr = 0, run = 0;
    const withRun = (data?.lines ?? []).map((l: any) => {
      dr += Number(l.debit || 0); cr += Number(l.credit || 0);
      run += Number(l.debit || 0) - Number(l.credit || 0);
      return { ...l, running: run };
    });
    return { dr, cr, net: dr - cr, rows: withRun };
  }, [data]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <Link to="/shop/journal" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to General Ledger
          </Link>
        </div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> {data?.account?.code} — {data?.account?.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{data?.account?.account_type}</p>
          </div>
          <div className="flex gap-2 items-end">
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Debits</div><div className="text-xl font-bold">₱{totals.dr.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credits</div><div className="text-xl font-bold">₱{totals.cr.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net</div><div className={"text-xl font-bold " + (totals.net >= 0 ? "text-emerald-600" : "text-rose-600")}>₱{totals.net.toLocaleString()}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Transactions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div> : totals.rows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No transactions.</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Memo</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Running</TableHead></TableRow></TableHeader>
                <TableBody>
                  {totals.rows.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.journal_entry?.entry_date}</TableCell>
                      <TableCell className="text-xs font-mono">{l.journal_entry?.reference || "—"}</TableCell>
                      <TableCell className="text-xs">{l.description || l.journal_entry?.memo || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(l.debit) > 0 ? `₱${Number(l.debit).toLocaleString()}` : ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(l.credit) > 0 ? `₱${Number(l.credit).toLocaleString()}` : ""}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">₱{Number(l.running).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/journal")({
  head: () => ({ meta: [{ title: "General Ledger — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: JournalPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">General Ledger</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found.</div></SiteLayout>,
});

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

function peso(n: number) { return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function JournalPage() {
  useShopRealtime(["journal_entries", "journal_entry_lines", "chart_of_accounts"]);
  const qc = useQueryClient();
  const [openEntry, setOpenEntry] = useState(false);
  const [openAcct, setOpenAcct] = useState(false);
  const [acct, setAcct] = useState<any>({ code: "", name: "", account_type: "asset", is_active: true });
  const [entry, setEntry] = useState<any>({
    entry_date: new Date().toISOString().slice(0, 10),
    reference: "",
    memo: "",
    lines: [
      { account_id: "", description: "", debit: 0, credit: 0 },
      { account_id: "", description: "", debit: 0, credit: 0 },
    ],
  });

  const accounts = useQuery({
    queryKey: ["shop-manager", "chart_of_accounts"],
    queryFn: async () => { const { data, error } = await (smSupabase as any).from("chart_of_accounts").select("*").order("code"); if (error) throw error; return data ?? []; },
  });

  const entries = useQuery({
    queryKey: ["shop-manager", "journal_entries"],
    queryFn: async () => { const { data, error } = await (smSupabase as any).from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(200); if (error) throw error; return data ?? []; },
  });

  const lines = useQuery({
    queryKey: ["shop-manager", "journal_entry_lines", "all"],
    queryFn: async () => { const { data, error } = await (smSupabase as any).from("journal_entry_lines").select("*"); if (error) throw error; return data ?? []; },
  });

  const acctMap = useMemo(() => new Map((accounts.data ?? []).map((a: any) => [a.id, a])), [accounts.data]);
  const linesByEntry = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const l of lines.data ?? []) {
      const arr = m.get(l.journal_entry_id) ?? [];
      arr.push(l); m.set(l.journal_entry_id, arr);
    }
    return m;
  }, [lines.data]);

  // Trial balance
  const trialBalance = useMemo(() => {
    const byAcct = new Map<string, { debit: number; credit: number }>();
    for (const l of lines.data ?? []) {
      if (!l.account_id) continue;
      const cur = byAcct.get(l.account_id) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debit ?? 0); cur.credit += Number(l.credit ?? 0);
      byAcct.set(l.account_id, cur);
    }
    return Array.from(byAcct.entries()).map(([id, v]) => ({ id, account: acctMap.get(id) as any, ...v, balance: v.debit - v.credit }));
  }, [lines.data, acctMap]);

  const totalDebit = entry.lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  const createAcct = useMutation({
    mutationFn: async () => { if (!acct.name.trim() || !acct.code.trim()) throw new Error("Code & name required"); const { error } = await (smSupabase as any).from("chart_of_accounts").insert(acct); if (error) throw error; },
    onSuccess: () => { toast.success("Account added"); setOpenAcct(false); setAcct({ code: "", name: "", account_type: "asset", is_active: true }); qc.invalidateQueries({ queryKey: ["shop-manager", "chart_of_accounts"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!balanced) throw new Error("Debits must equal credits");
      const validLines = entry.lines.filter((l: any) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
      if (validLines.length < 2) throw new Error("At least 2 lines required");
      const { data: e, error } = await (smSupabase as any).from("journal_entries").insert({
        entry_date: entry.entry_date, reference: entry.reference, memo: entry.memo, status: "posted",
      }).select().single();
      if (error) throw error;
      const rows = validLines.map((l: any, i: number) => ({
        journal_entry_id: e.id,
        account_id: l.account_id,
        account_code: (acctMap.get(l.account_id) as any)?.code ?? null,
        description: l.description,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        line_order: i,
      }));
      const { error: lerr } = await (smSupabase as any).from("journal_entry_lines").insert(rows);
      if (lerr) throw lerr;
    },
    onSuccess: () => {
      toast.success("Journal entry posted"); setOpenEntry(false);
      setEntry({ entry_date: new Date().toISOString().slice(0, 10), reference: "", memo: "", lines: [{ account_id: "", description: "", debit: 0, credit: 0 }, { account_id: "", description: "", debit: 0, credit: 0 }] });
      qc.invalidateQueries({ queryKey: ["shop-manager", "journal_entries"] });
      qc.invalidateQueries({ queryKey: ["shop-manager", "journal_entry_lines", "all"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const voidEntry = useMutation({
    mutationFn: async (id: string) => { const { error } = await (smSupabase as any).from("journal_entries").update({ status: "void" }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "journal_entries"] }),
  });

  const setLine = (idx: number, patch: any) => {
    const next = [...entry.lines]; next[idx] = { ...next[idx], ...patch };
    setEntry({ ...entry, lines: next });
  };
  const addLine = () => setEntry({ ...entry, lines: [...entry.lines, { account_id: "", description: "", debit: 0, credit: 0 }] });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">General Ledger</h1>
              <p className="text-muted-foreground">Double-entry journal + chart of accounts + trial balance.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={openAcct} onOpenChange={setOpenAcct}>
              <DialogTrigger asChild><Button variant="outline">Chart of Accounts</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Code</Label><Input value={acct.code} onChange={(e) => setAcct({ ...acct, code: e.target.value })} placeholder="1000" /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={acct.account_type} onValueChange={(v) => setAcct({ ...acct, account_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Name</Label><Input value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} placeholder="Cash on hand" /></div>
                  {(accounts.data ?? []).length > 0 && (
                    <div className="pt-3 border-t max-h-40 overflow-auto">
                      <Label className="mb-2 block text-xs">Existing ({(accounts.data ?? []).length})</Label>
                      {(accounts.data ?? []).map((a: any) => (
                        <div key={a.id} className="text-xs flex justify-between py-1">
                          <span><span className="font-mono">{a.code}</span> {a.name}</span>
                          <Badge variant="outline">{a.account_type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter><Button onClick={() => createAcct.mutate()} disabled={createAcct.isPending}>Save Account</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openEntry} onOpenChange={setOpenEntry}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Entry</Button></DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Date</Label><Input type="date" value={entry.entry_date} onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })} /></div>
                    <div><Label>Reference</Label><Input value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} placeholder="JE-001" /></div>
                    <div><Label>Memo</Label><Input value={entry.memo} onChange={(e) => setEntry({ ...entry, memo: e.target.value })} /></div>
                  </div>
                  <div className="border rounded">
                    <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 text-xs font-semibold p-2 bg-muted/50">
                      <span>Account</span><span>Description</span><span>Debit</span><span>Credit</span><span></span>
                    </div>
                    {entry.lines.map((l: any, i: number) => (
                      <div key={i} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 p-2 border-t items-center">
                        <Select value={l.account_id} onValueChange={(v) => setLine(i, { account_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                          <SelectContent>{(accounts.data ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                        <Input type="number" step="0.01" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: 0 })} />
                        <Input type="number" step="0.01" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: 0 })} />
                        <Button size="sm" variant="ghost" onClick={() => setEntry({ ...entry, lines: entry.lines.filter((_: any, k: number) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <div className="p-2 border-t flex justify-between items-center bg-muted/30 text-sm">
                      <Button size="sm" variant="outline" onClick={addLine}>+ Line</Button>
                      <div className="flex gap-4 font-mono">
                        <span>Dr: {peso(totalDebit)}</span>
                        <span>Cr: {peso(totalCredit)}</span>
                        <Badge variant={balanced ? "default" : "destructive"}>{balanced ? "Balanced" : "Out of balance"}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => createEntry.mutate()} disabled={!balanced || createEntry.isPending}>Post Entry</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="entries">
          <TabsList>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="mt-4">
            {entries.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (entries.data ?? []).length === 0 ? (
              <Card><CardContent className="pt-6 text-sm text-muted-foreground">No journal entries yet. Add accounts, then post your first entry.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {(entries.data ?? []).map((e: any) => {
                  const eLines = linesByEntry.get(e.id) ?? [];
                  const tot = eLines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
                  return (
                    <Card key={e.id} className={e.status === "void" ? "opacity-60" : ""}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {e.entry_date} {e.reference && <span className="font-mono text-muted-foreground">· {e.reference}</span>}
                          <Badge variant={e.status === "posted" ? "default" : e.status === "void" ? "destructive" : "secondary"}>{e.status}</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{peso(tot)}</span>
                          {e.status !== "void" && <Button size="sm" variant="ghost" onClick={() => { if (confirm("Void this entry?")) voidEntry.mutate(e.id); }}>Void</Button>}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {e.memo && <p className="text-xs text-muted-foreground mb-2">{e.memo}</p>}
                        <div className="text-xs">
                          {eLines.sort((a, b) => a.line_order - b.line_order).map((l: any) => (
                            <div key={l.id} className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-2 py-1 border-b last:border-b-0">
                              <span className="font-mono">{(acctMap.get(l.account_id) as any)?.code ?? "—"} {(acctMap.get(l.account_id) as any)?.name ?? ""}</span>
                              <span className="text-muted-foreground truncate">{l.description}</span>
                              <span className="font-mono text-right">{Number(l.debit) > 0 ? peso(Number(l.debit)) : ""}</span>
                              <span className="font-mono text-right">{Number(l.credit) > 0 ? peso(Number(l.credit)) : ""}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trial" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Trial Balance (posted entries)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-[100px_1fr_100px_120px_120px] gap-2 text-xs font-semibold pb-2 border-b">
                  <span>Code</span><span>Account</span><span>Type</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
                </div>
                {trialBalance.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No activity.</p>
                ) : trialBalance.sort((a, b) => (a.account?.code ?? "").localeCompare(b.account?.code ?? "")).map((r) => (
                  <div key={r.id} className="grid grid-cols-[100px_1fr_100px_120px_120px] gap-2 py-1.5 border-b text-sm">
                    <span className="font-mono">{r.account?.code ?? "—"}</span>
                    <span>{r.account?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{r.account?.account_type}</span>
                    <span className="font-mono text-right">{r.balance > 0 ? peso(r.balance) : ""}</span>
                    <span className="font-mono text-right">{r.balance < 0 ? peso(-r.balance) : ""}</span>
                  </div>
                ))}
                {trialBalance.length > 0 && (
                  <div className="grid grid-cols-[100px_1fr_100px_120px_120px] gap-2 pt-2 mt-2 border-t-2 text-sm font-bold">
                    <span></span><span>Totals</span><span></span>
                    <span className="font-mono text-right">{peso(trialBalance.reduce((s, r) => s + Math.max(0, r.balance), 0))}</span>
                    <span className="font-mono text-right">{peso(trialBalance.reduce((s, r) => s + Math.max(0, -r.balance), 0))}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

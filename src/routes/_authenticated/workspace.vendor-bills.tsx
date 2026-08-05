import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/vendor-bills")({
  head: () => ({
    meta: [
      { title: "Vendor Bills — Shop Manager" },
      { name: "description", content: "Bills received from suppliers and vendors." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Vendor Bills</h1>
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
  return `₱${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BillsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "vendor-bills"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("vendor_bills")
        .select("id,bill_number,status,bill_date,due_date,total_amount,balance_due,suppliers(name)")
        .order("bill_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = q
    ? data.filter((b: any) =>
        `${b.bill_number ?? ""} ${b.suppliers?.name ?? ""} ${b.status ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      )
    : data;

  const totalOutstanding = filtered
    .filter((b: any) => !["paid", "void", "cancelled"].includes(String(b.status ?? "").toLowerCase()))
    .reduce((s: number, b: any) => s + Number(b.balance_due ?? 0), 0);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Vendor Bills</h1>
              <p className="text-muted-foreground">Track supplier invoices and what you owe.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/workspace/vendors">Vendors</Link></Button>
            <NewBillDialog />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bills…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground">
            Outstanding: <span className="font-mono text-foreground">{peso(totalOutstanding)}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No bills yet.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map((b: any) => (
              <Link key={b.id} to="/workspace/vendor-bills/$id" params={{ id: b.id }}>
                <Card className="hover:border-primary/50 transition">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                    <div>
                      <CardTitle className="text-base font-mono">{b.bill_number ?? b.id.slice(0, 8)}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">
                        {b.suppliers?.name ?? "—"} · {b.bill_date ?? "—"}
                        {b.due_date ? <> · due {b.due_date}</> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono">{peso(b.total_amount)}</div>
                        {Number(b.balance_due ?? 0) > 0 ? (
                          <div className="text-xs text-destructive">{peso(b.balance_due)} due</div>
                        ) : null}
                      </div>
                      <Badge variant="outline" className="capitalize">{b.status ?? "—"}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function NewBillDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [subtotal, setSubtotal] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [status, setStatus] = useState("open");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["shop-manager", "vendor-bills", "new", "suppliers"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("suppliers")
        .select("id,name")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sub = Number(subtotal) || 0;
  const tax = sub * ((Number(taxRate) || 0) / 100);
  const total = sub + tax;

  const create = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Pick a supplier");
      const { data: shopIdData } = await (smSupabase as any).rpc("get_current_user_shop_id");
      if (!shopIdData) throw new Error("No shop assigned to your account");
      const { error } = await (smSupabase as any).from("vendor_bills").insert({
        shop_id: shopIdData,
        supplier_id: supplierId,
        bill_number: billNumber || null,
        status,
        bill_date: billDate,
        due_date: dueDate || null,
        subtotal: sub,
        tax_rate: Number(taxRate) || 0,
        tax_amount: tax,
        total_amount: total,
        balance_due: total,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bill created");
      qc.invalidateQueries({ queryKey: ["shop-manager", "vendor-bills"] });
      setOpen(false);
      setSupplierId(""); setBillNumber(""); setDueDate(""); setSubtotal("0"); setTaxRate("0"); setStatus("open");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Bill</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New vendor bill</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Pick a supplier…" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Bill #</Label><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Bill date</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Subtotal</Label><Input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} /></div>
            <div><Label>Tax %</Label><Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
          </div>
          <div className="rounded border p-2 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{peso(sub)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{peso(tax)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono">{peso(total)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

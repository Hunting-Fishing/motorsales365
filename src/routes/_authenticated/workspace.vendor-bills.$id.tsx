import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/shop/vendor-bills/$id")({
  head: () => ({
    meta: [
      { title: "Vendor Bill — Shop Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Vendor Bill</h1>
          <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
          <Button className="mt-4" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Bill not found.</div></SiteLayout>
  ),
});

function peso(n: number) {
  return `₱${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BillDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: bill, isLoading } = useQuery({
    queryKey: ["shop-manager", "vendor-bill", id],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("vendor_bills")
        .select("id,bill_number,status,bill_date,due_date,subtotal,tax_rate,tax_amount,total_amount,balance_due,suppliers(id,name,email,phone)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["shop-manager", "vendor-bill", id, "lines"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("vendor_bill_lines")
        .select("id,description,quantity,unit_cost,total_cost")
        .eq("bill_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["shop-manager", "vendor-bill", id, "payments"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("vendor_payments")
        .select("id,payment_date,amount,payment_method,reference")
        .eq("bill_id", id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteLine = useMutation({
    mutationFn: async (lineId: string) => {
      const line = lines.find((l: any) => l.id === lineId);
      const { error } = await (smSupabase as any).from("vendor_bill_lines").delete().eq("id", lineId);
      if (error) throw error;
      if (line && bill) {
        const newSub = Number(bill.subtotal ?? 0) - Number(line.total_cost ?? 0);
        const tax = newSub * (Number(bill.tax_rate ?? 0) / 100);
        const total = newSub + tax;
        const paid = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
        await (smSupabase as any).from("vendor_bills").update({
          subtotal: newSub, tax_amount: tax, total_amount: total, balance_due: Math.max(0, total - paid),
        }).eq("id", id);
      }
    },
    onSuccess: () => {
      toast.success("Line removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", "vendor-bill", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) {
    return <SiteLayout><div className="mx-auto max-w-6xl px-4 py-10"><Loader2 className="h-4 w-4 animate-spin" /></div></SiteLayout>;
  }
  if (!bill) {
    return <SiteLayout><div className="mx-auto max-w-6xl px-4 py-10">Not found.</div></SiteLayout>;
  }

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
  const outstanding = Math.max(0, Number(bill.total_amount ?? 0) - totalPaid);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/shop/vendor-bills"><ArrowLeft className="mr-1 h-4 w-4" /> Bills</Link></Button>
            <Receipt className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold font-mono">{bill.bill_number ?? bill.id.slice(0, 8)}</h1>
              <div className="text-sm text-muted-foreground">
                {bill.suppliers?.name ?? "—"} · {bill.bill_date}
                {bill.due_date ? <> · due {bill.due_date}</> : null}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="capitalize">{bill.status}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Line items</CardTitle>
              <AddLineDialog billId={id} bill={bill} payments={payments} />
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No line items yet.</div>
              ) : (
                <div className="divide-y">
                  {lines.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex-1">
                        <div>{l.description ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.quantity} × {peso(l.unit_cost)}</div>
                      </div>
                      <div className="font-mono mr-3">{peso(l.total_cost)}</div>
                      <Button size="icon" variant="ghost" onClick={() => deleteLine.mutate(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{peso(bill.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({bill.tax_rate ?? 0}%)</span><span className="font-mono">{peso(bill.tax_amount)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono">{peso(bill.total_amount)}</span></div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Paid</span><span className="font-mono">{peso(totalPaid)}</span></div>
              <div className="flex justify-between font-semibold"><span>Outstanding</span><span className="font-mono">{peso(outstanding)}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Payments</CardTitle>
            <RecordPaymentDialog billId={id} bill={bill} outstanding={outstanding} />
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No payments recorded.</div>
            ) : (
              <div className="divide-y">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div>{p.payment_date} · <span className="capitalize">{p.payment_method ?? "—"}</span></div>
                      {p.reference ? <div className="text-xs text-muted-foreground">Ref: {p.reference}</div> : null}
                    </div>
                    <div className="font-mono">{peso(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

function AddLineDialog({ billId, bill, payments }: { billId: string; bill: any; payments: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");

  const create = useMutation({
    mutationFn: async () => {
      const qty = Number(quantity) || 0;
      const cost = Number(unitCost) || 0;
      const line_total = qty * cost;
      const { error } = await (smSupabase as any).from("vendor_bill_lines").insert({
        bill_id: billId,
        description,
        quantity: qty,
        unit_cost: cost,
        total_cost: line_total,
      });
      if (error) throw error;
      const newSub = Number(bill.subtotal ?? 0) + line_total;
      const tax = newSub * (Number(bill.tax_rate ?? 0) / 100);
      const total = newSub + tax;
      const paid = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
      await (smSupabase as any).from("vendor_bills").update({
        subtotal: newSub, tax_amount: tax, total_amount: total, balance_due: Math.max(0, total - paid),
      }).eq("id", billId);
    },
    onSuccess: () => {
      toast.success("Line added");
      qc.invalidateQueries({ queryKey: ["shop-manager", "vendor-bill", billId] });
      setOpen(false);
      setDescription(""); setQuantity("1"); setUnitCost("0");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Add line</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add line item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantity</Label><Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div><Label>Unit cost</Label><Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></div>
          </div>
          <div className="text-sm text-right font-mono">Total: {peso((Number(quantity) || 0) * (Number(unitCost) || 0))}</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ billId, bill, outstanding }: { billId: string; bill: any; outstanding: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(outstanding.toFixed(2)));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: async () => {
      const amt = Number(amount) || 0;
      if (amt <= 0) throw new Error("Amount must be > 0");
      const { data: shopIdData } = await (smSupabase as any).rpc("get_current_user_shop_id");
      const { error } = await (smSupabase as any).from("vendor_payments").insert({
        shop_id: shopIdData,
        supplier_id: bill.suppliers?.id,
        bill_id: billId,
        payment_date: payDate,
        amount: amt,
        payment_method: method,
        reference: reference || null,
      });
      if (error) throw error;
      const newBalance = Math.max(0, Number(bill.total_amount ?? 0) - (Number(bill.total_amount ?? 0) - outstanding) - amt);
      const newStatus = newBalance <= 0 ? "paid" : "partial";
      await (smSupabase as any).from("vendor_bills").update({
        balance_due: newBalance, status: newStatus,
      }).eq("id", billId);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["shop-manager", "vendor-bill", billId] });
      qc.invalidateQueries({ queryKey: ["shop-manager", "vendor-bills"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setAmount(String(outstanding.toFixed(2))); }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={outstanding <= 0}><Plus className="mr-1 h-4 w-4" /> Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          </div>
          <div className="text-xs text-muted-foreground">Outstanding: <span className="font-mono">{peso(outstanding)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving…" : "Save payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

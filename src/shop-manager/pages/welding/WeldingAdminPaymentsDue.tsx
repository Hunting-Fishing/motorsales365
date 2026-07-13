import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import { useWeldingSettings } from "@/contexts/WeldingSettingsContext";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Search } from "lucide-react";
import { toast } from "sonner";

const WeldingAdminPaymentsDue = () => {
  const { shopId } = useShopId();
  const { formatCurrency } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_method: "cash", notes: "" });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["welding-payments-due", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_invoices" as any).select("*").eq("shop_id", shopId).neq("status", "paid").order("due_date");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await supabase.from("welding_payments" as any).insert({
        invoice_id: selected.id, amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method, notes: paymentForm.notes || null,
      });
      const newPaid = Number(selected.amount_paid || 0) + Number(paymentForm.amount);
      const newStatus = newPaid >= Number(selected.total) ? "paid" : "partial";
      await supabase.from("welding_invoices" as any).update({ amount_paid: newPaid, status: newStatus }).eq("id", selected.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-payments-due"] }); queryClient.invalidateQueries({ queryKey: ["welding-invoices"] }); toast.success("Payment recorded"); setPaymentOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalOutstanding = invoices.reduce((t: number, inv: any) => t + (Number(inv.total) - Number(inv.amount_paid || 0)), 0);
  const filtered = invoices.filter((inv: any) => !search || (inv.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <WeldingAdminLayout>
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Payments Due</h1>
      <Card className="mb-4"><CardContent className="py-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-destructive" /><div><p className="text-sm text-muted-foreground">Total Outstanding</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></div><Badge className="ml-auto">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</Badge></CardContent></Card>

      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No outstanding payments</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inv: any) => {
            const balance = Number(inv.total) - Number(inv.amount_paid || 0);
            const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
            return (
              <Card key={inv.id} className={`${isOverdue ? "border-destructive/50" : ""}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="font-semibold text-sm">{inv.invoice_number || "Draft"}</span><Badge variant={isOverdue ? "destructive" : "secondary"}>{isOverdue ? "Overdue" : inv.status}</Badge></div>
                    <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                    {inv.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right"><p className="font-bold text-destructive">{formatCurrency(balance)}</p><p className="text-xs text-muted-foreground">of {formatCurrency(Number(inv.total))}</p></div>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(inv); setPaymentForm({ amount: balance, payment_method: "cash", notes: "" }); setPaymentOpen(true); }}>Pay</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); paymentMutation.mutate(); }} className="space-y-4">
            <div><Label>Amount</Label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></div>
            <div><Label>Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="etransfer">E-Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button><Button type="submit" disabled={paymentMutation.isPending}>Save</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminPaymentsDue;

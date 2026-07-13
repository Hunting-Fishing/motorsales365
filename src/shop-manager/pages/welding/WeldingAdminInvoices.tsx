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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
};

const emptyInvoice = {
  customer_name: "", customer_email: "", customer_id: null as string | null,
  status: "draft", subtotal: 0, tax_rate: 0, tax: 0, total: 0, amount_paid: 0,
  due_date: "", notes: "", quote_id: null as string | null,
};
const emptyItem = { description: "", quantity: 1, unit_price: 0, total: 0 };

const WeldingAdminInvoices = () => {
  const { shopId } = useShopId();
  const { formatCurrency, settings } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyInvoice });
  const [items, setItems] = useState<any[]>([{ ...emptyItem }]);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_method: "cash", notes: "" });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["welding-invoices", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_invoices" as any).select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!shopId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["welding-customers-list", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data } = await supabase.from("welding_customers" as any).select("id, first_name, last_name, email, company").eq("shop_id", shopId).order("first_name");
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const recalc = (lineItems: any[], taxRate: number) => {
    const subtotal = lineItems.reduce((t, item) => t + (Number(item.quantity) * Number(item.unit_price)), 0);
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const saveMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const taxRate = Number(invoiceData.tax_rate || settings.default_tax_rate || 0);
      const calcs = recalc(items, taxRate);
      const payload = {
        shop_id: shopId,
        customer_name: invoiceData.customer_name,
        customer_email: invoiceData.customer_email,
        customer_id: invoiceData.customer_id || null,
        quote_id: invoiceData.quote_id || null,
        status: invoiceData.status,
        tax_rate: taxRate,
        ...calcs,
        amount_paid: Number(invoiceData.amount_paid || 0),
        due_date: invoiceData.due_date || null,
        notes: invoiceData.notes || null,
        invoice_number: invoiceData.invoice_number || "",
      };

      if (editing) {
        const { data, error } = await supabase.from("welding_invoices" as any).update(payload).eq("id", editing.id).select().single();
        if (error) throw error;
        await supabase.from("welding_invoice_items" as any).delete().eq("invoice_id", editing.id);
        if (items.length > 0) {
          const its = items.map((it, i) => ({
            invoice_id: editing.id,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total: Number(it.quantity) * Number(it.unit_price),
            sort_order: i,
          }));
          await supabase.from("welding_invoice_items" as any).insert(its);
        }
        return data;
      } else {
        const { data, error } = await supabase.from("welding_invoices" as any).insert(payload).select().single();
        if (error) throw error;
        if (items.length > 0) {
          const its = items.map((it, i) => ({
            invoice_id: (data as any).id,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total: Number(it.quantity) * Number(it.unit_price),
            sort_order: i,
          }));
          await supabase.from("welding_invoice_items" as any).insert(its);
        }
        return data;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-invoices"] }); toast.success(editing ? "Invoice updated" : "Invoice created"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("welding_payments" as any).insert({
        invoice_id: editing.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes || null,
      });
      if (error) throw error;
      const newPaid = Number(editing.amount_paid || 0) + Number(paymentForm.amount);
      const newStatus = newPaid >= Number(editing.total) ? "paid" : "partial";
      await supabase.from("welding_invoices" as any).update({ amount_paid: newPaid, status: newStatus }).eq("id", editing.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-invoices"] }); toast.success("Payment recorded"); setPaymentOpen(false); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("welding_invoice_items" as any).delete().eq("invoice_id", id);
      await supabase.from("welding_payments" as any).delete().eq("invoice_id", id);
      const { error } = await supabase.from("welding_invoices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-invoices"] }); toast.success("Invoice deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = async (inv: any) => {
    setEditing(inv);
    setForm({ ...emptyInvoice, ...inv });
    const { data } = await supabase.from("welding_invoice_items" as any).select("*").eq("invoice_id", inv.id).order("sort_order");
    setItems(data?.length ? data : [{ ...emptyItem }]);
    setOpen(true);
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyInvoice, tax_rate: settings.default_tax_rate || 0 }); setItems([{ ...emptyItem }]); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyInvoice }); setItems([{ ...emptyItem }]); };

  const selectCustomer = (custId: string) => {
    const c = customers.find((c: any) => c.id === custId);
    if (c) setForm((f: any) => ({ ...f, customer_id: c.id, customer_name: `${c.first_name} ${c.last_name}`, customer_email: c.email || "" }));
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const updateItem = (i: number, field: string, val: any) => { const its = [...items]; its[i] = { ...its[i], [field]: val }; setItems(its); };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const filtered = invoices.filter((inv: any) => {
    const matchSearch = !search || (inv.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Invoices</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No invoices found</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inv: any) => {
            const balance = Number(inv.total || 0) - Number(inv.amount_paid || 0);
            return (
              <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(inv)}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{inv.invoice_number || "Draft"}</span>
                      <Badge className={STATUS_COLORS[inv.status] || "bg-muted"}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{inv.customer_name || "No customer"}</p>
                    {inv.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{formatCurrency(Number(inv.total) || 0)}</p>
                    {balance > 0 && <p className="text-xs text-destructive">Balance: {formatCurrency(balance)}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div>
              <Label>Customer</Label>
              <Select onValueChange={selectCustomer} value={form.customer_id || ""}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

            <div>
              <div className="flex items-center justify-between mb-2"><Label className="text-base font-semibold">Line Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-5"><Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} /></div>
                  <div className="col-span-3"><Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} /></div>
                  <div className="col-span-2 flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex gap-2">
                {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
                {editing && editing.status !== "paid" && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setPaymentForm({ amount: Number(editing.total) - Number(editing.amount_paid), payment_method: "cash", notes: "" }); setPaymentOpen(true); }}>
                    <DollarSign className="h-3 w-3 mr-1" />Record Payment
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); paymentMutation.mutate(); }} className="space-y-4">
            <div><Label>Amount</Label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></div>
            <div><Label>Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem>
                  <SelectItem value="etransfer">E-Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={paymentMutation.isPending}>Save Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminInvoices;

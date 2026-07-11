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
import { Plus, Search, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = { draft: "bg-gray-100 text-gray-800", ordered: "bg-blue-100 text-blue-800", received: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
const emptyPO = { vendor_name: "", vendor_id: null as string | null, status: "draft", expected_date: "", notes: "" };
const emptyItem = { description: "", quantity: 1, unit_price: 0 };

const WeldingAdminPurchaseOrders = () => {
  const { shopId } = useShopId();
  const { formatCurrency } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyPO });
  const [items, setItems] = useState<any[]>([{ ...emptyItem }]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["welding-po", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_purchase_orders" as any).select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["welding-vendors", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data } = await supabase.from("welding_vendors" as any).select("*").eq("shop_id", shopId).order("name");
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const total = items.reduce((t, it) => t + Number(it.quantity) * Number(it.unit_price), 0);
      const payload = { shop_id: shopId, vendor_name: d.vendor_name, vendor_id: d.vendor_id || null, status: d.status, total, expected_date: d.expected_date || null, notes: d.notes || null, po_number: d.po_number || "" };
      if (editing) {
        const { error } = await supabase.from("welding_purchase_orders" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("welding_purchase_order_items" as any).delete().eq("purchase_order_id", editing.id);
        if (items.length) { await supabase.from("welding_purchase_order_items" as any).insert(items.map(it => ({ purchase_order_id: editing.id, description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total: Number(it.quantity) * Number(it.unit_price) }))); }
      } else {
        const { data, error } = await supabase.from("welding_purchase_orders" as any).insert(payload).select().single();
        if (error) throw error;
        const poId = (data as any).id;
        if (items.length) { await supabase.from("welding_purchase_order_items" as any).insert(items.map(it => ({ purchase_order_id: poId, description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total: Number(it.quantity) * Number(it.unit_price) }))); }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-po"] }); toast.success(editing ? "PO updated" : "PO created"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("welding_purchase_order_items" as any).delete().eq("purchase_order_id", id);
      const { error } = await supabase.from("welding_purchase_orders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-po"] }); toast.success("PO deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = async (po: any) => {
    setEditing(po); setForm({ ...emptyPO, ...po });
    const { data } = await supabase.from("welding_purchase_order_items" as any).select("*").eq("purchase_order_id", po.id);
    setItems(data?.length ? (data as any[]) : [{ ...emptyItem }]);
    setOpen(true);
  };
  const openNew = () => { setEditing(null); setForm({ ...emptyPO }); setItems([{ ...emptyItem }]); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyPO }); setItems([{ ...emptyItem }]); };
  const selectVendor = (vid: string) => { const v = vendors.find((v: any) => v.id === vid); if (v) setForm((f: any) => ({ ...f, vendor_id: v.id, vendor_name: v.name })); };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const updateItem = (i: number, f: string, v: any) => { const its = [...items]; its[i] = { ...its[i], [f]: v }; setItems(its); };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const filtered = orders.filter((po: any) => {
    const matchSearch = !search || (po.vendor_name || "").toLowerCase().includes(search.toLowerCase()) || (po.po_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Purchase Orders</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New PO</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="ordered">Ordered</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No purchase orders</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">{filtered.map((po: any) => (
          <Card key={po.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(po)}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-sm">{po.po_number || "Draft"}</span><Badge className={STATUS_COLORS[po.status] || "bg-muted"}>{po.status}</Badge></div><p className="text-sm text-muted-foreground">{po.vendor_name}</p>{po.expected_date && <p className="text-xs text-muted-foreground">Expected: {new Date(po.expected_date).toLocaleDateString()}</p>}</div>
              <p className="font-bold shrink-0">{formatCurrency(Number(po.total))}</p>
            </CardContent>
          </Card>
        ))}</div>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit PO" : "New Purchase Order"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Vendor</Label><Select onValueChange={selectVendor} value={form.vendor_id || ""}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ordered">Ordered</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
              <div><Label>Expected Date</Label><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label className="text-base font-semibold">Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
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
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
              <div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminPurchaseOrders;

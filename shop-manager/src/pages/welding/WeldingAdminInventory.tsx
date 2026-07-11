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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Warehouse, ChevronDown, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const emptyItem = {
  name: "", category: "", specifications: "", quantity: 0, unit: "pcs",
  min_quantity: 0, location: "", cost_per_unit: 0, sell_price: 0,
};

const WeldingAdminInventory = () => {
  const { shopId } = useShopId();
  const { formatCurrency } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyItem });
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ quantity: 0, unit_price: 0, vendor: "", notes: "" });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["welding-inventory", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_inventory" as any).select("*").eq("shop_id", shopId).order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!shopId,
  });

  const categories = [...new Set(inventory.map((i: any) => i.category).filter(Boolean))];

  const saveMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const payload = {
        shop_id: shopId, name: itemData.name, category: itemData.category || null,
        specifications: itemData.specifications || null, quantity: Number(itemData.quantity),
        unit: itemData.unit || "pcs", min_quantity: Number(itemData.min_quantity),
        location: itemData.location || null, cost_per_unit: Number(itemData.cost_per_unit),
        sell_price: Number(itemData.sell_price),
      };
      if (editing) {
        const { error } = await supabase.from("welding_inventory" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("welding_inventory" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-inventory"] }); toast.success(editing ? "Item updated" : "Item added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("welding_inventory_purchase_history" as any).delete().eq("inventory_item_id", id);
      const { error } = await supabase.from("welding_inventory" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-inventory"] }); toast.success("Item deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("welding_inventory_purchase_history" as any).insert({
        inventory_item_id: editing.id,
        quantity: Number(newPurchase.quantity),
        unit_price: Number(newPurchase.unit_price),
        vendor: newPurchase.vendor || null,
        notes: newPurchase.notes || null,
      });
      if (error) throw error;
      // Update inventory quantity
      const newQty = Number(editing.quantity) + Number(newPurchase.quantity);
      await supabase.from("welding_inventory" as any).update({ quantity: newQty }).eq("id", editing.id);
      setEditing({ ...editing, quantity: newQty });
      setForm((f: any) => ({ ...f, quantity: newQty }));
      const { data } = await supabase.from("welding_inventory_purchase_history" as any).select("*").eq("inventory_item_id", editing.id).order("purchase_date", { ascending: false });
      setPurchaseHistory(data || []);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-inventory"] }); toast.success("Purchase recorded"); setNewPurchase({ quantity: 0, unit_price: 0, vendor: "", notes: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = async (item: any) => {
    setEditing(item);
    setForm({ ...emptyItem, ...item });
    const { data } = await supabase.from("welding_inventory_purchase_history" as any).select("*").eq("inventory_item_id", item.id).order("purchase_date", { ascending: false });
    setPurchaseHistory(data || []);
    setOpen(true);
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyItem }); setPurchaseHistory([]); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyItem }); setPurchaseHistory([]); setHistoryOpen(false); };

  const filtered = inventory.filter((item: any) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.category || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Inventory</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {categories.length > 0 && (
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat) => <option key={cat as string} value={cat as string}>{cat as string}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No inventory items</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item: any) => {
            const isLow = Number(item.quantity) <= Number(item.min_quantity) && Number(item.min_quantity) > 0;
            return (
              <Card key={item.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isLow ? "border-destructive/50" : ""}`} onClick={() => openEdit(item)}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{item.name}</span>
                      {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                      {isLow && <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Low Stock</Badge>}
                    </div>
                    {item.specifications && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.specifications}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{Number(item.quantity)} {item.unit}</p>
                    <p className="text-xs text-muted-foreground">Cost: {formatCurrency(Number(item.cost_per_unit))} / Sell: {formatCurrency(Number(item.sell_price))}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Steel, Consumables" /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, ft, kg" /></div>
              <div><Label>Min Quantity</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Cost/Unit</Label><Input type="number" step="0.01" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} /></div>
              <div><Label>Sell Price</Label><Input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} /></div>
            </div>
            <div><Label>Specifications</Label><Textarea value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })} rows={2} /></div>

            {editing && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between"><span>Purchase History ({purchaseHistory.length})</span><ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} /></Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input type="number" placeholder="Qty" value={newPurchase.quantity || ""} onChange={(e) => setNewPurchase({ ...newPurchase, quantity: Number(e.target.value) })} />
                    <Input type="number" placeholder="Unit Price" value={newPurchase.unit_price || ""} onChange={(e) => setNewPurchase({ ...newPurchase, unit_price: Number(e.target.value) })} />
                    <Input placeholder="Vendor" value={newPurchase.vendor} onChange={(e) => setNewPurchase({ ...newPurchase, vendor: e.target.value })} />
                    <Button type="button" size="sm" onClick={() => addPurchaseMutation.mutate()} disabled={!newPurchase.quantity}>Record</Button>
                  </div>
                  {purchaseHistory.map((ph: any) => (
                    <div key={ph.id} className="text-sm border rounded-md p-2 flex justify-between">
                      <div>
                        <span className="font-medium">{Number(ph.quantity)} × {formatCurrency(Number(ph.unit_price))}</span>
                        {ph.vendor && <span className="text-muted-foreground ml-2">from {ph.vendor}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(ph.purchase_date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminInventory;

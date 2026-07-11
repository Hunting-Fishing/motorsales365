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
import { Plus, Search, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = { pending: "bg-amber-100 text-amber-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800" };

const emptyAP = { vendor_name: "", vendor_id: null as string | null, description: "", amount: 0, amount_paid: 0, status: "pending", due_date: "", notes: "" };

const WeldingAdminAccountsPayable = () => {
  const { shopId } = useShopId();
  const { formatCurrency } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyAP });

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["welding-ap", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_accounts_payable" as any).select("*").eq("shop_id", shopId).order("due_date");
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
      const payload = { shop_id: shopId, vendor_name: d.vendor_name, vendor_id: d.vendor_id || null, description: d.description, amount: Number(d.amount), amount_paid: Number(d.amount_paid), status: d.status, due_date: d.due_date || null, notes: d.notes || null };
      if (editing) { const { error } = await supabase.from("welding_accounts_payable" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_accounts_payable" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-ap"] }); toast.success(editing ? "Updated" : "Added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_accounts_payable" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-ap"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (ap: any) => { setEditing(ap); setForm({ ...emptyAP, ...ap }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...emptyAP }); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyAP }); };

  const selectVendor = (vid: string) => { const v = vendors.find((v: any) => v.id === vid); if (v) setForm((f: any) => ({ ...f, vendor_id: v.id, vendor_name: v.name })); };

  const filtered = payables.filter((ap: any) => {
    const matchSearch = !search || (ap.vendor_name || "").toLowerCase().includes(search.toLowerCase()) || (ap.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || ap.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Accounts Payable</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Payable</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No payables found</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">{filtered.map((ap: any) => {
          const balance = Number(ap.amount) - Number(ap.amount_paid || 0);
          return (
            <Card key={ap.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(ap)}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold">{ap.vendor_name || "Unknown"}</span><Badge className={STATUS_COLORS[ap.status] || "bg-muted"}>{ap.status}</Badge></div><p className="text-sm text-muted-foreground truncate">{ap.description}</p>{ap.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(ap.due_date).toLocaleDateString()}</p>}</div>
                <div className="text-right shrink-0"><p className="font-bold">{formatCurrency(balance)}</p><p className="text-xs text-muted-foreground">of {formatCurrency(Number(ap.amount))}</p></div>
              </CardContent>
            </Card>);
        })}</div>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Payable" : "Add Payable"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Vendor</Label><Select onValueChange={selectVendor} value={form.vendor_id || ""}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Amount Paid</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

export default WeldingAdminAccountsPayable;

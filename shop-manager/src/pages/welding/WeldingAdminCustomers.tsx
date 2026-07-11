import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Users, ChevronDown, Trash2, Phone, Mail, Building } from "lucide-react";
import { toast } from "sonner";

const emptyCustomer = {
  first_name: "", last_name: "", email: "", phone: "", company: "",
  address: "", city: "", province: "", postal_code: "", area_code: "",
  status: "active", notes: "",
};

const WeldingAdminCustomers = () => {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyCustomer });
  const [interactions, setInteractions] = useState<any[]>([]);
  const [newInteraction, setNewInteraction] = useState({ interaction_type: "call", description: "" });
  const [interactionsOpen, setInteractionsOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["welding-customers", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_customers" as any).select("*").eq("shop_id", shopId).order("first_name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (custData: any) => {
      const payload = { ...custData, shop_id: shopId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (editing) {
        const { error } = await supabase.from("welding_customers" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("welding_customers" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-customers"] }); toast.success(editing ? "Customer updated" : "Customer added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("welding_customer_interactions" as any).delete().eq("customer_id", id);
      const { error } = await supabase.from("welding_customers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-customers"] }); toast.success("Customer deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addInteractionMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("welding_customer_interactions" as any).insert({
        customer_id: editing.id,
        interaction_type: newInteraction.interaction_type,
        description: newInteraction.description,
      });
      if (error) throw error;
      const { data } = await supabase.from("welding_customer_interactions" as any).select("*").eq("customer_id", editing.id).order("interaction_date", { ascending: false });
      setInteractions(data || []);
    },
    onSuccess: () => { toast.success("Interaction logged"); setNewInteraction({ interaction_type: "call", description: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = async (cust: any) => {
    setEditing(cust);
    setForm({ ...emptyCustomer, ...cust });
    const { data } = await supabase.from("welding_customer_interactions" as any).select("*").eq("customer_id", cust.id).order("interaction_date", { ascending: false });
    setInteractions(data || []);
    setOpen(true);
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyCustomer }); setInteractions([]); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyCustomer }); setInteractions([]); setInteractionsOpen(false); };

  const filtered = customers.filter((c: any) => {
    const name = `${c.first_name} ${c.last_name} ${c.company || ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Customers</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No customers found</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(c)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.first_name} {c.last_name}</span>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    {c.company && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Building className="h-3 w-3" />{c.company}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Last Name *</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="lead">Lead</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Province</Label><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
              <div><Label>Postal Code</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

            {editing && (
              <Collapsible open={interactionsOpen} onOpenChange={setInteractionsOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between"><span>Interactions ({interactions.length})</span><ChevronDown className={`h-4 w-4 transition-transform ${interactionsOpen ? "rotate-180" : ""}`} /></Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <Select value={newInteraction.interaction_type} onValueChange={(v) => setNewInteraction({ ...newInteraction, interaction_type: v })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Description" value={newInteraction.description} onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })} className="flex-1" />
                    <Button type="button" size="sm" onClick={() => addInteractionMutation.mutate()} disabled={!newInteraction.description}>Add</Button>
                  </div>
                  {interactions.map((int: any) => (
                    <div key={int.id} className="text-sm border rounded-md p-2">
                      <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{int.interaction_type}</Badge><span className="text-xs text-muted-foreground">{new Date(int.interaction_date).toLocaleString()}</span></div>
                      <p className="mt-1">{int.description}</p>
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

export default WeldingAdminCustomers;

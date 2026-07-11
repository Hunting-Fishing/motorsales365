import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import { useWeldingSettings } from "@/contexts/WeldingSettingsContext";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, FileText, Send, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import WeldingQuoteHistory from "@/components/welding/WeldingQuoteHistory";
import WeldingPhotoMeasureDialog from "@/components/welding/WeldingPhotoMeasureDialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-amber-100 text-amber-800",
  quoted: "bg-cyan-100 text-cyan-800",
  sent: "bg-indigo-100 text-indigo-800",
  approved: "bg-green-100 text-green-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  declined: "bg-red-100 text-red-800",
};

const APPROVAL_FLOW = ["draft", "sent", "approved", "rejected"] as const;

const emptyQuote = {
  customer_name: "", customer_email: "", customer_phone: "",
  project_type: "", description: "", timeline: "",
  labour_hours: 0, labour_rate: 0, travel_distance: 0, travel_cost: 0,
  tax_rate: 0, address: "", city: "", province: "", postal_code: "", notes: "",
  status: "draft", valid_until: "",
};

const emptyMaterial = { name: "", category: "", quantity: 1, cost_price: 0, sell_price: 0, measurements: "", notes: "" };

const WeldingAdminQuotes = () => {
  const { shopId } = useShopId();
  const { formatCurrency, settings } = useWeldingSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyQuote });
  const [materials, setMaterials] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["welding-quotes", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_quotes" as any).select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!shopId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["welding-customers-list", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data } = await supabase.from("welding_customers" as any).select("id, first_name, last_name, email, phone, company").eq("shop_id", shopId).order("first_name");
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const materialsTotal = materials.reduce((t: number, m: any) => t + (m.quantity * m.sell_price), 0);
      const labourTotal = quoteData.labour_hours * quoteData.labour_rate;
      const subtotal = materialsTotal + labourTotal + Number(quoteData.travel_cost || 0);
      const taxRate = Number(quoteData.tax_rate || settings.default_tax_rate || 0);
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax;

      const payload = {
        ...quoteData,
        shop_id: shopId,
        subtotal, tax, total, tax_rate: taxRate,
        estimated_amount: total,
        labour_hours: Number(quoteData.labour_hours),
        labour_rate: Number(quoteData.labour_rate),
        travel_distance: Number(quoteData.travel_distance),
        travel_cost: Number(quoteData.travel_cost),
        valid_until: quoteData.valid_until || null,
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (editing) {
        const { data, error } = await supabase.from("welding_quotes" as any).update(payload).eq("id", editing.id).select().single();
        if (error) throw error;
        // Update materials
        await supabase.from("welding_quote_materials" as any).delete().eq("quote_id", editing.id);
        if (materials.length > 0) {
          const mats = materials.map((m, i) => ({ ...m, quote_id: editing.id, sort_order: i, quantity: Number(m.quantity), cost_price: Number(m.cost_price), sell_price: Number(m.sell_price) }));
          mats.forEach((m: any) => { delete m.id; delete m.created_at; });
          await supabase.from("welding_quote_materials" as any).insert(mats);
        }
        return data;
      } else {
        const { data, error } = await supabase.from("welding_quotes" as any).insert(payload).select().single();
        if (error) throw error;
        if (materials.length > 0) {
          const mats = materials.map((m, i) => ({ ...m, quote_id: (data as any).id, sort_order: i, quantity: Number(m.quantity), cost_price: Number(m.cost_price), sell_price: Number(m.sell_price) }));
          mats.forEach((m: any) => { delete m.id; delete m.created_at; });
          await supabase.from("welding_quote_materials" as any).insert(mats);
        }
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welding-quotes"] });
      toast.success(editing ? "Quote updated" : "Quote created");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("welding_quote_materials" as any).delete().eq("quote_id", id);
      const { error } = await supabase.from("welding_quotes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welding-quotes"] });
      toast.success("Quote deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const patch: any = { status };
      if (status === "rejected" && reason) patch.rejection_reason = reason;
      const { error } = await supabase.from("welding_quotes" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["welding-quotes"] });
      toast.success(`Quote marked ${vars.status}`);
      if (editing?.id === vars.id) loadHistory(vars.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const loadHistory = async (quoteId: string) => {
    const { data } = await supabase
      .from("welding_quote_history" as any)
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });
    setHistory((data as any[]) || []);
  };

  const openEdit = async (quote: any) => {
    setEditing(quote);
    setForm({ ...emptyQuote, ...quote });
    const { data } = await supabase.from("welding_quote_materials" as any).select("*").eq("quote_id", quote.id).order("sort_order");
    setMaterials(data || []);
    setShowHistory(false);
    loadHistory(quote.id);
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyQuote, tax_rate: settings.default_tax_rate || 0 });
    setMaterials([]);
    setHistory([]);
    setShowHistory(false);
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyQuote }); setMaterials([]); setHistory([]); setShowHistory(false); };

  const advanceStatus = (e: React.MouseEvent, quote: any, next: string) => {
    e.stopPropagation();
    if (next === "rejected") {
      const reason = window.prompt("Reason for rejection (optional):") || undefined;
      statusMutation.mutate({ id: quote.id, status: next, reason });
    } else {
      statusMutation.mutate({ id: quote.id, status: next });
    }
  };

  const selectCustomer = (custId: string) => {
    const c = customers.find((c: any) => c.id === custId);
    if (c) setForm((f: any) => ({ ...f, customer_id: c.id, customer_name: `${c.first_name} ${c.last_name}`, customer_email: c.email || "", customer_phone: c.phone || "" }));
  };

  const addMaterial = () => setMaterials([...materials, { ...emptyMaterial }]);
  const updateMaterial = (i: number, field: string, val: any) => { const m = [...materials]; m[i] = { ...m[i], [field]: val }; setMaterials(m); };
  const removeMaterial = (i: number) => setMaterials(materials.filter((_, idx) => idx !== i));

  const filtered = quotes.filter((q: any) => {
    const matchSearch = !search || (q.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (q.quote_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Quotes</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Quote</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Loading quotes...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No quotes found</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((q: any) => (
            <Card key={q.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(q)}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{q.quote_number || "Draft"}</span>
                    <Badge className={STATUS_COLORS[q.status] || "bg-muted"}>{q.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{q.customer_name || "No customer"}</p>
                  {q.project_type && <p className="text-xs text-muted-foreground">{q.project_type}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(Number(q.total) || 0)}</p>
                    <p className="text-xs text-muted-foreground">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ""}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {(q.status === "draft" || q.status === "new") && (
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={(e) => advanceStatus(e, q, "sent")}>
                        <Send className="h-3 w-3 mr-1" />Send
                      </Button>
                    )}
                    {(q.status === "sent" || q.status === "quoted" || q.status === "reviewed") && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-green-700" onClick={(e) => advanceStatus(e, q, "approved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={(e) => advanceStatus(e, q, "rejected")}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Quote" : "New Quote"}</DialogTitle><DialogDescription>Fill in the details below to {editing ? "update this" : "create a new"} quote.</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            {/* Customer */}
            <div>
              <Label>Customer</Label>
              <Select onValueChange={selectCustomer} value={form.customer_id || ""}>
                <SelectTrigger><SelectValue placeholder="Select or type below" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.company ? `(${c.company})` : ""}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Project Type</Label><Input value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} placeholder="e.g. Railings, Gate, Repair" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label>Labour Hrs</Label><Input type="number" value={form.labour_hours} onChange={(e) => setForm({ ...form, labour_hours: e.target.value })} /></div>
              <div><Label>Labour Rate</Label><Input type="number" value={form.labour_rate} onChange={(e) => setForm({ ...form, labour_rate: e.target.value })} /></div>
              <div><Label>Travel (km)</Label><Input type="number" value={form.travel_distance} onChange={(e) => setForm({ ...form, travel_distance: e.target.value })} /></div>
              <div><Label>Travel Cost</Label><Input type="number" value={form.travel_cost} onChange={(e) => setForm({ ...form, travel_cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            </div>
            {form.status === "rejected" && (
              <div><Label>Rejection Reason</Label><Textarea value={form.rejection_reason || ""} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} rows={2} placeholder="Why was this quote rejected?" /></div>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

            {editing && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <Label className="text-base font-semibold">Approval Workflow</Label>
                  <div className="flex gap-1 flex-wrap">
                    <Button type="button" size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: editing.id, status: "sent" })} disabled={form.status === "sent"}>
                      <Send className="h-3 w-3 mr-1" />Send
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-green-700" onClick={() => statusMutation.mutate({ id: editing.id, status: "approved" })} disabled={form.status === "approved"}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => {
                      const reason = window.prompt("Reason for rejection (optional):") || undefined;
                      statusMutation.mutate({ id: editing.id, status: "rejected", reason });
                    }} disabled={form.status === "rejected"}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                  <div>Sent: {editing.sent_at ? new Date(editing.sent_at).toLocaleString() : "—"}</div>
                  <div>Approved: {editing.approved_at ? new Date(editing.approved_at).toLocaleString() : "—"}</div>
                  <div>Rejected: {editing.rejected_at ? new Date(editing.rejected_at).toLocaleString() : "—"}</div>
                </div>
                <WeldingQuoteHistory history={history} showHistory={showHistory} onToggle={() => setShowHistory(!showHistory)} />
              </div>
            )}

            {/* Materials */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <Label className="text-base font-semibold">Materials</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPhotoOpen(true)}>
                    <Sparkles className="h-3 w-3 mr-1" />AI Photo Measure
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              </div>
              {materials.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-4"><Input placeholder="Name" value={m.name} onChange={(e) => updateMaterial(i, "name", e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" value={m.quantity} onChange={(e) => updateMaterial(i, "quantity", e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Cost" value={m.cost_price} onChange={(e) => updateMaterial(i, "cost_price", e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Sell" value={m.sell_price} onChange={(e) => updateMaterial(i, "sell_price", e.target.value)} /></div>
                  <div className="col-span-2 flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Quote"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <WeldingPhotoMeasureDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        onApply={({ materials: aiMats, description, labour_hours }) => {
          setMaterials((prev) => [...prev, ...aiMats]);
          setForm((f: any) => ({
            ...f,
            description: f.description ? f.description : (description || ""),
            labour_hours: (Number(f.labour_hours) || 0) + (Number(labour_hours) || 0),
          }));
          toast.success(`Added ${aiMats.length} AI-proposed materials`);
        }}
      />
    </WeldingAdminLayout>
  );
};

export default WeldingAdminQuotes;

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import { useWeldingSettings } from "@/contexts/WeldingSettingsContext";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Trash2, Handshake, CalendarDays, Users, Inbox, FileText,
  DollarSign, Clock, Tag, AlertCircle, CheckCircle2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const PIPELINE_COLUMNS = [
  { key: "open", label: "Open", color: "bg-blue-100 text-blue-800" },
  { key: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-800" },
  { key: "quoted", label: "Quoted", color: "bg-purple-100 text-purple-800" },
  { key: "won", label: "Won", color: "bg-green-100 text-green-800" },
  { key: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
] as const;

const CLIENT_CATEGORIES = ["lead", "active", "vip", "cold"] as const;
const CLIENT_CATEGORY_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  vip: "bg-purple-100 text-purple-800",
  cold: "bg-gray-100 text-gray-700",
};

const TIME_CATEGORIES = ["visit", "call", "quoting", "admin", "travel", "general"] as const;
const DEPOSIT_STATUSES = ["held", "applied", "refunded"] as const;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
};

const isToday = (d: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  return dt.getTime() === today.getTime();
};

const isOverdue = (d?: string) => !!d && new Date(d) < new Date(new Date().setHours(0, 0, 0, 0));

const fmtMoney = (n: number, sym = "$") => `${sym}${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
const WeldingAdminSales = () => {
  const { shopId } = useShopId();
  const { settings } = useWeldingSettings();
  const sym = settings?.currency_symbol || "$";

  // Data ─────────────────────────────────────────────────────────────────────
  const activitiesQ = useQuery({
    queryKey: ["welding-sales-activities", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_sales_activities" as any)
        .select("*").eq("shop_id", shopId).order("pipeline_order", { ascending: true }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const customersQ = useQuery({
    queryKey: ["welding-customers-sales", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_customers" as any)
        .select("*").eq("shop_id", shopId).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const quotesQ = useQuery({
    queryKey: ["welding-quotes-sales", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_quotes" as any)
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const requestsQ = useQuery({
    queryKey: ["welding-contact-messages", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_contact_messages" as any)
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const depositsQ = useQuery({
    queryKey: ["welding-deposits", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_deposits" as any)
        .select("*").eq("shop_id", shopId).order("received_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const timeQ = useQuery({
    queryKey: ["welding-time-entries", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from("welding_time_entries" as any)
        .select("*").eq("shop_id", shopId).order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  // KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const acts = activitiesQ.data || [];
    const deps = depositsQ.data || [];
    const times = timeQ.data || [];
    const wk = startOfWeek().getTime();
    const followUpsToday = acts.filter(a => a.follow_up_date && isToday(a.follow_up_date) && a.status !== "won" && a.status !== "lost").length;
    const overdue = acts.filter(a => isOverdue(a.follow_up_date) && a.status !== "won" && a.status !== "lost").length;
    const open = acts.filter(a => a.status === "open" || a.status === "contacted").length;
    const wonValue = acts.filter(a => a.status === "won").reduce((s, a) => s + Number(a.estimated_value || 0), 0);
    const depositsHeld = deps.filter(d => d.status === "held").reduce((s, d) => s + Number(d.amount || 0), 0);
    const minutesThisWeek = times.filter(t => new Date(t.entry_date).getTime() >= wk).reduce((s, t) => s + Number(t.minutes || 0), 0);
    return { open, followUpsToday, overdue, wonValue, depositsHeld, minutesThisWeek };
  }, [activitiesQ.data, depositsQ.data, timeQ.data]);

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Sales Workspace</h1>
          <p className="text-sm text-muted-foreground">Pipeline · clients · requests · quotes · follow-ups · deposits · time</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <KpiCard icon={Handshake} label="Open Leads" value={kpis.open} />
        <KpiCard icon={CalendarDays} label="Follow-ups Today" value={kpis.followUpsToday} accent={kpis.followUpsToday > 0 ? "amber" : undefined} />
        <KpiCard icon={AlertCircle} label="Overdue" value={kpis.overdue} accent={kpis.overdue > 0 ? "red" : undefined} />
        <KpiCard icon={CheckCircle2} label="Won (value)" value={fmtMoney(kpis.wonValue, sym)} />
        <KpiCard icon={DollarSign} label="Deposits Held" value={fmtMoney(kpis.depositsHeld, sym)} />
        <KpiCard icon={Clock} label="Time (week)" value={`${(kpis.minutesThisWeek / 60).toFixed(1)}h`} />
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start h-auto flex-wrap">
          <TabsTrigger value="pipeline"><Handshake className="h-4 w-4 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" />Clients</TabsTrigger>
          <TabsTrigger value="requests"><Inbox className="h-4 w-4 mr-1" />Requests</TabsTrigger>
          <TabsTrigger value="quotes"><FileText className="h-4 w-4 mr-1" />Quotes</TabsTrigger>
          <TabsTrigger value="followups"><CalendarDays className="h-4 w-4 mr-1" />Follow-ups</TabsTrigger>
          <TabsTrigger value="deposits"><DollarSign className="h-4 w-4 mr-1" />Deposits</TabsTrigger>
          <TabsTrigger value="time"><Clock className="h-4 w-4 mr-1" />Time</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineTab shopId={shopId} activities={activitiesQ.data || []} loading={activitiesQ.isLoading} customers={customersQ.data || []} sym={sym} />
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <ClientsTab shopId={shopId} customers={customersQ.data || []} loading={customersQ.isLoading} quotes={quotesQ.data || []} deposits={depositsQ.data || []} times={timeQ.data || []} activities={activitiesQ.data || []} sym={sym} />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab shopId={shopId} requests={requestsQ.data || []} loading={requestsQ.isLoading} />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <QuotesTab quotes={quotesQ.data || []} loading={quotesQ.isLoading} sym={sym} />
        </TabsContent>
        <TabsContent value="followups" className="mt-4">
          <FollowUpsTab shopId={shopId} activities={activitiesQ.data || []} loading={activitiesQ.isLoading} customers={customersQ.data || []} sym={sym} />
        </TabsContent>
        <TabsContent value="deposits" className="mt-4">
          <DepositsTab shopId={shopId} deposits={depositsQ.data || []} loading={depositsQ.isLoading} customers={customersQ.data || []} quotes={quotesQ.data || []} sym={sym} />
        </TabsContent>
        <TabsContent value="time" className="mt-4">
          <TimeTab shopId={shopId} times={timeQ.data || []} loading={timeQ.isLoading} customers={customersQ.data || []} />
        </TabsContent>
      </Tabs>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminSales;

// ──────────────────────────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: "amber" | "red" }) => (
  <Card className={accent === "red" ? "border-red-300" : accent === "amber" ? "border-amber-300" : ""}>
    <CardContent className="p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${accent === "red" ? "bg-red-100 text-red-700" : accent === "amber" ? "bg-amber-100 text-amber-700" : "bg-muted text-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
        <p className="font-semibold text-base leading-tight truncate">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline Tab (Kanban)
// ──────────────────────────────────────────────────────────────────────────────
const emptyActivity = { activity_type: "general", customer_name: "", customer_email: "", customer_phone: "", notes: "", follow_up_date: "", status: "open", customer_id: null, quote_id: null, estimated_value: 0, category: "" };

const PipelineTab = ({ shopId, activities, loading, customers, sym }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyActivity });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, activity_type: d.activity_type, customer_name: d.customer_name, customer_email: d.customer_email || null, customer_phone: d.customer_phone || null, notes: d.notes || null, follow_up_date: d.follow_up_date || null, status: d.status, customer_id: d.customer_id || null, quote_id: d.quote_id || null, estimated_value: Number(d.estimated_value || 0), category: d.category || null };
      if (editing) { const { error } = await supabase.from("welding_sales_activities" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_sales_activities" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-sales-activities"] }); toast.success(editing ? "Updated" : "Added"); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_sales_activities" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-sales-activities"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const moveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("welding_sales_activities" as any).update({ status, completed_at: (status === "won" || status === "lost") ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["welding-sales-activities"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyActivity }); };
  const openNew = () => { setEditing(null); setForm({ ...emptyActivity }); setOpen(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ ...emptyActivity, ...a, follow_up_date: a.follow_up_date || "" }); setOpen(true); };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {PIPELINE_COLUMNS.map(col => {
          const items = activities.filter((a: any) => a.status === col.key);
          return (
            <div key={col.key} className="bg-muted/40 rounded-md p-2 min-h-[160px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <Badge className={col.color}>{col.label}</Badge>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Empty</p>}
                {items.map((a: any) => (
                  <Card key={a.id} className={`cursor-pointer hover:shadow-md transition ${isOverdue(a.follow_up_date) ? "border-amber-400" : ""}`} onClick={() => openEdit(a)}>
                    <CardContent className="p-3 space-y-1">
                      <p className="font-medium text-sm truncate">{a.customer_name || "Unknown"}</p>
                      {a.estimated_value > 0 && <p className="text-xs font-semibold text-primary">{fmtMoney(Number(a.estimated_value), sym)}</p>}
                      {a.category && <Badge variant="outline" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{a.category}</Badge>}
                      {a.follow_up_date && <p className={`text-[11px] flex items-center gap-1 ${isOverdue(a.follow_up_date) ? "text-amber-600 font-medium" : "text-muted-foreground"}`}><CalendarDays className="h-3 w-3" />{new Date(a.follow_up_date).toLocaleDateString()}</p>}
                      <Select value={a.status} onValueChange={(v) => moveStatus.mutate({ id: a.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                        <SelectContent>{PIPELINE_COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Activity" : "New Activity"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => {
                  if (v === "none") { setForm({ ...form, customer_id: null }); return; }
                  const c = customers.find((x: any) => x.id === v);
                  setForm({ ...form, customer_id: v, customer_name: c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : form.customer_name, customer_email: c?.email || form.customer_email, customer_phone: c?.phone || form.customer_phone });
                }}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Customer Name</Label><Input value={form.customer_name || ""} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Type</Label><Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="inquiry">Inquiry</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="follow_up">Follow-up</SelectItem></SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PIPELINE_COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Email</Label><Input value={form.customer_email || ""} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customer_phone || ""} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Estimated Value ({sym})</Label><Input type="number" step="0.01" value={form.estimated_value || 0} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div><Label>Category</Label><Input placeholder="e.g. Railing, Repair" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date || ""} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { del.mutate(editing.id); close(); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
              <div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button></div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Clients Tab
// ──────────────────────────────────────────────────────────────────────────────
const ClientsTab = ({ shopId, customers, loading, quotes, deposits, times, activities, sym }: any) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);

  const updateCat = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const { error } = await supabase.from("welding_customers" as any).update({ category }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-customers-sales"] }); toast.success("Category updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = customers.filter((c: any) => {
    const name = `${c.first_name || ""} ${c.last_name || ""} ${c.company || ""} ${c.email || ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchFilter = filter === "all" || (c.category || "lead") === filter;
    return matchSearch && matchFilter;
  });

  const rollup = (c: any) => {
    const cQuotes = quotes.filter((q: any) => q.customer_id === c.id);
    const cDeposits = deposits.filter((d: any) => d.customer_id === c.id && d.status === "held").reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
    const cActivities = activities.filter((a: any) => a.customer_id === c.id);
    const cMinutes = times.filter((t: any) => t.customer_id === c.id).reduce((s: number, t: any) => s + Number(t.minutes || 0), 0);
    return { quotes: cQuotes, openQuotes: cQuotes.filter((q: any) => !["converted", "rejected", "expired"].includes(q.status)).length, deposits: cDeposits, activities: cActivities, minutes: cMinutes };
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CLIENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No clients</p></CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c: any) => {
            const r = rollup(c);
            const cat = c.category || "lead";
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelected(c)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                      {c.company && <span className="text-xs text-muted-foreground">· {c.company}</span>}
                      <Badge className={CLIENT_CATEGORY_COLORS[cat]}>{cat}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.email || c.phone || "—"}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span>{r.openQuotes} open quote{r.openQuotes !== 1 ? "s" : ""}</span>
                      {r.deposits > 0 && <span className="text-primary font-medium">{fmtMoney(r.deposits, sym)} deposit</span>}
                      {r.minutes > 0 && <span>{(r.minutes / 60).toFixed(1)}h logged</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (() => {
            const r = rollup(selected);
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.first_name} {selected.last_name}</SheetTitle>
                  {selected.company && <p className="text-sm text-muted-foreground">{selected.company}</p>}
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={selected.category || "lead"} onValueChange={(v) => { updateCat.mutate({ id: selected.id, category: v }); setSelected({ ...selected, category: v }); }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{CLIENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Email</p><p className="truncate">{selected.email || "—"}</p></div>
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Phone</p><p>{selected.phone || "—"}</p></div>
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Open Quotes</p><p className="font-semibold">{r.openQuotes}</p></div>
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Deposit Held</p><p className="font-semibold">{fmtMoney(r.deposits, sym)}</p></div>
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Time Logged</p><p className="font-semibold">{(r.minutes / 60).toFixed(1)}h</p></div>
                    <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Activities</p><p className="font-semibold">{r.activities.length}</p></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Recent Activities</p>
                    {r.activities.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                    {r.activities.slice(0, 5).map((a: any) => (
                      <div key={a.id} className="text-xs border-l-2 border-muted pl-2 mb-2">
                        <p className="font-medium">{a.activity_type} · <span className="text-muted-foreground">{a.status}</span></p>
                        {a.notes && <p className="text-muted-foreground line-clamp-2">{a.notes}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Requests Tab
// ──────────────────────────────────────────────────────────────────────────────
const RequestsTab = ({ shopId, requests, loading }: any) => {
  const qc = useQueryClient();
  const convert = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase.from("welding_sales_activities" as any).insert({
        shop_id: shopId, activity_type: "inquiry", status: "open",
        customer_name: r.name || r.customer_name || "Web Lead",
        customer_email: r.email || null, customer_phone: r.phone || null,
        notes: r.message || r.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-sales-activities"] }); toast.success("Added to pipeline"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;
  if (requests.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground"><Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No incoming requests</p></CardContent></Card>;

  return (
    <div className="grid gap-2">
      {requests.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <div className="min-w-0">
              <p className="font-medium">{r.name || r.customer_name || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">{r.email || ""} {r.phone ? `· ${r.phone}` : ""}</p>
              {r.message && <p className="text-sm mt-1 line-clamp-2">{r.message}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => convert.mutate(r)}>Add to Pipeline</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Quotes Tab
// ──────────────────────────────────────────────────────────────────────────────
const QuotesTab = ({ quotes, loading, sym }: any) => {
  const [filter, setFilter] = useState("all");
  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;
  const filtered = filter === "all" ? quotes : quotes.filter((q: any) => q.status === filter);
  if (filtered.length === 0) return (
    <div>
      <div className="mb-3"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="converted">Converted</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
      <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No quotes</p></CardContent></Card>
    </div>
  );
  return (
    <div>
      <div className="mb-3"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="converted">Converted</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2">
        {filtered.map((q: any) => (
          <Card key={q.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{q.quote_number || "Quote"}</span>
                  <Badge variant="outline">{q.status}</Badge>
                </div>
                <p className="text-sm truncate">{q.customer_name} · {q.project_type || "—"}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right shrink-0"><p className="font-semibold">{fmtMoney(Number(q.total || 0), sym)}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Follow-ups Tab
// ──────────────────────────────────────────────────────────────────────────────
const FollowUpsTab = ({ shopId, activities, loading, customers, sym }: any) => {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: async ({ id, patch }: any) => { const { error } = await supabase.from("welding_sales_activities" as any).update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["welding-sales-activities"] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;
  const open = activities.filter((a: any) => a.follow_up_date && a.status !== "won" && a.status !== "lost");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wkEnd = new Date(today); wkEnd.setDate(wkEnd.getDate() + 7);
  const overdue = open.filter((a: any) => new Date(a.follow_up_date) < today);
  const todayItems = open.filter((a: any) => isToday(a.follow_up_date));
  const week = open.filter((a: any) => { const d = new Date(a.follow_up_date); return d > today && d <= wkEnd; });
  const later = open.filter((a: any) => new Date(a.follow_up_date) > wkEnd);

  const Group = ({ title, items, accent }: any) => items.length === 0 ? null : (
    <div className="mb-4">
      <p className={`text-sm font-semibold mb-2 ${accent || ""}`}>{title} <span className="text-xs font-normal text-muted-foreground">({items.length})</span></p>
      <div className="grid gap-2">
        {items.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div className="min-w-0">
                <p className="font-medium">{a.customer_name}</p>
                {a.notes && <p className="text-xs text-muted-foreground line-clamp-1">{a.notes}</p>}
                <p className="text-[11px] text-muted-foreground">{new Date(a.follow_up_date).toLocaleDateString()} · {a.activity_type}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 3); update.mutate({ id: a.id, patch: { follow_up_date: d.toISOString().slice(0, 10) } }); }}>Snooze 3d</Button>
                <Button size="sm" onClick={() => update.mutate({ id: a.id, patch: { status: "contacted", follow_up_date: null, completed_at: new Date().toISOString() } })}>Done</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (open.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground"><CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No follow-ups scheduled</p></CardContent></Card>;
  return (
    <div>
      <Group title="Overdue" items={overdue} accent="text-red-600" />
      <Group title="Today" items={todayItems} accent="text-amber-600" />
      <Group title="This Week" items={week} />
      <Group title="Later" items={later} />
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Deposits Tab
// ──────────────────────────────────────────────────────────────────────────────
const emptyDeposit = { customer_id: null, quote_id: null, amount: 0, payment_method: "", received_date: new Date().toISOString().slice(0, 10), status: "held", notes: "" };

const DepositsTab = ({ shopId, deposits, loading, customers, quotes, sym }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyDeposit });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, customer_id: d.customer_id || null, quote_id: d.quote_id || null, amount: Number(d.amount || 0), payment_method: d.payment_method || null, received_date: d.received_date, status: d.status, notes: d.notes || null };
      if (editing) { const { error } = await supabase.from("welding_deposits" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_deposits" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-deposits"] }); toast.success(editing ? "Updated" : "Added"); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_deposits" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-deposits"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyDeposit }); };
  const openNew = () => { setEditing(null); setForm({ ...emptyDeposit }); setOpen(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ ...emptyDeposit, ...d }); setOpen(true); };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  const customerName = (id: string) => { const c = customers.find((x: any) => x.id === id); return c ? `${c.first_name} ${c.last_name}` : "—"; };

  return (
    <div>
      <div className="flex justify-end mb-3"><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Deposit</Button></div>
      {deposits.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No deposits recorded</p></CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {deposits.map((d: any) => (
            <Card key={d.id} className="cursor-pointer hover:shadow-md transition" onClick={() => openEdit(d)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{customerName(d.customer_id)}</span>
                    <Badge variant={d.status === "held" ? "default" : "outline"}>{d.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.payment_method || "—"} · {new Date(d.received_date).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold">{fmtMoney(Number(d.amount), sym)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Deposit" : "New Deposit"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
            <div><Label>Customer</Label>
              <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">— None —</SelectItem>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Linked Quote (optional)</Label>
              <Select value={form.quote_id || "none"} onValueChange={(v) => setForm({ ...form, quote_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">— None —</SelectItem>{quotes.filter((q: any) => !form.customer_id || q.customer_id === form.customer_id).map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quote_number || q.id.slice(0, 8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount ({sym})</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><Label>Date</Label><Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
              <div><Label>Method</Label><Input placeholder="Cash, e-Transfer..." value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPOSIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { del.mutate(editing.id); close(); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
              <div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Time Tab
// ──────────────────────────────────────────────────────────────────────────────
const emptyTime = { customer_id: null, quote_id: null, category: "general", entry_date: new Date().toISOString().slice(0, 10), minutes: 30, billable: false, notes: "" };

const TimeTab = ({ shopId, times, loading, customers }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyTime });

  const save = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, customer_id: d.customer_id || null, quote_id: d.quote_id || null, category: d.category, entry_date: d.entry_date, minutes: Number(d.minutes || 0), billable: !!d.billable, notes: d.notes || null };
      if (editing) { const { error } = await supabase.from("welding_time_entries" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_time_entries" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-time-entries"] }); toast.success(editing ? "Updated" : "Added"); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_time_entries" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welding-time-entries"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyTime }); };
  const openNew = () => { setEditing(null); setForm({ ...emptyTime }); setOpen(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...emptyTime, ...t }); setOpen(true); };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  const customerName = (id: string) => { const c = customers.find((x: any) => x.id === id); return c ? `${c.first_name} ${c.last_name}` : "—"; };

  // Weekly summary by customer
  const wkStart = startOfWeek().getTime();
  const weekTimes = times.filter((t: any) => new Date(t.entry_date).getTime() >= wkStart);
  const weekByCustomer: Record<string, number> = {};
  weekTimes.forEach((t: any) => { const k = t.customer_id || "unassigned"; weekByCustomer[k] = (weekByCustomer[k] || 0) + Number(t.minutes || 0); });

  return (
    <div>
      <div className="flex justify-end mb-3"><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Log Time</Button></div>

      {Object.keys(weekByCustomer).length > 0 && (
        <Card className="mb-3">
          <CardContent className="p-3">
            <p className="text-sm font-semibold mb-2">This Week</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(weekByCustomer).map(([id, mins]) => (
                <div key={id} className="bg-muted rounded p-2">
                  <p className="text-xs text-muted-foreground truncate">{id === "unassigned" ? "Unassigned" : customerName(id)}</p>
                  <p className="font-semibold text-sm">{(mins / 60).toFixed(1)}h</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {times.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No time logged</p></CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {times.map((t: any) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition" onClick={() => openEdit(t)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{customerName(t.customer_id)}</span>
                    <Badge variant="outline">{t.category}</Badge>
                    {t.billable && <Badge>Billable</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(t.entry_date).toLocaleDateString()}{t.notes ? ` · ${t.notes}` : ""}</p>
                </div>
                <p className="font-semibold">{(Number(t.minutes) / 60).toFixed(1)}h</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Time Entry" : "Log Time"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
            <div><Label>Customer</Label>
              <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">— None —</SelectItem>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
              <div><Label>Minutes</Label><Input type="number" min="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} required /></div>
              <div className="flex items-end gap-2"><label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={!!form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} />Billable</label></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { del.mutate(editing.id); close(); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
              <div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

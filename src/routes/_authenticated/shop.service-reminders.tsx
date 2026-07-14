import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/service-reminders")({
  head: () => ({ meta: [{ title: "Service Reminders — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: RemindersPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Service Reminders</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

const TYPES = ["Oil Change", "Tire Rotation", "Brake Service", "Inspection", "Warranty", "Follow-up", "Other"];

async function fetchReminders() {
  const sm = smSupabase as any;
  const { data, error } = await sm.from("service_reminders")
    .select("id, type, title, description, due_date, status, priority, notification_sent, customer_id, vehicle_id, customers(first_name,last_name,email), vehicles(year,make,model,license_plate)")
    .order("due_date", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

async function fetchCustomers() {
  const { data } = await (smSupabase as any).from("customers").select("id, first_name, last_name").order("last_name").limit(500);
  return data ?? [];
}

function RemindersPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "overdue" | "completed" | "all">("open");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ customer_id: "", type: "Oil Change", title: "", description: "", due_date: "", priority: "normal" });

  const q = useQuery({ queryKey: ["sm", "service-reminders"], queryFn: fetchReminders });
  const custs = useQuery({ queryKey: ["sm", "customers-lite"], queryFn: fetchCustomers });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.customer_id || !form.title || !form.due_date) throw new Error("Customer, title, due date are required");
      const { error } = await (smSupabase as any).from("service_reminders").insert({
        customer_id: form.customer_id,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date,
        priority: form.priority,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder created");
      setCreating(false);
      setForm({ customer_id: "", type: "Oil Change", title: "", description: "", due_date: "", priority: "normal" });
      qc.invalidateQueries({ queryKey: ["sm", "service-reminders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("service_reminders")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "service-reminders"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("service_reminders")
        .update({ notification_sent: true, notification_date: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "service-reminders"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("service_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "service-reminders"] }),
  });

  const rows = q.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    return rows.filter((r: any) => {
      if (filter === "all") return true;
      if (filter === "completed") return r.status === "completed";
      if (filter === "overdue") return r.status !== "completed" && r.due_date && r.due_date < today;
      return r.status !== "completed";
    });
  }, [rows, filter, today]);

  const stats = useMemo(() => ({
    open: rows.filter((r: any) => r.status !== "completed").length,
    overdue: rows.filter((r: any) => r.status !== "completed" && r.due_date && r.due_date < today).length,
    unsent: rows.filter((r: any) => r.status !== "completed" && !r.notification_sent).length,
    completed: rows.filter((r: any) => r.status === "completed").length,
  }), [rows, today]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Service Reminders</h1>
            <p className="text-sm text-muted-foreground">Track upcoming services and warranty check-ins.</p>
          </div>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New reminder</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New service reminder</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Customer</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick customer" /></SelectTrigger>
                    <SelectContent>
                      {(custs.data ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Oil change due" /></div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-3">
          <Kpi label="Open" value={stats.open} />
          <Kpi label="Overdue" value={stats.overdue} tone="destructive" />
          <Kpi label="Unsent" value={stats.unsent} tone="warning" />
          <Kpi label="Completed" value={stats.completed} tone="success" />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader><CardTitle className="text-base">{filtered.length} reminder{filtered.length === 1 ? "" : "s"}</CardTitle></CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((r: any) => {
                  const c = r.customers;
                  const overdue = r.status !== "completed" && r.due_date && r.due_date < today;
                  const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : "—";
                  const vehicle = r.vehicles ? `${r.vehicles.year ?? ""} ${r.vehicles.make ?? ""} ${r.vehicles.model ?? ""}`.trim() : null;
                  return (
                    <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded border p-3 text-sm ${overdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          <Link to="/shop/customers/$id" params={{ id: r.customer_id }} className="hover:underline">{name}</Link>
                          {vehicle ? ` • ${vehicle}` : ""} • {r.type}
                        </div>
                      </div>
                      <Badge variant={overdue ? "destructive" : "outline"}>{r.due_date ?? "—"}</Badge>
                      {r.notification_sent ? <Badge variant="secondary" className="text-[10px]">sent</Badge> : null}
                      {r.status === "completed" ? <Badge variant="secondary">done</Badge> : null}
                      <div className="flex gap-1">
                        {r.status !== "completed" && !r.notification_sent ? (
                          <Button size="sm" variant="outline" onClick={() => markSent.mutate(r.id)}>Mark sent</Button>
                        ) : null}
                        {r.status !== "completed" ? (
                          <Button size="sm" variant="outline" onClick={() => complete.mutate(r.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "warning" | "success" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "";
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

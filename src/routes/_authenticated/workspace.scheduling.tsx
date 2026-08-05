import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Loader2, Plus, Trash2, ArrowLeftRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/scheduling")({
  head: () => ({ meta: [{ title: "Scheduling — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: SchedulingPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

async function fetchTemplates() {
  const { data, error } = await (smSupabase as any).from("shift_templates").select("*").order("template_name");
  if (error) throw error;
  return data ?? [];
}
async function fetchSwaps() {
  const { data, error } = await (smSupabase as any).from("shift_swap_requests").select("*").order("swap_date", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

function SchedulingPage() {
  useShopRealtime();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    template_name: "", description: "", shift_start: "08:00", shift_end: "17:00",
    days_of_week: [1, 2, 3, 4, 5], break_duration_minutes: 30, color: COLORS[0], is_active: true,
  });

  const templatesQ = useQuery({ queryKey: ["sm", "shift-templates"], queryFn: fetchTemplates });
  const swapsQ = useQuery({ queryKey: ["sm", "shift-swaps"], queryFn: fetchSwaps });

  const createTpl = useMutation({
    mutationFn: async () => {
      if (!form.template_name.trim()) throw new Error("Name required");
      const { error } = await (smSupabase as any).from("shift_templates").insert({
        template_name: form.template_name.trim(),
        description: form.description.trim() || null,
        shift_start: form.shift_start, shift_end: form.shift_end,
        days_of_week: form.days_of_week,
        break_duration_minutes: form.break_duration_minutes,
        color: form.color, is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template created"); setCreating(false);
      setForm({ template_name: "", description: "", shift_start: "08:00", shift_end: "17:00", days_of_week: [1, 2, 3, 4, 5], break_duration_minutes: 30, color: COLORS[0], is_active: true });
      qc.invalidateQueries({ queryKey: ["sm", "shift-templates"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggleTpl = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await (smSupabase as any).from("shift_templates").update({ is_active: !row.is_active }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "shift-templates"] }),
  });

  const delTpl = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("shift_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm", "shift-templates"] }),
  });

  const reviewSwap = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await (smSupabase as any).from("shift_swap_requests")
        .update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["sm", "shift-swaps"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggleDay = (d: number) => {
    setForm((f) => ({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter((x) => x !== d) : [...f.days_of_week, d].sort() }));
  };

  const swaps = swapsQ.data ?? [];
  const pendingSwaps = swaps.filter((s: any) => s.status === "pending");

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6 text-primary" /> Scheduling</h1>
            <p className="text-sm text-muted-foreground">Shift templates and swap approvals.</p>
          </div>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Shift Templates</TabsTrigger>
            <TabsTrigger value="swaps">Swap Requests {pendingSwaps.length ? <Badge variant="destructive" className="ml-2">{pendingSwaps.length}</Badge> : null}</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Templates</CardTitle>
                <Dialog open={creating} onOpenChange={setCreating}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New template</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New shift template</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Name</Label><Input value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} placeholder="Morning shift, Weekend, etc." /></div>
                      <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label>Start</Label><Input type="time" value={form.shift_start} onChange={(e) => setForm({ ...form, shift_start: e.target.value })} /></div>
                        <div><Label>End</Label><Input type="time" value={form.shift_end} onChange={(e) => setForm({ ...form, shift_end: e.target.value })} /></div>
                        <div><Label>Break (min)</Label><Input type="number" value={form.break_duration_minutes} onChange={(e) => setForm({ ...form, break_duration_minutes: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div>
                        <Label>Days of week</Label>
                        <div className="flex gap-1 mt-1">
                          {DAYS.map((d, idx) => (
                            <button key={d} type="button" onClick={() => toggleDay(idx)}
                              className={`h-8 w-10 rounded border text-xs ${form.days_of_week.includes(idx) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Color</Label>
                        <div className="flex gap-2 mt-1">
                          {COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                              className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded border p-2">
                        <Label>Active</Label>
                        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                      <Button onClick={() => createTpl.mutate()} disabled={createTpl.isPending}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {templatesQ.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : (templatesQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates yet.</p>
                ) : (
                  <div className="space-y-1">
                    {(templatesQ.data ?? []).map((t: any) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color ?? "#64748b" }} />
                        <span className="font-medium">{t.template_name}</span>
                        <span className="text-xs text-muted-foreground">{t.shift_start?.slice(0, 5)} – {t.shift_end?.slice(0, 5)}</span>
                        <span className="text-xs text-muted-foreground">Break {t.break_duration_minutes ?? 0}m</span>
                        <span className="text-xs text-muted-foreground">{(t.days_of_week ?? []).map((d: number) => DAYS[d]).join(" ")}</span>
                        <span className="flex-1" />
                        <Switch checked={!!t.is_active} onCheckedChange={() => toggleTpl.mutate(t)} />
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${t.template_name}?`)) delTpl.mutate(t.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swaps" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Swap requests</CardTitle></CardHeader>
              <CardContent>
                {swapsQ.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : swaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No swap requests.</p>
                ) : (
                  <div className="space-y-2">
                    {swaps.map((s: any) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm">
                        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {s.requesting_employee_id?.slice(0, 8)} → {s.target_employee_id?.slice(0, 8) ?? "any"}
                          </div>
                          <div>{s.reason ?? <span className="text-muted-foreground">No reason given</span>}</div>
                        </div>
                        <Badge variant="outline">{s.swap_date ?? "—"}</Badge>
                        <Badge variant={s.status === "pending" ? "secondary" : s.status === "approved" ? "default" : "outline"}>{s.status}</Badge>
                        {s.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => reviewSwap.mutate({ id: s.id, status: "approved" })}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reviewSwap.mutate({ id: s.id, status: "rejected" })}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

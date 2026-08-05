import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Play, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopRealtime } from "@/hooks/use-shop-realtime";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/automation")({
  head: () => ({ meta: [{ title: "Automation Rules — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: AutomationPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Automation</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found.</div></SiteLayout>,
});

const SERVICE_TYPES = ["oil_change", "brake_service", "tire_rotation", "inspection", "tune_up", "transmission", "coolant", "battery", "custom"];

function AutomationPage() {
  useShopRealtime(["service_automation_rules"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rule_name: "",
    service_type: "oil_change",
    interval_km: 5000,
    interval_days: 90,
    send_email: true,
    send_sms: false,
    lead_days: 7,
    is_active: true,
    notes: "",
  });

  const q = useQuery({
    queryKey: ["shop-manager", "service_automation_rules"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any).from("service_automation_rules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.rule_name.trim()) throw new Error("Name required");
      const payload = {
        rule_name: form.rule_name.trim(),
        service_type: form.service_type,
        vehicle_criteria: {},
        automation_config: {
          interval_km: form.interval_km,
          interval_days: form.interval_days,
          send_email: form.send_email,
          send_sms: form.send_sms,
          lead_days: form.lead_days,
          notes: form.notes,
        },
        is_active: form.is_active,
      };
      const { error } = await (smSupabase as any).from("service_automation_rules").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rule created"); setOpen(false); qc.invalidateQueries({ queryKey: ["shop-manager", "service_automation_rules"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (smSupabase as any).from("service_automation_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "service_automation_rules"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("service_automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["shop-manager", "service_automation_rules"] }); },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data: rules } = await (smSupabase as any).from("service_automation_rules").select("*").eq("is_active", true);
      const { data: vehicles } = await (smSupabase as any).from("vehicles").select("id,customer_id,make,model,year,last_service_date");
      const { data: existing } = await (smSupabase as any).from("service_reminders").select("vehicle_id,type,status").in("status", ["pending", "scheduled"]);
      const existingSet = new Set((existing ?? []).map((r: any) => `${r.vehicle_id}::${r.type}`));
      const today = new Date();
      const toCreate: any[] = [];
      for (const rule of rules ?? []) {
        const cfg = rule.automation_config ?? {};
        const intervalDays = Number(cfg.interval_days) || 0;
        if (!intervalDays) continue;
        for (const v of vehicles ?? []) {
          if (!v.last_service_date) continue;
          const key = `${v.id}::${rule.service_type}`;
          if (existingSet.has(key)) continue;
          const last = new Date(v.last_service_date);
          const due = new Date(last); due.setDate(due.getDate() + intervalDays);
          const leadMs = (Number(cfg.lead_days) || 0) * 86400000;
          if (due.getTime() - today.getTime() <= leadMs) {
            toCreate.push({
              vehicle_id: v.id, customer_id: v.customer_id,
              type: rule.service_type,
              title: `${rule.rule_name} — ${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim(),
              due_date: due.toISOString().slice(0, 10),
              status: "pending", priority: "medium",
            });
            existingSet.add(key);
          }
        }
      }
      if (toCreate.length === 0) return { created: 0 };
      const { error } = await (smSupabase as any).from("service_reminders").insert(toCreate);
      if (error) throw error;
      return { created: toCreate.length };
    },
    onSuccess: (r) => { toast.success(r.created ? `Created ${r.created} reminder${r.created === 1 ? "" : "s"}` : "No new reminders due"); qc.invalidateQueries({ queryKey: ["shop-manager", "service_reminders"] }); },
    onError: (e: any) => toast.error(e.message),
  });


  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Automation Rules</h1>
              <p className="text-muted-foreground">Auto-trigger service reminders by mileage or time.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
              {runNow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run rules now
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Rule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Automation Rule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Rule name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="Oil change 5,000 km" /></div>
                <div>
                  <Label>Service type</Label>
                  <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Every km</Label><Input type="number" value={form.interval_km} onChange={(e) => setForm({ ...form, interval_km: Number(e.target.value) })} /></div>
                  <div><Label>Every days</Label><Input type="number" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Lead time (days before due)</Label><Input type="number" value={form.lead_days} onChange={(e) => setForm({ ...form, lead_days: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={form.send_email} onCheckedChange={(v) => setForm({ ...form, send_email: v })} /> Email</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={form.send_sms} onCheckedChange={(v) => setForm({ ...form, send_sms: v })} /> SMS</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
                </div>
                <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving…" : "Create"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (q.data ?? []).length === 0 ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">No rules yet. Create your first to auto-notify customers.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {(q.data ?? []).map((r: any) => {
              const cfg = r.automation_config ?? {};
              return (
                <Card key={r.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      {r.rule_name}
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Paused"}</Badge>
                      <Badge variant="outline">{String(r.service_type).replace(/_/g, " ")}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })} />
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete rule?")) remove.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex flex-wrap gap-3">
                    <span>Every {cfg.interval_km ?? "—"} km</span>
                    <span>or {cfg.interval_days ?? "—"} days</span>
                    <span>Lead: {cfg.lead_days ?? 0}d</span>
                    <span>{cfg.send_email ? "📧" : ""}{cfg.send_sms ? "📱" : ""}</span>
                    {cfg.notes && <span className="italic">{cfg.notes}</span>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

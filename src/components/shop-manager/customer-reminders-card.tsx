import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { smSupabase } from "@/lib/shop-manager/db";

type Reminder = {
  id: string; customer_id: string; reminder_type: string; title: string;
  notes: string | null; due_date: string; status: string; completed_at: string | null;
};

const TYPES = ["follow_up", "service_reminder", "warranty_check", "estimate_follow_up", "call_back", "other"];

export function CustomerRemindersCard({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reminder_type: "follow_up",
    title: "",
    notes: "",
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "customer_reminders", customerId],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("customer_reminders")
        .select("id,customer_id,reminder_type,title,notes,due_date,status,completed_at")
        .eq("customer_id", customerId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (smSupabase as any).from("customer_reminders").insert({
        customer_id: customerId, ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder added");
      setOpen(false);
      setForm({ ...form, title: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["shop-manager", "customer_reminders", customerId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("customer_reminders")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "customer_reminders", customerId] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("customer_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "customer_reminders", customerId] }),
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Reminders & Follow-ups</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Call about brake service quote" /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter><Button disabled={!form.title.trim() || create.isPending} onClick={() => create.mutate()}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const overdue = r.status === "pending" && r.due_date < today;
              return (
                <div key={r.id} className={`flex items-start gap-3 rounded border p-3 ${overdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <Bell className={`h-4 w-4 mt-0.5 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${r.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{r.title}</span>
                      <Badge variant="outline" className="text-xs">{r.reminder_type.replace(/_/g, " ")}</Badge>
                      {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                      {r.status === "completed" && <Badge variant="secondary" className="text-xs">Done</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Due {new Date(r.due_date).toLocaleDateString()}</div>
                    {r.notes && <div className="text-sm mt-1 whitespace-pre-wrap">{r.notes}</div>}
                  </div>
                  <div className="flex gap-1">
                    {r.status !== "completed" && (
                      <Button size="icon" variant="ghost" onClick={() => complete.mutate(r.id)} title="Mark done">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete reminder?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

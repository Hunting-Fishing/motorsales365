import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { smSupabase } from "@/lib/shop-manager/db";

type TimeEntry = {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  billable: boolean | null;
};

function fmt(dt: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString();
}

function hoursBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!isFinite(ms) || ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

export function WorkOrderTimeEntries({ workOrderId }: { workOrderId: string }) {
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "wo-time", workOrderId],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("work_order_time_entries")
        .select("id,employee_id,employee_name,start_time,end_time,duration,notes,billable")
        .eq("work_order_id", workOrderId)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeEntry[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (smSupabase as any).from("work_order_time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["shop-manager", "wo-time", workOrderId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const totalHours = entries.reduce((s, e) => s + Number(e.duration ?? 0), 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.duration ?? 0), 0);

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Time entries ({entries.length})
          <span className="ml-3 text-xs font-normal text-muted-foreground">
            {totalHours.toFixed(2)}h total · {billableHours.toFixed(2)}h billable
          </span>
        </CardTitle>
        <AddTimeEntryDialog workOrderId={workOrderId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No time entries yet.</div>
        ) : (
          <div className="divide-y">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{e.employee_name ?? "—"} <span className="text-xs text-muted-foreground ml-2">{Number(e.duration ?? 0).toFixed(2)}h {e.billable ? "· billable" : "· non-billable"}</span></div>
                  <div className="text-xs text-muted-foreground">{fmt(e.start_time)} → {fmt(e.end_time)}</div>
                  {e.notes ? <div className="text-xs text-muted-foreground mt-1">{e.notes}</div> : null}
                </div>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete entry?")) del.mutate(e.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddTimeEntryDialog({ workOrderId }: { workOrderId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [startTime, setStartTime] = useState(() => new Date(Date.now() - 60 * 60_000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);

  const { data: technicians = [] } = useQuery({
    queryKey: ["shop-manager", "technicians", "picker"],
    enabled: open,
    queryFn: async () => {
      const { data: shopId } = await (smSupabase as any).rpc("get_current_user_shop_id");
      const { data, error } = await (smSupabase as any)
        .from("profiles")
        .select("id,full_name,first_name,last_name,job_title")
        .eq("shop_id", shopId)
        .order("full_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!startTime || !endTime) throw new Error("Set start and end time");
      const emp = technicians.find((t: any) => t.id === employeeId);
      const empName = emp ? (emp.full_name || `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || "—") : null;
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();
      const duration = hoursBetween(startISO, endISO);
      const { error } = await (smSupabase as any).from("work_order_time_entries").insert({
        work_order_id: workOrderId,
        employee_id: employeeId || null,
        employee_name: empName,
        start_time: startISO,
        end_time: endISO,
        duration,
        notes: notes || null,
        billable,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time entry added");
      qc.invalidateQueries({ queryKey: ["shop-manager", "wo-time", workOrderId] });
      setOpen(false);
      setNotes(""); setEmployeeId(""); setBillable(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Log time</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log time entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Technician</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Pick a technician…" /></SelectTrigger>
              <SelectContent>
                {technicians.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {(t.full_name || `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim()) || t.id.slice(0, 8)}
                    {t.job_title ? ` · ${t.job_title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="text-sm text-muted-foreground">
            Duration: <span className="font-mono">{hoursBetween(new Date(startTime).toISOString(), new Date(endTime).toISOString()).toFixed(2)}h</span>
          </div>
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="flex items-center gap-2"><Switch checked={billable} onCheckedChange={setBillable} /><Label className="mb-0">Billable</Label></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

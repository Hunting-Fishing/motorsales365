import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Save, Plus, Trash2, CalendarClock } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Schedule = {
  id: string;
  technician_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean | null;
  specific_date: string | null;
};
type BreakRow = { id: string; schedule_id: string; start_time: string; end_time: string };

export const Route = createFileRoute("/_authenticated/workspace/technicians/$id")({
  head: () => ({
    meta: [
      { title: "Technician Schedule — Shop Manager" },
      { name: "description", content: "Set recurring weekly hours and breaks for a technician." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TechnicianSchedulePage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Technician</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Technician not found.</div></SiteLayout>
  ),
});

function TechnicianSchedulePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const techQ = useQuery({
    queryKey: ["shop-manager", "technician", id],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("profiles")
        .select("id,full_name,first_name,last_name,email,phone,job_title,department")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const schedQ = useQuery({
    queryKey: ["shop-manager", "technician_schedules", id],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("technician_schedules")
        .select("id,technician_id,day_of_week,start_time,end_time,is_recurring,specific_date")
        .eq("technician_id", id)
        .eq("is_recurring", true)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Schedule[];
    },
  });

  const scheduleIds = (schedQ.data ?? []).map((s) => s.id);
  const breaksQ = useQuery({
    queryKey: ["shop-manager", "technician_breaks", scheduleIds.join(",")],
    enabled: scheduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("technician_breaks")
        .select("id,schedule_id,start_time,end_time")
        .in("schedule_id", scheduleIds);
      if (error) throw error;
      return (data ?? []) as BreakRow[];
    },
  });

  const upsertDay = useMutation({
    mutationFn: async (row: { day: number; start: string; end: string; enabled: boolean; existingId?: string }) => {
      if (!row.enabled) {
        if (row.existingId) {
          const { error } = await (smSupabase as any).from("technician_schedules").delete().eq("id", row.existingId);
          if (error) throw error;
        }
        return;
      }
      if (row.existingId) {
        const { error } = await (smSupabase as any).from("technician_schedules").update({
          start_time: row.start, end_time: row.end,
        }).eq("id", row.existingId);
        if (error) throw error;
      } else {
        const { error } = await (smSupabase as any).from("technician_schedules").insert({
          technician_id: id, day_of_week: row.day, start_time: row.start, end_time: row.end, is_recurring: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Schedule saved");
      qc.invalidateQueries({ queryKey: ["shop-manager", "technician_schedules", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const addBreak = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await (smSupabase as any).from("technician_breaks").insert({
        schedule_id: scheduleId, start_time: "12:00", end_time: "12:30",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "technician_breaks"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const removeBreak = useMutation({
    mutationFn: async (breakId: string) => {
      const { error } = await (smSupabase as any).from("technician_breaks").delete().eq("id", breakId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "technician_breaks"] }),
  });

  const tech = techQ.data;
  const name = tech
    ? tech.full_name || `${tech.first_name ?? ""} ${tech.last_name ?? ""}`.trim() || tech.email || id.slice(0, 8)
    : "Technician";

  const byDay: Record<number, Schedule | undefined> = {};
  for (const s of schedQ.data ?? []) byDay[s.day_of_week] = s;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/shop/technicians"><ArrowLeft className="h-4 w-4 mr-1" /> Technicians</Link>
        </Button>

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarClock className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">{name}</h1>
            {tech?.job_title ? <Badge variant="outline">{tech.job_title}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tech?.department ?? "—"}{tech?.email ? ` · ${tech.email}` : ""}
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {schedQ.isLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              DAYS.map((d, i) => (
                <DayRow
                  key={i}
                  label={d}
                  day={i}
                  existing={byDay[i]}
                  breaks={(breaksQ.data ?? []).filter((b) => b.schedule_id === byDay[i]?.id)}
                  onSave={(payload) => upsertDay.mutate(payload)}
                  onAddBreak={(sid) => addBreak.mutate(sid)}
                  onRemoveBreak={(bid) => removeBreak.mutate(bid)}
                  saving={upsertDay.isPending}
                />
              ))
            )}
            <p className="text-xs text-muted-foreground pt-2">
              Times use 24-hour format (HH:MM). Turn a day off to remove all shifts for that weekday.
            </p>
          </CardContent>
        </Card>

        <TechDayCalendar technicianId={id} schedules={schedQ.data ?? []} />
      </div>
    </SiteLayout>
  );
}

function TechDayCalendar({ technicianId, schedules }: { technicianId: string; schedules: Schedule[] }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const day = new Date(date + "T00:00:00").getDay();
  const shift = schedules.find((s) => s.day_of_week === day);

  const dayStart = new Date(date + "T00:00:00").toISOString();
  const dayEnd = new Date(date + "T23:59:59").toISOString();

  const wosQ = useQuery({
    queryKey: ["shop-manager", "work_orders", "tech-day", technicianId, date],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("work_orders")
        .select("id,work_order_number,status,description,start_time,end_time,estimated_hours,customer_id")
        .eq("technician_id", technicianId)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Daily Calendar</CardTitle>
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          {shift ? (
            <span>Scheduled <b>{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}</b></span>
          ) : (
            <span className="text-muted-foreground">Off / no recurring shift for {DAYS[day]}.</span>
          )}
        </div>
        {wosQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (wosQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No work orders scheduled for this day.</p>
        ) : (
          <div className="space-y-2">
            {(wosQ.data ?? []).map((wo: any) => (
              <Link key={wo.id} to="/shop/work-orders/$id" params={{ id: wo.id }} className="block">
                <div className="rounded border p-3 hover:bg-muted/40 transition">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">
                      {wo.start_time ? new Date(wo.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      {wo.end_time ? ` – ${new Date(wo.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </span>
                    <Badge variant="outline">{wo.work_order_number ?? wo.id.slice(0, 8)}</Badge>
                    <Badge variant="secondary">{wo.status ?? "—"}</Badge>
                    {wo.estimated_hours && <span className="text-xs text-muted-foreground">{wo.estimated_hours}h est</span>}
                  </div>
                  {wo.description && <p className="text-sm mt-1 truncate">{wo.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayRow(props: {
  label: string;
  day: number;
  existing?: Schedule;
  breaks: BreakRow[];
  onSave: (v: { day: number; start: string; end: string; enabled: boolean; existingId?: string }) => void;
  onAddBreak: (scheduleId: string) => void;
  onRemoveBreak: (id: string) => void;
  saving: boolean;
}) {
  const { label, day, existing, breaks, onSave, onAddBreak, onRemoveBreak, saving } = props;
  const [enabled, setEnabled] = useState<boolean>(!!existing);
  const [start, setStart] = useState(existing?.start_time?.slice(0, 5) ?? "08:00");
  const [end, setEnd] = useState(existing?.end_time?.slice(0, 5) ?? "17:00");

  return (
    <div className="rounded border p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-12 font-medium">{label}</div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <Input type="time" className="w-32" value={start} onChange={(e) => setStart(e.target.value)} disabled={!enabled} />
        <span className="text-muted-foreground">→</span>
        <Input type="time" className="w-32" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!enabled} />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={saving}
          onClick={() => onSave({ day, start, end, enabled, existingId: existing?.id })}
        >
          <Save className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
      {enabled && existing ? (
        <div className="mt-3 pl-14 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Breaks</span>
            <Button size="sm" variant="ghost" onClick={() => onAddBreak(existing.id)}>
              <Plus className="h-3 w-3 mr-1" /> Add break
            </Button>
          </div>
          {breaks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No breaks.</p>
          ) : (
            breaks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</span>
                <Button size="sm" variant="ghost" onClick={() => onRemoveBreak(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
